//
//  Safety.swift
//  ConstructionManager
//
//  Safety-related data models (incidents, inspections)
//

import Foundation
import SwiftUI

// MARK: - Incident Report Model
struct IncidentReport: Identifiable, Codable {
    let id: String
    let projectId: String
    let projectName: String?
    let reportedBy: String
    let reporterName: String?
    let incidentDate: Date
    let incidentTime: String?
    let location: String
    let incidentType: IncidentType
    let severity: IncidentSeverity
    let description: String
    let rootCause: String?
    let immediateActions: String?
    let witnesses: [String]?
    let injuredParties: [InjuredParty]?
    let photoUrls: [String]?
    let status: IncidentStatus
    let investigationNotes: String?
    let correctiveActions: String?
    let closedAt: Date?
    let closedBy: String?
    let closerName: String?
    let createdAt: Date
    let updatedAt: Date

    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase

    var isOpen: Bool {
        status != .closed
    }

    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: incidentDate)
    }

    var formattedTime: String? {
        guard let time = incidentTime, !time.isEmpty else { return nil }
        return time
    }
}

// MARK: - Injured Party
struct InjuredParty: Codable {
    let name: String
    let injuryType: String?
    let treatment: String?
}

// MARK: - Incident Type
enum IncidentType: String, Codable, CaseIterable {
    case injury = "INJURY"
    case nearMiss = "NEAR_MISS"
    case propertyDamage = "PROPERTY_DAMAGE"
    case environmental = "ENVIRONMENTAL"
    case other = "OTHER"

    var displayName: String {
        switch self {
        case .injury: return "Injury"
        case .nearMiss: return "Near Miss"
        case .propertyDamage: return "Property Damage"
        case .environmental: return "Environmental"
        case .other: return "Other"
        }
    }

    var icon: String {
        switch self {
        case .injury: return "cross.case.fill"
        case .nearMiss: return "exclamationmark.triangle.fill"
        case .propertyDamage: return "hammer.fill"
        case .environmental: return "leaf.fill"
        case .other: return "questionmark.circle.fill"
        }
    }

    var color: Color {
        switch self {
        case .injury: return AppColors.error
        case .nearMiss: return AppColors.warning
        case .propertyDamage: return .orange
        case .environmental: return .green
        case .other: return AppColors.gray500
        }
    }
}

// MARK: - Incident Severity
enum IncidentSeverity: String, Codable, CaseIterable {
    case minor = "MINOR"
    case moderate = "MODERATE"
    case serious = "SERIOUS"
    case critical = "CRITICAL"

    var displayName: String {
        switch self {
        case .minor: return "Minor"
        case .moderate: return "Moderate"
        case .serious: return "Serious"
        case .critical: return "Critical"
        }
    }

    var color: Color {
        switch self {
        case .minor: return AppColors.success
        case .moderate: return AppColors.warning
        case .serious: return .orange
        case .critical: return AppColors.error
        }
    }

    var badgeStatus: BadgeStatus {
        switch self {
        case .minor: return .active
        case .moderate: return .warning
        case .serious: return .pending
        case .critical: return .cancelled
        }
    }
}

// MARK: - Incident Status
enum IncidentStatus: String, Codable, CaseIterable {
    case reported = "REPORTED"
    case underInvestigation = "UNDER_INVESTIGATION"
    case closed = "CLOSED"

    var displayName: String {
        switch self {
        case .reported: return "safety.status.reported".localized
        case .underInvestigation: return "safety.status.underInvestigation".localized
        case .closed: return "safety.status.closed".localized
        }
    }

    var color: Color {
        switch self {
        case .reported: return AppColors.warning
        case .underInvestigation: return AppColors.info
        case .closed: return AppColors.success
        }
    }

    var badgeStatus: BadgeStatus {
        switch self {
        case .reported: return .warning
        case .underInvestigation: return .info
        case .closed: return .active
        }
    }
}

