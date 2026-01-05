//
//  Project.swift
//  ConstructionManager
//
//  Project data model
//

import Foundation
import SwiftUI

struct Project: Identifiable, Codable {
    let id: String
    let name: String
    let number: String?
    let address: String
    let city: String
    let state: String
    let zipCode: String
    let status: ProjectStatus
    let type: ProjectType
    let gpsLatitude: Double?
    let gpsLongitude: Double?
    let startDate: Date?
    let estimatedEndDate: Date?
    let actualEndDate: Date?
    let clientId: String?
    let client: ClientSummary?
    let projectManagerId: String?
    let superintendentId: String?
    let budget: Double?
    let description: String?
    let imageUrl: String?
    let createdAt: Date
    let updatedAt: Date

    // Stats from API
    var dailyLogCount: Int
    var hoursTracked: Double
    var documentCount: Int
    var drawingCount: Int
    var crewCount: Int

    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase

    // Computed property for backwards compatibility
    var clientName: String? {
        return client?.companyName
    }

    // Default initializer for when stats aren't available
    init(id: String, name: String, number: String?, address: String, city: String, state: String, zipCode: String, status: ProjectStatus, type: ProjectType, gpsLatitude: Double?, gpsLongitude: Double?, startDate: Date?, estimatedEndDate: Date?, actualEndDate: Date?, clientId: String?, client: ClientSummary?, projectManagerId: String?, superintendentId: String?, budget: Double?, description: String?, imageUrl: String?, createdAt: Date, updatedAt: Date, dailyLogCount: Int = 0, hoursTracked: Double = 0, documentCount: Int = 0, drawingCount: Int = 0, crewCount: Int = 0) {
        self.id = id
        self.name = name
        self.number = number
        self.address = address
        self.city = city
        self.state = state
        self.zipCode = zipCode
        self.status = status
        self.type = type
        self.gpsLatitude = gpsLatitude
        self.gpsLongitude = gpsLongitude
        self.startDate = startDate
        self.estimatedEndDate = estimatedEndDate
        self.actualEndDate = actualEndDate
        self.clientId = clientId
        self.client = client
        self.projectManagerId = projectManagerId
        self.superintendentId = superintendentId
        self.budget = budget
        self.description = description
        self.imageUrl = imageUrl
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.dailyLogCount = dailyLogCount
        self.hoursTracked = hoursTracked
        self.documentCount = documentCount
        self.drawingCount = drawingCount
        self.crewCount = crewCount
    }

    var fullAddress: String {
        "\(address), \(city), \(state) \(zipCode)"
    }

    var progressPercentage: Double {
        guard let start = startDate, let end = estimatedEndDate else { return 0 }
        let total = end.timeIntervalSince(start)
        let elapsed = Date().timeIntervalSince(start)
        return min(max(elapsed / total * 100, 0), 100)
    }

    enum ProjectStatus: String, Codable, CaseIterable {
        case active = "ACTIVE"
        case onHold = "ON_HOLD"
        case completed = "COMPLETED"
        case archived = "ARCHIVED"

        var displayName: String {
            switch self {
            case .active: return "status.active".localized
            case .onHold: return "status.onHold".localized
            case .completed: return "status.completed".localized
            case .archived: return "status.archived".localized
            }
        }

        var color: Color {
            switch self {
            case .active: return AppColors.success
            case .onHold: return AppColors.warning
            case .completed: return AppColors.info
            case .archived: return AppColors.gray500
            }
        }

        var badgeStatus: BadgeStatus {
            switch self {
            case .active: return .active
            case .onHold: return .pending
            case .completed: return .completed
            case .archived: return .cancelled
            }
        }
    }

    enum ProjectType: String, Codable, CaseIterable {
        case commercial = "Commercial"
        case residential = "Residential"
        case industrial = "Industrial"
        case infrastructure = "Infrastructure"
        case renovation = "Renovation"
        case mixedUse = "Mixed Use"

        var icon: String {
            switch self {
            case .commercial: return "building.2"
            case .residential: return "house"
            case .industrial: return "gear"
            case .infrastructure: return "road.lanes"
            case .renovation: return "hammer"
            case .mixedUse: return "building"
            }
        }

        var color: Color {
            switch self {
            case .commercial: return AppColors.primary600
            case .residential: return AppColors.success
            case .industrial: return AppColors.orange
            case .infrastructure: return .purple
            case .renovation: return .teal
            case .mixedUse: return AppColors.info
            }
        }
    }
}

