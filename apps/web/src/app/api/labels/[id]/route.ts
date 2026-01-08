import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Roles that can manage labels
const AUTHORIZED_ROLES = ['ADMIN', 'PROJECT_MANAGER']

// Valid label categories
const VALID_CATEGORIES = [
  'ACTIVITY',
  'LOCATION_BUILDING',
  'LOCATION_FLOOR',
  'LOCATION_ZONE',
  'LOCATION_ROOM',
  'STATUS',
  'MATERIAL',
  'ISSUE',
  'VISITOR',
]

// GET /api/labels/[id] - Get a single label
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const label = await prisma.label.findUnique({
      where: { id: params.id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          }
        },
        _count: {
          select: {
            activityEntries: true,
            statusEntries: true,
            materialEntries: true,
            issueEntries: true,
            visitorEntries: true,
          }
        }
      }
    })

    if (!label) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 })
    }

    return NextResponse.json(label)
  } catch (error) {
    console.error('Error fetching label:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/labels/[id] - Update a label
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Only admins and project managers can update labels
    if (!AUTHORIZED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { category, name, projectId, isActive, sortOrder } = body

    // Check if label exists
    const existingLabel = await prisma.label.findUnique({
      where: { id: params.id }
    })

    if (!existingLabel) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 })
    }

    // Validation
    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    // Check for duplicate name if name or category is changing
    if (name || category) {
      const targetCategory = category || existingLabel.category
      const targetName = name || existingLabel.name
      const targetProjectId = projectId !== undefined ? projectId : existingLabel.projectId

      const duplicateLabel = await prisma.label.findFirst({
        where: {
          category: targetCategory,
          name: { equals: targetName, mode: 'insensitive' },
          projectId: targetProjectId,
          id: { not: params.id },
        }
      })

      if (duplicateLabel) {
        return NextResponse.json({ error: 'A label with this name already exists in this category' }, { status: 409 })
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (category !== undefined) updateData.category = category
    if (projectId !== undefined) updateData.projectId = projectId || null
    if (isActive !== undefined) updateData.isActive = isActive
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder

    // Update label
    const label = await prisma.label.update({
      where: { id: params.id },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    return NextResponse.json(label)
  } catch (error) {
    console.error('Error updating label:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/labels/[id] - Delete a label
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Only admins can delete labels
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only administrators can delete labels' }, { status: 403 })
    }

    // Check if label exists
    const existingLabel = await prisma.label.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            activityEntries: true,
            statusEntries: true,
            materialEntries: true,
            issueEntries: true,
            visitorEntries: true,
          }
        }
      }
    })

    if (!existingLabel) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 })
    }

    // Check if label is in use
    const totalUsage =
      existingLabel._count.activityEntries +
      existingLabel._count.statusEntries +
      existingLabel._count.materialEntries +
      existingLabel._count.issueEntries +
      existingLabel._count.visitorEntries

    if (totalUsage > 0) {
      // Instead of deleting, mark as inactive
      await prisma.label.update({
        where: { id: params.id },
        data: { isActive: false }
      })
      return NextResponse.json({
        message: 'Label is in use and has been marked as inactive instead of deleted',
        deactivated: true
      })
    }

    // Delete label if not in use
    await prisma.label.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Label deleted successfully' })
  } catch (error) {
    console.error('Error deleting label:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
