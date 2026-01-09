//
//  APIModels.swift
//  ConstructionManager
//
//  API response models that match the backend structure
//

import Foundation

// MARK: - Projects API

struct ProjectsResponse: Decodable {
    let projects: [APIProject]
}

struct ProjectResponse: Decodable {
    let project: APIProject
}

struct APIProject: Decodable {
    let id: String
    let name: String
    let address: String?
    let gpsLatitude: Double?
    let gpsLongitude: Double?
    let startDate: Date?
    let endDate: Date?
    let status: String
    let visibilityMode: String?
    let description: String?
    let clientId: String?
    let client: APIClientSummary?
    let createdAt: Date
    let updatedAt: Date
    let assignments: [ProjectAssignment]?

    // Flattened count fields from API (not nested under _count)
    let dailyLogCount: Int?
    let hoursTracked: Double?
    let documentCount: Int?
    let drawingCount: Int?
    let crewCount: Int?

    enum CodingKeys: String, CodingKey {
        case id, name, address, status, description, client, assignments
        case gpsLatitude = "gps_latitude"
        case gpsLongitude = "gps_longitude"
        case startDate = "start_date"
        case endDate = "end_date"
        case visibilityMode = "visibility_mode"
        case clientId = "client_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case dailyLogCount = "daily_log_count"
        case hoursTracked = "hours_tracked"
        case documentCount = "document_count"
        case drawingCount = "drawing_count"
        case crewCount = "crew_count"
    }

    struct APIClientSummary: Decodable {
        let id: String
        let companyName: String
        let contactName: String?

        enum CodingKeys: String, CodingKey {
            case id
            case companyName = "company_name"
            case contactName = "contact_name"
        }
    }

    struct ProjectAssignment: Decodable {
        // API only returns nested user object, not userId
        let user: AssignedUser
    }

    struct AssignedUser: Decodable {
        let id: String
        let name: String
        let email: String
        let role: String
    }

    /// Convert to local Project model
    func toProject() -> Project {
        // Parse address components (backend stores as single string)
        let addressParts = (address ?? "").components(separatedBy: ", ")
        let streetAddress = addressParts.first ?? ""
        let city = addressParts.count > 1 ? addressParts[1] : ""
        let stateZip = addressParts.count > 2 ? addressParts[2].components(separatedBy: " ") : []
        let state = stateZip.first ?? ""
        let zip = stateZip.count > 1 ? stateZip[1] : ""

        // Convert API client summary to local ClientSummary
        let clientSummary: ClientSummary? = client.map {
            ClientSummary(id: $0.id, companyName: $0.companyName, contactName: $0.contactName)
        }

        return Project(
            id: id,
            name: name,
            number: nil,
            address: streetAddress,
            city: city,
            state: state,
            zipCode: zip,
            status: Project.ProjectStatus(rawValue: status) ?? .active,
            type: .commercial, // Backend doesn't have type yet
            gpsLatitude: gpsLatitude,
            gpsLongitude: gpsLongitude,
            startDate: startDate,
            estimatedEndDate: endDate,
            actualEndDate: status == "COMPLETED" ? endDate : nil,
            clientId: clientId,
            client: clientSummary,
            projectManagerId: nil,
            superintendentId: nil,
            budget: nil,
            description: description,
            imageUrl: nil,
            createdAt: createdAt,
            updatedAt: updatedAt,
            dailyLogCount: dailyLogCount ?? 0,
            hoursTracked: hoursTracked ?? 0,
            documentCount: documentCount ?? 0,
            drawingCount: drawingCount ?? 0,
            crewCount: crewCount ?? 0
        )
    }
}

// MARK: - Time Entries API

struct TimeEntriesResponse: Decodable {
    let timeEntries: [APITimeEntry]
}

struct TimeEntryResponse: Decodable {
    let timeEntry: APITimeEntry
}

