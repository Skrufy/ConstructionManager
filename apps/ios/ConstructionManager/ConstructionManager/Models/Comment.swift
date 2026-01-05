//
//  Comment.swift
//  ConstructionManager
//
//  Comments system for various resources
//

import Foundation

// MARK: - Commentable Resource Type
enum CommentableResource: String, Codable, CaseIterable {
    case project = "PROJECT"
    case dailyLog = "DAILY_LOG"
    case document = "DOCUMENT"
    case drawing = "DRAWING"
    case incident = "INCIDENT"
    case inspection = "INSPECTION"
    case task = "TASK"
    case rfi = "RFI"
    case punchList = "PUNCH_LIST"
    case changeOrder = "CHANGE_ORDER"
    case invoice = "INVOICE"

    var displayName: String {
        switch self {
        case .project: return "Project"
        case .dailyLog: return "Daily Log"
        case .document: return "Document"
        case .drawing: return "Drawing"
        case .incident: return "Incident"
        case .inspection: return "Inspection"
        case .task: return "Task"
        case .rfi: return "RFI"
        case .punchList: return "Punch List"
        case .changeOrder: return "Change Order"
        case .invoice: return "Invoice"
        }
    }
}

// MARK: - Mention
struct Mention: Identifiable, Codable {
    let id: String
    let userId: String
    let userName: String
    let startIndex: Int
    let endIndex: Int
    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase
}

// MARK: - Comment Attachment
struct CommentAttachment: Identifiable, Codable {
    let id: String
    let fileName: String
    let fileUrl: String
    let fileType: String?
    let fileSize: Int?
    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase
}

// MARK: - Comment
struct Comment: Identifiable, Codable {
    let id: String
    let resourceType: CommentableResource
    let resourceId: String
    let parentId: String? // For threaded replies
    let userId: String
    let userName: String?
    let userAvatar: String?
    let content: String
    let mentions: [Mention]?
    let attachments: [CommentAttachment]?
    let isEdited: Bool
    let editedAt: Date?
    let replies: [Comment]?
    let replyCount: Int?
    let createdAt: Date
    let updatedAt: Date

    // Computed properties
    var isReply: Bool {
        parentId != nil
    }

    var formattedDate: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: createdAt, relativeTo: Date())
    }

    var hasAttachments: Bool {
        !(attachments?.isEmpty ?? true)
    }

    var hasMentions: Bool {
        !(mentions?.isEmpty ?? true)
    }

    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase

    // MARK: - Mock Data
    static let mockComments: [Comment] = [
        Comment(
            id: "comment-1",
            resourceType: .dailyLog,
            resourceId: "log-1",
            parentId: nil,
            userId: "user-1",
            userName: "John Smith",
            userAvatar: nil,
            content: "Great progress on the framing today! @Mike can you confirm the beam sizes match the updated drawings?",
            mentions: [
                Mention(id: "m-1", userId: "user-2", userName: "Mike Johnson", startIndex: 45, endIndex: 50)
            ],
            attachments: nil,
            isEdited: false,
            editedAt: nil,
            replies: [
                Comment(
                    id: "comment-2",
                    resourceType: .dailyLog,
                    resourceId: "log-1",
                    parentId: "comment-1",
                    userId: "user-2",
                    userName: "Mike Johnson",
                    userAvatar: nil,
                    content: "Yes, confirmed! All beam sizes match drawing S-201 rev 3.",
                    mentions: nil,
                    attachments: nil,
                    isEdited: false,
                    editedAt: nil,
                    replies: nil,
                    replyCount: nil,
                    createdAt: Calendar.current.date(byAdding: .hour, value: -1, to: Date())!,
                    updatedAt: Calendar.current.date(byAdding: .hour, value: -1, to: Date())!
                )
            ],
            replyCount: 1,
            createdAt: Calendar.current.date(byAdding: .hour, value: -3, to: Date())!,
            updatedAt: Calendar.current.date(byAdding: .hour, value: -3, to: Date())!
        ),
        Comment(
            id: "comment-3",
            resourceType: .dailyLog,
            resourceId: "log-1",
            parentId: nil,
            userId: "user-3",
            userName: "Sarah Wilson",
            userAvatar: nil,
            content: "Weather looks good for concrete pour tomorrow. I've coordinated with the ready-mix supplier.",
            mentions: nil,
            attachments: nil,
            isEdited: true,
            editedAt: Calendar.current.date(byAdding: .minute, value: -30, to: Date()),
            replies: nil,
            replyCount: 0,
            createdAt: Calendar.current.date(byAdding: .hour, value: -2, to: Date())!,
            updatedAt: Calendar.current.date(byAdding: .minute, value: -30, to: Date())!
        )
    ]
}

// MARK: - Comment Thread
struct CommentThread: Identifiable {
    let id: String
    let resourceType: CommentableResource
    let resourceId: String
    let comments: [Comment]
    let totalCount: Int

    var hasComments: Bool {
        !comments.isEmpty
    }
}
