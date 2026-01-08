import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Type for inspection from Prisma
type InspectionRecord = {
  id: string
  templateId: string | null
  template: { id: string; name: string; category: string | null } | null
  projectId: string
  project: { id: string; name: string }
  inspectorId: string
  inspector: { id: string; name: string }
  date: Date
  location: string | null
  responses: unknown
  overallStatus: string
  notes: string | null
  createdAt: Date
  updatedAt: Date
  _count?: { photos: number }
}

// Transform inspection for mobile compatibility (iOS decoder uses convertFromSnakeCase)
// iOS uses ISO8601DateFormatter for date parsing, so we need full ISO strings
function transformInspection(inspection: InspectionRecord) {
  return {
    id: inspection.id,
    template_id: inspection.templateId ?? '',  // iOS expects non-optional templateId
    template_name: inspection.template?.name ?? null,
    template_category: inspection.template?.category ?? null,
    project_id: inspection.projectId,
    project_name: inspection.project?.name ?? null,
    inspector_id: inspection.inspectorId,
    inspector_name: inspection.inspector?.name ?? null,
    date: inspection.date.toISOString(),  // Full ISO string for date parsing
    scheduled_date: inspection.date.toISOString(),  // Full ISO string
    location: inspection.location,
    responses: inspection.responses,
    overall_status: inspection.overallStatus,
    overall_result: inspection.overallStatus === 'PASSED' ? 'PASS' : inspection.overallStatus === 'FAILED' ? 'FAIL' : null,
    status: inspection.overallStatus === 'SCHEDULED' ? 'SCHEDULED' :
            inspection.overallStatus === 'PASSED' ? 'COMPLETED' :
            inspection.overallStatus === 'FAILED' ? 'FAILED' : 'IN_PROGRESS',
    notes: inspection.notes,
    signature_url: null,
    photo_count: inspection._count?.photos ?? 0,
    created_at: inspection.createdAt.toISOString(),
    updated_at: inspection.updatedAt.toISOString()
  }
}

// GET /api/safety/inspections - List inspections
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const templateId = searchParams.get('templateId')
    const pageParam = searchParams.get('page')
    const pageSizeParam = searchParams.get('pageSize')
    const page = Math.max(1, Number.parseInt(pageParam || '1', 10) || 1)
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(pageSizeParam || '25', 10) || 25))

    const where: Record<string, unknown> = {}
    if (projectId) where.projectId = projectId
    if (status) where.overallStatus = status
    if (templateId) where.templateId = templateId

    const total = await prisma.inspection.count({ where })
    const inspections = await prisma.inspection.findMany({
      where,
      include: {
        template: { select: { id: true, name: true, category: true } },
        project: { select: { id: true, name: true } },
        inspector: { select: { id: true, name: true } },
        _count: { select: { photos: true } }
      },
      orderBy: { date: 'desc' }
    })

    return NextResponse.json({
      inspections: inspections.map(transformInspection),
      total,
      page,
      pageSize
    })
  } catch (error) {
    console.error('Error fetching inspections:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/safety/inspections - Create new inspection (schedule or complete)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const body = await request.json()
    const {
      templateId,
      projectId,
      date,           // Web format
      scheduledDate,  // Android format
      type,           // Android sends type instead of templateId for scheduling
      location,
      responses,
      notes
    } = body

    // Accept both date and scheduledDate
    const inspectionDate = date || scheduledDate

    // Require projectId and date at minimum
    if (!projectId || !inspectionDate) {
      return NextResponse.json({ error: 'Project and date are required' }, { status: 400 })
    }

    // Calculate overall status based on responses (if provided)
    let overallStatus = 'SCHEDULED' // Default for scheduling
    if (responses) {
      const parsedResponses = typeof responses === 'string' ? JSON.parse(responses) : responses
      const failedItems = Object.values(parsedResponses).filter((r: unknown) =>
        typeof r === 'object' && r !== null && 'status' in r && (r as { status: string }).status === 'FAIL'
      ).length
      overallStatus = failedItems > 0 ? 'FAILED' : 'PASSED'
    }

    // Validate templateId if provided (convert empty string to null)
    let validTemplateId: string | null = null
    if (templateId && templateId.trim() !== '') {
      // Check if template exists
      const template = await prisma.inspectionTemplate.findUnique({
        where: { id: templateId }
      })
      if (template) {
        validTemplateId = templateId
      }
      // If template doesn't exist, just set to null (don't fail)
    }

    // Parse date as local timezone (not UTC) to preserve user's selected date
    const [year, month, day] = inspectionDate.split('-').map(Number)
    const localDate = new Date(year, month - 1, day)

    const inspection = await prisma.inspection.create({
      data: {
        templateId: validTemplateId,
        projectId,
        inspectorId: user.id,
        date: localDate,
        location: location || null,
        responses: responses || undefined,
        overallStatus,
        notes: notes || null
      },
      include: {
        template: { select: { id: true, name: true, category: true } },
        project: { select: { id: true, name: true } },
        inspector: { select: { id: true, name: true } },
        _count: { select: { photos: true } }
      }
    })

    // Return inspection directly for iOS compatibility (no wrapper)
    const transformed = transformInspection(inspection)
    return NextResponse.json({
      ...transformed,
      type: type || inspection.template?.category || null
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating inspection:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