// MARK: - Inspection Model
struct Inspection: Identifiable, Codable {
    let id: String
    let templateId: String
    let templateName: String?
    let templateCategory: String?
    let projectId: String
    let projectName: String?
    let inspectorId: String
    let inspectorName: String?
    let date: Date
    let location: String?
    let overallStatus: InspectionStatus
    let notes: String?
    let signatureUrl: String?
    let photoCount: Int
    let createdAt: Date
    let updatedAt: Date

    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: date)
    }
}

// MARK: - Inspection Status
enum InspectionStatus: String, Codable, CaseIterable {
    case pending = "PENDING"
    case passed = "PASSED"
    case failed = "FAILED"
    case requiresFollowup = "REQUIRES_FOLLOWUP"

    var displayName: String {
        switch self {
        case .pending: return "safety.inspection.pending".localized
        case .passed: return "safety.inspection.passed".localized
        case .failed: return "safety.inspection.failed".localized
        case .requiresFollowup: return "safety.inspection.requiresFollowup".localized
        }
    }

    var color: Color {
        switch self {
        case .pending: return AppColors.warning
        case .passed: return AppColors.success
        case .failed: return AppColors.error
        case .requiresFollowup: return AppColors.info
        }
    }

    var icon: String {
        switch self {
        case .pending: return "clock.fill"
        case .passed: return "checkmark.circle.fill"
        case .failed: return "xmark.circle.fill"
        case .requiresFollowup: return "arrow.clockwise.circle.fill"
        }
    }

    var badgeStatus: BadgeStatus {
        switch self {
        case .pending: return .pending
        case .passed: return .active
        case .failed: return .cancelled
        case .requiresFollowup: return .info
        }
    }
}

// MARK: - Inspection Category
enum InspectionCategory: String, CaseIterable {
    case safety = "SAFETY"
    case quality = "QUALITY"
    case environmental = "ENVIRONMENTAL"
    case preWork = "PRE_WORK"

    var displayName: String {
        switch self {
        case .safety: return "Safety"
        case .quality: return "Quality"
        case .environmental: return "Environmental"
        case .preWork: return "Pre-Work"
        }
    }

    var icon: String {
        switch self {
        case .safety: return "shield.checkered"
        case .quality: return "star.fill"
        case .environmental: return "leaf.fill"
        case .preWork: return "checklist"
        }
    }

    var color: Color {
        switch self {
        case .safety: return AppColors.error
        case .quality: return AppColors.primary600
        case .environmental: return .green
        case .preWork: return AppColors.info
        }
    }
}

// MARK: - Mock Data
extension IncidentReport {
    static let mockIncidents: [IncidentReport] = [
        IncidentReport(
            id: "1",
            projectId: "p1",
            projectName: "Downtown Office Tower",
            reportedBy: "u1",
            reporterName: "John Smith",
            incidentDate: Calendar.current.date(byAdding: .day, value: -2, to: Date())!,
            incidentTime: "10:30 AM",
            location: "2nd Floor - East Wing",
            incidentType: .nearMiss,
            severity: .minor,
            description: "Worker slipped on wet floor near the elevator shaft. No injury occurred but could have been serious.",
            rootCause: "Floor was wet from recent cleaning without proper signage",
            immediateActions: "Added wet floor signs, briefed cleaning crew on protocols",
            witnesses: ["Mike Johnson", "Sarah Williams"],
            injuredParties: nil,
            photoUrls: nil,
            status: .closed,
            investigationNotes: nil,
            correctiveActions: "Updated cleaning protocol to include mandatory signage",
            closedAt: Calendar.current.date(byAdding: .day, value: -1, to: Date()),
            closedBy: "u2",
            closerName: "Jane Doe",
            createdAt: Calendar.current.date(byAdding: .day, value: -2, to: Date())!,
            updatedAt: Date()
        ),
        IncidentReport(
            id: "2",
            projectId: "p1",
            projectName: "Downtown Office Tower",
            reportedBy: "u3",
            reporterName: "Mike Johnson",
            incidentDate: Date(),
            incidentTime: "2:15 PM",
            location: "Basement - Mechanical Room",
            incidentType: .injury,
            severity: .moderate,
            description: "Worker sustained cut to hand while handling sheet metal. Required first aid and medical attention.",
            rootCause: nil,
            immediateActions: "Applied first aid, transported to urgent care",
            witnesses: ["Tom Brown"],
            injuredParties: [InjuredParty(name: "David Lee", injuryType: "Laceration", treatment: "Stitches at urgent care")],
            photoUrls: nil,
            status: .underInvestigation,
            investigationNotes: "Reviewing PPE requirements for sheet metal work",
            correctiveActions: nil,
            closedAt: nil,
            closedBy: nil,
            closerName: nil,
            createdAt: Date(),
            updatedAt: Date()
        ),
        IncidentReport(
            id: "3",
            projectId: "p2",
            projectName: "Harbor View Residences",
            reportedBy: "u1",
            reporterName: "John Smith",
            incidentDate: Calendar.current.date(byAdding: .day, value: -5, to: Date())!,
            incidentTime: "8:45 AM",
            location: "Parking Structure Level 3",
            incidentType: .propertyDamage,
            severity: .minor,
            description: "Forklift struck support column causing minor concrete damage",
            rootCause: "Operator visibility was obstructed",
            immediateActions: "Secured area, structural engineer notified",
            witnesses: nil,
            injuredParties: nil,
            photoUrls: nil,
            status: .closed,
            investigationNotes: nil,
            correctiveActions: "Added mirrors and improved lighting in parking structure",
            closedAt: Calendar.current.date(byAdding: .day, value: -3, to: Date()),
            closedBy: "u2",
            closerName: "Jane Doe",
            createdAt: Calendar.current.date(byAdding: .day, value: -5, to: Date())!,
            updatedAt: Date()
        )
    ]
}

