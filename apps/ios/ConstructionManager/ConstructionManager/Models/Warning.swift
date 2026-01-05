//
//  Warning.swift
//  ConstructionManager
//
//  Employee warning data models
//

import Foundation
import SwiftUI

// MARK: - Warning Model
struct EmployeeWarning: Identifiable, Codable {
    let id: String
    let employeeId: String
    let employeeName: String
    let issuedById: String
    let issuedByName: String
    let projectId: String?
    let projectName: String?
    let type: WarningType
    let severity: WarningSeverity
    let title: String
    let description: String
    let incidentDate: Date
    let issuedAt: Date
    let acknowledgedAt: Date?
    let employeeResponse: String?
    let witnesses: [String]
    let attachments: [String]
    let followUpRequired: Bool
    let followUpDate: Date?
    let followUpNotes: String?
    let status: WarningStatus

    var isAcknowledged: Bool {
        acknowledgedAt != nil
    }

    var daysSinceIssued: Int {
        Calendar.current.dateComponents([.day], from: issuedAt, to: Date()).day ?? 0
    }
}

// MARK: - Warning Type
enum WarningType: String, Codable, CaseIterable {
    case verbal = "Verbal"
    case written = "Written"
    case final = "Final"
    case suspension = "Suspension"
    case termination = "Termination"

    var icon: String {
        switch self {
        case .verbal: return "bubble.left"
        case .written: return "doc.text"
        case .final: return "exclamationmark.triangle"
        case .suspension: return "pause.circle"
        case .termination: return "xmark.circle"
        }
    }

    var color: Color {
        switch self {
        case .verbal: return AppColors.info
        case .written: return AppColors.warning
        case .final: return AppColors.orange
        case .suspension: return .purple
        case .termination: return AppColors.error
        }
    }

    var severityWeight: Int {
        switch self {
        case .verbal: return 1
        case .written: return 2
        case .final: return 3
        case .suspension: return 4
        case .termination: return 5
        }
    }
}

// MARK: - Warning Severity
enum WarningSeverity: String, Codable, CaseIterable {
    case minor = "Minor"
    case moderate = "Moderate"
    case major = "Major"
    case critical = "Critical"

    var color: Color {
        switch self {
        case .minor: return AppColors.info
        case .moderate: return AppColors.warning
        case .major: return AppColors.orange
        case .critical: return AppColors.error
        }
    }

    var icon: String {
        switch self {
        case .minor: return "circle"
        case .moderate: return "circle.lefthalf.filled"
        case .major: return "circle.fill"
        case .critical: return "exclamationmark.circle.fill"
        }
    }
}

// MARK: - Warning Status
enum WarningStatus: String, Codable, CaseIterable {
    case pending = "Pending"
    case acknowledged = "Acknowledged"
    case disputed = "Disputed"
    case resolved = "Resolved"
    case escalated = "Escalated"

    var color: Color {
        switch self {
        case .pending: return AppColors.warning
        case .acknowledged: return AppColors.success
        case .disputed: return AppColors.orange
        case .resolved: return AppColors.gray500
        case .escalated: return AppColors.error
        }
    }
}

// MARK: - Warning Category (Reason)
enum WarningCategory: String, Codable, CaseIterable {
    case safety = "Safety Violation"
    case attendance = "Attendance"
    case performance = "Performance"
    case conduct = "Conduct"
    case policy = "Policy Violation"
    case quality = "Quality Issues"
    case insubordination = "Insubordination"
    case other = "Other"

    var icon: String {
        switch self {
        case .safety: return "exclamationmark.shield"
        case .attendance: return "clock"
        case .performance: return "chart.line.downtrend.xyaxis"
        case .conduct: return "person.fill.xmark"
        case .policy: return "doc.badge.arrow.up"
        case .quality: return "checkmark.circle.badge.xmark"
        case .insubordination: return "hand.raised.slash"
        case .other: return "ellipsis.circle"
        }
    }

    var color: Color {
        switch self {
        case .safety: return AppColors.error
        case .attendance: return AppColors.warning
        case .performance: return AppColors.orange
        case .conduct: return .purple
        case .policy: return AppColors.info
        case .quality: return .teal
        case .insubordination: return AppColors.error
        case .other: return AppColors.gray500
        }
    }
}

