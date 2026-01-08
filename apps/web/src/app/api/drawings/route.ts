import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { isOwnerAdmin, getToolAccessLevel } from '@/lib/api-permissions'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const userId = user.id
    // Check if user has admin-level access to documents (can see all drawings)
    const isAdmin = await isOwnerAdmin(userId)
    const accessLevel = await getToolAccessLevel(userId, null, 'documents')
    const isManagerOrAbove = isAdmin || accessLevel === 'admin'

    // Parse query params (accept both camelCase and snake_case)
    const { searchParams } = new URL(request.url)
    const discipline = searchParams.get('discipline')
    const projectId = searchParams.get('projectId') || searchParams.get('project_id')
    const search = searchParams.get('search') || searchParams.get('q')

    // Build where clause for files (drawings only)
    const whereClause: Record<string, unknown> = {
      category: 'DRAWINGS',
    }

    // Filter by discipline if provided (from metadata relation)
    if (discipline) {
      whereClause.metadata = {
        is: {
          discipline: discipline,
        },
      }
    }

    // Filter by project if provided
    if (projectId) {
      whereClause.projectId = projectId
    }

    // Search by name, description, or drawing number in metadata
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { metadata: { is: { drawingNumber: { contains: search, mode: 'insensitive' } } } },
        { metadata: { is: { sheetTitle: { contains: search, mode: 'insensitive' } } } },
      ]
    }

    // Get user's assigned projects if not manager or above
    let projectFilter: string[] | undefined
    if (!isManagerOrAbove) {
      const assignments = await prisma.projectAssignment.findMany({
        where: { userId },
        select: { projectId: true },
      })
      projectFilter = assignments.map(a => a.projectId)

      // If filtering by discipline/search but user has limited access
      if (projectFilter.length > 0) {
        whereClause.projectId = { in: projectFilter }
      } else {
        // User has no project assignments
        return NextResponse.json({ drawings: [], projects: [], disciplines: [] })
      }
    }

    // Fetch drawings with project info, metadata, and annotation counts
    const files = await prisma.file.findMany({
      where: whereClause,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            address: true,
            status: true,
          },
        },
        uploader: {
          select: {
            id: true,
            name: true,
          },
        },
        metadata: true,
        _count: {
          select: {
            annotations: {
              where: {
                createdBy: userId,
              },
            },
          },
        },
      },
      orderBy: [
        { projectId: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    // Transform to expected format for the frontend
    const drawings = files.map(file => {
      // A drawing is "verified" when:
      // 1. It's the latest revision (isLatest === true)
      // 2. It has been OCR processed (metadata exists with drawingNumber)
      const hasOcrMetadata = file.metadata !== null && file.metadata.drawingNumber !== null
      const isLatestRevision = file.isLatest === true
      const isVerified = isLatestRevision && hasOcrMetadata

      return {
        id: file.id,
        title: file.metadata?.sheetTitle || file.name,
        drawingNumber: file.metadata?.drawingNumber || null,
        revisionNumber: file.metadata?.revision || (file.currentVersion > 1 ? `${file.currentVersion}` : null),
        subcategory: file.metadata?.discipline || null,
        fileUrl: file.storagePath,
        fileType: file.type,
        scale: file.metadata?.scale || null,
        createdAt: file.createdAt.toISOString(),
        project: file.project,
        uploadedByUser: file.uploader,
        // Verification status
        isVerified,
        isLatestRevision,
        hasOcrMetadata,
        annotationCount: file._count.annotations,
      }
    })

    // Get list of unique disciplines for filtering
    const disciplinesResult = await prisma.documentMetadata.findMany({
      where: {
        discipline: { not: null },
        file: {
          category: 'DRAWINGS',
          ...(projectFilter ? { projectId: { in: projectFilter } } : {}),
        },
      },
      select: {
        discipline: true,
      },
      distinct: ['discipline'],
    })

    // Get list of projects with drawings for filtering
    const projectsWithDrawings = await prisma.project.findMany({
      where: {
        files: {
          some: {
            category: 'DRAWINGS',
          },
        },
        // If user has limited access, only show their assigned projects
        ...(projectFilter ? { id: { in: projectFilter } } : {}),
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            files: {
              where: { category: 'DRAWINGS' },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      drawings,
      disciplines: disciplinesResult.map(d => d.discipline).filter(Boolean),
      projects: projectsWithDrawings.map(p => ({
        id: p.id,
        name: p.name,
        drawingCount: p._count.files,
      })),
    })
  } catch (error) {
    console.error('Error fetching drawings:', error)
    return NextResponse.json({ error: 'Failed to fetch drawings' }, { status: 500 })
  }
}
