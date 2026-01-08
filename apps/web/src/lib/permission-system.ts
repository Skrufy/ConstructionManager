/**
 * Procore-Style Permission System
 *
 * This implements a matrix-based permission system where:
 * - Permissions are per-tool with four access levels: none, read_only, standard, admin
 * - Permission Templates bundle tool permissions together
 * - Users get a Company Template (for company-level tools) + Project Template per project
 * - Granular permissions add specific actions within base levels
 */

import { prisma } from './prisma'

// ============================================
// TYPES & CONSTANTS
// ============================================

// Access levels for each tool
export type AccessLevel = 'none' | 'read_only' | 'standard' | 'admin'

// Access level hierarchy (higher = more access)
export const ACCESS_LEVEL_HIERARCHY: Record<AccessLevel, number> = {
  none: 0,
  read_only: 1,
  standard: 2,
  admin: 3,
}

// Project-level tools (aligned with Settings > Modules)
export const PROJECT_TOOLS = [
  'daily_logs',
  'time_tracking',
  'equipment',
  'documents',
  'drawings',          // Separate from documents for better control
  'schedule',
  'punch_lists',
  'safety',
  'drone_flights',
  'rfis',
  'materials',
  'approvals',         // Time and log approval workflow
] as const

// Company-level tools
export const COMPANY_TOOLS = [
  'directory',
  'subcontractors',    // Subcontractor directory and management
  'certifications',    // License and certification tracking
  'financials',
  'reports',
  'analytics',         // Advanced analytics and forecasting
  'label_library',
  'settings',
  'user_management',
  'warnings',          // Employee discipline tracking
] as const

export type ProjectTool = typeof PROJECT_TOOLS[number]
export type CompanyTool = typeof COMPANY_TOOLS[number]
export type Tool = ProjectTool | CompanyTool

// Tool permissions object shape
export type ToolPermissions = Partial<Record<Tool, AccessLevel>>

// Granular permissions by tool
export const GRANULAR_PERMISSIONS = {
  daily_logs: [
    'submit_entries',
    'edit_own_entries',
    'edit_crew_entries',
    'edit_any_entry',
    'approve_entries',
    'delete_entries',
    'upload_photos',        // Photos in daily logs
  ],
  time_tracking: [
    'clock_in_out',
    'manage_crew_time',
    'approve_crew_timesheets',
    'approve_all_timesheets',
    'export_payroll',
    'edit_time_entries',
  ],
  equipment: [
    'request_equipment',
    'log_equipment_use',
    'edit_assignments',
    'view_utilization',
  ],
  documents: [
    'upload_documents',
    'download_documents',
    'create_folders',
    'delete_documents',
    'create_revisions',
  ],
  drawings: [
    'view_drawings',
    'upload_drawings',
    'edit_metadata',
    'create_revisions',
    'download_drawings',
    'delete_drawings',
    'manage_scales',
  ],
  schedule: [
    'view_schedule',
    'update_task_status',
    'create_tasks',
    'edit_dates',
    'assign_tasks',
    'delete_tasks',
  ],
  punch_lists: [
    'create_items',
    'complete_items',
    'add_comments',
    'assign_items',
    'delete_items',
  ],
  // Safety module with ALL submodules as granular permissions
  safety: [
    // General safety observations
    'submit_safety_observations',
    'view_observations',
    // Inspections submodule
    'create_inspections',
    'manage_inspections',
    'complete_inspections',
    'delete_inspections',
    // Incidents submodule
    'create_incidents',
    'edit_incidents',
    'close_incidents',
    'delete_incidents',
    // Safety Meetings submodule
    'create_safety_meetings',
    'manage_safety_meetings',
    'take_attendance',
    'delete_safety_meetings',
    // Photos in safety
    'upload_safety_photos',
  ],
  drone_flights: [
    'request_flight',
    'view_flights',
    'add_annotations',
    'delete_flights',
  ],
  rfis: [
    'create_rfis',
    'respond_to_rfis',
    'close_rfis',
    'delete_rfis',
  ],
  materials: [
    'create_materials',
    'edit_materials',
    'delete_materials',
    'manage_orders',
    'log_usage',
  ],
  approvals: [
    'approve_timesheets',
    'approve_daily_logs',
    'reject_items',
    'view_pending',
  ],
  // Company-level tools
  directory: [
    'create_contacts',
    'edit_contacts',
    'delete_contacts',
    'create_vendors',
  ],
  subcontractors: [
    'create_subcontractors',
    'edit_subcontractors',
    'delete_subcontractors',
    'manage_contracts',
    'view_performance',
  ],
  certifications: [
    'view_certifications',
    'create_certifications',
    'edit_certifications',
    'delete_certifications',
    'upload_documents',
    'set_expiry_alerts',
  ],
  financials: [
    'view_costs',
    'view_project_budgets',
    'edit_budgets',
    'sync_quickbooks',
    'approve_invoices',
    'manage_change_orders',
  ],
  reports: [
    'view_reports',
    'create_reports',
    'export_reports',
    'schedule_reports',
  ],
  analytics: [
    'view_analytics',
    'view_forecasts',
    'export_data',
    'create_dashboards',
  ],
  warnings: [
    'create_warnings',
    'edit_warnings',
    'delete_warnings',
    'view_history',
  ],
  label_library: [
    'create_project_labels',
    'create_global_labels',
    'delete_labels',
  ],
  settings: [],
  user_management: [],
} as const