// MARK: - Mock Data
extension EmployeeWarning {
    static let mockWarnings: [EmployeeWarning] = [
        EmployeeWarning(
            id: "1",
            employeeId: "5",
            employeeName: "Mike Johnson",
            issuedById: "2",
            issuedByName: "Sarah Thompson",
            projectId: "1",
            projectName: "Downtown Office Complex",
            type: .written,
            severity: .major,
            title: "Safety Equipment Violation",
            description: "Employee was observed working at height without proper fall protection equipment. This is a serious safety violation that puts the employee and others at risk.",
            incidentDate: Calendar.current.date(byAdding: .day, value: -2, to: Date())!,
            issuedAt: Calendar.current.date(byAdding: .day, value: -1, to: Date())!,
            acknowledgedAt: nil,
            employeeResponse: nil,
            witnesses: ["Tom Wilson", "Alex Chen"],
            attachments: [],
            followUpRequired: true,
            followUpDate: Calendar.current.date(byAdding: .day, value: 7, to: Date()),
            followUpNotes: nil,
            status: .pending
        ),
        EmployeeWarning(
            id: "2",
            employeeId: "6",
            employeeName: "David Lee",
            issuedById: "3",
            issuedByName: "Carlos Rodriguez",
            projectId: "1",
            projectName: "Downtown Office Complex",
            type: .verbal,
            severity: .minor,
            title: "Late Arrival",
            description: "Employee arrived 45 minutes late without prior notice. This is the second occurrence this month.",
            incidentDate: Calendar.current.date(byAdding: .day, value: -3, to: Date())!,
            issuedAt: Calendar.current.date(byAdding: .day, value: -3, to: Date())!,
            acknowledgedAt: Calendar.current.date(byAdding: .day, value: -2, to: Date()),
            employeeResponse: "Traffic accident on highway caused delay. Will leave earlier in the future.",
            witnesses: [],
            attachments: [],
            followUpRequired: false,
            followUpDate: nil,
            followUpNotes: nil,
            status: .acknowledged
        ),
        EmployeeWarning(
            id: "3",
            employeeId: "7",
            employeeName: "James Wilson",
            issuedById: "2",
            issuedByName: "Sarah Thompson",
            projectId: "2",
            projectName: "Riverside Apartments",
            type: .written,
            severity: .moderate,
            title: "Work Quality Issue",
            description: "Framing work did not meet specifications. Multiple areas needed to be redone, causing project delays.",
            incidentDate: Calendar.current.date(byAdding: .day, value: -5, to: Date())!,
            issuedAt: Calendar.current.date(byAdding: .day, value: -4, to: Date())!,
            acknowledgedAt: Calendar.current.date(byAdding: .day, value: -3, to: Date()),
            employeeResponse: "I understand the issues and have reviewed the specifications with my crew leader.",
            witnesses: ["Site Inspector"],
            attachments: ["photos/quality_issue_1.jpg"],
            followUpRequired: true,
            followUpDate: Calendar.current.date(byAdding: .day, value: 14, to: Date()),
            followUpNotes: nil,
            status: .acknowledged
        ),
        EmployeeWarning(
            id: "4",
            employeeId: "5",
            employeeName: "Mike Johnson",
            issuedById: "3",
            issuedByName: "Carlos Rodriguez",
            projectId: nil,
            projectName: nil,
            type: .verbal,
            severity: .minor,
            title: "Improper Tool Storage",
            description: "Tools left unsecured at end of shift, creating safety hazard.",
            incidentDate: Calendar.current.date(byAdding: .day, value: -10, to: Date())!,
            issuedAt: Calendar.current.date(byAdding: .day, value: -10, to: Date())!,
            acknowledgedAt: Calendar.current.date(byAdding: .day, value: -9, to: Date()),
            employeeResponse: nil,
            witnesses: [],
            attachments: [],
            followUpRequired: false,
            followUpDate: nil,
            followUpNotes: nil,
            status: .resolved
        )
    ]
}
