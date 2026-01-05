//
//  DailyLogsRepository.swift
//  ConstructionManager
//
//  Repository for Daily Logs feature with GraphQL and offline support
//

import Foundation
import Combine

// MARK: - Result Types

enum DailyLogsResult<T> {
    case success(T)
    case error(String, isOffline: Bool)
    case loading
}

// MARK: - Models

struct DailyLogSummary: Identifiable, Codable {
    let id: String
    let date: Date
    let status: String
    let notes: String?
    let projectId: String
    let projectName: String
    let submitterName: String
    let photoCount: Int
    let crewCount: Int
    let entriesCount: Int
    let totalLaborHours: Double
    let isPending: Bool

    init(
        id: String,
        date: Date,
        status: String,
        notes: String?,
        projectId: String,
        projectName: String,
        submitterName: String,
        photoCount: Int = 0,
        crewCount: Int = 0,
        entriesCount: Int = 0,
        totalLaborHours: Double = 0,
        isPending: Bool = false
    ) {
        self.id = id
        self.date = date
        self.status = status
        self.notes = notes
        self.projectId = projectId
        self.projectName = projectName
        self.submitterName = submitterName
        self.photoCount = photoCount
        self.crewCount = crewCount
        self.entriesCount = entriesCount
        self.totalLaborHours = totalLaborHours
        self.isPending = isPending
    }
}

struct DailyLogDetailModel: Identifiable, Codable {
    let id: String
    let date: Date
    let status: String
    let notes: String?
    let weatherDelay: Bool
    let weatherDelayNotes: String?
    let gpsLatitude: Double?
    let gpsLongitude: Double?
    let projectId: String
    let projectName: String
    let projectAddress: String?
    let submitterId: String
    let submitterName: String
    let submitterEmail: String?
    let approverId: String?
    let approverName: String?
    let photos: [DailyLogPhotoModel]
    let entries: [DailyLogEntryModel]
    let crewMembers: [CrewMemberModel]
    let materials: [MaterialModel]
    let issues: [IssueModel]
    let photoCount: Int
    let crewCount: Int
    let entriesCount: Int
    let totalLaborHours: Double
    let createdAt: Date
    let updatedAt: Date
}

struct DailyLogPhotoModel: Identifiable, Codable {
    let id: String
    let url: String
    let caption: String?
    let gpsLatitude: Double?
    let gpsLongitude: Double?
}

struct DailyLogEntryModel: Identifiable, Codable {
    let id: String
    let activityName: String
    let locationNames: [String]
    let statusName: String?
    let percentComplete: Int?
    let notes: String?
}

struct CrewMemberModel: Identifiable, Codable {
    let id: String
    let name: String
    let hours: Double
    let trade: String?
}

struct MaterialModel: Identifiable, Codable {
    let id: String
    let name: String
    let quantity: Double
    let unit: String?
    let notes: String?
}

struct IssueModel: Identifiable, Codable {
    let id: String
    let description: String
    let severity: String
    let resolved: Bool
}

// MARK: - Repository

@MainActor
class DailyLogsRepository: ObservableObject {
    static let shared = DailyLogsRepository()

    @Published private(set) var dailyLogs: [DailyLogSummary] = []
    @Published private(set) var isLoading = false
    @Published private(set) var isUsingCachedData = false
    @Published var error: String?

    private let graphQLClient = GraphQLClient.shared
    private let networkMonitor = NetworkMonitor.shared
    private let syncQueue = SyncQueue.shared

    private var fetchTask: Task<Void, Never>?
    private var lastFetchTime: Date?
    private let minFetchInterval: TimeInterval = 2.0

    private init() {}

    // MARK: - Fetch Daily Logs

    func fetchDailyLogs(
        projectId: String? = nil,
        status: String? = nil,
        startDate: Date? = nil,
        endDate: Date? = nil,
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
            await performFetch(
                projectId: projectId,
                status: status,
                startDate: startDate,
                endDate: endDate,
                forceRefresh: forceRefresh
            )
        }

