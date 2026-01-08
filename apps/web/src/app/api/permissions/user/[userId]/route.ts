import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { PROJECT_TOOLS, COMPANY_TOOLS, AccessLevel } from '@/lib/permission-system'

export const dynamic = 'force-dynamic'

type ToolPermissions = Record<string, AccessLevel>
type GranularPermissions = Record<string, string[]>

// GET - Get a user's effective permissions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user: currentUser } = authResult

    const { userId } = await params

    // Users can view their own permissions, admins can view anyone's
    if (currentUser.id !== userId && currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get user with all permission-related data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        companyPermission: {
          include: {
            companyTemplate: true,
          },
        },
        projectAssignments: {
          include: {
            project: {
              select: { id: true, name: true, status: true },
            },
            projectTemplate: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is Owner/Admin (protected template or ADMIN role)
    const isOwnerAdmin =
      user.role === 'ADMIN' ||
      user.companyPermission?.companyTemplate?.isProtected === true

    // Build company-level permissions
    const companyToolPermissions: ToolPermissions = {}
    const companyGranularPermissions: GranularPermissions = {}

    if (isOwnerAdmin) {
      // Owner/Admin gets full access to everything
      for (const tool of COMPANY_TOOLS) {
        companyToolPermissions[tool] = 'admin'
      }
    } else if (user.companyPermission?.companyTemplate) {
      const template = user.companyPermission.companyTemplate
      const toolPerms = template.toolPermissions as unknown as ToolPermissions
      const granularPerms = template.granularPermissions as unknown as GranularPermissions

      for (const tool of COMPANY_TOOLS) {
        companyToolPermissions[tool] = toolPerms[tool] || 'none'
      }
      Object.assign(companyGranularPermissions, granularPerms)
    } else {
      // No company permission - no access
      for (const tool of COMPANY_TOOLS) {
        companyToolPermissions[tool] = 'none'
      }
    }

    // Build project-level permissions for each project
    const projectPermissions = user.projectAssignments.map((assignment) => {
      const projectToolPermissions: ToolPermissions = {}
      const projectGranularPermissions: GranularPermissions = {}

      if (isOwnerAdmin) {
        // Owner/Admin gets full access to all projects
        for (const tool of PROJECT_TOOLS) {
          projectToolPermissions[tool] = 'admin'
        }
      } else if (assignment.projectTemplate) {
        const template = assignment.projectTemplate
        const toolPerms = template.toolPermissions as unknown as ToolPermissions
        const granularPerms = template.granularPermissions as unknown as GranularPermissions

        for (const tool of PROJECT_TOOLS) {
          projectToolPermissions[tool] = toolPerms[tool] || 'none'
        }
        Object.assign(projectGranularPermissions, granularPerms)
      } else {
        // No template assigned - default to read_only for safety
        for (const tool of PROJECT_TOOLS) {
          projectToolPermissions[tool] = 'read_only'
        }
      }

      return {
        project_id: assignment.projectId,
        project: {
          id: assignment.project.id,
          name: assignment.project.name,
          status: assignment.project.status,
        },
        template_id: assignment.projectTemplateId,
        template_name: assignment.projectTemplate?.name || null,
        tool_permissions: projectToolPermissions,
        granular_permissions: projectGranularPermissions,
      }
    })

    return NextResponse.json({
      user_id: user.id,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      is_owner_admin: isOwnerAdmin,
      company_permissions: {
        template_id: user.companyPermission?.companyTemplateId || null,
        template_name: user.companyPermission?.companyTemplate?.name || null,
        tool_permissions: companyToolPermissions,
        granular_permissions: companyGranularPermissions,
      },
      project_permissions: projectPermissions,
      summary: {
        total_projects: projectPermissions.length,
        company_template: user.companyPermission?.companyTemplate?.name || 'None',
        migrated: !!user.companyPermission,
      },
    })
  } catch (error) {
    console.error('Error fetching user permissions:', error)
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 })
  }
}
