//
//  SafetyMeeting.swift
//  ConstructionManager
//
//  Safety meeting (toolbox talk) tracking
//

import Foundation

// MARK: - Meeting Type
enum SafetyMeetingType: String, Codable, CaseIterable {
    // Meeting frequency/purpose types
    case toolboxTalk = "TOOLBOX_TALK"
    case weekly = "WEEKLY"
    case monthly = "MONTHLY"
    case special = "SPECIAL"
    case incident = "INCIDENT_REVIEW"
    case orientation = "ORIENTATION"
    // Topic category types (from database SafetyTopic categories)
    case ppe = "PPE"
    case hazards = "HAZARDS"
    case procedures = "PROCEDURES"
    case emergency = "EMERGENCY"
    case equipment = "EQUIPMENT"
    case general = "GENERAL"

    var displayName: String {
        switch self {
        case .toolboxTalk: return "safetyMeeting.toolboxTalk".localized
        case .weekly: return "safetyMeeting.weekly".localized
        case .monthly: return "safetyMeeting.monthly".localized
        case .special: return "safetyMeeting.special".localized
        case .incident: return "safetyMeeting.incidentReview".localized
        case .orientation: return "safetyMeeting.orientation".localized
        case .ppe: return "safetyMeeting.ppe".localized
        case .hazards: return "safetyMeeting.hazards".localized
        case .procedures: return "safetyMeeting.procedures".localized
        case .emergency: return "safetyMeeting.emergency".localized
        case .equipment: return "safetyMeeting.equipment".localized
        case .general: return "safetyMeeting.general".localized
        }
    }

    var icon: String {
        switch self {
        case .toolboxTalk: return "wrench.and.screwdriver"
        case .weekly: return "calendar.badge.clock"
        case .monthly: return "calendar"
        case .special: return "star.fill"
        case .incident: return "exclamationmark.triangle"
        case .orientation: return "person.badge.plus"
        case .ppe: return "shield.checkered"
        case .hazards: return "exclamationmark.triangle.fill"
        case .procedures: return "list.clipboard"
        case .emergency: return "light.beacon.max"
        case .equipment: return "gearshape.2"
        case .general: return "info.circle"
        }
    }
}

// MARK: - Meeting Attendee
struct MeetingAttendee: Identifiable, Codable {
    let id: String
    let meetingId: String
    let userId: String?
    let name: String
    let company: String?
    let signedAt: Date?
    let signatureUrl: String?

    var hasSigned: Bool {
        signedAt != nil
    }
    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase
}

// MARK: - Action Item
struct MeetingActionItem: Identifiable, Codable {
    let id: String
    let meetingId: String
    let description: String
    let assignedTo: String?
    let assignedToName: String?
    let dueDate: Date?
    let completed: Bool
    let completedAt: Date?
    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase
}

// MARK: - Safety Meeting
struct SafetyMeeting: Identifiable, Codable {
    let id: String
    let projectId: String
    let projectName: String?
    let type: SafetyMeetingType
    let title: String
    let topic: String?
    let description: String?
    let date: Date
    let duration: Int? // minutes
    let location: String?
    let conductedBy: String?
    let conductedByName: String?
    let attendees: [MeetingAttendee]?
    let actionItems: [MeetingActionItem]?
    let attachments: [String]?
    let notes: String?
    let createdAt: Date
    let updatedAt: Date

    // Computed properties
    var attendeeCount: Int {
        attendees?.count ?? 0
    }

    var signedCount: Int {
        attendees?.filter { $0.hasSigned }.count ?? 0
    }

    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy 'at' h:mm a"
        return formatter.string(from: date)
    }

    var formattedDuration: String? {
        guard let duration = duration else { return nil }
        if duration >= 60 {
            let hours = duration / 60
            let mins = duration % 60
            return mins > 0 ? "\(hours)h \(mins)m" : "\(hours)h"
        }
        return "\(duration)m"
    }

    var actionItemsProgress: (completed: Int, total: Int) {
        let total = actionItems?.count ?? 0
        let completed = actionItems?.filter { $0.completed }.count ?? 0
        return (completed, total)
    }
    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase

    // MARK: - Mock Data
    static let mockMeetings: [SafetyMeeting] = [
        SafetyMeeting(
            id: "sm-1",
            projectId: "proj-1",
            projectName: "Downtown Office Complex",
            type: .toolboxTalk,
            title: "Fall Protection Review",
            topic: "Proper use of harnesses and lanyards",
            description: "Review of fall protection requirements for work above 6 feet",
            date: Date(),
            duration: 15,
            location: "Job Site Trailer",
            conductedBy: "user-1",
            conductedByName: "John Smith",
            attendees: [
                MeetingAttendee(id: "att-1", meetingId: "sm-1", userId: "user-2", name: "Mike Johnson", company: nil, signedAt: Date(), signatureUrl: nil),
                MeetingAttendee(id: "att-2", meetingId: "sm-1", userId: "user-3", name: "Sarah Wilson", company: nil, signedAt: Date(), signatureUrl: nil),
                MeetingAttendee(id: "att-3", meetingId: "sm-1", userId: nil, name: "Tom Davis", company: "ABC Contractors", signedAt: nil, signatureUrl: nil)
            ],
            actionItems: [
                MeetingActionItem(id: "ai-1", meetingId: "sm-1", description: "Inspect all harnesses on site", assignedTo: "user-1", assignedToName: "John Smith", dueDate: Calendar.current.date(byAdding: .day, value: 1, to: Date()), completed: false, completedAt: nil)
            ],
            attachments: nil,
            notes: "All crew members present except 2 who will receive makeup training",
            createdAt: Date(),
            updatedAt: Date()
        ),
        SafetyMeeting(
            id: "sm-2",
            projectId: "proj-1",
            projectName: "Downtown Office Complex",
            type: .weekly,
            title: "Weekly Safety Briefing",
            topic: "Hot Work Procedures",
            description: nil,
            date: Calendar.current.date(byAdding: .day, value: -7, to: Date())!,
            duration: 30,
            location: "Conference Room",
            conductedBy: "user-1",
            conductedByName: "John Smith",
            attendees: nil,
            actionItems: nil,
            attachments: nil,
            notes: nil,
            createdAt: Date(),
            updatedAt: Date()
        )
    ]
}
