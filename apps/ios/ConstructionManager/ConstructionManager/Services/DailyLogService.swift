//
//  DailyLogService.swift
//  ConstructionManager
//
//  Service for daily log API calls
//

import Foundation
import Combine

@MainActor
class DailyLogService: ObservableObject {
    static let shared = DailyLogService()

    @Published var dailyLogs: [DailyLog] = []
    @Published var isLoading = false
    @Published var error: String?
    @Published var isUsingCachedData = false

    private let apiClient = APIClient.shared
    private let networkMonitor = NetworkMonitor.shared
    private let offlineDataStore = OfflineDataStore.shared
    private let syncQueue = SyncQueue.shared

    // Request deduplication
    private var fetchTask: Task<Void, Never>?
    private var lastFetchTime: Date?
    private let minFetchInterval: TimeInterval = 2.0

    private init() {}

    // MARK: - Fetch Daily Logs

    func fetchDailyLogs(projectId: String? = nil, date: Date? = nil, force: Bool = false) async {
        // Skip if we just fetched recently (unless forced or filters are specified)
        let hasFilters = projectId != nil || date != nil
        if !force && !hasFilters, let lastFetch = lastFetchTime, Date().timeIntervalSince(lastFetch) < minFetchInterval {
            print("[DailyLogService] Skipping fetch - too soon since last fetch")
            return
        }

        // If there's already a fetch in progress with no filters, wait for it
        if let existingTask = fetchTask, !hasFilters {
            print("[DailyLogService] Reusing existing fetch task")
            await existingTask.value
            return
        }

        // Create a new fetch task
        let task = Task {
            await performFetch(projectId: projectId, date: date)
        }

        if !hasFilters {
            fetchTask = task
        }

        await task.value

        if !hasFilters {
            fetchTask = nil
        }
    }

    private func performFetch(projectId: String?, date: Date?) async {
        isLoading = true
        error = nil
        isUsingCachedData = false
        defer { isLoading = false }

        // Check network connectivity
        guard networkMonitor.isConnected else {
            loadFromOfflineCache()
            return
        }

        do {
            var queryItems: [URLQueryItem] = []
            if let projectId = projectId {
                queryItems.append(URLQueryItem(name: "projectId", value: projectId))
            }
            if let date = date {
                let formatter = ISO8601DateFormatter()
                queryItems.append(URLQueryItem(name: "date", value: formatter.string(from: date)))
            }

            let response: DailyLogsAPIResponse = try await apiClient.get(
                "/daily-logs",
                queryItems: queryItems.isEmpty ? nil : queryItems
            )

            self.dailyLogs = response.dailyLogs.map { $0.toDailyLog() }
            self.lastFetchTime = Date()

            // Save to cache for offline use
            offlineDataStore.saveDailyLogs(self.dailyLogs)
        } catch {
            self.error = error.localizedDescription
            print("Failed to fetch daily logs: \(error)")

            // Fall back to cached data
            loadFromOfflineCache()
        }
    }

    // MARK: - Offline Support

    private func loadFromOfflineCache() {
        let cachedLogs = offlineDataStore.loadDailyLogs()
        if !cachedLogs.isEmpty {
            self.dailyLogs = cachedLogs
            self.isUsingCachedData = true
            print("[DailyLogService] Loaded \(cachedLogs.count) logs from cache")
        } else {
            self.error = "No internet connection and no cached data available"
        }
    }

    func loadFromCache(_ logs: [DailyLog]) {
        self.dailyLogs = logs
        self.isUsingCachedData = true
    }

    // MARK: - Refresh

    func refresh() async {
        await fetchDailyLogs()
    }

    // MARK: - Create Daily Log

