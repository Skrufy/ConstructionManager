//
//  TimeTrackingRepository.swift
//  ConstructionManager
//
//  Repository for Time Tracking feature with GraphQL and offline support
//

import Foundation
import Combine

// MARK: - Result Types

enum TimeTrackingResult<T> {
    case success(T)
    case error(String, isOffline: Bool)
    case loading
}

// MARK: - Models

struct TimeEntrySummary: Identifiable, Codable {
    let id: String
    let clockIn: Date
    let clockOut: Date?
    let breakMinutes: Int
    let status: String
    let notes: String?
    let totalHours: Double?
    let projectId: String
    let projectName: String
    let userId: String
    let userName: String
    let isPending: Bool

    init(
        id: String,
        clockIn: Date,
        clockOut: Date? = nil,
        breakMinutes: Int = 0,
        status: String,
        notes: String? = nil,
        totalHours: Double? = nil,
        projectId: String,
        projectName: String,
        userId: String,
        userName: String,
        isPending: Bool = false
    ) {
        self.id = id
        self.clockIn = clockIn
        self.clockOut = clockOut
        self.breakMinutes = breakMinutes
        self.status = status
        self.notes = notes
        self.totalHours = totalHours
        self.projectId = projectId
        self.projectName = projectName
        self.userId = userId
        self.userName = userName
        self.isPending = isPending
    }
}

// MARK: - Repository

@MainActor
class TimeTrackingRepository: ObservableObject {
    static let shared = TimeTrackingRepository()

    @Published private(set) var timeEntries: [TimeEntrySummary] = []
    @Published private(set) var activeTimeEntry: TimeEntrySummary?
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

    // MARK: - Fetch Time Entries

    func fetchTimeEntries(
        projectId: String? = nil,
        userId: String? = nil,
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
                userId: userId,
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
        userId: String?,
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
            loadFromOfflineCache()
            return
        }

        // TODO: Use GraphQL once code generation is complete
        // let query = GetTimeEntriesQuery(
        //     projectId: projectId.map { .some($0) } ?? .null,
        //     userId: userId.map { .some($0) } ?? .null,
        //     ...
        // )

