//
//  MainTabView.swift
//  ConstructionManager
//
//  Main tab navigation container with iPad sidebar support
//

import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var appState: AppState
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var offlineManager = OfflineManager.shared
    @State private var selectedTab = 0
    @State private var selectedSidebarItem: SidebarItem? = .dashboard
    @State private var showingSettings = false
    @State private var isSidebarCollapsed = false
    @State private var languageRefreshId = UUID()  // Forces view refresh on language change

    /// Collapses the sidebar with animation (iPad only)
    private func collapseSidebar() {
        guard horizontalSizeClass == .regular, !isSidebarCollapsed else { return }
        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
            isSidebarCollapsed = true
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Offline banner at top
            OfflineBanner()

            Group {
                if horizontalSizeClass == .regular {
                    // iPad: Use custom sidebar navigation
                    iPadNavigation
                } else {
                    // iPhone: Use tab bar
                    iPhoneTabView
                }
            }
        }
        .task {
            // Refresh user profile and data when app launches
            // This is the ONLY place that should trigger initial data fetch
            // DashboardView will reuse data already loaded here
            await appState.refreshOnAppLaunch()

            // Initialize offline support - but DON'T re-fetch data that was just loaded
            if offlineManager.shouldUseCachedData {
                offlineManager.loadCachedData()
            }
            // Note: We removed the automatic cacheData() call here because
            // refreshOnAppLaunch() already fetches the essential data
            // The services will cache data automatically as it's fetched
        }
        // Sync pending operations and refresh preferences when app returns to foreground
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .active {
                offlineManager.syncOnForeground()
                // Also refresh user preferences to ensure settings are synced
                Task {
                    print("[MainTabView] App became active - refreshing preferences...")
                    await appState.fetchUserPreferences()
                }
            }
        }
        // Handle programmatic navigation requests from Dashboard
        .onChange(of: appState.requestedNavigation) { _, newValue in
            if let destination = newValue {
                switch destination {
                case .projects:
                    selectedSidebarItem = .projects
                case .documents:
                    selectedSidebarItem = .documents
                case .drawings:
                    selectedSidebarItem = .drawings
                case .dailyLogs:
                    selectedSidebarItem = .dailyLogs
                case .timeTracking:
                    selectedSidebarItem = .timeTracking
                }
                // Clear the request after handling
                appState.requestedNavigation = nil
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .languageDidChange)) { _ in
            // Force view refresh when language changes
            languageRefreshId = UUID()
        }
        .id(languageRefreshId)
    }

    // MARK: - iPad Navigation (Sidebar)
    private var iPadNavigation: some View {
        GeometryReader { geometry in
            let isCompactIPad = geometry.size.width < 900
            let expandedWidth: CGFloat = isCompactIPad ? 220 : 280
            let collapsedWidth: CGFloat = 72
            let sidebarWidth: CGFloat = isSidebarCollapsed ? collapsedWidth : expandedWidth

            HStack(spacing: 0) {
                // Custom Sidebar
                VStack(alignment: .leading, spacing: 0) {
                    // Header with collapse toggle
                    HStack {
                        if !isSidebarCollapsed {
                            Image(systemName: "building.2.fill")
                                .font(.system(size: isCompactIPad ? 20 : 24, weight: .bold))
                                .foregroundColor(AppColors.primary600)
                            VStack(alignment: .leading, spacing: 0) {
                                Text("Duggin")
                                    .font(isCompactIPad ? AppTypography.heading3 : AppTypography.heading2)
                                    .foregroundColor(AppColors.textPrimary)
                                Text("Construction")
                                    .font(isCompactIPad ? AppTypography.caption : AppTypography.secondary)
                                    .foregroundColor(AppColors.textSecondary)
                            }
                            Spacer()
                        }

                        Button {
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                isSidebarCollapsed.toggle()
                            }
                        } label: {
                            Image(systemName: isSidebarCollapsed ? "sidebar.left" : "sidebar.left")
                                .font(.system(size: 18, weight: .medium))
                                .foregroundColor(AppColors.textSecondary)
                                .frame(width: 36, height: 36)
                                .background(AppColors.gray100)
                                .cornerRadius(AppSpacing.radiusSmall)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, isSidebarCollapsed ? AppSpacing.sm : (isCompactIPad ? AppSpacing.sm : AppSpacing.md))
                    .padding(.top, AppSpacing.lg)
                    .padding(.bottom, AppSpacing.md)
                    .frame(maxWidth: .infinity, alignment: isSidebarCollapsed ? .center : .leading)

                    ScrollView {
                        VStack(alignment: .leading, spacing: isCompactIPad ? AppSpacing.xs : AppSpacing.sm) {
                            // Main Section
                            SidebarSection(title: "Main", isCompact: isCompactIPad, isCollapsed: isSidebarCollapsed) {
                                SidebarButton(item: .dashboard, isSelected: selectedSidebarItem == .dashboard, isCompact: isCompactIPad, isCollapsed: isSidebarCollapsed, onCollapse: collapseSidebar) {
                                    selectedSidebarItem = .dashboard
                                }

                                if appState.shouldShowModule(.timeTracking) {
                                    SidebarButton(item: .timeTracking, isSelected: selectedSidebarItem == .timeTracking, isCompact: isCompactIPad, isCollapsed: isSidebarCollapsed, onCollapse: collapseSidebar) {
                                        selectedSidebarItem = .timeTracking
                                    }
                                }

                                SidebarButton(item: .projects, isSelected: selectedSidebarItem == .projects, isCompact: isCompactIPad, isCollapsed: isSidebarCollapsed, onCollapse: collapseSidebar) {
                                    selectedSidebarItem = .projects
                                }
                            }

                            // Work Section (only show if at least one module is visible)
                            if appState.shouldShowModule(.dailyLogs) || appState.shouldShowModule(.tasks) || appState.shouldShowModule(.scheduling) || appState.shouldShowModule(.drawings) || appState.shouldShowModule(.documents) {
                                SidebarSection(title: "Work", isCompact: isCompactIPad, isCollapsed: isSidebarCollapsed) {
                                    if appState.shouldShowModule(.dailyLogs) {
                                        SidebarButton(item: .dailyLogs, isSelected: selectedSidebarItem == .dailyLogs, isCompact: isCompactIPad, isCollapsed: isSidebarCollapsed, onCollapse: collapseSidebar) {
                                            selectedSidebarItem = .dailyLogs
                                        }
                                    }

                                    if appState.shouldShowModule(.tasks) {
                                        SidebarButton(item: .tasks, isSelected: selectedSidebarItem == .tasks, isCompact: isCompactIPad, isCollapsed: isSidebarCollapsed, onCollapse: collapseSidebar) {
                                            selectedSidebarItem = .tasks
                                        }
                                    }

                                    if appState.shouldShowModule(.scheduling) {
                                        SidebarButton(item: .scheduling, isSelected: selectedSidebarItem == .scheduling, isCompact: isCompactIPad, isCollapsed: isSidebarCollapsed, onCollapse: collapseSidebar) {
                                            selectedSidebarItem = .scheduling
                                        }
                                    }

                                    if appState.shouldShowModule(.drawings) {
                                        SidebarButton(item: .drawings, isSelected: selectedSidebarItem == .drawings, isCompact: isCompactIPad, isCollapsed: isSidebarCollapsed, onCollapse: collapseSidebar) {
                                            selectedSidebarItem = .drawings
                                        }
                                    }

                                    if appState.shouldShowModule(.documents) {
                                        SidebarButton(item: .documents, isSelected: selectedSidebarItem == .documents, isCompact: isCompactIPad, isCollapsed: isSidebarCollapsed, onCollapse: collapseSidebar) {
                                            selectedSidebarItem = .documents
                                        }
                                    }
                                }
                            }

                            // Management Section (only show if at least one module is visible)
                            if appState.shouldShowModule(.safety) || appState.shouldShowModule(.equipment) || appState.shouldShowModule(.materials) || appState.shouldShowModule(.certifications) || appState.shouldShowModule(.subcontractors) {
                                SidebarSection(title: "Management", isCompact: isCompactIPad, isCollapsed: isSidebarCollapsed) {
                                    if appState.shouldShowModule(.safety) {
                                        SidebarButton(item: .safety, isSelected: selectedSidebarItem == .safety, isCompact: isCompactIPad, isCollapsed: isSidebarCollapsed, onCollapse: collapseSidebar) {
                                            selectedSidebarItem = .safety
                                        }
                                    }

                                    if appState.shouldShowModule(.equipment) {
                                        SidebarButton(item: .equipment, isSelected: selectedSidebarItem == .equipment, isCompact: isCompactIPad, isCollapsed: isSidebarCollapsed, onCollapse: collapseSidebar) {
                                            selectedSidebarItem = .equipment
                                        }
                                    }

                                    if appState.shouldShowModule(.materials) {
                                        SidebarButton(item: .materials, isSelected: selectedSidebarItem == .materials, isCompact: isCompactIPad, isCollapsed: isSidebarCollapsed, onCollapse: collapseSidebar) {
                                            selectedSidebarItem = .materials
                                        }
                                    }

                                    if appState.shouldShowModule(.certifications) {
                                        SidebarButton(item: .certifications, isSelected: selectedSidebarItem == .certifications, isCompact: isCompactIPad, isCollapsed: isSidebarCollapsed, onCollapse: collapseSidebar) {
                                            selectedSidebarItem = .certifications
                                        }
                                    }

                                    if appState.shouldShowModule(.subcontractors) {
                                        SidebarButton(item: .subcontractors, isSelected: selectedSidebarItem == .subcontractors, isCompact: isCompactIPad, isCollapsed: isSidebarCollapsed, onCollapse: collapseSidebar) {
                                            selectedSidebarItem = .subcontractors
                                        }
                                    }
                                }
                            }

                            // Finance Section
                            if appState.shouldShowModule(.financials) || appState.shouldShowModule(.reports) {
                                SidebarSection(title: "Finance", isCompact: isCompactIPad, isCollapsed: isSidebarCollapsed) {
                                    if appState.shouldShowModule(.financials) {
                                        SidebarButton(item: .financials, isSelected: selectedSidebarItem == .financials, isCompact: isCompactIPad, isCollapsed: isSidebarCollapsed, onCollapse: collapseSidebar) {
                                            selectedSidebarItem = .financials
                                        }
                                    }

                                    if appState.shouldShowModule(.reports) {
                                        SidebarButton(item: .reports, isSelected: selectedSidebarItem == .reports, isCompact: isCompactIPad, isCollapsed: isSidebarCollapsed, onCollapse: collapseSidebar) {
                                            selectedSidebarItem = .reports
                                        }
                                    }
                                }
                            }

                            // Business Section
                            if appState.shouldShowModule(.clients) {
                                SidebarSection(title: "Business", isCompact: isCompactIPad, isCollapsed: isSidebarCollapsed) {
                                    SidebarButton(item: .clients, isSelected: selectedSidebarItem == .clients, isCompact: isCompactIPad, isCollapsed: isSidebarCollapsed, onCollapse: collapseSidebar) {
                                        selectedSidebarItem = .clients
                                    }
                                }
                            }

                            // Integrations Section
                            if appState.shouldShowModule(.droneDeploy) {
                                SidebarSection(title: "Integrations", isCompact: isCompactIPad, isCollapsed: isSidebarCollapsed) {
                                    SidebarButton(item: .droneDeploy, isSelected: selectedSidebarItem == .droneDeploy, isCompact: isCompactIPad, isCollapsed: isSidebarCollapsed, onCollapse: collapseSidebar) {
                                        selectedSidebarItem = .droneDeploy
                                    }
                                }
                            }

                            // Admin Section
                            if appState.isAdmin {
                                SidebarSection(title: "Admin", isCompact: isCompactIPad, isCollapsed: isSidebarCollapsed) {
                                    SidebarButton(item: .admin, isSelected: selectedSidebarItem == .admin, isCompact: isCompactIPad, isCollapsed: isSidebarCollapsed, onCollapse: collapseSidebar) {
                                        selectedSidebarItem = .admin
                                    }
                                }
                            }
                        }
                        .padding(.horizontal, isSidebarCollapsed ? AppSpacing.xs : (isCompactIPad ? AppSpacing.xs : AppSpacing.sm))
                    }

                    Spacer()

                    // Settings Button at bottom
                    Button(action: { showingSettings = true }) {
                        if isSidebarCollapsed {
                            ZStack {
                                RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                                    .fill(AppColors.gray100)
                                    .frame(width: 40, height: 40)
                                Image(systemName: "gearshape.fill")
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(AppColors.gray500)
                            }
                        } else {
                            HStack(spacing: isCompactIPad ? AppSpacing.xs : AppSpacing.sm) {
                                ZStack {
                                    RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                                        .fill(AppColors.gray100)
                                        .frame(width: isCompactIPad ? 32 : 36, height: isCompactIPad ? 32 : 36)
                                    Image(systemName: "gearshape.fill")
                                        .font(.system(size: isCompactIPad ? 14 : 16, weight: .semibold))
                                        .foregroundColor(AppColors.gray500)
                                }

                                Text("nav.settings".localized)
                                    .font(AppTypography.bodyMedium)
                                    .foregroundColor(AppColors.textPrimary)

                                Spacer()
                            }
                            .padding(.horizontal, isCompactIPad ? AppSpacing.xs : AppSpacing.sm)
                            .padding(.vertical, isCompactIPad ? 6 : AppSpacing.xs)
                        }
                    }
                    .buttonStyle(SidebarPressStyle())
                    .padding(.horizontal, isSidebarCollapsed ? AppSpacing.sm : (isCompactIPad ? AppSpacing.xs : AppSpacing.sm))
                    .padding(.bottom, AppSpacing.lg)
                    .frame(maxWidth: .infinity, alignment: isSidebarCollapsed ? .center : .leading)
                }
                .frame(width: sidebarWidth)
                .background(AppColors.cardBackground)

                // Divider
                Rectangle()
                    .fill(AppColors.gray200)
                    .frame(width: 1)
                    .shadow(color: Color.black.opacity(0.05), radius: 2, x: 1, y: 0)

                // Detail View
                NavigationStack {
                    sidebarDetailView
                        .environment(\.collapseSidebarAction, collapseSidebar)
                }
                .frame(maxWidth: .infinity)
                .contentShape(Rectangle())
                // Collapse sidebar on any tap in content area (uses simultaneous gesture to not block button taps)
                .simultaneousGesture(
                    TapGesture()
                        .onEnded { _ in
                            collapseSidebar()
                        }
                )
            }
        }
        .fullScreenCover(isPresented: $showingSettings) {
            SettingsView()
                .environmentObject(appState)
        }
    }

    @ViewBuilder
    private var sidebarDetailView: some View {
        switch selectedSidebarItem {
        case .dashboard:
            DashboardView()
        case .timeTracking:
            TimeTrackingView()
        case .projects:
            ProjectsView(isSidebarCollapsed: $isSidebarCollapsed)
        case .dailyLogs:
            DailyLogsView(embedInNavigationStack: false)
        case .drawings:
            DrawingsView()
        case .documents:
            DocumentsView()
        case .tasks:
            TasksView()
        case .scheduling:
            SchedulingView()
        case .safety:
            SafetyView()
        case .equipment:
            EquipmentView()
        case .materials:
            MaterialsView()
        case .droneDeploy:
            DroneDeployView()
        case .certifications:
            CertificationsView()
        case .subcontractors:
            SubcontractorsView()
        case .financials:
            FinancialsView()
        case .reports:
            ReportsView()
        case .clients:
            ClientsView()
        case .admin:
            AdminView()
        case .none:
            DashboardView()
        }
    }

    // MARK: - iPhone Tab Bar
    private var iPhoneTabView: some View {
        TabView(selection: $selectedTab) {
            NavigationStack {
                DashboardView()
            }
            .tabItem {
                Label("nav.home".localized, systemImage: "house.fill")
            }
            .tag(0)

            if appState.shouldShowModule(.timeTracking) {
                TimeTrackingView()
                    .tabItem {
                        Label("nav.timeTracking".localized, systemImage: "clock.fill")
                    }
                    .tag(1)
            }

            if appState.shouldShowModule(.dailyLogs) {
                DailyLogsTabView()
                    .tabItem {
                        Label("nav.dailyLogs".localized, systemImage: "doc.text.fill")
                    }
                    .tag(2)
            }

            ProjectsView()
                .tabItem {
                    Label("nav.projects".localized, systemImage: "folder.fill")
                }
                .tag(3)

            MoreView()
                .tabItem {
                    Label("nav.more".localized, systemImage: "ellipsis")
                }
                .tag(4)
        }
        .tint(AppColors.primary600)
    }
}

