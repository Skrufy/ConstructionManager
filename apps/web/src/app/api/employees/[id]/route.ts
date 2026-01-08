import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Roles that can manage employees
const AUTHORIZED_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'SUPERINTENDENT', 'FOREMAN', 'CREW_LEADER']

// GET /api/employees/[id] - Get a single employee
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const { id } = await params

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        meetingAttendances: {
          include: {
            meeting: {
              select: {
                id: true,
                date: true,
                topic: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    return NextResponse.json(employee)
  } catch (error) {
    console.error('Error fetching employee:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/employees/[id] - Update an employee
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Check authorization
    if (!AUTHORIZED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, email, phone, company, jobTitle, userId, isActive } = body

    // Check employee exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { id }
    })

    if (!existingEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Validation
    if (name !== undefined && (!name || name.trim() === '')) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    }

    // Check if email already exists for another employee
    if (email && email !== existingEmployee.email) {
      const emailConflict = await prisma.employee.findFirst({
        where: {
          email: email.toLowerCase(),
          id: { not: id }
        }
      })
      if (emailConflict) {
        return NextResponse.json({ error: 'An employee with this email already exists' }, { status: 409 })
      }
    }

    // If userId is being changed, verify it's not already linked
    if (userId !== undefined && userId !== existingEmployee.userId) {
      if (userId) {
        const userLink = await prisma.employee.findFirst({
          where: {
            userId,
            id: { not: id }
          }
        })
        if (userLink) {
          return NextResponse.json({ error: 'This user is already linked to another employee' }, { status: 409 })
        }
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (email !== undefined) updateData.email = email ? email.toLowerCase().trim() : null
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null
    if (company !== undefined) updateData.company = company ? company.trim() : null
    if (jobTitle !== undefined) updateData.jobTitle = jobTitle ? jobTitle.trim() : null
    if (userId !== undefined) updateData.userId = userId || null
    if (isActive !== undefined) updateData.isActive = isActive

    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        jobTitle: true,
        userId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    return NextResponse.json(updatedEmployee)
  } catch (error) {
    console.error('Error updating employee:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/employees/[id] - Delete an employee (soft delete by marking inactive)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Only admins can delete
    if (!['ADMIN', 'PROJECT_MANAGER'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const employee = await prisma.employee.findUnique({
      where: { id }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Soft delete - mark as inactive rather than actually deleting
    await prisma.employee.update({
      where: { id },
      data: { isActive: false }
    })

    return NextResponse.json({ message: 'Employee deactivated successfully' })
  } catch (error) {
    console.error('Error deleting employee:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
