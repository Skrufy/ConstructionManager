import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuthWithRoles } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { sendInvitationEmail } from '@/lib/email'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// Helper to generate secure invitation token
function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// POST /api/admin/invitations/[id]/resend - Resend an invitation (admin only)
export async function POST(
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

    // Can only resend pending or expired invitations
    if (!['PENDING', 'EXPIRED'].includes(invitation.status)) {
      return NextResponse.json({
        error: `Cannot resend invitation with status: ${invitation.status}`
      }, { status: 400 })
    }

    // Generate new token and extend expiration (7 days from now)
    const newToken = generateInviteToken()
    const newExpiresAt = new Date()
    newExpiresAt.setDate(newExpiresAt.getDate() + 7)

    // Update invitation with new token and expiration
    const updatedInvitation = await prisma.invitation.update({
      where: { id },
      data: {
        token: newToken,
        expiresAt: newExpiresAt,
        status: 'PENDING', // Reset to pending if it was expired
      },
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

    // Send invitation email
    const emailResult = await sendInvitationEmail({
      to: updatedInvitation.email,
      inviterName: updatedInvitation.invitedBy.name || 'An administrator',
      role: updatedInvitation.role,
      token: newToken,
      message: updatedInvitation.message,
      expiresAt: newExpiresAt,
    })

    if (!emailResult.success) {
      console.warn(`[Invitation] Email failed for ${invitation.email}: ${emailResult.error}`)
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteUrl = `${baseUrl}/auth/accept-invitation?token=${newToken}`

    console.log(`[Invitation] Resent invite for ${invitation.email} - Email sent: ${emailResult.success}`)

    return NextResponse.json({
      success: true,
      email_sent: emailResult.success,
      invitation: {
        id: updatedInvitation.id,
        email: updatedInvitation.email,
        role: updatedInvitation.role,
        status: updatedInvitation.status,
        expires_at: updatedInvitation.expiresAt.toISOString(),
        created_at: updatedInvitation.createdAt.toISOString(),
        updated_at: updatedInvitation.updatedAt.toISOString(),
      },
      // Only include invite_url in development for testing
      ...(process.env.NODE_ENV !== 'production' && { invite_url: inviteUrl })
    })
  } catch (error) {
    console.error('Error resending invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
