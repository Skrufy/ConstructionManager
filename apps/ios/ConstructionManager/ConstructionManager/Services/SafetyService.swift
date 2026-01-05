//
//  SafetyService.swift
//  ConstructionManager
//
//  Service for safety-related API calls (incidents, inspections)
//

import Foundation
import Combine

// MARK: - Inspection Template Model
struct InspectionTemplate: Identifiable, Codable {
    let id: String
    let name: String
    let description: String?
    let category: String
    let items: [[String: String]]?
    let createdAt: Date?

    var categoryEnum: InspectionCategory {
        switch category.uppercased() {
        case "SAFETY": return .safety
        case "QUALITY": return .quality
        case "ENVIRONMENTAL": return .environmental
        case "PRE_WORK": return .preWork
        default: return .safety
        }
    }
}

@MainActor
class SafetyService: ObservableObject {
    static let shared = SafetyService()

    @Published var incidents: [IncidentReport] = []
    @Published var inspections: [Inspection] = []
    @Published var inspectionTemplates: [InspectionTemplate] = []
    @Published var isLoading = false
    @Published var error: String?

    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Fetch Incidents

    func fetchIncidents(projectId: String? = nil, status: String? = nil, severity: String? = nil, type: String? = nil) async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            var queryItems: [URLQueryItem] = []
            if let projectId = projectId {
                queryItems.append(URLQueryItem(name: "projectId", value: projectId))
            }
            if let status = status {
                queryItems.append(URLQueryItem(name: "status", value: status))
            }
            if let severity = severity {
                queryItems.append(URLQueryItem(name: "severity", value: severity))
            }
            if let type = type {
                queryItems.append(URLQueryItem(name: "type", value: type))
            }

            let response: IncidentsResponse = try await apiClient.get(
                "/safety/incidents",
                queryItems: queryItems.isEmpty ? nil : queryItems
            )

            self.incidents = response.incidents.map { $0.toIncidentReport() }
        } catch {
            self.error = error.localizedDescription
            print("Failed to fetch incidents: \(error)")
        }
    }

    // MARK: - Create Incident

    func createIncident(
        projectId: String,
        incidentDate: Date,
        incidentTime: String?,
        location: String,
        incidentType: IncidentType,
        severity: IncidentSeverity,
        description: String,
        rootCause: String? = nil,
        immediateActions: String? = nil,
        witnesses: [String]? = nil
    ) async throws -> IncidentReport {
        let request = CreateIncidentRequest(
            projectId: projectId,
            incidentDate: incidentDate,
            incidentTime: incidentTime,
            location: location,
            incidentType: incidentType.rawValue,
            severity: severity.rawValue,
            description: description,
            rootCause: rootCause,
            immediateActions: immediateActions,
            witnesses: witnesses
        )

        let response: IncidentAPIModel = try await apiClient.post("/safety/incidents", body: request)
        let newIncident = response.toIncidentReport()

        // Add to local list
        incidents.insert(newIncident, at: 0)

        return newIncident
    }

    // MARK: - Update Incident

    func updateIncident(
        id: String,
        status: IncidentStatus? = nil,
        investigationNotes: String? = nil,
        correctiveActions: String? = nil
    ) async throws -> IncidentReport {
        let request = UpdateIncidentRequest(
            status: status?.rawValue,
            investigationNotes: investigationNotes,
            correctiveActions: correctiveActions
        )

        let response: IncidentAPIModel = try await apiClient.patch("/safety/incidents/\(id)", body: request)
        let updatedIncident = response.toIncidentReport()

        // Update local list
        if let index = incidents.firstIndex(where: { $0.id == id }) {
            incidents[index] = updatedIncident
        }

        return updatedIncident
    }

    // MARK: - Close Incident

    func closeIncident(id: String, correctiveActions: String) async throws -> IncidentReport {
        return try await updateIncident(id: id, status: .closed, correctiveActions: correctiveActions)
    }

    // MARK: - Fetch Inspections

    func fetchInspections(projectId: String? = nil, status: String? = nil, templateId: String? = nil) async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            var queryItems: [URLQueryItem] = []
            if let projectId = projectId {
                queryItems.append(URLQueryItem(name: "projectId", value: projectId))
            }
            if let status = status {
                queryItems.append(URLQueryItem(name: "status", value: status))
            }
            if let templateId = templateId {
                queryItems.append(URLQueryItem(name: "templateId", value: templateId))
            }

            let response: InspectionsResponse = try await apiClient.get(
                "/safety/inspections",
                queryItems: queryItems.isEmpty ? nil : queryItems
            )

            self.inspections = response.inspections.map { $0.toInspection() }
        } catch {
            self.error = error.localizedDescription
            print("Failed to fetch inspections: \(error)")
        }
    }

    // MARK: - Create Inspection

    func createInspection(
        templateId: String,
        projectId: String,
        date: Date,
        location: String?,
        responses: [String: Any],
        notes: String? = nil
    ) async throws -> Inspection {
        let request = CreateInspectionRequest(
            templateId: templateId,
            projectId: projectId,
            date: date,
            location: location,
            responses: responses,
            notes: notes
        )

        let response: InspectionAPIModel = try await apiClient.post("/safety/inspections", body: request)
        let newInspection = response.toInspection()

        // Add to local list
        inspections.insert(newInspection, at: 0)

        return newInspection
    }

    // MARK: - Fetch Inspection Templates

    func fetchInspectionTemplates(category: String? = nil) async {
        do {
            var queryItems: [URLQueryItem] = []
            if let category = category {
                queryItems.append(URLQueryItem(name: "category", value: category))
            }

            let templates: [InspectionTemplate] = try await apiClient.get(
                "/safety/inspection-templates",
                queryItems: queryItems.isEmpty ? nil : queryItems
            )

            self.inspectionTemplates = templates
        } catch {
            print("Failed to fetch inspection templates: \(error)")
            // Provide default templates if API fails
            self.inspectionTemplates = Self.defaultTemplates
        }
    }

    // Default templates for when API is not available
    static let defaultTemplates: [InspectionTemplate] = [
        InspectionTemplate(
            id: "template-safety-daily",
            name: "Daily Safety Checklist",
            description: "Daily site safety inspection",
            category: "SAFETY",
            items: [["question": "PPE being worn correctly?"], ["question": "Work area clean and organized?"]],
            createdAt: nil
        ),
        InspectionTemplate(
            id: "template-quality",
            name: "Quality Control Inspection",
            description: "Quality assurance checklist",
            category: "QUALITY",
            items: [["question": "Work meets specifications?"], ["question": "Materials properly stored?"]],
            createdAt: nil
        ),
        InspectionTemplate(
            id: "template-prework",
            name: "Pre-Work Safety Briefing",
            description: "Before starting work checklist",
            category: "PRE_WORK",
            items: [["question": "Hazards identified?"], ["question": "Workers briefed?"]],
            createdAt: nil
        )
    ]

    // MARK: - Refresh

    func refreshIncidents() async {
        await fetchIncidents()
    }

    func refreshInspections() async {
        await fetchInspections()
    }
}

