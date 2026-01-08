import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import {
  extractDocumentMetadata,
  extractAllPagesMetadata,
  isOcrSupported,
  type ProjectInfo
} from '@/lib/services/document-ocr'
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { validateFileContent } from '@/lib/file-validation'

export const dynamic = 'force-dynamic'

// Max file size for OCR analysis (25MB for single page, 50MB for all pages)
const MAX_OCR_FILE_SIZE = 25 * 1024 * 1024
const MAX_OCR_FILE_SIZE_ALL_PAGES = 50 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Check rate limit using central rate limiting
    const rateLimitResult = withRateLimit(request, RATE_LIMITS.ocr, user.id)
    if (rateLimitResult) return rateLimitResult

    // Check if OCR is enabled in org settings
    const orgSettings = await prisma.orgSettings.findFirst()
    if (orgSettings && !orgSettings.ocrEnabled) {
      return NextResponse.json(
        { error: 'Document analysis is disabled by administrator' },
        { status: 403 }
      )
    }

    // Parse the request
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const projectId = formData.get('projectId') as string | null
    const mode = formData.get('mode') as string | null // 'single' (default) or 'all-pages'
    const analyzeAllPages = mode === 'all-pages'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('[DocumentAnalyze] Request received:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      mode: mode || 'single'
    })

    // Check if file type is supported for OCR
    if (!isOcrSupported(file.type)) {
      console.error('[DocumentAnalyze] Unsupported file type:', {
        fileType: file.type,
        fileName: file.name,
        fileSize: file.size
      })
      return NextResponse.json(
        { error: `File type ${file.type} is not supported for analysis` },
        { status: 400 }
      )
    }

    // Check file size (larger limit for all-pages mode)
    const maxSize = analyzeAllPages ? MAX_OCR_FILE_SIZE_ALL_PAGES : MAX_OCR_FILE_SIZE
    if (file.size > maxSize) {
      console.error('[DocumentAnalyze] File too large:', {
        fileSize: file.size,
        maxSize,
        fileName: file.name
      })
      return NextResponse.json(
        { error: `File size exceeds maximum of ${maxSize / 1024 / 1024}MB for analysis` },
        { status: 400 }
      )
    }

    // Convert file to buffer and validate content (magic bytes)
    const arrayBuffer = await file.arrayBuffer()
    const contentValidation = validateFileContent(arrayBuffer, file.type)
    if (!contentValidation.valid) {
      // Log first 16 bytes for debugging
      const bytes = new Uint8Array(arrayBuffer.slice(0, 16))
      console.error('[DocumentAnalyze] Content validation failed:', {
        error: contentValidation.error,
        fileType: file.type,
        fileName: file.name,
        fileSize: file.size,
        firstBytes: Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ')
      })
      return NextResponse.json(
        { error: contentValidation.error || 'Invalid file content' },
        { status: 400 }
      )
    }

    // Get list of projects for matching
    let projects: ProjectInfo[] = []

    // Get user role for authorization
    const userDetails = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true }
    })

    if (projectId) {
      // If a specific project is provided, verify user has access
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          // Admins can access all projects, others only assigned ones
          ...(userDetails?.role !== 'ADMIN' ? {
            assignments: { some: { userId: user.id } }
          } : {})
        },
        select: { id: true, name: true, address: true }
      })
      if (project) {
        projects = [project]
      }
      // If user doesn't have access to the requested project, fall through to get their assigned projects
    }

    if (projects.length === 0) {
      // Get all active projects the user has access to (user role already fetched above)
      if (userDetails?.role === 'ADMIN') {
        // Admins can see all projects
        projects = await prisma.project.findMany({
          where: { status: { in: ['ACTIVE', 'ON_HOLD'] } },
          select: { id: true, name: true, address: true },
          orderBy: { name: 'asc' },
          take: 50 // Limit to prevent huge prompts
        })
      } else {
        // Regular users only see assigned projects
        projects = await prisma.project.findMany({
          where: {
            status: { in: ['ACTIVE', 'ON_HOLD'] },
            assignments: {
              some: { userId: user.id }
            }
          },
          select: { id: true, name: true, address: true },
          orderBy: { name: 'asc' },
          take: 50
        })
      }
    }

    // Create buffer from already-validated arrayBuffer
    const buffer = Buffer.from(arrayBuffer)

    // Extract metadata using OpenAI Vision
    if (analyzeAllPages) {
      // Multi-page analysis
      const multiPageResult = await extractAllPagesMetadata(buffer, file.type, projects, {
        maxPages: 50,
        concurrency: 3
      })

      return NextResponse.json({
        success: !multiPageResult.error,
        mode: 'all-pages',
        data: multiPageResult,
        projectsAvailable: projects.length
      })
    } else {
      // Single page analysis (default)
      const extractedData = await extractDocumentMetadata(buffer, file.type, projects)

      return NextResponse.json({
        success: !extractedData.error,
        mode: 'single',
        data: extractedData,
        projectsAvailable: projects.length
      })
    }
  } catch (error) {
    console.error('[DocumentAnalyze] Error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    // Handle specific error types
    if (error instanceof Error) {
      const message = error.message.toLowerCase()

      // FormData parsing errors
      if (message.includes('formdata') || message.includes('multipart')) {
        return NextResponse.json(
          { error: 'Invalid request format', code: 'INVALID_REQUEST' },
          { status: 400 }
        )
      }

      // File read errors
      if (message.includes('arraybuffer') || message.includes('buffer')) {
        return NextResponse.json(
          { error: 'Failed to read file contents', code: 'FILE_READ_ERROR' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to analyze document', code: 'ANALYSIS_FAILED' },
      { status: 500 }
    )
  }
}
