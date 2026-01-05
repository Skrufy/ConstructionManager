//
//  SafetyTopicService.swift
//  ConstructionManager
//
//  Service for managing standardized safety topics
//

import Foundation
import SwiftUI
import Combine

@MainActor
class SafetyTopicService: ObservableObject {
    static let shared = SafetyTopicService()

    @Published var topics: [SafetyTopic] = []
    @Published var isLoading = false
    @Published var error: String?

    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Computed Properties

    var topicsByCategory: [SafetyTopicCategory: [SafetyTopic]] {
        var grouped: [SafetyTopicCategory: [SafetyTopic]] = [:]
        for category in SafetyTopicCategory.allCases {
            grouped[category] = topics.filter { $0.categoryEnum == category }
        }
        return grouped
    }

    var activeTopics: [SafetyTopic] {
        topics.filter { $0.isActive }
    }

    // MARK: - API Methods

    /// Fetch all safety topics from the API
    func fetchTopics() async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let fetchedTopics: [SafetyTopic] = try await apiClient.get("/safety/topics")
            self.topics = fetchedTopics
        } catch {
            self.error = error.localizedDescription
            print("[SafetyTopicService] Error fetching topics: \(error)")
            // Fallback to mock data in development
            self.topics = SafetyTopic.mockTopics
        }
    }

    /// Create a new custom topic
    func createTopic(
        name: String,
        description: String? = nil,
        category: SafetyTopicCategory? = nil
    ) async throws -> SafetyTopic {
        let request = CreateSafetyTopicRequest(
            name: name,
            description: description,
            category: category?.rawValue
        )

        let newTopic: SafetyTopic = try await apiClient.post("/safety/topics", body: request)
        topics.append(newTopic)
        topics.sort { $0.sortOrder < $1.sortOrder }
        return newTopic
    }

    /// Search topics by name
    func searchTopics(_ query: String) -> [SafetyTopic] {
        guard !query.isEmpty else { return activeTopics }

        let lowercaseQuery = query.lowercased()
        return activeTopics.filter { topic in
            topic.name.lowercased().contains(lowercaseQuery) ||
            (topic.description?.lowercased().contains(lowercaseQuery) ?? false) ||
            topic.displayCategory.lowercased().contains(lowercaseQuery)
        }
    }

    /// Get topic by ID
    func getTopic(id: String) -> SafetyTopic? {
        topics.first { $0.id == id }
    }

    /// Get topics for a specific category
    func getTopics(for category: SafetyTopicCategory) -> [SafetyTopic] {
        activeTopics.filter { $0.categoryEnum == category }
    }
}