export type GranularPermissions = Partial<Record<Tool, string[]>>

// ============================================
// DEFAULT PERMISSION TEMPLATES
// ============================================

export interface PermissionTemplateData {
  name: string
  description: string
  scope: 'company' | 'project'
  toolPermissions: ToolPermissions
  granularPermissions: GranularPermissions
  isProtected?: boolean
  sortOrder: number
}

// Project-level templates
export const DEFAULT_PROJECT_TEMPLATES: PermissionTemplateData[] = [
  {
    name: 'Viewer',
    description: 'Read-only access for external stakeholders',
    scope: 'project',
    sortOrder: 1,
    toolPermissions: {
      daily_logs: 'read_only',
      time_tracking: 'none',
      equipment: 'read_only',
      documents: 'read_only',
      drawings: 'read_only',
      schedule: 'read_only',
      punch_lists: 'read_only',
      safety: 'none',
      drone_flights: 'read_only',
      rfis: 'read_only',
      materials: 'read_only',
      approvals: 'none',
    },
    granularPermissions: {},
  },
  {
    name: 'Field Worker',
    description: 'Entry-level workers on job sites',
    scope: 'project',
    sortOrder: 2,
    toolPermissions: {
      daily_logs: 'standard',
      time_tracking: 'standard',
      equipment: 'read_only',
      documents: 'read_only',
      drawings: 'read_only',
      schedule: 'read_only',
      punch_lists: 'read_only',
      safety: 'standard',
      drone_flights: 'read_only',
      rfis: 'read_only',
      materials: 'read_only',
      approvals: 'none',
    },
    granularPermissions: {
      daily_logs: ['submit_entries', 'edit_own_entries', 'upload_photos'],
      time_tracking: ['clock_in_out'],
      safety: ['submit_safety_observations', 'view_observations', 'upload_safety_photos'],
    },
  },
  {
    name: 'Crew Leader',
    description: 'Lead a specific crew or trade',
    scope: 'project',
    sortOrder: 3,
    toolPermissions: {
      daily_logs: 'standard',
      time_tracking: 'standard',
      equipment: 'standard',
      documents: 'read_only',
      drawings: 'read_only',
      schedule: 'read_only',
      punch_lists: 'standard',
      safety: 'standard',
      drone_flights: 'read_only',
      rfis: 'standard',
      materials: 'standard',
      approvals: 'none',
    },
    granularPermissions: {
      daily_logs: ['submit_entries', 'edit_own_entries', 'edit_crew_entries', 'upload_photos'],
      time_tracking: ['clock_in_out', 'manage_crew_time', 'approve_crew_timesheets'],
      equipment: ['request_equipment', 'log_equipment_use'],
      punch_lists: ['create_items', 'complete_items'],
      safety: ['submit_safety_observations', 'view_observations', 'create_incidents', 'upload_safety_photos'],
      rfis: ['create_rfis'],
      materials: ['log_usage'],
    },
  },
  {
    name: 'Foreman',
    description: 'Site supervisors overseeing operations',
    scope: 'project',
    sortOrder: 4,
    toolPermissions: {
      daily_logs: 'admin',
      time_tracking: 'admin',
      equipment: 'admin',
      documents: 'standard',
      drawings: 'standard',
      schedule: 'standard',
      punch_lists: 'admin',
      safety: 'admin',
      drone_flights: 'standard',
      rfis: 'admin',
      materials: 'admin',
      approvals: 'standard',
    },
    granularPermissions: {
      documents: ['upload_documents', 'create_folders'],
      drawings: ['view_drawings', 'upload_drawings', 'edit_metadata'],
      schedule: ['update_task_status', 'create_tasks'],
      drone_flights: ['request_flight', 'add_annotations'],
      approvals: ['approve_timesheets', 'approve_daily_logs', 'view_pending'],
    },
  },
  {
    name: 'Architect/Engineer',
    description: 'Design professionals with document access',
    scope: 'project',
    sortOrder: 5,
    toolPermissions: {
      daily_logs: 'read_only',
      time_tracking: 'none',
      equipment: 'none',
      documents: 'standard',
      drawings: 'admin',
      schedule: 'read_only',
      punch_lists: 'standard',
      safety: 'none',
      drone_flights: 'read_only',
      rfis: 'standard',
      materials: 'none',
      approvals: 'none',
    },
    granularPermissions: {
      documents: ['upload_documents', 'create_revisions'],
      punch_lists: ['create_items', 'add_comments'],
      rfis: ['respond_to_rfis'],
    },
  },
  {
    name: 'Developer',
    description: 'Real estate developers/clients (external)',
    scope: 'project',
    sortOrder: 6,
    toolPermissions: {
      daily_logs: 'read_only',
      time_tracking: 'none',
      equipment: 'none',
      documents: 'read_only',
      drawings: 'read_only',
      schedule: 'read_only',
      punch_lists: 'read_only',
      safety: 'none',
      drone_flights: 'read_only',
      rfis: 'read_only',
      materials: 'none',
      approvals: 'none',
    },
    granularPermissions: {
      documents: ['download_documents'],
      drawings: ['view_drawings', 'download_drawings'],
      punch_lists: ['add_comments'],
    },
  },
  {
    name: 'Project Manager',
    description: 'Full project access',
    scope: 'project',
    sortOrder: 7,
    toolPermissions: {
      daily_logs: 'admin',
      time_tracking: 'admin',
      equipment: 'admin',
      documents: 'admin',
      drawings: 'admin',
      schedule: 'admin',
      punch_lists: 'admin',
      safety: 'admin',
      drone_flights: 'admin',
      rfis: 'admin',
      materials: 'admin',
      approvals: 'admin',
    },
    granularPermissions: {},
  },
]

