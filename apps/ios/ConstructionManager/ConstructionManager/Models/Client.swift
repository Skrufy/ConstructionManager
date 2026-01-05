//
//  Client.swift
//  ConstructionManager
//
//  Client data model for managing project clients
//

import Foundation
import SwiftUI

// MARK: - Client Model
struct Client: Identifiable, Codable {
    let id: String
    let companyName: String
    let contactName: String?
    let email: String?
    let phone: String?
    let address: String?
    let city: String?
    let state: String?
    let zip: String?
    let status: ClientStatus
    let notes: String?
    let website: String?
    let industry: String?
    let projectCount: Int
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

    var displayIndustry: String? {
        guard let industry = industry else { return nil }
        return ClientIndustry(rawValue: industry)?.displayName ?? industry
    }
}

// MARK: - Client Summary (for embedding in Project)
struct ClientSummary: Codable {
    let id: String
    let companyName: String
    let contactName: String?
}

// MARK: - Client Status
enum ClientStatus: String, Codable, CaseIterable {
    case active = "ACTIVE"
    case inactive = "INACTIVE"

    var displayName: String {
        switch self {
        case .active: return "Active"
        case .inactive: return "Inactive"
        }
    }

    var color: Color {
        switch self {
        case .active: return AppColors.success
        case .inactive: return AppColors.gray500
        }
    }

    var badgeStatus: BadgeStatus {
        switch self {
        case .active: return .active
        case .inactive: return .completed
        }
    }
}

// MARK: - Client Industry
enum ClientIndustry: String, CaseIterable {
    case commercial = "COMMERCIAL"
    case residential = "RESIDENTIAL"
    case industrial = "INDUSTRIAL"
    case government = "GOVERNMENT"
    case healthcare = "HEALTHCARE"
    case education = "EDUCATION"

    var displayName: String {
        switch self {
        case .commercial: return "Commercial"
        case .residential: return "Residential"
        case .industrial: return "Industrial"
        case .government: return "Government"
        case .healthcare: return "Healthcare"
        case .education: return "Education"
        }
    }

    var icon: String {
        switch self {
        case .commercial: return "building.2.fill"
        case .residential: return "house.fill"
        case .industrial: return "hammer.fill"
        case .government: return "building.columns.fill"
        case .healthcare: return "cross.case.fill"
        case .education: return "graduationcap.fill"
        }
    }

    var color: Color {
        switch self {
        case .commercial: return AppColors.primary600
        case .residential: return AppColors.success
        case .industrial: return AppColors.orange
        case .government: return AppColors.info
        case .healthcare: return AppColors.error
        case .education: return AppColors.purple
        }
    }
}

// MARK: - Mock Data
extension Client {
    static let mockClients: [Client] = [
        Client(
            id: "1",
            companyName: "Skyline Development Corp.",
            contactName: "Sarah Mitchell",
            email: "sarah@skylinedev.com",
            phone: "(555) 100-2000",
            address: "100 Corporate Plaza",
            city: "Los Angeles",
            state: "CA",
            zip: "90017",
            status: .active,
            notes: "Primary developer for downtown projects",
            website: "https://skylinedev.com",
            industry: "COMMERCIAL",
            projectCount: 5,
            createdAt: Date(),
            updatedAt: Date()
        ),
        Client(
            id: "2",
            companyName: "Harbor View Estates",
            contactName: "Michael Chen",
            email: "mchen@harborview.com",
            phone: "(555) 200-3000",
            address: "500 Marina Way",
            city: "San Diego",
            state: "CA",
            zip: "92101",
            status: .active,
            notes: "Luxury residential developer",
            website: "https://harborviewestates.com",
            industry: "RESIDENTIAL",
            projectCount: 3,
            createdAt: Date(),
            updatedAt: Date()
        ),
        Client(
            id: "3",
            companyName: "Pacific Industrial Partners",
            contactName: "Robert Kim",
            email: "rkim@pacificindustrial.com",
            phone: "(555) 300-4000",
            address: "2000 Industrial Blvd",
            city: "Long Beach",
            state: "CA",
            zip: "90802",
            status: .active,
            notes: "Warehouse and distribution center specialist",
            website: nil,
            industry: "INDUSTRIAL",
            projectCount: 8,
            createdAt: Date(),
            updatedAt: Date()
        ),
        Client(
            id: "4",
            companyName: "City of Riverside",
            contactName: "Jennifer Torres",
            email: "jtorres@riversideca.gov",
            phone: "(555) 400-5000",
            address: "3900 Main Street",
            city: "Riverside",
            state: "CA",
            zip: "92501",
            status: .inactive,
            notes: "Municipal projects - schools and public facilities",
            website: "https://riversideca.gov",
            industry: "GOVERNMENT",
            projectCount: 2,
            createdAt: Date(),
            updatedAt: Date()
        )
    ]
}