struct APITimeEntry: Decodable {
    let id: String
    let userId: String
    let projectId: String
    let clockIn: Date
    let clockOut: Date?
    // API returns gps_latitude_in/gps_longitude_in (snake_case -> gpsLatitudeIn)
    let gpsLatitudeIn: Double?
    let gpsLongitudeIn: Double?
    let gpsLatitudeOut: Double?
    let gpsLongitudeOut: Double?
    let status: String
    let notes: String?
    // Flat fields from API (not nested objects)
    let projectName: String?
    let userName: String?

    enum CodingKeys: String, CodingKey {
        case id, status, notes
        case userId = "user_id"
        case projectId = "project_id"
        case clockIn = "clock_in"
        case clockOut = "clock_out"
        case gpsLatitudeIn = "gps_latitude_in"
        case gpsLongitudeIn = "gps_longitude_in"
        case gpsLatitudeOut = "gps_latitude_out"
        case gpsLongitudeOut = "gps_longitude_out"
        case projectName = "project_name"
        case userName = "user_name"
    }

    /// Convert to local TimeEntry model
    func toTimeEntry() -> TimeEntry {
        TimeEntry(
            id: id,
            userId: userId,
            projectId: projectId,
            projectName: projectName ?? "Unknown Project",
            clockIn: clockIn,
            clockOut: clockOut,
            gpsLatitudeIn: gpsLatitudeIn,
            gpsLongitudeIn: gpsLongitudeIn,
            gpsLatitudeOut: gpsLatitudeOut,
            gpsLongitudeOut: gpsLongitudeOut,
            status: TimeEntry.TimeEntryStatus(rawValue: status) ?? .pending,
            notes: notes
        )
    }
}

// MARK: - Daily Logs API

struct DailyLogsResponse: Decodable {
    let dailyLogs: [APIDailyLog]
}

struct DailyLogResponse: Decodable {
    let dailyLog: APIDailyLog
}

struct APIDailyLog: Decodable {
    let id: String
    let projectId: String
    let date: Date
    let submittedBy: String?
    let notes: String?
    let status: String
    let weatherData: WeatherDataJSON?
    let crewCount: Int
    let totalHours: Double
    let weatherDelay: Bool
    let weatherDelayNotes: String?
    let createdAt: Date
    let updatedAt: Date

    // Flat fields from API (not nested objects)
    let projectName: String?
    let submitterName: String?

    // Count fields from API (flat, not nested under _count)
    let entriesCount: Int?
    let materialsCount: Int?
    let issuesCount: Int?

    enum CodingKeys: String, CodingKey {
        case id, date, notes, status
        case projectId = "project_id"
        case submittedBy = "submitted_by"
        case weatherData = "weather_data"
        case crewCount = "crew_count"
        case totalHours = "total_hours"
        case weatherDelay = "weather_delay"
        case weatherDelayNotes = "weather_delay_notes"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case projectName = "project_name"
        case submitterName = "submitter_name"
        case entriesCount = "entries_count"
        case materialsCount = "materials_count"
        case issuesCount = "issues_count"
    }

    struct WeatherDataJSON: Decodable {
        let temperature: Double?
        let condition: String?
        let humidity: Int?
        let windSpeed: Double?

        enum CodingKeys: String, CodingKey {
            case temperature, condition, humidity
            case windSpeed = "wind_speed"
        }
    }

    /// Convert to local DailyLog model
    func toDailyLog() -> DailyLog {
        let weather = weatherData.map {
            WeatherData(
                temperature: $0.temperature ?? 0,
                condition: $0.condition ?? "Unknown",
                humidity: $0.humidity ?? 0,
                windSpeed: $0.windSpeed ?? 0,
                icon: nil
            )
        }

        return DailyLog(
            id: id,
            projectId: projectId,
            projectName: projectName,
            submittedBy: submittedBy ?? "",
            submitterName: submitterName,
            date: date,
            notes: notes,
            weatherDelay: weatherDelay,
            weatherDelayNotes: weatherDelayNotes,
            status: DailyLog.DailyLogStatus(rawValue: status) ?? .draft,
            weather: weather,
            photoUrls: nil,
            crewCount: crewCount,
            totalHours: totalHours,
            entriesCount: entriesCount ?? 0,
            materialsCount: materialsCount ?? 0,
            issuesCount: issuesCount ?? 0,
            createdAt: createdAt,
            updatedAt: updatedAt
        )
    }
}