// MARK: - Sidebar Items
enum SidebarItem: String, Hashable, CaseIterable {
    case dashboard
    case timeTracking
    case projects
    case dailyLogs
    case drawings
    case documents
    case tasks
    case scheduling
    case safety
    case equipment
    case materials
    case droneDeploy
    case certifications
    case subcontractors
    case financials
    case reports
    case clients
    case admin
    // Note: Settings is handled separately as a fullScreenCover, not a sidebar item

    var title: String {
        switch self {
        case .dashboard: return "nav.dashboard".localized
        case .timeTracking: return "nav.timeTracking".localized
        case .projects: return "nav.projects".localized
        case .dailyLogs: return "nav.dailyLogs".localized
        case .drawings: return "nav.drawings".localized
        case .documents: return "nav.documents".localized
        case .tasks: return "nav.tasks".localized
        case .scheduling: return "nav.scheduling".localized
        case .safety: return "nav.safety".localized
        case .equipment: return "nav.equipment".localized
        case .materials: return "nav.materials".localized
        case .droneDeploy: return "DroneDeploy" // Brand name - not localized
        case .certifications: return "nav.certifications".localized
        case .subcontractors: return "nav.subcontractors".localized
        case .financials: return "nav.financials".localized
        case .reports: return "nav.reports".localized
        case .clients: return "nav.clients".localized
        case .admin: return "nav.admin".localized
        }
    }

