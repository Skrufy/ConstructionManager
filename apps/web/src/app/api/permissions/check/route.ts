import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import {
  canAccess,
  getUserProjectPermissions,
  getUserCompanyPermissions,
  hasToolAccess,
  hasGranularPermission,
  isCompanyTool,
  Tool,
  AccessLevel,
} from '@/lib/permission-system'

export const dynamic = 'force-dynamic'

// POST - Check if current user has permission for an action
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const body = await request.json()
    const {
      tool,
      projectId,
      project_id,
      action,
      requiredLevel,
      required_level,
    } = body

    if (!tool) {
      return NextResponse.json({ error: 'tool is required' }, { status: 400 })
    }

    const targetProjectId = projectId || project_id || null
    const targetLevel = (requiredLevel || required_level || 'read_only') as AccessLevel
    const toolName = tool as Tool

    // Get the user's permissions
    let toolPermissions: Record<string, AccessLevel>
    let granularPermissions: Record<string, string[]>
    let isOwnerAdmin = false

    if (isCompanyTool(toolName)) {
      const perms = await getUserCompanyPermissions(user.id)
      toolPermissions = perms.toolPermissions
      granularPermissions = perms.granularPermissions
      isOwnerAdmin = perms.isOwnerAdmin
    } else if (targetProjectId) {
      const perms = await getUserProjectPermissions(user.id, targetProjectId)
      toolPermissions = perms.toolPermissions
      granularPermissions = perms.granularPermissions
      isOwnerAdmin = perms.isOwnerAdmin
    } else {
      return NextResponse.json({
        user_id: user.id,
        tool,
        project_id: null,
        required_level: targetLevel,
        action: action || null,
        has_tool_access: false,
        has_action_permission: false,
        can_perform: false,
        error: 'projectId required for project-level tools',
      })
    }

    // Check access using the permission objects
    const hasAccess = isOwnerAdmin || hasToolAccess(toolPermissions, toolName, targetLevel)

    // Check granular permission if action specified
    let hasAction = true
    if (action && !isOwnerAdmin) {
      hasAction = hasGranularPermission(granularPermissions, toolName, action)
    }

    // Combined check using canAccess
    const canPerform = await canAccess(user.id, targetProjectId, toolName, action)

    return NextResponse.json({
      user_id: user.id,
      tool,
      project_id: targetProjectId,
      required_level: targetLevel,
      action: action || null,
      has_tool_access: hasAccess,
      has_action_permission: hasAction,
      can_perform: canPerform,
    })
  } catch (error) {
    console.error('Error checking permission:', error)
    return NextResponse.json({ error: 'Failed to check permission' }, { status: 500 })
  }
}

// GET - Batch check permissions for multiple tools/actions
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id') || searchParams.get('projectId')
    const toolsParam = searchParams.get('tools')

    if (!toolsParam) {
      return NextResponse.json({ error: 'tools parameter is required' }, { status: 400 })
    }

    const tools = toolsParam.split(',').map((t) => t.trim()) as Tool[]

    const results: Record<string, { level: AccessLevel | 'none'; can_read: boolean; can_write: boolean; can_admin: boolean }> = {}

    // Get project permissions if projectId provided
    let projectPerms: Awaited<ReturnType<typeof getUserProjectPermissions>> | null = null
    if (projectId) {
      projectPerms = await getUserProjectPermissions(user.id, projectId)
    }

    // Get company permissions
    const companyPerms = await getUserCompanyPermissions(user.id)

    for (const tool of tools) {
      let toolPermissions: Record<string, AccessLevel>
      let isOwnerAdmin = false

      if (isCompanyTool(tool)) {
        toolPermissions = companyPerms.toolPermissions
        isOwnerAdmin = companyPerms.isOwnerAdmin
      } else if (projectPerms) {
        toolPermissions = projectPerms.toolPermissions
        isOwnerAdmin = projectPerms.isOwnerAdmin
      } else {
        // No project permissions available for project tool
        results[tool] = {
          level: 'none',
          can_read: false,
          can_write: false,
          can_admin: false,
        }
        continue
      }

      if (isOwnerAdmin) {
        results[tool] = {
          level: 'admin',
          can_read: true,
          can_write: true,
          can_admin: true,
        }
        continue
      }

      const canRead = hasToolAccess(toolPermissions, tool, 'read_only')
      const canWrite = hasToolAccess(toolPermissions, tool, 'standard')
      const canAdmin = hasToolAccess(toolPermissions, tool, 'admin')

      let level: AccessLevel | 'none' = 'none'
      if (canAdmin) level = 'admin'
      else if (canWrite) level = 'standard'
      else if (canRead) level = 'read_only'

      results[tool] = {
        level,
        can_read: canRead,
        can_write: canWrite,
        can_admin: canAdmin,
      }
    }

    return NextResponse.json({
      user_id: user.id,
      project_id: projectId,
      permissions: results,
    })
  } catch (error) {
    console.error('Error batch checking permissions:', error)
    return NextResponse.json({ error: 'Failed to check permissions' }, { status: 500 })
  }
}
