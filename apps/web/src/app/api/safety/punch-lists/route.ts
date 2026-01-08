import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Type for punch list item from Prisma
type PunchListItemRecord = {
  id: string
  description: string
  location: string | null
  trade: string | null
  priority: string
  status: string
  assignedTo: string | null
  assignee: { id: string; name: string } | null
  dueDate: Date | null
  completedAt: Date | null
  completedBy: string | null
  completer?: { id: string; name: string } | null
  verifiedAt: Date | null
  verifiedBy: string | null
  verifier?: { id: string; name: string } | null
  photos: unknown
  notes: string | null
  createdAt: Date
  updatedAt?: Date
}

// Transform punch list item for mobile compatibility (iOS decoder uses convertFromSnakeCase)
function transformPunchListItem(
  item: PunchListItemRecord,
  projectId: string,
  projectName: string | null,
  createdBy?: string | null,
  createdByName?: string | null
) {
  return {
    id: item.id,
    project_id: projectId,
    project_name: projectName,
    location: item.location,
    description: item.description,
    trade: item.trade,
    priority: item.priority,
    status: item.status,
    assigned_to: item.assignedTo,
    assigned_to_name: item.assignee?.name ?? null,
    due_date: item.dueDate?.toISOString() ?? null,
    completed_at: item.completedAt?.toISOString() ?? null,
    completed_by: item.completedBy,
    verified_at: item.verifiedAt?.toISOString() ?? null,
    verified_by: item.verifiedBy,
    photos: item.photos ?? [],
    notes: item.notes,
    created_by: createdBy ?? null,
    created_by_name: createdByName ?? null,
    created_at: item.createdAt.toISOString(),
    updated_at: (item.updatedAt ?? item.createdAt).toISOString()
  }
}

// GET /api/safety/punch-lists - List punch lists with items
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId') || searchParams.get('project_id')

    // Build where clause for punch lists
    const where: Record<string, unknown> = {}
    if (projectId) where.projectId = projectId

    // Fetch punch lists directly with their items
    const punchLists = await prisma.punchList.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        items: {
          include: {
            assignee: { select: { id: true, name: true } },
            completer: { select: { id: true, name: true } },
            verifier: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Also return punch list items as flat list for iOS PunchListItem model
    const allItems = punchLists.flatMap(punchList =>
      punchList.items.map(item => transformPunchListItem(
        item,
        punchList.projectId,
        punchList.project?.name ?? null,
        punchList.createdBy,
        punchList.creator?.name ?? null
      ))
    )

    const transformedPunchLists = punchLists.map(punchList => {
      const completedCount = punchList.items.filter(i => i.status === 'COMPLETED' || i.status === 'VERIFIED').length
      return {
        id: punchList.id,
        project_id: punchList.projectId,
        project_name: punchList.project?.name ?? null,
        title: punchList.name || 'Untitled',
        description: punchList.description,
        status: punchList.items.length === 0 ? 'OPEN' :
          (completedCount === punchList.items.length ? 'COMPLETED' :
           punchList.items.some(i => i.status === 'IN_PROGRESS') ? 'IN_PROGRESS' : 'OPEN'),
        due_date: punchList.dueDate?.toISOString() ?? null,
        created_by: punchList.createdBy,
        created_by_name: punchList.creator?.name ?? null,
        items: punchList.items.map(item => transformPunchListItem(
          item,
          punchList.projectId,
          punchList.project?.name ?? null,
          punchList.createdBy,
          punchList.creator?.name ?? null
        )),
        completed_count: completedCount,
        total_count: punchList.items.length,
        created_at: punchList.createdAt.toISOString(),
        updated_at: punchList.updatedAt.toISOString()
      }
    })

    return NextResponse.json({
      punch_lists: transformedPunchLists,
      items: allItems,  // Flat list of all items for iOS
      total: transformedPunchLists.length,
      page: 1,
      page_size: transformedPunchLists.length
    })
  } catch (error) {
    console.error('Error fetching punch lists:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/safety/punch-lists - Create new punch list with items
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const body = await request.json()
    const { projectId, name, title, description, dueDate, items } = body

    // Accept both 'name' (web) and 'title' (Android)
    const punchListName = name || title

    if (!projectId || !punchListName) {
      return NextResponse.json({ error: 'Project and name/title are required' }, { status: 400 })
    }

    // Parse dates as local timezone (not UTC) to preserve user's selected date
    const parseDateAsLocal = (dateStr: string | null | undefined): Date | null => {
      if (!dateStr) return null
      const [year, month, day] = dateStr.split('-').map(Number)
      return new Date(year, month - 1, day)
    }

    const punchList = await prisma.punchList.create({
      data: {
        projectId,
        name: punchListName,
        description,
        dueDate: parseDateAsLocal(dueDate),
        createdBy: user.id,
        items: items ? {
          create: items.map((item: Record<string, unknown>) => ({
            description: item.description as string,
            location: item.location as string | undefined,
            trade: item.trade as string | undefined,
            priority: (item.priority as string) || 'MEDIUM',
            assignedTo: item.assignedTo as string | undefined,
            dueDate: parseDateAsLocal(item.dueDate as string | undefined)
          }))
        } : undefined
      },
      include: {
        project: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        items: {
          include: {
            assignee: { select: { id: true, name: true } }
          }
        }
      }
    })

    // Return punch list directly for iOS compatibility (no wrapper)
    const response = {
      id: punchList.id,
      project_id: punchList.projectId,
      project_name: punchList.project?.name ?? null,
      title: punchList.name,
      description: punchList.description,
      status: 'OPEN',
      due_date: punchList.dueDate?.toISOString() ?? null,
      created_by: punchList.createdBy,
      created_by_name: punchList.creator?.name ?? null,
      items: punchList.items.map(item => transformPunchListItem(
        item,
        punchList.projectId,
        punchList.project?.name ?? null,
        punchList.createdBy,
        punchList.creator?.name ?? null
      )),
      completed_count: 0,
      total_count: punchList.items.length,
      created_at: punchList.createdAt.toISOString(),
      updated_at: punchList.updatedAt.toISOString()
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error creating punch list:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
