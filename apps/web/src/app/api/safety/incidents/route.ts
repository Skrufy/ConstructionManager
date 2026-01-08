import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Type for incident from Prisma
type IncidentRecord = {
  id: string
  projectId: string
  project?: { id: string; name: string } | null
  reportedBy: string
  reporter?: { id: string; name: string } | null
  incidentDate: Date
  incidentTime: string | null
  location: string
  incidentType: string
  severity: string
  description: string
  rootCause: string | null
  immediateActions: string | null
  witnesses: unknown
  injuredParties: unknown
  photos: unknown
  status: string
  investigationNotes: string | null
  correctiveActions: string | null
  closedAt: Date | null
  closedBy: string | null
  closer?: { id: string; name: string } | null
  createdAt: Date
  updatedAt: Date
}

// Transform incident for mobile compatibility (iOS decoder uses convertFromSnakeCase)
function transformIncident(incident: IncidentRecord) {
  return {
    id: incident.id,
    project_id: incident.projectId,
    project_name: incident.project?.name ?? null,
    reported_by: incident.reportedBy,
    reporter_name: incident.reporter?.name ?? null,
    incident_date: incident.incidentDate.toISOString(),
    incident_time: incident.incidentTime,
    location: incident.location,
    incident_type: incident.incidentType,
    type: incident.incidentType,  // Android compatibility
    severity: incident.severity,
    title: incident.description.substring(0, 100),  // Android compatibility
    description: incident.description,
    root_cause: incident.rootCause,
    immediate_actions: incident.immediateActions,
    witnesses: incident.witnesses,
    injured_parties: incident.injuredParties,
    involved_personnel: incident.injuredParties,  // Android compatibility
    photo_urls: incident.photos,
    photos: incident.photos,  // Android compatibility
    status: incident.status,
    investigation_notes: incident.investigationNotes,
    corrective_actions: incident.correctiveActions,
    closed_at: incident.closedAt?.toISOString() ?? null,
    closed_by: incident.closedBy,
    closer_name: incident.closer?.name ?? null,
    created_at: incident.createdAt.toISOString(),
    updated_at: incident.updatedAt.toISOString()
  }
}

// GET /api/safety/incidents - List incident reports
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId') || searchParams.get('project_id')
    const status = searchParams.get('status')
    const severity = searchParams.get('severity')
    const incidentType = searchParams.get('type') || searchParams.get('incident_type')
    const pageParam = searchParams.get('page')
    const pageSizeParam = searchParams.get('pageSize') || searchParams.get('page_size')
    const page = Math.max(1, Number.parseInt(pageParam || '1', 10) || 1)
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(pageSizeParam || '25', 10) || 25))
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}
    if (projectId) where.projectId = projectId
    if (status) where.status = status
    if (severity) where.severity = severity
    if (incidentType) where.incidentType = incidentType

    const total = await prisma.incidentReport.count({ where })
    const incidents = await prisma.incidentReport.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true } },
        closer: { select: { id: true, name: true } }
      },
      orderBy: { incidentDate: 'desc' },
      skip,
      take: pageSize
    })

    return NextResponse.json({
      incidents: incidents.map(transformIncident),
      page,
      pageSize,
      total
    })
  } catch (error) {
    console.error('Error fetching incidents:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/safety/incidents - Create new incident report
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const body = await request.json()
    const {
      projectId,
      incidentDate,
      incidentTime,
      location,
      incidentType,
      type, // Android sends 'type'
      severity,
      description,
      title, // Android sends 'title'
      rootCause,
      immediateActions,
      witnesses,
      injuredParties,
      photos
    } = body

    // Accept both 'type' (Android) and 'incidentType' (web)
    const finalType = incidentType || type
    // Use title as description if description not provided
    const finalDescription = description || title
    // Default location if not provided
    const finalLocation = location || 'Not specified'

    if (!projectId || !incidentDate || !finalType || !severity || !finalDescription) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Parse date as local timezone (not UTC) to preserve user's selected date
    const [year, month, day] = incidentDate.split('-').map(Number)
    const localDate = new Date(year, month - 1, day)

    const incident = await prisma.incidentReport.create({
      data: {
        projectId,
        reportedBy: user.id,
        incidentDate: localDate,
        incidentTime,
        location: finalLocation,
        incidentType: finalType,
        severity,
        description: finalDescription,
        rootCause,
        immediateActions,
        witnesses: witnesses || undefined,
        injuredParties: injuredParties || undefined,
        photos: photos || undefined
      },
      include: {
        project: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true } }
      }
    })

    // Return incident directly for iOS compatibility (no wrapper)
    return NextResponse.json(transformIncident(incident), { status: 201 })
  } catch (error) {
    console.error('Error creating incident:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
