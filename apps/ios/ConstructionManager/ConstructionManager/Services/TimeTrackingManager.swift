//
//  TimeTrackingManager.swift
//  ConstructionManager
//
//  Shared time tracking state manager with API integration
//

import SwiftUI
import Combine
import CoreLocation

@MainActor
class TimeTrackingManager: ObservableObject {
    static let shared = TimeTrackingManager()

    @Published var entries: [TimeEntry] = []
    @Published var activeEntry: TimeEntry?
    @Published var pulseAnimation = false
    @Published var isLoading = false
    @Published var error: String?

    private var timer: Timer?
    private let apiClient = APIClient.shared
    private let locationManager = CLLocationManager()

    var isClockedIn: Bool {
        activeEntry != nil
    }

    var elapsedTimeFormatted: String {
        guard let entry = activeEntry else { return "0:00:00" }
        let duration = entry.duration
        let hours = Int(duration) / 3600
        let minutes = (Int(duration) % 3600) / 60
        let seconds = Int(duration) % 60
        return String(format: "%d:%02d:%02d", hours, minutes, seconds)
    }

    var todayHours: String {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())

        let todayEntries = entries.filter { entry in
            calendar.isDate(entry.clockIn, inSameDayAs: today)
        }

        let total = todayEntries.reduce(0.0) { $0 + $1.duration }
        let hours = total / 3600
        return String(format: "%.1f", max(0, hours))
    }

    var weekHours: String {
        let calendar = Calendar.current
        let today = Date()
        guard let weekStart = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: today)) else {
            return "0.0"
        }

        let weekEntries = entries.filter { entry in
            entry.clockIn >= weekStart
        }

        let total = weekEntries.reduce(0.0) { $0 + $1.duration }
        let hours = total / 3600
        return String(format: "%.1f", max(0, hours))
    }

    var activeProjectName: String? {
        activeEntry?.projectName
    }

    var clockInTime: String? {
        guard let entry = activeEntry else { return nil }
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: entry.clockIn)
    }

    private init() {
        // Fetch from API if authenticated
        if apiClient.hasValidToken() {
            Task {
                await fetchTimeEntries()
            }
        }
        // Don't load mock data - only show real entries
    }

    // MARK: - API Methods

    /// Fetch time entries from the API
    func fetchTimeEntries(projectId: String? = nil) async {
        guard apiClient.hasValidToken() else {
            // Not authenticated - show empty state, not mock data
            return
        }

        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            var queryItems: [URLQueryItem] = []
            if let projectId = projectId {
                queryItems.append(URLQueryItem(name: "projectId", value: projectId))
            }

            let response: TimeEntriesResponse = try await apiClient.get(
                "/time-entries",
                queryItems: queryItems.isEmpty ? nil : queryItems
            )

            self.entries = response.timeEntries.map { $0.toTimeEntry() }

            // Find active entry (one without clockOut)
            self.activeEntry = entries.first { $0.isActive }

            if activeEntry != nil {
                startTimer()
                pulseAnimation = true
            } else {
                stopTimer()
                pulseAnimation = false
            }
        } catch {
            self.error = error.localizedDescription
            print("Failed to fetch time entries: \(error)")
            // Don't fall back to mock data - keep existing state
        }
    }

    /// Clock in to a project via API
    func clockIn(to project: Project) async -> Bool {
        // Check if already clocked in
        if isClockedIn {
            self.error = "You are already clocked in. Please clock out first."
            return false
        }

        // Must be authenticated
        guard apiClient.hasValidToken() else {
            self.error = "You must be signed in to clock in."
            return false
        }

        isLoading = true
        error = nil
        defer { isLoading = false }

        // Get current location
        let location = getCurrentLocation()

        let request = CreateTimeEntryRequest(
            projectId: project.id,
            gpsInLat: location?.coordinate.latitude,
            gpsInLng: location?.coordinate.longitude
        )

        do {
            let response: TimeEntryResponse = try await apiClient.post("/time-entries", body: request)
            let newEntry = response.timeEntry.toTimeEntry()

            entries.insert(newEntry, at: 0)
            activeEntry = newEntry
            startTimer()
            pulseAnimation = true

            return true
        } catch {
            self.error = error.localizedDescription
            print("Failed to clock in: \(error)")
            return false
        }
    }

    /// Clock out via API
    func clockOut() async -> Bool {
        guard let currentEntry = activeEntry else { return false }

        // Must be authenticated
        guard apiClient.hasValidToken() else {
            self.error = "You must be signed in to clock out."
            return false
        }

        isLoading = true
        error = nil
        defer { isLoading = false }

        let location = getCurrentLocation()

        let request = UpdateTimeEntryRequest(
            clockOut: Date(),
            gpsOutLat: location?.coordinate.latitude,
            gpsOutLng: location?.coordinate.longitude
        )

        do {
            let response: TimeEntryResponse = try await apiClient.patch(
                "/time-entries/\(currentEntry.id)",
                body: request
            )

            let updatedEntry = response.timeEntry.toTimeEntry()

            // Update in local list
            if let index = entries.firstIndex(where: { $0.id == currentEntry.id }) {
                entries[index] = updatedEntry
            }

            activeEntry = nil
            stopTimer()
            pulseAnimation = false

            return true
        } catch {
            self.error = error.localizedDescription
            print("Failed to clock out: \(error)")
            return false
        }
    }

    // MARK: - Synchronous Wrappers (for UI convenience)

    func clockIn(to project: Project) {
        Task {
            await clockIn(to: project)
        }
    }

    func clockOut() {
        Task {
            await clockOut()
        }
    }

    // MARK: - Timer

    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            Task { @MainActor [weak self] in
                self?.objectWillChange.send()
            }
        }
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }

    // MARK: - Location

    private func getCurrentLocation() -> CLLocation? {
        // Request location permission if needed
        if locationManager.authorizationStatus == .notDetermined {
            locationManager.requestWhenInUseAuthorization()
        }

        return locationManager.location
    }

    // MARK: - Refresh

    func refresh() async {
        await fetchTimeEntries()
    }
}
