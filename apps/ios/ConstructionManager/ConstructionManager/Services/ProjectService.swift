//
//  ProjectService.swift
//  ConstructionManager
//
//  Service for project-related API calls
//

import Foundation
import Combine

@MainActor
class ProjectService: ObservableObject {
    static let shared = ProjectService()

    @Published var projects: [Project] = []
    @Published var isLoading = false
    @Published var error: String?
    @Published var isUsingCachedData = false

    private let apiClient = APIClient.shared
    private let networkMonitor = NetworkMonitor.shared
    private let offlineDataStore = OfflineDataStore.shared
    private let syncQueue = SyncQueue.shared

    // Request deduplication - prevent multiple concurrent fetches
    private var fetchTask: Task<Void, Never>?
    private var lastFetchTime: Date?
    private let minFetchInterval: TimeInterval = 2.0 // Minimum 2 seconds between fetches

    private init() {}

    // MARK: - Fetch All Projects

    /// Fetch all projects the user has access to
    /// Uses request deduplication to prevent multiple concurrent fetches
    func fetchProjects(status: Project.ProjectStatus? = nil, force: Bool = false) async {
        // Skip if we just fetched recently (unless forced)
        if !force, let lastFetch = lastFetchTime, Date().timeIntervalSince(lastFetch) < minFetchInterval {
            print("[ProjectService] Skipping fetch - too soon since last fetch")
            return
        }

        // If there's already a fetch in progress, wait for it instead of starting a new one
        if let existingTask = fetchTask {
            print("[ProjectService] Reusing existing fetch task")
            await existingTask.value
            return
        }

        // Create a new fetch task
        fetchTask = Task {
            await performFetch(status: status)
        }

        await fetchTask?.value
        fetchTask = nil
    }

    /// Internal method that actually performs the fetch
    private func performFetch(status: Project.ProjectStatus?) async {
        isLoading = true
        error = nil
        isUsingCachedData = false
        defer { isLoading = false }

        // Check network connectivity
        guard networkMonitor.isConnected else {
            // Load from cache when offline
            loadFromOfflineCache()
            return
        }

        do {
            var queryItems: [URLQueryItem] = []
            if let status = status {
                queryItems.append(URLQueryItem(name: "status", value: status.rawValue))
            }

            let response: ProjectsResponse = try await apiClient.get(
                "/projects",
                queryItems: queryItems.isEmpty ? nil : queryItems
            )

            self.projects = response.projects.map { $0.toProject() }
            self.lastFetchTime = Date()

            // Save to cache for offline use
            offlineDataStore.saveProjects(self.projects)
        } catch let error as NSError {
            // Provide more specific error messages for common network issues
            if error.domain == NSURLErrorDomain {
                switch error.code {
                case NSURLErrorTimedOut:
                    self.error = "Connection timed out. Check that the server is running."
                case NSURLErrorCannotConnectToHost:
                    self.error = "Cannot connect to server. Ensure your device is on the same network."
                case NSURLErrorNotConnectedToInternet:
                    self.error = "No internet connection."
                default:
                    self.error = error.localizedDescription
                }
            } else {
                self.error = error.localizedDescription
            }
            print("[ProjectService] Failed to fetch projects: \(error)")

            // Fall back to cached data on network error
            loadFromOfflineCache()
        } catch {
            self.error = error.localizedDescription
            print("[ProjectService] Failed to fetch projects: \(error)")

            // Fall back to cached data on network error
            loadFromOfflineCache()
        }
    }

    // MARK: - Offline Support

    /// Load projects from offline cache
    private func loadFromOfflineCache() {
        let cachedProjects = offlineDataStore.loadProjects()
        if !cachedProjects.isEmpty {
            self.projects = cachedProjects
            self.isUsingCachedData = true
            print("[ProjectService] Loaded \(cachedProjects.count) projects from cache")
        } else {
            self.error = "No internet connection and no cached data available"
        }
    }

    /// Load projects from cache (called by OfflineManager)
    func loadFromCache(_ projects: [Project]) {
        self.projects = projects
        self.isUsingCachedData = true
    }

    // MARK: - Fetch Single Project

