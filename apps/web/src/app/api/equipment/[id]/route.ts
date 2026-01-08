import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { isOwnerAdmin } from '@/lib/api-permissions'

export const dynamic = 'force-dynamic'

// GET /api/equipment/[id] - Get a single equipment item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Equipment view requires owner/admin access for single item view
    // (Project-specific equipment access should be checked via project context)
    const isAdmin = await isOwnerAdmin(user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params

    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            assignments: true,
            logs: true,
            serviceLogs: true,
          },
        },
      },
    })

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    }

    return NextResponse.json({ equipment })
  } catch (error) {
    console.error('Error fetching equipment:', error)
    return NextResponse.json({ error: 'Failed to fetch equipment' }, { status: 500 })
  }
}

// PUT /api/equipment/[id] - Update an equipment item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Equipment management requires owner/admin access
    const isAdmin = await isOwnerAdmin(user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    // Verify equipment exists
    const existingEquipment = await prisma.equipment.findUnique({
      where: { id },
    })

    if (!existingEquipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.type !== undefined) updateData.type = body.type
    if (body.status !== undefined) updateData.status = body.status
    if (body.samsaraId !== undefined) updateData.samsaraId = body.samsaraId

    const equipment = await prisma.equipment.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ equipment })
  } catch (error) {
    console.error('Error updating equipment:', error)
    return NextResponse.json({ error: 'Failed to update equipment' }, { status: 500 })
  }
}

// DELETE /api/equipment/[id] - Delete an equipment item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Equipment deletion requires owner/admin access
    const isAdmin = await isOwnerAdmin(user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params

    // Verify equipment exists
    const existingEquipment = await prisma.equipment.findUnique({
      where: { id },
    })

    if (!existingEquipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    }

    await prisma.equipment.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting equipment:', error)
    return NextResponse.json({ error: 'Failed to delete equipment' }, { status: 500 })
  }
}
