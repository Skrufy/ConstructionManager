//
//  NotificationService.swift
//  ConstructionManager
//
//  Service for managing notifications and push notifications
//

import Foundation
import UserNotifications
import Combine
import UIKit

@MainActor
class NotificationService: ObservableObject {
    static let shared = NotificationService()

    @Published var notifications: [AppNotification] = []
    @Published var unreadCount: Int = 0
    @Published var isLoading = false
    @Published var error: String?

    private let apiClient = APIClient.shared

    private init() {
        // Load notifications if authenticated
        if apiClient.hasValidToken() {
            Task {
                await fetchNotifications()
            }
        } else {
            // Use mock data
            notifications = AppNotification.mockNotifications
            unreadCount = notifications.filter { $0.isUnread }.count
        }
    }

    // MARK: - Fetch Notifications

    func fetchNotifications(unreadOnly: Bool = false) async {
        guard apiClient.hasValidToken() else {
            notifications = AppNotification.mockNotifications
            unreadCount = notifications.filter { $0.isUnread }.count
            return
        }

        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            var queryItems: [URLQueryItem] = []
            if unreadOnly {
                queryItems.append(URLQueryItem(name: "unreadOnly", value: "true"))
            }

            let response: NotificationsResponse = try await apiClient.get(
                "/notifications",
                queryItems: queryItems.isEmpty ? nil : queryItems
            )

            self.notifications = response.notifications.map { $0.toAppNotification() }
            self.unreadCount = response.unreadCount
        } catch {
            self.error = error.localizedDescription
            print("Failed to fetch notifications: \(error)")
            // Fall back to mock data
            notifications = AppNotification.mockNotifications
            unreadCount = notifications.filter { $0.isUnread }.count
        }
    }

    // MARK: - Mark as Read

    func markAsRead(notificationId: String) async {
        guard apiClient.hasValidToken() else {
            // Update locally for mock
            if let index = notifications.firstIndex(where: { $0.id == notificationId }) {
                var notification = notifications[index]
                notification.isUnread = false
                notifications[index] = notification
                unreadCount = max(0, unreadCount - 1)
            }
            return
        }

        let request = MarkNotificationReadRequest(notificationId: notificationId, markAll: nil)

        do {
            try await apiClient.post("/notifications", body: request)

            // Update locally
            if let index = notifications.firstIndex(where: { $0.id == notificationId }) {
                var notification = notifications[index]
                notification.isUnread = false
                notifications[index] = notification
                unreadCount = max(0, unreadCount - 1)
            }
        } catch {
            print("Failed to mark notification as read: \(error)")
        }
    }

    func markAllAsRead() async {
        guard apiClient.hasValidToken() else {
            // Update locally for mock
            for index in notifications.indices {
                notifications[index].isUnread = false
            }
            unreadCount = 0
            return
        }

        let request = MarkNotificationReadRequest(notificationId: nil, markAll: true)

        do {
            try await apiClient.post("/notifications", body: request)

            // Update locally
            for index in notifications.indices {
                notifications[index].isUnread = false
            }
            unreadCount = 0
        } catch {
            print("Failed to mark all notifications as read: \(error)")
        }
    }

    // MARK: - Delete Notification

    func deleteNotification(id: String) {
        notifications.removeAll { $0.id == id }
        // Note: Backend doesn't have delete endpoint yet
    }

    func clearAll() {
        notifications.removeAll()
        unreadCount = 0
    }

    // MARK: - Push Notification Setup

    func requestPushPermission() async -> Bool {
        let center = UNUserNotificationCenter.current()

        do {
            let granted = try await center.requestAuthorization(options: [.alert, .badge, .sound])
            if granted {
                await registerForRemoteNotifications()
            }
            return granted
        } catch {
            print("Failed to request notification permission: \(error)")
            return false
        }
    }

    @MainActor
    private func registerForRemoteNotifications() async {
        // This triggers the delegate method in AppDelegate
        // which will call registerDeviceToken
        UIApplication.shared.registerForRemoteNotifications()
    }

    func registerDeviceToken(_ token: Data) async {
        let tokenString = token.map { String(format: "%02.2hhx", $0) }.joined()
        print("Device token: \(tokenString)")

        await AuthService.shared.registerDeviceToken(
            tokenString,
            appVersion: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String
        )
    }

    // MARK: - Refresh

    func refresh() async {
        await fetchNotifications()
    }
}
