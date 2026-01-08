import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import cache, { cacheTTL } from '@/lib/cache'

export const dynamic = 'force-dynamic'

// Cache key for labels
const getLabelsCacheKey = (category: string | null, projectId: string | null, activeOnly: boolean) =>
  `labels:${category || 'all'}:${projectId || 'global'}:${activeOnly ? 'active' : 'all'}`

// Roles that can manage labels
const AUTHORIZED_ROLES = ['ADMIN', 'PROJECT_MANAGER']

// Valid label categories
const VALID_CATEGORIES = [
  'ACTIVITY',
  'LOCATION_BUILDING',
  'LOCATION_FLOOR',
  'LOCATION_ZONE',
  'LOCATION_ROOM',
  'STATUS',
  'MATERIAL',
  'ISSUE',
  'VISITOR',
]

// GET /api/labels - List all labels
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const projectId = searchParams.get('projectId')
    const activeOnly = searchParams.get('activeOnly') !== 'false'

    // Check cache first (labels rarely change)
    const cacheKey = getLabelsCacheKey(category, projectId, activeOnly)
    const cached = cache.get<unknown[]>(cacheKey)
    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'X-Cache': 'HIT' }
      })
    }

    const where: Record<string, unknown> = {}
    if (category) where.category = category
    if (projectId) {
      // Include global labels and project-specific labels
      where.OR = [
        { projectId: null },
        { projectId },
      ]
    }
    if (activeOnly) where.isActive = true

    const labels = await prisma.label.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: [
        { category: 'asc' },
        { sortOrder: 'asc' },
        { name: 'asc' },
      ]
    })

    // Cache for 5 minutes (labels rarely change)
    cache.set(cacheKey, labels, {
      ttl: cacheTTL.medium,
      tags: ['labels']
    })

    return NextResponse.json(labels, {
      headers: { 'X-Cache': 'MISS' }
    })
  } catch (error) {
    console.error('Error fetching labels:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Default labels to restore (mirror of DEFAULT_LABELS in utils.ts)
const DEFAULT_LABELS: Record<string, string[]> = {
  ACTIVITY: [
    'Framing', 'Electrical Rough-In', 'Drywall Hang', 'Concrete Pour',
    'Plumbing', 'HVAC', 'Painting', 'Flooring', 'Cleanup', 'Punch List',
  ],
  LOCATION_BUILDING: [
    'Building A', 'Building B', 'Main Building', 'Garage', 'Outbuilding',
  ],
  LOCATION_FLOOR: [
    'Basement', 'Ground/Slab', 'Floor 1', 'Floor 2', 'Floor 3', 'Roof',
  ],
  LOCATION_ZONE: [
    'North Wing', 'South Wing', 'East Side', 'West Side', 'Interior', 'Exterior',
  ],
  LOCATION_ROOM: [
    'Kitchen', 'Bathroom', 'Bedroom', 'Mechanical Room', 'Hallway', 'Common Area',
  ],
  STATUS: [
    'Started', 'In Progress', 'Continued', 'Completed', 'On Hold', 'Rework',
  ],
  MATERIAL: [
    'Concrete', 'Rebar', 'Lumber', 'Drywall', 'Pipe/Fittings', 'Wire/Cable',
    'Paint', 'Flooring', 'Fixtures',
  ],
  ISSUE: [
    'Weather', 'Waiting on Trade', 'Material Delay', 'Equipment Down',
    'Short Crew', 'Failed Inspection', 'Design Conflict',
  ],
  VISITOR: [
    'Owner', 'Architect', 'Inspector - Building', 'Inspector - Electrical',
    'Inspector - Plumbing', 'Inspector - Fire', 'OSHA', 'Engineer',
  ],
}

// POST /api/labels - Create a new label or restore defaults
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Only admins and project managers can create labels
    if (!AUTHORIZED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { action, category, name, projectId, isActive, sortOrder } = body

    // Handle restore action
    if (action === 'restore') {
      const createdLabels = []
      const categoriesToRestore = category ? [category] : Object.keys(DEFAULT_LABELS)

      for (const cat of categoriesToRestore) {
        const labels = DEFAULT_LABELS[cat] || []
        for (let i = 0; i < labels.length; i++) {
          const labelName = labels[i]
          // Check if label exists (case-insensitive)
          const existing = await prisma.label.findFirst({
            where: {
              name: { equals: labelName, mode: 'insensitive' },
              category: cat,
              projectId: null,
            }
          })

          if (existing) {
            // Re-activate if it was hidden
            if (!existing.isActive) {
              await prisma.label.update({
                where: { id: existing.id },
                data: { isActive: true }
              })
            }
            continue
          }

          // Create the label
          const label = await prisma.label.create({
            data: {
              category: cat,
              name: labelName,
              projectId: null,
              isActive: true,
              sortOrder: i + 1,
            }
          })
          createdLabels.push(label)
        }
      }

      // Invalidate labels cache
      cache.invalidateTag('labels')

      return NextResponse.json({
        message: `Restored ${createdLabels.length} default labels`,
        created: createdLabels.length,
        categories: categoriesToRestore.length,
      })
    }

    // Handle bulk hide action
    if (action === 'hideAll' && category) {
      const result = await prisma.label.updateMany({
        where: {
          category,
          projectId: projectId || null,
        },
        data: { isActive: false }
      })

      // Invalidate labels cache
      cache.invalidateTag('labels')

      return NextResponse.json({
        message: `Hidden ${result.count} labels in ${category}`,
        count: result.count,
      })
    }

    // Validation
    if (!category || !name) {
      return NextResponse.json({ error: 'Category and name are required' }, { status: 400 })
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    // Check for duplicate name in same category/project (case-insensitive)
    const existingLabel = await prisma.label.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        category,
        projectId: projectId || null,
      }
    })

    if (existingLabel) {
      return NextResponse.json({ error: 'A label with this name already exists in this category' }, { status: 409 })
    }

    // Get next sort order if not provided
    let finalSortOrder = sortOrder
    if (finalSortOrder === undefined) {
      const maxSortOrder = await prisma.label.aggregate({
        where: { category, projectId: projectId || null },
        _max: { sortOrder: true }
      })
      finalSortOrder = (maxSortOrder._max.sortOrder || 0) + 1
    }

    // Create label
    const label = await prisma.label.create({
      data: {
        category,
        name,
        projectId: projectId || null,
        isActive: isActive !== false,
        sortOrder: finalSortOrder,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    // Invalidate labels cache
    cache.invalidateTag('labels')

    return NextResponse.json(label, { status: 201 })
  } catch (error) {
    console.error('Error creating label:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
