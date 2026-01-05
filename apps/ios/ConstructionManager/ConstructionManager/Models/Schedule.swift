//
//  Schedule.swift
//  ConstructionManager
//
//  Crew scheduling and assignments
//

import Foundation

// MARK: - Schedule Status
enum ScheduleStatus: String, Codable, CaseIterable {
    case draft = "DRAFT"
    case published = "PUBLISHED"
    case confirmed = "CONFIRMED"
    case cancelled = "CANCELLED"

    var displayName: String {
        switch self {
        case .draft: return "Draft"
        case .published: return "Published"
        case .confirmed: return "Confirmed"
        case .cancelled: return "Cancelled"
        }
    }

    var color: String {
        switch self {
        case .draft: return "gray"
        case .published: return "info"
        case .confirmed: return "success"
        case .cancelled: return "error"
        }
    }
}

// MARK: - Crew Assignment
struct CrewAssignment: Identifiable, Codable {
    let id: String
    let scheduleId: String
    let userId: String
    let userName: String?
    let role: String?
    let startTime: Date?
    let endTime: Date?
    let confirmed: Bool
    let notes: String?
    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase
}

// MARK: - Schedule Model
struct Schedule: Identifiable, Codable {
    let id: String
    let projectId: String
    let projectName: String?
    let date: Date
    let startTime: Date?
    let endTime: Date?
    let status: ScheduleStatus
    let notes: String?
    let crewAssignments: [CrewAssignment]?
    let createdBy: String?
    let createdAt: Date
    let updatedAt: Date

    // Computed properties
    var crewCount: Int {
        crewAssignments?.count ?? 0
    }

    var confirmedCount: Int {
        crewAssignments?.filter { $0.confirmed }.count ?? 0
    }

    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMM d, yyyy"
        return formatter.string(from: date)
    }

    var formattedTimeRange: String? {
        guard let start = startTime, let end = endTime else { return nil }
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return "\(formatter.string(from: start)) - \(formatter.string(from: end))"
    }

    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase

    // MARK: - Mock Data
    static let mockSchedules: [Schedule] = [
        Schedule(
            id: "sched-1",
            projectId: "proj-1",
            projectName: "Downtown Office Complex",
            date: Date(),
            startTime: Calendar.current.date(bySettingHour: 7, minute: 0, second: 0, of: Date()),
            endTime: Calendar.current.date(bySettingHour: 16, minute: 0, second: 0, of: Date()),
            status: .confirmed,
            notes: "Focus on 3rd floor framing",
            crewAssignments: [
                CrewAssignment(id: "ca-1", scheduleId: "sched-1", userId: "user-1", userName: "John Smith", role: "Foreman", startTime: nil, endTime: nil, confirmed: true, notes: nil),
                CrewAssignment(id: "ca-2", scheduleId: "sched-1", userId: "user-2", userName: "Mike Johnson", role: "Carpenter", startTime: nil, endTime: nil, confirmed: true, notes: nil),
                CrewAssignment(id: "ca-3", scheduleId: "sched-1", userId: "user-3", userName: "Sarah Wilson", role: "Carpenter", startTime: nil, endTime: nil, confirmed: false, notes: nil)
            ],
            createdBy: "user-admin",
            createdAt: Date(),
            updatedAt: Date()
        ),
        Schedule(
            id: "sched-2",
            projectId: "proj-2",
            projectName: "Riverside Apartments",
            date: Calendar.current.date(byAdding: .day, value: 1, to: Date())!,
            startTime: Calendar.current.date(bySettingHour: 6, minute: 30, second: 0, of: Date()),
            endTime: Calendar.current.date(bySettingHour: 15, minute: 30, second: 0, of: Date()),
            status: .published,
            notes: "Concrete pour - weather dependent",
            crewAssignments: [
                CrewAssignment(id: "ca-4", scheduleId: "sched-2", userId: "user-4", userName: "Tom Davis", role: "Crew Leader", startTime: nil, endTime: nil, confirmed: true, notes: nil)
            ],
            createdBy: "user-admin",
            createdAt: Date(),
            updatedAt: Date()
        )
    ]
}