// MARK: - Notifications API

struct NotificationsResponse: Decodable {
    let notifications: [APINotification]
    let unreadCount: Int
}

struct APINotification: Decodable {
    let id: String
    let userId: String
    let type: String
    let title: String
    let message: String
    let severity: String
    let category: String
    let data: NotificationData?
    let read: Bool
    let readAt: Date?
    let actionUrl: String?
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, type, title, message, severity, category, data, read
        case userId = "user_id"
        case readAt = "read_at"
        case actionUrl = "action_url"
        case createdAt = "created_at"
    }

    struct NotificationData: Decodable {
        // Flexible JSON data - can contain different fields
    }

    /// Convert to local AppNotification model
    func toAppNotification() -> AppNotification {
        let notificationType: AppNotification.NotificationType
        switch type {
        case "APPROVAL_NEEDED": notificationType = .approval
        case "CERT_EXPIRING", "API_DISCONNECT": notificationType = .warning
        case "SYSTEM_ALERT": notificationType = .info
        default: notificationType = .info
        }

        return AppNotification(
            id: id,
            type: notificationType,
            title: title,
            message: message,
            timestamp: createdAt,
            isUnread: !read
        )
    }
}

// MARK: - Documents API

struct DocumentsResponse: Decodable {
    let documents: [APIDocument]
    let pagination: Pagination?
    let categories: [String: Int]?

    struct Pagination: Decodable {
        let page: Int
        let limit: Int
        let total: Int
        let pages: Int
    }
}

struct APIDocument: Decodable {
    let id: String
    let projectId: String
    let name: String
    let type: String
    let category: String?
    let storagePath: String
    let description: String?
    let tags: [String]?
    let gpsLatitude: Double?
    let gpsLongitude: Double?
    let currentVersion: Int
    let isLatest: Bool
    let createdAt: Date
    let project: APIDocumentProject?
    let uploader: APIDocumentUser?
    let metadata: APIDocumentMetadata?
    let blasterAssignments: [APIBlasterAssignment]?

    enum CodingKeys: String, CodingKey {
        case id, name, type, category, description, tags, project, uploader, metadata
        case projectId = "project_id"
        case storagePath = "storage_path"
        case gpsLatitude = "gps_latitude"
        case gpsLongitude = "gps_longitude"
        case currentVersion = "current_version"
        case isLatest = "is_latest"
        case createdAt = "created_at"
        case blasterAssignments = "blaster_assignments"
    }

    struct APIDocumentProject: Decodable {
        let id: String
        let name: String
    }

    struct APIDocumentUser: Decodable {
        let id: String
        let name: String
    }

    struct APIBlasterAssignment: Decodable {
        let id: String
        let blaster: APIDocumentUser
    }

    struct APIDocumentMetadata: Decodable {
        let discipline: String?
        let drawingNumber: String?
        let sheetTitle: String?
        let revision: String?
        let scale: String?
        let building: String?
        let floor: String?
        let zone: String?

        enum CodingKeys: String, CodingKey {
            case discipline, revision, scale, building, floor, zone
            case drawingNumber = "drawing_number"
            case sheetTitle = "sheet_title"
        }
    }

