//
//  Permissions.swift
//  ConstructionManager
//
//  Comprehensive role-based permissions system with user and project-level overrides
//

import Foundation
import SwiftUI
import Combine

// MARK: - Permission Types
enum Permission: String, Codable, CaseIterable {
    // Project Permissions
    case viewProjects = "view_projects"
    case createProjects = "create_projects"
    case editProjects = "edit_projects"
    case deleteProjects = "delete_projects"
    case assignUsersToProjects = "assign_users_to_projects"

    // Daily Logs Permissions
    case viewDailyLogs = "view_daily_logs"
    case viewAllDailyLogs = "view_all_daily_logs"  // vs only own/assigned
    case createDailyLogs = "create_daily_logs"
    case editDailyLogs = "edit_daily_logs"
    case deleteDailyLogs = "delete_daily_logs"
    case approveDailyLogs = "approve_daily_logs"

    // Time Tracking Permissions
    case viewTimeTracking = "view_time_tracking"
    case viewAllTimeEntries = "view_all_time_entries"
    case clockInOut = "clock_in_out"
    case editTimeEntries = "edit_time_entries"
    case approveTimeEntries = "approve_time_entries"

    // Equipment Permissions
    case viewEquipment = "view_equipment"
    case manageEquipment = "manage_equipment"

    // Documents Permissions
    case viewDocuments = "view_documents"
    case uploadDocuments = "upload_documents"
    case deleteDocuments = "delete_documents"

    // Financial Permissions
    case viewFinancials = "view_financials"
    case manageFinancials = "manage_financials"
    case approveExpenses = "approve_expenses"

    // Safety & Quality Permissions
    case viewSafety = "view_safety"
    case manageSafety = "manage_safety"
    case viewIncidents = "view_incidents"
    case createIncidents = "create_incidents"

    // User Management Permissions
    case viewUsers = "view_users"
    case manageUsers = "manage_users"
    case assignRoles = "assign_roles"

    // Admin Permissions
    case manageCompanySettings = "manage_company_settings"
    case manageModules = "manage_modules"
    case managePermissions = "manage_permissions"
    case viewAuditLogs = "view_audit_logs"

    // Reports & Analytics
    case viewReports = "view_reports"
    case exportReports = "export_reports"
    case viewAnalytics = "view_analytics"

    // Warnings & Discipline
    case viewWarnings = "view_warnings"
    case issueWarnings = "issue_warnings"
    case manageWarnings = "manage_warnings"

    // Approvals
    case accessApprovalQueue = "access_approval_queue"

    var displayName: String {
        switch self {
        case .viewProjects: return "View Projects"
        case .createProjects: return "Create Projects"
        case .editProjects: return "Edit Projects"
        case .deleteProjects: return "Delete Projects"
        case .assignUsersToProjects: return "Assign Users to Projects"
        case .viewDailyLogs: return "View Daily Logs"
        case .viewAllDailyLogs: return "View All Daily Logs"
        case .createDailyLogs: return "Create Daily Logs"
        case .editDailyLogs: return "Edit Daily Logs"
        case .deleteDailyLogs: return "Delete Daily Logs"
        case .approveDailyLogs: return "Approve Daily Logs"
        case .viewTimeTracking: return "View Time Tracking"
        case .viewAllTimeEntries: return "View All Time Entries"
        case .clockInOut: return "Clock In/Out"
        case .editTimeEntries: return "Edit Time Entries"
        case .approveTimeEntries: return "Approve Time Entries"
        case .viewEquipment: return "View Equipment"
        case .manageEquipment: return "Manage Equipment"
        case .viewDocuments: return "View Documents"
        case .uploadDocuments: return "Upload Documents"
        case .deleteDocuments: return "Delete Documents"
        case .viewFinancials: return "View Financials"
        case .manageFinancials: return "Manage Financials"
        case .approveExpenses: return "Approve Expenses"
        case .viewSafety: return "View Safety"
        case .manageSafety: return "Manage Safety"
        case .viewIncidents: return "View Incidents"
        case .createIncidents: return "Create Incidents"
        case .viewUsers: return "View Users"
        case .manageUsers: return "Manage Users"
        case .assignRoles: return "Assign Roles"
        case .manageCompanySettings: return "Manage Company Settings"
        case .manageModules: return "Manage Modules"
        case .managePermissions: return "Manage Permissions"
        case .viewAuditLogs: return "View Audit Logs"
        case .viewReports: return "View Reports"
        case .exportReports: return "Export Reports"
        case .viewAnalytics: return "View Analytics"
        case .viewWarnings: return "View Warnings"
        case .issueWarnings: return "Issue Warnings"
        case .manageWarnings: return "Manage Warnings"
        case .accessApprovalQueue: return "Access Approval Queue"
        }
    }

