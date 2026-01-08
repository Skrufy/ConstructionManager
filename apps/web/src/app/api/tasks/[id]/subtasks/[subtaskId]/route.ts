import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Subtask type for JSON storage
interface Subtask {
  id: string
  task_id: string
  title: string
  completed: boolean
  completed_at: string | null
  completed_by: string | null
}

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

// PUT /api/tasks/[id]/subtasks/[subtaskId] - Update subtask (Android compatibility)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const { user } = authResult

  try {
    const { id: taskId, subtaskId } = await params
    const body = await request.json()

    // Accept isCompleted (Android) or completed (iOS)
    const completed = body.isCompleted ?? body.completed ?? false

    // Get the task
    const task = await prisma.projectTask.findUnique({
      where: { id: taskId },
      select: { subtasks: true }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Parse subtasks from JSON
    const subtasks = (task.subtasks as unknown as Subtask[]) || []

    // Find and update the subtask
    const subtaskIndex = subtasks.findIndex(s => s.id === subtaskId)
    if (subtaskIndex === -1) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 })
    }

    // Update subtask
    subtasks[subtaskIndex] = {
      ...subtasks[subtaskIndex],
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      completed_by: completed ? user.id : null
    }

    // Update task with new subtasks
    await prisma.projectTask.update({
      where: { id: taskId },
      data: { subtasks: subtasks as unknown as object }
    })

    // Return updated subtask in format Android expects
    return NextResponse.json({
      id: subtasks[subtaskIndex].id,
      task_id: taskId,
      title: subtasks[subtaskIndex].title,
      is_completed: subtasks[subtaskIndex].completed,
      completed_at: subtasks[subtaskIndex].completed_at,
      completed_by: subtasks[subtaskIndex].completed_by
    })
  } catch (error) {
    console.error('Error updating subtask:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/tasks/[id]/subtasks/[subtaskId] - Toggle subtask completion
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const { user } = authResult

  try {
    const { id: taskId, subtaskId } = await params
    const body = await request.json()
    const completed = body.completed === true

    // Get the task
    const task = await prisma.projectTask.findUnique({
      where: { id: taskId },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Parse subtasks from JSON
    const subtasks = (task.subtasks as unknown as Subtask[]) || []

    // Find and update the subtask
    const subtaskIndex = subtasks.findIndex(s => s.id === subtaskId)
    if (subtaskIndex === -1) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 })
    }

    // Update subtask
    subtasks[subtaskIndex] = {
      ...subtasks[subtaskIndex],
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      completed_by: completed ? user.id : null
    }

    // Update task with new subtasks
    const updatedTask = await prisma.projectTask.update({
      where: { id: taskId },
      data: { subtasks: subtasks as unknown as object },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json(transformTask(updatedTask))
  } catch (error) {
    console.error('Error updating subtask:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
