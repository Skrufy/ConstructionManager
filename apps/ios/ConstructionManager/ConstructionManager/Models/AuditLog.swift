//
//  AuditLog.swift
//  ConstructionManager
//
//  Audit logging for tracking user actions
//

import Foundation

// MARK: - Audit Action
enum AuditAction: String, Codable, CaseIterable {
    case create = "CREATE"
    case update = "UPDATE"
    case delete = "DELETE"
    case view = "VIEW"
    case export = "EXPORT"
    case approve = "APPROVE"
    case reject = "REJECT"
    case login = "LOGIN"
    case logout = "LOGOUT"
    case passwordChange = "PASSWORD_CHANGE"
    case permissionChange = "PERMISSION_CHANGE"

    var displayName: String {
        switch self {
        case .create: return "Created"
        case .update: return "Updated"
        case .delete: return "Deleted"
        case .view: return "Viewed"
        case .export: return "Exported"
        case .approve: return "Approved"
        case .reject: return "Rejected"
        case .login: return "Logged In"
        case .logout: return "Logged Out"
        case .passwordChange: return "Password Changed"
        case .permissionChange: return "Permissions Changed"
        }
    }

    var icon: String {
        switch self {
        case .create: return "plus.circle.fill"
        case .update: return "pencil.circle.fill"
        case .delete: return "trash.circle.fill"
        case .view: return "eye.circle.fill"
        case .export: return "arrow.down.circle.fill"
        case .approve: return "checkmark.circle.fill"
        case .reject: return "xmark.circle.fill"
        case .login: return "arrow.right.circle.fill"
        case .logout: return "arrow.left.circle.fill"
        case .passwordChange: return "key.fill"
        case .permissionChange: return "lock.fill"
        }
    }

    var color: String {
        switch self {
        case .create: return "success"
        case .update: return "info"
        case .delete: return "error"
        case .view: return "gray"
        case .export: return "info"
        case .approve: return "success"
        case .reject: return "error"
        case .login: return "success"
        case .logout: return "gray"
        case .passwordChange: return "warning"
        case .permissionChange: return "warning"
        }
    }
}

// MARK: - Resource Type
enum AuditResourceType: String, Codable, CaseIterable {
    case project = "PROJECT"
    case dailyLog = "DAILY_LOG"
    case timeEntry = "TIME_ENTRY"
    case document = "DOCUMENT"
    case drawing = "DRAWING"
    case equipment = "EQUIPMENT"
    case incident = "INCIDENT"
    case inspection = "INSPECTION"
    case invoice = "INVOICE"
    case expense = "EXPENSE"
    case changeOrder = "CHANGE_ORDER"
    case user = "USER"
    case subcontractor = "SUBCONTRACTOR"
    case client = "CLIENT"
    case warning = "WARNING"
    case certification = "CERTIFICATION"
    case schedule = "SCHEDULE"
    case task = "TASK"
    case rfi = "RFI"
    case punchList = "PUNCH_LIST"
    case safetyMeeting = "SAFETY_MEETING"
    case settings = "SETTINGS"
    case system = "SYSTEM"

    var displayName: String {
        switch self {
        case .project: return "Project"
        case .dailyLog: return "Daily Log"
        case .timeEntry: return "Time Entry"
        case .document: return "Document"
        case .drawing: return "Drawing"
        case .equipment: return "Equipment"
        case .incident: return "Incident"
        case .inspection: return "Inspection"
        case .invoice: return "Invoice"
        case .expense: return "Expense"
        case .changeOrder: return "Change Order"
        case .user: return "User"
        case .subcontractor: return "Subcontractor"
        case .client: return "Client"
        case .warning: return "Warning"
        case .certification: return "Certification"
        case .schedule: return "Schedule"
        case .task: return "Task"
        case .rfi: return "RFI"
        case .punchList: return "Punch List"
        case .safetyMeeting: return "Safety Meeting"
        case .settings: return "Settings"
        case .system: return "System"
        }
    }