    var category: PermissionCategory {
        switch self {
        case .viewProjects, .createProjects, .editProjects, .deleteProjects, .assignUsersToProjects:
            return .projects
        case .viewDailyLogs, .viewAllDailyLogs, .createDailyLogs, .editDailyLogs, .deleteDailyLogs, .approveDailyLogs:
            return .dailyLogs
        case .viewTimeTracking, .viewAllTimeEntries, .clockInOut, .editTimeEntries, .approveTimeEntries:
            return .timeTracking
        case .viewEquipment, .manageEquipment:
            return .equipment
        case .viewDocuments, .uploadDocuments, .deleteDocuments:
            return .documents
        case .viewFinancials, .manageFinancials, .approveExpenses:
            return .financials
        case .viewSafety, .manageSafety, .viewIncidents, .createIncidents:
            return .safety
        case .viewUsers, .manageUsers, .assignRoles:
            return .users
        case .manageCompanySettings, .manageModules, .managePermissions, .viewAuditLogs:
            return .admin
        case .viewReports, .exportReports, .viewAnalytics:
            return .reports
        case .viewWarnings, .issueWarnings, .manageWarnings:
            return .warnings
        case .accessApprovalQueue:
            return .approvals
        }
    }
}

enum PermissionCategory: String, CaseIterable {
    case projects = "Projects"
    case dailyLogs = "Daily Logs"
    case timeTracking = "Time Tracking"
    case equipment = "Equipment"
    case documents = "Documents"
    case financials = "Financials"
    case safety = "Safety & Quality"
    case users = "User Management"
    case admin = "Administration"
    case reports = "Reports & Analytics"
    case warnings = "Warnings"
    case approvals = "Approvals"

    var permissions: [Permission] {
        Permission.allCases.filter { $0.category == self }
    }
}

// MARK: - Daily Log Visibility Level
enum DailyLogVisibility: String, Codable, CaseIterable {
    case all = "ALL"                        // Can see all daily logs in company
    case assignedProjects = "ASSIGNED_PROJECTS"  // Only logs from assigned projects
    case ownOnly = "OWN_ONLY"               // Only their own submissions

    var displayName: String {
        switch self {
        case .all: return "All Logs"
        case .assignedProjects: return "Assigned Projects Only"
        case .ownOnly: return "Own Logs Only"
        }
    }

    var description: String {
        switch self {
        case .all: return "Can see all daily logs in the company"
        case .assignedProjects: return "Only logs from projects they're assigned to"
        case .ownOnly: return "Only logs they've submitted"
        }
    }
}

