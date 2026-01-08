import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/documents/split/drafts
 * List user's pending split drafts
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'DRAFT' // Default to DRAFT
    const projectId = searchParams.get('projectId')

    // Build where clause
    const where: {
      uploaderId: string
      status?: string
      projectId?: string
    } = {
      uploaderId: user.id
    }

    // Filter by status (can be comma-separated for multiple)
    if (status && status !== 'all') {
      const statuses = status.split(',').map(s => s.trim().toUpperCase())
      if (statuses.length === 1) {
        where.status = statuses[0]
      }
      // For multiple statuses, we'd need to use 'in' but keeping simple for now
    }

    // Filter by project
    if (projectId) {
      where.projectId = projectId
    }

    const drafts = await prisma.documentSplitDraft.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        originalFile: { select: { id: true, name: true } }
      },
      orderBy: { updatedAt: 'desc' }
    })

    return NextResponse.json({
      drafts: drafts.map(draft => ({
        id: draft.id,
        projectId: draft.projectId,
        projectName: draft.project.name,
        originalFileId: draft.originalFileId,
        originalFileName: draft.originalFile.name.replace('ORIGINAL - ', ''),
        status: draft.status,
        totalPages: draft.totalPages,
        verifiedCount: draft.verifiedCount,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt
      })),
      count: drafts.length
    })
  } catch (error) {
    console.error('[SplitDrafts] Error:', error)
    return NextResponse.json({ error: 'Failed to get drafts' }, { status: 500 })
  }
}
