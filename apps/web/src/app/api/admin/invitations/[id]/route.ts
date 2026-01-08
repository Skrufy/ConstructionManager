import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuthWithRoles } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// DELETE /api/admin/invitations/[id] - Cancel an invitation (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuthWithRoles(request, ['ADMIN'])
    if (authResult instanceof NextResponse) return authResult

    const { id } = await params

    // Find the invitation
    const invitation = await prisma.invitation.findUnique({
      where: { id }
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Can only cancel pending invitations
    if (invitation.status !== 'PENDING') {
      return NextResponse.json({
        error: `Cannot cancel invitation with status: ${invitation.status}`
      }, { status: 400 })
    }

    // Update status to cancelled
    await prisma.invitation.update({
      where: { id },
      data: { status: 'CANCELLED' }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error cancelling invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/admin/invitations/[id] - Get a single invitation (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuthWithRoles(request, ['ADMIN'])
    if (authResult instanceof NextResponse) return authResult

    const { id } = await params

    const invitation = await prisma.invitation.findUnique({
      where: { id },
      include: {
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Check if expired
    const now = new Date()
    if (invitation.status === 'PENDING' && invitation.expiresAt < now) {
      await prisma.invitation.update({
        where: { id },
        data: { status: 'EXPIRED' }
      })
      invitation.status = 'EXPIRED'
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        message: invitation.message,
        expires_at: invitation.expiresAt.toISOString(),
        accepted_at: invitation.acceptedAt?.toISOString() ?? null,
        created_at: invitation.createdAt.toISOString(),
        updated_at: invitation.updatedAt.toISOString(),
        invited_by: {
          id: invitation.invitedBy.id,
          name: invitation.invitedBy.name,
          email: invitation.invitedBy.email,
        }
      }
    })
  } catch (error) {
    console.error('Error fetching invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
