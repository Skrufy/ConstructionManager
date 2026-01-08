import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/tasks - List tasks
export async function GET(request: NextRequest) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const { user } = authResult

  try {
    const { searchParams } = new URL(request.url)
    // Accept both camelCase and snake_case for iOS compatibility
    const projectId = searchParams.get('projectId') || searchParams.get('project_id')
    const status = searchParams.get('status')
    const pageParam = searchParams.get('page')
    const pageSizeParam = searchParams.get('pageSize') || searchParams.get('page_size')
    const page = Math.max(1, Number.parseInt(pageParam || '1', 10) || 1)
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(pageSizeParam || '25', 10) || 25))
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}
    if (projectId) where.projectId = projectId
    if (status) where.status = status

    const total = await prisma.projectTask.count({ where })
    const tasks = await prisma.projectTask.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize
    })

    // Transform to flat snake_case format for iOS
    const transformedTasks = tasks.map(task => ({
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
    }))

    return NextResponse.json({
      tasks: transformedTasks,
      page,
      page_size: pageSize,
      total,
      total_pages: Math.ceil(total / pageSize)
    })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/tasks - Create task
export async function POST(request: NextRequest) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const { user } = authResult

  try {
    const body = await request.json()
    // Accept both camelCase and snake_case for iOS compatibility
    const projectId = body.projectId || body.project_id
    const title = body.title
    const description = body.description
    const priority = body.priority
    const status = body.status
    const assigneeId = body.assigneeId || body.assignee_id
    const dueDate = body.dueDate || body.due_date

    if (!projectId || !title) {
      return NextResponse.json({ error: 'Project ID and title are required' }, { status: 400 })
    }

    // Validate project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true }
    })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const task = await prisma.projectTask.create({
      data: {
        projectId,
        title,
        description,
        priority: priority || 'MEDIUM',
        status: status || 'TODO',
        assigneeId,
        createdBy: user.id,
        dueDate: dueDate ? new Date(dueDate) : null
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } }
      }
    })

    // Transform to flat snake_case format for iOS
    const transformedTask = {
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

    return NextResponse.json(transformedTask, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