// Company-level templates
export const DEFAULT_COMPANY_TEMPLATES: PermissionTemplateData[] = [
  {
    name: 'No Company Access',
    description: 'No access to company-level tools',
    scope: 'company',
    sortOrder: 0,
    toolPermissions: {
      directory: 'none',
      subcontractors: 'none',
      certifications: 'none',
      financials: 'none',
      reports: 'none',
      analytics: 'none',
      label_library: 'none',
      settings: 'none',
      user_management: 'none',
      warnings: 'none',
    },
    granularPermissions: {},
  },
  {
    name: 'Office Staff',
    description: 'Administrative and back-office tasks',
    scope: 'company',
    sortOrder: 1,
    toolPermissions: {
      directory: 'standard',
      subcontractors: 'standard',
      certifications: 'standard',
      financials: 'standard',
      reports: 'standard',
      analytics: 'read_only',
      label_library: 'read_only',
      settings: 'none',
      user_management: 'none',
      warnings: 'read_only',
    },
    granularPermissions: {
      directory: ['create_contacts', 'edit_contacts'],
      subcontractors: ['create_subcontractors', 'edit_subcontractors'],
      certifications: ['view_certifications', 'create_certifications', 'edit_certifications'],
      financials: ['sync_quickbooks', 'view_costs'],
    },
  },
  {
    name: 'Project Manager (Company)',
    description: 'Company-level access for project managers',
    scope: 'company',
    sortOrder: 2,
    toolPermissions: {
      directory: 'standard',
      subcontractors: 'read_only',
      certifications: 'read_only',
      financials: 'read_only',
      reports: 'standard',
      analytics: 'standard',
      label_library: 'standard',
      settings: 'none',
      user_management: 'none',
      warnings: 'standard',
    },
    granularPermissions: {
      financials: ['view_project_budgets', 'view_costs'],
      analytics: ['view_analytics', 'export_data'],
      label_library: ['create_project_labels'],
      warnings: ['create_warnings', 'edit_warnings'],
    },
  },
  {
    name: 'Owner / Admin',
    description: 'Full system access - cannot be edited or deleted',
    scope: 'company',
    sortOrder: 99,
    isProtected: true,
    toolPermissions: {
      directory: 'admin',
      subcontractors: 'admin',
      certifications: 'admin',
      financials: 'admin',
      reports: 'admin',
      analytics: 'admin',
      label_library: 'admin',
      settings: 'admin',
      user_management: 'admin',
      warnings: 'admin',
    },
    granularPermissions: {},
  },
]