    var icon: String {
        switch self {
        case .project: return "building.2.fill"
        case .dailyLog: return "doc.text.fill"
        case .timeEntry: return "clock.fill"
        case .document: return "folder.fill"
        case .drawing: return "doc.richtext"
        case .equipment: return "wrench.and.screwdriver.fill"
        case .incident: return "exclamationmark.triangle.fill"
        case .inspection: return "checkmark.shield.fill"
        case .invoice: return "doc.text.fill"
        case .expense: return "creditcard.fill"
        case .changeOrder: return "arrow.triangle.2.circlepath"
        case .user: return "person.fill"
        case .subcontractor: return "person.2.fill"
        case .client: return "building.fill"
        case .warning: return "exclamationmark.triangle.fill"
        case .certification: return "checkmark.seal.fill"
        case .schedule: return "calendar"
        case .task: return "checklist"
        case .rfi: return "questionmark.circle.fill"
        case .punchList: return "list.bullet.clipboard"
        case .safetyMeeting: return "person.3.fill"
        case .settings: return "gearshape.fill"
        case .system: return "server.rack"
        }
    }
}

// MARK: - Change Detail
struct ChangeDetail: Codable {
    let field: String
    let oldValue: String?
    let newValue: String?
    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase
}

// MARK: - Audit Log Entry
struct AuditLog: Identifiable, Codable {
    let id: String
    let userId: String?
    let userName: String?
    let userEmail: String?
    let action: AuditAction
    let resourceType: AuditResourceType
    let resourceId: String?
    let resourceName: String?
    let projectId: String?
    let projectName: String?
    let changes: [ChangeDetail]?
    let ipAddress: String?
    let userAgent: String?
    let success: Bool
    let errorMessage: String?
    let metadata: [String: String]?
    let createdAt: Date

    // Computed properties
    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy 'at' h:mm a"
        return formatter.string(from: createdAt)
    }

    var summary: String {
        let user = userName ?? userEmail ?? "Unknown user"
        let resource = resourceName ?? resourceType.displayName
        return "\(user) \(action.displayName.lowercased()) \(resource)"
    }

    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase

    // MARK: - Mock Data
    static let mockLogs: [AuditLog] = [
        AuditLog(
            id: "audit-1",
            userId: "user-1",
            userName: "John Smith",
            userEmail: "john@example.com",
            action: .create,
            resourceType: .dailyLog,
            resourceId: "log-123",
            resourceName: "Daily Log - Dec 26",
            projectId: "proj-1",
            projectName: "Downtown Office Complex",
            changes: nil,
            ipAddress: "192.168.1.100",
            userAgent: "iOS App",
            success: true,
            errorMessage: nil,
            metadata: nil,
            createdAt: Date()
        ),
        AuditLog(
            id: "audit-2",
            userId: "user-2",
            userName: "Jane Doe",
            userEmail: "jane@example.com",
            action: .approve,
            resourceType: .timeEntry,
            resourceId: "te-456",
            resourceName: "Time Entry - Mike Johnson",
            projectId: "proj-1",
            projectName: "Downtown Office Complex",
            changes: [
                ChangeDetail(field: "status", oldValue: "PENDING", newValue: "APPROVED")
            ],
            ipAddress: "192.168.1.101",
            userAgent: "iOS App",
            success: true,
            errorMessage: nil,
            metadata: nil,
            createdAt: Calendar.current.date(byAdding: .hour, value: -2, to: Date())!
        ),
        AuditLog(
            id: "audit-3",
            userId: "user-admin",
            userName: "Admin User",
            userEmail: "admin@example.com",
            action: .permissionChange,
            resourceType: .user,
            resourceId: "user-3",
            resourceName: "Sarah Wilson",
            projectId: nil,
            projectName: nil,
            changes: [
                ChangeDetail(field: "role", oldValue: "FIELD_WORKER", newValue: "CREW_LEADER")
            ],
            ipAddress: "192.168.1.102",
            userAgent: "Web Browser",
            success: true,
            errorMessage: nil,
            metadata: nil,
            createdAt: Calendar.current.date(byAdding: .day, value: -1, to: Date())!
        )
    ]
}
