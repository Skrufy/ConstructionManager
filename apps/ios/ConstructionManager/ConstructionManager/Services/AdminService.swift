//
//  AdminService.swift
//  ConstructionManager
//
//  Service for admin functions: user management, audit logs, invitations, etc.
//

import Foundation
import Combine

@MainActor
class AdminService: ObservableObject {
    static let shared = AdminService()

    @Published var users: [User] = []
    @Published var invitations: [Invitation] = []
    @Published var auditLogs: [AuditLog] = []
    @Published var permissionTemplates: [PermissionTemplate] = []
    @Published var companyTemplates: [PermissionTemplate] = []
    @Published var projectTemplates: [PermissionTemplate] = []
    @Published var isLoading = false
    @Published var error: String?

    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Users

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
            // Don't use mock data - show error state instead
            users = []
        }
    }

    func createUser(email: String, firstName: String, lastName: String, role: UserRole) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let body = CreateUserRequest(
                email: email,
                firstName: firstName,
                lastName: lastName,
                role: role.rawValue
            )
            let _: User = try await apiClient.post("/users", body: body)
            await fetchUsers()
            return true
        } catch {
            print("Failed to create user: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }

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

    func updateUserRole(userId: String, role: UserRole) async -> Bool {
        do {
            let body = ["role": role.rawValue]
            let _: User = try await apiClient.patch("/users/\(userId)", body: body)
            await fetchUsers()
            return true
        } catch {
            print("Failed to update user role: \(error)")
            return false
        }
    }

    func updateUserStatus(userId: String, status: UserStatus) async -> Bool {
        do {
            let body = UpdateStatusRequest(status: status.rawValue)
            let _: User = try await apiClient.patch("/users/\(userId)", body: body)
            await fetchUsers()
            return true
        } catch {
            print("Failed to update user status: \(error)")
            return false
        }
    }

    func updateUserIsBlaster(userId: String, isBlaster: Bool) async -> Bool {
        do {
            let body = UpdateIsBlasterRequest(isBlaster: isBlaster)
            let _: User = try await apiClient.patch("/users/\(userId)", body: body)
            await fetchUsers()
            return true
        } catch {
            print("Failed to update user isBlaster: \(error)")
            return false
        }
    }

    private struct UpdateStatusRequest: Encodable {
        let status: String
    }

    private struct UpdateIsBlasterRequest: Encodable {
        let isBlaster: Bool
    }

    private struct CreateUserRequest: Encodable {
        let email: String
        let firstName: String
        let lastName: String
        let role: String

        enum CodingKeys: String, CodingKey {
            case email, role
            case firstName = "first_name"
            case lastName = "last_name"
        }
    }

    func deleteUser(id: String) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            try await apiClient.delete("/users/\(id)")
            users.removeAll { $0.id == id }
            return true
        } catch {
            print("Failed to delete user: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }

    func sendPasswordReset(userId: String) async -> Bool {
        do {
            try await apiClient.post("/users/\(userId)/reset-password", body: EmptyBody())
            return true
        } catch {
            print("Failed to send password reset: \(error)")
            return false
        }
    }

    // MARK: - Invitations

    func fetchInvitations(status: InvitationStatus? = nil) async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            var endpoint = "/admin/invitations"
            if let status = status {
                endpoint += "?status=\(status.rawValue)"
            }

            let response: InvitationListResponse = try await apiClient.get(endpoint)
            invitations = response.invitations.map { $0.toInvitation() }
        } catch {
            print("Failed to fetch invitations: \(error)")
            self.error = error.localizedDescription
            invitations = []
        }
    }

    func inviteUser(email: String, role: UserRole, message: String? = nil) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let body = InviteUserRequest(email: email, role: role.rawValue, message: message)
            let _: InvitationCreateResponse = try await apiClient.post("/admin/invitations", body: body)
            await fetchInvitations()
            return true
        } catch {
            print("Failed to invite user: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }

    func cancelInvitation(id: String) async -> Bool {
        do {
            try await apiClient.delete("/admin/invitations/\(id)")
            invitations.removeAll { $0.id == id }
            return true
        } catch {
            print("Failed to cancel invitation: \(error)")
            return false
        }
    }

    func resendInvitation(id: String) async -> Bool {
        do {
            let _: InvitationResendResponse = try await apiClient.post("/admin/invitations/\(id)/resend", body: EmptyBody())
            await fetchInvitations()
            return true
        } catch {
            print("Failed to resend invitation: \(error)")
            return false
        }
    }

    var pendingInvitationsCount: Int {
        invitations.filter { $0.status == .pending }.count
    }

    // MARK: - Audit Logs

    func fetchAuditLogs(userId: String? = nil, resourceType: AuditResourceType? = nil, action: AuditAction? = nil, limit: Int = 50) async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            var endpoint = "/admin/audit-logs"
            var params: [String] = ["limit=\(limit)"]

            if let userId = userId {
                params.append("user_id=\(userId)")
            }
            if let resourceType = resourceType {
                params.append("resource_type=\(resourceType.rawValue)")
            }
            if let action = action {
                params.append("action=\(action.rawValue)")
            }

            endpoint += "?" + params.joined(separator: "&")

            auditLogs = try await apiClient.get(endpoint)
        } catch {
            print("Failed to fetch audit logs: \(error)")
            self.error = error.localizedDescription
            auditLogs = AuditLog.mockLogs
        }
    }

    // MARK: - Permission Templates

    func fetchPermissionTemplates(scope: String? = nil) async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            var endpoint = "/permissions"
            if let scope = scope {
                endpoint += "?scope=\(scope)"
            }

            let response: PermissionTemplatesResponse = try await apiClient.get(endpoint)
            permissionTemplates = response.templates
            companyTemplates = response.companyTemplates
            projectTemplates = response.projectTemplates
        } catch {
            print("Failed to fetch permission templates: \(error)")
            self.error = error.localizedDescription
        }
    }

    func fetchUserPermissions(userId: String) async -> UserPermissions? {
        do {
            let permissions: UserPermissions = try await apiClient.get("/permissions/user/\(userId)")
            return permissions
        } catch {
            print("Failed to fetch user permissions: \(error)")
            return nil
        }
    }

    func assignCompanyTemplate(userId: String, templateId: String) async -> Bool {
        do {
            let request = AssignCompanyTemplateRequest(userId: userId, companyTemplateId: templateId)
            let _: UserCompanyPermission = try await apiClient.post("/permissions/assign", body: request)
            return true
        } catch {
            print("Failed to assign company template: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }

    func assignProjectTemplate(userId: String, projectId: String, templateId: String) async -> Bool {
        do {
            let request = AssignProjectTemplateRequest(userId: userId, projectId: projectId, projectTemplateId: templateId)
            let _: ProjectPermissionAssignment = try await apiClient.post("/permissions/project-assign", body: request)
            return true
        } catch {
            print("Failed to assign project template: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }

    /// Create user and optionally assign company template
    func createUserWithTemplate(email: String, firstName: String, lastName: String, role: UserRole, companyTemplateId: String?) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let body = CreateUserRequest(
                email: email,
                firstName: firstName,
                lastName: lastName,
                role: role.rawValue
            )
            let createdUser: User = try await apiClient.post("/users", body: body)

            // Assign company template if provided
            if let templateId = companyTemplateId {
                let _ = await assignCompanyTemplate(userId: createdUser.id, templateId: templateId)
            }

            await fetchUsers()
            return true
        } catch {
            print("Failed to create user: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }

    // MARK: - Statistics

    var activeUsersCount: Int {
        users.filter { $0.status == .active }.count
    }

    var adminCount: Int {
        users.filter { $0.role == .admin }.count
    }

    func usersWithRole(_ role: UserRole) -> [User] {
        users.filter { $0.role == role }
    }
}

private struct EmptyBody: Codable {}

// MARK: - Invitation Models

struct Invitation: Identifiable, Codable {
    let id: String
    let email: String
    let role: String
    let status: InvitationStatus
    let message: String?
    let expiresAt: Date
    let acceptedAt: Date?
    let createdAt: Date
    let updatedAt: Date
    let invitedBy: InvitedByUser

    struct InvitedByUser: Codable {
        let id: String
        let name: String
        let email: String
    }

    var roleEnum: UserRole {
        UserRole(rawValue: role) ?? .fieldWorker
    }

    var isExpired: Bool {
        expiresAt < Date()
    }

    var daysUntilExpiry: Int {
        let days = Calendar.current.dateComponents([.day], from: Date(), to: expiresAt).day ?? 0
        return max(0, days)
    }
}

enum InvitationStatus: String, Codable, CaseIterable {
    case pending = "PENDING"
    case accepted = "ACCEPTED"
    case expired = "EXPIRED"
    case cancelled = "CANCELLED"

    var displayName: String {
        switch self {
        case .pending: return "Pending"
        case .accepted: return "Accepted"
        case .expired: return "Expired"
        case .cancelled: return "Cancelled"
        }
    }

    var color: BadgeStatus {
        switch self {
        case .pending: return .warning
        case .accepted: return .active
        case .expired: return .cancelled
        case .cancelled: return .cancelled
        }
    }
}

// MARK: - Invitation API Models

struct InvitationListResponse: Decodable {
    let invitations: [InvitationAPIModel]
}

struct InvitationCreateResponse: Decodable {
    let invitation: InvitationAPIModel
    let inviteUrl: String?

    enum CodingKeys: String, CodingKey {
        case invitation
        case inviteUrl = "invite_url"
    }
}

struct InvitationResendResponse: Decodable {
    let success: Bool
    let invitation: InvitationAPIModel?
    let inviteUrl: String?

    enum CodingKeys: String, CodingKey {
        case success
        case invitation
        case inviteUrl = "invite_url"
    }
}

struct InvitationAPIModel: Decodable {
    let id: String
    let email: String
    let role: String
    let status: String
    let message: String?
    let expiresAt: Date
    let acceptedAt: Date?
    let createdAt: Date
    let updatedAt: Date
    let invitedBy: InvitedByAPIModel

    struct InvitedByAPIModel: Decodable {
        let id: String
        let name: String
        let email: String
    }

    enum CodingKeys: String, CodingKey {
        case id, email, role, status, message
        case expiresAt = "expires_at"
        case acceptedAt = "accepted_at"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case invitedBy = "invited_by"
    }

    func toInvitation() -> Invitation {
        Invitation(
            id: id,
            email: email,
            role: role,
            status: InvitationStatus(rawValue: status) ?? .pending,
            message: message,
            expiresAt: expiresAt,
            acceptedAt: acceptedAt,
            createdAt: createdAt,
            updatedAt: updatedAt,
            invitedBy: Invitation.InvitedByUser(
                id: invitedBy.id,
                name: invitedBy.name,
                email: invitedBy.email
            )
        )
    }
}

struct InviteUserRequest: Encodable {
    let email: String
    let role: String
    let message: String?
}
