import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/documents/ocr/jobs
 * List user's OCR jobs (pending and recent)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // Optional filter: PENDING, PROCESSING, COMPLETED, FAILED
    const fileId = searchParams.get('fileId') // Optional filter by file
    const limit = parseInt(searchParams.get('limit') || '10')

    // Build where clause
    const where: {
      userId: string
      status?: { in: string[] } | string
      fileId?: string
    } = {
      userId: user.id
    }

    if (status) {
      where.status = status
    } else {
      // Default: show active jobs and recent completed
      where.status = { in: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] }
    }

    if (fileId) {
      where.fileId = fileId
    }

    // Get jobs
    const jobs = await prisma.ocrJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        fileId: true,
        status: true,
        progress: true,
        totalPages: true,
        processedPages: true,
        fileName: true,
        result: true,
        error: true,
        startedAt: true,
        completedAt: true,
        createdAt: true
      }
    })

    // Also get count of active jobs
    const activeCount = await prisma.ocrJob.count({
      where: {
        userId: user.id,
        status: { in: ['PENDING', 'PROCESSING'] }
      }
    })

    return NextResponse.json({
      success: true,
      jobs,
      activeCount
    })
  } catch (error) {
    console.error('[OcrJobs] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get OCR jobs' },
      { status: 500 }
    )
  }
}
