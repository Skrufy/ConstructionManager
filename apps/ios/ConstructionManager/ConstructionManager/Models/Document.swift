//
//  Document.swift
//  ConstructionManager
//
//  Document data models for licenses, certs, and other files
//

import Foundation
import SwiftUI

// MARK: - Document Model
struct Document: Identifiable, Codable {
    let id: String
    let projectId: String?
    let userId: String?
    let name: String
    let description: String?
    let category: DocumentCategory?  // Optional for resilience
    let fileUrl: String?  // Optional - storagePath may be used
    let thumbnailUrl: String?
    let fileType: String?  // Optional for resilience
    let fileSize: Int64?  // Optional - not always provided
    let uploadedBy: String?  // Optional for resilience
    let uploadedAt: Date?  // Optional for resilience
    let expiresAt: Date?
    let tags: [String]?  // Optional for resilience
    let blasterAssignments: [BlasterAssignment]?

    // Additional API fields
    let storagePath: String?
    let createdAt: Date?
    let updatedAt: Date?

    // Safe accessor for file URL - prefer fileUrl, fallback to storagePath
    var safeFileUrl: String { fileUrl ?? storagePath ?? "" }

    // Safe accessor for category with default
    var safeCategory: DocumentCategory { category ?? .other }

    // Safe accessor for tags
    var safeTags: [String] { tags ?? [] }

    var fileSizeFormatted: String {
        guard let size = fileSize else { return "Unknown" }
        let bcf = ByteCountFormatter()
        bcf.allowedUnits = [.useMB, .useKB]
        bcf.countStyle = .file
        return bcf.string(fromByteCount: size)
    }

    var isExpired: Bool {
        guard let expiresAt = expiresAt else { return false }
        return expiresAt < Date()
    }

    var isExpiringSoon: Bool {
        guard let expiresAt = expiresAt else { return false }
        let thirtyDaysFromNow = Calendar.current.date(byAdding: .day, value: 30, to: Date())!
        return expiresAt < thirtyDaysFromNow && !isExpired
    }

    var expirationStatus: ExpirationStatus {
        if isExpired { return .expired }
        if isExpiringSoon { return .expiringSoon }
        return .valid
    }

    var assignedBlasterNames: String? {
        guard let assignments = blasterAssignments, !assignments.isEmpty else { return nil }
        return assignments.map { $0.blaster.name }.joined(separator: ", ")
    }

    enum ExpirationStatus {
        case valid, expiringSoon, expired

        var color: Color {
            switch self {
            case .valid: return AppColors.success
            case .expiringSoon: return AppColors.warning
            case .expired: return AppColors.error
            }
        }

        var label: String {
            switch self {
            case .valid: return "Valid"
            case .expiringSoon: return "Expiring Soon"
            case .expired: return "Expired"
            }
        }
    }
}

// MARK: - Blaster Assignment
struct BlasterAssignment: Codable {
    let id: String
    let blaster: BlasterInfo
}

struct BlasterInfo: Codable {
    let id: String
    let name: String
}

// MARK: - Document Category
enum DocumentCategory: String, Codable, CaseIterable {
    case license = "LICENSE"
    case certification = "CERTIFICATION"
    case insurance = "INSURANCE"
    case contract = "CONTRACT"
    case permit = "PERMIT"
    case report = "REPORT"
    case photo = "PHOTO"
    case blasting = "BLASTING"
    case other = "OTHER"

