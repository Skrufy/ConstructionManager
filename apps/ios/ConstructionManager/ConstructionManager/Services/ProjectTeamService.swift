//
//  ProjectTeamService.swift
//  ConstructionManager
//
//  Service for managing project team members
//

import Foundation
import Combine

@MainActor
class ProjectTeamService: ObservableObject {
    static let shared = ProjectTeamService()

    @Published var teamMembers: [TeamMember] = []
    @Published var availableUsers: [APIUserListItem] = []
    @Published var isLoading = false
    @Published var error: String?

    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Fetch Team Members

    /// Fetch all team members for a project
    func fetchTeamMembers(projectId: String) async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let response: ProjectTeamResponse = try await apiClient.get("/projects/\(projectId)/team")
            self.teamMembers = response.assignments.map { $0.toTeamMember() }
        } catch {
            self.error = error.localizedDescription
            print("Failed to fetch team members: \(error)")
        }
    }

    // MARK: - Fetch Available Users

    /// Fetch all users that can be added to a project
    func fetchAvailableUsers() async {
        do {
            let users: [APIUserListItem] = try await apiClient.get("/users")
            self.availableUsers = users.filter { $0.status == "ACTIVE" }
        } catch {
            print("Failed to fetch users: \(error)")
            self.availableUsers = []
        }
    }

    /// Get users not already on the team
    func getUnassignedUsers() -> [APIUserListItem] {
        let assignedUserIds = Set(teamMembers.map { $0.userId })
        return availableUsers.filter { !assignedUserIds.contains($0.id) }
    }

    // MARK: - Add Team Member

    /// Add a user to a project
    func addTeamMember(projectId: String, userId: String, roleOverride: String? = nil) async -> TeamMember? {
        isLoading = true
        error = nil
        defer { isLoading = false }

        let request = AddTeamMemberRequest(userId: userId, roleOverride: roleOverride)

        do {
            let response: AssignmentResponse = try await apiClient.post(
                "/projects/\(projectId)/team",
                body: request
            )
            let newMember = response.assignment.toTeamMember()

            // Add to local list
            teamMembers.append(newMember)

            return newMember
        } catch let apiError as APIError {
            switch apiError {
            case .forbidden(let message):
                self.error = message ?? "You don't have permission to manage team members"
            case .serverError(_, let message):
                self.error = message ?? "Failed to add team member"
            default:
                self.error = apiError.localizedDescription
            }
            print("Failed to add team member: \(apiError)")
            return nil
        } catch {
            self.error = error.localizedDescription
            print("Failed to add team member: \(error)")
            return nil
        }
    }

    // MARK: - Update Team Member Role

    /// Update a team member's role override
    func updateTeamMemberRole(projectId: String, assignmentId: String, roleOverride: String?) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        let request = UpdateTeamMemberRequest(assignmentId: assignmentId, roleOverride: roleOverride)

        do {
            let response: AssignmentResponse = try await apiClient.patch(
                "/projects/\(projectId)/team",
                body: request
            )
            let updatedMember = response.assignment.toTeamMember()

            // Update in local list
            if let index = teamMembers.firstIndex(where: { $0.assignmentId == assignmentId }) {
                teamMembers[index] = updatedMember
            }

            return true
        } catch let apiError as APIError {
            switch apiError {
            case .forbidden(let message):
                self.error = message ?? "You don't have permission to manage team members"
            default:
                self.error = apiError.localizedDescription
            }
            print("Failed to update team member: \(apiError)")
            return false
        } catch {
            self.error = error.localizedDescription
            print("Failed to update team member: \(error)")
            return false
        }
    }

    // MARK: - Remove Team Member

    /// Remove a user from a project
    func removeTeamMember(projectId: String, assignmentId: String) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            try await apiClient.delete("/projects/\(projectId)/team?assignmentId=\(assignmentId)")

            // Remove from local list
            teamMembers.removeAll { $0.assignmentId == assignmentId }

            return true
        } catch let apiError as APIError {
            switch apiError {
            case .forbidden(let message):
                self.error = message ?? "You don't have permission to remove team members"
            default:
                self.error = apiError.localizedDescription
            }
            print("Failed to remove team member: \(apiError)")
            return false
        } catch {
            self.error = error.localizedDescription
            print("Failed to remove team member: \(error)")
            return false
        }
    }

    // MARK: - Clear State

    /// Clear team members when leaving project detail
    func clearTeam() {
        teamMembers = []
        error = nil
    }
}
