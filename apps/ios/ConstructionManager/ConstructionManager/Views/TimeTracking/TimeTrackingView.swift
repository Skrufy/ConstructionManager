//
//  TimeTrackingView.swift
//  ConstructionManager
//
//  Time tracking view with clock in/out functionality
//

import SwiftUI
import CoreLocation
import Combine

struct TimeTrackingView: View {
    @StateObject private var timeManager = TimeTrackingManager.shared
    @StateObject private var projectService = ProjectService.shared
    @EnvironmentObject var appState: AppState
    @State private var selectedTab = 0
    @State private var showingClockOutConfirmation = false
    @State private var showingProjectPicker = false
    @State private var showingError = false

    private var canClockInOut: Bool {
        appState.hasPermission(.clockInOut)
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Segment Control
                Picker("View", selection: $selectedTab) {
                    Text("timeTracking.today".localized).tag(0)
                    Text("timeTracking.thisWeek".localized).tag(1)
                    Text("timeTracking.history".localized).tag(2)
                }
                .pickerStyle(.segmented)
                .padding(AppSpacing.md)

                ScrollView {
                    VStack(spacing: AppSpacing.lg) {
                        // Clock In/Out Card
                        clockCard

                        // Stats Summary
                        statsSummary

                        // Time Entries
                        entriesList
                    }
                    .padding(AppSpacing.md)
                }
            }
            .background(AppColors.background)
            .navigationTitle("nav.timeTracking".localized)
        }
        .alert("timeTracking.clockOutQuestion".localized, isPresented: $showingClockOutConfirmation) {
            Button("timeTracking.clockOut".localized, role: .destructive) {
                timeManager.clockOut()
            }
            Button("common.cancel".localized, role: .cancel) {}
        } message: {
            Text("timeTracking.clockOutMessage".localized)
        }
        .sheet(isPresented: $showingProjectPicker) {
            ProjectPickerView(
                projects: projectService.projects,
                onSelect: { project in
                    timeManager.clockIn(to: project)
                }
            )
        }
        .task {
            // Fetch current time entries to get clock-in state
            await timeManager.fetchTimeEntries()
            await projectService.fetchProjects()
        }
        .refreshable {
            await timeManager.fetchTimeEntries()
        }
        .alert("common.error".localized, isPresented: $showingError) {
            Button("common.ok".localized, role: .cancel) {
                timeManager.error = nil
            }
        } message: {
            Text(timeManager.error ?? "error.generic".localized)
        }
        .onChange(of: timeManager.error) { _, newError in
            if newError != nil {
                showingError = true
            }
        }
    }

    // MARK: - Clock Card
    private var clockCard: some View {
        AppCard {
            VStack(spacing: AppSpacing.md) {
                if let activeEntry = timeManager.activeEntry {
                    // Active Clock - Show timer
                    HStack(spacing: AppSpacing.md) {
                        // Pulsing indicator
                        ZStack {
                            Circle()
                                .fill(AppColors.success.opacity(0.2))
                                .frame(width: 64, height: 64)
                            Circle()
                                .fill(AppColors.success.opacity(0.3))
                                .frame(width: 48, height: 48)
                                .scaleEffect(timeManager.pulseAnimation ? 1.2 : 1.0)
                                .animation(.easeInOut(duration: 1).repeatForever(autoreverses: true), value: timeManager.pulseAnimation)
                            Image(systemName: "clock.fill")
                                .font(.system(size: 24))
                                .foregroundColor(AppColors.success)
                        }

                        VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                            Text("timeTracking.currentlyWorking".localized)
                                .font(AppTypography.bodySemibold)
                                .foregroundColor(AppColors.textPrimary)
                            Text(timeManager.activeProjectName ?? "dailyLogs.unknownProject".localized)
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textSecondary)
                            HStack(spacing: AppSpacing.xs) {
                                Image(systemName: "clock")
                                    .font(.system(size: 12))
                                Text("Started \(activeEntry.clockInFormatted)")
                                    .font(AppTypography.caption)
                            }
                            .foregroundColor(AppColors.textTertiary)
                        }

                        Spacer()

                        // Timer Display
                        VStack(alignment: .trailing, spacing: 2) {
                            Text(timeManager.elapsedTimeFormatted)
                                .font(.system(size: 28, weight: .bold, design: .monospaced))
                                .foregroundColor(AppColors.success)
                            StatusBadge(text: "Active", status: .active)
                        }
                    }

                    // GPS indicator
                    if activeEntry.gpsLatitude != nil {
                        HStack(spacing: AppSpacing.xs) {
                            Image(systemName: "location.fill")
                                .font(.system(size: 12))
                            Text("timeTracking.gpsRecorded".localized)
                                .font(AppTypography.caption)
                        }
                        .foregroundColor(AppColors.success)
                        .padding(.horizontal, AppSpacing.sm)
                        .padding(.vertical, AppSpacing.xxs)
                        .background(AppColors.successLight)
                        .cornerRadius(AppSpacing.radiusFull)
                    }

                    // Clock Out Button
                    if canClockInOut {
                        DestructiveButton("Clock Out", icon: "clock.badge.xmark") {
                            showingClockOutConfirmation = true
                        }
                    }
                } else {
                    // Not clocked in
                    VStack(spacing: AppSpacing.md) {
                        ZStack {
                            Circle()
                                .fill(AppColors.gray100)
                                .frame(width: 80, height: 80)
                            Image(systemName: "clock")
                                .font(.system(size: 36))
                                .foregroundColor(AppColors.gray400)
                        }

                        VStack(spacing: AppSpacing.xxs) {
                            Text("Not Clocked In")
                                .font(AppTypography.heading3)
                                .foregroundColor(AppColors.textPrimary)
                            Text(canClockInOut ? "Tap below to start tracking time" : "You don't have permission to clock in")
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textSecondary)
                        }

                        if canClockInOut {
                            PrimaryButtonLarge("Clock In", icon: "clock.fill") {
                                showingProjectPicker = true
                            }
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
        .onAppear {
            if timeManager.isClockedIn {
                timeManager.pulseAnimation = true
            }
        }
    }

    // MARK: - Stats Summary
    private var statsSummary: some View {
        HStack(spacing: AppSpacing.sm) {
            StatCard(
                value: timeManager.todayHours,
                label: "Today",
                icon: "clock.fill",
                color: AppColors.primary500
            )
            StatCard(
                value: timeManager.weekHours,
                label: "This Week",
                icon: "calendar",
                color: AppColors.success
            )
        }
    }

    // MARK: - Entries List
    private var entriesList: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text(selectedTab == 0 ? "Today's Entries" : selectedTab == 1 ? "This Week" : "History")
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)

            if timeManager.entries.isEmpty {
                emptyState
            } else {
                ForEach(timeManager.entries) { entry in
                    TimeEntryCard(entry: entry, projectName: projectName(for: entry))
                }
            }
        }
    }

    private func projectName(for entry: TimeEntry) -> String {
        // Use projectName from entry if available, otherwise look up
        if !entry.projectName.isEmpty && entry.projectName != "Unknown Project" {
            return entry.projectName
        }
        return projectService.projects.first { $0.id == entry.projectId }?.name ?? "Unknown Project"
    }

    private var emptyState: some View {
        VStack(spacing: AppSpacing.sm) {
            Image(systemName: "clock.badge.questionmark")
                .font(.system(size: 40))
                .foregroundColor(AppColors.gray300)
            Text("No time entries")
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textTertiary)
        }
        .frame(maxWidth: .infinity)
        .padding(AppSpacing.xl)
    }
}