    var icon: String {
        switch self {
        case .dashboard: return "house.fill"
        case .timeTracking: return "clock.fill"
        case .projects: return "folder.fill"
        case .dailyLogs: return "doc.text.fill"
        case .drawings: return "doc.richtext.fill"
        case .documents: return "doc.on.doc.fill"
        case .tasks: return "checklist"
        case .scheduling: return "calendar"
        case .safety: return "shield.checkered"
        case .equipment: return "wrench.and.screwdriver.fill"
        case .materials: return "shippingbox.fill"
        case .droneDeploy: return "airplane"
        case .certifications: return "checkmark.seal.fill"
        case .subcontractors: return "person.2.badge.gearshape"
        case .financials: return "dollarsign.circle.fill"
        case .reports: return "chart.bar.fill"
        case .clients: return "building.2.fill"
        case .admin: return "gearshape.2.fill"
        }
    }

    var color: Color {
        switch self {
        case .dashboard: return AppColors.primary600
        case .timeTracking: return AppColors.info
        case .projects: return AppColors.orange
        case .dailyLogs: return AppColors.success
        case .drawings: return AppColors.purple
        case .documents: return AppColors.info
        case .tasks: return AppColors.warning
        case .scheduling: return AppColors.info
        case .safety: return AppColors.error
        case .equipment: return AppColors.warning
        case .materials: return AppColors.orange
        case .droneDeploy: return AppColors.info
        case .certifications: return AppColors.success
        case .subcontractors: return AppColors.info
        case .financials: return AppColors.success
        case .reports: return AppColors.purple
        case .clients: return AppColors.info
        case .admin: return AppColors.gray500
        }
    }
}

