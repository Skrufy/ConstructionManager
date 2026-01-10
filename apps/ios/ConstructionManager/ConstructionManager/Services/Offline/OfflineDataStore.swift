//
//  OfflineDataStore.swift
//  ConstructionManager
//
//  Local data persistence for offline support using FileManager + Codable
//

import Foundation
import Combine

/// Manages local storage of data for offline access
@MainActor
class OfflineDataStore: ObservableObject {
    static let shared = OfflineDataStore()

    private let fileManager = FileManager.default
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    /// Base directory for offline data
    private var offlineDataDirectory: URL {
        let documentsDirectory = fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
        return documentsDirectory.appendingPathComponent("OfflineData", isDirectory: true)
    }

    @Published private(set) var lastSyncDate: Date?
    @Published private(set) var cachedDataSize: Int64 = 0

    // MARK: - Data Types
    enum DataType: String, CaseIterable {
        case projects = "projects"
        case dailyLogs = "daily_logs"
        case clients = "clients"
        case equipment = "equipment"
        case timeEntries = "time_entries"
        case users = "users"
        case syncQueue = "sync_queue"
        case metadata = "metadata"

        var filename: String {
            return "\(rawValue).json"
        }
    }

    // MARK: - Metadata
    struct CacheMetadata: Codable {
        var lastSyncDate: Date?
        var dataVersions: [String: Date]  // DataType -> last updated
        var userId: String?

        init() {
            self.lastSyncDate = nil
            self.dataVersions = [:]
            self.userId = nil
        }
    }

    private var metadata: CacheMetadata = CacheMetadata()

    // MARK: - Initialization
    private init() {
        setupDirectories()

        // Use ISO8601 for encoding
        encoder.dateEncodingStrategy = .iso8601

        // Use flexible date decoding to handle legacy formats
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()

            // Try string first (ISO8601)
            if let dateString = try? container.decode(String.self) {
                let formatter = ISO8601DateFormatter()
                formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                if let date = formatter.date(from: dateString) {
                    return date
                }
                // Try without fractional seconds
                formatter.formatOptions = [.withInternetDateTime]
                if let date = formatter.date(from: dateString) {
                    return date
                }
            }

            // Try Double (timeIntervalSince1970)
            if let timestamp = try? container.decode(Double.self) {
                return Date(timeIntervalSince1970: timestamp)
            }

            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Cannot decode date")
        }

