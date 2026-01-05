//
//  Subcontractor.swift
//  ConstructionManager
//
//  Subcontractor data model
//

import Foundation
import SwiftUI

// MARK: - Subcontractor Model
struct Subcontractor: Identifiable, Codable {
    let id: String
    let companyName: String
    let contactName: String?
    let email: String?
    let phone: String?
    let address: String?
    let city: String?
    let state: String?
    let zip: String?
    let trades: [String]
    let licenseNumber: String?
    let insuranceExpiry: Date?
    let rating: Double?
    let status: SubcontractorStatus
    let notes: String?
    let projectCount: Int
    let certificationCount: Int
    let expiringCertifications: [ExpiringCertification]
    let createdAt: Date
    let updatedAt: Date

    var fullAddress: String? {
        var parts: [String] = []
        if let address = address { parts.append(address) }
        if let city = city { parts.append(city) }
        if let state = state, let zip = zip {
            parts.append("\(state) \(zip)")
        } else if let state = state {
            parts.append(state)
        } else if let zip = zip {
            parts.append(zip)
        }
        return parts.isEmpty ? nil : parts.joined(separator: ", ")
    }

    var hasExpiringCertifications: Bool {
        !expiringCertifications.isEmpty
    }

    var isInsuranceExpiringSoon: Bool {
        guard let expiry = insuranceExpiry else { return false }
        let thirtyDaysFromNow = Calendar.current.date(byAdding: .day, value: 30, to: Date()) ?? Date()
        return expiry <= thirtyDaysFromNow && expiry >= Date()
    }

    var isInsuranceExpired: Bool {
        guard let expiry = insuranceExpiry else { return false }
        return expiry < Date()
    }
}

// MARK: - Expiring Certification
struct ExpiringCertification: Identifiable, Codable {
    let id: String
    let certName: String
    let expiryDate: Date
    let status: String
}

// MARK: - Subcontractor Status
enum SubcontractorStatus: String, Codable, CaseIterable {
    case active = "ACTIVE"
    case inactive = "INACTIVE"
    case pending = "PENDING"
    case suspended = "SUSPENDED"

    var displayName: String {
        switch self {
        case .active: return "Active"
        case .inactive: return "Inactive"
        case .pending: return "Pending"
        case .suspended: return "Suspended"
        }
    }

    var color: Color {
        switch self {
        case .active: return AppColors.success
        case .inactive: return AppColors.gray500
        case .pending: return AppColors.warning
        case .suspended: return AppColors.error
        }
    }

    var badgeStatus: BadgeStatus {
        switch self {
        case .active: return .active
        case .inactive: return .completed
        case .pending: return .pending
        case .suspended: return .warning
        }
    }
}

// MARK: - Trade Types
enum Trade: String, CaseIterable {
    case electrical = "Electrical"
    case plumbing = "Plumbing"
    case hvac = "HVAC"
    case framing = "Framing"
    case drywall = "Drywall"
    case roofing = "Roofing"
    case painting = "Painting"
    case flooring = "Flooring"
    case concrete = "Concrete"
    case masonry = "Masonry"
    case landscaping = "Landscaping"
    case demolition = "Demolition"
    case excavation = "Excavation"
    case steel = "Steel/Iron Work"
    case glazing = "Glazing/Glass"
    case insulation = "Insulation"
    case fire = "Fire Protection"
    case security = "Security Systems"
    case general = "General"

    var icon: String {
        switch self {
        case .electrical: return "bolt.fill"
        case .plumbing: return "drop.fill"
        case .hvac: return "fan.fill"
        case .framing: return "square.grid.3x3"
        case .drywall: return "rectangle.split.3x1"
        case .roofing: return "house.fill"
        case .painting: return "paintbrush.fill"
        case .flooring: return "square.fill"
        case .concrete: return "square.split.diagonal"
        case .masonry: return "rectangle.stack.fill"
        case .landscaping: return "leaf.fill"
        case .demolition: return "hammer.fill"
        case .excavation: return "arrow.down.right.and.arrow.up.left"
        case .steel: return "wrench.and.screwdriver.fill"
        case .glazing: return "window.ceiling"
        case .insulation: return "thermometer"
        case .fire: return "flame.fill"
        case .security: return "lock.fill"
        case .general: return "wrench.fill"
        }
    }