extension Inspection {
    static let mockInspections: [Inspection] = [
        Inspection(
            id: "1",
            templateId: "t1",
            templateName: "Daily Safety Checklist",
            templateCategory: "SAFETY",
            projectId: "p1",
            projectName: "Downtown Office Tower",
            inspectorId: "u1",
            inspectorName: "John Smith",
            date: Date(),
            location: "All Floors",
            overallStatus: .passed,
            notes: "All areas clear, no issues found",
            signatureUrl: nil,
            photoCount: 3,
            createdAt: Date(),
            updatedAt: Date()
        ),
        Inspection(
            id: "2",
            templateId: "t2",
            templateName: "Scaffolding Inspection",
            templateCategory: "SAFETY",
            projectId: "p1",
            projectName: "Downtown Office Tower",
            inspectorId: "u2",
            inspectorName: "Jane Doe",
            date: Calendar.current.date(byAdding: .day, value: -1, to: Date())!,
            location: "North Facade",
            overallStatus: .requiresFollowup,
            notes: "Minor issues with guardrail connections on level 4",
            signatureUrl: nil,
            photoCount: 5,
            createdAt: Calendar.current.date(byAdding: .day, value: -1, to: Date())!,
            updatedAt: Date()
        ),
        Inspection(
            id: "3",
            templateId: "t3",
            templateName: "Fire Safety Compliance",
            templateCategory: "SAFETY",
            projectId: "p2",
            projectName: "Harbor View Residences",
            inspectorId: "u1",
            inspectorName: "John Smith",
            date: Calendar.current.date(byAdding: .day, value: -3, to: Date())!,
            location: "Building A",
            overallStatus: .failed,
            notes: "Fire extinguisher missing on 3rd floor, exit signage inadequate",
            signatureUrl: nil,
            photoCount: 8,
            createdAt: Calendar.current.date(byAdding: .day, value: -3, to: Date())!,
            updatedAt: Date()
        ),
        Inspection(
            id: "4",
            templateId: "t4",
            templateName: "Quality Control - Concrete Pour",
            templateCategory: "QUALITY",
            projectId: "p1",
            projectName: "Downtown Office Tower",
            inspectorId: "u3",
            inspectorName: "Mike Johnson",
            date: Calendar.current.date(byAdding: .day, value: -2, to: Date())!,
            location: "Foundation - Section C",
            overallStatus: .passed,
            notes: "Slump test passed, placement completed per spec",
            signatureUrl: nil,
            photoCount: 12,
            createdAt: Calendar.current.date(byAdding: .day, value: -2, to: Date())!,
            updatedAt: Date()
        )
    ]
}
