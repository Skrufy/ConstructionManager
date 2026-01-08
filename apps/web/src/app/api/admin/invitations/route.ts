import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { VALID_ROLES } from '@/lib/permissions'
import { isOwnerAdmin, getToolAccessLevel } from '@/lib/api-permissions'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// Helper to generate secure invitation token
function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Helper to transform invitation to snake_case format for iOS
function transformInvitation(invitation: {
  id: string
  email: string
  role: string
  status: string
  message: string | null
  expiresAt: Date
  acceptedAt: Date | null
  createdAt: Date
  updatedAt: Date
  invitedBy: {
    id: string
    name: string
    email: string
  }
}) {
  return {
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
}

// GET /api/admin/invitations - List all invitations (admin only)
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Check user management permissions - invitations require admin access
    const isAdmin = await isOwnerAdmin(user.id)
    const accessLevel = await getToolAccessLevel(user.id, null, 'user_management')
    const canViewInvitations = isAdmin || accessLevel === 'admin'

    if (!canViewInvitations) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const invitations = await prisma.invitation.findMany({
      where,
      include: {
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Auto-expire old invitations
    const now = new Date()
    const expiredIds = invitations
      .filter(inv => inv.status === 'PENDING' && inv.expiresAt < now)
      .map(inv => inv.id)

    if (expiredIds.length > 0) {
      await prisma.invitation.updateMany({
        where: { id: { in: expiredIds } },
        data: { status: 'EXPIRED' }
      })
    }

    // Return with updated status
    const updatedInvitations = invitations.map(inv => ({
      ...inv,
      status: expiredIds.includes(inv.id) ? 'EXPIRED' : inv.status
    }))

    return NextResponse.json({
      invitations: updatedInvitations.map(transformInvitation)
    })
  } catch (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/invitations - Create a new invitation (admin only)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Creating invitations requires admin access to user_management
    const isAdmin = await isOwnerAdmin(user.id)
    const accessLevel = await getToolAccessLevel(user.id, null, 'user_management')
    const canCreateInvitations = isAdmin || accessLevel === 'admin'

    if (!canCreateInvitations) {
      return NextResponse.json({ error: 'Only administrators can create invitations' }, { status: 403 })
    }

    const body = await request.json()
    const { email, role, message } = body

    // Validation
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const emailLower = email.toLowerCase().trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailLower)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    const assignedRole = role || 'FIELD_WORKER'
    if (!VALID_ROLES.includes(assignedRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: emailLower }
    })

    if (existingUser) {
      return NextResponse.json({
        error: 'A user with this email already exists'
      }, { status: 409 })
    }

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email: emailLower,
        status: 'PENDING'
      }
    })

    if (existingInvitation) {
      return NextResponse.json({
        error: 'An invitation has already been sent to this email'
      }, { status: 409 })
    }

    // Generate token and expiration (7 days from now)
    const token = generateInviteToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        email: emailLower,
        role: assignedRole,
        invitedById: user.id,
        token,
        expiresAt,
        message: message || null,
        status: 'PENDING',
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

    // TODO: Send invitation email
    // For now, we'll return the token in development for testing
    // In production, this should send an email with the invite link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteUrl = `${baseUrl}/auth/accept-invitation?token=${token}`

    console.log(`[Invitation] Created invite for ${emailLower} - URL: ${inviteUrl}`)

    return NextResponse.json({
      invitation: transformInvitation(invitation),
      // Only include invite_url in development for testing
      ...(process.env.NODE_ENV !== 'production' && { invite_url: inviteUrl })
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
