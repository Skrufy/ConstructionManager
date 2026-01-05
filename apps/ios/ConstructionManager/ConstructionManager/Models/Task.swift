//
//  Task.swift
//  ConstructionManager
//
//  Task and RFI (Request for Information) models
//

import Foundation

// MARK: - Task Priority
enum TaskPriority: String, Codable, CaseIterable {
    case low = "LOW"
    case medium = "MEDIUM"
    case high = "HIGH"
    case critical = "CRITICAL"

    var displayName: String {
        switch self {
        case .low: return "Low"
        case .medium: return "Medium"
        case .high: return "High"
        case .critical: return "Critical"
        }
    }

    var color: String {
        switch self {
        case .low: return "gray"
        case .medium: return "info"
        case .high: return "warning"
        case .critical: return "error"
        }
    }

    var icon: String {
        switch self {
        case .low: return "arrow.down"
        case .medium: return "minus"
        case .high: return "arrow.up"
        case .critical: return "exclamationmark.2"
        }
    }
}

// MARK: - Task Status
enum TaskStatus: String, Codable, CaseIterable {
    case todo = "TODO"
    case inProgress = "IN_PROGRESS"
    case blocked = "BLOCKED"
    case completed = "COMPLETED"
    case cancelled = "CANCELLED"

    var displayName: String {
        switch self {
        case .todo: return "To Do"
        case .inProgress: return "In Progress"
        case .blocked: return "Blocked"
        case .completed: return "Completed"
        case .cancelled: return "Cancelled"
        }
    }

    var color: String {
        switch self {
        case .todo: return "gray"
        case .inProgress: return "info"
        case .blocked: return "error"
        case .completed: return "success"
        case .cancelled: return "gray"
        }
    }
}

// MARK: - Subtask
struct Subtask: Identifiable, Codable {
    let id: String
    let taskId: String
    let title: String
    let completed: Bool
    let completedAt: Date?
    let completedBy: String?

    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase
}

// MARK: - Task Model
struct ProjectTask: Identifiable, Codable {
    let id: String
    let projectId: String
    let projectName: String?
    let title: String
    let description: String?
    let priority: TaskPriority
    let status: TaskStatus
    let assigneeId: String?
    let assigneeName: String?
    let dueDate: Date?
    let completedAt: Date?
    let subtasks: [Subtask]?
    let tags: [String]?
    let createdBy: String?
    let createdAt: Date
    let updatedAt: Date

    // Computed properties
    var isOverdue: Bool {
        guard let dueDate = dueDate, status != .completed && status != .cancelled else { return false }
        return dueDate < Date()
    }

    var subtaskProgress: (completed: Int, total: Int) {
        let total = subtasks?.count ?? 0
        let completed = subtasks?.filter { $0.completed }.count ?? 0
        return (completed, total)
    }

    var formattedDueDate: String? {
        guard let dueDate = dueDate else { return nil }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: dueDate)
    }

    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase

    // MARK: - Mock Data
    static let mockTasks: [ProjectTask] = [
        ProjectTask(
            id: "task-1",
            projectId: "proj-1",
            projectName: "Downtown Office Complex",
            title: "Complete electrical rough-in for 3rd floor",
            description: "Install all electrical boxes and run conduit for 3rd floor offices",
            priority: .high,
            status: .inProgress,
            assigneeId: "user-1",
            assigneeName: "John Smith",
            dueDate: Calendar.current.date(byAdding: .day, value: 3, to: Date()),
            completedAt: nil,
            subtasks: [
                Subtask(id: "st-1", taskId: "task-1", title: "Run conduit to main panel", completed: true, completedAt: Date(), completedBy: "user-1"),
                Subtask(id: "st-2", taskId: "task-1", title: "Install outlet boxes", completed: false, completedAt: nil, completedBy: nil),
                Subtask(id: "st-3", taskId: "task-1", title: "Install switch boxes", completed: false, completedAt: nil, completedBy: nil)
            ],
            tags: ["electrical", "3rd-floor"],
            createdBy: "user-admin",
            createdAt: Date(),
            updatedAt: Date()
        ),
        ProjectTask(
            id: "task-2",
            projectId: "proj-1",
            projectName: "Downtown Office Complex",
            title: "Order HVAC units for rooftop",
            description: nil,
            priority: .critical,
            status: .todo,
            assigneeId: nil,
            assigneeName: nil,
            dueDate: Calendar.current.date(byAdding: .day, value: -1, to: Date()),
            completedAt: nil,
            subtasks: nil,
            tags: ["hvac", "procurement"],
            createdBy: "user-admin",
            createdAt: Date(),
            updatedAt: Date()
        )
    ]
}

