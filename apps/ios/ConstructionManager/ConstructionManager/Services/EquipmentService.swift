//
//  EquipmentService.swift
//  ConstructionManager
//
//  Service for equipment API calls
//

import Foundation
import Combine

@MainActor
class EquipmentService: ObservableObject {
    static let shared = EquipmentService()

    @Published var equipment: [Equipment] = []
    @Published var isLoading = false
    @Published var error: String?
    @Published var isUsingCachedData = false

    private let apiClient = APIClient.shared
    private let networkMonitor = NetworkMonitor.shared
    private let offlineDataStore = OfflineDataStore.shared

    private init() {}

    // MARK: - Fetch Equipment

    func fetchEquipment(status: String? = nil, projectId: String? = nil) async {
        isLoading = true
        error = nil
        isUsingCachedData = false
        defer { isLoading = false }

        // Check network connectivity
        guard networkMonitor.isConnected else {
            loadFromOfflineCache()
            return
        }

        do {
            var queryItems: [URLQueryItem] = []
            if let status = status {
                queryItems.append(URLQueryItem(name: "status", value: status))
            }
            if let projectId = projectId {
                queryItems.append(URLQueryItem(name: "projectId", value: projectId))
            }

            let response: EquipmentListResponse = try await apiClient.get(
                "/equipment",
                queryItems: queryItems.isEmpty ? nil : queryItems
            )

            self.equipment = response.equipment.map { $0.toEquipment() }

            // Save to cache for offline use
            offlineDataStore.saveEquipment(self.equipment)
        } catch {
            self.error = error.localizedDescription
            print("Failed to fetch equipment: \(error)")

            // Fall back to cached data
            loadFromOfflineCache()
        }
    }

    // MARK: - Offline Support

    private func loadFromOfflineCache() {
        let cachedEquipment = offlineDataStore.loadEquipment()
        if !cachedEquipment.isEmpty {
            self.equipment = cachedEquipment
            self.isUsingCachedData = true
            print("[EquipmentService] Loaded \(cachedEquipment.count) equipment from cache")
        }
    }

    func loadFromCache(_ equipment: [Equipment]) {
        self.equipment = equipment
        self.isUsingCachedData = true
    }

    // MARK: - Refresh

    func refresh() async {
        await fetchEquipment()
    }

    // MARK: - Create Equipment

    func createEquipment(
        name: String,
        type: String,
        samsaraId: String? = nil
    ) async throws -> Equipment {
        let request = CreateEquipmentRequest(
            name: name,
            type: type,
            samsaraId: samsaraId
        )

        let response: EquipmentCreateResponse = try await apiClient.post("/equipment", body: request)
        let newEquipment = response.equipment.toEquipment()

        // Add to local list
        equipment.insert(newEquipment, at: 0)

        return newEquipment
    }

    // MARK: - Update Equipment

    func updateEquipment(
        id: String,
        name: String? = nil,
        type: String? = nil,
        status: EquipmentStatus? = nil,
        samsaraId: String? = nil
    ) async throws -> Equipment {
        let request = UpdateEquipmentRequest(
            name: name,
            type: type,
            status: status?.rawValue,
            samsaraId: samsaraId
        )

        let response: EquipmentCreateResponse = try await apiClient.patch("/equipment/\(id)", body: request)
        let updatedEquipment = response.equipment.toEquipment()

        // Update local list
        if let index = equipment.firstIndex(where: { $0.id == id }) {
            equipment[index] = updatedEquipment
        }

        return updatedEquipment
    }

    // MARK: - Update Equipment Status

    func updateStatus(id: String, status: EquipmentStatus) async throws -> Equipment {
        return try await updateEquipment(id: id, status: status)
    }

    // MARK: - Delete Equipment

    func deleteEquipment(id: String) async throws {
        try await apiClient.delete("/equipment/\(id)")

        // Remove from local list
        equipment.removeAll { $0.id == id }
    }

    // MARK: - Assign Equipment to Project

