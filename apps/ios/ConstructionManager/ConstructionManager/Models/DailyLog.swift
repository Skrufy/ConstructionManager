//
//  DailyLog.swift
//  ConstructionManager
//
//  Daily log data model
//

import Foundation

struct DailyLog: Identifiable, Codable {
    let id: String
    let projectId: String
    let projectName: String?
    let submittedBy: String?
    let submitterName: String?
    let date: Date
    let notes: String?
    let weatherDelay: Bool
    let weatherDelayNotes: String?
    let status: DailyLogStatus
    let weather: WeatherData?
    let photoUrls: [String]?
    let crewCount: Int
    let totalHours: Double
    let entriesCount: Int
    let materialsCount: Int
    let issuesCount: Int
    let createdAt: Date
    let updatedAt: Date

    enum DailyLogStatus: String, Codable {
        case draft = "DRAFT"
        case submitted = "SUBMITTED"
        case approved = "APPROVED"
        case rejected = "REJECTED"
    }

    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase
}

// MARK: - Daily Log Creation Request
struct CreateDailyLogRequest: Codable {
    let projectId: String
    let date: Date
    let notes: String?
    let weatherDelay: Bool
    let weatherDelayNotes: String?
    let gpsLatitude: Double?
    let gpsLongitude: Double?
}

// MARK: - Mock Data
extension DailyLog {
    static let mockLogs: [DailyLog] = [
        DailyLog(
            id: "1",
            projectId: "1",
            projectName: "Downtown Office Building",
            submittedBy: "1",
            submitterName: "Steven Taylor",
            date: Date(),
            notes: "Completed foundation work on east wing",
            weatherDelay: false,
            weatherDelayNotes: nil,
            status: .submitted,
            weather: nil,
            photoUrls: nil,
            crewCount: 8,
            totalHours: 64,
            entriesCount: 3,
            materialsCount: 2,
            issuesCount: 0,
            createdAt: Date(),
            updatedAt: Date()
        ),
        DailyLog(
            id: "2",
            projectId: "2",
            projectName: "Riverside Apartments",
            submittedBy: "1",
            submitterName: "Steven Taylor",
            date: Calendar.current.date(byAdding: .day, value: -1, to: Date())!,
            notes: "Framing work progressing on schedule",
            weatherDelay: false,
            weatherDelayNotes: nil,
            status: .approved,
            weather: nil,
            photoUrls: nil,
            crewCount: 12,
            totalHours: 96,
            entriesCount: 5,
            materialsCount: 4,
            issuesCount: 1,
            createdAt: Calendar.current.date(byAdding: .day, value: -1, to: Date())!,
            updatedAt: Calendar.current.date(byAdding: .day, value: -1, to: Date())!
        ),
        DailyLog(
            id: "3",
            projectId: "1",
            projectName: "Downtown Office Building",
            submittedBy: "1",
            submitterName: "Steven Taylor",
            date: Calendar.current.date(byAdding: .day, value: -2, to: Date())!,
            notes: "Steel delivery received",
            weatherDelay: true,
            weatherDelayNotes: "Rain delay - 2 hours",
            status: .approved,
            weather: nil,
            photoUrls: nil,
            crewCount: 6,
            totalHours: 48,
            entriesCount: 2,
            materialsCount: 3,
            issuesCount: 0,
            createdAt: Calendar.current.date(byAdding: .day, value: -2, to: Date())!,
            updatedAt: Calendar.current.date(byAdding: .day, value: -2, to: Date())!
        )
    ]
}
