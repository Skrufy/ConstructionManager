import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { VALID_ROLES, VALID_STATUSES } from '@/lib/permissions'
import { isOwnerAdmin, getToolAccessLevel } from '@/lib/api-permissions'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

// GET /api/users/[id] - Get a single user
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Users can view their own profile, or users with user_management access can view any user
    const isOwnProfile = user.id === params.id
    const isAdmin = await isOwnerAdmin(user.id)
    const accessLevel = await getToolAccessLevel(user.id, null, 'user_management')
    const hasPermission = isAdmin || accessLevel !== 'none'

    if (!isOwnProfile && !hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        isBlaster: true,
        createdAt: true,
        updatedAt: true,
        projectAssignments: {
          select: {
            id: true,
            roleOverride: true,
            project: {
              select: {
                id: true,
                name: true,
                status: true,
              }
            }
          }
        },
        _count: {
          select: {
            dailyLogs: true,
            timeEntries: true,
            warningsReceived: true,
          }
        }
      }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(targetUser)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT / PATCH /api/users/[id] - Update a user
async function updateUser(
  request: NextRequest,
  params: { id: string }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Updating users requires admin access to user_management
    const isAdmin = await isOwnerAdmin(user.id)
    const accessLevel = await getToolAccessLevel(user.id, null, 'user_management')
    const canUpdateUsers = isAdmin || accessLevel === 'admin'

    if (!canUpdateUsers) {
      return NextResponse.json({ error: 'Only administrators can update users' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password, phone, role, status, isBlaster } = body

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Validation
    if (role && !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // If email is being changed, check it's not already taken
    if (email && email.toLowerCase() !== existingUser.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      })

      if (emailTaken) {
        return NextResponse.json({ error: 'This email is already in use' }, { status: 409 })
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (name) updateData.name = name
    if (email) updateData.email = email.toLowerCase()
    if (phone !== undefined) updateData.phone = phone || null
    if (role) updateData.role = role
    if (status) updateData.status = status
    if (isBlaster !== undefined) updateData.isBlaster = isBlaster

    // Hash new password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        isBlaster: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return updateUser(request, params)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return updateUser(request, params)
}

// DELETE /api/users/[id] - Delete a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Deleting users requires admin access to user_management
    const isAdmin = await isOwnerAdmin(user.id)
    const accessLevel = await getToolAccessLevel(user.id, null, 'user_management')
    const canDeleteUsers = isAdmin || accessLevel === 'admin'

    if (!canDeleteUsers) {
      return NextResponse.json({ error: 'Only administrators can delete users' }, { status: 403 })
    }

    // Prevent deleting yourself
    if (user.id === params.id) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