// MARK: - RFI Status
enum RFIStatus: String, Codable, CaseIterable {
    case draft = "DRAFT"
    case submitted = "SUBMITTED"
    case underReview = "UNDER_REVIEW"
    case answered = "ANSWERED"
    case closed = "CLOSED"

    var displayName: String {
        switch self {
        case .draft: return "Draft"
        case .submitted: return "Submitted"
        case .underReview: return "Under Review"
        case .answered: return "Answered"
        case .closed: return "Closed"
        }
    }

    var color: String {
        switch self {
        case .draft: return "gray"
        case .submitted: return "info"
        case .underReview: return "warning"
        case .answered: return "success"
        case .closed: return "gray"
        }
    }
}

// MARK: - RFI Model
struct RFI: Identifiable, Codable {
    let id: String
    let projectId: String
    let projectName: String?
    let rfiNumber: String
    let subject: String
    let question: String
    let answer: String?
    let status: RFIStatus
    let priority: TaskPriority
    let assignedTo: String?
    let assignedToName: String?
    let dueDate: Date?
    let answeredAt: Date?
    let answeredBy: String?
    let attachments: [String]?
    let createdBy: String?
    let createdByName: String?
    let createdAt: Date
    let updatedAt: Date

    // Computed properties
    var isOverdue: Bool {
        guard let dueDate = dueDate, status != .answered && status != .closed else { return false }
        return dueDate < Date()
    }

    var formattedDueDate: String? {
        guard let dueDate = dueDate else { return nil }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: dueDate)
    }

    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase

    // MARK: - Mock Data
    static let mockRFIs: [RFI] = [
        RFI(
            id: "rfi-1",
            projectId: "proj-1",
            projectName: "Downtown Office Complex",
            rfiNumber: "RFI-001",
            subject: "Structural beam clarification at grid B-4",
            question: "Drawing S-201 shows a W12x26 beam at grid B-4, but the schedule calls for W14x30. Please clarify which size is correct.",
            answer: "Use W14x30 as per the schedule. Drawing S-201 will be revised.",
            status: .answered,
            priority: .high,
            assignedTo: "user-arch",
            assignedToName: "Jane Architect",
            dueDate: Calendar.current.date(byAdding: .day, value: -2, to: Date()),
            answeredAt: Calendar.current.date(byAdding: .day, value: -3, to: Date()),
            answeredBy: "user-arch",
            attachments: nil,
            createdBy: "user-1",
            createdByName: "John Smith",
            createdAt: Date(),
            updatedAt: Date()
        ),
        RFI(
            id: "rfi-2",
            projectId: "proj-1",
            projectName: "Downtown Office Complex",
            rfiNumber: "RFI-002",
            subject: "Exterior finish color selection",
            question: "Please provide the exact paint color specification for the exterior stucco finish on the south elevation.",
            answer: nil,
            status: .submitted,
            priority: .medium,
            assignedTo: "user-arch",
            assignedToName: "Jane Architect",
            dueDate: Calendar.current.date(byAdding: .day, value: 5, to: Date()),
            answeredAt: nil,
            answeredBy: nil,
            attachments: nil,
            createdBy: "user-1",
            createdByName: "John Smith",
            createdAt: Date(),
            updatedAt: Date()
        )
    ]
}
