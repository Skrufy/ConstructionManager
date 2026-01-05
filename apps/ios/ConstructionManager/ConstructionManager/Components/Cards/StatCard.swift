//
//  StatCard.swift
//  ConstructionManager
//
//  Statistics/metrics card component
//

import SwiftUI

struct StatCard: View {
    let value: String
    let label: String
    let icon: String?
    let color: Color

    init(
        value: String,
        label: String,
        icon: String? = nil,
        color: Color = AppColors.primary500
    ) {
        self.value = value
        self.label = label
        self.icon = icon
        self.color = color
    }

    var body: some View {
        VStack(spacing: AppSpacing.xs) {
            if let icon = icon {
                Image(systemName: icon)
                    .font(.system(size: AppSpacing.iconLarge, weight: .medium))
                    .foregroundColor(color)
            }
            Text(value)
                .font(.system(size: 28, weight: .bold))
                .foregroundColor(AppColors.textPrimary)
            Text(label)
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(AppSpacing.md)
        .background(color.opacity(0.1))
        .cornerRadius(AppSpacing.radiusLarge)
    }
}

// MARK: - Compact Stat Card
struct CompactStatCard: View {
    let value: String
    let label: String
    let icon: String
    let color: Color

    var body: some View {
        HStack(spacing: AppSpacing.xs) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.15))
                    .frame(width: 36, height: 36)
                Image(systemName: icon)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(color)
            }
            .fixedSize()

            VStack(alignment: .leading, spacing: 1) {
                Text(value)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(AppColors.textPrimary)
                    .lineLimit(1)
                Text(label)
                    .font(.system(size: 11))
                    .foregroundColor(AppColors.textSecondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, AppSpacing.sm)
        .padding(.vertical, AppSpacing.xs)
        .frame(minHeight: 52)
        .background(AppColors.cardBackground)
        .cornerRadius(AppSpacing.radiusMedium)
    }
}

// MARK: - Vertical Stat Card (for 4-column grid layouts)
struct VerticalStatCard: View {
    let value: String
    let label: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: AppSpacing.xs) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.15))
                    .frame(width: 36, height: 36)
                Image(systemName: icon)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(color)
            }
            Text(value)
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)
            Text(label)
                .font(AppTypography.caption)
                .foregroundColor(AppColors.textSecondary)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, AppSpacing.sm)
        .padding(.horizontal, AppSpacing.xs)
        .background(AppColors.cardBackground)
        .cornerRadius(AppSpacing.radiusMedium)
    }
}

#Preview {
    VStack(spacing: 16) {
        HStack(spacing: 12) {
            StatCard(value: "42", label: "Hours This Week", icon: "clock.fill", color: AppColors.primary500)
            StatCard(value: "8", label: "Daily Logs", icon: "doc.text.fill", color: AppColors.success)
        }

        CompactStatCard(value: "12", label: "Active Projects", icon: "folder.fill", color: AppColors.orange)

        HStack(spacing: 8) {
            VerticalStatCard(value: "2", label: "Active Projects", icon: "folder.fill", color: AppColors.success)
            VerticalStatCard(value: "93", label: "Documents", icon: "doc.fill", color: AppColors.info)
            VerticalStatCard(value: "120", label: "Drawings", icon: "doc.richtext.fill", color: AppColors.orange)
            VerticalStatCard(value: "213", label: "Daily Logs", icon: "doc.text.fill", color: AppColors.warning)
        }
    }
    .padding()
    .background(AppColors.background)
}
