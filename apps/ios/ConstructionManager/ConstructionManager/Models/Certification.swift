//
//  Certification.swift
//  ConstructionManager
//
//  Certification and license tracking for employees and subcontractors
//

import Foundation

// MARK: - Certification Type
enum CertificationType: String, Codable, CaseIterable {
    case license = "LICENSE"
    case certification = "CERTIFICATION"
    case training = "TRAINING"
    case osha = "OSHA"
    case safetyEquipment = "SAFETY_EQUIPMENT"
    case other = "OTHER"

    var displayName: String {
        switch self {
        case .license: return "License"
        case .certification: return "Certification"
        case .training: return "Training"
        case .osha: return "OSHA"
        case .safetyEquipment: return "Safety Equipment"
        case .other: return "Other"
        }
    }

    var icon: String {
        switch self {
        case .license: return "creditcard.fill"
        case .certification: return "checkmark.seal.fill"
        case .training: return "book.fill"
        case .osha: return "shield.checkered"
        case .safetyEquipment: return "helmet.fill"
        case .other: return "doc.fill"
        }
    }
}

// MARK: - Certification Status
enum CertificationStatus: String, Codable, CaseIterable {
    case valid = "VALID"
    case expired = "EXPIRED"
    case expiringSoon = "EXPIRING_SOON"
    case pendingRenewal = "PENDING_RENEWAL"

    var displayName: String {
        switch self {
        case .valid: return "Valid"
        case .expired: return "Expired"
        case .expiringSoon: return "Expiring Soon"
        case .pendingRenewal: return "Pending Renewal"
        }
    }

    var color: String {
        switch self {
        case .valid: return "success"
        case .expired: return "error"
        case .expiringSoon: return "warning"
        case .pendingRenewal: return "info"
        }
    }
}

// MARK: - Certification Model
struct Certification: Identifiable, Codable {
    let id: String
    let userId: String?
    let subcontractorId: String?
    let type: CertificationType
    let name: String
    let issuingAuthority: String?
    let certificationNumber: String?
    let issueDate: Date?
    let expirationDate: Date?
    let documentUrl: String?
    let notes: String?
    let createdAt: Date
    let updatedAt: Date

    // Computed properties
    var status: CertificationStatus {
        guard let expDate = expirationDate else { return .valid }
        let now = Date()
        if expDate < now {
            return .expired
        }
        let thirtyDaysFromNow = Calendar.current.date(byAdding: .day, value: 30, to: now)!
        if expDate < thirtyDaysFromNow {
            return .expiringSoon
        }
        return .valid
    }

    var daysUntilExpiration: Int? {
        guard let expDate = expirationDate else { return nil }
        return Calendar.current.dateComponents([.day], from: Date(), to: expDate).day
    }

    var isExpired: Bool {
        status == .expired
    }

    var holderName: String? {
        // Would be populated from API join
        nil
    }

    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase

    // MARK: - Mock Data
    static let mockCertifications: [Certification] = [
        Certification(
            id: "cert-1",
            userId: "user-1",
            subcontractorId: nil,
            type: .osha,
            name: "OSHA 30-Hour Construction",
            issuingAuthority: "OSHA",
            certificationNumber: "OSHA-2024-001",
            issueDate: Calendar.current.date(byAdding: .year, value: -1, to: Date()),
            expirationDate: Calendar.current.date(byAdding: .year, value: 4, to: Date()),
            documentUrl: nil,
            notes: nil,
            createdAt: Date(),
            updatedAt: Date()
        ),
        Certification(
            id: "cert-2",
            userId: "user-2",
            subcontractorId: nil,
            type: .license,
            name: "General Contractor License",
            issuingAuthority: "State Licensing Board",
            certificationNumber: "GC-12345",
            issueDate: Calendar.current.date(byAdding: .month, value: -6, to: Date()),
            expirationDate: Calendar.current.date(byAdding: .day, value: 15, to: Date()),
            documentUrl: nil,
            notes: "Renewal submitted",
            createdAt: Date(),
            updatedAt: Date()
        ),
        Certification(
            id: "cert-3",
            userId: nil,
            subcontractorId: "sub-1",
            type: .certification,
            name: "Electrical Contractor Certification",
            issuingAuthority: "National Electrical Contractors Association",
            certificationNumber: "NECA-2024-789",
            issueDate: Calendar.current.date(byAdding: .year, value: -2, to: Date()),
            expirationDate: Calendar.current.date(byAdding: .day, value: -10, to: Date()),
            documentUrl: nil,
            notes: nil,
            createdAt: Date(),
            updatedAt: Date()
        )
    ]
}