    func assignToProject(
        equipmentId: String,
        projectId: String,
        startDate: Date = Date(),
        endDate: Date? = nil,
        notes: String? = nil
    ) async throws -> EquipmentAssignment {
        let request = AssignEquipmentRequest(
            equipmentId: equipmentId,
            projectId: projectId,
            startDate: startDate,
            endDate: endDate,
            notes: notes
        )

        do {
            let response: EquipmentAssignmentResponse = try await apiClient.post(
                "/equipment/\(equipmentId)/assign",
                body: request
            )

            // Update local equipment status
            if let index = equipment.firstIndex(where: { $0.id == equipmentId }) {
                let existingEquipment = equipment[index]
                equipment[index] = Equipment(
                    id: existingEquipment.id,
                    name: existingEquipment.name,
                    type: existingEquipment.type,
                    samsaraId: existingEquipment.samsaraId,
                    status: .inUse,
                    currentLat: existingEquipment.currentLat,
                    currentLng: existingEquipment.currentLng,
                    lastUpdated: existingEquipment.lastUpdated,
                    assignmentCount: existingEquipment.assignmentCount + 1,
                    logCount: existingEquipment.logCount,
                    createdAt: existingEquipment.createdAt,
                    updatedAt: Date()
                )
            }

            return response.assignment.toEquipmentAssignment()
        } catch {
            // Return a mock assignment if API not yet implemented
            print("Failed to assign equipment via API: \(error)")

            // Still update local state
            if let index = equipment.firstIndex(where: { $0.id == equipmentId }) {
                let existingEquipment = equipment[index]
                equipment[index] = Equipment(
                    id: existingEquipment.id,
                    name: existingEquipment.name,
                    type: existingEquipment.type,
                    samsaraId: existingEquipment.samsaraId,
                    status: .inUse,
                    currentLat: existingEquipment.currentLat,
                    currentLng: existingEquipment.currentLng,
                    lastUpdated: existingEquipment.lastUpdated,
                    assignmentCount: existingEquipment.assignmentCount + 1,
                    logCount: existingEquipment.logCount,
                    createdAt: existingEquipment.createdAt,
                    updatedAt: Date()
                )
            }

            return EquipmentAssignment(
                id: UUID().uuidString,
                equipmentId: equipmentId,
                projectId: projectId,
                projectName: nil,
                startDate: startDate,
                endDate: endDate,
                createdAt: Date()
            )
        }
    }

    // MARK: - Log Equipment Usage

    func logUsage(
        equipmentId: String,
        date: Date,
        hoursUsed: Double? = nil,
        fuelUsed: Double? = nil,
        notes: String? = nil
    ) async throws -> EquipmentLog {
        let request = LogEquipmentUsageRequest(
            date: date,
            hoursUsed: hoursUsed,
            fuelUsed: fuelUsed,
            notes: notes
        )

        let response: EquipmentLogResponse = try await apiClient.post(
            "/equipment/\(equipmentId)/logs",
            body: request
        )

        return response.log.toEquipmentLog()
    }

    // MARK: - Service Logs

    func fetchServiceLogs(equipmentId: String) async throws -> [ServiceLog] {
        // Try to fetch from API
        guard networkMonitor.isConnected else {
            // Return mock data when offline
            return ServiceLog.mockServiceLogs.filter { $0.equipmentId == equipmentId }
        }

        do {
            let response: ServiceLogListResponse = try await apiClient.get(
                "/equipment/\(equipmentId)/service-logs"
            )
            return response.serviceLogs.map { $0.toServiceLog() }
        } catch {
            print("Failed to fetch service logs, using mock data: \(error)")
            // Fall back to mock data if API not yet implemented
            return ServiceLog.mockServiceLogs.filter { $0.equipmentId == equipmentId }
        }
    }

    func createServiceLog(
        equipmentId: String,
        serviceType: ServiceType,
        date: Date,
        meterReading: Double? = nil,
        cost: Double? = nil,
        partsUsed: String? = nil,
        technician: String? = nil,
        notes: String? = nil,
        nextServiceDue: Date? = nil,
        nextServiceHours: Double? = nil
    ) async throws -> ServiceLog {
        let request = CreateServiceLogRequest(
            serviceType: serviceType.rawValue,
            date: date,
            meterReading: meterReading,
            cost: cost,
            partsUsed: partsUsed,
            technician: technician,
            notes: notes,
            nextServiceDue: nextServiceDue,
            nextServiceHours: nextServiceHours
        )

        do {
            let response: ServiceLogCreateResponse = try await apiClient.post(
                "/equipment/\(equipmentId)/service-logs",
                body: request
            )
            return response.serviceLog.toServiceLog()
        } catch {
            // Return a mock created log if API not yet implemented
            print("Failed to create service log via API, returning mock: \(error)")
            return ServiceLog(
                id: UUID().uuidString,
                equipmentId: equipmentId,
                serviceType: serviceType,
                date: date,
                meterReading: meterReading,
                cost: cost,
                partsUsed: partsUsed,
                technician: technician,
                notes: notes,
                nextServiceDue: nextServiceDue,
                nextServiceHours: nextServiceHours,
                createdAt: Date(),
                updatedAt: Date()
            )
        }
    }

    func deleteServiceLog(equipmentId: String, serviceLogId: String) async throws {
        try await apiClient.delete("/equipment/\(equipmentId)/service-logs/\(serviceLogId)")
    }
}

// MARK: - API Response Models

struct EquipmentListResponse: Decodable {
    let equipment: [EquipmentAPIModel]
}

