/**
 * API Permission Helpers
 *
 * Helper functions for checking permissions in API routes using the new
 * Procore-style permission system.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import {
  canAccess,
  hasToolAccess,
  getUserProjectPermissions,
  getUserCompanyPermissions,
  Tool,
  AccessLevel,
  isCompanyTool,
} from '@/lib/permission-system'

export interface AuthenticatedUser {
  id: string
  email: string
  name: string
  role: string
}

export interface PermissionCheckResult {
  authorized: boolean
  user: AuthenticatedUser
  response?: NextResponse
}

/**
 * Check if user has permission to access a tool at the specified level.
 * Returns the user if authorized, or a NextResponse error if not.
 *
 * @param request - The NextRequest object
 * @param tool - The tool to check access for (e.g., 'daily_logs', 'equipment')
 * @param projectId - The project ID (required for project-level tools)
 * @param requiredLevel - Minimum access level required (default: 'read_only')
 * @param action - Optional granular action to check
 *
 * @example
 * // Check read access to daily logs for a project
 * const result = await requirePermission(request, 'daily_logs', projectId)
 * if (result.response) return result.response
 * const { user } = result
 *
 * @example
 * // Check write access to equipment
 * const result = await requirePermission(request, 'equipment', projectId, 'standard')
 * if (result.response) return result.response
 */
export async function requirePermission(
  request: NextRequest,
  tool: Tool,
  projectId: string | null,
  requiredLevel: AccessLevel = 'read_only',
  action?: string
): Promise<PermissionCheckResult & { user: AuthenticatedUser }> {
  // First authenticate
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) {
    return {
      authorized: false,
      user: null as unknown as AuthenticatedUser,
      response: authResult,
    }
  }

  const { user } = authResult

  // For company tools, projectId is not required
  const isCompany = isCompanyTool(tool)

  // Check if it's a project tool without projectId
  if (!isCompany && !projectId) {
    return {
      authorized: false,
      user,
      response: NextResponse.json(
        { error: 'Project ID is required for this operation' },
        { status: 400 }
      ),
    }
  }

  // Get permissions and check access
  let hasAccess = false

  if (isCompany) {
    const perms = await getUserCompanyPermissions(user.id)
    if (perms.isOwnerAdmin) {
      hasAccess = true
    } else {
      hasAccess = hasToolAccess(perms.toolPermissions, tool, requiredLevel)
    }
  } else {
    const perms = await getUserProjectPermissions(user.id, projectId!)
    if (perms.isOwnerAdmin) {
      hasAccess = true
    } else if (perms.hasAccess) {
      hasAccess = hasToolAccess(perms.toolPermissions, tool, requiredLevel)
    }
  }

  // Also check granular action if specified
  if (hasAccess && action) {
    hasAccess = await canAccess(user.id, projectId, tool, action)
  }

  if (!hasAccess) {
    return {
      authorized: false,
      user,
      response: NextResponse.json(
        { error: 'You do not have permission to perform this action' },
        { status: 403 }
      ),
    }
  }

  return {
    authorized: true,
    user,
  }
}

/**
 * Check if user is an Owner/Admin (has protected template or ADMIN role).
 * These users bypass all permission checks.
 */
export async function isOwnerAdmin(userId: string): Promise<boolean> {
  const perms = await getUserCompanyPermissions(userId)
  return perms.isOwnerAdmin
}

/**
 * Require user to be an Owner/Admin.
 * Use this for admin-only endpoints.
 */
export async function requireOwnerAdmin(
  request: NextRequest
): Promise<PermissionCheckResult & { user: AuthenticatedUser }> {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) {
    return {
      authorized: false,
      user: null as unknown as AuthenticatedUser,
      response: authResult,
    }
  }

  const { user } = authResult
  const perms = await getUserCompanyPermissions(user.id)

  if (!perms.isOwnerAdmin) {
    return {
      authorized: false,
      user,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return {
    authorized: true,
    user,
  }
}

/**
 * Check if user has access to a specific project.
 * Returns true if user is assigned to the project or is an Owner/Admin.
 */
export async function hasProjectAccess(
  userId: string,
  projectId: string
): Promise<boolean> {
  const perms = await getUserProjectPermissions(userId, projectId)
  return perms.hasAccess || perms.isOwnerAdmin
}

/**
 * Get user's access level for a specific tool.
 * Returns 'none' if user has no access.
 */
export async function getToolAccessLevel(
  userId: string,
  projectId: string | null,
  tool: Tool
): Promise<AccessLevel> {
  const isCompany = isCompanyTool(tool)

  if (isCompany) {
    const perms = await getUserCompanyPermissions(userId)
    if (perms.isOwnerAdmin) return 'admin'
    return perms.toolPermissions[tool] || 'none'
  } else {
    if (!projectId) return 'none'
    const perms = await getUserProjectPermissions(userId, projectId)
    if (perms.isOwnerAdmin) return 'admin'
    if (!perms.hasAccess) return 'none'
    return perms.toolPermissions[tool] || 'none'
  }
}

/**
 * Map old permission keys to new tool names.
 * Used during migration from old permission system.
 */
export const LEGACY_PERMISSION_MAP: Record<string, Tool> = {
  // Project tools
  dailyLogs: 'daily_logs',
  dailyLogsAll: 'daily_logs',
  timeTracking: 'time_tracking',
  equipment: 'equipment',
  equipmentManage: 'equipment',
  documents: 'documents',
  photos: 'drawings', // Renamed from photos to drawings
  drawings: 'drawings',
  schedule: 'schedule',
  punchLists: 'punch_lists',
  safety: 'safety',
  droneFlights: 'drone_flights',
  rfis: 'rfis',
  materials: 'materials',
  approvals: 'approvals',

  // Company tools
  directory: 'directory',
  subcontractors: 'subcontractors',
  certifications: 'certifications',
  financials: 'financials',
  reports: 'reports',
  analytics: 'analytics',
  labelLibrary: 'label_library',
  settings: 'settings',
  userManagement: 'user_management',
  warnings: 'warnings',
}

/**
 * Map old permission actions to new required access levels.
 */
export const LEGACY_ACTION_MAP: Record<string, AccessLevel> = {
  // View-only actions
  view: 'read_only',
  read: 'read_only',

  // Standard actions
  create: 'standard',
  edit: 'standard',
  manage: 'standard',

  // Admin actions
  delete: 'admin',
  admin: 'admin',
  equipmentManage: 'admin',
  dailyLogsAll: 'admin',
}
