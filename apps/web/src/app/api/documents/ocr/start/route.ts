import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { processOcrJobInBackground } from '@/lib/services/ocr-worker'

export const dynamic = 'force-dynamic'

/**
 * POST /api/documents/ocr/start
 * Start a background OCR job for an existing file
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Rate limit
    const rateLimitResult = withRateLimit(request, RATE_LIMITS.ocr, user.id)
    if (rateLimitResult) return rateLimitResult

    // Parse request body
    const body = await request.json()
    const { fileId, mode = 'all-pages' } = body

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 })
    }

    // Get the file and validate access
    const userDetails = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true }
    })

    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        ...(userDetails?.role !== 'ADMIN' ? {
          project: {
            assignments: { some: { userId: user.id } }
          }
        } : {})
      },
      select: {
        id: true,
        name: true,
        storagePath: true,
        projectId: true,
        type: true
      }
    })

    if (!file) {
      return NextResponse.json({ error: 'File not found or access denied' }, { status: 404 })
    }

    // Check for existing pending/processing job for this file
    const existingJob = await prisma.ocrJob.findFirst({
      where: {
        fileId: file.id,
        status: { in: ['PENDING', 'PROCESSING'] }
      }
    })

    if (existingJob) {
      return NextResponse.json({
        success: true,
        message: 'OCR job already in progress',
        job: {
          id: existingJob.id,
          status: existingJob.status,
          progress: existingJob.progress,
          totalPages: existingJob.totalPages,
          processedPages: existingJob.processedPages
        }
      })
    }

    // Determine MIME type from file extension
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const mimeTypeMap: Record<string, string> = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    }
    const mimeType = mimeTypeMap[ext] || 'application/octet-stream'

    // Create the OCR job
    const job = await prisma.ocrJob.create({
      data: {
        fileId: file.id,
        userId: user.id,
        projectId: file.projectId,
        status: 'PENDING',
        storagePath: file.storagePath,
        fileName: file.name,
        fileType: mimeType,
        totalPages: 1, // Will be updated once we know the actual page count
        processedPages: 0,
        progress: 0
      }
    })

    // Start processing in background (fire and forget)
    // We use setImmediate to not block the response
    setImmediate(() => {
      processOcrJobInBackground(job.id, mode === 'all-pages').catch(err => {
        console.error('[OcrStart] Background processing error:', err)
      })
    })

    return NextResponse.json({
      success: true,
      message: 'OCR job started',
      job: {
        id: job.id,
        status: job.status,
        progress: job.progress,
        totalPages: job.totalPages
      }
    })
  } catch (error) {
    console.error('[OcrStart] Error:', error)
    return NextResponse.json(
      { error: 'Failed to start OCR job' },
      { status: 500 }
    )
  }
}
