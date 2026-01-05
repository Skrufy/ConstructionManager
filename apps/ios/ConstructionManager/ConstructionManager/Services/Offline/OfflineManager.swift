//
//  OfflineManager.swift
//  ConstructionManager
//
//  Coordinates offline support, caching, and sync operations
//

import Foundation
import Combine
import SwiftUI

/// Central coordinator for offline functionality
@MainActor
class OfflineManager: ObservableObject {
    static let shared = OfflineManager()

    let networkMonitor = NetworkMonitor.shared
    let dataStore = OfflineDataStore.shared
    let syncQueue = SyncQueue.shared

    @Published private(set) var syncStatus: SyncStatus = .idle
    @Published private(set) var lastSyncTime: Date?
    @Published private(set) var isOfflineMode = false

    private var cancellables = Set<AnyCancellable>()
    private var syncTask: Task<Void, Never>?

    enum SyncStatus: Equatable {
        case idle
        case syncing
        case synced
        case error(String)
        case pendingChanges(Int)

        var displayText: String {
            switch self {
            case .idle:
                return "Ready"
            case .syncing:
                return "Syncing..."
            case .synced:
                return "Up to date"
            case .error(let message):
                return "Error: \(message)"
            case .pendingChanges(let count):
                return "\(count) pending"
            }
        }

        var icon: String {
            switch self {
            case .idle:
                return "checkmark.circle"
            case .syncing:
                return "arrow.triangle.2.circlepath"
            case .synced:
                return "checkmark.circle.fill"
            case .error:
                return "exclamationmark.triangle.fill"
            case .pendingChanges:
                return "arrow.up.circle"
            }
        }
    }

    private init() {
        setupObservers()
        updateSyncStatus()

        // Sync pending operations on launch if online
        Task {
            await syncOnLaunchIfNeeded()
        }
    }

    /// Sync any pending operations when app launches
    private func syncOnLaunchIfNeeded() async {
        // Small delay to let network monitor initialize
        try? await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds

        if networkMonitor.isConnected && syncQueue.hasPendingOperations {
            print("[OfflineManager] Found \(syncQueue.pendingCount) pending operations on launch, syncing...")
            await syncQueue.processPendingOperations()
            lastSyncTime = Date()
            updateSyncStatus()
        }
    }

    /// Called when app returns to foreground - syncs pending operations
    func syncOnForeground() {
        guard networkMonitor.isConnected && syncQueue.hasPendingOperations else { return }

        print("[OfflineManager] App returned to foreground with pending operations, syncing...")
        triggerSync()
    }

    private func setupObservers() {
        // Monitor network connectivity changes
        networkMonitor.$isConnected
            .removeDuplicates()
            .sink { [weak self] isConnected in
                Task { @MainActor [weak self] in
                    self?.handleConnectivityChange(isConnected: isConnected)
                }
            }
            .store(in: &cancellables)

        // Monitor sync queue changes
        syncQueue.$pendingOperations
            .sink { [weak self] _ in
                Task { @MainActor [weak self] in
                    self?.updateSyncStatus()
                }
            }
            .store(in: &cancellables)

        // Monitor syncing state
        syncQueue.$isSyncing
            .sink { [weak self] isSyncing in
                Task { @MainActor [weak self] in
                    if isSyncing {
                        self?.syncStatus = .syncing
                    } else {
                        self?.updateSyncStatus()
                    }
                }
            }
            .store(in: &cancellables)
    }

    private func handleConnectivityChange(isConnected: Bool) {
        isOfflineMode = !isConnected

        if isConnected {
            print("[OfflineManager] Network restored, triggering sync")
            triggerSync()
        } else {
            print("[OfflineManager] Network lost, entering offline mode")
        }
    }

    private func updateSyncStatus() {
        if syncQueue.isSyncing {
            syncStatus = .syncing
        } else if let error = syncQueue.lastSyncError {
            syncStatus = .error(error)
        } else if syncQueue.hasPendingOperations {
            syncStatus = .pendingChanges(syncQueue.pendingCount)
        } else {
            syncStatus = .synced
        }
    }

    // MARK: - Public API

    /// Trigger a sync of all pending operations
    func triggerSync() {
        guard networkMonitor.isConnected else {
            print("[OfflineManager] Cannot sync: offline")
            return
        }

        syncTask?.cancel()
        syncTask = Task {
            await syncQueue.processPendingOperations()
            lastSyncTime = Date()
            updateSyncStatus()
        }
    }

    /// Cache data for offline access
    func cacheData() async {
        guard networkMonitor.isConnected else { return }

        print("[OfflineManager] Caching data for offline use")

        // Cache projects
        let projectService = ProjectService.shared
        await projectService.fetchProjects()
        dataStore.saveProjects(projectService.projects)

        // Cache daily logs
        let dailyLogService = DailyLogService.shared
        await dailyLogService.fetchDailyLogs()
        dataStore.saveDailyLogs(dailyLogService.dailyLogs)

        // Cache clients
        let clientService = ClientService.shared
        await clientService.fetchClients()
        dataStore.saveClients(clientService.clients)

        // Cache equipment
        let equipmentService = EquipmentService.shared
        await equipmentService.fetchEquipment()
        dataStore.saveEquipment(equipmentService.equipment)

        // Update sync time
        dataStore.updateLastSyncDate()
        lastSyncTime = Date()

        print("[OfflineManager] Data caching complete")
    }

    /// Load cached data when offline
    func loadCachedData() {
        print("[OfflineManager] Loading cached data")

        // Load into services
        let cachedProjects = dataStore.loadProjects()
        if !cachedProjects.isEmpty {
            ProjectService.shared.loadFromCache(cachedProjects)
        }

        let cachedDailyLogs = dataStore.loadDailyLogs()
        if !cachedDailyLogs.isEmpty {
            DailyLogService.shared.loadFromCache(cachedDailyLogs)
        }

        let cachedClients = dataStore.loadClients()
        if !cachedClients.isEmpty {
            ClientService.shared.loadFromCache(cachedClients)
        }

        let cachedEquipment = dataStore.loadEquipment()
        if !cachedEquipment.isEmpty {
            EquipmentService.shared.loadFromCache(cachedEquipment)
        }

        lastSyncTime = dataStore.lastSyncDate
    }

    /// Queue an operation for later sync
    func queueOperation(
        type: PendingOperation.OperationType,
        resourceType: PendingOperation.ResourceType,
        resourceId: String? = nil,
        payload: Encodable? = nil
    ) {
        syncQueue.enqueue(
            type: type,
            resourceType: resourceType,
            resourceId: resourceId,
            payload: payload
        )
        updateSyncStatus()
    }

    /// Check if we should use cached data
    var shouldUseCachedData: Bool {
        !networkMonitor.isConnected && dataStore.hasOfflineData(for: .projects)
    }

    /// Clear all offline data (e.g., on logout)
    func clearOfflineData() {
        dataStore.clearUserData()
        syncQueue.clearQueue()
        lastSyncTime = nil
        syncStatus = .idle
    }

    /// Get formatted last sync time
    var formattedLastSync: String {
        guard let lastSync = lastSyncTime else {
            return "Never"
        }

        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: lastSync, relativeTo: Date())
    }
}

// MARK: - Service Extensions for Offline Support
// All loadFromCache methods are defined in their respective service files:
// - ProjectService.loadFromCache is defined in ProjectService.swift
// - DailyLogService.loadFromCache is defined in DailyLogService.swift
// - ClientService.loadFromCache is defined in ClientService.swift
// - EquipmentService.loadFromCache is defined in EquipmentService.swift