// MARK: - Role Default Permissions
extension UserRole {
    /// Default permissions for each role
    var defaultPermissions: Set<Permission> {
        switch self {
        case .admin:
            return Set(Permission.allCases)  // Full access

        case .projectManager:
            return [
                .viewProjects, .createProjects, .editProjects, .assignUsersToProjects,
                .viewDailyLogs, .viewAllDailyLogs, .createDailyLogs, .editDailyLogs, .approveDailyLogs,
                .viewTimeTracking, .viewAllTimeEntries, .clockInOut, .editTimeEntries, .approveTimeEntries,
                .viewEquipment, .manageEquipment,
                .viewDocuments, .uploadDocuments, .deleteDocuments,
                .viewFinancials, .manageFinancials, .approveExpenses,
                .viewSafety, .manageSafety, .viewIncidents, .createIncidents,
                .viewUsers,
                .viewReports, .exportReports, .viewAnalytics,
                .viewWarnings, .issueWarnings, .manageWarnings,
                .accessApprovalQueue
            ]

        case .developer:
            return [
                .viewProjects,
                .viewDailyLogs, .viewAllDailyLogs,
                .viewTimeTracking, .viewAllTimeEntries,
                .viewDocuments,
                .viewFinancials,
                .viewSafety, .viewIncidents,
                .viewReports, .viewAnalytics
            ]

        case .architect:
            return [
                .viewProjects,
                .viewDailyLogs,
                .viewDocuments, .uploadDocuments,
                .viewSafety, .viewIncidents, .createIncidents,
                .viewReports
            ]

        case .foreman:
            return [
                .viewProjects,
                .viewDailyLogs, .viewAllDailyLogs, .createDailyLogs, .editDailyLogs, .approveDailyLogs,
                .viewTimeTracking, .viewAllTimeEntries, .clockInOut, .editTimeEntries, .approveTimeEntries,
                .viewEquipment, .manageEquipment,
                .viewDocuments, .uploadDocuments,
                .viewSafety, .manageSafety, .viewIncidents, .createIncidents,
                .viewWarnings, .issueWarnings,
                .accessApprovalQueue
            ]

        case .crewLeader:
            return [
                .viewProjects,
                .viewDailyLogs, .createDailyLogs, .editDailyLogs,
                .viewTimeTracking, .clockInOut, .editTimeEntries,
                .viewEquipment,
                .viewDocuments, .uploadDocuments,
                .viewSafety, .viewIncidents, .createIncidents,
                .viewWarnings
            ]

        case .officeStaff:
            return [
                .viewProjects, .createProjects, .editProjects,
                .viewDailyLogs, .viewAllDailyLogs,
                .viewTimeTracking, .viewAllTimeEntries, .editTimeEntries,
                .viewEquipment, .manageEquipment,
                .viewDocuments, .uploadDocuments, .deleteDocuments,
                .viewFinancials, .manageFinancials,
                .viewSafety,
                .viewUsers,
                .viewReports, .exportReports
            ]

        case .fieldWorker:
            return [
                .viewProjects,
                .viewDailyLogs, .createDailyLogs,
                .viewTimeTracking, .clockInOut,
                .viewDocuments, .uploadDocuments,
                .viewSafety, .viewIncidents, .createIncidents
            ]

        case .viewer:
            return [
                .viewProjects,
                .viewDailyLogs,
                .viewDocuments,
                .viewSafety,
                .viewReports
            ]
        }
    }

    /// Default daily log visibility for each role
    var defaultDailyLogVisibility: DailyLogVisibility {
        switch self {
        case .admin, .projectManager, .developer:
            return .all
        case .architect, .foreman, .crewLeader, .officeStaff:
            return .assignedProjects
        case .fieldWorker, .viewer:
            return .ownOnly
        }
    }

    /// Role hierarchy level (higher = more permissions)
    var hierarchyLevel: Int {
        switch self {
        case .viewer: return 1
        case .fieldWorker: return 2
        case .crewLeader, .officeStaff: return 3
        case .foreman: return 4
        case .architect: return 5
        case .developer: return 6
        case .projectManager: return 7
        case .admin: return 8
        }
    }
}

// MARK: - User Permission Override
/// Represents a user-level permission override (adds or removes permissions from role defaults)
struct UserPermissionOverride: Codable, Identifiable {
    let id: String
    let userId: String
    let permission: Permission
    let granted: Bool  // true = add permission, false = revoke permission

    var displayStatus: String {
        granted ? "Added" : "Removed"
    }
}

// MARK: - Project Permission Override
/// Represents a project-level permission override for a specific user
/// This allows granting elevated permissions on specific projects
struct ProjectPermissionOverride: Codable, Identifiable {
    let id: String
    let userId: String
    let projectId: String
    let permission: Permission
    let granted: Bool
    let expiresAt: Date?  // Optional expiration for temporary access

    var isExpired: Bool {
        guard let expiresAt = expiresAt else { return false }
        return expiresAt < Date()
    }
}

// MARK: - Procore-style Permission Templates

/// Access level for tool permissions (Procore-style matrix)
enum AccessLevel: String, Codable, CaseIterable {
    case none = "none"
    case readOnly = "read_only"
    case standard = "standard"
    case admin = "admin"

    var displayName: String {
        switch self {
        case .none: return "None"
        case .readOnly: return "Read Only"
        case .standard: return "Standard"
        case .admin: return "Admin"
        }
    }

