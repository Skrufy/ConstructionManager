import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { ROLE_TO_COMPANY_TEMPLATE, ROLE_TO_PROJECT_TEMPLATE } from '@/lib/permission-system'

export const dynamic = 'force-dynamic'

// POST - Assign company template to a user
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
      companyTemplateId,
      company_template_id,
    } = body

    const targetUserId = userId || user_id
    const templateId = companyTemplateId || company_template_id

    if (!targetUserId || !templateId) {
      return NextResponse.json({ error: 'userId and companyTemplateId are required' }, { status: 400 })
    }

    // Verify user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    })
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify template exists and is company-scoped
    const template = await prisma.permissionTemplate.findUnique({
      where: { id: templateId },
    })
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }
    if (template.scope !== 'company') {
      return NextResponse.json({ error: 'Template must be company-scoped' }, { status: 400 })
    }

    // Upsert the company permission
    const permission = await prisma.userCompanyPermission.upsert({
      where: { userId: targetUserId },
      update: {
        companyTemplateId: templateId,
        assignedBy: currentUser.id,
      },
      create: {
        userId: targetUserId,
        companyTemplateId: templateId,
        assignedBy: currentUser.id,
      },
      include: {
        companyTemplate: true,
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    })

    return NextResponse.json({
      id: permission.id,
      user_id: permission.userId,
      user: permission.user,
      company_template_id: permission.companyTemplateId,
      company_template_name: permission.companyTemplate.name,
      assigned_by: permission.assignedBy,
      assigned_at: permission.assignedAt,
    })
  } catch (error) {
    console.error('Error assigning company template:', error)
    return NextResponse.json({ error: 'Failed to assign template' }, { status: 500 })
  }
}

// PUT - Migrate a user from old role to new template system
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user: currentUser } = authResult

    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, user_id, migrateAll } = body

    // Migrate a single user or all users
    if (migrateAll) {
      // Migrate all users without company permissions
      const usersToMigrate = await prisma.user.findMany({
        where: {
          companyPermission: null,
        },
        select: {
          id: true,
          role: true,
          projectAssignments: {
            select: { id: true, projectId: true, projectTemplateId: true },
          },
        },
      })

      let migratedCount = 0

      for (const user of usersToMigrate) {
        // Get company template based on role
        const companyTemplateName = ROLE_TO_COMPANY_TEMPLATE[user.role] || 'No Company Access'
        const companyTemplate = await prisma.permissionTemplate.findFirst({
          where: { name: companyTemplateName, scope: 'company' },
        })

        if (companyTemplate) {
          await prisma.userCompanyPermission.create({
            data: {
              userId: user.id,
              companyTemplateId: companyTemplate.id,
              assignedBy: currentUser.id,
            },
          })
          migratedCount++
        }

        // Update project assignments without templates
        const projectTemplateName = ROLE_TO_PROJECT_TEMPLATE[user.role] || 'Field Worker'
        const projectTemplate = await prisma.permissionTemplate.findFirst({
          where: { name: projectTemplateName, scope: 'project' },
        })

        if (projectTemplate) {
          for (const assignment of user.projectAssignments) {
            if (!assignment.projectTemplateId) {
              await prisma.projectAssignment.update({
                where: { id: assignment.id },
                data: {
                  projectTemplateId: projectTemplate.id,
                  assignedBy: currentUser.id,
                },
              })
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        migrated_users: migratedCount,
        message: `Migrated ${migratedCount} users to new permission system`,
      })
    }

    // Migrate single user
    const targetUserId = userId || user_id
    if (!targetUserId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        companyPermission: true,
        projectAssignments: true,
      },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Skip if already has company permission
    if (targetUser.companyPermission) {
      return NextResponse.json({
        success: true,
        message: 'User already migrated',
        already_migrated: true,
      })
    }

    // Get company template based on role
    const companyTemplateName = ROLE_TO_COMPANY_TEMPLATE[targetUser.role] || 'No Company Access'
    const companyTemplate = await prisma.permissionTemplate.findFirst({
      where: { name: companyTemplateName, scope: 'company' },
    })

    if (!companyTemplate) {
      return NextResponse.json({ error: 'Company template not found' }, { status: 500 })
    }

    // Create company permission
    await prisma.userCompanyPermission.create({
      data: {
        userId: targetUserId,
        companyTemplateId: companyTemplate.id,
        assignedBy: currentUser.id,
      },
    })

    // Update project assignments
    const projectTemplateName = ROLE_TO_PROJECT_TEMPLATE[targetUser.role] || 'Field Worker'
    const projectTemplate = await prisma.permissionTemplate.findFirst({
      where: { name: projectTemplateName, scope: 'project' },
    })

    if (projectTemplate) {
      for (const assignment of targetUser.projectAssignments) {
        if (!assignment.projectTemplateId) {
          await prisma.projectAssignment.update({
            where: { id: assignment.id },
            data: {
              projectTemplateId: projectTemplate.id,
              assignedBy: currentUser.id,
            },
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User migrated to new permission system',
      company_template: companyTemplateName,
      project_template: projectTemplateName,
    })
  } catch (error) {
    console.error('Error migrating user:', error)
    return NextResponse.json({ error: 'Failed to migrate user' }, { status: 500 })
  }
}
