import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Helper to transform task to flat snake_case format for iOS
function transformTask(task: {
  id: string
  projectId: string
  project?: { id: string; name: string } | null
  title: string
  description: string | null
  priority: string
  status: string
  assigneeId: string | null
  assignee?: { id: string; name: string } | null
  dueDate: Date | null
  completedAt: Date | null
  subtasks: unknown
  tags: unknown
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: task.id,
    project_id: task.projectId,
    project_name: task.project?.name || null,
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    assignee_id: task.assigneeId,
    assignee_name: task.assignee?.name || null,
    due_date: task.dueDate,
    completed_at: task.completedAt,
    subtasks: task.subtasks,
    tags: task.tags,
    created_by: task.createdBy,
    created_at: task.createdAt,
    updated_at: task.updatedAt
  }
}

// GET /api/tasks/[id] - Get single task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const { id } = await params
    const task = await prisma.projectTask.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json(transformTask(task))
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/tasks/[id] - Update task (full update)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const { id } = await params
    const body = await request.json()

    // Accept both camelCase and snake_case for iOS compatibility
    const title = body.title
    const description = body.description
    const priority = body.priority
    const status = body.status
    const assigneeId = body.assigneeId || body.assignee_id
    const dueDate = body.dueDate || body.due_date

    const task = await prisma.projectTask.update({
      where: { id },
      data: {
        title,
        description,
        priority,
        status,
        assigneeId,
        dueDate: dueDate ? new Date(dueDate) : null,
        completedAt: status === 'COMPLETED' ? new Date() : null
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json(transformTask(task))
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/tasks/[id] - Partial update task
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const { id } = await params
    const body = await request.json()

    // Build update data from provided fields (accept both camelCase and snake_case)
    const updateData: Record<string, unknown> = {}

    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.status !== undefined) {
      updateData.status = body.status
      // Set completedAt when marking as completed
      if (body.status === 'COMPLETED') {
        updateData.completedAt = new Date()
      }
    }
    if (body.assigneeId !== undefined || body.assignee_id !== undefined) {
      updateData.assigneeId = body.assigneeId || body.assignee_id
    }
    if (body.dueDate !== undefined || body.due_date !== undefined) {
      const dueDate = body.dueDate || body.due_date
      updateData.dueDate = dueDate ? new Date(dueDate) : null
    }

    const task = await prisma.projectTask.update({
      where: { id },
      data: updateData,
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json(transformTask(task))
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/tasks/[id] - Delete task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const { id } = await params
    await prisma.projectTask.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
