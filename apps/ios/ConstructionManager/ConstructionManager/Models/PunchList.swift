//
//  PunchList.swift
//  ConstructionManager
//
//  Punch list items for project closeout
//

import Foundation

// MARK: - Punch List Priority
enum PunchListPriority: String, Codable, CaseIterable {
    case low = "LOW"
    case medium = "MEDIUM"
    case high = "HIGH"
    case critical = "CRITICAL"

    var displayName: String {
        switch self {
        case .low: return "punchList.priority.low".localized
        case .medium: return "punchList.priority.medium".localized
        case .high: return "punchList.priority.high".localized
        case .critical: return "punchList.priority.critical".localized
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
        case .critical: return "exclamationmark.triangle.fill"
        }
    }
}

// MARK: - Punch List Status
enum PunchListStatus: String, Codable, CaseIterable {
    case open = "OPEN"
    case inProgress = "IN_PROGRESS"
    case completed = "COMPLETED"
    case verified = "VERIFIED"

    var displayName: String {
        switch self {
        case .open: return "punchList.status.open".localized
        case .inProgress: return "punchList.status.inProgress".localized
        case .completed: return "punchList.status.completed".localized
        case .verified: return "punchList.status.verified".localized
        }
    }

    var color: String {
        switch self {
        case .open: return "error"
        case .inProgress: return "warning"
        case .completed: return "info"
        case .verified: return "success"
        }
    }
}

// MARK: - Punch List Item
struct PunchListItem: Identifiable, Codable {
    let id: String
    let projectId: String
    let projectName: String?
    let location: String?
    let description: String
    let trade: String?
    let priority: PunchListPriority
    let status: PunchListStatus
    let assignedTo: String?
    let assignedToName: String?
    let dueDate: Date?
    let completedAt: Date?
    let completedBy: String?
    let verifiedAt: Date?
    let verifiedBy: String?
    let photos: [String]?
    let notes: String?
    let createdBy: String?
    let createdByName: String?
    let createdAt: Date
    let updatedAt: Date

    // Computed properties
    var isOverdue: Bool {
        guard let dueDate = dueDate, status == .open || status == .inProgress else { return false }
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
    static let mockItems: [PunchListItem] = [
        PunchListItem(
            id: "pl-1",
            projectId: "proj-1",
            projectName: "Downtown Office Complex",
            location: "3rd Floor - Conference Room A",
            description: "Touch up paint on north wall - visible roller marks",
            trade: "Painting",
            priority: .medium,
            status: .open,
            assignedTo: "sub-1",
            assignedToName: "ABC Painting Co.",
            dueDate: Calendar.current.date(byAdding: .day, value: 5, to: Date()),
            completedAt: nil,
            completedBy: nil,
            verifiedAt: nil,
            verifiedBy: nil,
            photos: nil,
            notes: nil,
            createdBy: "user-1",
            createdByName: "John Smith",
            createdAt: Date(),
            updatedAt: Date()
        ),
        PunchListItem(
            id: "pl-2",
            projectId: "proj-1",
            projectName: "Downtown Office Complex",
            location: "Lobby - Main Entrance",
            description: "Door closer needs adjustment - door not latching properly",
            trade: "Doors & Hardware",
            priority: .high,
            status: .inProgress,
            assignedTo: "sub-2",
            assignedToName: "Door Systems Inc.",
            dueDate: Calendar.current.date(byAdding: .day, value: 2, to: Date()),
            completedAt: nil,
            completedBy: nil,
            verifiedAt: nil,
            verifiedBy: nil,
            photos: nil,
            notes: "Parts ordered, scheduled for Tuesday",
            createdBy: "user-1",
            createdByName: "John Smith",
            createdAt: Date(),
            updatedAt: Date()
        ),
        PunchListItem(
            id: "pl-3",
            projectId: "proj-1",
            projectName: "Downtown Office Complex",
            location: "2nd Floor - Restroom",
            description: "Replace cracked floor tile near sink",
            trade: "Tile",
            priority: .low,
            status: .completed,
            assignedTo: "sub-3",
            assignedToName: "Precision Tile Works",
            dueDate: Calendar.current.date(byAdding: .day, value: -3, to: Date()),
            completedAt: Calendar.current.date(byAdding: .day, value: -1, to: Date()),
            completedBy: "sub-3",
            verifiedAt: nil,
            verifiedBy: nil,
            photos: nil,
            notes: nil,
            createdBy: "user-1",
            createdByName: "John Smith",
            createdAt: Date(),
            updatedAt: Date()
        )
    ]
}
