//
//  StatusBadge.swift
//  ConstructionManager
//
//  Status badge component for projects, tasks, etc.
//

import SwiftUI

enum BadgeStatus {
    case active
    case pending
    case completed
    case cancelled
    case warning
    case info

    var backgroundColor: Color {
        switch self {
        case .active: return AppColors.success.opacity(0.15)
        case .pending: return AppColors.warning.opacity(0.15)
        case .completed: return AppColors.primary500.opacity(0.15)
        case .cancelled: return AppColors.gray400.opacity(0.15)
        case .warning: return AppColors.error.opacity(0.15)
        case .info: return AppColors.info.opacity(0.15)
        }
    }

    var textColor: Color {
        switch self {
        case .active: return AppColors.success
        case .pending: return AppColors.warning
        case .completed: return AppColors.primary600
        case .cancelled: return AppColors.gray500
        case .warning: return AppColors.error
        case .info: return AppColors.info
        }
    }
}

struct StatusBadge: View {
    let text: String
    let status: BadgeStatus

    var body: some View {
        Text(text)
            .font(AppTypography.captionMedium)
            .foregroundColor(status.textColor)
            .padding(.horizontal, AppSpacing.xs)
            .padding(.vertical, AppSpacing.xxs)
            .background(status.backgroundColor)
            .cornerRadius(AppSpacing.radiusSmall)
    }
}

// MARK: - Icon Badge (for notifications)
struct IconBadge: View {
    let count: Int

    var body: some View {
        if count > 0 {
            Text(count > 99 ? "99+" : "\(count)")
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(.white)
                .padding(.horizontal, 5)
                .padding(.vertical, 2)
                .background(AppColors.error)
                .cornerRadius(AppSpacing.radiusFull)
        }
    }
}

#Preview {
    VStack(spacing: 16) {
        HStack(spacing: 8) {
            StatusBadge(text: "Active", status: .active)
            StatusBadge(text: "Pending", status: .pending)
            StatusBadge(text: "Completed", status: .completed)
        }
        HStack(spacing: 8) {
            StatusBadge(text: "Cancelled", status: .cancelled)
            StatusBadge(text: "Warning", status: .warning)
            StatusBadge(text: "Info", status: .info)
        }
        HStack(spacing: 16) {
            ZStack(alignment: .topTrailing) {
                Image(systemName: "bell.fill")
                    .font(.system(size: 24))
                IconBadge(count: 5)
                    .offset(x: 8, y: -8)
            }
            ZStack(alignment: .topTrailing) {
                Image(systemName: "bell.fill")
                    .font(.system(size: 24))
                IconBadge(count: 150)
                    .offset(x: 12, y: -8)
            }
        }
    }
    .padding()
}
