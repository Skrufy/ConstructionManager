//
//  LabelService.swift
//  ConstructionManager
//
//  Service for managing labels
//

import Foundation
import Combine

@MainActor
class LabelService: ObservableObject {
    static let shared = LabelService()

    @Published var labels: [ProjectLabel] = []
    @Published var isLoading = false
    @Published var error: String?

    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Fetch Labels

    func fetchLabels(category: LabelCategory? = nil, projectId: String? = nil) async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            var endpoint = "/labels"
            var params: [String] = []

            if let category = category {
                params.append("category=\(category.rawValue)")
            }
            if let projectId = projectId {
                params.append("project_id=\(projectId)")
            }

            if !params.isEmpty {
                endpoint += "?" + params.joined(separator: "&")
            }

            labels = try await apiClient.get(endpoint)
        } catch {
            print("Failed to fetch labels: \(error)")
            self.error = error.localizedDescription
            labels = ProjectLabel.mockLabels
        }
    }

    // MARK: - Create Label

    func createLabel(name: String, category: LabelCategory, scope: LabelScope, projectId: String? = nil, color: String? = nil, description: String? = nil) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let body = CreateLabelRequest(
                name: name,
                category: category.rawValue,
                scope: scope.rawValue,
                projectId: projectId,
                color: color,
                description: description
            )

            let _: ProjectLabel = try await apiClient.post("/labels", body: body)
            await fetchLabels()
            return true
        } catch {
            print("Failed to create label: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }

    // MARK: - Update Label

    func updateLabel(id: String, name: String? = nil, color: String? = nil, isActive: Bool? = nil) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let body = UpdateLabelRequest(
                name: name,
                color: color,
                isActive: isActive
            )

            let _: ProjectLabel = try await apiClient.patch("/labels/\(id)", body: body)
            await fetchLabels()
            return true
        } catch {
            print("Failed to update label: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }

    // MARK: - Delete Label

    func deleteLabel(id: String) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            try await apiClient.delete("/labels/\(id)")
            labels.removeAll { $0.id == id }
            return true
        } catch {
            print("Failed to delete label: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }

    // MARK: - Helpers

    func labels(for category: LabelCategory) -> [ProjectLabel] {
        labels.filter { $0.category == category && $0.isActive }
    }

    func globalLabels(for category: LabelCategory) -> [ProjectLabel] {
        labels.filter { $0.category == category && $0.scope == .global && $0.isActive }
    }

    func projectLabels(for category: LabelCategory, projectId: String) -> [ProjectLabel] {
        labels.filter { $0.category == category && ($0.scope == .global || $0.projectId == projectId) && $0.isActive }
    }
}

// MARK: - Request Models

private struct CreateLabelRequest: Encodable {
    let name: String
    let category: String
    let scope: String
    let projectId: String?
    let color: String?
    let description: String?

    enum CodingKeys: String, CodingKey {
        case name, category, scope, color, description
        case projectId = "project_id"
    }
}

private struct UpdateLabelRequest: Encodable {
    let name: String?
    let color: String?
    let isActive: Bool?

    enum CodingKeys: String, CodingKey {
        case name, color
        case isActive = "is_active"
    }
}