    /// Convert to local Document model
    func toDocument() -> Document {
        // Map backend category to local DocumentCategory raw value
        let mappedCategory: DocumentCategory
        switch (category ?? "").lowercased() {
        case "license": mappedCategory = .license
        case "certification", "cert": mappedCategory = .certification
        case "insurance": mappedCategory = .insurance
        case "contract": mappedCategory = .contract
        case "permit": mappedCategory = .permit
        case "report": mappedCategory = .report
        case "photo": mappedCategory = .photo
        default: mappedCategory = .other
        }

        // Convert API blaster assignments to local model
        let localBlasterAssignments = blasterAssignments?.map { apiAssignment in
            BlasterAssignment(
                id: apiAssignment.id,
                blaster: BlasterInfo(
                    id: apiAssignment.blaster.id,
                    name: apiAssignment.blaster.name
                )
            )
        }

        return Document(
            id: id,
            projectId: projectId,
            userId: uploader?.id,
            name: name,
            description: description,
            category: mappedCategory,
            fileUrl: storagePath,
            thumbnailUrl: nil,
            fileType: type,
            fileSize: 0,
            uploadedBy: uploader?.id ?? "",
            uploadedAt: createdAt,
            expiresAt: nil,
            tags: tags ?? [],
            blasterAssignments: localBlasterAssignments,
            storagePath: storagePath,
            createdAt: createdAt,
            updatedAt: createdAt  // Use createdAt as updatedAt since API doesn't have separate field
        )
    }
}

// MARK: - Request Bodies

struct CreateTimeEntryRequest: Encodable {
    let projectId: String
    let gpsInLat: Double?
    let gpsInLng: Double?
}

struct UpdateTimeEntryRequest: Encodable {
    let clockOut: Date
    let gpsOutLat: Double?
    let gpsOutLng: Double?
}

struct CreateProjectRequest: Encodable {
    let name: String
    let address: String?
    let gpsLatitude: Double?
    let gpsLongitude: Double?
    let startDate: Date?
    let endDate: Date?
    let status: String?
    let description: String?
    let clientId: String?
    let assignedUserIds: [String]?
}

struct MarkNotificationReadRequest: Encodable {
    let notificationId: String?
    let markAll: Bool?
}

// MARK: - Project Team API

struct ProjectTeamResponse: Decodable {
    let assignments: [APIProjectAssignment]
    let project: APIProjectTeamProject
}

struct APIProjectTeamProject: Decodable {
    let id: String
    let name: String
}

struct APIProjectAssignment: Decodable {
    let id: String
    let userId: String
    let projectId: String
    let roleOverride: String?
    let createdAt: Date
    let user: APITeamUser

    enum CodingKeys: String, CodingKey {
        case id, user
        case userId = "user_id"
        case projectId = "project_id"
        case roleOverride = "role_override"
        case createdAt = "created_at"
    }

    /// Convert to local TeamMember model
    func toTeamMember() -> TeamMember {
        TeamMember(
            assignmentId: id,
            userId: user.id,
            name: user.name,
            email: user.email,
            role: UserRole(rawValue: user.role) ?? .fieldWorker,
            roleOverride: roleOverride,
            addedAt: createdAt
        )
    }
}

struct APITeamUser: Decodable {
    let id: String
    let name: String
    let email: String
    let role: String
}

struct AssignmentResponse: Decodable {
    let assignment: APIProjectAssignment
}

struct AddTeamMemberRequest: Encodable {
    let userId: String
    let roleOverride: String?
}

struct UpdateTeamMemberRequest: Encodable {
    let assignmentId: String
    let roleOverride: String?
}

// MARK: - Users API (for selecting users to add)

struct APIUserListItem: Decodable {
    let id: String
    let name: String
    let email: String
    let role: String
    let status: String
    let phone: String?
    let createdAt: Date
    let updatedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, name, email, role, status, phone
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

// MARK: - TeamMember Model

struct TeamMember: Identifiable {
    let assignmentId: String
    let userId: String
    let name: String
    let email: String
    let role: UserRole
    let roleOverride: String?
    let addedAt: Date

    var id: String { assignmentId }

    var initials: String {
        let components = name.split(separator: " ")
        if components.count >= 2 {
            return String(components[0].prefix(1)) + String(components[1].prefix(1))
        }
        return String(name.prefix(2)).uppercased()
    }

    /// The effective role shown on this project (roleOverride or base role)
    var effectiveRoleDisplay: String {
        if let override = roleOverride, !override.isEmpty {
            return override
        }
        return role.displayName
    }
}
