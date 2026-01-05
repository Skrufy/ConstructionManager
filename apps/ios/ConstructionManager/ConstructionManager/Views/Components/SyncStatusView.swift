//
//  SyncStatusView.swift
//  ConstructionManager
//
//  UI components for displaying sync status and offline indicators
//

import SwiftUI

// MARK: - Sync Status Badge
struct SyncStatusBadge: View {
    @StateObject private var offlineManager = OfflineManager.shared
    @StateObject private var networkMonitor = NetworkMonitor.shared

    var compact: Bool = false

    var body: some View {
        HStack(spacing: AppSpacing.xs) {
            // Connection indicator
            Circle()
                .fill(networkMonitor.isConnected ? AppColors.success : AppColors.error)
                .frame(width: 8, height: 8)

            if !compact {
                // Status text
                Text(statusText)
                    .font(AppTypography.caption)
                    .foregroundColor(statusColor)
            }

            // Sync indicator
            if offlineManager.syncStatus == .syncing {
                ProgressView()
                    .scaleEffect(0.6)
            } else if case .pendingChanges(let count) = offlineManager.syncStatus {
                Text("\(count)")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.white)
                    .frame(width: 16, height: 16)
                    .background(AppColors.warning)
                    .clipShape(Circle())
            }
        }
        .padding(.horizontal, compact ? AppSpacing.xs : AppSpacing.sm)
        .padding(.vertical, AppSpacing.xxs)
        .background(backgroundColor.opacity(0.15))
        .cornerRadius(AppSpacing.radiusFull)
    }

    private var statusText: String {
        if !networkMonitor.isConnected {
            return "Offline"
        }
        return offlineManager.syncStatus.displayText
    }

    private var statusColor: Color {
        if !networkMonitor.isConnected {
            return AppColors.error
        }

        switch offlineManager.syncStatus {
        case .synced:
            return AppColors.success
        case .syncing:
            return AppColors.info
        case .error:
            return AppColors.error
        case .pendingChanges:
            return AppColors.warning
        case .idle:
            return AppColors.textSecondary
        }
    }

    private var backgroundColor: Color {
        if !networkMonitor.isConnected {
            return AppColors.error
        }

        switch offlineManager.syncStatus {
        case .synced:
            return AppColors.success
        case .error:
            return AppColors.error
        case .pendingChanges:
            return AppColors.warning
        default:
            return AppColors.gray400
        }
    }
}

// MARK: - Offline Banner
struct OfflineBanner: View {
    @StateObject private var networkMonitor = NetworkMonitor.shared
    @StateObject private var offlineManager = OfflineManager.shared

    @State private var isExpanded = false

    var body: some View {
        if !networkMonitor.isConnected || offlineManager.syncQueue.hasPendingOperations {
            VStack(spacing: 0) {
                Button(action: { withAnimation { isExpanded.toggle() } }) {
                    HStack(spacing: AppSpacing.sm) {
                        Image(systemName: networkMonitor.isConnected ? "arrow.triangle.2.circlepath" : "wifi.slash")
                            .font(.system(size: 14, weight: .medium))

                        Text(bannerText)
                            .font(AppTypography.secondaryMedium)

                        Spacer()

                        if offlineManager.syncQueue.hasPendingOperations {
                            Text("\(offlineManager.syncQueue.pendingCount) pending")
                                .font(AppTypography.caption)
                                .padding(.horizontal, AppSpacing.xs)
                                .padding(.vertical, 2)
                                .background(Color.white.opacity(0.2))
                                .cornerRadius(4)
                        }

                        Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                            .font(.system(size: 12))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, AppSpacing.md)
                    .padding(.vertical, AppSpacing.sm)
                    .background(bannerColor)
                }

                if isExpanded {
                    expandedContent
                }
            }
        }
    }

    private var bannerText: String {
        if !networkMonitor.isConnected {
            return "You're offline"
        } else if offlineManager.syncQueue.hasPendingOperations {
            return "Changes waiting to sync"
        }
        return ""
    }

    private var bannerColor: Color {
        networkMonitor.isConnected ? AppColors.warning : AppColors.error
    }

    private var expandedContent: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            if !networkMonitor.isConnected {
                HStack(spacing: AppSpacing.sm) {
                    Image(systemName: "info.circle")
                    Text("Your changes will sync when you're back online")
                        .font(AppTypography.secondary)
                }

                if let lastSync = offlineManager.lastSyncTime {
                    HStack(spacing: AppSpacing.sm) {
                        Image(systemName: "clock")
                        Text("Last synced: \(offlineManager.formattedLastSync)")
                            .font(AppTypography.caption)
                    }
                }
            }

            if offlineManager.syncQueue.hasPendingOperations && networkMonitor.isConnected {
                Button(action: { offlineManager.triggerSync() }) {
                    HStack {
                        Image(systemName: "arrow.triangle.2.circlepath")
                        Text("Sync Now")
                    }
                    .font(AppTypography.secondaryMedium)
                    .foregroundColor(bannerColor)
                    .padding(.horizontal, AppSpacing.md)
                    .padding(.vertical, AppSpacing.xs)
                    .background(Color.white)
                    .cornerRadius(AppSpacing.radiusSmall)
                }
            }
        }
        .foregroundColor(.white.opacity(0.9))
        .padding(AppSpacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(bannerColor.opacity(0.9))
    }
}

