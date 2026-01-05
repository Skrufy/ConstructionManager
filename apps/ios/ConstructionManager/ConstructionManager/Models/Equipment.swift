//
//  Equipment.swift
//  ConstructionManager
//
//  Equipment data model
//

import Foundation
import SwiftUI

// MARK: - Equipment Model
struct Equipment: Identifiable, Codable {
    let id: String
    let name: String
    let type: String
    let samsaraId: String?
    let status: EquipmentStatus
    let currentLat: Double?
    let currentLng: Double?
    let lastUpdated: Date?
    let assignmentCount: Int
    let logCount: Int
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id, name, type, status
        case samsaraId = "samsara_id"
        case currentLat = "current_lat"
        case currentLng = "current_lng"
        case lastUpdated = "last_updated"
        case assignmentCount = "assignment_count"
        case logCount = "log_count"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    var hasLocation: Bool {
        currentLat != nil && currentLng != nil
    }

    var lastLocationUpdate: String? {
        guard let lastUpdated = lastUpdated else { return nil }
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: lastUpdated, relativeTo: Date())
    }
}

// MARK: - Equipment Status
enum EquipmentStatus: String, Codable, CaseIterable {
    case available = "AVAILABLE"
    case inUse = "IN_USE"
    case maintenance = "MAINTENANCE"
    case outOfService = "OUT_OF_SERVICE"

    var displayName: String {
        switch self {
        case .available: return "Available"
        case .inUse: return "In Use"
        case .maintenance: return "Maintenance"
        case .outOfService: return "Out of Service"
        }
    }

    var color: Color {
        switch self {
        case .available: return AppColors.success
        case .inUse: return AppColors.info
        case .maintenance: return AppColors.warning
        case .outOfService: return AppColors.error
        }
    }

    var icon: String {
        switch self {
        case .available: return "checkmark.circle.fill"
        case .inUse: return "gearshape.fill"
        case .maintenance: return "wrench.fill"
        case .outOfService: return "xmark.circle.fill"
        }
    }

    var badgeStatus: BadgeStatus {
        switch self {
        case .available: return .active
        case .inUse: return .info
        case .maintenance: return .warning
        case .outOfService: return .cancelled
        }
    }
}

// MARK: - Equipment Type
enum EquipmentType: String, CaseIterable {
    case excavator = "Excavator"
    case bulldozer = "Bulldozer"
    case crane = "Crane"
    case loader = "Loader"
    case backhoe = "Backhoe"
    case forklift = "Forklift"
    case compactor = "Compactor"
    case grader = "Grader"
    case truck = "Truck"
    case trailer = "Trailer"
    case generator = "Generator"
    case compressor = "Compressor"
    case scaffolding = "Scaffolding"
    case pump = "Pump"
    case mixer = "Mixer"
    case welder = "Welder"
    case other = "Other"

    var icon: String {
        switch self {
        case .excavator: return "arrow.up.left.and.arrow.down.right"
        case .bulldozer: return "rectangle.fill"
        case .crane: return "arrow.up.to.line"
        case .loader: return "arrow.uturn.down"
        case .backhoe: return "arrow.turn.right.down"
        case .forklift: return "arrow.up.forward"
        case .compactor: return "arrow.down.backward.and.arrow.up.forward"
        case .grader: return "rectangle.split.3x1"
        case .truck: return "truck.box.fill"
        case .trailer: return "truck.box.badge.clock.fill"
        case .generator: return "bolt.fill"
        case .compressor: return "wind"
        case .scaffolding: return "square.grid.3x3"
        case .pump: return "drop.fill"
        case .mixer: return "arrow.triangle.2.circlepath"
        case .welder: return "flame.fill"
        case .other: return "wrench.and.screwdriver.fill"
        }
    }

    var color: Color {
        switch self {
        case .excavator: return .orange
        case .bulldozer: return .yellow
        case .crane: return .red
        case .loader: return .orange
        case .backhoe: return .yellow
        case .forklift: return .green
        case .compactor: return .gray
        case .grader: return .brown
        case .truck: return .blue
        case .trailer: return .indigo
        case .generator: return .purple
        case .compressor: return .cyan
        case .scaffolding: return .mint
        case .pump: return .blue
        case .mixer: return .gray
        case .welder: return .red
        case .other: return AppColors.primary600
        }
    }
}

