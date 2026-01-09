//
//  ProjectsRepository.swift
//  ConstructionManager
//
//  Repository for Projects feature with GraphQL and offline support
//

import Foundation
import Combine

// MARK: - Result Types

enum ProjectsResult<T> {
    case success(T)
    case error(String, isOffline: Bool)
    case loading
}

// MARK: - Models

struct ProjectSummary: Identifiable, Codable {
    let id: String
    let name: String
    let description: String?
    let status: String
    let startDate: Date?
    let endDate: Date?
    let address: ProjectAddress
    let dailyLogCount: Int
    let documentCount: Int
    let drawingCount: Int
    let crewCount: Int
    let openIncidentCount: Int
    let createdAt: Date
    let updatedAt: Date
}

struct ProjectDetail: Identifiable, Codable {
    let id: String
    let name: String
    let description: String?
    let status: String
    let startDate: Date?
    let endDate: Date?
    let address: ProjectAddress
    let client: ClientInfo?
    let team: [TeamMemberInfo]
    let dailyLogCount: Int
    let documentCount: Int
    let drawingCount: Int
    let crewCount: Int
    let openIncidentCount: Int
    let createdAt: Date
    let updatedAt: Date
}

struct ProjectAddress: Codable {
    let street: String?
    let city: String?
    let state: String?
    let zipCode: String?
    let country: String?
    let latitude: Double?
    let longitude: Double?
    let formatted: String
}

struct ClientInfo: Codable {
    let id: String
    let companyName: String
    let contactName: String?
    let email: String?
    let phone: String?
}

struct TeamMemberInfo: Identifiable, Codable {
    let id: String
    let name: String
    let email: String?
    let role: String
    let avatarUrl: String?
}

// MARK: - Repository

@MainActor
class ProjectsRepository: ObservableObject {
    static let shared = ProjectsRepository()

    @Published private(set) var projects: [ProjectSummary] = []
    @Published private(set) var isLoading = false
    @Published private(set) var isUsingCachedData = false
    @Published var error: String?

    private let graphQLClient = GraphQLClient.shared
    private let networkMonitor = NetworkMonitor.shared
    private let offlineDataStore = OfflineDataStore.shared

    private var fetchTask: Task<Void, Never>?
    private var lastFetchTime: Date?
    private let minFetchInterval: TimeInterval = 2.0

    private init() {}

    // MARK: - Fetch Projects

    func fetchProjects(
        status: String? = nil,
        search: String? = nil,
        forceRefresh: Bool = false
    ) async {
        // Skip if recently fetched
        if !forceRefresh, let lastFetch = lastFetchTime,
           Date().timeIntervalSince(lastFetch) < minFetchInterval {
            return
        }

        // Deduplicate requests
        if let existingTask = fetchTask {
            await existingTask.value
            return
        }

        fetchTask = Task {
            await performFetch(status: status, search: search, forceRefresh: forceRefresh)
        }

        await fetchTask?.value
        fetchTask = nil
    }

    private func performFetch(
        status: String?,
        search: String?,
        forceRefresh: Bool
    ) async {
        isLoading = true
        error = nil
        isUsingCachedData = false
        defer { isLoading = false }

        // Check network connectivity
        guard networkMonitor.isConnected else {
            loadFromOfflineCache()
            return
        }

        // TODO: Once Apollo iOS code generation is complete, use:
        // let query = GetProjectsQuery(
        //     status: status.map { GraphQLNullable.some(ProjectStatus(rawValue: $0) ?? .active) } ?? .null,
        //     search: search.map { GraphQLNullable.some($0) } ?? .null,
        //     page: .some(1),
        //     pageSize: .some(50)
        // )
        //
        // graphQLClient.apollo.fetch(query: query, cachePolicy: forceRefresh ? .fetchIgnoringCacheData : .returnCacheDataElseFetch) { [weak self] result in
        //     switch result {
        //     case .success(let graphQLResult):
        //         if let errors = graphQLResult.errors, !errors.isEmpty {
        //             self?.error = errors.first?.message
        //             self?.loadFromOfflineCache()
        //             return
        //         }
        //
        //         if let projects = graphQLResult.data?.projects.edges {
        //             self?.projects = projects.map { $0.node.toProjectSummary() }
        //             self?.lastFetchTime = Date()
        //             self?.offlineDataStore.saveProjects(self?.projects ?? [])
        //         }
        //
        //     case .failure(let error):
        //         self?.error = error.localizedDescription
        //         self?.loadFromOfflineCache()
        //     }
        // }

        // Fallback to REST while Apollo is being set up
        await fetchProjectsViaREST(status: status, search: search)
    }

