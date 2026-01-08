// Role hierarchy (higher number = more permissions)
// New roles: ADMIN, PROJECT_MANAGER, DEVELOPER, ARCHITECT, FOREMAN, CREW_LEADER, OFFICE, FIELD_WORKER, VIEWER
export const ROLE_HIERARCHY = {
  VIEWER: 1,
  FIELD_WORKER: 2,
  CREW_LEADER: 3,
  OFFICE: 3,
  FOREMAN: 4,
  ARCHITECT: 5,
  DEVELOPER: 6,       // Real estate developer/client
  PROJECT_MANAGER: 7,
  ADMIN: 8,
  // Legacy aliases (kept for backwards compatibility)
  SUPERINTENDENT: 4,  // Maps to FOREMAN level
  MECHANIC: 2,        // Maps to FIELD_WORKER level with specialized equipment access
} as const

export type UserRole = keyof typeof ROLE_HIERARCHY

// Valid roles for user creation/update (excludes deprecated aliases)
export const VALID_ROLES = [
  'ADMIN',
  'PROJECT_MANAGER',
  'DEVELOPER',
  'ARCHITECT',
  'FOREMAN',
  'SUPERINTENDENT',  // Legacy, maps to FOREMAN level
  'CREW_LEADER',
  'OFFICE',
  'FIELD_WORKER',
  'VIEWER'
] as const

export const VALID_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const

// Human-readable role labels for UI
export const ROLE_LABELS = {
  ADMIN: 'Admin',
  PROJECT_MANAGER: 'Project Manager',
  DEVELOPER: 'Developer',
  ARCHITECT: 'Architect/Engineer',
  FOREMAN: 'Foreman',
  CREW_LEADER: 'Crew Leader',
  OFFICE: 'Office Staff',
  FIELD_WORKER: 'Field Worker',
  VIEWER: 'Viewer',
  // Legacy
  SUPERINTENDENT: 'Superintendent',
  MECHANIC: 'Mechanic',
} as const

// Specialized roles that have specific module access regardless of hierarchy
export const SPECIALIZED_ROLES = {
  MECHANIC: ['equipment', 'equipmentManage'], // Mechanics always have equipment access
  ARCHITECT: ['documents', 'documentsManage'], // Architects have full document access
} as const

// Feature access by minimum required role
export const FEATURE_ACCESS = {
  // Dashboard - everyone can access
  dashboard: 'VIEWER',

  // Core features
  projects: 'FIELD_WORKER',        // View assigned projects
  projectsCreate: 'PROJECT_MANAGER', // Create new projects
  projectsEdit: 'PROJECT_MANAGER',   // Edit projects
  projectsDelete: 'ADMIN',           // Delete projects

  dailyLogs: 'FIELD_WORKER',         // View/create own logs
  dailyLogsAll: 'FOREMAN',           // View all logs
  dailyLogsApprove: 'FOREMAN',       // Approve logs

  timeTracking: 'FIELD_WORKER',      // Own time entries
  timeTrackingAll: 'FOREMAN',        // View all time entries
  timeTrackingApprove: 'PROJECT_MANAGER', // Approve time entries

  scheduling: 'FIELD_WORKER',        // View schedule
  schedulingEdit: 'PROJECT_MANAGER', // Edit schedule

  equipment: 'FOREMAN',              // View equipment (MECHANIC always has access)
  equipmentManage: 'FOREMAN',        // Manage equipment (MECHANIC also has access)

  documents: 'FIELD_WORKER',         // View documents
  documentsUpload: 'FIELD_WORKER',   // Upload documents
  documentsManage: 'FOREMAN',        // Manage/delete documents

  // Quality & Safety
  safety: 'FIELD_WORKER',            // View safety items
  safetyManage: 'FOREMAN',           // Manage safety items

  // Financial (sensitive) - only for high-level roles
  financials: 'DEVELOPER',           // View financials
  financialsEdit: 'ADMIN',           // Edit financials

  // Reports & Analytics
  reports: 'OFFICE',                 // View reports (filtered by assigned projects)
  reportsAll: 'PROJECT_MANAGER',     // All reports (unfiltered)
  analytics: 'PROJECT_MANAGER',      // View analytics

  // Resources
  subcontractors: 'FOREMAN',         // View subcontractors
  subcontractorsManage: 'PROJECT_MANAGER', // Manage subcontractors
  certifications: 'FOREMAN',         // View certifications
  certificationsManage: 'PROJECT_MANAGER', // Manage certifications
  droneDeploy: 'FOREMAN',            // View drone data

  // Supervision (sensitive)
  approvals: 'FOREMAN',              // View approvals
  approvalsAction: 'PROJECT_MANAGER', // Take action on approvals
  warnings: 'FOREMAN',               // View warnings
  warningsIssue: 'PROJECT_MANAGER',  // Issue warnings

  // Administration (most sensitive)
  adminIntegrations: 'ADMIN',
  adminLabels: 'ADMIN',
  adminUsers: 'ADMIN',
  adminSettings: 'ADMIN',
  adminPermissions: 'ADMIN',         // Permissions management
} as const

