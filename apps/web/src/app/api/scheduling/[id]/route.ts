import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const MANAGER_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'SUPERINTENDENT']

// Transform schedule for mobile API compatibility
function transformSchedule(schedule: {
  id: string
  projectId: string
  date: Date
  startTime: string | null
  endTime: string | null
  status: string
  notes: string | null
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
  project: { id: string; name: string }
  creator?: { id: string; name: string } | null
  assignments: Array<{
    id: string
    scheduleId: string
    userId: string
    role: string | null
    notes: string | null
    user: { id: string; name: string; role: string }
  }>
}) {
  return {
    id: schedule.id,
    projectId: schedule.projectId,
    project: schedule.project,
    date: schedule.date.toISOString().split('T')[0],
    shiftStart: schedule.startTime,
    shiftEnd: schedule.endTime,
    status: schedule.status,
    notes: schedule.notes,
    createdById: schedule.createdBy,
    createdBy: schedule.creator ?? null,
    assignments: schedule.assignments.map(a => ({
      id: a.id,
      scheduleId: a.scheduleId,
      userId: a.userId,
      user: a.user,
      role: a.role,
      confirmed: false,
      notes: a.notes
    })),
    crewCount: schedule.assignments.length,
    createdAt: schedule.createdAt.toISOString(),
    updatedAt: schedule.updatedAt.toISOString()
  }
}

// GET /api/scheduling/[id] - Get single schedule
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult
    const { id } = await params

    const schedule = await prisma.crewSchedule.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        assignments: {
          include: {
            user: { select: { id: true, name: true, role: true } }
          }
        }
      }
    })

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    // Non-managers can only see their own assignments
    if (!MANAGER_ROLES.includes(user.role)) {
      const isAssigned = schedule.assignments.some(a => a.userId === user.id)
      if (!isAssigned) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json(transformSchedule(schedule))
  } catch (error) {
    console.error('Error fetching schedule:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/scheduling/[id] - Update schedule
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult
    const { id } = await params

    if (!MANAGER_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      projectId,
      date,
      startTime, endTime,
      shiftStart, shiftEnd,
      notes,
      status,
      assignments
    } = body

    // Accept both naming conventions
    const finalStartTime = startTime || shiftStart
    const finalEndTime = endTime || shiftEnd

    // Delete existing assignments and recreate if provided
    if (assignments) {
      await prisma.crewAssignment.deleteMany({
        where: { scheduleId: id }
      })
    }

    const schedule = await prisma.crewSchedule.update({
      where: { id },
      data: {
        projectId,
        date: date ? new Date(date) : undefined,
        startTime: finalStartTime,
        endTime: finalEndTime,
        notes,
        status,
        ...(assignments && {
          assignments: {
            create: assignments.map((a: { userId: string; role?: string; notes?: string }) => ({
              userId: a.userId,
              role: a.role,
              notes: a.notes
            }))
          }
        })
      },
      include: {
        project: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        assignments: {
          include: {
            user: { select: { id: true, name: true, role: true } }
          }
        }
      }
    })

    return NextResponse.json({ schedule: transformSchedule(schedule) })
  } catch (error) {
    console.error('Error updating schedule:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/scheduling/[id] - Delete schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult
    const { id } = await params

    if (!MANAGER_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.crewSchedule.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting schedule:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
