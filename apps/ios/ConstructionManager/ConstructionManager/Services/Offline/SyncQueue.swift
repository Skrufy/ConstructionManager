//
//  SyncQueue.swift
//  ConstructionManager
//
//  Queue for pending offline operations that need to sync when online
//

import Foundation
import Combine

/// Empty encodable for requests with no body
private struct EmptyEncodable: Encodable {}

/// Represents a pending operation to be synced
struct PendingOperation: Codable, Identifiable {
    let id: String
    let type: OperationType
    let resourceType: ResourceType
    let resourceId: String?
    let payload: Data?
    let createdAt: Date
    var retryCount: Int
    var lastAttempt: Date?
    var error: String?

    enum OperationType: String, Codable {
        case create
        case update
        case delete
        case submit
    }

    enum ResourceType: String, Codable {
        case project
        case dailyLog
        case timeEntry
        case equipment
        case incident
        case document
        case comment
        case punchList
    }

    init(
        type: OperationType,
        resourceType: ResourceType,
        resourceId: String? = nil,
        payload: Data? = nil
    ) {
        self.id = UUID().uuidString
        self.type = type
        self.resourceType = resourceType
        self.resourceId = resourceId
        self.payload = payload
        self.createdAt = Date()
        self.retryCount = 0
        self.lastAttempt = nil
        self.error = nil
    }

    var displayDescription: String {
        let action = type.rawValue.capitalized
        let resource = resourceType.rawValue.replacingOccurrences(of: "([A-Z])", with: " $1", options: .regularExpression).capitalized
        return "\(action) \(resource)"
    }

    var canRetry: Bool {
        retryCount < 3
    }
}

/// Manages the queue of pending sync operations
@MainActor
class SyncQueue: ObservableObject {
    static let shared = SyncQueue()

    private let dataStore = OfflineDataStore.shared

    @Published private(set) var pendingOperations: [PendingOperation] = []
    @Published private(set) var isSyncing = false
    @Published private(set) var lastSyncError: String?

    var pendingCount: Int {
        pendingOperations.count
    }

    var hasPendingOperations: Bool {
        !pendingOperations.isEmpty
    }

    private init() {
        loadQueue()
    }

    // MARK: - Queue Management
    func enqueue(_ operation: PendingOperation) {
        pendingOperations.append(operation)
        saveQueue()

        NotificationCenter.default.post(name: .syncQueueUpdated, object: nil)
        print("[SyncQueue] Enqueued: \(operation.displayDescription)")
    }

    func enqueue(
        type: PendingOperation.OperationType,
        resourceType: PendingOperation.ResourceType,
        resourceId: String? = nil,
        payload: Encodable? = nil
    ) {
        var payloadData: Data? = nil

        if let payload = payload {
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            payloadData = try? encoder.encode(AnyEncodable(payload))
        }

        let operation = PendingOperation(
            type: type,
            resourceType: resourceType,
            resourceId: resourceId,
            payload: payloadData
        )

        enqueue(operation)
    }

    func dequeue(_ operationId: String) {
        pendingOperations.removeAll { $0.id == operationId }
        saveQueue()
        NotificationCenter.default.post(name: .syncQueueUpdated, object: nil)
    }

    func markFailed(_ operationId: String, error: String) {
        if let index = pendingOperations.firstIndex(where: { $0.id == operationId }) {
            pendingOperations[index].retryCount += 1
            pendingOperations[index].lastAttempt = Date()
            pendingOperations[index].error = error
            saveQueue()
        }
    }

    func clearQueue() {
        pendingOperations.removeAll()
        saveQueue()
        NotificationCenter.default.post(name: .syncQueueUpdated, object: nil)
    }

    func clearFailedOperations() {
        pendingOperations.removeAll { !$0.canRetry }
        saveQueue()
        NotificationCenter.default.post(name: .syncQueueUpdated, object: nil)
    }

    // MARK: - Persistence
    private func saveQueue() {
        dataStore.save(pendingOperations, dataType: .syncQueue)
    }

    private func loadQueue() {
        if let loaded: [PendingOperation] = dataStore.load(dataType: .syncQueue) {
            pendingOperations = loaded
        }
    }

    // MARK: - Sync Execution
    func processPendingOperations() async {
        guard !isSyncing else {
            print("[SyncQueue] Already syncing, skipping")
            return
        }

        guard NetworkMonitor.shared.isConnected else {
            print("[SyncQueue] No network connection, skipping sync")
            return
        }

        guard hasPendingOperations else {
            print("[SyncQueue] No pending operations")
            return
        }

        isSyncing = true
        lastSyncError = nil

        print("[SyncQueue] Starting sync of \(pendingCount) operations")

        var successCount = 0
        var failCount = 0

        for operation in pendingOperations where operation.canRetry {
            do {
                try await processOperation(operation)
                dequeue(operation.id)
                successCount += 1
            } catch {
                markFailed(operation.id, error: error.localizedDescription)
                failCount += 1
                print("[SyncQueue] Failed to sync \(operation.displayDescription): \(error)")
            }
        }

        isSyncing = false

        if failCount > 0 {
            lastSyncError = "\(failCount) operation(s) failed to sync"
        }

        print("[SyncQueue] Sync complete: \(successCount) succeeded, \(failCount) failed")

        if successCount > 0 {
            NotificationCenter.default.post(name: .offlineDataSynced, object: nil)
        }
    }