// ============================================
// PERMISSION CHECK FUNCTIONS
// ============================================

export interface UserPermissionContext {
  userId: string
  companyTemplateId?: string | null
  companyTemplateName?: string | null
  toolPermissions?: ToolPermissions
  granularPermissions?: GranularPermissions
  isOwnerAdmin?: boolean
}

/**
 * Check if user has access to a tool at a specific level
 */
export function hasToolAccess(
  userPermissions: ToolPermissions,
  tool: Tool,
  requiredLevel: AccessLevel = 'read_only'
): boolean {
  const userLevel = userPermissions[tool] || 'none'
  return ACCESS_LEVEL_HIERARCHY[userLevel] >= ACCESS_LEVEL_HIERARCHY[requiredLevel]
}

/**
 * Check if user has a specific granular permission
 */
export function hasGranularPermission(
  granularPermissions: GranularPermissions,
  tool: Tool,
  action: string
): boolean {
  const toolGranular = granularPermissions[tool]
  if (!toolGranular) return false
  return toolGranular.includes(action)
}

/**
 * Check if a tool is company-level or project-level
 */
export function isCompanyTool(tool: string): tool is CompanyTool {
  return (COMPANY_TOOLS as readonly string[]).includes(tool)
}

/**
 * Get user's effective permissions for a project
 * Returns the merged permissions from company template + project assignment
 */