/// Wrapper view for DailyLogsView when used in tab bar (needs its own NavigationStack)
struct DailyLogsTabView: View {
    var body: some View {
        DailyLogsView()
    }
}

// MARK: - Sidebar Section
struct SidebarSection<Content: View>: View {
    let title: String
    let isCompact: Bool
    let isCollapsed: Bool
    let content: Content

    init(title: String, isCompact: Bool, isCollapsed: Bool = false, @ViewBuilder content: () -> Content) {
        self.title = title
        self.isCompact = isCompact
        self.isCollapsed = isCollapsed
        self.content = content()
    }

    var body: some View {
        VStack(alignment: isCollapsed ? .center : .leading, spacing: isCompact ? 2 : AppSpacing.xs) {
            if !isCollapsed {
                Text(title.uppercased())
                    .font(.system(size: isCompact ? 10 : 11, weight: .semibold))
                    .foregroundColor(AppColors.textTertiary)
                    .tracking(0.5)
                    .padding(.horizontal, isCompact ? AppSpacing.xs : AppSpacing.sm)
                    .padding(.top, isCompact ? AppSpacing.sm : AppSpacing.md)
                    .padding(.bottom, isCompact ? 2 : 4)
            } else {
                // Small divider when collapsed
                Rectangle()
                    .fill(AppColors.gray200)
                    .frame(width: 32, height: 1)
                    .padding(.vertical, AppSpacing.sm)
            }

            content
        }
        .frame(maxWidth: .infinity, alignment: isCollapsed ? .center : .leading)
    }
}

