import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Type for meeting attendee from database
interface MeetingAttendeeDB {
  id: string
  meetingId: string
  employeeId: string
  attended: boolean
  signatureUrl: string | null
  signedAt: Date | null
  employee: {
    id: string
    name: string
    company: string | null
    jobTitle: string | null
  }
}

// Helper to transform meeting to flat snake_case format for iOS
// iOS uses JSONDecoder.keyDecodingStrategy = .convertFromSnakeCase
function transformMeeting(meeting: {
  id: string
  projectId: string | null
  project?: { id: string; name: string } | null
  conductedBy: string
  conductor?: { id: string; name: string } | null
  date: Date
  time: string | null
  location: string | null
  topic: string
  topicId: string | null
  safetyTopic?: { id: string; name: string; category: string | null } | null
  description: string | null
  duration: number | null
  attendees: unknown
  meetingAttendees?: MeetingAttendeeDB[]
  leaderSignature: string | null
  photoUrl: string | null
  notes: string | null
  followUpItems: unknown
  createdAt: Date
  updatedAt: Date
}) {
  // Transform attendees from MeetingAttendee relation to match iOS MeetingAttendee model
  const transformedAttendees = meeting.meetingAttendees?.map(ma => ({
    id: ma.id,
    meeting_id: ma.meetingId,
    user_id: ma.employee?.id ?? null,
    name: ma.employee?.name ?? 'Unknown',
    company: ma.employee?.company ?? null,
    signed_at: ma.signedAt?.toISOString() ?? null,
    signature_url: ma.signatureUrl
  })) || []

  // Transform followUpItems to match iOS MeetingActionItem model
  const actionItems = Array.isArray(meeting.followUpItems)
    ? (meeting.followUpItems as Array<{ id?: string; description?: string; assignedTo?: string; assignedToName?: string; dueDate?: string; completed?: boolean; completedAt?: string }>).map((item, index) => ({
        id: item.id || `action-${index}`,
        meeting_id: meeting.id,
        description: item.description || '',
        assigned_to: item.assignedTo ?? null,
        assigned_to_name: item.assignedToName ?? null,
        due_date: item.dueDate ?? null,
        completed: item.completed || false,
        completed_at: item.completedAt ?? null
      }))
    : null

  // Get attendees count
  const legacyCount = Array.isArray(meeting.attendees) ? (meeting.attendees as unknown[]).length : 0
  const relationalCount = meeting.meetingAttendees?.length || 0

  // Get meeting type from topic category
  // Valid iOS SafetyMeetingType values: TOOLBOX_TALK, WEEKLY, MONTHLY, SPECIAL, INCIDENT_REVIEW, ORIENTATION,
  //                                     PPE, HAZARDS, PROCEDURES, EMERGENCY, EQUIPMENT, GENERAL
  const meetingType = meeting.safetyTopic?.category || 'GENERAL'

  return {
    // Flat snake_case fields for iOS (convertFromSnakeCase will convert to camelCase)
    id: meeting.id,
    project_id: meeting.projectId,
    project_name: meeting.project?.name ?? null,
    type: meetingType,
    title: meeting.topic,  // iOS expects 'title', use topic as title
    topic: meeting.safetyTopic?.name ?? meeting.topic,
    description: meeting.description,
    date: meeting.date.toISOString(),  // Full ISO string for Date parsing
    duration: meeting.duration,
    location: meeting.location,
    conducted_by: meeting.conductedBy,
    conducted_by_name: meeting.conductor?.name ?? null,
    attendees: transformedAttendees,
    action_items: actionItems,
    attachments: null,  // Not in current schema
    notes: meeting.notes,
    created_at: meeting.createdAt.toISOString(),
    updated_at: meeting.updatedAt.toISOString(),
    // Additional fields for Android compatibility
    time: meeting.time,
    topic_id: meeting.topicId,
    leader_signature: meeting.leaderSignature,
    photo_url: meeting.photoUrl,
    attendee_count: Math.max(legacyCount, relationalCount)
  }
}

// GET /api/safety/meetings - List safety meetings
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const { searchParams } = new URL(request.url)
    // Accept both camelCase and snake_case
    const projectId = searchParams.get('projectId') || searchParams.get('project_id')

    // Pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '25', 10)))
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}
    if (projectId) where.projectId = projectId

    const [meetings, total] = await Promise.all([
      prisma.safetyMeeting.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          conductor: { select: { id: true, name: true } },
          safetyTopic: { select: { id: true, name: true, category: true } },
          meetingAttendees: {
            include: {
              employee: {
                select: { id: true, name: true, company: true, jobTitle: true }
              }
            }
          }
        },
        orderBy: { date: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.safetyMeeting.count({ where })
    ])

    // Transform to camelCase format for Android
    const transformedMeetings = meetings.map(transformMeeting)

    return NextResponse.json({
      meetings: transformedMeetings,
      total,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Error fetching meetings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/safety/meetings - Create new safety meeting
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const body = await request.json()
    const {
      projectId,
      date,
      time,
      location,
      topic,
      topicId,
      description,
      duration,
      attendees,          // Legacy: array of names/objects
      attendeeIds,        // New: array of employee IDs
      leaderSignature,
      photoUrl,
      notes,
      followUpItems
    } = body

    // Validation: date and topic required, attendees optional for flexibility
    if (!date || !topic) {
      return NextResponse.json({ error: 'Date and topic are required' }, { status: 400 })
    }

    // photoUrl and leaderSignature are optional - can be added later

    // Create the meeting
    // Parse date as local timezone (not UTC) to preserve user's selected date
    const [year, month, day] = date.split('-').map(Number)
    const localDate = new Date(year, month - 1, day)

    const meeting = await prisma.safetyMeeting.create({
      data: {
        projectId: projectId || null,  // Optional now
        conductedBy: user.id,
        date: localDate,
        time: time || null,
        location: location || null,
        topic,
        topicId: topicId || null,
        description: description || null,
        duration: duration || null,
        attendees: attendees || [],  // Legacy field
        leaderSignature: leaderSignature || null,
        photoUrl: photoUrl || null,
        notes: notes || null,
        followUpItems: followUpItems || undefined,
        // Create meeting attendees if employee IDs provided
        ...(attendeeIds && attendeeIds.length > 0 ? {
          meetingAttendees: {
            create: attendeeIds.map((employeeId: string) => ({
              employeeId,
              attended: true
            }))
          }
        } : {})
      },
      include: {
        project: { select: { id: true, name: true } },
        conductor: { select: { id: true, name: true } },
        safetyTopic: { select: { id: true, name: true, category: true } },
        meetingAttendees: {
          include: {
            employee: {
              select: { id: true, name: true, company: true, jobTitle: true }
            }
          }
        }
      }
    })

    // Transform response for Android
    return NextResponse.json({ meeting: transformMeeting(meeting) }, { status: 201 })
  } catch (error) {
    console.error('Error creating meeting:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
