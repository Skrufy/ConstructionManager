//
//  PunchListService.swift
//  ConstructionManager
//
//  Service for managing punch lists
//

import Foundation
import SwiftUI
import Combine

@MainActor
class PunchListService: ObservableObject {
    static let shared = PunchListService()

    @Published var punchListItems: [PunchListItem] = []
    @Published var isLoading = false
    @Published var error: String?

    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Computed Properties

    var openCount: Int {
        punchListItems.filter { $0.status == .open }.count
    }

    var inProgressCount: Int {
        punchListItems.filter { $0.status == .inProgress }.count
    }

    var completedCount: Int {
        punchListItems.filter { $0.status == .completed || $0.status == .verified }.count
    }

    // MARK: - API Methods

    func fetchPunchListItems(projectId: String? = nil) async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            var queryItems: [URLQueryItem] = []
            if let projectId = projectId {
                queryItems.append(URLQueryItem(name: "projectId", value: projectId))
            }

            let response: PunchListsResponse = try await apiClient.get(
                "/safety/punch-lists",
                queryItems: queryItems.isEmpty ? nil : queryItems
            )

            // Use the items array which contains all punch list items
            self.punchListItems = response.items
            print("[PunchListService] Fetched \(response.items.count) items")
        } catch {
            self.error = error.localizedDescription
            print("[PunchListService] Fetch error: \(error)")
            // Don't fall back to mock data - show real error
            self.punchListItems = []
        }
    }

    func createPunchList(
        projectId: String,
        name: String,
        description: String?,
        dueDate: Date?,
        items: [PunchListItemRequest]?
    ) async throws {
        let dateFormatter = ISO8601DateFormatter()

        let body = CreatePunchListRequest(
            projectId: projectId,
            name: name,
            description: description,
            dueDate: dueDate.map { dateFormatter.string(from: $0) },
            items: items
        )

        struct CreatePunchListResponse: Decodable {
            let id: String
        }

        let _: CreatePunchListResponse = try await apiClient.post("/safety/punch-lists", body: body)
        await fetchPunchListItems()
    }

    func createPunchListItem(
        projectId: String,
        description: String,
        location: String?,
        trade: String?,
        priority: PunchListPriority,
        assignedTo: String?,
        dueDate: Date?
    ) async throws -> PunchListItem {
        let dateFormatter = ISO8601DateFormatter()

        // Create a punch list with a single item
        let itemRequest = PunchListItemRequest(
            description: description,
            location: location,
            trade: trade,
            priority: priority.rawValue,
            assignedTo: assignedTo,
            dueDate: dueDate.map { dateFormatter.string(from: $0) }
        )

        let body = CreatePunchListRequest(
            projectId: projectId,
            name: description, // Use description as name for single items
            description: nil,
            dueDate: dueDate.map { dateFormatter.string(from: $0) },
            items: [itemRequest]
        )

        let item: PunchListItem = try await apiClient.post("/safety/punch-lists", body: body)
        punchListItems.insert(item, at: 0)
        return item
    }

    func updatePunchListStatus(id: String, status: PunchListStatus) async throws {
        let body = UpdatePunchListStatusRequest(status: status.rawValue)
        let _: PunchListItem = try await apiClient.patch("/safety/punch-lists/\(id)", body: body)

        if let index = punchListItems.firstIndex(where: { $0.id == id }) {
            // Create updated item (PunchListItem is immutable)
            let item = punchListItems[index]
            punchListItems[index] = PunchListItem(
                id: item.id,
                projectId: item.projectId,
                projectName: item.projectName,
                location: item.location,
                description: item.description,
                trade: item.trade,
                priority: item.priority,
                status: status,
                assignedTo: item.assignedTo,
                assignedToName: item.assignedToName,
                dueDate: item.dueDate,
                completedAt: status == .completed ? Date() : item.completedAt,
                completedBy: item.completedBy,
                verifiedAt: status == .verified ? Date() : item.verifiedAt,
                verifiedBy: item.verifiedBy,
                photos: item.photos,
                notes: item.notes,
                createdBy: item.createdBy,
                createdByName: item.createdByName,
                createdAt: item.createdAt,
                updatedAt: Date()
            )
        }
    }

    func deletePunchListItem(id: String) async throws {
        try await apiClient.delete("/safety/punch-lists/\(id)")
        punchListItems.removeAll { $0.id == id }
    }
}

// MARK: - Request Models

struct CreatePunchListRequest: Encodable {
    let projectId: String
    let name: String
    let description: String?
    let dueDate: String?
    let items: [PunchListItemRequest]?
}

struct PunchListItemRequest: Encodable {
    let description: String
    let location: String?
    let trade: String?
    let priority: String
    let assignedTo: String?
    let dueDate: String?
}

private struct UpdatePunchListStatusRequest: Encodable {
    let status: String
}

// MARK: - API Response Models

struct PunchListsResponse: Decodable {
    let punchLists: [PunchListAPIModel]?
    let items: [PunchListItem]
    let total: Int?
    let page: Int?
    let pageSize: Int?
}

struct PunchListAPIModel: Decodable {
    let id: String
    let projectId: String
    let projectName: String?
    let title: String
    let description: String?
    let status: String
    let dueDate: String?
    let createdBy: String?
    let createdByName: String?
    let items: [PunchListItem]?
    let completedCount: Int?
    let totalCount: Int?
    let createdAt: String
    let updatedAt: String
}