// MARK: - Time Entry Card
struct TimeEntryCard: View {
    let entry: TimeEntry
    let projectName: String

    var body: some View {
        AppCard {
            HStack {
                VStack(alignment: .leading, spacing: AppSpacing.xs) {
                    Text(projectName)
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)

                    HStack(spacing: AppSpacing.xs) {
                        Text(entry.clockInFormatted)
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                        Image(systemName: "arrow.right")
                            .font(.system(size: 12))
                            .foregroundColor(AppColors.textTertiary)
                        Text(entry.clockOutFormatted ?? "Now")
                            .font(AppTypography.secondary)
                            .foregroundColor(entry.isActive ? AppColors.success : AppColors.textSecondary)
                    }

                    if entry.gpsLatitude != nil {
                        HStack(spacing: AppSpacing.xxs) {
                            Image(systemName: "location.fill")
                                .font(.system(size: 10))
                            Text("GPS verified")
                                .font(AppTypography.caption)
                        }
                        .foregroundColor(AppColors.textTertiary)
                    }
                }

                Spacer()

                VStack(alignment: .trailing, spacing: AppSpacing.xxs) {
                    Text(entry.durationFormatted)
                        .font(AppTypography.heading3)
                        .foregroundColor(entry.isActive ? AppColors.success : AppColors.textPrimary)

                    if entry.isActive {
                        StatusBadge(text: "Active", status: .active)
                    } else {
                        StatusBadge(
                            text: entry.status.rawValue.capitalized,
                            status: entry.status == .approved ? .completed : entry.status == .rejected ? .warning : .pending
                        )
                    }
                }
            }
        }
    }
}

// MARK: - Project Picker
struct ProjectPickerView: View {
    let projects: [Project]
    let onSelect: (Project) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.sm) {
                    ForEach(projects) { project in
                        Button(action: {
                            onSelect(project)
                            dismiss()
                        }) {
                            AppCard {
                                HStack(spacing: AppSpacing.md) {
                                    IconCircle(
                                        icon: "building.2.fill",
                                        size: .medium,
                                        foregroundColor: AppColors.primary600,
                                        backgroundColor: AppColors.primary50
                                    )

                                    VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                                        Text(project.name)
                                            .font(AppTypography.bodySemibold)
                                            .foregroundColor(AppColors.textPrimary)
                                        Text(project.address)
                                            .font(AppTypography.secondary)
                                            .foregroundColor(AppColors.textSecondary)
                                    }

                                    Spacer()

                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 14))
                                        .foregroundColor(AppColors.gray400)
                                }
                            }
                        }
                    }
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("Select Project")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
}

#Preview {
    TimeTrackingView()
}