    private func processOperation(_ operation: PendingOperation) async throws {
        // This is where actual API calls would be made
        // For now, we'll simulate the sync based on operation type

        switch operation.resourceType {
        case .project:
            try await syncProject(operation)
        case .dailyLog:
            try await syncDailyLog(operation)
        case .timeEntry:
            try await syncTimeEntry(operation)
        case .equipment:
            try await syncEquipment(operation)
        case .incident:
            try await syncIncident(operation)
        case .document:
            try await syncDocument(operation)
        case .comment:
            try await syncComment(operation)
        case .punchList:
            try await syncPunchList(operation)
        }
    }

    // MARK: - Resource-Specific Sync Methods
    private func syncProject(_ operation: PendingOperation) async throws {
        guard let payload = operation.payload else {
            throw SyncError.missingPayload
        }

        let apiClient = APIClient.shared

        switch operation.type {
        case .create:
            let _: SyncResponse = try await apiClient.post("/projects", body: payload)
        case .update:
            guard let resourceId = operation.resourceId else {
                throw SyncError.missingResourceId
            }
            let _: SyncResponse = try await apiClient.put("/projects/\(resourceId)", body: payload)
        case .delete:
            guard let resourceId = operation.resourceId else {
                throw SyncError.missingResourceId
            }
            try await apiClient.delete("/projects/\(resourceId)")
        case .submit:
            // Projects don't have submit action
            break
        }
    }

    private func syncDailyLog(_ operation: PendingOperation) async throws {
        guard let payload = operation.payload else {
            throw SyncError.missingPayload
        }

        let apiClient = APIClient.shared

        switch operation.type {
        case .create:
            let _: SyncResponse = try await apiClient.post("/daily-logs", body: payload)
        case .update:
            guard let resourceId = operation.resourceId else {
                throw SyncError.missingResourceId
            }
            let _: SyncResponse = try await apiClient.put("/daily-logs/\(resourceId)", body: payload)
        case .delete:
            guard let resourceId = operation.resourceId else {
                throw SyncError.missingResourceId
            }
            try await apiClient.delete("/daily-logs/\(resourceId)")
        case .submit:
            guard let resourceId = operation.resourceId else {
                throw SyncError.missingResourceId
            }
            let _: SyncResponse = try await apiClient.post("/daily-logs/\(resourceId)/submit", body: EmptyEncodable())
        }
    }

    private func syncTimeEntry(_ operation: PendingOperation) async throws {
        guard let payload = operation.payload else {
            throw SyncError.missingPayload
        }

        let apiClient = APIClient.shared

        switch operation.type {
        case .create:
            let _: SyncResponse = try await apiClient.post("/time-entries", body: payload)
        case .update:
            guard let resourceId = operation.resourceId else {
                throw SyncError.missingResourceId
            }
            let _: SyncResponse = try await apiClient.put("/time-entries/\(resourceId)", body: payload)
        case .delete:
            guard let resourceId = operation.resourceId else {
                throw SyncError.missingResourceId
            }
            try await apiClient.delete("/time-entries/\(resourceId)")
        case .submit:
            // Time entries don't have submit action
            break
        }
    }

    private func syncEquipment(_ operation: PendingOperation) async throws {
        // Similar pattern for equipment
        print("[SyncQueue] Syncing equipment operation: \(operation.type)")
    }

    private func syncIncident(_ operation: PendingOperation) async throws {
        // Similar pattern for incidents
        print("[SyncQueue] Syncing incident operation: \(operation.type)")
    }

    private func syncDocument(_ operation: PendingOperation) async throws {
        // Documents require special handling for file uploads
        print("[SyncQueue] Syncing document operation: \(operation.type)")
    }

    private func syncComment(_ operation: PendingOperation) async throws {
        // Similar pattern for comments
        print("[SyncQueue] Syncing comment operation: \(operation.type)")
    }

    private func syncPunchList(_ operation: PendingOperation) async throws {
        // Similar pattern for punch lists
        print("[SyncQueue] Syncing punch list operation: \(operation.type)")
    }

    // MARK: - Errors
    enum SyncError: LocalizedError {
        case missingPayload
        case missingResourceId
        case networkError
        case serverError(String)

        var errorDescription: String? {
            switch self {
            case .missingPayload:
                return "Operation payload is missing"
            case .missingResourceId:
                return "Resource ID is required for this operation"
            case .networkError:
                return "Network connection unavailable"
            case .serverError(let message):
                return "Server error: \(message)"
            }
        }
    }
}

// MARK: - Type Erasure Helper
private struct AnyEncodable: Encodable {
    private let _encode: (Encoder) throws -> Void

    init<T: Encodable>(_ wrapped: T) {
        _encode = wrapped.encode
    }

    func encode(to encoder: Encoder) throws {
        try _encode(encoder)
    }
}

// MARK: - API Response Types (for sync)
// Note: Using types defined in APIModels.swift
// ProjectResponse, DailyLogResponse are defined there
// Using generic EmptyResponse for sync operations
private struct SyncResponse: Decodable {
    let success: Bool?
    let id: String?
}
