import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Schema for completing invitation acceptance
const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
  supabaseId: z.string().uuid('Invalid Supabase ID'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
})

// GET /api/auth/accept-invitation?token=xxx - Verify token and get invitation details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Invitation token is required' }, { status: 400 })
    }

    // Find the invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        invitedBy: {
          select: {
            name: true,
          }
        }
      }
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 404 })
    }

    // Check if already accepted
    if (invitation.status === 'ACCEPTED') {
      return NextResponse.json({ error: 'This invitation has already been accepted' }, { status: 400 })
    }

    // Check if cancelled
    if (invitation.status === 'CANCELLED') {
      return NextResponse.json({ error: 'This invitation has been cancelled' }, { status: 400 })
    }

    // Check if expired
    const now = new Date()
    if (invitation.expiresAt < now || invitation.status === 'EXPIRED') {
      // Mark as expired if not already
      if (invitation.status !== 'EXPIRED') {
        await prisma.invitation.update({
          where: { token },
          data: { status: 'EXPIRED' }
        })
      }
      return NextResponse.json({ error: 'This invitation has expired' }, { status: 400 })
    }

    // Return invitation details for the registration form
    return NextResponse.json({
      invitation: {
        email: invitation.email,
        role: invitation.role,
        message: invitation.message,
        invited_by_name: invitation.invitedBy.name,
        expires_at: invitation.expiresAt.toISOString(),
      }
    })
  } catch (error) {
    console.error('Error verifying invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/auth/accept-invitation - Complete invitation acceptance and create user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = acceptInvitationSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { token, supabaseId, name } = validation.data

    // Find the invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token }
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 404 })
    }

    // Validate invitation status
    if (invitation.status === 'ACCEPTED') {
      return NextResponse.json({ error: 'This invitation has already been accepted' }, { status: 400 })
    }

    if (invitation.status === 'CANCELLED') {
      return NextResponse.json({ error: 'This invitation has been cancelled' }, { status: 400 })
    }

    const now = new Date()
    if (invitation.expiresAt < now || invitation.status === 'EXPIRED') {
      return NextResponse.json({ error: 'This invitation has expired' }, { status: 400 })
    }

    // Check if user already exists with this email
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: invitation.email }
    })

    if (existingUserByEmail) {
      // If user exists but doesn't have supabaseId, link them and update role
      if (!existingUserByEmail.supabaseId) {
        const updatedUser = await prisma.user.update({
          where: { email: invitation.email },
          data: {
            supabaseId,
            name,
            role: invitation.role, // Apply the invited role
            status: 'ACTIVE',
            migratedAt: new Date(),
            passwordResetRequired: false,
          },
        })

        // Mark invitation as accepted
        await prisma.invitation.update({
          where: { token },
          data: {
            status: 'ACCEPTED',
            acceptedAt: now,
            acceptedUserId: updatedUser.id,
          }
        })

        return NextResponse.json({
          message: 'Invitation accepted successfully',
          user: {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
          },
        })
      }

      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      )
    }

    // Check if user exists by supabaseId
    const existingUserBySupabase = await prisma.user.findUnique({
      where: { supabaseId }
    })

    if (existingUserBySupabase) {
      return NextResponse.json(
        { error: 'This Supabase account is already linked to another user' },
        { status: 400 }
      )
    }

    // Create new user with the invited role
    const user = await prisma.user.create({
      data: {
        supabaseId,
        name,
        email: invitation.email,
        password: '', // No password for Supabase Auth users
        role: invitation.role, // Use the role from the invitation
        status: 'ACTIVE',
      },
    })

    // Mark invitation as accepted
    await prisma.invitation.update({
      where: { token },
      data: {
        status: 'ACCEPTED',
        acceptedAt: now,
        acceptedUserId: user.id,
      }
    })

    return NextResponse.json(
      {
        message: 'Invitation accepted successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error accepting invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
