import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/safety/incidents/[id] - Get single incident
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const { id } = await params

    const incident = await prisma.incidentReport.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true } },
        closer: { select: { id: true, name: true } }
      }
    })

    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: incident.id,
      project_id: incident.projectId,
      project_name: incident.project?.name ?? null,
      reported_by: incident.reportedBy,
      reporter_name: incident.reporter?.name ?? null,
      incident_date: incident.incidentDate.toISOString(),
      incident_time: incident.incidentTime,
      location: incident.location,
      incident_type: incident.incidentType,
      severity: incident.severity,
      description: incident.description,
      root_cause: incident.rootCause,
      immediate_actions: incident.immediateActions,
      witnesses: incident.witnesses,
      injured_parties: incident.injuredParties,
      photos: incident.photos,
      status: incident.status,
      investigation_notes: incident.investigationNotes,
      corrective_actions: incident.correctiveActions,
      closed_at: incident.closedAt?.toISOString() ?? null,
      closed_by: incident.closedBy,
      closer_name: incident.closer?.name ?? null,
      created_at: incident.createdAt.toISOString(),
      updated_at: incident.updatedAt.toISOString()
    })
  } catch (error) {
    console.error('Error fetching incident:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
