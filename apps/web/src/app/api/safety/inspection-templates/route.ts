import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/safety/inspection-templates - List inspection templates
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const where: Record<string, unknown> = { isActive: true }
    if (category) where.category = category

    const templates = await prisma.inspectionTemplate.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        items: true,
        createdAt: true
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching inspection templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/safety/inspection-templates - Create inspection template
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Only managers can create templates
    const MANAGER_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'OFFICE']
    if (!MANAGER_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, category, items } = body

    if (!name || !category || !items) {
      return NextResponse.json({ error: 'Name, category, and items are required' }, { status: 400 })
    }

    const template = await prisma.inspectionTemplate.create({
      data: {
        name,
        description,
        category,
        items,
        createdBy: user.id
      }
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Error creating inspection template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
