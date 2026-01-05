//
//  NetworkMonitor.swift
//  ConstructionManager
//
//  Network connectivity monitoring using Network framework
//

import Foundation
import Network
import Combine

/// Monitors network connectivity status for offline support
@MainActor
class NetworkMonitor: ObservableObject {
    static let shared = NetworkMonitor()

    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "NetworkMonitor")

    @Published private(set) var isConnected = true
    @Published private(set) var connectionType: ConnectionType = .unknown
    @Published private(set) var isExpensive = false  // Cellular data
    @Published private(set) var isConstrained = false  // Low Data Mode

    /// History of connectivity changes for debugging
    private(set) var connectivityHistory: [(Date, Bool)] = []
    private let maxHistoryCount = 50

    enum ConnectionType: String {
        case wifi = "WiFi"
        case cellular = "Cellular"
        case wiredEthernet = "Ethernet"
        case unknown = "Unknown"
        case none = "No Connection"
    }

    private init() {
        startMonitoring()
    }

    deinit {
        monitor.cancel()
    }

    func startMonitoring() {
        monitor.pathUpdateHandler = { [weak self] path in
            Task { @MainActor [weak self] in
                guard let self = self else { return }

                let wasConnected = self.isConnected
                self.isConnected = path.status == .satisfied
                self.isExpensive = path.isExpensive
                self.isConstrained = path.isConstrained

                // Determine connection type
                if path.usesInterfaceType(.wifi) {
                    self.connectionType = .wifi
                } else if path.usesInterfaceType(.cellular) {
                    self.connectionType = .cellular
                } else if path.usesInterfaceType(.wiredEthernet) {
                    self.connectionType = .wiredEthernet
                } else if path.status == .satisfied {
                    self.connectionType = .unknown
                } else {
                    self.connectionType = .none
                }

                // Track connectivity changes
                if wasConnected != self.isConnected {
                    self.recordConnectivityChange(self.isConnected)

                    // Notify the system about connectivity change
                    NotificationCenter.default.post(
                        name: .networkConnectivityChanged,
                        object: nil,
                        userInfo: ["isConnected": self.isConnected]
                    )

                    print("[NetworkMonitor] Connectivity changed: \(self.isConnected ? "Online" : "Offline") via \(self.connectionType.rawValue)")
                }
            }
        }

        monitor.start(queue: queue)
    }

    func stopMonitoring() {
        monitor.cancel()
    }

    private func recordConnectivityChange(_ connected: Bool) {
        connectivityHistory.append((Date(), connected))

        // Keep history bounded
        if connectivityHistory.count > maxHistoryCount {
            connectivityHistory.removeFirst()
        }
    }

    /// Check if network is suitable for large data transfers
    var isSuitableForLargeTransfers: Bool {
        isConnected && !isExpensive && !isConstrained
    }

    /// Get a human-readable status string
    var statusDescription: String {
        if !isConnected {
            return "Offline"
        }

        var status = connectionType.rawValue

        if isExpensive {
            status += " (Cellular)"
        }

        if isConstrained {
            status += " (Low Data)"
        }

        return status
    }
}

// MARK: - Notification Names
extension Notification.Name {
    static let networkConnectivityChanged = Notification.Name("networkConnectivityChanged")
    static let offlineDataSynced = Notification.Name("offlineDataSynced")
    static let syncQueueUpdated = Notification.Name("syncQueueUpdated")
}