export type Feature = keyof typeof FEATURE_ACCESS

// Check if a role has at least the minimum required role level
export function hasRole(userRole: string, minimumRole: UserRole): boolean {
  const userLevel = ROLE_HIERARCHY[userRole as UserRole] || 0
  const requiredLevel = ROLE_HIERARCHY[minimumRole]
  return userLevel >= requiredLevel
}

// Check if a user can access a specific feature
export function canAccess(userRole: string, feature: Feature): boolean {
  // Check specialized role access first (e.g., MECHANIC always has equipment access)
  const specializedAccess = SPECIALIZED_ROLES[userRole as keyof typeof SPECIALIZED_ROLES]
  if (specializedAccess && (specializedAccess as readonly string[]).includes(feature)) {
    return true
  }

  const minimumRole = FEATURE_ACCESS[feature] as UserRole
  return hasRole(userRole, minimumRole)
}

// Check if user is admin
export function isAdmin(userRole: string): boolean {
  return userRole === 'ADMIN'
}

// Check if user has supervisor-level access (Superintendent, PM, or Admin)
export function isSupervisor(userRole: string): boolean {
  return hasRole(userRole, 'SUPERINTENDENT')
}

// Check if user has manager-level access (PM or Admin)
export function isManager(userRole: string): boolean {
  return hasRole(userRole, 'PROJECT_MANAGER')
}

// Get role display name
export function getRoleDisplayName(role: string): string {
  const displayNames: Record<string, string> = {
    ADMIN: 'Administrator',
    PROJECT_MANAGER: 'Project Manager',
    DEVELOPER: 'Developer',
    ARCHITECT: 'Architect/Engineer',
    FOREMAN: 'Foreman',
    CREW_LEADER: 'Crew Leader',
    OFFICE: 'Office Staff',
    FIELD_WORKER: 'Field Worker',
    VIEWER: 'Viewer',
    // Legacy
    SUPERINTENDENT: 'Superintendent',
    MECHANIC: 'Mechanic',
  }
  return displayNames[role] || role
}

// Navigation sections and their minimum required roles
export const NAV_SECTION_ACCESS = {
  main: 'FIELD_WORKER',           // Main navigation items
  resources: 'FOREMAN',           // Resources section
  supervision: 'FOREMAN',         // Supervision section
  administration: 'ADMIN',        // Admin section
} as const

// Individual navigation item role requirements
export const NAV_ITEM_ACCESS: Record<string, UserRole> = {
  '/dashboard': 'VIEWER',
  '/projects': 'FIELD_WORKER',
  '/daily-logs': 'FIELD_WORKER',
  '/time-tracking': 'FIELD_WORKER',
  '/scheduling': 'FIELD_WORKER',
  '/equipment': 'FOREMAN',        // Admin-controlled, but MECHANIC always has access
  '/documents': 'FIELD_WORKER',
  '/drawings': 'FIELD_WORKER',    // All users can view drawings
  '/safety': 'FIELD_WORKER',
  '/financials': 'DEVELOPER',     // Developers and above can view financials
  '/reports': 'OFFICE',           // OFFICE and above can view reports
  '/analytics': 'PROJECT_MANAGER',
  '/subcontractors': 'FOREMAN',
  '/certifications': 'FOREMAN',
  '/dronedeploy': 'FOREMAN',
  '/approvals': 'FOREMAN',
  '/warnings': 'FOREMAN',
  '/admin/integrations': 'ADMIN',
  '/admin/labels': 'ADMIN',
  '/admin/users': 'ADMIN',
  '/admin/settings': 'ADMIN',
  '/admin/permissions': 'ADMIN',
}

// Navigation items that specialized roles can always access
export const SPECIALIZED_NAV_ACCESS: Record<string, string[]> = {
  MECHANIC: ['/equipment'],
}