    func createDailyLog(
        projectId: String,
        date: Date,
        notes: String?,
        weatherDelay: Bool = false,
        weatherDelayNotes: String? = nil,
        crewCount: Int = 0,
        totalHours: Double = 0,
        status: String = "DRAFT",
        entries: [DailyLogEntryRequest]? = nil
    ) async throws -> DailyLog {
        let request = CreateDailyLogAPIRequest(
            projectId: projectId,
            date: date,
            notes: notes,
            weatherDelay: weatherDelay,
            weatherDelayNotes: weatherDelayNotes,
            crewCount: crewCount,
            totalHours: totalHours,
            status: status,
            entries: entries
        )

        let response: DailyLogCreateResponse = try await apiClient.post("/daily-logs", body: request)
        let newLog = response.dailyLog.toDailyLog()

        // Add to local list
        dailyLogs.insert(newLog, at: 0)

        return newLog
    }

    // MARK: - Update Daily Log

    func updateDailyLog(
        id: String,
        notes: String? = nil,
        weatherDelay: Bool? = nil,
        weatherDelayNotes: String? = nil,
        crewCount: Int? = nil,
        totalHours: Double? = nil,
        status: String? = nil
    ) async throws -> DailyLog {
        let request = UpdateDailyLogAPIRequest(
            notes: notes,
            weatherDelay: weatherDelay,
            weatherDelayNotes: weatherDelayNotes,
            crewCount: crewCount,
            totalHours: totalHours,
            status: status
        )

        let response: DailyLogCreateResponse = try await apiClient.patch("/daily-logs/\(id)", body: request)
        let updatedLog = response.dailyLog.toDailyLog()

        // Update local list
        if let index = dailyLogs.firstIndex(where: { $0.id == id }) {
            dailyLogs[index] = updatedLog
        }

        return updatedLog
    }

    // MARK: - Delete Daily Log

    func deleteDailyLog(id: String) async throws {
        try await apiClient.delete("/daily-logs/\(id)")

        // Remove from local list
        dailyLogs.removeAll { $0.id == id }
    }

    // MARK: - Submit Daily Log (change status to SUBMITTED)

    func submitDailyLog(id: String) async throws -> DailyLog {
        return try await updateDailyLog(id: id, status: "SUBMITTED")
    }

    // MARK: - Full Update Daily Log (with all related data)

    func updateDailyLogFull(
        id: String,
        projectId: String,
        date: Date,
        notes: String?,
        weatherDelay: Bool,
        weatherDelayNotes: String?,
        crewCount: Int,
        totalHours: Double,
        status: String? = nil,
        entries: [DailyLogEntryRequest]?,
        materials: [DailyLogMaterialRequest]?,
        issues: [DailyLogIssueRequest]?,
        visitors: [DailyLogVisitorRequest]?,
        weatherData: WeatherData?
    ) async throws -> DailyLog {
        // Convert WeatherData to WeatherDataRequest
        var weatherRequest: WeatherDataRequest? = nil
        if let weather = weatherData {
            weatherRequest = WeatherDataRequest(
                temp: weather.temperature,
                conditions: weather.condition,
                humidity: Double(weather.humidity),
                windSpeed: weather.windSpeed
            )
        }

        let request = FullUpdateDailyLogAPIRequest(
            projectId: projectId,
            date: date,
            notes: notes,
            weatherDelay: weatherDelay,
            weatherDelayNotes: weatherDelayNotes,
            crewCount: crewCount,
            totalHours: totalHours,
            status: status,
            entries: entries,
            materials: materials,
            issues: issues,
            visitors: visitors,
            weatherData: weatherRequest
        )

        let response: DailyLogCreateResponse = try await apiClient.put("/daily-logs/\(id)", body: request)
        let updatedLog = response.dailyLog.toDailyLog()

        // Update local list
        if let index = dailyLogs.firstIndex(where: { $0.id == id }) {
            dailyLogs[index] = updatedLog
        }

        return updatedLog
    }
}

// MARK: - API Response Models

struct DailyLogsAPIResponse: Decodable {
    let dailyLogs: [DailyLogAPIModel]
}

struct DailyLogAPIModel: Decodable {
    let id: String
    let projectId: String
    let submittedBy: String?
    let date: Date
    let notes: String?
    let status: String
    let weather: WeatherDataAPI?
    let weatherDelay: Bool?
    let weatherDelayNotes: String?
    let crewCount: Int?
    let totalHours: Double?
    let createdAt: Date
    let updatedAt: Date?

