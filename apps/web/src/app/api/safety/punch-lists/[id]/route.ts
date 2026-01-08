import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Helper to flatten a punch list item
function flattenItem(item: {
  id: string
  description: string
  location: string | null
  trade: string | null
  priority: string
  status: string
  assignedTo: string | null
  dueDate: Date | null
  completedAt: Date | null
  completedBy: string | null
  verifiedAt: Date | null
  verifiedBy: string | null
  photos: unknown
  notes: string | null
  createdAt: Date
  updatedAt: Date
  punchList: {
    projectId: string
    createdBy: string
    project: { id: string; name: string }
    creator: { id: string; name: string }
  }
  assignee?: { id: string; name: string } | null
  completer?: { id: string; name: string } | null
  verifier?: { id: string; name: string } | null
}) {
  return {
    id: item.id,
    projectId: item.punchList.projectId,
    projectName: item.punchList.project.name,
    location: item.location,
    description: item.description,
    trade: item.trade,
    priority: item.priority,
    status: item.status,
    assignedTo: item.assignedTo,
    assignedToName: item.assignee?.name,
    dueDate: item.dueDate?.toISOString(),
    completedAt: item.completedAt?.toISOString(),
    completedBy: item.completedBy,
    completedByName: item.completer?.name,
    verifiedAt: item.verifiedAt?.toISOString(),
    verifiedBy: item.verifiedBy,
    verifiedByName: item.verifier?.name,
    photos: item.photos,
    notes: item.notes,
    createdBy: item.punchList.createdBy,
    createdByName: item.punchList.creator.name,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  }
}

// GET /api/safety/punch-lists/[id] - Get single punch list (or item for backwards compatibility)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const { id } = await params

    // First, try to find a PunchList with this ID
    const punchList = await prisma.punchList.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        items: {
          include: {
            assignee: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (punchList) {
      const completedCount = punchList.items.filter(i => i.status === 'COMPLETED').length
      return NextResponse.json({
        id: punchList.id,
        title: punchList.name,
        name: punchList.name,
        description: punchList.description,
        status: punchList.status,
        due_date: punchList.dueDate?.toISOString() ?? null,
        project_id: punchList.projectId,
        project_name: punchList.project?.name ?? null,
        created_by: punchList.createdBy,
        created_by_name: punchList.creator?.name ?? null,
        items: punchList.items.map(item => ({
          id: item.id,
          description: item.description,
          location: item.location,
          trade: item.trade,
          priority: item.priority,
          status: item.status,
          assigned_to: item.assignedTo,
          assignee_name: item.assignee?.name ?? null,
          due_date: item.dueDate?.toISOString() ?? null
        })),
        completed_count: completedCount,
        total_count: punchList.items.length,
        created_at: punchList.createdAt.toISOString()
      })
    }

    // Fallback: try to find a PunchListItem with this ID (backwards compatibility)
    const item = await prisma.punchListItem.findUnique({
      where: { id },
      include: {
        punchList: {
          include: {
            project: { select: { id: true, name: true } },
            creator: { select: { id: true, name: true } }
          }
        },
        assignee: { select: { id: true, name: true } },
        completer: { select: { id: true, name: true } },
        verifier: { select: { id: true, name: true } }
      }
    })

    if (!item) {
      return NextResponse.json({ error: 'Punch list not found' }, { status: 404 })
    }

    return NextResponse.json(flattenItem(item))
  } catch (error) {
    console.error('Error fetching punch list:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/safety/punch-lists/[id] - Update punch list item
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { id } = await params
    const body = await request.json()
    const { status, description, location, trade, priority, assignedTo, dueDate, notes } = body

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (status !== undefined) {
      updateData.status = status
      // Set completion/verification timestamps based on status
      if (status === 'COMPLETED') {
        updateData.completedAt = new Date()
        updateData.completedBy = user.id
      } else if (status === 'VERIFIED') {
        updateData.verifiedAt = new Date()
        updateData.verifiedBy = user.id
      }
    }
    if (description !== undefined) updateData.description = description
    if (location !== undefined) updateData.location = location
    if (trade !== undefined) updateData.trade = trade
    if (priority !== undefined) updateData.priority = priority
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo
    if (dueDate !== undefined) {
      // Parse date as local timezone (not UTC) to preserve user's selected date
      if (dueDate) {
        const [year, month, day] = dueDate.split('-').map(Number)
        updateData.dueDate = new Date(year, month - 1, day)
      } else {
        updateData.dueDate = null
      }
    }
    if (notes !== undefined) updateData.notes = notes

    const item = await prisma.punchListItem.update({
      where: { id },
      data: updateData,
      include: {
        punchList: {
          include: {
            project: { select: { id: true, name: true } },
            creator: { select: { id: true, name: true } }
          }
        },
        assignee: { select: { id: true, name: true } },
        completer: { select: { id: true, name: true } },
        verifier: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json(flattenItem(item))
  } catch (error) {
    console.error('Error updating punch list item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/safety/punch-lists/[id] - Delete punch list item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const { id } = await params

    await prisma.punchListItem.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting punch list item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
