import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { supabaseStorage } from '@/lib/supabase-storage'
import { extractPdfPage, disciplineToCategory } from '@/lib/services/pdf-utils'
import { createNotification } from '@/lib/services/notification-service'

export const dynamic = 'force-dynamic'

const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'construction-files'

interface PageData {
  pageNumber: number
  thumbnailPath: string | null
  drawingNumber: string | null
  sheetTitle: string | null
  discipline: string | null
  revision: string | null
  scale: string | null
  confidence: number
  verified: boolean
  skipped: boolean
}

// Maps page numbers to existing file IDs for revision creation
interface RevisionMapping {
  pageNumber: number
  existingFileId: string
}

interface ConfirmRequestBody {
  revisionMappings?: RevisionMapping[]
}

/**
 * POST /api/documents/split/[draftId]/confirm
 * Finalize the split and create individual document files
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { draftId } = await params

    // Parse request body for revision mappings
    let body: ConfirmRequestBody = {}
    try {
      body = await request.json()
    } catch {
      // No body provided - create all as new files
    }
    const revisionMappings = body.revisionMappings || []

    // Get the draft with original file info
    const draft = await prisma.documentSplitDraft.findUnique({
      where: { id: draftId },
      include: {
        originalFile: { select: { id: true, storagePath: true } },
        project: { select: { id: true, name: true } }
      }
    })

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    // Only the uploader can confirm
    if (draft.uploaderId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (draft.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Draft has already been processed' }, { status: 400 })
    }

    // Mark as processing
    await prisma.documentSplitDraft.update({
      where: { id: draftId },
      data: { status: 'PROCESSING' }
    })

    // Download the original PDF from storage
    const { data: pdfData, error: downloadError } = await supabaseStorage.storage
      .from(BUCKET_NAME)
      .download(draft.originalFile.storagePath)

    if (downloadError || !pdfData) {
      console.error('[SplitConfirm] Download error:', JSON.stringify(downloadError, null, 2))
      console.error('[SplitConfirm] Storage path:', draft.originalFile.storagePath)
      console.error('[SplitConfirm] Draft ID:', draftId)
      console.error('[SplitConfirm] Original file ID:', draft.originalFile.id)

      await prisma.documentSplitDraft.update({
        where: { id: draftId },
        data: { status: 'DRAFT' } // Revert to allow retry
      })
      return NextResponse.json({
        error: 'Failed to download original PDF from storage',
        details: (downloadError as { message?: string })?.message || 'File not found in storage',
        debugInfo: {
          bucket: BUCKET_NAME,
          storagePath: draft.originalFile.storagePath,
          draftId: draftId,
          originalFileId: draft.originalFile.id,
          errorCode: (downloadError as { statusCode?: string })?.statusCode || null,
          hint: 'The original PDF may have been deleted from storage. Try re-uploading the document.'
        }
      }, { status: 500 })
    }

    const pdfBuffer = Buffer.from(await pdfData.arrayBuffer())
    const pages = draft.pages as unknown as PageData[]
    const createdFiles: string[] = []
    const updatedFiles: string[] = [] // Files that were updated as revisions
    const errors: Array<{ pageNumber: number; error: string }> = []

    // Build a map for quick lookup of revision mappings
    const revisionMap = new Map<number, string>()
    for (const mapping of revisionMappings) {
      revisionMap.set(mapping.pageNumber, mapping.existingFileId)
    }

    // Process each non-skipped page
    for (const page of pages) {
      if (page.skipped) continue

      try {
        // Extract the single page as PDF
        const pageBuffer = await extractPdfPage(pdfBuffer, page.pageNumber)

        // Check if this page should be a revision of an existing file
        const existingFileId = revisionMap.get(page.pageNumber)

        if (existingFileId) {
          // CREATE AS REVISION of existing file
          const existingFile = await prisma.file.findUnique({
            where: { id: existingFileId },
            include: { metadata: true }
          })

          if (!existingFile) {
            console.error(`[SplitConfirm] Existing file ${existingFileId} not found for revision`)
            errors.push({ pageNumber: page.pageNumber, error: 'Existing file not found for revision' })
            continue
          }

          const newVersion = existingFile.currentVersion + 1
          const timestamp = Date.now()
          const randomStr = Math.random().toString(36).substring(2, 6)
          const disciplineFolder = page.discipline?.toLowerCase() || 'uncategorized'
          const drawingNum = page.drawingNumber || existingFile.metadata?.drawingNumber || `Page-${page.pageNumber}`
          const safeDrawingNum = drawingNum.replace(/[^a-zA-Z0-9.-]/g, '_')
          const storagePath = `${draft.projectId || 'company-wide'}/drawings/${disciplineFolder}/${timestamp}-${randomStr}-${safeDrawingNum}-v${newVersion}.pdf`

          // Upload to storage
          const { error: uploadError } = await supabaseStorage.storage
            .from(BUCKET_NAME)
            .upload(storagePath, pageBuffer, {
              contentType: 'application/pdf',
              upsert: false
            })

          if (uploadError) {
            console.error(`[SplitConfirm] Upload error for revision page ${page.pageNumber}:`, uploadError)
            errors.push({ pageNumber: page.pageNumber, error: 'Upload failed for revision' })
            continue
          }

          // Update the existing file record
          await prisma.file.update({
            where: { id: existingFileId },
            data: {
              storagePath, // Update to new file
              currentVersion: newVersion,
              // Keep isLatest as true
            }
          })

          // Update document metadata with new revision info
          if (existingFile.metadata) {
            await prisma.documentMetadata.update({
              where: { fileId: existingFileId },
              data: {
                revision: page.revision || existingFile.metadata.revision,
                scale: page.scale || existingFile.metadata.scale,
                sheetTitle: page.sheetTitle || existingFile.metadata.sheetTitle,
                discipline: page.discipline || existingFile.metadata.discipline,
              }
            })
          }

          // Create revision record
          const revisionNotes = page.revision
            ? `Revision ${page.revision} - Extracted from split document (page ${page.pageNumber})`
            : `Version ${newVersion} - Extracted from split document (page ${page.pageNumber})`

          await prisma.documentRevision.create({
            data: {
              fileId: existingFileId,
              version: newVersion,
              storagePath,
              changeNotes: revisionNotes,
              uploadedBy: user.id,
              fileSize: pageBuffer.length
            }
          })

          console.log(`[SplitConfirm] Created revision v${newVersion} for file ${existingFileId} from page ${page.pageNumber}`)
          updatedFiles.push(existingFileId)
        } else {
          // CREATE AS NEW FILE
          const drawingNum = page.drawingNumber || `Page-${page.pageNumber.toString().padStart(3, '0')}`
          const safeDrawingNum = drawingNum.replace(/[^a-zA-Z0-9.-]/g, '_')
          const timestamp = Date.now()
          const randomStr = Math.random().toString(36).substring(2, 6)

          // Determine category from discipline
          const category = page.discipline ? disciplineToCategory(page.discipline) : 'DRAWINGS'

          // Storage path: {projectId}/drawings/{discipline}/{drawingNumber}.pdf
          const disciplineFolder = page.discipline?.toLowerCase() || 'uncategorized'
          const storagePath = `${draft.projectId || 'company-wide'}/drawings/${disciplineFolder}/${timestamp}-${randomStr}-${safeDrawingNum}.pdf`

          // Upload to storage
          const { error: uploadError } = await supabaseStorage.storage
            .from(BUCKET_NAME)
            .upload(storagePath, pageBuffer, {
              contentType: 'application/pdf',
              upsert: false
            })

          if (uploadError) {
            console.error(`[SplitConfirm] Upload error for page ${page.pageNumber}:`, uploadError)
            errors.push({ pageNumber: page.pageNumber, error: 'Upload failed' })
            continue
          }

          // Create file record
          const fileName = page.sheetTitle
            ? `${drawingNum} - ${page.sheetTitle}.pdf`
            : `${drawingNum}.pdf`

          const file = await prisma.file.create({
            data: {
              projectId: draft.projectId,
              name: fileName,
              type: 'document',
              storagePath,
              uploadedBy: user.id,
              category,
              description: page.sheetTitle || null,
              tags: page.discipline ? [page.discipline.toLowerCase()] : [],
              source: 'UPLOAD',
              currentVersion: 1,
              isLatest: true
            }
          })

          // Create document metadata if we have data
          if (page.drawingNumber || page.sheetTitle || page.discipline) {
            await prisma.documentMetadata.create({
              data: {
                fileId: file.id,
                drawingNumber: page.drawingNumber,
                sheetNumber: page.pageNumber.toString(),
                discipline: page.discipline,
                revision: page.revision,
                scale: page.scale,
                ocrProvider: 'openai',
                ocrConfidence: page.confidence
              }
            })
          }

          // Create initial revision
          await prisma.documentRevision.create({
            data: {
              fileId: file.id,
              version: 1,
              storagePath,
              changeNotes: `Extracted from ${draft.originalFile.storagePath} (page ${page.pageNumber})`,
              uploadedBy: user.id,
              fileSize: pageBuffer.length
            }
          })

          createdFiles.push(file.id)
        }
      } catch (pageError) {
        console.error(`[SplitConfirm] Error processing page ${page.pageNumber}:`, pageError)
        errors.push({
          pageNumber: page.pageNumber,
          error: pageError instanceof Error ? pageError.message : 'Unknown error'
        })
      }
    }

    // Mark draft as completed
    await prisma.documentSplitDraft.update({
      where: { id: draftId },
      data: { status: 'COMPLETED' }
    })

    // Build summary message
    const parts: string[] = []
    if (createdFiles.length > 0) {
      parts.push(`${createdFiles.length} new file${createdFiles.length === 1 ? '' : 's'}`)
    }
    if (updatedFiles.length > 0) {
      parts.push(`${updatedFiles.length} revision${updatedFiles.length === 1 ? '' : 's'}`)
    }
    const successMessage = parts.length > 0
      ? `Created ${parts.join(' and ')}`
      : 'No files processed'

    // Send push notification to the user who requested the split
    createNotification({
      userId: user.id,
      type: errors.length > 0 ? 'DOCUMENT_SPLIT_FAILED' : 'DOCUMENT_SPLIT_COMPLETE',
      title: errors.length > 0 ? 'Document Split Completed with Errors' : 'Document Split Complete',
      message: errors.length > 0
        ? `${successMessage} with ${errors.length} error${errors.length === 1 ? '' : 's'} in ${draft.project.name}`
        : `${successMessage} in ${draft.project.name}`,
      severity: errors.length > 0 ? 'WARNING' : 'INFO',
      category: 'DOCUMENT',
      actionUrl: `/documents?project=${draft.projectId}`,
      data: {
        projectId: draft.projectId,
        projectName: draft.project.name,
        createdFiles: createdFiles.length,
        updatedFiles: updatedFiles.length,
        errors: errors.length,
      },
    }).catch((notifError) => {
      console.error('[SplitConfirm] Failed to send notification:', notifError)
    })

    return NextResponse.json({
      success: true,
      createdFiles: createdFiles.length,
      updatedFiles: updatedFiles.length,
      newFileIds: createdFiles,
      revisionFileIds: updatedFiles,
      errors: errors.length > 0 ? errors : undefined,
      message: errors.length > 0
        ? `${successMessage} with ${errors.length} error${errors.length === 1 ? '' : 's'}`
        : successMessage
    })
  } catch (error) {
    console.error('[SplitConfirm] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('[SplitConfirm] Error stack:', errorStack)

    // Try to revert status and send failure notification
    try {
      const { draftId } = await params
      const failedDraft = await prisma.documentSplitDraft.update({
        where: { id: draftId },
        data: { status: 'DRAFT' },
        include: { project: { select: { id: true, name: true } } }
      })

      // Send failure notification to the uploader
      createNotification({
        userId: failedDraft.uploaderId,
        type: 'DOCUMENT_SPLIT_FAILED',
        title: 'Document Split Failed',
        message: `Failed to split document in ${failedDraft.project.name}: ${errorMessage}`,
        severity: 'ERROR',
        category: 'DOCUMENT',
        actionUrl: `/documents?project=${failedDraft.projectId}`,
        data: {
          projectId: failedDraft.projectId,
          projectName: failedDraft.project.name,
          error: errorMessage,
        },
      }).catch((notifError) => {
        console.error('[SplitConfirm] Failed to send failure notification:', notifError)
      })
    } catch (revertError) {
      console.error('[SplitConfirm] Failed to revert status:', revertError)
    }

    return NextResponse.json({
      error: 'Failed to confirm split',
      details: errorMessage,
      debugInfo: {
        errorType: error?.constructor?.name || 'Unknown',
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      }
    }, { status: 500 })
  }
}
