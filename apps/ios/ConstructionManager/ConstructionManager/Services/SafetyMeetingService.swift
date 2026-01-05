//
//  SafetyMeetingService.swift
//  ConstructionManager
//
//  Service for managing safety meetings and toolbox talks
//

import Foundation
import SwiftUI
import Combine

@MainActor
class SafetyMeetingService: ObservableObject {
    static let shared = SafetyMeetingService()

    @Published var meetings: [SafetyMeeting] = []
    @Published var isLoading = false
    @Published var error: String?

    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Computed Properties

    var upcomingCount: Int {
        meetings.filter { $0.date > Date() }.count
    }

    var completedCount: Int {
        meetings.filter { $0.date <= Date() }.count
    }

    var thisMonthCount: Int {
        let calendar = Calendar.current
        guard let startOfMonth = calendar.date(from: calendar.dateComponents([.year, .month], from: Date())) else {
            return meetings.count  // Fallback to all meetings if date calc fails
        }
        return meetings.filter { $0.date >= startOfMonth }.count
    }

    // MARK: - API Methods

    func fetchMeetings(projectId: String? = nil) async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            var queryItems: [URLQueryItem] = []
            if let projectId = projectId {
                queryItems.append(URLQueryItem(name: "projectId", value: projectId))
            }

            let response: MeetingsResponse = try await apiClient.get(
                "/safety/meetings",
                queryItems: queryItems.isEmpty ? nil : queryItems
            )
            self.meetings = response.meetings
            print("[SafetyMeetingService] Fetched \(response.meetings.count) meetings")
        } catch {
            self.error = error.localizedDescription
            print("[SafetyMeetingService] Fetch error: \(error)")
            // Don't fall back to mock data - show real error
            self.meetings = []
        }
    }

    /// Create a new safety meeting with all required fields
    func createMeeting(
        projectId: String?,
        date: Date,
        time: String?,
        location: String?,
        topic: String,
        topicId: String?,
        description: String?,
        duration: Int?,
        attendees: [String],          // Array of attendee names
        attendeeIds: [String]?,       // Array of employee IDs
        leaderSignature: String,      // Base64 encoded signature image
        photoUrl: String,             // Uploaded photo URL
        notes: String?
    ) async throws -> SafetyMeeting {
        let body = CreateSafetyMeetingRequest(
            projectId: projectId,
            date: date,
            time: time,
            location: location,
            topic: topic,
            topicId: topicId,
            description: description,
            duration: duration,
            attendees: attendees,
            attendeeIds: attendeeIds,
            leaderSignature: leaderSignature,
            photoUrl: photoUrl,
            notes: notes
        )

        print("[SafetyMeetingService] Creating meeting with topic: \(topic)")
        let response: CreateMeetingResponse = try await apiClient.post("/safety/meetings", body: body)
        meetings.insert(response.meeting, at: 0)
        print("[SafetyMeetingService] Meeting created successfully: \(response.meeting.id)")
        return response.meeting
    }

    func addAttendee(meetingId: String, userId: String?, name: String, company: String?) async throws {
        let body = AddAttendeeRequest(
            userId: userId,
            name: name,
            company: company
        )

        let _: MeetingAttendee = try await apiClient.post("/safety/meetings/\(meetingId)/attendees", body: body)
        await fetchMeetings()
    }

    func deleteMeeting(id: String) async throws {
        try await apiClient.delete("/safety/meetings/\(id)")
        meetings.removeAll { $0.id == id }
    }
}

// MARK: - Request Models
private struct CreateSafetyMeetingRequest: Encodable {
    let projectId: String?
    let date: Date
    let time: String?
    let location: String?
    let topic: String
    let topicId: String?
    let description: String?
    let duration: Int?
    let attendees: [String]
    let attendeeIds: [String]?
    let leaderSignature: String
    let photoUrl: String
    let notes: String?
}

private struct AddAttendeeRequest: Encodable {
    let userId: String?
    let name: String
    let company: String?

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case name, company
    }
}

// MARK: - API Response Models

struct MeetingsResponse: Decodable {
    let meetings: [SafetyMeeting]
    let total: Int?
}

struct CreateMeetingResponse: Decodable {
    let meeting: SafetyMeeting
}
