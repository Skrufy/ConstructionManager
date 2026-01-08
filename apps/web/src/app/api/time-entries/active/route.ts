import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/time-entries/active - Get the user's active (clocked-in) time entry
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Find active time entry (one with no clockOut)
    const activeEntry = await prisma.timeEntry.findFirst({
      where: {
        userId: user.id,
        clockOut: null,
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: { clockIn: 'desc' },
    })

    if (!activeEntry) {
      return NextResponse.json({
        active: null,
        isClockedIn: false,
      })
    }

    return NextResponse.json({
      active: {
        id: activeEntry.id,
        user_id: activeEntry.userId,
        project_id: activeEntry.projectId,
        project_name: activeEntry.project.name,
        clock_in: activeEntry.clockIn.toISOString(),
        clock_out: null,
        gps_latitude_in: activeEntry.gpsInLat,
        gps_longitude_in: activeEntry.gpsInLng,
        status: activeEntry.status,
        notes: activeEntry.notes,
        user_name: activeEntry.user.name,
      },
      isClockedIn: true,
    })
  } catch (error) {
    console.error('Error fetching active time entry:', error)
    return NextResponse.json({ error: 'Failed to fetch active time entry' }, { status: 500 })
  }
}
