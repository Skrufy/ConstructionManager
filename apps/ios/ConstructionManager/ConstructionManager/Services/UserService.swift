//
//  UserService.swift
//  ConstructionManager
//
//  Service for user-related operations
//

import Foundation
import Combine

@MainActor
class UserService: ObservableObject {
    static let shared = UserService()

    @Published var users: [User] = []
    @Published var isLoading = false
    @Published var error: String?

    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Fetch Users

    func fetchUsers(role: UserRole? = nil, status: UserStatus? = nil) async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            var endpoint = "/users"
            var params: [String] = []

            if let role = role {
                params.append("role=\(role.rawValue)")
            }
            if let status = status {
                params.append("status=\(status.rawValue)")
            }

            if !params.isEmpty {
                endpoint += "?" + params.joined(separator: "&")
            }

            users = try await apiClient.get(endpoint)
        } catch {
            print("Failed to fetch users: \(error)")
            self.error = error.localizedDescription
            users = []
        }
    }

    // MARK: - Get User by ID

    func getUser(id: String) async -> User? {
        do {
            return try await apiClient.get("/users/\(id)")
        } catch {
            print("Failed to fetch user: \(error)")
            self.error = error.localizedDescription
            return nil
        }
    }

    // MARK: - Update User

    func updateUser(_ user: User) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let _: User = try await apiClient.put("/users/\(user.id)", body: user)
            await fetchUsers()
            return true
        } catch {
            print("Failed to update user: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }

    // MARK: - Update User Template Assignment

    func assignTemplate(userId: String, templateId: String?) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let body: [String: Any?] = [
                "company_template_id": templateId
            ]
            let _: User = try await apiClient.patch("/users/\(userId)", body: body)
            await fetchUsers()
            return true
        } catch {
            print("Failed to assign template: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }
}

// MARK: - Request Models

struct CreateUserRequest: Encodable {
    let email: String
    let firstName: String
    let lastName: String
    let role: String
}
