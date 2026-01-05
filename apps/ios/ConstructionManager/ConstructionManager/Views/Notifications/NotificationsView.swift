//
//  NotificationsView.swift
//  ConstructionManager
//
//  Notifications list view
//

import SwiftUI

struct NotificationsView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var notificationService = NotificationService.shared

    var body: some View {
        NavigationStack {
            Group {
                if notificationService.notifications.isEmpty {
                    emptyState
                } else {
                    notificationsList
                }
            }
            .background(AppColors.background)
            .navigationTitle("Notifications")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    if !notificationService.notifications.isEmpty {
                        Button("Mark All Read") {
                            Task {
                                await notificationService.markAllAsRead()
                            }
                        }
                        .foregroundColor(AppColors.primary600)
                    }
                }
            }
            .refreshable {
                await notificationService.refresh()
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: AppSpacing.md) {
            Spacer()
            Image(systemName: "bell.slash")
                .font(.system(size: 56))
                .foregroundColor(AppColors.gray300)
            Text("No Notifications")
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)
            Text("You're all caught up!")
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var notificationsList: some View {
        ScrollView {
            LazyVStack(spacing: AppSpacing.sm) {
                ForEach(notificationService.notifications) { notification in
                    NotificationCard(notification: notification) {
                        notificationService.deleteNotification(id: notification.id)
                    }
                }
            }
            .padding(AppSpacing.md)
        }
    }
}

// MARK: - Notification Card
struct NotificationCard: View {
    let notification: AppNotification
    let onDismiss: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: AppSpacing.sm) {
            // Icon
            ZStack {
                Circle()
                    .fill(notification.type.color.opacity(0.15))
                    .frame(width: 40, height: 40)
                Image(systemName: notification.type.icon)
                    .font(.system(size: 18))
                    .foregroundColor(notification.type.color)
            }

            // Content
            VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                Text(notification.title)
                    .font(AppTypography.bodySemibold)
                    .foregroundColor(AppColors.textPrimary)
                Text(notification.message)
                    .font(AppTypography.secondary)
                    .foregroundColor(AppColors.textSecondary)
                    .lineLimit(2)
                Text(notification.timeAgo)
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textTertiary)
            }

            Spacer()

            // Dismiss button
            Button(action: onDismiss) {
                Image(systemName: "xmark")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(AppColors.gray400)
                    .padding(AppSpacing.xs)
            }
        }
        .padding(AppSpacing.md)
        .background(AppColors.cardBackground)
        .cornerRadius(AppSpacing.radiusLarge)
        .overlay(
            RoundedRectangle(cornerRadius: AppSpacing.radiusLarge)
                .stroke(notification.isUnread ? AppColors.primary500 : Color.clear, lineWidth: 2)
        )
    }
}

// MARK: - AppNotification Model
struct AppNotification: Identifiable {
    let id: String
    let type: NotificationType
    let title: String
    let message: String
    let timestamp: Date
    var isUnread: Bool

    var timeAgo: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: timestamp, relativeTo: Date())
    }

    enum NotificationType {
        case approval
        case warning
        case info
        case success

        var icon: String {
            switch self {
            case .approval: return "checkmark.circle.fill"
            case .warning: return "exclamationmark.triangle.fill"
            case .info: return "info.circle.fill"
            case .success: return "checkmark.seal.fill"
            }
        }

        var color: Color {
            switch self {
            case .approval: return AppColors.primary600
            case .warning: return AppColors.warning
            case .info: return AppColors.info
            case .success: return AppColors.success
            }
        }
    }

    static let mockNotifications: [AppNotification] = [
        AppNotification(
            id: "1",
            type: .approval,
            title: "Time Entry Approved",
            message: "Your time entry for Dec 23 has been approved by John Smith.",
            timestamp: Date().addingTimeInterval(-300),
            isUnread: true
        ),
        AppNotification(
            id: "2",
            type: .warning,
            title: "Document Expiring Soon",
            message: "Your OSHA 30-Hour certification expires in 15 days.",
            timestamp: Date().addingTimeInterval(-3600),
            isUnread: true
        ),
        AppNotification(
            id: "3",
            type: .info,
            title: "New Drawing Uploaded",
            message: "A-103 Floor Plan has been added to Downtown Office project.",
            timestamp: Date().addingTimeInterval(-86400),
            isUnread: false
        ),
        AppNotification(
            id: "4",
            type: .success,
            title: "Daily Log Submitted",
            message: "Your daily log for Dec 22 was successfully submitted.",
            timestamp: Date().addingTimeInterval(-172800),
            isUnread: false
        )
    ]
}

#Preview {
    NotificationsView()
}