// MARK: - Mock Data for Development
extension Project {
    static let mockProjects: [Project] = [
        Project(
            id: "1",
            name: "Downtown Office Complex",
            number: "PRJ-2024-001",
            address: "123 Main Street",
            city: "Los Angeles",
            state: "CA",
            zipCode: "90012",
            status: .active,
            type: .commercial,
            gpsLatitude: 34.0522,
            gpsLongitude: -118.2437,
            startDate: Calendar.current.date(byAdding: .month, value: -3, to: Date()),
            estimatedEndDate: Calendar.current.date(byAdding: .month, value: 9, to: Date()),
            actualEndDate: nil,
            clientId: "1",
            client: ClientSummary(id: "1", companyName: "Metro Development Corp", contactName: "John Smith"),
            projectManagerId: "2",
            superintendentId: "3",
            budget: 15_500_000,
            description: "12-story Class A office building with underground parking",
            imageUrl: nil,
            createdAt: Date(),
            updatedAt: Date(),
            dailyLogCount: 8,
            hoursTracked: 284,
            documentCount: 12,
            drawingCount: 6,
            crewCount: 18
        ),
        Project(
            id: "2",
            name: "Riverside Apartments",
            number: "PRJ-2024-002",
            address: "456 River Road",
            city: "Los Angeles",
            state: "CA",
            zipCode: "90039",
            status: .active,
            type: .residential,
            gpsLatitude: 34.0195,
            gpsLongitude: -118.4912,
            startDate: Calendar.current.date(byAdding: .month, value: -1, to: Date()),
            estimatedEndDate: Calendar.current.date(byAdding: .month, value: 14, to: Date()),
            actualEndDate: nil,
            clientId: "2",
            client: ClientSummary(id: "2", companyName: "Riverside Living LLC", contactName: "Sarah Chen"),
            projectManagerId: "2",
            superintendentId: "3",
            budget: 8_200_000,
            description: "48-unit luxury apartment complex with rooftop amenities",
            imageUrl: nil,
            createdAt: Date(),
            updatedAt: Date(),
            dailyLogCount: 3,
            hoursTracked: 64,
            documentCount: 8,
            drawingCount: 4,
            crewCount: 12
        ),
        Project(
            id: "3",
            name: "Tech Campus Phase 2",
            number: "PRJ-2024-003",
            address: "789 Innovation Drive",
            city: "San Jose",
            state: "CA",
            zipCode: "95110",
            status: .onHold,
            type: .commercial,
            gpsLatitude: 37.3382,
            gpsLongitude: -121.8863,
            startDate: nil,
            estimatedEndDate: nil,
            actualEndDate: nil,
            clientId: "3",
            client: ClientSummary(id: "3", companyName: "TechVentures Inc", contactName: "David Kim"),
            projectManagerId: "2",
            superintendentId: nil,
            budget: 42_000_000,
            description: "Multi-building tech campus expansion with R&D facilities",
            imageUrl: nil,
            createdAt: Date(),
            updatedAt: Date(),
            dailyLogCount: 0,
            hoursTracked: 0,
            documentCount: 4,
            drawingCount: 2,
            crewCount: 0
        ),
        Project(
            id: "4",
            name: "Harbor Industrial Park",
            number: "PRJ-2023-012",
            address: "100 Harbor Way",
            city: "Long Beach",
            state: "CA",
            zipCode: "90802",
            status: .completed,
            type: .industrial,
            gpsLatitude: 33.7701,
            gpsLongitude: -118.1937,
            startDate: Calendar.current.date(byAdding: .year, value: -1, to: Date()),
            estimatedEndDate: Calendar.current.date(byAdding: .month, value: -1, to: Date()),
            actualEndDate: Calendar.current.date(byAdding: .month, value: -1, to: Date()),
            clientId: "4",
            client: ClientSummary(id: "4", companyName: "Harbor Logistics Group", contactName: "Michael Torres"),
            projectManagerId: "2",
            superintendentId: "3",
            budget: 22_000_000,
            description: "Distribution center and warehouse facility",
            imageUrl: nil,
            createdAt: Date(),
            updatedAt: Date(),
            dailyLogCount: 15,
            hoursTracked: 842,
            documentCount: 18,
            drawingCount: 8,
            crewCount: 24
        )
    ]
}
