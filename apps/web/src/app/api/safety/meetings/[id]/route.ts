import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/safety/meetings/[id] - Get single meeting
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const { id } = await params

    const meeting = await prisma.safetyMeeting.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        conductor: { select: { id: true, name: true } },
        meetingAttendees: {
          include: {
            employee: { select: { id: true, name: true, company: true } }
          }
        }
      }
    })

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // Use meetingAttendees relation if available, otherwise fall back to legacy JSON attendees
    const attendeesList = meeting.meetingAttendees.length > 0
      ? meeting.meetingAttendees.map(a => ({
          id: a.employee.id,
          name: a.employee.name,
          company: a.employee.company
        }))
      : (meeting.attendees as Array<{ id?: string; name: string; company?: string }> || []).map(a => ({
          id: a.id ?? '',
          name: a.name,
          company: a.company ?? null
        }))

    return NextResponse.json({
      id: meeting.id,
      date: meeting.date.toISOString(),
      time: meeting.time,
      topic: meeting.topic,
      description: meeting.description,
      duration: meeting.duration,
      location: meeting.location,
      notes: meeting.notes,
      project_id: meeting.projectId,
      project_name: meeting.project?.name ?? null,
      conducted_by: meeting.conductedBy,
      conductor_name: meeting.conductor?.name ?? null,
      attendees: attendeesList,
      attendee_count: attendeesList.length,
      photo_url: meeting.photoUrl,
      leader_signature: meeting.leaderSignature,
      created_at: meeting.createdAt.toISOString()
    })
  } catch (error) {
    console.error('Error fetching meeting:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
