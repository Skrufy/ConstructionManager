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

// GET - Fetch all permission templates
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope') // 'company' or 'project'

    // Permission check:
    // - Admins can access all templates
    // - Project Managers can only access project templates
    if (user.role !== 'ADMIN' && user.role !== 'PROJECT_MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Project Managers can only fetch project-scoped templates
    if (user.role === 'PROJECT_MANAGER' && scope !== 'project') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Build where clause
    const where: Record<string, unknown> = {}
    if (scope) {
      where.scope = scope
    }

    // Fetch permission templates with usage counts
    const templates = await prisma.permissionTemplate.findMany({
      where,
      include: {
        _count: {
          select: {
            userCompanyPermissions: true,
            projectAssignments: true,
          },
        },
      },
      orderBy: [{ scope: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    })

    // Group by scope
    const projectTemplates = templates
      .filter(t => t.scope === 'project')
      .map(transformTemplate)
    const companyTemplates = templates
      .filter(t => t.scope === 'company')
      .map(transformTemplate)

    return NextResponse.json({
      templates: templates.map(transformTemplate),
      project_templates: projectTemplates,
      company_templates: companyTemplates,
    })
  } catch (error) {
    console.error('Error fetching permission templates:', error)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

// POST - Create a new permission template
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      description,
      scope = 'project',
      toolPermissions,
      tool_permissions,
      granularPermissions,
      granular_permissions,
      sortOrder,
      sort_order,
    } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Check for duplicate name
    const existing = await prisma.permissionTemplate.findUnique({
      where: { name },
    })
    if (existing) {
      return NextResponse.json({ error: 'Template with this name already exists' }, { status: 400 })
    }

    const template = await prisma.permissionTemplate.create({
      data: {
        name,
        description,
        scope,
        toolPermissions: toolPermissions || tool_permissions || {},
        granularPermissions: granularPermissions || granular_permissions || {},
        sortOrder: sortOrder ?? sort_order ?? 0,
        isSystemDefault: false,
        isProtected: false,
      },
    })

    return NextResponse.json(transformTemplate({
      ...template,
      _count: { userCompanyPermissions: 0, projectAssignments: 0 },
    }), { status: 201 })
  } catch (error) {
    console.error('Error creating permission template:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}
