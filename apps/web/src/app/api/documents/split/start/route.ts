import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'
import { extractAllPagesMetadata, type ProjectInfo } from '@/lib/services/document-ocr'
import { getPdfPageCount, inferDisciplineFromDrawingNumber, disciplineToCategory } from '@/lib/services/pdf-utils'
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { validateFileContent } from '@/lib/file-validation'

// Note: pdf-to-img is dynamically imported to avoid webpack bundling issues

export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const MAX_PAGES = 100

// Lazy-initialize Supabase client to avoid build-time errors
let supabaseClient: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return supabaseClient
}

/**
 * POST /api/documents/split/start
 * Upload a multi-page PDF and start the splitting process
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Rate limit
    const rateLimitResult = withRateLimit(request, RATE_LIMITS.upload, user.id)
    if (rateLimitResult) return rateLimitResult

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const projectId = formData.get('projectId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files can be split' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Validate user has access to project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ...(user.role !== 'ADMIN' ? {
          assignments: { some: { userId: user.id } }
        } : {})
      },
      select: { id: true, name: true, address: true }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Validate file content (magic bytes)
    const contentValidation = validateFileContent(arrayBuffer, file.type)
    if (!contentValidation.valid) {
      return NextResponse.json(
        { error: contentValidation.error || 'Invalid file content' },
        { status: 400 }
      )
    }

    // Get page count
    let pageCount: number
    try {
      // Use eval to completely hide require from webpack's static analysis
      // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-eval
      const dynamicRequire = new Function('modulePath', 'return require(modulePath)')
      const pdfjsLib = dynamicRequire('pdfjs-dist/legacy/build/pdf.js')
      const loadingTask = pdfjsLib.getDocument({ data: buffer })
      const pdfDoc = await loadingTask.promise
      pageCount = Math.min(pdfDoc.numPages, MAX_PAGES)
    } catch {
      return NextResponse.json(
        { error: 'Failed to read PDF. File may be corrupted or password-protected.' },
        { status: 400 }
      )
    }

    if (pageCount === 0) {
      return NextResponse.json({ error: 'PDF has no pages' }, { status: 400 })
    }

    if (pageCount === 1) {
      return NextResponse.json(
        { error: 'PDF has only 1 page. Use regular upload for single-page documents.' },
        { status: 400 }
      )
    }

    // Upload original PDF to storage
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `${projectId}/originals/${timestamp}-${randomStr}-${safeFileName}`

    const { error: uploadError } = await getSupabase().storage
      .from('files')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('[SplitStart] Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Create the original file record with clear labeling
    const originalFile = await prisma.file.create({
      data: {
        projectId,
        name: `ORIGINAL - ${file.name}`,
        type: 'document',
        storagePath,
        uploadedBy: user.id,
        category: 'DRAWINGS',
        description: `Original multi-page document (${pageCount} pages). Individual pages will be extracted separately.`,
        tags: ['original', 'full-set', 'do-not-modify'],
        source: 'UPLOAD',
        currentVersion: 1,
        isLatest: true,
        pageCount: Math.min(pageCount, MAX_PAGES)
      }
    })

    // Start OCR analysis in background
    // For now, we'll do it synchronously but we could use a queue later
    let ocrResult = null
    try {
      const projects: ProjectInfo[] = [{ id: project.id, name: project.name, address: project.address }]
      ocrResult = await extractAllPagesMetadata(buffer, file.type, projects, {
        maxPages: Math.min(pageCount, MAX_PAGES),
        concurrency: 3
      })
    } catch (ocrError) {
      console.error('[SplitStart] OCR error:', ocrError)
      // Continue without OCR - user can manually enter data
    }

    // Prepare page data for the draft
    const pages = []
    for (let i = 1; i <= Math.min(pageCount, MAX_PAGES); i++) {
      const ocrPage = ocrResult?.pages?.find(p => p.pageNumber === i)
      const drawingNumber = ocrPage?.data?.drawingInfo?.drawingNumber || null
      const sheetTitle = ocrPage?.data?.drawingInfo?.sheetTitle || null
      const ocrDiscipline = ocrPage?.data?.drawingInfo?.discipline || null

      // Try to infer discipline from drawing number if OCR didn't get it
      const discipline = ocrDiscipline || (drawingNumber ? inferDisciplineFromDrawingNumber(drawingNumber) : null)

      pages.push({
        pageNumber: i,
        thumbnailPath: null, // Will be generated on demand
        drawingNumber,
        sheetTitle,
        discipline,
        revision: ocrPage?.data?.drawingInfo?.revision || null,
        scale: ocrPage?.data?.drawingInfo?.scale || null,
        confidence: ocrPage?.data?.projectMatch?.confidence || 0.5,
        verified: false,
        skipped: false
      })
    }

    // Create the split draft
    const draft = await prisma.documentSplitDraft.create({
      data: {
        projectId,
        uploaderId: user.id,
        originalFileId: originalFile.id,
        status: 'DRAFT',
        totalPages: Math.min(pageCount, MAX_PAGES),
        verifiedCount: 0,
        pages
      },
      include: {
        project: { select: { id: true, name: true } },
        originalFile: { select: { id: true, name: true, storagePath: true } }
      }
    })

    return NextResponse.json({
      success: true,
      draft: {
        id: draft.id,
        projectId: draft.projectId,
        projectName: draft.project.name,
        originalFileId: draft.originalFileId,
        originalFileName: draft.originalFile.name,
        status: draft.status,
        totalPages: draft.totalPages,
        verifiedCount: draft.verifiedCount,
        pages: draft.pages,
        createdAt: draft.createdAt
      },
      summary: ocrResult?.summary || null
    })
  } catch (error) {
    console.error('[SplitStart] Error:', error)
    return NextResponse.json(
      { error: 'Failed to start document splitting' },
      { status: 500 }
    )
  }
}
