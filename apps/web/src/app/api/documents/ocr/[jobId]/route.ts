import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/documents/ocr/[jobId]
 * Get OCR job status and results
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // Check authentication
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { jobId } = await params

    // Get the job (only return if user owns it or is admin)
    const userDetails = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true }
    })

    const job = await prisma.ocrJob.findFirst({
      where: {
        id: jobId,
        ...(userDetails?.role !== 'ADMIN' ? { userId: user.id } : {})
      }
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        fileId: job.fileId,
        status: job.status,
        progress: job.progress,
        totalPages: job.totalPages,
        processedPages: job.processedPages,
        fileName: job.fileName,
        result: job.result,
        error: job.error,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt
      }
    })
  } catch (error) {
    console.error('[OcrJobStatus] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/documents/ocr/[jobId]
 * Cancel/delete an OCR job
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // Check authentication
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { jobId } = await params

    // Get the job (only allow delete if user owns it or is admin)
    const userDetails = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true }
    })

    const job = await prisma.ocrJob.findFirst({
      where: {
        id: jobId,
        ...(userDetails?.role !== 'ADMIN' ? { userId: user.id } : {})
      }
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Delete the job
    await prisma.ocrJob.delete({
      where: { id: jobId }
    })

    return NextResponse.json({
      success: true,
      message: 'Job deleted'
    })
  } catch (error) {
    console.error('[OcrJobDelete] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    )
  }
}
