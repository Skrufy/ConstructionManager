import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { supabaseStorage } from '@/lib/supabase-storage'
import { extractAllPagesMetadata, getPdfPageCount, type ProjectInfo } from '@/lib/services/document-ocr'
import { inferDisciplineFromDrawingNumber, normalizeScale } from '@/lib/services/pdf-utils'

export const dynamic = 'force-dynamic'

const MAX_PAGES = 100
const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'construction-files'

/**
 * POST /api/documents/[id]/split
 * Start splitting an already uploaded multi-page PDF
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { id: fileId } = await params

    // Get the file and verify access
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        ...(user.role !== 'ADMIN' ? {
          project: {
            assignments: { some: { userId: user.id } }
          }
        } : {})
      },
      include: {
        project: { select: { id: true, name: true, address: true } }
      }
    })

    if (!file) {
      return NextResponse.json({ error: 'File not found or access denied' }, { status: 404 })
    }

    // Verify it's a PDF
    if (!file.storagePath.toLowerCase().endsWith('.pdf') && file.type !== 'document') {
      return NextResponse.json({ error: 'Only PDF files can be split' }, { status: 400 })
    }

    // Check if there's already a pending draft for this file
    const existingDraft = await prisma.documentSplitDraft.findFirst({
      where: {
        originalFileId: fileId,
        status: 'DRAFT'
      }
    })

    if (existingDraft) {
      return NextResponse.json({
        success: true,
        existing: true,
        draft: {
          id: existingDraft.id,
          status: existingDraft.status,
          totalPages: existingDraft.totalPages,
          verifiedCount: existingDraft.verifiedCount
        },
        message: 'A draft already exists for this file'
      })
    }

    // Download the file from Supabase
    const startDownload = Date.now()
    console.log('[SplitExisting] Downloading from bucket:', BUCKET_NAME, 'path:', file.storagePath)
    const { data: fileData, error: downloadError } = await supabaseStorage.storage
      .from(BUCKET_NAME)
      .download(file.storagePath)
    console.log('[SplitExisting] Download completed in', Date.now() - startDownload, 'ms')

    if (downloadError || !fileData) {
      console.error('[SplitExisting] Download error:', JSON.stringify(downloadError, null, 2))
      console.error('[SplitExisting] Storage path was:', file.storagePath)
      console.error('[SplitExisting] Bucket name:', BUCKET_NAME)
      console.error('[SplitExisting] File ID:', fileId)
      return NextResponse.json({
        error: 'Failed to download file from storage',
        details: downloadError?.message || 'File not found in storage',
        debugInfo: {
          bucket: BUCKET_NAME,
          storagePath: file.storagePath,
          fileId: fileId,
          errorCode: (downloadError as { statusCode?: string })?.statusCode || null,
          errorName: (downloadError as { name?: string })?.name || null,
          hint: 'Verify SUPABASE_STORAGE_BUCKET env var matches your bucket name and the file exists in storage'
        }
      }, { status: 500 })
    }

    const arrayBuffer = await fileData.arrayBuffer()
    // Create a copy of the array buffer since pdfjs-dist may detach it
    const bufferCopy = arrayBuffer.slice(0)
    const buffer = Buffer.from(bufferCopy)

    // Get page count using the shared PDF utility
    // Use a separate buffer copy for page count to avoid detachment issues
    const startPageCount = Date.now()
    const pageCountBuffer = Buffer.from(arrayBuffer.slice(0))
    const rawPageCount = await getPdfPageCount(pageCountBuffer)
    console.log('[SplitExisting] Page count completed in', Date.now() - startPageCount, 'ms, pages:', rawPageCount)
    if (rawPageCount === 0) {
      console.error('[SplitExisting] PDF read error: Could not read page count')
      return NextResponse.json(
        { error: 'Failed to read PDF. File may be corrupted or password-protected.' },
        { status: 400 }
      )
    }
    const pageCount = Math.min(rawPageCount, MAX_PAGES)

    if (pageCount === 0) {
      return NextResponse.json({ error: 'PDF has no pages' }, { status: 400 })
    }

    if (pageCount === 1) {
      return NextResponse.json(
        { error: 'PDF has only 1 page. No splitting needed.' },
        { status: 400 }
      )
    }

    // Prepare initial page data for the draft (without OCR)
    // OCR will run in the background and update the draft
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
    const pages: PageData[] = []
    for (let i = 1; i <= Math.min(pageCount, MAX_PAGES); i++) {
      pages.push({
        pageNumber: i,
        thumbnailPath: null,
        drawingNumber: null,
        sheetTitle: null,
        discipline: null,
        revision: null,
        scale: null,
        confidence: 0.5,
        verified: false,
        skipped: false
      })
    }

    // Update the original file to mark it as a set and store page count
    await prisma.file.update({
      where: { id: fileId },
      data: {
        name: file.name.startsWith('ORIGINAL - ') ? file.name : `ORIGINAL - ${file.name}`,
        description: file.description || `Original multi-page document (${pageCount} pages). Individual pages extracted separately.`,
        tags: ['original', 'full-set'],
        pageCount: Math.min(pageCount, MAX_PAGES)
      }
    })

    // Create the split draft (use 'company-wide' for null projectId since schema requires it)
    const draft = await prisma.documentSplitDraft.create({
      data: {
        projectId: file.projectId || 'company-wide',
        uploaderId: user.id,
        originalFileId: fileId,
        status: 'DRAFT',
        totalPages: Math.min(pageCount, MAX_PAGES),
        verifiedCount: 0,
        pages: pages as unknown as object
      }
    })

    // Start OCR analysis in the background (don't await)
    // This allows the modal to open immediately while OCR processes
    const runBackgroundOcr = async () => {
      try {
        const projects: ProjectInfo[] = file.project ? [{
          id: file.project.id,
          name: file.project.name,
          address: file.project.address
        }] : []
        // Create a fresh buffer for OCR
        const ocrBuffer = Buffer.from(bufferCopy.slice(0))
        console.log('[SplitExisting] Starting background OCR for', pageCount, 'pages')

        const ocrResult = await extractAllPagesMetadata(ocrBuffer, 'application/pdf', projects, {
          maxPages: Math.min(pageCount, MAX_PAGES),
          concurrency: 3
        })

        console.log('[SplitExisting] Background OCR completed, pages:', ocrResult?.pages?.length || 0)

        // Update the draft with OCR results
        if (ocrResult?.pages?.length) {
          const updatedPages = pages.map((page, index) => {
            const ocrPage = ocrResult.pages.find((p: { pageNumber: number }) => p.pageNumber === page.pageNumber)
            if (ocrPage?.data?.drawingInfo) {
              const drawingNumber = ocrPage.data.drawingInfo.drawingNumber || null
              const ocrDiscipline = ocrPage.data.drawingInfo.discipline || null
              // Normalize scale to consistent format
              const rawScale = ocrPage.data.drawingInfo.scale || null
              const normalizedScale = rawScale ? normalizeScale(rawScale) : null
              return {
                ...page,
                drawingNumber,
                sheetTitle: ocrPage.data.drawingInfo.sheetTitle || null,
                discipline: ocrDiscipline || (drawingNumber ? inferDisciplineFromDrawingNumber(drawingNumber) : null),
                revision: ocrPage.data.drawingInfo.revision || null,
                scale: normalizedScale || rawScale,
                confidence: ocrPage.data.projectMatch?.confidence || 0.5
              }
            }
            return page
          })

          await prisma.documentSplitDraft.update({
            where: { id: draft.id },
            data: { pages: updatedPages as unknown as object }
          })
          console.log('[SplitExisting] Draft updated with OCR results')
        }
      } catch (ocrError) {
        console.error('[SplitExisting] Background OCR error:', ocrError)
        // Don't fail - user can manually enter data
      }
    }

    // Fire and forget - don't await
    runBackgroundOcr()

    return NextResponse.json({
      success: true,
      draft: {
        id: draft.id,
        projectId: draft.projectId === 'company-wide' ? null : draft.projectId,
        projectName: file.project?.name || 'Company-wide',
        originalFileId: draft.originalFileId,
        originalFileName: file.name,
        status: draft.status,
        totalPages: draft.totalPages,
        verifiedCount: draft.verifiedCount,
        pages: draft.pages,
        createdAt: draft.createdAt
      },
      ocrPending: true // Let the client know OCR is running in background
    })
  } catch (error) {
    console.error('[SplitExisting] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('[SplitExisting] Error stack:', errorStack)

    return NextResponse.json({
      error: 'Failed to start document splitting',
      details: errorMessage,
      debugInfo: {
        errorType: error?.constructor?.name || 'Unknown',
        // Include stack trace in development only
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      }
    }, { status: 500 })
  }
}
