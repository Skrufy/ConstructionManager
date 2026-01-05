//
//  DashboardView.swift
//  ConstructionManager
//
//  Main dashboard/home screen with iPad adaptive layout
//

import SwiftUI

struct DashboardView: View {
    @ObservedObject private var timeManager = TimeTrackingManager.shared
    @ObservedObject private var projectService = ProjectService.shared
    @ObservedObject private var notificationService = NotificationService.shared
    @ObservedObject private var drawingService = DrawingService.shared
    @ObservedObject private var documentService = DocumentService.shared
    @ObservedObject private var dailyLogService = DailyLogService.shared
    @EnvironmentObject var appState: AppState
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @Environment(\.verticalSizeClass) private var verticalSizeClass
    @State private var showingClockOutConfirmation: Bool = false
    @State private var showingProjectPicker: Bool = false
    @State private var showingNewDailyLog: Bool = false
    @State private var showingNotifications: Bool = false
    @State private var showingSearch: Bool = false
    @State private var selectedTab: Int = 0
    @State private var languageRefreshId = UUID()  // Forces view refresh on language change

    // Navigation states for iPhone quick actions
    @State private var navigateToProjects: Bool = false
    @State private var navigateToDrawings: Bool = false
    @State private var navigateToDocuments: Bool = false
    @State private var navigateToDailyLogs: Bool = false
    @State private var navigateToTimeTracking: Bool = false

    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMMM d"
        return formatter.string(from: Date())
    }

    private var isIPad: Bool {
        horizontalSizeClass == .regular
    }

    // Detect if we're in a wide layout (landscape or wide split view)
    private var isWideLayout: Bool {
        horizontalSizeClass == .regular && verticalSizeClass == .regular
    }

    // Detect if iPad is in portrait or narrow split view
    private var isIPadPortraitOrNarrow: Bool {
        horizontalSizeClass == .regular && verticalSizeClass == .regular
    }

    // MARK: - Data Helpers (use actual service data)
    private var activeProjectCount: Int {
        projectService.projects.filter { $0.status == .active }.count
    }

    private var totalDocuments: Int {
        // Use actual document count from DocumentService
        documentService.documents.count
    }

    private var totalDrawings: Int {
        // Use actual drawing count from DrawingService
        drawingService.drawings.count
    }

    private var totalDailyLogs: Int {
        // Use actual daily log count from DailyLogService
        dailyLogService.dailyLogs.count
    }

    var body: some View {
        GeometryReader { geometry in
            ScrollView {
                if isIPad {
                    iPadLayout(availableWidth: geometry.size.width)
                } else {
                    iPhoneLayout
                }
            }
        }
        .background(AppColors.background)
        .navigationTitle("nav.dashboard".localized)
        .navigationBarTitleDisplayMode(isIPad ? .large : .inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                HStack(spacing: AppSpacing.xs) {
                    searchButton
                    notificationButton
                }
            }
        }
        .confirmationDialog(
            "dashboard.clockOutQuestion".localized,
            isPresented: $showingClockOutConfirmation,
            titleVisibility: .visible
        ) {
            Button("dashboard.clockOut".localized, role: .destructive) {
                timeManager.clockOut()
            }
            Button("common.cancel".localized, role: .cancel) {}
        } message: {
            Text("dashboard.clockOutConfirm".localized)
        }
        .sheet(isPresented: $showingProjectPicker) {
            ProjectPickerView(
                projects: projectService.projects,
                onSelect: { project in
                    timeManager.clockIn(to: project)
                }
            )
        }
        .sheet(isPresented: $showingNewDailyLog) {
            NewDailyLogView()
        }
        .sheet(isPresented: $showingNotifications) {
            NotificationsView()
        }
        .sheet(isPresented: $showingSearch) {
            SearchView()
        }
        .task {
            // Ensure user profile is loaded when dashboard appears
            if appState.currentUser == nil {
                appState.checkAuthState()
            }

            // Fetch data for dashboard stats
            // Services use request deduplication, so if data was just fetched
            // by MainTabView/AppState, these calls will return immediately
            // without making duplicate network requests

            // Projects are essential - wait for them
            await projectService.fetchProjects()

            // Capture service references for background tasks
            let drawings = drawingService
            let documents = documentService
            let dailyLogs = dailyLogService

            // Other data can load in background - don't block UI
            // These will be throttled by the APIClient semaphore
            Task.detached(priority: .utility) {
                await drawings.fetchDrawings()
            }
            Task.detached(priority: .utility) {
                await documents.fetchDocuments()
            }
            Task.detached(priority: .utility) {
                await dailyLogs.fetchDailyLogs()
            }
        }
        // Navigation destinations for iPhone
        .navigationDestination(isPresented: $navigateToProjects) {
            ProjectsView()
        }
        .navigationDestination(isPresented: $navigateToDrawings) {
            DrawingsView()
        }
        .navigationDestination(isPresented: $navigateToDocuments) {
            DocumentsView()
        }
        .navigationDestination(isPresented: $navigateToDailyLogs) {
            DailyLogsView(embedInNavigationStack: false)
        }
        .navigationDestination(isPresented: $navigateToTimeTracking) {
            TimeTrackingView()
        }
        .onReceive(NotificationCenter.default.publisher(for: .languageDidChange)) { _ in
            // Force view refresh when language changes
            languageRefreshId = UUID()
        }
        .id(languageRefreshId)
    }

    // MARK: - iPad Layout (Adaptive based on available width)
    @ViewBuilder
    private func iPadLayout(availableWidth: CGFloat) -> some View {
        // Use wide layout only when we have 850pt+ of space (true landscape)
        // iPad portrait (even with collapsed sidebar ~750pt) should use narrow stacked layout
        // iPad landscape is ~1000pt+ which works well with side-by-side
        let useWideLayout = availableWidth > 850

        if useWideLayout {
            iPadWideLayout
        } else {
            iPadNarrowLayout
        }
    }

    // Wide layout: side-by-side columns (iPad landscape, large split view)
    private var iPadWideLayout: some View {
        VStack(alignment: .leading, spacing: AppSpacing.xl) {
            // Welcome Header
            welcomeSection
                .padding(.horizontal, AppSpacing.lg)

            // Top row: Clock + Stats side by side
            HStack(alignment: .top, spacing: AppSpacing.lg) {
                // Left column: Clock Card
                if appState.shouldShowModule(.timeTracking) {
                    VStack(spacing: AppSpacing.lg) {
                        clockCard
                        weeklyStatsSection
                    }
                    .frame(maxWidth: 400)
                }

                // Right column: Quick Actions + Team Overview
                VStack(alignment: .leading, spacing: AppSpacing.lg) {
                    quickActionsGridSection
                    teamOverviewSection
                }
            }
            .padding(.horizontal, AppSpacing.lg)
        }
        .padding(.vertical, AppSpacing.lg)
    }

    // Narrow layout: stacked vertically (iPad portrait, narrow split view)
    private var iPadNarrowLayout: some View {
        VStack(alignment: .leading, spacing: AppSpacing.lg) {
            // Welcome Header
            welcomeSection

            // Clock Card with stats (if time tracking enabled)
            if appState.shouldShowModule(.timeTracking) {
                clockCardWithStats
            }

            // Quick Actions - 2x2 grid for compact but iPad-sized tiles
            iPadNarrowQuickActions

            // Weekly Stats (if time tracking and not already in clock card)
            // Skip since it's in clockCardWithStats

            // Team Overview / Project Summary - use 2x2 layout for narrow
            iPadNarrowTeamOverview
        }
        .padding(AppSpacing.lg)
    }

    // Team overview for narrow iPad layout (2x2 grid)
    private var iPadNarrowTeamOverview: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text(appState.shouldShowModule(.timeTracking) ? "dashboard.teamOverview".localized : "dashboard.projectSummary".localized)
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)

            AppCard {
                LazyVGrid(columns: [
                    GridItem(.flexible(minimum: 100)),
                    GridItem(.flexible(minimum: 100))
                ], spacing: AppSpacing.md) {
                    if appState.shouldShowModule(.timeTracking) {
                        Button {
                            appState.requestedNavigation = .timeTracking
                        } label: {
                            VerticalStatCard(
                                value: "12",
                                label: "dashboard.activeWorkers".localized,
                                icon: "person.2.fill",
                                color: AppColors.success
                            )
                        }
                        .buttonStyle(.plain)

                        Button {
                            appState.requestedNavigation = .timeTracking
                        } label: {
                            VerticalStatCard(
                                value: "3",
                                label: "dashboard.onBreak".localized,
                                icon: "cup.and.saucer.fill",
                                color: AppColors.warning
                            )
                        }
                        .buttonStyle(.plain)

                        Button {
                            appState.requestedNavigation = .timeTracking
                        } label: {
                            VerticalStatCard(
                                value: "5",
                                label: "dashboard.notStarted".localized,
                                icon: "moon.fill",
                                color: AppColors.gray400
                            )
                        }
                        .buttonStyle(.plain)

                        Button {
                            appState.requestedNavigation = .dailyLogs
                        } label: {
                            VerticalStatCard(
                                value: "2",
                                label: "dashboard.pendingLogs".localized,
                                icon: "exclamationmark.circle.fill",
                                color: AppColors.orange
                            )
                        }
                        .buttonStyle(.plain)
                    } else {
                        Button {
                            appState.requestedNavigation = .projects
                        } label: {
                            VerticalStatCard(
                                value: "\(activeProjectCount)",
                                label: "dashboard.activeProjects".localized,
                                icon: "folder.fill",
                                color: AppColors.success
                            )
                        }
                        .buttonStyle(.plain)

                        Button {
                            appState.requestedNavigation = .documents
                        } label: {
                            VerticalStatCard(
                                value: "\(totalDocuments)",
                                label: "nav.documents".localized,
                                icon: "doc.fill",
                                color: AppColors.info
                            )
                        }
                        .buttonStyle(.plain)

                        Button {
                            appState.requestedNavigation = .drawings
                        } label: {
                            VerticalStatCard(
                                value: "\(totalDrawings)",
                                label: "nav.drawings".localized,
                                icon: "doc.richtext.fill",
                                color: AppColors.orange
                            )
                        }
                        .buttonStyle(.plain)

                        Button {
                            appState.requestedNavigation = .dailyLogs
                        } label: {
                            VerticalStatCard(
                                value: "\(totalDailyLogs)",
                                label: "nav.dailyLogs".localized,
                                icon: "doc.text.fill",
                                color: AppColors.warning
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    // Quick actions for narrow iPad layout (2x2 grid with larger tiles)
    private var iPadNarrowQuickActions: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("dashboard.quickActions".localized)
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)

            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: AppSpacing.md),
                GridItem(.flexible(), spacing: AppSpacing.md)
            ], spacing: AppSpacing.md) {
                if appState.shouldShowModule(.dailyLogs) {
                    iPadActionTile(
                        title: "dailyLogs.new".localized,
                        subtitle: "dashboard.recordProgress".localized,
                        icon: "doc.text.fill",
                        color: AppColors.primary600
                    ) {
                        showingNewDailyLog = true
                    }
                }

                iPadActionTile(
                    title: "nav.projects".localized,
                    subtitle: "\(activeProjectCount) " + "status.active".localized.lowercased(),
                    icon: "folder.fill",
                    color: AppColors.orange
                ) {
                    appState.requestedNavigation = .projects
                }

                iPadActionTile(
                    title: "nav.drawings".localized,
                    subtitle: "\(totalDrawings) " + "common.total".localized.lowercased(),
                    icon: "doc.richtext",
                    color: AppColors.success
                ) {
                    appState.requestedNavigation = .drawings
                }

                iPadActionTile(
                    title: "nav.documents".localized,
                    subtitle: "\(totalDocuments) " + "dashboard.files".localized.lowercased(),
                    icon: "doc.on.doc.fill",
                    color: AppColors.info
                ) {
                    appState.requestedNavigation = .documents
                }
            }
        }
    }

    // iPad-sized action tile for narrow layout
    @ViewBuilder
    private func iPadActionTile(title: String, subtitle: String, icon: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            AppCard {
                HStack(spacing: AppSpacing.md) {
                    ZStack {
                        Circle()
                            .fill(color.opacity(0.12))
                            .frame(width: 52, height: 52)
                        Image(systemName: icon)
                            .font(.system(size: 24))
                            .foregroundColor(color)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text(title)
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)
                        Text(subtitle)
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(AppColors.gray400)
                }
            }
        }
        .buttonStyle(.plain)
    }

    // MARK: - iPhone Layout (Single column)
    private var iPhoneLayout: some View {
        VStack(alignment: .leading, spacing: AppSpacing.lg) {
            // Welcome Header
            welcomeSection

            // Clock In/Out Card with embedded stats (only if time tracking enabled)
            if appState.shouldShowModule(.timeTracking) {
                clockCardWithStats
            }

            // Quick Actions - compact grid when time tracking is on, vertical when off
            if appState.shouldShowModule(.timeTracking) {
                quickActionsCompactSection
            } else {
                quickActionsSection
            }

            // Team Overview (for supervisors/PM) or Project Summary
            teamOverviewSection
        }
        .padding(AppSpacing.md)
    }

    // MARK: - Welcome Section
    private var welcomeSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.xxs) {
            Text(formattedDate)
                .font(isIPad ? AppTypography.heading1 : AppTypography.heading2)
                .foregroundColor(AppColors.textPrimary)
            if let userName = appState.currentUser?.name {
                let firstName = userName.components(separatedBy: " ").first ?? userName
                Text(String(format: "dashboard.welcomeBack".localized, firstName))
                    .font(AppTypography.body)
                    .foregroundColor(AppColors.textSecondary)
            }
        }
    }

    // MARK: - Clock Card (iPad - standalone)
    private var clockCard: some View {
        AppCard {
            VStack(spacing: AppSpacing.md) {
                HStack {
                    IconCircle(
                        icon: timeManager.isClockedIn ? "clock.fill" : "clock",
                        size: .large,
                        foregroundColor: timeManager.isClockedIn ? AppColors.success : AppColors.primary600,
                        backgroundColor: timeManager.isClockedIn ? AppColors.successLight : AppColors.primary50
                    )

                    VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                        Text(timeManager.isClockedIn ? "dashboard.currentlyWorking".localized : "dashboard.notClockedIn".localized)
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)
                        if timeManager.isClockedIn {
                            Text(timeManager.activeProjectName ?? "dashboard.unknownProject".localized)
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textSecondary)
                        } else {
                            Text("dashboard.tapToStart".localized)
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textSecondary)
                        }
                    }

                    Spacer()

                    if timeManager.isClockedIn {
                        StatusBadge(text: "Active", status: .active)
                    }
                }

                if timeManager.isClockedIn {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("dashboard.startedAt".localized)
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textTertiary)
                            Text(timeManager.clockInTime ?? "")
                                .font(AppTypography.bodySemibold)
                                .foregroundColor(AppColors.textPrimary)
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 2) {
                            Text("dashboard.duration".localized)
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textTertiary)
                            Text(timeManager.elapsedTimeFormatted)
                                .font(AppTypography.bodySemibold)
                                .foregroundColor(AppColors.success)
                        }
                    }
                    .padding(.top, AppSpacing.xs)

                    DestructiveButton("dashboard.clockOut".localized, icon: "clock.badge.xmark") {
                        showingClockOutConfirmation = true
                    }
                } else {
                    PrimaryButtonLarge("dashboard.clockIn".localized, icon: "clock.fill") {
                        showingProjectPicker = true
                    }
                }
            }
        }
    }

    // MARK: - Clock Card with Stats (iPhone - combined for compact layout)
    private var clockCardWithStats: some View {
        AppCard {
            VStack(spacing: AppSpacing.md) {
                // Clock status header
                HStack {
                    IconCircle(
                        icon: timeManager.isClockedIn ? "clock.fill" : "clock",
                        size: .medium,
                        foregroundColor: timeManager.isClockedIn ? AppColors.success : AppColors.primary600,
                        backgroundColor: timeManager.isClockedIn ? AppColors.successLight : AppColors.primary50
                    )

                    VStack(alignment: .leading, spacing: 2) {
                        Text(timeManager.isClockedIn ? "dashboard.currentlyWorking".localized : "dashboard.notClockedIn".localized)
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)
                        if timeManager.isClockedIn {
                            Text(timeManager.activeProjectName ?? "dashboard.unknownProject".localized)
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textSecondary)
                        }
                    }

                    Spacer()

                    if timeManager.isClockedIn {
                        StatusBadge(text: "status.active".localized, status: .active)
                    }
                }

                // Time stats row - always visible
                HStack(spacing: AppSpacing.sm) {
                    // Today's hours
                    VStack(spacing: 2) {
                        Text(timeManager.todayHours)
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.primary600)
                        Text("time.today".localized)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textTertiary)
                    }
                    .frame(maxWidth: .infinity)

                    Divider()
                        .frame(height: 32)

                    // Current session / Week hours
                    VStack(spacing: 2) {
                        Text(timeManager.isClockedIn ? timeManager.elapsedTimeFormatted : timeManager.weekHours)
                            .font(AppTypography.heading3)
                            .foregroundColor(timeManager.isClockedIn ? AppColors.success : AppColors.textPrimary)
                        Text(timeManager.isClockedIn ? "time.session".localized : "time.thisWeek".localized)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textTertiary)
                    }
                    .frame(maxWidth: .infinity)

                    Divider()
                        .frame(height: 32)

                    // Week hours / Clock in time
                    VStack(spacing: 2) {
                        Text(timeManager.isClockedIn ? timeManager.weekHours : "--:--")
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)
                        Text(timeManager.isClockedIn ? "time.thisWeek".localized : "time.session".localized)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textTertiary)
                    }
                    .frame(maxWidth: .infinity)
                }
                .padding(.vertical, AppSpacing.xs)

                // Action button
                if timeManager.isClockedIn {
                    DestructiveButton("dashboard.clockOut".localized, icon: "clock.badge.xmark") {
                        showingClockOutConfirmation = true
                    }
                } else {
                    PrimaryButtonLarge("dashboard.clockIn".localized, icon: "clock.fill") {
                        showingProjectPicker = true
                    }
                }
            }
        }
    }

    // MARK: - Quick Actions Compact (iPhone with time tracking - 2x2 grid)
    private var quickActionsCompactSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("dashboard.quickActions".localized)
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)

            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: AppSpacing.sm),
                GridItem(.flexible(), spacing: AppSpacing.sm)
            ], spacing: AppSpacing.sm) {
                if appState.shouldShowModule(.dailyLogs) {
                    CompactActionTile(
                        title: "nav.dailyLogs".localized,
                        icon: "doc.text.fill",
                        color: AppColors.primary600
                    ) {
                        showingNewDailyLog = true
                    }
                }

                CompactActionTile(
                    title: "nav.projects".localized,
                    icon: "folder.fill",
                    color: AppColors.orange
                ) {
                    navigateToProjects = true
                }

                CompactActionTile(
                    title: "nav.drawings".localized,
                    icon: "doc.richtext",
                    color: AppColors.success
                ) {
                    navigateToDrawings = true
                }

                CompactActionTile(
                    title: "nav.documents".localized,
                    icon: "doc.on.doc.fill",
                    color: AppColors.info
                ) {
                    navigateToDocuments = true
                }
            }
        }
    }

    // MARK: - Quick Actions (iPhone - vertical stack)
    private var quickActionsSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("dashboard.quickActions".localized)
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)

            VStack(spacing: AppSpacing.sm) {
                if appState.shouldShowModule(.dailyLogs) {
                    ActionCard(
                        title: "dailyLogs.new".localized,
                        subtitle: "dashboard.recordProgress".localized,
                        icon: "doc.text.fill",
                        iconColor: AppColors.primary600,
                        iconBackground: AppColors.primary50
                    ) {
                        showingNewDailyLog = true
                    }
                }

                ActionCard(
                    title: "nav.projects".localized,
                    subtitle: "\(activeProjectCount) " + "dashboard.activeProjects".localized.lowercased(),
                    icon: "folder.fill",
                    iconColor: AppColors.orange,
                    iconBackground: AppColors.orangeLight
                ) {
                    navigateToProjects = true
                }

                ActionCard(
                    title: "nav.drawings".localized,
                    subtitle: "dashboard.viewDrawings".localized,
                    icon: "doc.richtext",
                    iconColor: AppColors.success,
                    iconBackground: AppColors.successLight
                ) {
                    navigateToDrawings = true
                }

                ActionCard(
                    title: "nav.documents".localized,
                    subtitle: "dashboard.accessFiles".localized,
                    icon: "doc.on.doc.fill",
                    iconColor: AppColors.info,
                    iconBackground: AppColors.infoLight
                ) {
                    navigateToDocuments = true
                }
            }
        }
    }

    // MARK: - Quick Actions Grid (iPad - 2x2 grid)
    private var quickActionsGridSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("dashboard.quickActions".localized)
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)

            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: AppSpacing.md),
                GridItem(.flexible(), spacing: AppSpacing.md)
            ], spacing: AppSpacing.md) {
                if appState.shouldShowModule(.dailyLogs) {
                    QuickActionTile(
                        title: "dailyLogs.new".localized,
                        icon: "doc.text.fill",
                        color: AppColors.primary600,
                        backgroundColor: AppColors.primary50
                    ) {
                        showingNewDailyLog = true
                    }
                }

                // Use requestedNavigation for iPad to update sidebar selection
                Button {
                    appState.requestedNavigation = .projects
                } label: {
                    QuickActionTileContent(
                        title: "nav.projects".localized,
                        subtitle: "\(activeProjectCount) " + "status.active".localized.lowercased(),
                        icon: "folder.fill",
                        color: AppColors.orange,
                        backgroundColor: AppColors.orangeLight
                    )
                }
                .buttonStyle(.plain)

                Button {
                    appState.requestedNavigation = .drawings
                } label: {
                    QuickActionTileContent(
                        title: "nav.drawings".localized,
                        subtitle: "dashboard.viewDrawings".localized,
                        icon: "doc.richtext",
                        color: AppColors.success,
                        backgroundColor: AppColors.successLight
                    )
                }
                .buttonStyle(.plain)

                Button {
                    appState.requestedNavigation = .documents
                } label: {
                    QuickActionTileContent(
                        title: "nav.documents".localized,
                        subtitle: "dashboard.accessFiles".localized,
                        icon: "doc.on.doc.fill",
                        color: AppColors.info,
                        backgroundColor: AppColors.infoLight
                    )
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Weekly Stats
    private var weeklyStatsSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("time.thisWeek".localized)
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)

            HStack(spacing: AppSpacing.sm) {
                StatCard(
                    value: timeManager.todayHours,
                    label: "dashboard.hoursToday".localized,
                    icon: "clock.fill",
                    color: AppColors.primary500
                )
                StatCard(
                    value: timeManager.weekHours,
                    label: "dashboard.hoursThisWeek".localized,
                    icon: "calendar",
                    color: AppColors.success
                )
            }
        }
    }

    // MARK: - Team Overview (Time Tracking enabled) / Project Summary (Time Tracking disabled)
    private var teamOverviewSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text(appState.shouldShowModule(.timeTracking) ? "dashboard.teamOverview".localized : "dashboard.projectSummary".localized)
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)

            AppCard {
                LazyVGrid(columns: [
                    GridItem(.flexible(minimum: 80)),
                    GridItem(.flexible(minimum: 80)),
                    GridItem(.flexible(minimum: 80), spacing: isIPad ? AppSpacing.md : 0),
                    GridItem(.flexible(minimum: 80), spacing: isIPad ? AppSpacing.md : 0)
                ].prefix(isIPad ? 4 : 2).map { $0 }, spacing: AppSpacing.xs) {
                    if appState.shouldShowModule(.timeTracking) {
                        // Time tracking stats - use vertical cards on iPad, compact on iPhone
                        if isIPad {
                            Button {
                                appState.requestedNavigation = .timeTracking
                            } label: {
                                VerticalStatCard(
                                    value: "12",
                                    label: "dashboard.activeWorkers".localized,
                                    icon: "person.2.fill",
                                    color: AppColors.success
                                )
                            }
                            .buttonStyle(.plain)

                            Button {
                                appState.requestedNavigation = .timeTracking
                            } label: {
                                VerticalStatCard(
                                    value: "3",
                                    label: "dashboard.onBreak".localized,
                                    icon: "cup.and.saucer.fill",
                                    color: AppColors.warning
                                )
                            }
                            .buttonStyle(.plain)

                            Button {
                                appState.requestedNavigation = .timeTracking
                            } label: {
                                VerticalStatCard(
                                    value: "5",
                                    label: "dashboard.notStarted".localized,
                                    icon: "moon.fill",
                                    color: AppColors.gray400
                                )
                            }
                            .buttonStyle(.plain)

                            Button {
                                appState.requestedNavigation = .dailyLogs
                            } label: {
                                VerticalStatCard(
                                    value: "2",
                                    label: "dashboard.pendingLogs".localized,
                                    icon: "exclamationmark.circle.fill",
                                    color: AppColors.orange
                                )
                            }
                            .buttonStyle(.plain)
                        } else {
                            Button {
                                navigateToTimeTracking = true
                            } label: {
                                CompactStatCard(
                                    value: "12",
                                    label: "dashboard.activeWorkers".localized,
                                    icon: "person.2.fill",
                                    color: AppColors.success
                                )
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(ScaleButtonStyle())

                            Button {
                                navigateToTimeTracking = true
                            } label: {
                                CompactStatCard(
                                    value: "3",
                                    label: "dashboard.onBreak".localized,
                                    icon: "cup.and.saucer.fill",
                                    color: AppColors.warning
                                )
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(ScaleButtonStyle())

                            Button {
                                navigateToTimeTracking = true
                            } label: {
                                CompactStatCard(
                                    value: "5",
                                    label: "dashboard.notStarted".localized,
                                    icon: "moon.fill",
                                    color: AppColors.gray400
                                )
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(ScaleButtonStyle())

                            Button {
                                navigateToDailyLogs = true
                            } label: {
                                CompactStatCard(
                                    value: "2",
                                    label: "dashboard.pendingLogs".localized,
                                    icon: "exclamationmark.circle.fill",
                                    color: AppColors.orange
                                )
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(ScaleButtonStyle())
                        }
                    } else {
                        // Alternative stats when time tracking is disabled - clickable buttons
                        // Use programmatic navigation for iPad sidebar, NavigationLink for iPhone
                        if isIPad {
                            // iPad: Use VerticalStatCard for 4-column layout
                            Button {
                                appState.requestedNavigation = .projects
                            } label: {
                                VerticalStatCard(
                                    value: "\(activeProjectCount)",
                                    label: "dashboard.activeProjects".localized,
                                    icon: "folder.fill",
                                    color: AppColors.success
                                )
                            }
                            .buttonStyle(.plain)

                            Button {
                                appState.requestedNavigation = .documents
                            } label: {
                                VerticalStatCard(
                                    value: "\(totalDocuments)",
                                    label: "nav.documents".localized,
                                    icon: "doc.fill",
                                    color: AppColors.info
                                )
                            }
                            .buttonStyle(.plain)

                            Button {
                                appState.requestedNavigation = .drawings
                            } label: {
                                VerticalStatCard(
                                    value: "\(totalDrawings)",
                                    label: "nav.drawings".localized,
                                    icon: "doc.richtext.fill",
                                    color: AppColors.orange
                                )
                            }
                            .buttonStyle(.plain)

                            Button {
                                appState.requestedNavigation = .dailyLogs
                            } label: {
                                VerticalStatCard(
                                    value: "\(totalDailyLogs)",
                                    label: "nav.dailyLogs".localized,
                                    icon: "doc.text.fill",
                                    color: AppColors.warning
                                )
                            }
                            .buttonStyle(.plain)
                        } else {
                            // iPhone: Use CompactStatCard (horizontal) for 2-column layout
                            Button {
                                navigateToProjects = true
                            } label: {
                                CompactStatCard(
                                    value: "\(activeProjectCount)",
                                    label: "dashboard.activeProjects".localized,
                                    icon: "folder.fill",
                                    color: AppColors.success
                                )
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(ScaleButtonStyle())

                            Button {
                                navigateToDocuments = true
                            } label: {
                                CompactStatCard(
                                    value: "\(totalDocuments)",
                                    label: "nav.documents".localized,
                                    icon: "doc.fill",
                                    color: AppColors.info
                                )
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(ScaleButtonStyle())

                            Button {
                                navigateToDrawings = true
                            } label: {
                                CompactStatCard(
                                    value: "\(totalDrawings)",
                                    label: "nav.drawings".localized,
                                    icon: "doc.richtext.fill",
                                    color: AppColors.orange
                                )
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(ScaleButtonStyle())

                            Button {
                                navigateToDailyLogs = true
                            } label: {
                                CompactStatCard(
                                    value: "\(totalDailyLogs)",
                                    label: "nav.dailyLogs".localized,
                                    icon: "doc.text.fill",
                                    color: AppColors.warning
                                )
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(ScaleButtonStyle())
                        }
                    }
                }
            }
        }
    }

    // MARK: - Search Button
    private var searchButton: some View {
        Button(action: {
            showingSearch = true
        }) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 20))
                .foregroundColor(AppColors.textPrimary)
                .frame(width: 32, height: 32)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Notification Button
    private var notificationButton: some View {
        Button(action: {
            showingNotifications = true
        }) {
            ZStack(alignment: .center) {
                Image(systemName: "bell.fill")
                    .font(.system(size: 20))
                    .foregroundColor(AppColors.textPrimary)
                if notificationService.unreadCount > 0 {
                    IconBadge(count: notificationService.unreadCount)
                        .offset(x: 12, y: -10)
                }
            }
            .frame(width: 32, height: 32)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Quick Action Tile (iPad)
struct QuickActionTile: View {
    let title: String
    let icon: String
    let color: Color
    let backgroundColor: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            QuickActionTileContent(
                title: title,
                subtitle: nil,
                icon: icon,
                color: color,
                backgroundColor: backgroundColor
            )
        }
        .buttonStyle(.plain)
    }
}

struct QuickActionTileContent: View {
    let title: String
    let subtitle: String?
    let icon: String
    let color: Color
    let backgroundColor: Color

    init(title: String, subtitle: String? = nil, icon: String, color: Color, backgroundColor: Color) {
        self.title = title
        self.subtitle = subtitle
        self.icon = icon
        self.color = color
        self.backgroundColor = backgroundColor
    }

    var body: some View {
        AppCard {
            VStack(spacing: AppSpacing.sm) {
                IconCircle(
                    icon: icon,
                    size: .large,
                    foregroundColor: color,
                    backgroundColor: backgroundColor
                )
                VStack(spacing: 2) {
                    Text(title)
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                    // Always reserve space for subtitle to ensure consistent card heights
                    Text(subtitle ?? " ")
                        .font(AppTypography.caption)
                        .foregroundColor(subtitle != nil ? AppColors.textSecondary : .clear)
                }
            }
            .frame(maxWidth: .infinity, minHeight: 100)
            .padding(.vertical, AppSpacing.sm)
        }
    }
}

// MARK: - Action Card Content (for NavigationLink)
struct ActionCardContent: View {
    let title: String
    let subtitle: String
    let icon: String
    let iconColor: Color
    let iconBackground: Color

    var body: some View {
        AppCard {
            HStack(spacing: AppSpacing.md) {
                IconCircle(
                    icon: icon,
                    size: .medium,
                    foregroundColor: iconColor,
                    backgroundColor: iconBackground
                )

                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                    Text(title)
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                    Text(subtitle)
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(AppColors.gray400)
            }
        }
    }
}

// MARK: - Compact Action Tile (iPhone with time tracking - smaller grid tiles)
struct CompactActionTile: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: AppSpacing.xs) {
                ZStack {
                    Circle()
                        .fill(color.opacity(0.12))
                        .frame(width: 44, height: 44)
                    Image(systemName: icon)
                        .font(.system(size: 20))
                        .foregroundColor(color)
                }
                Text(title)
                    .font(AppTypography.secondaryMedium)
                    .foregroundColor(AppColors.textPrimary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, AppSpacing.md)
            .background(AppColors.cardBackground)
            .cornerRadius(AppSpacing.radiusMedium)
            .shadow(color: Color.black.opacity(0.04), radius: 2, x: 0, y: 1)
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    NavigationStack {
        DashboardView()
            .environmentObject(AppState())
    }
}
