//
//  CommentService.swift
//  ConstructionManager
//
//  Service for managing comments on resources
//

import Foundation
import Combine

@MainActor
class CommentService: ObservableObject {
    static let shared = CommentService()

    @Published var comments: [String: [Comment]] = [:] // Keyed by resourceId
    @Published var isLoading = false
    @Published var error: String?

    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Fetch Comments

    func fetchComments(resourceType: CommentableResource, resourceId: String) async -> [Comment] {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let endpoint = "/comments?resource_type=\(resourceType.rawValue)&resource_id=\(resourceId)"
            let fetchedComments: [Comment] = try await apiClient.get(endpoint)
            comments[resourceId] = fetchedComments
            return fetchedComments
        } catch {
            print("Failed to fetch comments: \(error)")
            self.error = error.localizedDescription
            // Return mock data
            let mockComments = Comment.mockComments.filter { $0.resourceId == resourceId }
            comments[resourceId] = mockComments
            return mockComments
        }
    }

    // MARK: - Create Comment

    func createComment(resourceType: CommentableResource, resourceId: String, content: String, parentId: String? = nil) async -> Comment? {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let body = CreateCommentRequest(
                resourceType: resourceType.rawValue,
                resourceId: resourceId,
                content: content,
                parentId: parentId
            )

            let newComment: Comment = try await apiClient.post("/comments", body: body)

            // Update local cache
            var existingComments = comments[resourceId] ?? []
            if parentId == nil {
                existingComments.append(newComment)
            } else {
                // It's a reply - need to refresh to get nested structure
                _ = await fetchComments(resourceType: resourceType, resourceId: resourceId)
            }
            comments[resourceId] = existingComments

            return newComment
        } catch {
            print("Failed to create comment: \(error)")
            self.error = error.localizedDescription
            return nil
        }
    }

    // MARK: - Update Comment

    func updateComment(id: String, content: String) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let body = ["content": content]
            let _: Comment = try await apiClient.patch("/comments/\(id)", body: body)
            return true
        } catch {
            print("Failed to update comment: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }

    // MARK: - Delete Comment

    func deleteComment(id: String, resourceId: String) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            try await apiClient.delete("/comments/\(id)")
            comments[resourceId]?.removeAll { $0.id == id }
            return true
        } catch {
            print("Failed to delete comment: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }

    // MARK: - Helpers

    func commentCount(for resourceId: String) -> Int {
        comments[resourceId]?.count ?? 0
    }

    func clearCache(for resourceId: String) {
        comments.removeValue(forKey: resourceId)
    }
}

// MARK: - Request Models

private struct CreateCommentRequest: Encodable {
    let resourceType: String
    let resourceId: String
    let content: String
    let parentId: String?

    enum CodingKeys: String, CodingKey {
        case resourceType = "resource_type"
        case resourceId = "resource_id"
        case content
        case parentId = "parent_id"
    }
}