// Default module visibility for each role
// These are the base defaults - can be overridden per-company in settings
export const MODULE_ROLE_DEFAULTS: Record<string, Record<string, boolean>> = {
  VIEWER: {
    moduleProjects: true,
    moduleDailyLogs: true,
    moduleTimeTracking: false,
    moduleScheduling: true,
    moduleEquipment: false,
    moduleDocuments: true,
    moduleSafety: true,
    moduleFinancials: false,
    moduleReports: true,
    moduleAnalytics: false,
    moduleSubcontractors: false,
    moduleCertifications: false,
    moduleDroneDeploy: false,
    moduleApprovals: false,
    moduleWarnings: false,
  },
  FIELD_WORKER: {
    moduleProjects: true,
    moduleDailyLogs: true,
    moduleTimeTracking: true,
    moduleScheduling: false,
    moduleEquipment: false,
    moduleDocuments: true,
    moduleSafety: false,
    moduleFinancials: false,
    moduleReports: false,
    moduleAnalytics: false,
    moduleSubcontractors: false,
    moduleCertifications: false,
    moduleDroneDeploy: false,
    moduleApprovals: false,
    moduleWarnings: false,
  },
  CREW_LEADER: {
    moduleProjects: true,
    moduleDailyLogs: true,
    moduleTimeTracking: true,
    moduleScheduling: true,
    moduleEquipment: false,
    moduleDocuments: true,
    moduleSafety: true,
    moduleFinancials: false,
    moduleReports: false,
    moduleAnalytics: false,
    moduleSubcontractors: false,
    moduleCertifications: false,
    moduleDroneDeploy: false,
    moduleApprovals: false,
    moduleWarnings: false,
  },
  OFFICE: {
    moduleProjects: true,
    moduleDailyLogs: true,
    moduleTimeTracking: true,
    moduleScheduling: true,
    moduleEquipment: false,
    moduleDocuments: true,
    moduleSafety: false,
    moduleFinancials: false,
    moduleReports: true,
    moduleAnalytics: false,
    moduleSubcontractors: true,
    moduleCertifications: true,
    moduleDroneDeploy: false,
    moduleApprovals: false,
    moduleWarnings: false,
  },
  FOREMAN: {
    moduleProjects: true,
    moduleDailyLogs: true,
    moduleTimeTracking: true,
    moduleScheduling: true,
    moduleEquipment: true,
    moduleDocuments: true,
    moduleSafety: true,
    moduleFinancials: false,
    moduleReports: true,
    moduleAnalytics: false,
    moduleSubcontractors: true,
    moduleCertifications: true,
    moduleDroneDeploy: true,
    moduleApprovals: true,
    moduleWarnings: true,
  },
  // Legacy alias
  SUPERINTENDENT: {
    moduleProjects: true,
    moduleDailyLogs: true,
    moduleTimeTracking: true,
    moduleScheduling: true,
    moduleEquipment: true,
    moduleDocuments: true,
    moduleSafety: true,
    moduleFinancials: false,
    moduleReports: true,
    moduleAnalytics: false,
    moduleSubcontractors: true,
    moduleCertifications: true,
    moduleDroneDeploy: true,
    moduleApprovals: true,
    moduleWarnings: true,
  },
  ARCHITECT: {
    moduleProjects: true,
    moduleDailyLogs: false,
    moduleTimeTracking: false,
    moduleScheduling: true,
    moduleEquipment: false,
    moduleDocuments: true,
    moduleSafety: false,
    moduleFinancials: false,
    moduleReports: true,
    moduleAnalytics: false,
    moduleSubcontractors: false,
    moduleCertifications: false,
    moduleDroneDeploy: true,
    moduleApprovals: false,
    moduleWarnings: false,
  },
  DEVELOPER: {
    moduleProjects: true,
    moduleDailyLogs: true,
    moduleTimeTracking: false,
    moduleScheduling: true,
    moduleEquipment: false,
    moduleDocuments: true,
    moduleSafety: true,
    moduleFinancials: true,
    moduleReports: true,
    moduleAnalytics: true,
    moduleSubcontractors: false,
    moduleCertifications: false,
    moduleDroneDeploy: true,
    moduleApprovals: false,
    moduleWarnings: false,
  },
  PROJECT_MANAGER: {
    moduleProjects: true,
    moduleDailyLogs: true,
    moduleTimeTracking: true,
    moduleScheduling: true,
    moduleEquipment: true,
    moduleDocuments: true,
    moduleSafety: true,
    moduleFinancials: true,
    moduleReports: true,
    moduleAnalytics: true,
    moduleSubcontractors: true,
    moduleCertifications: true,
    moduleDroneDeploy: true,
    moduleApprovals: true,
    moduleWarnings: true,
  },
  ADMIN: {
    moduleProjects: true,
    moduleDailyLogs: true,
    moduleTimeTracking: true,
    moduleScheduling: true,
    moduleEquipment: true,
    moduleDocuments: true,
    moduleSafety: true,
    moduleFinancials: true,
    moduleReports: true,
    moduleAnalytics: true,
    moduleSubcontractors: true,
    moduleCertifications: true,
    moduleDroneDeploy: true,
    moduleApprovals: true,
    moduleWarnings: true,
  },
  // Legacy alias
  MECHANIC: {
    moduleProjects: true,
    moduleDailyLogs: true,
    moduleTimeTracking: true,
    moduleScheduling: false,
    moduleEquipment: true, // Mechanics always have equipment access
    moduleDocuments: true,
    moduleSafety: false,
    moduleFinancials: false,
    moduleReports: false,
    moduleAnalytics: false,
    moduleSubcontractors: false,
    moduleCertifications: false,
    moduleDroneDeploy: false,
    moduleApprovals: false,
    moduleWarnings: false,
  },
}

// Check if user can access a specific navigation item
export function canAccessNavItem(userRole: string, href: string): boolean {
  // Check specialized role access first (e.g., MECHANIC always sees /equipment)
  const specializedNav = SPECIALIZED_NAV_ACCESS[userRole]
  if (specializedNav?.includes(href)) {
    return true
  }

  const minimumRole = NAV_ITEM_ACCESS[href]
  if (!minimumRole) return true // If not specified, allow access
  return hasRole(userRole, minimumRole)
}
