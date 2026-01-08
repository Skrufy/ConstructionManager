import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { requirePermission, isOwnerAdmin } from '@/lib/api-permissions'

export const dynamic = 'force-dynamic'

// Transform equipment to snake_case for mobile compatibility
function transformEquipment(equipment: {
  id: string
  name: string
  type: string
  samsaraId: string | null
  status: string
  currentLat: number | null
  currentLng: number | null
  lastUpdated: Date | null
  createdAt: Date
  updatedAt: Date
  _count?: {
    assignments: number
    logs: number
  }
}) {
  return {
    id: equipment.id,
    name: equipment.name,
    type: equipment.type,
    samsara_id: equipment.samsaraId,
    status: equipment.status,
    current_lat: equipment.currentLat,
    current_lng: equipment.currentLng,
    gps_latitude: equipment.currentLat,
    gps_longitude: equipment.currentLng,
    last_updated: equipment.lastUpdated,
    created_at: equipment.createdAt,
    updated_at: equipment.updatedAt,
    // Flatten _count for mobile
    assignment_count: equipment._count?.assignments ?? 0,
    log_count: equipment._count?.logs ?? 0,
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    // Check equipment access - if projectId provided, check project permission
    // Otherwise, require owner/admin for company-wide view
    if (projectId) {
      const permCheck = await requirePermission(request, 'equipment', projectId, 'read_only')
      if (permCheck.response) return permCheck.response
    } else {
      // Company-wide equipment view requires owner/admin
      const isAdmin = await isOwnerAdmin(user.id)
      if (!isAdmin) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    const status = searchParams.get('status')
    const search = searchParams.get('search') || searchParams.get('q')

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    // Add search filtering for name and type
    if (search && search.trim().length >= 2) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { type: { contains: search.trim(), mode: 'insensitive' } },
      ]
    }

    const equipment = await prisma.equipment.findMany({
      where,
      include: {
        _count: {
          select: {
            assignments: true,
            logs: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      equipment: equipment.map(transformEquipment),
      total: equipment.length,
    })
  } catch (error) {
    console.error('Error fetching equipment:', error)
    return NextResponse.json({ error: 'Failed to fetch equipment' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Creating equipment requires owner/admin access
    const isAdmin = await isOwnerAdmin(user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      type,
      samsaraId,
      samsara_id,
      status = 'AVAILABLE',
    } = body

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      )
    }

    const equipment = await prisma.equipment.create({
      data: {
        name,
        type,
        samsaraId: samsaraId ?? samsara_id,
        status,
      },
    })

    // Transform for mobile compatibility
    const transformed = {
      id: equipment.id,
      name: equipment.name,
      type: equipment.type,
      samsara_id: equipment.samsaraId,
      status: equipment.status,
      current_lat: equipment.currentLat,
      current_lng: equipment.currentLng,
      gps_latitude: equipment.currentLat,
      gps_longitude: equipment.currentLng,
      last_updated: equipment.lastUpdated,
      created_at: equipment.createdAt,
      updated_at: equipment.updatedAt,
    }

    return NextResponse.json(transformed, { status: 201 })
  } catch (error) {
    console.error('Error creating equipment:', error)
    return NextResponse.json({ error: 'Failed to create equipment' }, { status: 500 })
  }
}
