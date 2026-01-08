import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const AUTHORIZED_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'SUPERINTENDENT']

// GET /api/warnings/[id] - Get a single warning
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { id } = await params

    const warning = await prisma.employeeWarning.findUnique({
      where: { id },
      include: {
        employee: {
          select: { id: true, name: true, email: true, role: true }
        },
        issuedBy: {
          select: { id: true, name: true, role: true }
        },
        project: {
          select: { id: true, name: true }
        }
      }
    })

    if (!warning) {
      return NextResponse.json({ error: 'Warning not found' }, { status: 404 })
    }

    // Non-supervisory roles can only see their own warnings
    if (!AUTHORIZED_ROLES.includes(user.role) && warning.employeeId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(warning)
  } catch (error) {
    console.error('Error fetching warning:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/warnings/[id] - Update a warning
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { id } = await params
    const body = await request.json()

    const warning = await prisma.employeeWarning.findUnique({
      where: { id }
    })

    if (!warning) {
      return NextResponse.json({ error: 'Warning not found' }, { status: 404 })
    }

    // Employee can only acknowledge their own warning
    if (!AUTHORIZED_ROLES.includes(user.role)) {
      if (warning.employeeId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Employee can only update acknowledged field
      if (body.acknowledged !== undefined) {
        const updated = await prisma.employeeWarning.update({
          where: { id },
          data: {
            acknowledged: body.acknowledged,
            acknowledgedAt: body.acknowledged ? new Date() : null
          }
        })
        return NextResponse.json({ message: 'Warning acknowledged', warning: updated })
      }

      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Supervisors can update more fields
    const updateData: Record<string, unknown> = {}

    if (body.status) updateData.status = body.status
    if (body.actionRequired !== undefined) updateData.actionRequired = body.actionRequired
    if (body.description) updateData.description = body.description
    if (body.severity) updateData.severity = body.severity

    const updated = await prisma.employeeWarning.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: { id: true, name: true, email: true }
        },
        issuedBy: {
          select: { id: true, name: true }
        },
        project: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json({ message: 'Warning updated', warning: updated })
  } catch (error) {
    console.error('Error updating warning:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/warnings/[id] - Delete/void a warning
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Only admins can delete warnings
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can delete warnings' },
        { status: 403 }
      )
    }

    const { id } = await params

    const warning = await prisma.employeeWarning.findUnique({
      where: { id }
    })

    if (!warning) {
      return NextResponse.json({ error: 'Warning not found' }, { status: 404 })
    }

    // Soft delete by setting status to VOID instead of actual delete
    await prisma.employeeWarning.update({
      where: { id },
      data: { status: 'VOID' }
    })

    return NextResponse.json({ message: 'Warning voided successfully' })
  } catch (error) {
    console.error('Error deleting warning:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
