//
//  TimeEntry.swift
//  ConstructionManager
//
//  Time tracking data models
//

import Foundation

struct TimeEntry: Identifiable, Codable {
    let id: String
    let userId: String
    let projectId: String
    let projectName: String
    let clockIn: Date
    var clockOut: Date?
    let gpsLatitudeIn: Double?
    let gpsLongitudeIn: Double?
    let gpsLatitudeOut: Double?
    let gpsLongitudeOut: Double?
    let status: TimeEntryStatus
    let notes: String?

    // Legacy support for existing code
    var gpsLatitude: Double? { gpsLatitudeIn }
    var gpsLongitude: Double? { gpsLongitudeIn }

    var isActive: Bool {
        clockOut == nil
    }

    var duration: TimeInterval {
        let end = clockOut ?? Date()
        return end.timeIntervalSince(clockIn)
    }

    var durationFormatted: String {
        let hours = Int(duration) / 3600
        let minutes = (Int(duration) % 3600) / 60
        if hours > 0 {
            return "\(hours)h \(minutes)m"
        }
        return "\(minutes)m"
    }

    var clockInFormatted: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: clockIn)
    }

    var clockOutFormatted: String? {
        guard let clockOut = clockOut else { return nil }
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: clockOut)
    }

    enum TimeEntryStatus: String, Codable {
        case pending = "PENDING"
        case approved = "APPROVED"
        case rejected = "REJECTED"
    }

    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase
}

// MARK: - Mock Data
extension TimeEntry {
    static let mockEntries: [TimeEntry] = [
        TimeEntry(
            id: "1",
            userId: "1",
            projectId: "1",
            projectName: "Downtown Office Complex",
            clockIn: Calendar.current.date(bySettingHour: 8, minute: 0, second: 0, of: Date())!,
            clockOut: Calendar.current.date(bySettingHour: 12, minute: 30, second: 0, of: Date()),
            gpsLatitudeIn: 34.0522,
            gpsLongitudeIn: -118.2437,
            gpsLatitudeOut: 34.0522,
            gpsLongitudeOut: -118.2437,
            status: .approved,
            notes: nil
        ),
        TimeEntry(
            id: "2",
            userId: "1",
            projectId: "1",
            projectName: "Downtown Office Complex",
            clockIn: Calendar.current.date(bySettingHour: 13, minute: 0, second: 0, of: Date())!,
            clockOut: nil,
            gpsLatitudeIn: 34.0522,
            gpsLongitudeIn: -118.2437,
            gpsLatitudeOut: nil,
            gpsLongitudeOut: nil,
            status: .pending,
            notes: nil
        )
    ]
}