// MARK: - API Response Models

// Wrapper for incidents list response
struct IncidentsResponse: Decodable {
    let incidents: [IncidentAPIModel]
}

// Wrapper for inspections list response
struct InspectionsResponse: Decodable {
    let inspections: [InspectionAPIModel]
}

struct IncidentAPIModel: Decodable {
    let id: String
    let projectId: String
    let projectName: String?  // Flat field from API
    let reportedBy: String
    let reporterName: String?  // Flat field from API
    let incidentDate: Date
    let incidentTime: String?
    let location: String
    let incidentType: String
    let severity: String
    let description: String
    let rootCause: String?
    let immediateActions: String?
    let witnesses: [String]?
    let injuredParties: [InjuredPartyAPI]?
    let photoUrls: [String]?  // API returns photo_urls
    let status: String
    let investigationNotes: String?
    let correctiveActions: String?
    let closedAt: Date?
    let closedBy: String?
    let closerName: String?  // Flat field from API
    let createdAt: Date
    let updatedAt: Date

    struct InjuredPartyAPI: Decodable {
        let name: String
        let injuryType: String?
        let treatment: String?
    }

    func toIncidentReport() -> IncidentReport {
        // Map incidentType string to enum
        let mappedType: IncidentType
        switch incidentType.uppercased() {
        case "INJURY": mappedType = .injury
        case "NEAR_MISS": mappedType = .nearMiss
        case "PROPERTY_DAMAGE": mappedType = .propertyDamage
        case "ENVIRONMENTAL": mappedType = .environmental
        default: mappedType = .other
        }

        // Map severity string to enum
        let mappedSeverity: IncidentSeverity
        switch severity.uppercased() {
        case "MINOR": mappedSeverity = .minor
        case "MODERATE": mappedSeverity = .moderate
        case "SERIOUS": mappedSeverity = .serious
        case "CRITICAL": mappedSeverity = .critical
        default: mappedSeverity = .minor
        }

        // Map status string to enum
        let mappedStatus: IncidentStatus
        switch status.uppercased() {
        case "REPORTED": mappedStatus = .reported
        case "UNDER_INVESTIGATION": mappedStatus = .underInvestigation
        case "CLOSED": mappedStatus = .closed
        default: mappedStatus = .reported
        }

        // Map injured parties
        let mappedInjuredParties = injuredParties?.map { party in
            InjuredParty(name: party.name, injuryType: party.injuryType, treatment: party.treatment)
        }

        return IncidentReport(
            id: id,
            projectId: projectId,
            projectName: projectName,  // Use flat field
            reportedBy: reportedBy,
            reporterName: reporterName,  // Use flat field
            incidentDate: incidentDate,
            incidentTime: incidentTime,
            location: location,
            incidentType: mappedType,
            severity: mappedSeverity,
            description: description,
            rootCause: rootCause,
            immediateActions: immediateActions,
            witnesses: witnesses,
            injuredParties: mappedInjuredParties,
            photoUrls: photoUrls,  // Use correct field name
            status: mappedStatus,
            investigationNotes: investigationNotes,
            correctiveActions: correctiveActions,
            closedAt: closedAt,
            closedBy: closedBy,
            closerName: closerName,  // Use flat field
            createdAt: createdAt,
            updatedAt: updatedAt
        )
    }
}