// MARK: - Sidebar Button
struct SidebarButton: View {
    let item: SidebarItem
    let isSelected: Bool
    let isCompact: Bool
    let isCollapsed: Bool
    let action: () -> Void
    var onCollapse: (() -> Void)?

    init(item: SidebarItem, isSelected: Bool, isCompact: Bool, isCollapsed: Bool = false, onCollapse: (() -> Void)? = nil, action: @escaping () -> Void) {
        self.item = item
        self.isSelected = isSelected
        self.isCompact = isCompact
        self.isCollapsed = isCollapsed
        self.onCollapse = onCollapse
        self.action = action
    }

    var body: some View {
        Button(action: {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                action()
            }
            // Auto-collapse sidebar after selection on iPad
            onCollapse?()
        }) {
            if isCollapsed {
                // Collapsed: Icon only
                ZStack {
                    RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                        .fill(isSelected ? item.color.opacity(0.15) : AppColors.gray100)
                        .frame(width: 44, height: 44)
                    Image(systemName: item.icon)
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(isSelected ? item.color : AppColors.textSecondary)
                }
                .overlay(
                    RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                        .stroke(isSelected ? item.color.opacity(0.3) : Color.clear, lineWidth: 2)
                )
            } else {
                // Expanded: Full button
                HStack(spacing: isCompact ? AppSpacing.xs : AppSpacing.sm) {
                    // Icon with colored background
                    ZStack {
                        RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                            .fill(isSelected ? item.color.opacity(0.15) : AppColors.gray100)
                            .frame(width: isCompact ? 32 : 36, height: isCompact ? 32 : 36)
                        Image(systemName: item.icon)
                            .font(.system(size: isCompact ? 14 : 16, weight: .semibold))
                            .foregroundColor(isSelected ? item.color : AppColors.textSecondary)
                    }

                    Text(item.title)
                        .font(isSelected ? AppTypography.bodySemibold : AppTypography.bodyMedium)
                        .foregroundColor(isSelected ? item.color : AppColors.textPrimary)

                    Spacer()

                    if isSelected {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(item.color)
                    }
                }
                .padding(.horizontal, isCompact ? AppSpacing.xs : AppSpacing.sm)
                .padding(.vertical, isCompact ? 6 : AppSpacing.xs)
                .background(
                    RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                        .fill(isSelected ? item.color.opacity(0.08) : Color.clear)
                )
            }
        }
        .buttonStyle(SidebarPressStyle())
        .frame(maxWidth: .infinity, alignment: isCollapsed ? .center : .leading)
    }
}

// MARK: - Sidebar Press Style
struct SidebarPressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .opacity(configuration.isPressed ? 0.8 : 1)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

// MARK: - Environment Key for Sidebar Collapse
/// Allows child views to collapse the sidebar on iPad
struct CollapseSidebarActionKey: EnvironmentKey {
    static let defaultValue: (() -> Void)? = nil
}

extension EnvironmentValues {
    /// Call this action to collapse the sidebar on iPad (no-op on iPhone)
    var collapseSidebarAction: (() -> Void)? {
        get { self[CollapseSidebarActionKey.self] }
        set { self[CollapseSidebarActionKey.self] = newValue }
    }
}

#Preview {
    MainTabView()
        .environmentObject(AppState())
}