        await fetchTask?.value
        fetchTask = nil
    }

    private func performFetch(
        projectId: String?,
        status: String?,
        startDate: Date?,
        endDate: Date?,
        forceRefresh: Bool
    ) async {
        isLoading = true
        error = nil
        isUsingCachedData = false
        defer { isLoading = false }

        // Check network connectivity
        guard networkMonitor.isConnected else {
            loadFromOfflineCache(projectId: projectId)
            return
        }

        // TODO: Use GraphQL once code generation is complete
        // let query = GetDailyLogsQuery(
        //     projectId: projectId.map { .some($0) } ?? .null,
        //     status: status.map { .some(DailyLogStatus(rawValue: $0) ?? .draft) } ?? .null,
        //     startDate: startDate.map { .some(ISO8601DateFormatter().string(from: $0)) } ?? .null,
        //     endDate: endDate.map { .some(ISO8601DateFormatter().string(from: $0)) } ?? .null,
        //     page: .some(1),
        //     pageSize: .some(50)
        // )

        // Fallback to REST
        await fetchDailyLogsViaREST(projectId: projectId, status: status)
    }

    /// Fallback to REST API
    private func fetchDailyLogsViaREST(projectId: String?, status: String?) async {
        do {
            var queryItems: [URLQueryItem] = []
            if let projectId = projectId {
                queryItems.append(URLQueryItem(name: "projectId", value: projectId))
            }
            if let status = status {
                queryItems.append(URLQueryItem(name: "status", value: status))
            }

            let response: DailyLogsResponse = try await APIClient.shared.get(
                "/daily-logs",
                queryItems: queryItems.isEmpty ? nil : queryItems
            )

            self.dailyLogs = response.dailyLogs.map { apiLog in
                DailyLogSummary(
                    id: apiLog.id,
                    date: apiLog.date,
                    status: apiLog.status,
                    notes: apiLog.notes,
                    projectId: apiLog.projectId,
                    projectName: apiLog.projectName ?? "Unknown Project",
                    submitterName: apiLog.submitterName ?? "Unknown",
                    photoCount: 0,
                    crewCount: apiLog.crewCount,
                    entriesCount: apiLog.entriesCount ?? 0,
                    totalLaborHours: apiLog.totalHours,
                    isPending: false
                )
            }
            self.lastFetchTime = Date()

            // Cache for offline use
            cacheDailyLogs(dailyLogs, projectId: projectId)

        } catch {
            self.error = error.localizedDescription
            loadFromOfflineCache(projectId: projectId)
        }
    }

    // MARK: - Get Single Daily Log

    func getDailyLog(id: String) async -> DailyLogsResult<DailyLogDetailModel> {
        guard networkMonitor.isConnected else {
            // TODO: Load from cache
            return .error("No internet connection", isOffline: true)
        }

        // TODO: Use GraphQL once code generation is complete
        // let query = GetDailyLogQuery(id: id)

        do {
            let response: DailyLogResponse = try await APIClient.shared.get("/daily-logs/\(id)")
            let apiLog = response.dailyLog

            let detail = DailyLogDetailModel(
                id: apiLog.id,
                date: apiLog.date,
                status: apiLog.status,
                notes: apiLog.notes,
                weatherDelay: apiLog.weatherDelay,
                weatherDelayNotes: apiLog.weatherDelayNotes,
                gpsLatitude: nil,
                gpsLongitude: nil,
                projectId: apiLog.projectId,
                projectName: apiLog.projectName ?? "Unknown Project",
                projectAddress: nil,
                submitterId: apiLog.submittedBy ?? "",
                submitterName: apiLog.submitterName ?? "Unknown",
                submitterEmail: nil,
                approverId: nil,
                approverName: nil,
                photos: [],
                entries: [],
                crewMembers: [],
                materials: [],
                issues: [],
                photoCount: 0,
                crewCount: apiLog.crewCount,
                entriesCount: apiLog.entriesCount ?? 0,
                totalLaborHours: apiLog.totalHours,
                createdAt: apiLog.createdAt,
                updatedAt: apiLog.updatedAt
            )

            return .success(detail)

        } catch {
            return .error(error.localizedDescription, isOffline: false)
        }
    }

    // MARK: - Create Daily Log

    func createDailyLog(
        projectId: String,
        date: Date,
        notes: String?,
        weatherDelay: Bool = false,
        weatherDelayNotes: String? = nil,
        gpsLatitude: Double? = nil,
        gpsLongitude: Double? = nil
    ) async -> DailyLogsResult<String> {
        let request = CreateDailyLogRequest(
            projectId: projectId,
            date: date,
            notes: notes,
            weatherDelay: weatherDelay,
            weatherDelayNotes: weatherDelayNotes,
            gpsLatitude: gpsLatitude,
            gpsLongitude: gpsLongitude
        )

        guard networkMonitor.isConnected else {
            // Queue for offline sync
            return createDailyLogOffline(request: request)
        }

        // TODO: Use GraphQL mutation
        // let mutation = CreateDailyLogMutation(input: CreateDailyLogInput(...))

        do {
            let response: DailyLogResponse = try await APIClient.shared.post(
                "/daily-logs",
                body: request
            )

            // Refresh list
            await fetchDailyLogs(projectId: projectId, forceRefresh: true)

            return .success(response.dailyLog.id)

        } catch {
            // Queue for offline sync on failure
            return createDailyLogOffline(request: request)
        }
    }

    private func createDailyLogOffline(request: CreateDailyLogRequest) -> DailyLogsResult<String> {
        let tempId = "temp_\(UUID().uuidString)"

        // Create local entry
        let localLog = DailyLogSummary(
            id: tempId,
            date: request.date,
            status: "DRAFT",
            notes: request.notes,
            projectId: request.projectId,
            projectName: "",
            submitterName: "",
            isPending: true
        )

        dailyLogs.insert(localLog, at: 0)

        // Queue for sync
        syncQueue.enqueue(
            type: .create,
            resourceType: .dailyLog,
            resourceId: tempId,
            payload: request
        )

        return .success(tempId)
    }

    // MARK: - Submit Daily Log

    func submitDailyLog(id: String) async -> DailyLogsResult<Void> {
        guard networkMonitor.isConnected else {
            // Queue for offline sync
            syncQueue.enqueue(
                type: .submit,
                resourceType: .dailyLog,
                resourceId: id,
                payload: ["id": id]
            )
            return .success(())
        }

        // TODO: Use GraphQL mutation
        // let mutation = SubmitDailyLogMutation(id: id)

        do {
            let _: DailyLogResponse = try await APIClient.shared.post(
                "/daily-logs/\(id)/submit",
                body: EmptyBody()
            )
            return .success(())
        } catch {
            return .error(error.localizedDescription, isOffline: false)
        }
    }

    // MARK: - Offline Cache

    private func loadFromOfflineCache(projectId: String?) {
        let cached = loadCachedDailyLogs(projectId: projectId)
        if !cached.isEmpty {
            self.dailyLogs = cached
            self.isUsingCachedData = true
        } else {
            self.error = "No internet connection and no cached data available"
        }
    }

    private func cacheDailyLogs(_ logs: [DailyLogSummary], projectId: String?) {
        guard let data = try? JSONEncoder().encode(logs) else { return }

        let fileManager = FileManager.default
        guard let cachesDir = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first else { return }

        let filename = projectId != nil ? "cached_daily_logs_\(projectId!).json" : "cached_daily_logs.json"
        let cacheFile = cachesDir.appendingPathComponent(filename)
        try? data.write(to: cacheFile)
    }

    private func loadCachedDailyLogs(projectId: String?) -> [DailyLogSummary] {
        let fileManager = FileManager.default
        guard let cachesDir = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first else { return [] }

        let filename = projectId != nil ? "cached_daily_logs_\(projectId!).json" : "cached_daily_logs.json"
        let cacheFile = cachesDir.appendingPathComponent(filename)

        guard let data = try? Data(contentsOf: cacheFile),
              let logs = try? JSONDecoder().decode([DailyLogSummary].self, from: data) else {
            return []
        }

        return logs
    }
}

// MARK: - Request Models

private struct EmptyBody: Encodable {}
