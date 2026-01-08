import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST - Assign a project template to a user's project assignment
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user: currentUser } = authResult

    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      userId,
      user_id,
      projectId,
      project_id,
      projectTemplateId,
      project_template_id,
    } = body

    const targetUserId = userId || user_id
    const targetProjectId = projectId || project_id
    const templateId = projectTemplateId || project_template_id

    if (!targetUserId || !targetProjectId || !templateId) {
      return NextResponse.json(
        { error: 'userId, projectId, and projectTemplateId are required' },
        { status: 400 }
      )
    }

    // Verify template exists and is project-scoped
    const template = await prisma.permissionTemplate.findUnique({
      where: { id: templateId },
    })
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }
    if (template.scope !== 'project') {
      return NextResponse.json(
        { error: 'Template must be project-scoped' },
        { status: 400 }
      )
    }

    // Check if project assignment exists
    const existingAssignment = await prisma.projectAssignment.findUnique({
      where: {
        userId_projectId: {
          userId: targetUserId,
          projectId: targetProjectId,
        },
      },
    })

    if (!existingAssignment) {
      return NextResponse.json(
        { error: 'User is not assigned to this project' },
        { status: 404 }
      )
    }

    // Update the assignment with the template
    const assignment = await prisma.projectAssignment.update({
      where: { id: existingAssignment.id },
      data: {
        projectTemplateId: templateId,
        assignedBy: currentUser.id,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
        project: {
          select: { id: true, name: true },
        },
        projectTemplate: true,
      },
    })

    return NextResponse.json({
      id: assignment.id,
      user_id: assignment.userId,
      user: assignment.user,
      project_id: assignment.projectId,
      project: assignment.project,
      project_template_id: assignment.projectTemplateId,
      project_template_name: assignment.projectTemplate?.name || null,
      assigned_by: assignment.assignedBy,
      assigned_at: assignment.assignedAt,
    })
  } catch (error) {
    console.error('Error assigning project template:', error)
    return NextResponse.json({ error: 'Failed to assign template' }, { status: 500 })
  }
}

// GET - Get all project assignments with templates for a project or user
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id') || searchParams.get('projectId')
    const userId = searchParams.get('user_id') || searchParams.get('userId')

    const where: Record<string, unknown> = {}
    if (projectId) where.projectId = projectId
    if (userId) where.userId = userId

    const assignments = await prisma.projectAssignment.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
        project: {
          select: { id: true, name: true },
        },
        projectTemplate: {
          select: {
            id: true,
            name: true,
            description: true,
            toolPermissions: true,
            granularPermissions: true,
          },
        },
      },
      orderBy: [{ project: { name: 'asc' } }, { user: { name: 'asc' } }],
    })

    const transformed = assignments.map((a) => ({
      id: a.id,
      user_id: a.userId,
      user: a.user,
      project_id: a.projectId,
      project: a.project,
      project_template_id: a.projectTemplateId,
      project_template: a.projectTemplate
        ? {
            id: a.projectTemplate.id,
            name: a.projectTemplate.name,
            description: a.projectTemplate.description,
            tool_permissions: a.projectTemplate.toolPermissions,
            granular_permissions: a.projectTemplate.granularPermissions,
          }
        : null,
      role_override: a.roleOverride,
      assigned_by: a.assignedBy,
      assigned_at: a.assignedAt,
    }))

    return NextResponse.json({
      assignments: transformed,
      count: transformed.length,
    })
  } catch (error) {
    console.error('Error fetching project assignments:', error)
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 })
  }
}

// DELETE - Remove project template from assignment (keeps user on project)
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user: currentUser } = authResult

    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const assignmentId = searchParams.get('assignment_id') || searchParams.get('assignmentId')

    if (!assignmentId) {
      return NextResponse.json({ error: 'assignmentId is required' }, { status: 400 })
    }

    const assignment = await prisma.projectAssignment.findUnique({
      where: { id: assignmentId },
    })

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    // Clear the project template (user stays on project)
    await prisma.projectAssignment.update({
      where: { id: assignmentId },
      data: {
        projectTemplateId: null,
        assignedBy: currentUser.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Project template removed from assignment',
    })
  } catch (error) {
    console.error('Error removing project template:', error)
    return NextResponse.json({ error: 'Failed to remove template' }, { status: 500 })
  }
}
