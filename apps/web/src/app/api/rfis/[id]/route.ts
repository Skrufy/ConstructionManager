import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Helper to transform RFI to flat snake_case format for iOS
function transformRfi(rfi: {
  id: string
  projectId: string
  project?: { id: string; name: string } | null
  rfiNumber: string
  subject: string
  question: string
  answer: string | null
  status: string
  priority: string
  assignedTo: string | null
  assignee?: { id: string; name: string } | null
  dueDate: Date | null
  answeredAt: Date | null
  answeredBy: string | null
  attachments: unknown
  submittedBy: string | null
  submitter?: { id: string; name: string } | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
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
}

// GET /api/rfis/[id] - Get single RFI
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const { id } = await params
    const rfi = await prisma.rFI.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        submitter: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } }
      }
    })

    if (!rfi) {
      return NextResponse.json({ error: 'RFI not found' }, { status: 404 })
    }

    return NextResponse.json(transformRfi(rfi))
  } catch (error) {
    console.error('Error fetching RFI:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/rfis/[id] - Update RFI (used for answering, status changes, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const { user } = authResult

  try {
    const { id } = await params
    const body = await request.json()

    // Build update data from provided fields (accept both camelCase and snake_case)
    const updateData: Record<string, unknown> = {}

    if (body.subject !== undefined) updateData.subject = body.subject
    if (body.question !== undefined) updateData.question = body.question
    if (body.answer !== undefined) {
      updateData.answer = body.answer
      updateData.answeredAt = new Date()
      updateData.answeredBy = user.id
    }
    if (body.status !== undefined) updateData.status = body.status
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.assignedTo !== undefined || body.assigned_to !== undefined) {
      updateData.assignedTo = body.assignedTo || body.assigned_to
    }
    if (body.dueDate !== undefined || body.due_date !== undefined) {
      const dueDate = body.dueDate || body.due_date
      updateData.dueDate = dueDate ? new Date(dueDate) : null
    }

    const rfi = await prisma.rFI.update({
      where: { id },
      data: updateData,
      include: {
        project: { select: { id: true, name: true } },
        submitter: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json(transformRfi(rfi))
  } catch (error) {
    console.error('Error updating RFI:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/rfis/[id] - Delete RFI
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const { id } = await params
    await prisma.rFI.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting RFI:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