// MARK: - Sync Status Card (for Settings)
struct SyncStatusCard: View {
    @StateObject private var offlineManager = OfflineManager.shared
    @StateObject private var networkMonitor = NetworkMonitor.shared

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.md) {
                // Header
                HStack {
                    Image(systemName: "arrow.triangle.2.circlepath.circle.fill")
                        .font(.system(size: 24))
                        .foregroundColor(AppColors.primary600)

                    Text("Sync Status")
                        .font(AppTypography.heading3)
                        .foregroundColor(AppColors.textPrimary)

                    Spacer()

                    SyncStatusBadge()
                }

                Divider()

                // Connection Status
                HStack {
                    Text("Connection")
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                    Spacer()
                    HStack(spacing: AppSpacing.xs) {
                        Circle()
                            .fill(networkMonitor.isConnected ? AppColors.success : AppColors.error)
                            .frame(width: 8, height: 8)
                        Text(networkMonitor.statusDescription)
                            .font(AppTypography.secondaryMedium)
                            .foregroundColor(AppColors.textPrimary)
                    }
                }

                // Last Sync
                HStack {
                    Text("Last Synced")
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                    Spacer()
                    Text(offlineManager.formattedLastSync)
                        .font(AppTypography.secondaryMedium)
                        .foregroundColor(AppColors.textPrimary)
                }

                // Cached Data Size
                HStack {
                    Text("Cached Data")
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                    Spacer()
                    Text(offlineManager.dataStore.formattedCacheSize)
                        .font(AppTypography.secondaryMedium)
                        .foregroundColor(AppColors.textPrimary)
                }

                // Pending Changes
                if offlineManager.syncQueue.hasPendingOperations {
                    HStack {
                        Text("Pending Changes")
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                        Spacer()
                        Text("\(offlineManager.syncQueue.pendingCount)")
                            .font(AppTypography.secondaryMedium)
                            .foregroundColor(AppColors.warning)
                    }
                }

                // Actions
                HStack(spacing: AppSpacing.sm) {
                    Button(action: { offlineManager.triggerSync() }) {
                        HStack {
                            if offlineManager.syncStatus == .syncing {
                                ProgressView()
                                    .scaleEffect(0.8)
                            } else {
                                Image(systemName: "arrow.triangle.2.circlepath")
                            }
                            Text("Sync Now")
                        }
                        .font(AppTypography.secondaryMedium)
                        .foregroundColor(.white)
                        .padding(.horizontal, AppSpacing.md)
                        .padding(.vertical, AppSpacing.sm)
                        .background(networkMonitor.isConnected ? AppColors.primary600 : AppColors.gray400)
                        .cornerRadius(AppSpacing.radiusSmall)
                    }
                    .disabled(!networkMonitor.isConnected || offlineManager.syncStatus == .syncing)

                    Button(action: {
                        Task {
                            await offlineManager.cacheData()
                        }
                    }) {
                        HStack {
                            Image(systemName: "arrow.down.circle")
                            Text("Cache Data")
                        }
                        .font(AppTypography.secondaryMedium)
                        .foregroundColor(AppColors.primary600)
                        .padding(.horizontal, AppSpacing.md)
                        .padding(.vertical, AppSpacing.sm)
                        .background(AppColors.primary100)
                        .cornerRadius(AppSpacing.radiusSmall)
                    }
                    .disabled(!networkMonitor.isConnected)
                }
            }
        }
    }
}

// MARK: - Pending Operations List
struct PendingOperationsView: View {
    @StateObject private var syncQueue = SyncQueue.shared

    var body: some View {
        List {
            if syncQueue.pendingOperations.isEmpty {
                Text("No pending operations")
                    .font(AppTypography.secondary)
                    .foregroundColor(AppColors.textSecondary)
                    .frame(maxWidth: .infinity)
                    .listRowBackground(Color.clear)
            } else {
                ForEach(syncQueue.pendingOperations) { operation in
                    PendingOperationRow(operation: operation)
                }
                .onDelete { indexSet in
                    for index in indexSet {
                        let operation = syncQueue.pendingOperations[index]
                        syncQueue.dequeue(operation.id)
                    }
                }
            }
        }
        .navigationTitle("Pending Changes")
        .toolbar {
            if !syncQueue.pendingOperations.isEmpty {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Clear All") {
                        syncQueue.clearQueue()
                    }
                    .foregroundColor(AppColors.error)
                }
            }
        }
    }
}

struct PendingOperationRow: View {
    let operation: PendingOperation

    private var formatter: DateFormatter {
        let f = DateFormatter()
        f.dateStyle = .short
        f.timeStyle = .short
        return f
    }

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.xs) {
            HStack {
                Image(systemName: iconForType(operation.type))
                    .foregroundColor(colorForType(operation.type))
                Text(operation.displayDescription)
                    .font(AppTypography.bodySemibold)
                Spacer()
                if !operation.canRetry {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(AppColors.error)
                }
            }

            HStack {
                Text(formatter.string(from: operation.createdAt))
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textTertiary)

                if operation.retryCount > 0 {
                    Text("(\(operation.retryCount) retries)")
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.warning)
                }
            }

            if let error = operation.error {
                Text(error)
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.error)
            }
        }
        .padding(.vertical, AppSpacing.xs)
    }

    private func iconForType(_ type: PendingOperation.OperationType) -> String {
        switch type {
        case .create: return "plus.circle"
        case .update: return "pencil.circle"
        case .delete: return "trash.circle"
        case .submit: return "paperplane.circle"
        }
    }

    private func colorForType(_ type: PendingOperation.OperationType) -> Color {
        switch type {
        case .create: return AppColors.success
        case .update: return AppColors.info
        case .delete: return AppColors.error
        case .submit: return AppColors.primary600
        }
    }
}

#Preview {
    VStack(spacing: 20) {
        SyncStatusBadge()
        SyncStatusBadge(compact: true)
        OfflineBanner()
        SyncStatusCard()
    }
    .padding()
    .background(AppColors.background)
}