        // Fallback to REST
        await fetchTimeEntriesViaREST(projectId: projectId, userId: userId)
    }

    /// Fallback to REST API
    private func fetchTimeEntriesViaREST(projectId: String?, userId: String?) async {
        do {
            var queryItems: [URLQueryItem] = []
            if let projectId = projectId {
                queryItems.append(URLQueryItem(name: "projectId", value: projectId))
            }
            if let userId = userId {
                queryItems.append(URLQueryItem(name: "userId", value: userId))
            }

            let response: TimeEntriesResponse = try await APIClient.shared.get(
                "/time-entries",
                queryItems: queryItems.isEmpty ? nil : queryItems
            )

            self.timeEntries = response.timeEntries.map { apiEntry in
                TimeEntrySummary(
                    id: apiEntry.id,
                    clockIn: apiEntry.clockIn,
                    clockOut: apiEntry.clockOut,
                    breakMinutes: 0,
                    status: apiEntry.status,
                    notes: apiEntry.notes,
                    totalHours: nil,
                    projectId: apiEntry.projectId,
                    projectName: apiEntry.projectName ?? "Unknown Project",
                    userId: apiEntry.userId,
                    userName: apiEntry.userName ?? "Unknown"
                )
            }
            self.lastFetchTime = Date()

            // Check for active entry
            self.activeTimeEntry = timeEntries.first { $0.clockOut == nil && $0.status == "PENDING" }

            // Cache for offline use
            cacheTimeEntries(timeEntries)

        } catch {
            self.error = error.localizedDescription
            loadFromOfflineCache()
        }
    }

    // MARK: - Check Active Entry

    func checkActiveTimeEntry() async {
        guard networkMonitor.isConnected else {
            // Use cached active entry if available
            return
        }

        // TODO: Use GraphQL
        // let query = GetActiveTimeEntryQuery()

        // For now, just filter from existing entries
        activeTimeEntry = timeEntries.first { $0.clockOut == nil && $0.status == "PENDING" }
    }

    // MARK: - Clock In

    func clockIn(
        projectId: String,
        gpsLatitude: Double? = nil,
        gpsLongitude: Double? = nil,
        notes: String? = nil
    ) async -> TimeTrackingResult<TimeEntrySummary> {
        let request = ClockInRequest(
            projectId: projectId,
            gpsInLat: gpsLatitude,
            gpsInLng: gpsLongitude,
            notes: notes
        )

        guard networkMonitor.isConnected else {
            // Queue for offline sync
            return clockInOffline(request: request, projectId: projectId)
        }

        // TODO: Use GraphQL mutation
        // let mutation = ClockInMutation(input: ClockInInput(...))

        do {
            let response: TimeEntryResponse = try await APIClient.shared.post(
                "/time-entries/clock-in",
                body: request
            )

            let entry = response.timeEntry
            let summary = TimeEntrySummary(
                id: entry.id,
                clockIn: entry.clockIn,
                status: entry.status,
                projectId: entry.projectId,
                projectName: entry.projectName ?? "Unknown Project",
                userId: entry.userId,
                userName: entry.userName ?? "Unknown"
            )

            self.activeTimeEntry = summary
            return .success(summary)

        } catch {
            return clockInOffline(request: request, projectId: projectId)
        }
    }

    private func clockInOffline(request: ClockInRequest, projectId: String) -> TimeTrackingResult<TimeEntrySummary> {
        let tempId = "temp_\(UUID().uuidString)"

        let localEntry = TimeEntrySummary(
            id: tempId,
            clockIn: Date(),
            status: "PENDING",
            projectId: projectId,
            projectName: "",
            userId: "",
            userName: "",
            isPending: true
        )

        self.activeTimeEntry = localEntry
        timeEntries.insert(localEntry, at: 0)

        // Queue for sync
        syncQueue.enqueue(
            type: .create,
            resourceType: .timeEntry,
            resourceId: tempId,
            payload: request
        )

        return .success(localEntry)
    }

    // MARK: - Clock Out

    func clockOut(
        id: String,
        gpsLatitude: Double? = nil,
        gpsLongitude: Double? = nil,
        breakMinutes: Int = 0,
        notes: String? = nil
    ) async -> TimeTrackingResult<TimeEntrySummary> {
        let request = ClockOutRequest(
            clockOut: Date(),
            gpsOutLat: gpsLatitude,
            gpsOutLng: gpsLongitude,
            breakMinutes: breakMinutes,
            notes: notes
        )

        guard networkMonitor.isConnected else {
            // Queue for offline sync
            return clockOutOffline(id: id, request: request)
        }

        // TODO: Use GraphQL mutation
        // let mutation = ClockOutMutation(id: id, input: ClockOutInput(...))

        do {
            let response: TimeEntryResponse = try await APIClient.shared.post(
                "/time-entries/\(id)/clock-out",
                body: request
            )

            let entry = response.timeEntry
            let summary = TimeEntrySummary(
                id: entry.id,
                clockIn: entry.clockIn,
                clockOut: entry.clockOut,
                breakMinutes: 0,
                status: entry.status,
                notes: entry.notes,
                projectId: entry.projectId,
                projectName: entry.projectName ?? "Unknown Project",
                userId: entry.userId,
                userName: entry.userName ?? "Unknown"
            )

            self.activeTimeEntry = nil

            // Update in list
            if let index = timeEntries.firstIndex(where: { $0.id == id }) {
                timeEntries[index] = summary
            }

            return .success(summary)

        } catch {
            return clockOutOffline(id: id, request: request)
        }
    }

    private func clockOutOffline(id: String, request: ClockOutRequest) -> TimeTrackingResult<TimeEntrySummary> {
        // Update local entry
        if let index = timeEntries.firstIndex(where: { $0.id == id }) {
            var updatedEntry = timeEntries[index]
            updatedEntry = TimeEntrySummary(
                id: updatedEntry.id,
                clockIn: updatedEntry.clockIn,
                clockOut: request.clockOut,
                breakMinutes: request.breakMinutes ?? 0,
                status: updatedEntry.status,
                notes: request.notes,
                projectId: updatedEntry.projectId,
                projectName: updatedEntry.projectName,
                userId: updatedEntry.userId,
                userName: updatedEntry.userName,
                isPending: true
            )
            timeEntries[index] = updatedEntry
            self.activeTimeEntry = nil

            // Queue for sync
            syncQueue.enqueue(
                type: .update,
                resourceType: .timeEntry,
                resourceId: id,
                payload: request
            )

            return .success(updatedEntry)
        }

        return .error("Time entry not found", isOffline: true)
    }

    // MARK: - Offline Cache

    private func loadFromOfflineCache() {
        let cached = loadCachedTimeEntries()
        if !cached.isEmpty {
            self.timeEntries = cached
            self.activeTimeEntry = cached.first { $0.clockOut == nil && $0.status == "PENDING" }
            self.isUsingCachedData = true
        } else {
            self.error = "No internet connection and no cached data available"
        }
    }

    private func cacheTimeEntries(_ entries: [TimeEntrySummary]) {
        guard let data = try? JSONEncoder().encode(entries) else { return }

        let fileManager = FileManager.default
        guard let cachesDir = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first else { return }

        let cacheFile = cachesDir.appendingPathComponent("cached_time_entries.json")
        try? data.write(to: cacheFile)
    }

    private func loadCachedTimeEntries() -> [TimeEntrySummary] {
        let fileManager = FileManager.default
        guard let cachesDir = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first else { return [] }

        let cacheFile = cachesDir.appendingPathComponent("cached_time_entries.json")

        guard let data = try? Data(contentsOf: cacheFile),
              let entries = try? JSONDecoder().decode([TimeEntrySummary].self, from: data) else {
            return []
        }

        return entries
    }
}

// MARK: - Request Models

struct ClockInRequest: Encodable {
    let projectId: String
    let gpsInLat: Double?
    let gpsInLng: Double?
    let notes: String?
}

struct ClockOutRequest: Encodable {
    let clockOut: Date
    let gpsOutLat: Double?
    let gpsOutLng: Double?
    let breakMinutes: Int?
    let notes: String?
}