    var color: Color {
        switch self {
        case .electrical: return .yellow
        case .plumbing: return .blue
        case .hvac: return .cyan
        case .framing: return .brown
        case .drywall: return .gray
        case .roofing: return .red
        case .painting: return .purple
        case .flooring: return .orange
        case .concrete: return Color(red: 0.5, green: 0.5, blue: 0.5)
        case .masonry: return .brown
        case .landscaping: return .green
        case .demolition: return .orange
        case .excavation: return Color(red: 0.6, green: 0.4, blue: 0.2)
        case .steel: return Color(red: 0.3, green: 0.3, blue: 0.4)
        case .glazing: return .teal
        case .insulation: return .pink
        case .fire: return .red
        case .security: return .blue
        case .general: return AppColors.primary600
        }
    }
}

// MARK: - Mock Data
extension Subcontractor {
    static let mockSubcontractors: [Subcontractor] = [
        Subcontractor(
            id: "1",
            companyName: "ABC Electric Co.",
            contactName: "John Smith",
            email: "john@abcelectric.com",
            phone: "(555) 123-4567",
            address: "123 Main St",
            city: "Los Angeles",
            state: "CA",
            zip: "90001",
            trades: ["Electrical"],
            licenseNumber: "C-10 #123456",
            insuranceExpiry: Calendar.current.date(byAdding: .month, value: 6, to: Date()),
            rating: 4.8,
            status: .active,
            notes: "Preferred vendor for commercial electrical work",
            projectCount: 12,
            certificationCount: 5,
            expiringCertifications: [],
            createdAt: Date(),
            updatedAt: Date()
        ),
        Subcontractor(
            id: "2",
            companyName: "Premier Plumbing",
            contactName: "Maria Garcia",
            email: "maria@premierplumbing.com",
            phone: "(555) 234-5678",
            address: "456 Oak Ave",
            city: "San Diego",
            state: "CA",
            zip: "92101",
            trades: ["Plumbing", "HVAC"],
            licenseNumber: "C-36 #789012",
            insuranceExpiry: Calendar.current.date(byAdding: .day, value: 20, to: Date()),
            rating: 4.5,
            status: .active,
            notes: nil,
            projectCount: 8,
            certificationCount: 3,
            expiringCertifications: [
                ExpiringCertification(id: "c1", certName: "Backflow Prevention", expiryDate: Calendar.current.date(byAdding: .day, value: 15, to: Date())!, status: "EXPIRING_SOON")
            ],
            createdAt: Date(),
            updatedAt: Date()
        ),
        Subcontractor(
            id: "3",
            companyName: "Quality Framing Inc.",
            contactName: "Robert Johnson",
            email: "rob@qualityframing.com",
            phone: "(555) 345-6789",
            address: "789 Pine St",
            city: "Riverside",
            state: "CA",
            zip: "92501",
            trades: ["Framing", "Drywall"],
            licenseNumber: "B #345678",
            insuranceExpiry: Calendar.current.date(byAdding: .month, value: 3, to: Date()),
            rating: 4.2,
            status: .active,
            notes: "Good crew, reliable schedule",
            projectCount: 15,
            certificationCount: 2,
            expiringCertifications: [],
            createdAt: Date(),
            updatedAt: Date()
        ),
        Subcontractor(
            id: "4",
            companyName: "Sunset Roofing",
            contactName: "David Lee",
            email: "david@sunsetroofing.com",
            phone: "(555) 456-7890",
            address: "321 Elm St",
            city: "Irvine",
            state: "CA",
            zip: "92602",
            trades: ["Roofing"],
            licenseNumber: "C-39 #901234",
            insuranceExpiry: Calendar.current.date(byAdding: .day, value: -10, to: Date()),
            rating: 3.8,
            status: .suspended,
            notes: "Insurance expired - pending renewal",
            projectCount: 5,
            certificationCount: 4,
            expiringCertifications: [],
            createdAt: Date(),
            updatedAt: Date()
        )
    ]
}
