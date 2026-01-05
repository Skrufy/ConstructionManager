//
//  ScheduleService.swift
//  ConstructionManager
//
//  Service for crew scheduling
//

import Foundation
import Combine

@MainActor
class ScheduleService: ObservableObject {
    static let shared = ScheduleService()

    @Published var schedules: [Schedule] = []
    @Published var isLoading = false
    @Published var error: String?

    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Fetch Schedules

    func fetchSchedules(projectId: String? = nil, startDate: Date? = nil, endDate: Date? = nil) async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            var endpoint = "/scheduling"
            var params: [String] = []

            if let projectId = projectId {
                params.append("project_id=\(projectId)")
            }
            if let startDate = startDate {
                let formatter = ISO8601DateFormatter()
                params.append("start_date=\(formatter.string(from: startDate))")
            }
            if let endDate = endDate {
                let formatter = ISO8601DateFormatter()
                params.append("end_date=\(formatter.string(from: endDate))")
            }

            if !params.isEmpty {
                endpoint += "?" + params.joined(separator: "&")
            }

            schedules = try await apiClient.get(endpoint)
        } catch {
            print("Failed to fetch schedules: \(error)")
            self.error = error.localizedDescription
            schedules = Schedule.mockSchedules
        }
    }

    // MARK: - Fetch Today's Schedules

    func fetchTodaysSchedules() async {
        let today = Calendar.current.startOfDay(for: Date())
        guard let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: today) else { return }
        await fetchSchedules(startDate: today, endDate: tomorrow)
    }

    // MARK: - Fetch Week's Schedules

    func fetchWeekSchedules() async {
        let today = Calendar.current.startOfDay(for: Date())
        guard let weekLater = Calendar.current.date(byAdding: .day, value: 7, to: today) else { return }
        await fetchSchedules(startDate: today, endDate: weekLater)
    }

    // MARK: - Create Schedule Request
    struct CreateScheduleRequest: Encodable {
        let projectId: String
        let date: Date
        let startTime: String?
        let endTime: String?
        let notes: String?
        let status: String?
    }

    func createSchedule(_ schedule: Schedule) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            // Format times as HH:mm strings for the API
            let timeFormatter = DateFormatter()
            timeFormatter.dateFormat = "HH:mm"

            let request = CreateScheduleRequest(
                projectId: schedule.projectId,
                date: schedule.date,
                startTime: schedule.startTime.map { timeFormatter.string(from: $0) },
                endTime: schedule.endTime.map { timeFormatter.string(from: $0) },
                notes: schedule.notes,
                status: schedule.status.rawValue
            )

            print("[ScheduleService] Creating schedule with projectId: \(request.projectId), date: \(request.date)")

            let _: ScheduleAPIResponse = try await apiClient.post("/scheduling", body: request)
            await fetchSchedules()
            return true
        } catch {
            print("Failed to create schedule: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }

    // Response model for API
    private struct ScheduleAPIResponse: Decodable {
        let id: String
        let projectId: String
        let date: Date
    }

    // MARK: - Update Schedule

    func updateSchedule(_ schedule: Schedule) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let _: Schedule = try await apiClient.put("/scheduling/\(schedule.id)", body: schedule)
            await fetchSchedules()
            return true
        } catch {
            print("Failed to update schedule: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }

    // MARK: - Confirm Assignment

    func confirmAssignment(scheduleId: String, assignmentId: String) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            try await apiClient.post("/scheduling/\(scheduleId)/assignments/\(assignmentId)/confirm", body: EmptyBody())
            await fetchSchedules()
            return true
        } catch {
            print("Failed to confirm assignment: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }

    // MARK: - Delete Schedule

    func deleteSchedule(id: String) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            try await apiClient.delete("/scheduling/\(id)")
            schedules.removeAll { $0.id == id }
            return true
        } catch {
            print("Failed to delete schedule: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }

    // MARK: - Helpers

    func schedulesForDate(_ date: Date) -> [Schedule] {
        let calendar = Calendar.current
        return schedules.filter { calendar.isDate($0.date, inSameDayAs: date) }
    }

    var todaysSchedules: [Schedule] {
        schedulesForDate(Date())
    }

    var upcomingSchedules: [Schedule] {
        let now = Date()
        return schedules.filter { $0.date >= now }.sorted { $0.date < $1.date }
    }
}

// Helper for empty POST body
private struct EmptyBody: Codable {}