        loadMetadata()
    }

    private func setupDirectories() {
        do {
            if !fileManager.fileExists(atPath: offlineDataDirectory.path) {
                try fileManager.createDirectory(at: offlineDataDirectory, withIntermediateDirectories: true)
            }
        } catch {
            print("[OfflineDataStore] Failed to create directories: \(error)")
        }
    }

    private func loadMetadata() {
        if let data: CacheMetadata = load(dataType: .metadata) {
            metadata = data
            lastSyncDate = metadata.lastSyncDate
        }
    }

    private func saveMetadata() {
        save(metadata, dataType: .metadata)
    }

    // MARK: - Generic Save/Load
    func save<T: Encodable>(_ data: T, dataType: DataType) {
        let fileURL = offlineDataDirectory.appendingPathComponent(dataType.filename)

        do {
            let jsonData = try encoder.encode(data)
            try jsonData.write(to: fileURL, options: .atomic)

            // Update metadata
            metadata.dataVersions[dataType.rawValue] = Date()
            if dataType != .metadata {
                saveMetadata()
            }

            updateCachedDataSize()
            print("[OfflineDataStore] Saved \(dataType.rawValue) (\(jsonData.count) bytes)")
        } catch {
            print("[OfflineDataStore] Failed to save \(dataType.rawValue): \(error)")
        }
    }

    func load<T: Decodable>(dataType: DataType) -> T? {
        let fileURL = offlineDataDirectory.appendingPathComponent(dataType.filename)

        guard fileManager.fileExists(atPath: fileURL.path) else {
            return nil
        }

        do {
            let data = try Data(contentsOf: fileURL)
            let decoded = try decoder.decode(T.self, from: data)
            return decoded
        } catch {
            print("[OfflineDataStore] Failed to load \(dataType.rawValue): \(error)")
            return nil
        }
    }

    func delete(dataType: DataType) {
        let fileURL = offlineDataDirectory.appendingPathComponent(dataType.filename)

        do {
            if fileManager.fileExists(atPath: fileURL.path) {
                try fileManager.removeItem(at: fileURL)
                metadata.dataVersions.removeValue(forKey: dataType.rawValue)
                saveMetadata()
                updateCachedDataSize()
            }
        } catch {
            print("[OfflineDataStore] Failed to delete \(dataType.rawValue): \(error)")
        }
    }

    // MARK: - Specific Data Operations

    // Projects
    func saveProjects(_ projects: [Project]) {
        save(projects, dataType: .projects)
    }

    func loadProjects() -> [Project] {
        return load(dataType: .projects) ?? []
    }

    // Daily Logs
    func saveDailyLogs(_ logs: [DailyLog]) {
        save(logs, dataType: .dailyLogs)
    }

    func loadDailyLogs() -> [DailyLog] {
        return load(dataType: .dailyLogs) ?? []
    }

    // Clients
    func saveClients(_ clients: [Client]) {
        save(clients, dataType: .clients)
    }

    func loadClients() -> [Client] {
        return load(dataType: .clients) ?? []
    }

    // Equipment
    func saveEquipment(_ equipment: [Equipment]) {
        save(equipment, dataType: .equipment)
    }

    func loadEquipment() -> [Equipment] {
        return load(dataType: .equipment) ?? []
    }

    // Time Entries
    func saveTimeEntries(_ entries: [TimeEntry]) {
        save(entries, dataType: .timeEntries)
    }

    func loadTimeEntries() -> [TimeEntry] {
        return load(dataType: .timeEntries) ?? []
    }

    // Users (team members)
    func saveUsers(_ users: [User]) {
        // Convert to cacheable format for encoding
        let cacheableUsers = users.map { CacheableUser(from: $0) }
        save(cacheableUsers, dataType: .users)
    }

    func loadUsers() -> [User] {
        guard let cacheableUsers: [CacheableUser] = load(dataType: .users) else {
            return []
        }
        return cacheableUsers.map { $0.toUser() }
    }

    // MARK: - Sync Management
    func updateLastSyncDate() {
        metadata.lastSyncDate = Date()
        lastSyncDate = metadata.lastSyncDate
        saveMetadata()
    }

    func setUserId(_ userId: String?) {
        metadata.userId = userId
        saveMetadata()
    }

    func getDataVersion(for dataType: DataType) -> Date? {
        return metadata.dataVersions[dataType.rawValue]
    }

    // MARK: - Cache Management
    func clearAllData() {
        for dataType in DataType.allCases {
            delete(dataType: dataType)
        }
        metadata = CacheMetadata()
        lastSyncDate = nil
        cachedDataSize = 0
    }

    func clearUserData() {
        // Clear user-specific data but keep metadata structure
        delete(dataType: .projects)
        delete(dataType: .dailyLogs)
        delete(dataType: .clients)
        delete(dataType: .equipment)
        delete(dataType: .timeEntries)
        delete(dataType: .users)
        delete(dataType: .syncQueue)

        metadata.dataVersions.removeAll()
        metadata.lastSyncDate = nil
        saveMetadata()
    }

    private func updateCachedDataSize() {
        var totalSize: Int64 = 0

        do {
            let contents = try fileManager.contentsOfDirectory(at: offlineDataDirectory, includingPropertiesForKeys: [.fileSizeKey])
            for fileURL in contents {
                let attributes = try fileManager.attributesOfItem(atPath: fileURL.path)
                if let size = attributes[.size] as? Int64 {
                    totalSize += size
                }
            }
        } catch {
            print("[OfflineDataStore] Failed to calculate cache size: \(error)")
        }

        cachedDataSize = totalSize
    }

    var formattedCacheSize: String {
        let formatter = ByteCountFormatter()
        formatter.countStyle = .file
        return formatter.string(fromByteCount: cachedDataSize)
    }

    // MARK: - Data Freshness
    func isDataStale(_ dataType: DataType, maxAge: TimeInterval = 3600) -> Bool {
        guard let lastUpdated = metadata.dataVersions[dataType.rawValue] else {
            return true  // No data = stale
        }
        return Date().timeIntervalSince(lastUpdated) > maxAge
    }

    func hasOfflineData(for dataType: DataType) -> Bool {
        let fileURL = offlineDataDirectory.appendingPathComponent(dataType.filename)
        return fileManager.fileExists(atPath: fileURL.path)
    }
}

// MARK: - Cacheable User Model
/// A Codable version of User for offline storage (since User has custom Decodable implementation)
private struct CacheableUser: Codable {
    let id: String
    let name: String
    let email: String
    let phone: String?
    let role: String
    let status: String
    let isBlaster: Bool?
    let createdAt: Date
    let language: String?
    let companyTemplateName: String?

    init(from user: User) {
        self.id = user.id
        self.name = user.name
        self.email = user.email
        self.phone = user.phone
        self.role = user.role.rawValue
        self.status = user.status.rawValue
        self.isBlaster = user.isBlaster
        self.createdAt = user.createdAt
        self.language = user.language
        self.companyTemplateName = user.companyTemplateName
    }

    func toUser() -> User {
        User(
            id: id,
            name: name,
            email: email,
            phone: phone,
            role: UserRole(rawValue: role) ?? .fieldWorker,
            status: UserStatus(rawValue: status) ?? .active,
            isBlaster: isBlaster,
            createdAt: createdAt,
            language: language,
            companyTemplateName: companyTemplateName
        )
    }
}
