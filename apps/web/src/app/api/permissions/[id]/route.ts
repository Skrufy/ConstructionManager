import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Transform template to snake_case for mobile compatibility
function transformTemplate(template: {
  id: string
  name: string
  description: string | null
  scope: string
  toolPermissions: unknown
  granularPermissions: unknown
  isSystemDefault: boolean
  isProtected: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
  _count?: { userCompanyPermissions: number; projectAssignments: number }
}) {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    scope: template.scope,
    tool_permissions: template.toolPermissions,
    granular_permissions: template.granularPermissions,
    is_system_default: template.isSystemDefault,
    is_protected: template.isProtected,
    sort_order: template.sortOrder,
    created_at: template.createdAt,
    updated_at: template.updatedAt,
    usage_count: template._count
      ? (template._count.userCompanyPermissions || 0) + (template._count.projectAssignments || 0)
      : 0,
  }
}

// GET - Fetch a single permission template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const template = await prisma.permissionTemplate.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            userCompanyPermissions: true,
            projectAssignments: true,
          },
        },
      },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json(transformTemplate(template))
  } catch (error) {
    console.error('Error fetching permission template:', error)
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 })
  }
}

// PATCH - Update a permission template
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Check if template exists and is not protected
    const existing = await prisma.permissionTemplate.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    if (existing.isProtected) {
      return NextResponse.json(
        { error: 'Cannot modify protected template' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      name,
      description,
      toolPermissions,
      tool_permissions,
      granularPermissions,
      granular_permissions,
      sortOrder,
      sort_order,
    } = body

    // Check for duplicate name if name is being changed
    if (name && name !== existing.name) {
      const duplicateName = await prisma.permissionTemplate.findUnique({
        where: { name },
      })
      if (duplicateName) {
        return NextResponse.json(
          { error: 'Template with this name already exists' },
          { status: 400 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (toolPermissions !== undefined || tool_permissions !== undefined) {
      updateData.toolPermissions = toolPermissions || tool_permissions
    }
    if (granularPermissions !== undefined || granular_permissions !== undefined) {
      updateData.granularPermissions = granularPermissions || granular_permissions
    }
    if (sortOrder !== undefined || sort_order !== undefined) {
      updateData.sortOrder = sortOrder ?? sort_order
    }

    const template = await prisma.permissionTemplate.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            userCompanyPermissions: true,
            projectAssignments: true,
          },
        },
      },
    })

    return NextResponse.json(transformTemplate(template))
  } catch (error) {
    console.error('Error updating permission template:', error)
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }
}

// DELETE - Delete a permission template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Check if template exists
    const existing = await prisma.permissionTemplate.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            userCompanyPermissions: true,
            projectAssignments: true,
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Cannot delete protected templates
    if (existing.isProtected) {
      return NextResponse.json(
        { error: 'Cannot delete protected template' },
        { status: 403 }
      )
    }

    // Cannot delete system default templates
    if (existing.isSystemDefault) {
      return NextResponse.json(
        { error: 'Cannot delete system default template' },
        { status: 403 }
      )
    }

    // Cannot delete templates in use
    const usageCount =
      (existing._count?.userCompanyPermissions || 0) +
      (existing._count?.projectAssignments || 0)
    if (usageCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete template in use by ${usageCount} user(s). Reassign users first.`,
        },
        { status: 400 }
      )
    }

    await prisma.permissionTemplate.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Template deleted' })
  } catch (error) {
    console.error('Error deleting permission template:', error)
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
  }
}
