import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/safety/inspections/[id] - Get single inspection
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const { id } = await params

    const inspection = await prisma.inspection.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        inspector: { select: { id: true, name: true } },
        template: { select: { id: true, name: true, category: true } },
        _count: { select: { photos: true } }
      }
    })

    if (!inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })
    }

    // Parse responses JSON for items
    const responses = inspection.responses as Record<string, { status: string; notes?: string }> | null

    return NextResponse.json({
      id: inspection.id,
      date: inspection.date.toISOString(),
      location: inspection.location,
      overall_status: inspection.overallStatus,
      notes: inspection.notes,
      template_id: inspection.templateId,
      template_name: inspection.template?.name ?? null,
      template_category: inspection.template?.category ?? null,
      project_id: inspection.projectId,
      project_name: inspection.project?.name ?? null,
      inspector_id: inspection.inspectorId,
      inspector_name: inspection.inspector?.name ?? null,
      items: responses ? Object.entries(responses).map(([key, value]) => ({
        id: key,
        text: key,
        status: value.status,
        notes: value.notes ?? null
      })) : [],
      photo_count: inspection._count.photos,
      created_at: inspection.createdAt.toISOString()
    })
  } catch (error) {
    console.error('Error fetching inspection:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