// MARK: - Equipment Assignment
struct EquipmentAssignment: Identifiable, Codable {
    let id: String
    let equipmentId: String
    let projectId: String
    let projectName: String?
    let startDate: Date
    let endDate: Date?
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case equipmentId = "equipment_id"
        case projectId = "project_id"
        case projectName = "project_name"
        case startDate = "start_date"
        case endDate = "end_date"
        case createdAt = "created_at"
    }

    var isActive: Bool {
        guard let endDate = endDate else { return true }
        return endDate >= Date()
    }
}

// MARK: - Equipment Log (Usage)
struct EquipmentLog: Identifiable, Codable {
    let id: String
    let equipmentId: String
    let date: Date
    let hoursUsed: Double?
    let fuelUsed: Double?
    let notes: String?
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, date, notes
        case equipmentId = "equipment_id"
        case hoursUsed = "hours_used"
        case fuelUsed = "fuel_used"
        case createdAt = "created_at"
    }
}

// MARK: - Service Log
struct ServiceLog: Identifiable, Codable {
    let id: String
    let equipmentId: String
    let serviceType: ServiceType
    let date: Date
    let meterReading: Double?
    let cost: Double?
    let partsUsed: String?
    let technician: String?
    let notes: String?
    let nextServiceDue: Date?
    let nextServiceHours: Double?
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case equipmentId = "equipment_id"
        case serviceType = "service_type"
        case date
        case meterReading = "meter_reading"
        case cost
        case partsUsed = "parts_used"
        case technician
        case notes
        case nextServiceDue = "next_service_due"
        case nextServiceHours = "next_service_hours"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

// MARK: - Service Type
enum ServiceType: String, Codable, CaseIterable {
    case oilChange = "OIL_CHANGE"
    case filterReplacement = "FILTER_REPLACEMENT"
    case inspection = "INSPECTION"
    case repair = "REPAIR"
    case tireTrackService = "TIRE_TRACK_SERVICE"
    case hydraulicService = "HYDRAULIC_SERVICE"
    case electricalService = "ELECTRICAL_SERVICE"
    case brakeService = "BRAKE_SERVICE"
    case engineService = "ENGINE_SERVICE"
    case transmissionService = "TRANSMISSION_SERVICE"
    case generalMaintenance = "GENERAL_MAINTENANCE"
    case other = "OTHER"

    var displayName: String {
        switch self {
        case .oilChange: return "Oil Change"
        case .filterReplacement: return "Filter Replacement"
        case .inspection: return "Inspection"
        case .repair: return "Repair"
        case .tireTrackService: return "Tire/Track Service"
        case .hydraulicService: return "Hydraulic Service"
        case .electricalService: return "Electrical Service"
        case .brakeService: return "Brake Service"
        case .engineService: return "Engine Service"
        case .transmissionService: return "Transmission Service"
        case .generalMaintenance: return "General Maintenance"
        case .other: return "Other"
        }
    }

    var icon: String {
        switch self {
        case .oilChange: return "drop.fill"
        case .filterReplacement: return "line.3.horizontal.decrease.circle.fill"
        case .inspection: return "checklist"
        case .repair: return "wrench.and.screwdriver.fill"
        case .tireTrackService: return "circle.dotted"
        case .hydraulicService: return "arrow.up.arrow.down"
        case .electricalService: return "bolt.fill"
        case .brakeService: return "exclamationmark.octagon.fill"
        case .engineService: return "engine.combustion.fill"
        case .transmissionService: return "gearshape.2.fill"
        case .generalMaintenance: return "wrench.fill"
        case .other: return "ellipsis.circle.fill"
        }
    }

