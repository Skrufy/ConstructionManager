import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const body = await request.json()
    const {
      clockOut,
      gpsOutLat, gpsOutLng,    // Web/camelCase
      gps_out_lat, gps_out_lng, // Alternative snake_case
      status,
      approvedBy,
      breakMinutes,  // Android sends this for clock out
      notes
    } = body

    const timeEntry = await prisma.timeEntry.findUnique({
      where: { id: params.id },
    })

    if (!timeEntry) {
      return NextResponse.json({ error: 'Time entry not found' }, { status: 404 })
    }

    // Only the owner or admin can update their time entry
    if (timeEntry.userId !== user.id && user.role !== 'ADMIN') {
      // Project managers can approve/reject
      if (!['PROJECT_MANAGER', 'SUPERINTENDENT'].includes(user.role) || !status) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    const updateData: any = {}

    // Handle clock out - if breakMinutes is provided, it's a clock-out request
    if (clockOut) {
      updateData.clockOut = new Date(clockOut)
    } else if (breakMinutes !== undefined || gpsOutLat !== undefined || gps_out_lat !== undefined) {
      // If any clock-out related field is provided, set clockOut to now
      updateData.clockOut = new Date()
    }

    // Accept both camelCase and snake_case for GPS coordinates
    const finalGpsOutLat = gpsOutLat ?? gps_out_lat
    const finalGpsOutLng = gpsOutLng ?? gps_out_lng

    if (finalGpsOutLat !== undefined) updateData.gpsOutLat = finalGpsOutLat
    if (finalGpsOutLng !== undefined) updateData.gpsOutLng = finalGpsOutLng
    if (status) updateData.status = status
    if (approvedBy) updateData.approvedBy = approvedBy
    if (notes !== undefined) updateData.notes = notes
    if (breakMinutes !== undefined) updateData.breakMinutes = breakMinutes

    const updatedEntry = await prisma.timeEntry.update({
      where: { id: params.id },
      data: updateData,
      include: {
        project: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, name: true },
        },
      },
    })

    // Return in multiple formats for compatibility
    const transformed = {
      id: updatedEntry.id,
      user_id: updatedEntry.userId,
      project_id: updatedEntry.projectId,
      project_name: updatedEntry.project.name,
      clock_in: updatedEntry.clockIn.toISOString(),
      clock_out: updatedEntry.clockOut?.toISOString() ?? null,
      gps_latitude_in: updatedEntry.gpsInLat,
      gps_longitude_in: updatedEntry.gpsInLng,
      gps_latitude_out: updatedEntry.gpsOutLat,
      gps_longitude_out: updatedEntry.gpsOutLng,
      status: updatedEntry.status,
      notes: updatedEntry.notes,
      user_name: updatedEntry.user.name,
    }
    return NextResponse.json({
      timeEntry: transformed,
      entry: transformed,  // Android compatibility
      time_entry: transformed,  // Snake case compatibility
      message: updatedEntry.clockOut ? 'Clocked out successfully' : 'Time entry updated'
    })
  } catch (error) {
    console.error('Error updating time entry:', error)
    return NextResponse.json({ error: 'Failed to update time entry' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const timeEntry = await prisma.timeEntry.findUnique({
      where: { id: params.id },
    })

    if (!timeEntry) {
      return NextResponse.json({ error: 'Time entry not found' }, { status: 404 })
    }

    // Only admins can delete time entries
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can delete time entries' }, { status: 403 })
    }

    await prisma.timeEntry.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Time entry deleted' })
  } catch (error) {
    console.error('Error deleting time entry:', error)
    return NextResponse.json({ error: 'Failed to delete time entry' }, { status: 500 })
  }
}
