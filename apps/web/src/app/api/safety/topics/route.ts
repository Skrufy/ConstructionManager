import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Roles that can manage topics
const MANAGE_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'SUPERINTENDENT']

// Valid categories
const VALID_CATEGORIES = ['PPE', 'HAZARDS', 'PROCEDURES', 'EMERGENCY', 'EQUIPMENT', 'GENERAL']

// GET /api/safety/topics - List all safety topics
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const where: Record<string, unknown> = {}

    // Default to active topics only
    if (!includeInactive) {
      where.isActive = true
    }

    if (category && VALID_CATEGORIES.includes(category)) {
      where.category = category
    }

    const topics = await prisma.safetyTopic.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        isDefault: true,
        isActive: true,
        sortOrder: true,
        createdAt: true,
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(topics)
  } catch (error) {
    console.error('Error fetching safety topics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/safety/topics - Create a new safety topic
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Check authorization
    if (!MANAGE_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, category, sortOrder } = body

    // Validation
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    // Check if topic with same name exists
    const existingTopic = await prisma.safetyTopic.findUnique({
      where: { name: name.trim() }
    })

    if (existingTopic) {
      return NextResponse.json({ error: 'A topic with this name already exists' }, { status: 409 })
    }

    // Get next sort order if not provided
    let order = sortOrder
    if (order === undefined) {
      const maxOrder = await prisma.safetyTopic.findFirst({
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true }
      })
      order = (maxOrder?.sortOrder || 0) + 1
    }

    // Create topic
    const newTopic = await prisma.safetyTopic.create({
      data: {
        name: name.trim(),
        description: description ? description.trim() : null,
        category: category || 'GENERAL',
        sortOrder: order,
        isDefault: false,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        isDefault: true,
        isActive: true,
        sortOrder: true,
        createdAt: true,
      }
    })

    return NextResponse.json(newTopic, { status: 201 })
  } catch (error) {
    console.error('Error creating safety topic:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