    // Flat fields from API (not nested objects)
    let projectName: String?
    let submitterName: String?

    // Flat count fields from API
    let entriesCount: Int?
    let materialsCount: Int?
    let issuesCount: Int?

    struct WeatherDataAPI: Decodable {
        let temp: Double?
        let conditions: String?
        let humidity: Double?
        let windSpeed: Double?
    }

    func toDailyLog() -> DailyLog {
        // Map status string to enum
        let mappedStatus: DailyLog.DailyLogStatus
        switch status.uppercased() {
        case "DRAFT": mappedStatus = .draft
        case "SUBMITTED": mappedStatus = .submitted
        case "APPROVED": mappedStatus = .approved
        case "REJECTED": mappedStatus = .rejected
        default: mappedStatus = .draft
        }

        // Convert weather data
        var weatherData: WeatherData? = nil
        if let wd = weather {
            weatherData = WeatherData(
                temperature: wd.temp ?? 0,
                condition: wd.conditions ?? "Unknown",
                humidity: Int(wd.humidity ?? 0),
                windSpeed: wd.windSpeed ?? 0,
                icon: nil
            )
        }

        return DailyLog(
            id: id,
            projectId: projectId,
            projectName: projectName,
            submittedBy: submittedBy,
            submitterName: submitterName,
            date: date,
            notes: notes,
            weatherDelay: weatherDelay ?? false,
            weatherDelayNotes: weatherDelayNotes,
            status: mappedStatus,
            weather: weatherData,
            photoUrls: nil,
            crewCount: crewCount ?? 0,
            totalHours: totalHours ?? 0,
            entriesCount: entriesCount ?? 0,
            materialsCount: materialsCount ?? 0,
            issuesCount: issuesCount ?? 0,
            createdAt: createdAt,
            updatedAt: updatedAt ?? createdAt
        )
    }
}

// MARK: - Request Models

struct CreateDailyLogAPIRequest: Encodable {
    let projectId: String
    let date: Date
    let notes: String?
    let weatherDelay: Bool
    let weatherDelayNotes: String?
    let crewCount: Int
    let totalHours: Double
    let status: String
    let entries: [DailyLogEntryRequest]?
}

struct UpdateDailyLogAPIRequest: Encodable {
    let notes: String?
    let weatherDelay: Bool?
    let weatherDelayNotes: String?
    let crewCount: Int?
    let totalHours: Double?
    let status: String?
}

struct FullUpdateDailyLogAPIRequest: Encodable {
    let projectId: String
    let date: Date
    let notes: String?
    let weatherDelay: Bool
    let weatherDelayNotes: String?
    let crewCount: Int
    let totalHours: Double
    let status: String?
    let entries: [DailyLogEntryRequest]?
    let materials: [DailyLogMaterialRequest]?
    let issues: [DailyLogIssueRequest]?
    let visitors: [DailyLogVisitorRequest]?
    let weatherData: WeatherDataRequest?
}

struct DailyLogMaterialRequest: Encodable {
    let material: String
    let quantity: Double
    let unit: String
    let notes: String?
}

struct DailyLogIssueRequest: Encodable {
    let issueType: String
    let delayHours: Double
    let description: String?
}

struct DailyLogVisitorRequest: Encodable {
    let visitorType: String
    let time: String?
    let result: String?
    let notes: String?
}

struct WeatherDataRequest: Encodable {
    let temp: Double?
    let conditions: String?
    let humidity: Double?
    let windSpeed: Double?
}

struct DailyLogEntryRequest: Encodable {
    let activity: String
    let status: String?
    let locationBuilding: String?
    let locationFloor: String?
    let locationZone: String?
    let percentComplete: Int?
    let notes: String?
}

struct DailyLogCreateResponse: Decodable {
    let dailyLog: DailyLogAPIModel
}
