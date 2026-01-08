import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Transform time entry for mobile API compatibility (snake_case with flattened fields)
function transformTimeEntry(entry: {
  id: string
  userId: string
  projectId: string
  clockIn: Date
  clockOut: Date | null
  gpsInLat: number | null
  gpsInLng: number | null
  gpsOutLat: number | null
  gpsOutLng: number | null
  status: string
  notes: string | null
  project: { id: string; name: string }
  user: { id: string; name: string }
}) {
  return {
    id: entry.id,
    user_id: entry.userId,
    project_id: entry.projectId,
    project_name: entry.project.name,
    clock_in: entry.clockIn.toISOString(),
    clock_out: entry.clockOut?.toISOString() ?? null,
    gps_latitude_in: entry.gpsInLat,
    gps_longitude_in: entry.gpsInLng,
    gps_latitude_out: entry.gpsOutLat,
    gps_longitude_out: entry.gpsOutLng,
    status: entry.status,
    notes: entry.notes,
    user_name: entry.user.name,
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId') || searchParams.get('project_id')
    const filterUserId = searchParams.get('userId') || searchParams.get('user_id')
    const pageParam = searchParams.get('page')
    const pageSizeParam = searchParams.get('pageSize') || searchParams.get('page_size')
    const page = Math.max(1, Number.parseInt(pageParam || '1', 10) || 1)
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(pageSizeParam || '25', 10) || 25))
    const skip = (page - 1) * pageSize

    const where: any = {}
    if (projectId) where.projectId = projectId

    // Non-admins can only see their own time entries
    if (user.role !== 'ADMIN' && user.role !== 'PROJECT_MANAGER') {
      where.userId = user.id
    } else if (filterUserId) {
      where.userId = filterUserId
    }

    const total = await prisma.timeEntry.count({ where })
    const timeEntries = await prisma.timeEntry.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: { clockIn: 'desc' },
      skip,
      take: pageSize,
    })

    return NextResponse.json({
      time_entries: timeEntries.map(transformTimeEntry),
      page,
      page_size: pageSize,
      total,
      total_pages: Math.ceil(total / pageSize)
    })
  } catch (error) {
    console.error('Error fetching time entries:', error)
    return NextResponse.json({ error: 'Failed to fetch time entries' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const body = await request.json()
    const { projectId, gpsInLat, gpsInLng } = body

    if (!projectId) {
      return NextResponse.json({ error: 'Project is required' }, { status: 400 })
    }

    // Validate GPS coordinates if provided
    if (gpsInLat !== undefined && gpsInLat !== null) {
      if (typeof gpsInLat !== 'number' || gpsInLat < -90 || gpsInLat > 90) {
        return NextResponse.json({ error: 'Invalid GPS latitude. Must be between -90 and 90.' }, { status: 400 })
      }
    }
    if (gpsInLng !== undefined && gpsInLng !== null) {
      if (typeof gpsInLng !== 'number' || gpsInLng < -180 || gpsInLng > 180) {
        return NextResponse.json({ error: 'Invalid GPS longitude. Must be between -180 and 180.' }, { status: 400 })
      }
    }

    // Check for existing active time entry
    const activeEntry = await prisma.timeEntry.findFirst({
      where: {
        userId: user.id,
        clockOut: null,
      },
    })

    if (activeEntry) {
      return NextResponse.json(
        { error: 'You already have an active time entry. Please clock out first.' },
        { status: 400 }
      )
    }

    const timeEntry = await prisma.timeEntry.create({
      data: {
        userId: user.id,
        projectId,
        clockIn: new Date(),
        gpsInLat,
        gpsInLng,
        status: 'PENDING',
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, name: true },
        },
      },
    })

    const transformed = transformTimeEntry(timeEntry)
    return NextResponse.json({
      time_entry: transformed,
      entry: transformed,  // Android compatibility
      timeEntry: transformed,  // Alternative naming
      message: 'Clocked in successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating time entry:', error)
    return NextResponse.json({ error: 'Failed to clock in' }, { status: 500 })
  }
}