    // Custom decoder to handle case-insensitive values
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let rawValue = try container.decode(String.self).uppercased()
        self = DocumentCategory(rawValue: rawValue) ?? .other
    }

    var displayName: String {
        switch self {
        case .license: return "documents.category.license".localized
        case .certification: return "documents.category.certification".localized
        case .insurance: return "documents.category.insurance".localized
        case .contract: return "documents.category.contract".localized
        case .permit: return "documents.category.permit".localized
        case .report: return "documents.category.report".localized
        case .photo: return "documents.category.photo".localized
        case .blasting: return "Blasting"
        case .other: return "documents.category.other".localized
        }
    }

    var icon: String {
        switch self {
        case .license: return "person.text.rectangle"
        case .certification: return "checkmark.seal"
        case .insurance: return "shield.checkered"
        case .contract: return "doc.text"
        case .permit: return "doc.badge.plus"
        case .report: return "chart.bar.doc.horizontal"
        case .photo: return "photo"
        case .blasting: return "hammer.fill"
        case .other: return "doc"
        }
    }

    var color: Color {
        switch self {
        case .license: return AppColors.primary600
        case .certification: return AppColors.success
        case .insurance: return AppColors.info
        case .contract: return .purple
        case .permit: return AppColors.warning
        case .report: return .teal
        case .photo: return AppColors.orange
        case .blasting: return AppColors.orange
        case .other: return AppColors.gray500
        }
    }
}

// MARK: - Mock Data
extension Document {
    static let mockDocuments: [Document] = [
        Document(
            id: "1",
            projectId: "1",
            userId: nil,
            name: "General Contractor License",
            description: "State contractor license",
            category: .license,
            fileUrl: "docs/license.pdf",
            thumbnailUrl: nil,
            fileType: "pdf",
            fileSize: 250_000,
            uploadedBy: "1",
            uploadedAt: Date(),
            expiresAt: Calendar.current.date(byAdding: .month, value: 6, to: Date()),
            tags: ["license", "contractor"],
            blasterAssignments: nil,
            storagePath: nil,
            createdAt: Date(),
            updatedAt: Date()
        ),
        Document(
            id: "2",
            projectId: nil,
            userId: "3",
            name: "OSHA 30-Hour Certification",
            description: "Safety training certification",
            category: .certification,
            fileUrl: "docs/osha.pdf",
            thumbnailUrl: nil,
            fileType: "pdf",
            fileSize: 180_000,
            uploadedBy: "1",
            uploadedAt: Date(),
            expiresAt: Calendar.current.date(byAdding: .day, value: 15, to: Date()),
            tags: ["osha", "safety", "training"],
            blasterAssignments: nil,
            storagePath: nil,
            createdAt: Date(),
            updatedAt: Date()
        ),
        Document(
            id: "3",
            projectId: "1",
            userId: nil,
            name: "Liability Insurance Certificate",
            description: "General liability insurance",
            category: .insurance,
            fileUrl: "docs/insurance.pdf",
            thumbnailUrl: nil,
            fileType: "pdf",
            fileSize: 320_000,
            uploadedBy: "1",
            uploadedAt: Date(),
            expiresAt: Calendar.current.date(byAdding: .month, value: 2, to: Date()),
            tags: ["insurance", "liability"],
            blasterAssignments: nil,
            storagePath: nil,
            createdAt: Date(),
            updatedAt: Date()
        ),
        Document(
            id: "4",
            projectId: "1",
            userId: nil,
            name: "Building Permit",
            description: "City building permit for construction",
            category: .permit,
            fileUrl: "docs/permit.pdf",
            thumbnailUrl: nil,
            fileType: "pdf",
            fileSize: 450_000,
            uploadedBy: "1",
            uploadedAt: Date(),
            expiresAt: nil,
            tags: ["permit", "city"],
            blasterAssignments: nil,
            storagePath: nil,
            createdAt: Date(),
            updatedAt: Date()
        ),
        Document(
            id: "5",
            projectId: "1",
            userId: nil,
            name: "Subcontractor Agreement",
            description: "Agreement with electrical subcontractor",
            category: .contract,
            fileUrl: "docs/contract.pdf",
            thumbnailUrl: nil,
            fileType: "pdf",
            fileSize: 520_000,
            uploadedBy: "1",
            uploadedAt: Date(),
            expiresAt: nil,
            tags: ["contract", "electrical"],
            blasterAssignments: nil,
            storagePath: nil,
            createdAt: Date(),
            updatedAt: Date()
        )
    ]
}