    var description: String {
        switch self {
        case .none: return "No access to this tool"
        case .readOnly: return "Can view but not modify"
        case .standard: return "Can view, create, and edit own items"
        case .admin: return "Full access including approve/delete"
        }
    }
}

/// Permission template for Procore-style access control
struct PermissionTemplate: Identifiable, Codable {
    let id: String
    let name: String
    let description: String?
    let scope: String  // "project" or "company"
    let toolPermissions: [String: String]
    // granularPermissions can contain various types (bool, array, object)
    // We store it as raw JSON data and ignore it for now
    let granularPermissionsRaw: [String: AnyCodableValue]
    let isSystemDefault: Bool
    let isProtected: Bool
    let sortOrder: Int
    let usageCount: Int
    let createdAt: Date?
    let updatedAt: Date?

    // Note: No CodingKeys needed - APIClient uses .convertFromSnakeCase
    // which automatically converts snake_case JSON to camelCase Swift properties

    // Custom decoder to handle potentially missing fields and flexible types
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        scope = try container.decode(String.self, forKey: .scope)
        // Provide default empty dict if missing
        toolPermissions = try container.decodeIfPresent([String: String].self, forKey: .toolPermissions) ?? [:]
        // granularPermissions can have mixed types, so decode as AnyCodableValue
        granularPermissionsRaw = try container.decodeIfPresent([String: AnyCodableValue].self, forKey: .granularPermissions) ?? [:]
        isSystemDefault = try container.decodeIfPresent(Bool.self, forKey: .isSystemDefault) ?? false
        isProtected = try container.decodeIfPresent(Bool.self, forKey: .isProtected) ?? false
        sortOrder = try container.decodeIfPresent(Int.self, forKey: .sortOrder) ?? 0
        usageCount = try container.decodeIfPresent(Int.self, forKey: .usageCount) ?? 0
        createdAt = try container.decodeIfPresent(Date.self, forKey: .createdAt)
        updatedAt = try container.decodeIfPresent(Date.self, forKey: .updatedAt)
    }

    private enum CodingKeys: String, CodingKey {
        case id, name, description, scope
        case toolPermissions
        case granularPermissions
        case isSystemDefault, isProtected
        case sortOrder, usageCount
        case createdAt, updatedAt
    }

    var isProjectScope: Bool { scope == "project" }
    var isCompanyScope: Bool { scope == "company" }

    /// Get access level for a specific tool
    func accessLevel(for tool: String) -> AccessLevel {
        guard let level = toolPermissions[tool] else { return .none }
        return AccessLevel(rawValue: level) ?? .none
    }
}

/// A type-erased Codable value for handling mixed JSON types
enum AnyCodableValue: Codable {
    case bool(Bool)
    case int(Int)
    case double(Double)
    case string(String)
    case array([AnyCodableValue])
    case dictionary([String: AnyCodableValue])
    case null

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if container.decodeNil() {
            self = .null
        } else if let boolValue = try? container.decode(Bool.self) {
            self = .bool(boolValue)
        } else if let intValue = try? container.decode(Int.self) {
            self = .int(intValue)
        } else if let doubleValue = try? container.decode(Double.self) {
            self = .double(doubleValue)
        } else if let stringValue = try? container.decode(String.self) {
            self = .string(stringValue)
        } else if let arrayValue = try? container.decode([AnyCodableValue].self) {
            self = .array(arrayValue)
        } else if let dictValue = try? container.decode([String: AnyCodableValue].self) {
            self = .dictionary(dictValue)
        } else {
            self = .null
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .bool(let value): try container.encode(value)
        case .int(let value): try container.encode(value)
        case .double(let value): try container.encode(value)
        case .string(let value): try container.encode(value)
        case .array(let value): try container.encode(value)
        case .dictionary(let value): try container.encode(value)
        case .null: try container.encodeNil()
        }
    }
}

/// Response from permission templates API
struct PermissionTemplatesResponse: Decodable {
    let templates: [PermissionTemplate]
    let projectTemplates: [PermissionTemplate]
    let companyTemplates: [PermissionTemplate]

    // Note: No CodingKeys needed - APIClient uses .convertFromSnakeCase
}

/// User's company permission assignment
struct UserCompanyPermission: Codable, Identifiable {
    let id: String
    let userId: String
    let companyTemplateId: String?
    let companyTemplateName: String?
    let assignedBy: String?
    let assignedAt: Date?

