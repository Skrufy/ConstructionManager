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

// GET /api/scheduling - Get crew schedules
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const userId = searchParams.get('userId')

    const where: Record<string, unknown> = {}
    if (projectId) where.projectId = projectId

    if (startDate || endDate) {
      where.date = {}
      if (startDate) (where.date as Record<string, Date>).gte = new Date(startDate)
      if (endDate) (where.date as Record<string, Date>).lte = new Date(endDate)
    }

    // If user is not a manager, only show their assignments
    if (!MANAGER_ROLES.includes(user.role)) {
      where.assignments = { some: { userId: user.id } }
    }

    const schedules = await prisma.crewSchedule.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        assignments: {
          include: {
            user: { select: { id: true, name: true, role: true } }
          }
        }
      },
      orderBy: { date: 'asc' }
    })

    // If filtering by user, filter assignments
    let result = schedules
    if (userId) {
      result = schedules.filter(s =>
        s.assignments.some(a => a.userId === userId)
      )
    }

    return NextResponse.json({
      schedules: result.map(transformSchedule),
      total: result.length,
      page: 1,
      pageSize: result.length
    })
  } catch (error) {
    console.error('Error fetching schedules:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/scheduling - Create crew schedule
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (!MANAGER_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      projectId,
      date,
      startTime, endTime,      // Web naming
      shiftStart, shiftEnd,    // Android naming
      notes,
      assignments
    } = body

    // Accept both naming conventions
    const finalStartTime = startTime || shiftStart
    const finalEndTime = endTime || shiftEnd

    if (!projectId || !date) {
      return NextResponse.json({ error: 'Project and date are required' }, { status: 400 })
    }

    const schedule = await prisma.crewSchedule.create({
      data: {
        projectId,
        date: new Date(date),
        startTime: finalStartTime,
        endTime: finalEndTime,
        notes,
        createdBy: user.id,
        assignments: {
          create: (assignments || []).map((a: { userId: string; role?: string; notes?: string }) => ({
            userId: a.userId,
            role: a.role,
            notes: a.notes
          }))
        }
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

    return NextResponse.json({ schedule: transformSchedule(schedule) }, { status: 201 })
  } catch (error) {
    console.error('Error creating schedule:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/scheduling - Update crew schedule
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (!MANAGER_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { id, projectId, date, startTime, endTime, notes, status, assignments } = body

    if (!id) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 })
    }

    // Delete existing assignments and recreate
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
        startTime,
        endTime,
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

// DELETE /api/scheduling - Delete crew schedule
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (!MANAGER_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 })
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
