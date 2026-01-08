import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

interface Subtask {
  id: string
  title: string
  is_completed: boolean
}

// GET /api/tasks/[id]/subtasks - List subtasks
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
      select: { subtasks: true }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const subtasks = (task.subtasks as unknown as Subtask[]) || []
    return NextResponse.json({ subtasks })
  } catch (error) {
    console.error('Error fetching subtasks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/tasks/[id]/subtasks - Create subtask
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const { id } = await params
    const body = await request.json()
    const title = body.title

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const task = await prisma.projectTask.findUnique({
      where: { id },
      select: { subtasks: true }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const existingSubtasks = (task.subtasks as unknown as Subtask[]) || []
    const newSubtask: Subtask = {
      id: randomUUID(),
      title: title.trim(),
      is_completed: false
    }

    await prisma.projectTask.update({
      where: { id },
      data: {
        subtasks: [...existingSubtasks, newSubtask] as unknown as object[]
      }
    })

    return NextResponse.json({ subtask: newSubtask }, { status: 201 })
  } catch (error) {
    console.error('Error creating subtask:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
