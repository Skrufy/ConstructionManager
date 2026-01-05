//
//  DailyLogDetailView.swift
//  ConstructionManager
//
//  View and edit existing daily logs
//

import SwiftUI

struct DailyLogDetailView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @EnvironmentObject var appState: AppState
    let log: DailyLog

    @State private var showEditView = false

    private var isIPad: Bool {
        horizontalSizeClass == .regular
    }

    /// Whether the log can be edited - only draft or rejected logs can be edited
    private var canEdit: Bool {
        log.status == .draft || log.status == .rejected
    }

    private var dateFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMMM d, yyyy"
        return formatter
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                if isIPad {
                    // iPad: Two-column layout
                    iPadLayout
                } else {
                    // iPhone: Single column layout
                    iPhoneLayout
                }
            }
            .background(AppColors.background)
            .navigationTitle("Daily Log")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") { dismiss() }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    if canEdit {
                        Button(action: {
                            showEditView = true
                        }) {
                            HStack(spacing: AppSpacing.xs) {
                                Image(systemName: "pencil")
                                    .font(.system(size: 14, weight: .semibold))
                                Text("Edit")
                                    .font(AppTypography.buttonSmall)
                            }
                            .foregroundColor(AppColors.primary600)
                        }
                    }
                }
            }
            .sheet(isPresented: $showEditView) {
                EditDailyLogView(log: log)
            }
        }
    }

    // MARK: - iPhone Layout
    private var iPhoneLayout: some View {
        VStack(alignment: .leading, spacing: AppSpacing.lg) {
            headerCard
            if let weather = log.weather {
                weatherCard(weather)
            }
            if hasVisibleStats {
                statsSection
            }
            weatherDelaySection
            notesSection
        }
        .padding(AppSpacing.md)
    }

    // MARK: - iPad Layout
    private var iPadLayout: some View {
        VStack(alignment: .leading, spacing: AppSpacing.lg) {
            // Header spans full width
            headerCard

            // Two column layout for details
            HStack(alignment: .top, spacing: AppSpacing.lg) {
                // Left column
                VStack(alignment: .leading, spacing: AppSpacing.lg) {
                    if let weather = log.weather {
                        weatherCard(weather)
                    }
                    if hasVisibleStats {
                        statsSection
                    }
                }
                .frame(maxWidth: .infinity)

                // Right column
                VStack(alignment: .leading, spacing: AppSpacing.lg) {
                    weatherDelaySection
                    notesSection
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(AppSpacing.lg)
        .frame(maxWidth: 900)
    }

    // Check if there are any visible stats to display based on module settings
    private var hasVisibleStats: Bool {
        let hasCrewStats = log.crewCount > 0
        let hasHoursStats = log.totalHours > 0 && appState.shouldShowModule(.timeTracking)
        let hasEntriesStats = log.entriesCount > 0
        let hasMaterialsStats = log.materialsCount > 0 && appState.shouldShowModule(.materials)
        return hasCrewStats || hasHoursStats || hasEntriesStats || hasMaterialsStats
    }

    // MARK: - Header Card
    private var headerCard: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.md) {
                // Project & Date
                HStack(spacing: AppSpacing.md) {
                    IconCircle(
                        icon: "building.2.fill",
                        size: .medium,
                        foregroundColor: AppColors.primary600,
                        backgroundColor: AppColors.primary50
                    )

                    VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                        Text(log.projectName ?? "Unknown Project")
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        Text(dateFormatter.string(from: log.date))
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                    }

                    Spacer()

                    // Status Badge
                    StatusBadge(text: statusText, status: statusBadgeType)
                }

                // Submitter Info + Edit Button
                HStack {
                    if let submitterName = log.submitterName {
                        HStack(spacing: AppSpacing.xs) {
                            Image(systemName: "person.fill")
                                .font(.system(size: 14))
                                .foregroundColor(AppColors.textTertiary)
                            Text("Submitted by \(submitterName)")
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textSecondary)
                        }
                    }

                    Spacer()

                    // Edit button for draft/rejected logs
                    if canEdit {
                        Button(action: {
                            showEditView = true
                        }) {
                            HStack(spacing: AppSpacing.xs) {
                                Image(systemName: "pencil")
                                    .font(.system(size: 14, weight: .medium))
                                Text("Edit Log")
                                    .font(AppTypography.buttonSmall)
                            }
                            .foregroundColor(.white)
                            .padding(.horizontal, AppSpacing.md)
                            .padding(.vertical, AppSpacing.sm)
                            .background(AppColors.primary600)
                            .cornerRadius(AppSpacing.radiusLarge)
                        }
                    }
                }
            }
        }
    }

    private var statusText: String {
        switch log.status {
        case .draft: return "Draft"
        case .submitted: return "Submitted"
        case .approved: return "Approved"
        case .rejected: return "Rejected"
        }
    }

    private var statusBadgeType: BadgeStatus {
        switch log.status {
        case .draft: return .pending
        case .submitted: return .info
        case .approved: return .active
        case .rejected: return .warning
        }
    }

    // MARK: - Weather Card
    private func weatherCard(_ weather: WeatherData) -> some View {
        AppCard {
            VStack(spacing: AppSpacing.sm) {
                HStack {
                    Text("Weather")
                        .font(AppTypography.labelSmall)
                        .foregroundColor(AppColors.textSecondary)
                    Spacer()
                }

                HStack(spacing: AppSpacing.lg) {
                    HStack(spacing: AppSpacing.sm) {
                        Image(systemName: weather.conditionIcon)
                            .font(.system(size: 32))
                            .foregroundColor(AppColors.primary500)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(weather.temperatureFormatted)
                                .font(.system(size: 24, weight: .bold))
                                .foregroundColor(AppColors.textPrimary)
                            Text(weather.condition)
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textSecondary)
                        }
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: AppSpacing.xs) {
                        Label("\(weather.humidity)%", systemImage: "humidity.fill")
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                        Label("\(Int(weather.windSpeed)) mph", systemImage: "wind")
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                    }
                }
            }
        }
    }

    // MARK: - Stats Section
    private var statsSection: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                Text("Summary")
                    .font(AppTypography.labelSmall)
                    .foregroundColor(AppColors.textSecondary)

                HStack(spacing: AppSpacing.lg) {
                    if log.crewCount > 0 {
                        StatItem(value: "\(log.crewCount)", label: "Crew", icon: "person.2.fill")
                    }
                    // Only show Hours if timeTracking module is enabled
                    if log.totalHours > 0 && appState.shouldShowModule(.timeTracking) {
                        StatItem(value: String(format: "%.1f", log.totalHours), label: "Hours", icon: "clock.fill")
                    }
                    if log.entriesCount > 0 {
                        StatItem(value: "\(log.entriesCount)", label: "Entries", icon: "list.bullet")
                    }
                    // Only show Materials if materials module is enabled
                    if log.materialsCount > 0 && appState.shouldShowModule(.materials) {
                        StatItem(value: "\(log.materialsCount)", label: "Materials", icon: "shippingbox.fill")
                    }
                }
            }
        }
    }

    // MARK: - Weather Delay Section
    private var weatherDelaySection: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                Text("Weather Delays")
                    .font(AppTypography.labelSmall)
                    .foregroundColor(AppColors.textSecondary)

                HStack(spacing: AppSpacing.sm) {
                    Image(systemName: log.weatherDelay ? "cloud.rain.fill" : "sun.max.fill")
                        .font(.system(size: 20))
                        .foregroundColor(log.weatherDelay ? AppColors.warning : AppColors.success)
                    Text(log.weatherDelay ? "Weather delay reported" : "No weather delays")
                        .font(AppTypography.body)
                        .foregroundColor(AppColors.textPrimary)
                }

                if log.weatherDelay, let delayNotes = log.weatherDelayNotes, !delayNotes.isEmpty {
                    Text(delayNotes)
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                        .padding(.top, AppSpacing.xs)
                }
            }
        }
    }

    // MARK: - Notes Section
    private var notesSection: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                Text("Notes")
                    .font(AppTypography.labelSmall)
                    .foregroundColor(AppColors.textSecondary)

                if let notes = log.notes, !notes.isEmpty {
                    Text(notes)
                        .font(AppTypography.body)
                        .foregroundColor(AppColors.textPrimary)
                } else {
                    Text("No notes added")
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textTertiary)
                        .italic()
                }
            }
        }
    }
}

// MARK: - Stat Item
private struct StatItem: View {
    let value: String
    let label: String
    let icon: String

    var body: some View {
        VStack(spacing: AppSpacing.xxs) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(AppColors.primary600)
            Text(value)
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)
            Text(label)
                .font(AppTypography.caption)
                .foregroundColor(AppColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
    }
}

#Preview {
    DailyLogDetailView(log: DailyLog.mockLogs[0])
}
