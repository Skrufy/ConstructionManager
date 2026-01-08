import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST - Create or update a user permission override
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, overrides, reason } = body

    if (!userId || !overrides) {
      return NextResponse.json({ error: 'User ID and overrides are required' }, { status: 400 })
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Upsert the override
    const override = await prisma.userPermissionOverride.upsert({
      where: { userId },
      update: {
        overrides,
        reason,
        grantedBy: user.id,
        updatedAt: new Date(),
      },
      create: {
        userId,
        overrides,
        reason,
        grantedBy: user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    return NextResponse.json({ override })
  } catch (error) {
    console.error('Error creating permission override:', error)
    return NextResponse.json({ error: 'Failed to create override' }, { status: 500 })
  }
}

// DELETE - Remove a user permission override
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    await prisma.userPermissionOverride.delete({
      where: { userId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting permission override:', error)
    return NextResponse.json({ error: 'Failed to delete override' }, { status: 500 })
  }
}