export async function getUserProjectPermissions(
  userId: string,
  projectId: string
): Promise<{
  hasAccess: boolean
  toolPermissions: ToolPermissions
  granularPermissions: GranularPermissions
  isOwnerAdmin: boolean
}> {
  // Fetch user with company permission and project assignment
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      companyPermission: {
        include: {
          companyTemplate: true,
        },
      },
      projectAssignments: {
        where: { projectId },
        include: {
          projectTemplate: true,
        },
      },
      permissionOverrides: true,
    },
  })

  if (!user) {
    return {
      hasAccess: false,
      toolPermissions: {},
      granularPermissions: {},
      isOwnerAdmin: false,
    }
  }

  // Check if user is Owner/Admin (bypasses all checks)
  // Fallback to role-based check if no company permission is set
  const isOwnerAdmin = user.companyPermission?.companyTemplate?.isProtected === true || user.role === 'ADMIN'

  if (isOwnerAdmin) {
    // Owner/Admin has full access to everything
    const fullAccess: ToolPermissions = {}
    ;[...PROJECT_TOOLS, ...COMPANY_TOOLS].forEach(tool => {
      fullAccess[tool] = 'admin'
    })
    return {
      hasAccess: true,
      toolPermissions: fullAccess,
      granularPermissions: {},
      isOwnerAdmin: true,
    }
  }

  // Check project assignment
  const projectAssignment = user.projectAssignments[0]
  if (!projectAssignment) {
    return {
      hasAccess: false,
      toolPermissions: {},
      granularPermissions: {},
      isOwnerAdmin: false,
    }
  }

  // Get project template permissions
  const projectTemplate = projectAssignment.projectTemplate
  const projectToolPermissions = (projectTemplate?.toolPermissions || {}) as ToolPermissions
  const projectGranularPermissions = (projectTemplate?.granularPermissions || {}) as GranularPermissions

  // Get company template permissions (for company-level tools)
  const companyTemplate = user.companyPermission?.companyTemplate
  const companyToolPermissions = (companyTemplate?.toolPermissions || {}) as ToolPermissions
  const companyGranularPermissions = (companyTemplate?.granularPermissions || {}) as GranularPermissions

  // Merge permissions (project for project tools, company for company tools)
  const mergedToolPermissions: ToolPermissions = {}
  const mergedGranularPermissions: GranularPermissions = {}

  // Add project-level tool permissions
  PROJECT_TOOLS.forEach(tool => {
    mergedToolPermissions[tool] = projectToolPermissions[tool] || 'none'
    if (projectGranularPermissions[tool]) {
      mergedGranularPermissions[tool] = projectGranularPermissions[tool]
    }
  })

  // Add company-level tool permissions
  COMPANY_TOOLS.forEach(tool => {
    mergedToolPermissions[tool] = companyToolPermissions[tool] || 'none'
    if (companyGranularPermissions[tool]) {
      mergedGranularPermissions[tool] = companyGranularPermissions[tool]
    }
  })

  // Apply user-specific overrides if any
  if (user.permissionOverrides?.overrides) {
    const overrides = user.permissionOverrides.overrides as Record<string, { level?: AccessLevel; granular?: string[] }>
    Object.entries(overrides).forEach(([tool, override]) => {
      if (override.level) {
        mergedToolPermissions[tool as Tool] = override.level
      }
      if (override.granular) {
        mergedGranularPermissions[tool as Tool] = override.granular
      }
    })
  }

  return {
    hasAccess: true,
    toolPermissions: mergedToolPermissions,
    granularPermissions: mergedGranularPermissions,
    isOwnerAdmin: false,
  }
}

/**
 * Get user's company-level permissions only
 */
export async function getUserCompanyPermissions(
  userId: string
): Promise<{
  toolPermissions: ToolPermissions
  granularPermissions: GranularPermissions
  isOwnerAdmin: boolean
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      companyPermission: {
        include: {
          companyTemplate: true,
        },
      },
      permissionOverrides: true,
    },
  })

  if (!user) {
    return {
      toolPermissions: {},
      granularPermissions: {},
      isOwnerAdmin: false,
    }
  }

  // Check if user is Owner/Admin
  // Fallback to role-based check if no company permission is set
  const isOwnerAdmin = user.companyPermission?.companyTemplate?.isProtected === true || user.role === 'ADMIN'

  if (isOwnerAdmin) {
    const fullAccess: ToolPermissions = {}
    COMPANY_TOOLS.forEach(tool => {
      fullAccess[tool] = 'admin'
    })
    return {
      toolPermissions: fullAccess,
      granularPermissions: {},
      isOwnerAdmin: true,
    }
  }

  const companyTemplate = user.companyPermission?.companyTemplate
  const toolPermissions = (companyTemplate?.toolPermissions || {}) as ToolPermissions
  const granularPermissions = (companyTemplate?.granularPermissions || {}) as GranularPermissions

  return {
    toolPermissions,
    granularPermissions,
    isOwnerAdmin: false,
  }
}

/**
 * Main permission check function
 * Use this to check if a user can perform an action on a tool
 */