    // Note: No CodingKeys needed - APIClient uses .convertFromSnakeCase
}

/// User's full permissions including project assignments
struct UserPermissions: Codable {
    let userId: String
    let companyTemplate: PermissionTemplate?
    let projectAssignments: [ProjectPermissionAssignment]
    let effectivePermissions: [String: String]

    // Note: No CodingKeys needed - APIClient uses .convertFromSnakeCase
}

/// Project-level permission assignment for a user
struct ProjectPermissionAssignment: Identifiable, Codable {
    let id: String
    let projectId: String
    let projectName: String?
    let projectTemplateId: String?
    let projectTemplateName: String?
    let roleOverride: String?
    let assignedBy: String?

    // Note: No CodingKeys needed - APIClient uses .convertFromSnakeCase
}

/// Request to assign a company template to a user
struct AssignCompanyTemplateRequest: Encodable {
    let userId: String
    let companyTemplateId: String

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case companyTemplateId = "company_template_id"
    }
}

/// Request to assign a project template to a user
struct AssignProjectTemplateRequest: Encodable {
    let userId: String
    let projectId: String
    let projectTemplateId: String

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case projectId = "project_id"
        case projectTemplateId = "project_template_id"
    }
}

// MARK: - Permission Manager
class PermissionManager: ObservableObject {
    static let shared = PermissionManager()

    @Published var userOverrides: [UserPermissionOverride] = []
    @Published var projectOverrides: [ProjectPermissionOverride] = []
    @Published var permissionTemplates: [PermissionTemplate] = []
    @Published var companyTemplates: [PermissionTemplate] = []
    @Published var projectTemplates: [PermissionTemplate] = []

    private init() {}

    /// Check if a user has a specific permission
    func hasPermission(_ permission: Permission, user: User, projectId: String? = nil) -> Bool {
        // Start with role defaults
        var hasPermission = user.role.defaultPermissions.contains(permission)

        // Apply user-level overrides
        for override in userOverrides where override.userId == user.id && override.permission == permission {
            hasPermission = override.granted
        }

        // Apply project-level overrides (if project specified)
        if let projectId = projectId {
            for override in projectOverrides {
                if override.userId == user.id &&
                    override.projectId == projectId &&
                    override.permission == permission &&
                    !override.isExpired {
                    hasPermission = override.granted
                }
            }
        }

        return hasPermission
    }

    /// Get all effective permissions for a user
    func getEffectivePermissions(for user: User, projectId: String? = nil) -> Set<Permission> {
        var permissions = user.role.defaultPermissions

        // Apply user-level overrides
        for override in userOverrides where override.userId == user.id {
            if override.granted {
                permissions.insert(override.permission)
            } else {
                permissions.remove(override.permission)
            }
        }

        // Apply project-level overrides
        if let projectId = projectId {
            for override in projectOverrides {
                if override.userId == user.id &&
                    override.projectId == projectId &&
                    !override.isExpired {
                    if override.granted {
                        permissions.insert(override.permission)
                    } else {
                        permissions.remove(override.permission)
                    }
                }
            }
        }

        return permissions
    }

    /// Get the effective daily log visibility for a user
    func getDailyLogVisibility(for user: User) -> DailyLogVisibility {
        // Could be overridden in company settings or user settings
        // For now, return role default
        return user.role.defaultDailyLogVisibility
    }

    /// Check if user can manage another user (based on hierarchy)
    func canManage(manager: User, target: User) -> Bool {
        guard manager.role.defaultPermissions.contains(.manageUsers) else {
            return false
        }
        return manager.role.hierarchyLevel > target.role.hierarchyLevel
    }

    /// Check if user can assign a role (can only assign roles below their level)
    func canAssignRole(assigner: User, role: UserRole) -> Bool {
        guard assigner.role.defaultPermissions.contains(.assignRoles) else {
            return false
        }
        return assigner.role.hierarchyLevel > role.hierarchyLevel
    }
}

// MARK: - View Extension for Permission Checks
extension View {
    /// Conditionally show view based on permission
    @ViewBuilder
    func requiresPermission(_ permission: Permission, user: User, projectId: String? = nil) -> some View {
        if PermissionManager.shared.hasPermission(permission, user: user, projectId: projectId) {
            self
        } else {
            EmptyView()
        }
    }
}

