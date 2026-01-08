import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - List team members for a project
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      select: { id: true, name: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const assignments = await prisma.projectAssignment.findMany({
      where: { projectId: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        projectTemplate: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ assignments, project })
  } catch (error) {
    console.error('Error fetching team members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    )
  }
}

// POST - Add team member to project
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Check if user can manage team
    const userRole = user.role
    if (!['ADMIN', 'PROJECT_MANAGER'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, roleOverride, projectTemplateId } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: params.id },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.projectAssignment.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId: params.id,
        },
      },
    })

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'User is already assigned to this project' },
        { status: 400 }
      )
    }

    // Create assignment
    const assignment = await prisma.projectAssignment.create({
      data: {
        userId,
        projectId: params.id,
        roleOverride: roleOverride || null,
        projectTemplateId: projectTemplateId || null,
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
        projectTemplate: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({ assignment })
  } catch (error) {
    console.error('Error adding team member:', error)
    return NextResponse.json(
      { error: 'Failed to add team member' },
      { status: 500 }
    )
  }
}

// DELETE - Remove team member from project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Check if user can manage team
    const userRole = user.role
    if (!['ADMIN', 'PROJECT_MANAGER'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const assignmentId = searchParams.get('assignmentId')

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'Assignment ID is required' },
        { status: 400 }
      )
    }

    // Check if assignment exists and belongs to this project
    const assignment = await prisma.projectAssignment.findFirst({
      where: {
        id: assignmentId,
        projectId: params.id,
      },
    })

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Delete assignment
    await prisma.projectAssignment.delete({
      where: { id: assignmentId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing team member:', error)
    return NextResponse.json(
      { error: 'Failed to remove team member' },
      { status: 500 }
    )
  }
}

// PATCH - Update team member role override
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Check if user can manage team
    const userRole = user.role
    if (!['ADMIN', 'PROJECT_MANAGER'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { assignmentId, roleOverride, projectTemplateId } = body

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'Assignment ID is required' },
        { status: 400 }
      )
    }

    // Check if assignment exists and belongs to this project
    const assignment = await prisma.projectAssignment.findFirst({
      where: {
        id: assignmentId,
        projectId: params.id,
      },
    })

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Build update data - only include fields that are provided
    const updateData: any = {}
    if (roleOverride !== undefined) {
      updateData.roleOverride = roleOverride || null
    }
    if (projectTemplateId !== undefined) {
      updateData.projectTemplateId = projectTemplateId || null
    }

    // Update assignment
    const updatedAssignment = await prisma.projectAssignment.update({
      where: { id: assignmentId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        projectTemplate: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({ assignment: updatedAssignment })
  } catch (error) {
    console.error('Error updating team member:', error)
    return NextResponse.json(
      { error: 'Failed to update team member' },
      { status: 500 }
    )
  }
}