struct EquipmentAPIModel: Decodable {
    let id: String
    let name: String
    let type: String
    let samsaraId: String?
    let status: String
    let currentLat: Double?
    let currentLng: Double?
    let lastUpdated: Date?
    let createdAt: Date
    let updatedAt: Date
    let _count: EquipmentCounts?

    struct EquipmentCounts: Decodable {
        let assignments: Int?
        let logs: Int?
    }

    func toEquipment() -> Equipment {
        // Map status string to enum
        let mappedStatus: EquipmentStatus
        switch status.uppercased() {
        case "AVAILABLE": mappedStatus = .available
        case "IN_USE": mappedStatus = .inUse
        case "MAINTENANCE": mappedStatus = .maintenance
        case "OUT_OF_SERVICE": mappedStatus = .outOfService
        default: mappedStatus = .available
        }

        return Equipment(
            id: id,
            name: name,
            type: type,
            samsaraId: samsaraId,
            status: mappedStatus,
            currentLat: currentLat,
            currentLng: currentLng,
            lastUpdated: lastUpdated,
            assignmentCount: _count?.assignments ?? 0,
            logCount: _count?.logs ?? 0,
            createdAt: createdAt,
            updatedAt: updatedAt
        )
    }
}

struct EquipmentAssignmentAPIModel: Decodable {
    let id: String
    let equipmentId: String
    let projectId: String
    let startDate: Date
    let endDate: Date?
    let createdAt: Date
    let project: ProjectRef?

    struct ProjectRef: Decodable {
        let id: String
        let name: String
    }

    func toEquipmentAssignment() -> EquipmentAssignment {
        return EquipmentAssignment(
            id: id,
            equipmentId: equipmentId,
            projectId: projectId,
            projectName: project?.name,
            startDate: startDate,
            endDate: endDate,
            createdAt: createdAt
        )
    }
}

struct EquipmentLogAPIModel: Decodable {
    let id: String
    let equipmentId: String
    let date: Date
    let hoursUsed: Double?
    let fuelUsed: Double?
    let notes: String?
    let createdAt: Date

    func toEquipmentLog() -> EquipmentLog {
        return EquipmentLog(
            id: id,
            equipmentId: equipmentId,
            date: date,
            hoursUsed: hoursUsed,
            fuelUsed: fuelUsed,
            notes: notes,
            createdAt: createdAt
        )
    }
}

// MARK: - Request Models

struct CreateEquipmentRequest: Encodable {
    let name: String
    let type: String
    let samsaraId: String?
}

struct UpdateEquipmentRequest: Encodable {
    let name: String?
    let type: String?
    let status: String?
    let samsaraId: String?
}

struct AssignEquipmentRequest: Encodable {
    let equipmentId: String
    let projectId: String
    let startDate: Date
    let endDate: Date?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case equipmentId = "equipment_id"
        case projectId = "project_id"
        case startDate = "start_date"
        case endDate = "end_date"
        case notes
    }
}

struct LogEquipmentUsageRequest: Encodable {
    let date: Date
    let hoursUsed: Double?
    let fuelUsed: Double?
    let notes: String?
}

// MARK: - Response Wrappers

struct EquipmentCreateResponse: Decodable {
    let equipment: EquipmentAPIModel
}

struct EquipmentAssignmentResponse: Decodable {
    let assignment: EquipmentAssignmentAPIModel
}

struct EquipmentLogResponse: Decodable {
    let log: EquipmentLogAPIModel
}

// MARK: - Service Log API Models

struct ServiceLogListResponse: Decodable {
    let serviceLogs: [ServiceLogAPIModel]
}

struct ServiceLogCreateResponse: Decodable {
    let serviceLog: ServiceLogAPIModel
}

struct ServiceLogAPIModel: Decodable {
    let id: String
    let equipmentId: String
    let serviceType: String
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

    func toServiceLog() -> ServiceLog {
        let mappedServiceType = ServiceType(rawValue: serviceType) ?? .other

        return ServiceLog(
            id: id,
            equipmentId: equipmentId,
            serviceType: mappedServiceType,
            date: date,
            meterReading: meterReading,
            cost: cost,
            partsUsed: partsUsed,
            technician: technician,
            notes: notes,
            nextServiceDue: nextServiceDue,
            nextServiceHours: nextServiceHours,
            createdAt: createdAt,
            updatedAt: updatedAt
        )
    }
}

struct CreateServiceLogRequest: Encodable {
    let serviceType: String
    let date: Date
    let meterReading: Double?
    let cost: Double?
    let partsUsed: String?
    let technician: String?
    let notes: String?
    let nextServiceDue: Date?
    let nextServiceHours: Double?

    enum CodingKeys: String, CodingKey {
        case serviceType = "service_type"
        case date
        case meterReading = "meter_reading"
        case cost
        case partsUsed = "parts_used"
        case technician
        case notes
        case nextServiceDue = "next_service_due"
        case nextServiceHours = "next_service_hours"
    }
}