    var color: Color {
        switch self {
        case .oilChange: return .brown
        case .filterReplacement: return .cyan
        case .inspection: return .green
        case .repair: return .red
        case .tireTrackService: return .gray
        case .hydraulicService: return .orange
        case .electricalService: return .yellow
        case .brakeService: return .red
        case .engineService: return .purple
        case .transmissionService: return .indigo
        case .generalMaintenance: return .blue
        case .other: return AppColors.primary600
        }
    }
}

// MARK: - Service Log Mock Data
extension ServiceLog {
    static let mockServiceLogs: [ServiceLog] = [
        ServiceLog(
            id: "sl-1",
            equipmentId: "1",
            serviceType: .oilChange,
            date: Calendar.current.date(byAdding: .day, value: -30, to: Date())!,
            meterReading: 1250,
            cost: 450.00,
            partsUsed: "15W-40 Oil (4 gal), Oil Filter",
            technician: "Mike Johnson",
            notes: "Regular 250-hour service",
            nextServiceDue: Calendar.current.date(byAdding: .day, value: 60, to: Date()),
            nextServiceHours: 1500,
            createdAt: Date(),
            updatedAt: Date()
        ),
        ServiceLog(
            id: "sl-2",
            equipmentId: "1",
            serviceType: .inspection,
            date: Calendar.current.date(byAdding: .day, value: -7, to: Date())!,
            meterReading: 1320,
            cost: 150.00,
            partsUsed: nil,
            technician: "Sarah Davis",
            notes: "Annual safety inspection - passed",
            nextServiceDue: Calendar.current.date(byAdding: .year, value: 1, to: Date()),
            nextServiceHours: nil,
            createdAt: Date(),
            updatedAt: Date()
        ),
        ServiceLog(
            id: "sl-3",
            equipmentId: "2",
            serviceType: .hydraulicService,
            date: Calendar.current.date(byAdding: .day, value: -14, to: Date())!,
            meterReading: 2100,
            cost: 1200.00,
            partsUsed: "Hydraulic fluid (10 gal), Hydraulic filter, O-rings",
            technician: "Mike Johnson",
            notes: "Replaced hydraulic lines showing wear",
            nextServiceDue: nil,
            nextServiceHours: 2600,
            createdAt: Date(),
            updatedAt: Date()
        )
    ]
}

// MARK: - Mock Data
extension Equipment {
    static let mockEquipment: [Equipment] = [
        Equipment(
            id: "1",
            name: "CAT 320 Excavator",
            type: "Excavator",
            samsaraId: "SAM-001",
            status: .available,
            currentLat: 34.0522,
            currentLng: -118.2437,
            lastUpdated: Date(),
            assignmentCount: 5,
            logCount: 42,
            createdAt: Date(),
            updatedAt: Date()
        ),
        Equipment(
            id: "2",
            name: "John Deere 850K Bulldozer",
            type: "Bulldozer",
            samsaraId: "SAM-002",
            status: .inUse,
            currentLat: 34.0505,
            currentLng: -118.2450,
            lastUpdated: Calendar.current.date(byAdding: .hour, value: -2, to: Date()),
            assignmentCount: 8,
            logCount: 67,
            createdAt: Date(),
            updatedAt: Date()
        ),
        Equipment(
            id: "3",
            name: "Liebherr LTM 1100",
            type: "Crane",
            samsaraId: nil,
            status: .maintenance,
            currentLat: nil,
            currentLng: nil,
            lastUpdated: nil,
            assignmentCount: 3,
            logCount: 28,
            createdAt: Date(),
            updatedAt: Date()
        ),
        Equipment(
            id: "4",
            name: "CAT 950M Loader",
            type: "Loader",
            samsaraId: "SAM-004",
            status: .available,
            currentLat: 34.0530,
            currentLng: -118.2420,
            lastUpdated: Calendar.current.date(byAdding: .minute, value: -30, to: Date()),
            assignmentCount: 6,
            logCount: 55,
            createdAt: Date(),
            updatedAt: Date()
        ),
        Equipment(
            id: "5",
            name: "Kenworth T880 Dump Truck",
            type: "Truck",
            samsaraId: "SAM-005",
            status: .outOfService,
            currentLat: 34.0490,
            currentLng: -118.2400,
            lastUpdated: Calendar.current.date(byAdding: .day, value: -3, to: Date()),
            assignmentCount: 12,
            logCount: 156,
            createdAt: Date(),
            updatedAt: Date()
        ),
        Equipment(
            id: "6",
            name: "Toyota 8FGU25 Forklift",
            type: "Forklift",
            samsaraId: nil,
            status: .inUse,
            currentLat: nil,
            currentLng: nil,
            lastUpdated: nil,
            assignmentCount: 4,
            logCount: 89,
            createdAt: Date(),
            updatedAt: Date()
        )
    ]
}
