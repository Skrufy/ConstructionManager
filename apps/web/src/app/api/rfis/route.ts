import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/rfis - List RFIs
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

    const total = await prisma.rFI.count({ where })
    const rfis = await prisma.rFI.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        submitter: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize
    })

    // Transform to flat snake_case format for iOS
    const transformedRfis = rfis.map(rfi => ({
      id: rfi.id,
      project_id: rfi.projectId,
      project_name: rfi.project?.name || null,
      rfi_number: rfi.rfiNumber,
      subject: rfi.subject,
      question: rfi.question,
      answer: rfi.answer,
      status: rfi.status,
      priority: rfi.priority,
      assigned_to: rfi.assignedTo,
      assigned_to_name: rfi.assignee?.name || null,
      due_date: rfi.dueDate,
      answered_at: rfi.answeredAt,
      answered_by: rfi.answeredBy,
      attachments: rfi.attachments,
      created_by: rfi.submittedBy,
      created_by_name: rfi.submitter?.name || null,
      created_at: rfi.createdAt,
      updated_at: rfi.updatedAt
    }))

    return NextResponse.json({
      rfis: transformedRfis,
      page,
      page_size: pageSize,
      total,
      total_pages: Math.ceil(total / pageSize)
    })
  } catch (error) {
    console.error('Error fetching RFIs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/rfis - Create RFI
export async function POST(request: NextRequest) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const { user } = authResult

  try {
    const body = await request.json()
    // Accept both camelCase and snake_case for iOS compatibility
    const projectId = body.projectId || body.project_id
    const subject = body.subject
    const question = body.question
    const priority = body.priority
    const assigneeId = body.assigneeId || body.assignee_id || body.assigned_to
    const dueDate = body.dueDate || body.due_date

    if (!projectId || !subject || !question) {
      return NextResponse.json({ error: 'Project ID, subject, and question are required' }, { status: 400 })
    }

    // Validate project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true }
    })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Generate RFI number
    const count = await prisma.rFI.count({ where: { projectId } })
    const rfiNumber = `RFI-${String(count + 1).padStart(4, '0')}`

    const rfi = await prisma.rFI.create({
      data: {
        projectId,
        rfiNumber,
        subject,
        question,
        priority: priority || 'MEDIUM',
        status: 'SUBMITTED',
        submittedBy: user.id,
        assignedTo: assigneeId,
        dueDate: dueDate ? new Date(dueDate) : null
      },
      include: {
        project: { select: { id: true, name: true } },
        submitter: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } }
      }
    })

    // Transform to flat snake_case format for iOS
    const transformedRfi = {
      id: rfi.id,
      project_id: rfi.projectId,
      project_name: rfi.project?.name || null,
      rfi_number: rfi.rfiNumber,
      subject: rfi.subject,
      question: rfi.question,
      answer: rfi.answer,
      status: rfi.status,
      priority: rfi.priority,
      assigned_to: rfi.assignedTo,
      assigned_to_name: rfi.assignee?.name || null,
      due_date: rfi.dueDate,
      answered_at: rfi.answeredAt,
      answered_by: rfi.answeredBy,
      attachments: rfi.attachments,
      created_by: rfi.submittedBy,
      created_by_name: rfi.submitter?.name || null,
      created_at: rfi.createdAt,
      updated_at: rfi.updatedAt
    }

    return NextResponse.json(transformedRfi, { status: 201 })
  } catch (error) {
    console.error('Error creating RFI:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