    /// Fetch a single project by ID
    func fetchProject(id: String) async -> Project? {
        do {
            let response: ProjectResponse = try await apiClient.get("/projects/\(id)")
            return response.project.toProject()
        } catch {
            self.error = error.localizedDescription
            print("Failed to fetch project: \(error)")
            return nil
        }
    }

    // MARK: - Create Project

    /// Create a new project (requires PROJECT_MANAGER or ADMIN role)
    func createProject(
        name: String,
        address: String?,
        gpsLatitude: Double?,
        gpsLongitude: Double?,
        startDate: Date?,
        endDate: Date?,
        description: String?,
        clientId: String?,
        assignedUserIds: [String]?
    ) async -> Project? {
        isLoading = true
        error = nil
        defer { isLoading = false }

        let request = CreateProjectRequest(
            name: name,
            address: address,
            gpsLatitude: gpsLatitude,
            gpsLongitude: gpsLongitude,
            startDate: startDate,
            endDate: endDate,
            status: "ACTIVE",
            description: description,
            clientId: clientId,
            assignedUserIds: assignedUserIds
        )

        // Check network connectivity
        guard networkMonitor.isConnected else {
            // Queue for later sync when offline
            return createProjectOffline(request: request)
        }

        do {
            let response: ProjectResponse = try await apiClient.post("/projects", body: request)
            let newProject = response.project.toProject()

            // Add to local list
            projects.insert(newProject, at: 0)

            // Update cache
            offlineDataStore.saveProjects(projects)

            return newProject
        } catch {
            self.error = error.localizedDescription
            print("Failed to create project: \(error)")

            // Queue for later sync on failure
            return createProjectOffline(request: request)
        }
    }

    /// Create project locally and queue for sync
    private func createProjectOffline(request: CreateProjectRequest) -> Project? {
        // Create a temporary local project
        let tempId = "temp_\(UUID().uuidString)"
        let localProject = Project(
            id: tempId,
            name: request.name,
            number: nil,
            address: request.address ?? "",
            city: "",
            state: "",
            zipCode: "",
            status: .active,
            type: .commercial,
            gpsLatitude: request.gpsLatitude,
            gpsLongitude: request.gpsLongitude,
            startDate: request.startDate,
            estimatedEndDate: request.endDate,
            actualEndDate: nil,
            clientId: request.clientId,
            client: nil,
            projectManagerId: nil,
            superintendentId: nil,
            budget: nil,
            description: request.description,
            imageUrl: nil,
            createdAt: Date(),
            updatedAt: Date()
        )

        // Add to local list
        projects.insert(localProject, at: 0)

        // Queue for sync
        syncQueue.enqueue(
            type: .create,
            resourceType: .project,
            resourceId: tempId,
            payload: request
        )

        // Update cache
        offlineDataStore.saveProjects(projects)

        print("[ProjectService] Created project offline, queued for sync")
        return localProject
    }

    // MARK: - Update Project

    /// Update an existing project
    func updateProject(id: String, updates: CreateProjectRequest) async -> Project? {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let response: ProjectResponse = try await apiClient.patch("/projects/\(id)", body: updates)
            let updatedProject = response.project.toProject()

            // Update in local list
            if let index = projects.firstIndex(where: { $0.id == id }) {
                projects[index] = updatedProject
            }

            return updatedProject
        } catch {
            self.error = error.localizedDescription
            print("Failed to update project: \(error)")
            return nil
        }
    }

    // MARK: - Delete Project

    /// Delete a project (requires ADMIN role)
    func deleteProject(id: String) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            try await apiClient.delete("/projects/\(id)")

            // Remove from local list
            projects.removeAll { $0.id == id }

            return true
        } catch {
            self.error = error.localizedDescription
            print("Failed to delete project: \(error)")
            return false
        }
    }

    // MARK: - Get Active Projects

    /// Get only active projects
    func getActiveProjects() -> [Project] {
        projects.filter { $0.status == .active }
    }

    // MARK: - Search Projects

    /// Search projects by name
    func searchProjects(query: String) -> [Project] {
        guard !query.isEmpty else { return projects }
        return projects.filter {
            $0.name.localizedCaseInsensitiveContains(query) ||
            $0.address.localizedCaseInsensitiveContains(query)
        }
    }
}