export async function canAccess(
  userId: string,
  projectId: string | null,
  tool: Tool,
  action?: string
): Promise<boolean> {
  // Determine if this is a company or project tool
  const isCompany = isCompanyTool(tool)

  if (isCompany) {
    const { toolPermissions, granularPermissions, isOwnerAdmin } = await getUserCompanyPermissions(userId)

    if (isOwnerAdmin) return true

    const level = toolPermissions[tool] || 'none'
    if (level === 'none') return false
    if (level === 'admin') return true

    // For read_only and standard, no specific action = allow read access
    if (!action) {
      return true // Already ruled out 'none' above
    }

    // Check if action is allowed at this level or via granular permissions
    if (isActionAllowedAtLevel(tool, action, level)) return true
    return hasGranularPermission(granularPermissions, tool, action)
  }

  // Project-level tool - requires projectId
  if (!projectId) return false

  const { hasAccess, toolPermissions, granularPermissions, isOwnerAdmin } = await getUserProjectPermissions(userId, projectId)

  if (!hasAccess) return false
  if (isOwnerAdmin) return true

  const level = toolPermissions[tool] || 'none'
  if (level === 'none') return false
  if (level === 'admin') return true

  if (!action) {
    return true // Already ruled out 'none' above
  }

  if (isActionAllowedAtLevel(tool, action, level)) return true
  return hasGranularPermission(granularPermissions, tool, action)
}

/**
 * Check if an action is allowed at a given access level
 * This defines what actions are included in read_only vs standard
 */
function isActionAllowedAtLevel(tool: Tool, action: string, level: AccessLevel): boolean {
  // Admin can do everything
  if (level === 'admin') return true

  // None can't do anything
  if (level === 'none') return false

  // Define base actions for read_only (view-only actions)
  const readOnlyActions: Record<string, string[]> = {
    documents: ['download_documents'],
    // Add more as needed
  }

  // Define base actions for standard (create/edit own items)
  const standardActions: Record<string, string[]> = {
    daily_logs: ['submit_entries', 'edit_own_entries', 'upload_photos'],
    time_tracking: ['clock_in_out'],
    documents: ['upload_documents', 'download_documents'],
    drawings: ['view_drawings', 'download_drawings'],
    punch_lists: ['create_items', 'complete_items', 'add_comments'],
    safety: ['submit_safety_observations', 'view_observations', 'upload_safety_photos'],
    rfis: ['create_rfis'],
    materials: ['log_usage'],
    // Add more as needed
  }

  if (level === 'read_only') {
    return readOnlyActions[tool]?.includes(action) || false
  }

  if (level === 'standard') {
    return standardActions[tool]?.includes(action) || readOnlyActions[tool]?.includes(action) || false
  }

  return false
}

// ============================================
// LEGACY COMPATIBILITY
// ============================================

// Map old role names to template names for migration
export const ROLE_TO_PROJECT_TEMPLATE: Record<string, string> = {
  VIEWER: 'Viewer',
  FIELD_WORKER: 'Field Worker',
  CREW_LEADER: 'Crew Leader',
  FOREMAN: 'Foreman',
  SUPERINTENDENT: 'Foreman',
  ARCHITECT: 'Architect/Engineer',
  DEVELOPER: 'Developer',
  PROJECT_MANAGER: 'Project Manager',
  ADMIN: 'Project Manager', // Admins get PM project access + Owner/Admin company access
  OFFICE: 'Field Worker', // Office staff get Field Worker project access + Office Staff company access
}

export const ROLE_TO_COMPANY_TEMPLATE: Record<string, string> = {
  VIEWER: 'No Company Access',
  FIELD_WORKER: 'No Company Access',
  CREW_LEADER: 'No Company Access',
  FOREMAN: 'No Company Access',
  SUPERINTENDENT: 'No Company Access',
  ARCHITECT: 'No Company Access',
  DEVELOPER: 'No Company Access',
  PROJECT_MANAGER: 'Project Manager (Company)',
  ADMIN: 'Owner / Admin',
  OFFICE: 'Office Staff',
}
