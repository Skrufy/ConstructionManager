//
//  WarningService.swift
//  ConstructionManager
//
//  Service for employee warning API calls
//

import Foundation
import Combine

@MainActor
class WarningService: ObservableObject {
    static let shared = WarningService()

    @Published var warnings: [EmployeeWarning] = []
    @Published var isLoading = false
    @Published var error: String?

    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Fetch Warnings

    func fetchWarnings(employeeId: String? = nil, projectId: String? = nil, status: String? = nil) async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            var queryItems: [URLQueryItem] = []
            if let employeeId = employeeId {
                queryItems.append(URLQueryItem(name: "employeeId", value: employeeId))
            }
            if let projectId = projectId {
                queryItems.append(URLQueryItem(name: "projectId", value: projectId))
            }
            if let status = status {
                queryItems.append(URLQueryItem(name: "status", value: status))
            }

            let response: [WarningAPIModel] = try await apiClient.get(
                "/warnings",
                queryItems: queryItems.isEmpty ? nil : queryItems
            )

            self.warnings = response.map { $0.toEmployeeWarning() }
        } catch {
            self.error = error.localizedDescription
            print("Failed to fetch warnings: \(error)")
        }
    }

    // MARK: - Refresh

    func refresh() async {
        await fetchWarnings()
    }

    // MARK: - Create Warning

    func createWarning(
        employeeId: String,
        projectId: String?,
        warningType: WarningType,
        severity: WarningSeverity,
        description: String,
        incidentDate: Date,
        witnessNames: String? = nil,
        actionRequired: String? = nil
    ) async throws -> EmployeeWarning {
        let request = CreateWarningRequest(
            employeeId: employeeId,
            projectId: projectId,
            warningType: warningType.rawValue.uppercased(),
            severity: severity.rawValue.uppercased(),
            description: description,
            incidentDate: incidentDate,
            witnessNames: witnessNames,
            actionRequired: actionRequired
        )

        let response: WarningCreateResponse = try await apiClient.post("/warnings", body: request)
        let newWarning = response.warning.toEmployeeWarning()

        // Add to local list
        warnings.insert(newWarning, at: 0)

        return newWarning
    }

    // MARK: - Update Warning

    func updateWarning(
        id: String,
        status: WarningStatus? = nil,
        employeeResponse: String? = nil,
        actionRequired: String? = nil
    ) async throws -> EmployeeWarning {
        let request = UpdateWarningRequest(
            status: status?.rawValue.uppercased(),
            employeeResponse: employeeResponse,
            actionRequired: actionRequired
        )

        let response: WarningCreateResponse = try await apiClient.patch("/warnings/\(id)", body: request)
        let updatedWarning = response.warning.toEmployeeWarning()

        // Update local list
        if let index = warnings.firstIndex(where: { $0.id == id }) {
            warnings[index] = updatedWarning
        }

        return updatedWarning
    }

    // MARK: - Acknowledge Warning

    func acknowledgeWarning(id: String, response: String? = nil) async throws -> EmployeeWarning {
        return try await updateWarning(id: id, status: .acknowledged, employeeResponse: response)
    }

    // MARK: - Resolve Warning

    func resolveWarning(id: String) async throws -> EmployeeWarning {
        return try await updateWarning(id: id, status: .resolved)
    }

    // MARK: - Delete Warning

    func deleteWarning(id: String) async throws {
        try await apiClient.delete("/warnings/\(id)")

        // Remove from local list
        warnings.removeAll { $0.id == id }
    }
}

// MARK: - API Response Models

struct WarningAPIModel: Decodable {
    let id: String
    let employeeId: String
    let issuedById: String
    let projectId: String?
    let warningType: String
    let severity: String
    let description: String
    let incidentDate: Date
    let createdAt: Date
    let acknowledgedAt: Date?
    let employeeResponse: String?
    let witnessNames: String?
    let actionRequired: String?
    let status: String
    let employee: WarningUserRef?
    let issuedBy: WarningUserRef?
    let project: WarningProjectRef?

    struct WarningUserRef: Decodable {
        let id: String
        let name: String
        let email: String?
        let role: String?
    }

    struct WarningProjectRef: Decodable {
        let id: String
        let name: String
    }

    func toEmployeeWarning() -> EmployeeWarning {
        // Map warningType string to enum
        let mappedType: WarningType
        switch warningType.uppercased() {
        case "VERBAL": mappedType = .verbal
        case "WRITTEN": mappedType = .written
        case "FINAL": mappedType = .final
        case "SUSPENSION": mappedType = .suspension
        case "TERMINATION": mappedType = .termination
        default: mappedType = .verbal
        }

        // Map severity string to enum
        let mappedSeverity: WarningSeverity
        switch severity.uppercased() {
        case "MINOR": mappedSeverity = .minor
        case "MODERATE": mappedSeverity = .moderate
        case "MAJOR": mappedSeverity = .major
        case "CRITICAL": mappedSeverity = .critical
        default: mappedSeverity = .minor
        }

        // Map status string to enum
        let mappedStatus: WarningStatus
        switch status.uppercased() {
        case "PENDING": mappedStatus = .pending
        case "ACKNOWLEDGED": mappedStatus = .acknowledged
        case "DISPUTED": mappedStatus = .disputed
        case "RESOLVED": mappedStatus = .resolved
        case "ESCALATED": mappedStatus = .escalated
        default: mappedStatus = .pending
        }

        // Parse witnesses from comma-separated string
        let witnessArray = witnessNames?.components(separatedBy: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty } ?? []

        return EmployeeWarning(
            id: id,
            employeeId: employeeId,
            employeeName: employee?.name ?? "Unknown",
            issuedById: issuedById,
            issuedByName: issuedBy?.name ?? "Unknown",
            projectId: projectId,
            projectName: project?.name,
            type: mappedType,
            severity: mappedSeverity,
            title: description.prefix(50) + (description.count > 50 ? "..." : ""),
            description: description,
            incidentDate: incidentDate,
            issuedAt: createdAt,
            acknowledgedAt: acknowledgedAt,
            employeeResponse: employeeResponse,
            witnesses: witnessArray,
            attachments: [],
            followUpRequired: actionRequired != nil && !actionRequired!.isEmpty,
            followUpDate: nil,
            followUpNotes: actionRequired,
            status: mappedStatus
        )
    }
}

// MARK: - Request Models

struct CreateWarningRequest: Encodable {
    let employeeId: String
    let projectId: String?
    let warningType: String
    let severity: String
    let description: String
    let incidentDate: Date
    let witnessNames: String?
    let actionRequired: String?
}

struct UpdateWarningRequest: Encodable {
    let status: String?
    let employeeResponse: String?
    let actionRequired: String?
}

struct WarningCreateResponse: Decodable {
    let message: String?
    let warning: WarningAPIModel
}