    /// Fallback to REST API
    private func fetchProjectsViaREST(status: String?, search: String?) async {
        do {
            var queryItems: [URLQueryItem] = []
            if let status = status {
                queryItems.append(URLQueryItem(name: "status", value: status))
            }
            if let search = search {
                queryItems.append(URLQueryItem(name: "search", value: search))
            }

            let response: ProjectsResponse = try await APIClient.shared.get(
                "/projects",
                queryItems: queryItems.isEmpty ? nil : queryItems
            )

            self.projects = response.projects.map { apiProject in
                ProjectSummary(
                    id: apiProject.id,
                    name: apiProject.name,
                    description: apiProject.description,
                    status: apiProject.status,
                    startDate: apiProject.startDate,
                    endDate: apiProject.endDate,
                    address: ProjectAddress(
                        street: nil,
                        city: nil,
                        state: nil,
                        zipCode: nil,
                        country: nil,
                        latitude: apiProject.gpsLatitude,
                        longitude: apiProject.gpsLongitude,
                        formatted: apiProject.address ?? ""
                    ),
                    dailyLogCount: apiProject.dailyLogCount ?? 0,
                    documentCount: apiProject.documentCount ?? 0,
                    drawingCount: apiProject.drawingCount ?? 0,
                    crewCount: apiProject.crewCount ?? 0,
                    openIncidentCount: 0,
                    createdAt: apiProject.createdAt ?? Date(),
                    updatedAt: apiProject.updatedAt ?? Date()
                )
            }
            self.lastFetchTime = Date()

            // Cache for offline use
            cacheProjects(projects)

        } catch {
            self.error = error.localizedDescription
            loadFromOfflineCache()
        }
    }

    // MARK: - Get Single Project

    func getProject(id: String) async -> ProjectsResult<ProjectDetail> {
        guard networkMonitor.isConnected else {
            // TODO: Load from cache
            return .error("No internet connection", isOffline: true)
        }

        // TODO: Use GraphQL once code generation is complete
        // let query = GetProjectQuery(id: id)
        // graphQLClient.apollo.fetch(query: query) { result in ... }

        do {
            let response: ProjectResponse = try await APIClient.shared.get("/projects/\(id)")
            let apiProject = response.project

            let detail = ProjectDetail(
                id: apiProject.id,
                name: apiProject.name,
                description: apiProject.description,
                status: apiProject.status,
                startDate: apiProject.startDate,
                endDate: apiProject.endDate,
                address: ProjectAddress(
                    street: nil,
                    city: nil,
                    state: nil,
                    zipCode: nil,
                    country: nil,
                    latitude: apiProject.gpsLatitude,
                    longitude: apiProject.gpsLongitude,
                    formatted: apiProject.address ?? ""
                ),
                client: apiProject.client.map {
                    ClientInfo(
                        id: $0.id,
                        companyName: $0.companyName,
                        contactName: $0.contactName,
                        email: nil,
                        phone: nil
                    )
                },
                team: [],
                dailyLogCount: apiProject.dailyLogCount ?? 0,
                documentCount: apiProject.documentCount ?? 0,
                drawingCount: apiProject.drawingCount ?? 0,
                crewCount: apiProject.crewCount ?? 0,
                openIncidentCount: 0,
                createdAt: apiProject.createdAt ?? Date(),
                updatedAt: apiProject.updatedAt ?? Date()
            )

            return .success(detail)

        } catch {
            return .error(error.localizedDescription, isOffline: false)
        }
    }

    // MARK: - Offline Support

    private func loadFromOfflineCache() {
        let cached = loadCachedProjects()
        if !cached.isEmpty {
            self.projects = cached
            self.isUsingCachedData = true
        } else {
            self.error = "No internet connection and no cached data available"
        }
    }

    private func cacheProjects(_ projects: [ProjectSummary]) {
        guard let data = try? JSONEncoder().encode(projects) else { return }

        let fileManager = FileManager.default
        guard let cachesDir = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first else { return }

        let cacheFile = cachesDir.appendingPathComponent("cached_projects.json")
        try? data.write(to: cacheFile)
    }

    private func loadCachedProjects() -> [ProjectSummary] {
        let fileManager = FileManager.default
        guard let cachesDir = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first else { return [] }

        let cacheFile = cachesDir.appendingPathComponent("cached_projects.json")
        guard let data = try? Data(contentsOf: cacheFile),
              let projects = try? JSONDecoder().decode([ProjectSummary].self, from: data) else {
            return []
        }

        return projects
    }

    // MARK: - Search

    func searchProjects(query: String) -> [ProjectSummary] {
        guard !query.isEmpty else { return projects }
        return projects.filter {
            $0.name.localizedCaseInsensitiveContains(query) ||
            $0.address.formatted.localizedCaseInsensitiveContains(query)
        }
    }
}