// API returns snake_case with flat fields (iOS decoder uses convertFromSnakeCase)
struct InspectionAPIModel: Decodable {
    let id: String
    let templateId: String?
    let templateName: String?      // Flat field from API
    let templateCategory: String?  // Flat field from API
    let projectId: String
    let projectName: String?       // Flat field from API
    let inspectorId: String
    let inspectorName: String?     // Flat field from API
    let date: String               // API returns as string
    let scheduledDate: String?     // Alternative date field
    let location: String?
    let overallStatus: String
    let status: String?            // Alternative status field
    let notes: String?
    let signatureUrl: String?
    let photoCount: Int?           // Flat field from API
    let createdAt: String
    let updatedAt: String

    func toInspection() -> Inspection {
        // Map status string to enum
        let statusString = overallStatus.uppercased()
        let mappedStatus: InspectionStatus
        switch statusString {
        case "PENDING", "SCHEDULED": mappedStatus = .pending
        case "PASSED", "COMPLETED": mappedStatus = .passed
        case "FAILED": mappedStatus = .failed
        case "REQUIRES_FOLLOWUP", "IN_PROGRESS": mappedStatus = .requiresFollowup
        default: mappedStatus = .pending
        }

        // Parse dates
        let dateFormatter = ISO8601DateFormatter()
        dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let fallbackFormatter = ISO8601DateFormatter()

        let dateString = date.isEmpty ? (scheduledDate ?? "") : date
        let parsedDate = dateFormatter.date(from: dateString) ?? fallbackFormatter.date(from: dateString) ?? Date()
        let parsedCreatedAt = dateFormatter.date(from: createdAt) ?? fallbackFormatter.date(from: createdAt) ?? Date()
        let parsedUpdatedAt = dateFormatter.date(from: updatedAt) ?? fallbackFormatter.date(from: updatedAt) ?? Date()

        return Inspection(
            id: id,
            templateId: templateId ?? "",
            templateName: templateName,
            templateCategory: templateCategory,
            projectId: projectId,
            projectName: projectName,
            inspectorId: inspectorId,
            inspectorName: inspectorName,
            date: parsedDate,
            location: location,
            overallStatus: mappedStatus,
            notes: notes,
            signatureUrl: signatureUrl,
            photoCount: photoCount ?? 0,
            createdAt: parsedCreatedAt,
            updatedAt: parsedUpdatedAt
        )
    }
}

// MARK: - Request Models

struct CreateIncidentRequest: Encodable {
    let projectId: String
    let incidentDate: Date
    let incidentTime: String?
    let location: String
    let incidentType: String
    let severity: String
    let description: String
    let rootCause: String?
    let immediateActions: String?
    let witnesses: [String]?
}

struct UpdateIncidentRequest: Encodable {
    let status: String?
    let investigationNotes: String?
    let correctiveActions: String?
}

struct CreateInspectionRequest: Encodable {
    let templateId: String
    let projectId: String
    let date: Date
    let location: String?
    let responses: [String: Any]
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case templateId, projectId, date, location, responses, notes
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(templateId, forKey: .templateId)
        try container.encode(projectId, forKey: .projectId)
        try container.encode(date, forKey: .date)
        try container.encodeIfPresent(location, forKey: .location)
        try container.encodeIfPresent(notes, forKey: .notes)

        // Encode responses as JSON data
        let jsonData = try JSONSerialization.data(withJSONObject: responses)
        if let jsonString = String(data: jsonData, encoding: .utf8) {
            try container.encode(jsonString, forKey: .responses)
        }
    }
}
