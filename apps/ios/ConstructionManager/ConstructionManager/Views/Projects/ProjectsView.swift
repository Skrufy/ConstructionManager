//
//  ProjectsView.swift
//  ConstructionManager
//
//  Projects list view with filtering and detail navigation
//

import SwiftUI
import Combine

struct ProjectsView: View {
    @ObservedObject private var projectService = ProjectService.shared
    @EnvironmentObject var appState: AppState
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var searchText = ""
    @State private var selectedStatus: Project.ProjectStatus?
    @State private var selectedProject: Project?
    @State private var showingNewProject = false

    // Optional binding to sidebar state - when sidebar expands, clear selection
    var isSidebarCollapsed: Binding<Bool>?

    private var canCreateProjects: Bool {
        appState.hasPermission(.createProjects)
    }

    private var isIPad: Bool {
        horizontalSizeClass == .regular
    }

    /// Get projects directly from service (no mock fallback)
    private var projects: [Project] {
        projectService.projects
    }

    private var activeCount: Int {
        projects.filter { $0.status == .active }.count
    }

    private var onHoldCount: Int {
        projects.filter { $0.status == .onHold }.count
    }

    private var completedCount: Int {
        projects.filter { $0.status == .completed }.count
    }

    private func filteredProjects(search: String, status: Project.ProjectStatus?) -> [Project] {
        var result = projects

        if let status = status {
            result = result.filter { $0.status == status }
        }

        if !search.isEmpty {
            result = result.filter {
                $0.name.localizedCaseInsensitiveContains(search) ||
                $0.fullAddress.localizedCaseInsensitiveContains(search) ||
                ($0.clientName?.localizedCaseInsensitiveContains(search) ?? false) ||
                ($0.number?.localizedCaseInsensitiveContains(search) ?? false)
            }
        }

        return result
    }

    var body: some View {
        Group {
            if isIPad {
                iPadLayout
            } else {
                iPhoneLayout
            }
        }
        .sheet(isPresented: $showingNewProject) {
            NewProjectView()
        }
        .task {
            // Fetch fresh data when view appears
            await projectService.fetchProjects()
        }
        .onChange(of: isSidebarCollapsed?.wrappedValue) { _, isCollapsed in
            // When sidebar expands (isCollapsed becomes false), clear selection to avoid squished layout
            if isCollapsed == false {
                selectedProject = nil
            }
        }
    }

    // MARK: - iPad Layout (Split View)
    private var iPadLayout: some View {
        HStack(spacing: 0) {
            // Master list on left
            VStack(spacing: 0) {
                // Search Bar
                searchBar

                // Status Filter
                statusFilter

                // Project Stats
                projectStats

                // Projects List
                if projectService.isLoading {
                    VStack {
                        Spacer()
                        ProgressView()
                            .scaleEffect(1.2)
                        Text("common.loading".localized)
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                            .padding(.top, AppSpacing.sm)
                        Spacer()
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if projects.isEmpty {
                    VStack(spacing: AppSpacing.md) {
                        Spacer()
                        Image(systemName: "folder.badge.questionmark")
                            .font(.system(size: 48))
                            .foregroundColor(AppColors.gray300)
                        Text("projects.noProjects".localized)
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textSecondary)
                        Text("projects.createToStart".localized)
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textTertiary)
                        Spacer()
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        LazyVStack(spacing: AppSpacing.sm) {
                            ForEach(filteredProjects(search: searchText, status: selectedStatus)) { project in
                                ProjectCard(project: project)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: AppSpacing.radiusLarge)
                                            .stroke(selectedProject?.id == project.id ? AppColors.primary600 : Color.clear, lineWidth: 2)
                                    )
                                    .onTapGesture {
                                        withAnimation(.easeInOut(duration: 0.2)) {
                                            selectedProject = project
                                        }
                                    }
                            }
                        }
                        .padding(AppSpacing.md)
                    }
                }
            }
            .frame(width: 400)
            .background(AppColors.background)

            Divider()

            // Detail view on right
            if let project = selectedProject {
                ProjectDetailContent(project: project)
                    .frame(maxWidth: .infinity)
                    .id(project.id) // Force refresh when project changes
            } else {
                // Empty state when no project selected
                VStack(spacing: AppSpacing.lg) {
                    Image(systemName: "folder.fill")
                        .font(.system(size: 60))
                        .foregroundColor(AppColors.gray300)
                    Text("projects.selectProject".localized)
                        .font(AppTypography.heading3)
                        .foregroundColor(AppColors.textSecondary)
                    Text("projects.selectFromList".localized)
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textTertiary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(AppColors.background)
            }
        }
        .navigationTitle("nav.projects".localized)
        .toolbar {
            if canCreateProjects {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingNewProject = true }) {
                        Image(systemName: "plus")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(AppColors.primary600)
                    }
                }
            }
        }
    }

    // MARK: - iPhone Layout
    private var iPhoneLayout: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search Bar
                searchBar

                // Status Filter
                statusFilter

                // Project Stats
                projectStats

                // Projects List
                if projectService.isLoading {
                    VStack {
                        Spacer()
                        ProgressView()
                            .scaleEffect(1.2)
                        Text("common.loading".localized)
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                            .padding(.top, AppSpacing.sm)
                        Spacer()
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if projects.isEmpty {
                    VStack(spacing: AppSpacing.md) {
                        Spacer()
                        Image(systemName: "folder.badge.questionmark")
                            .font(.system(size: 48))
                            .foregroundColor(AppColors.gray300)
                        Text("projects.noProjects".localized)
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textSecondary)
                        Text("projects.createToStart".localized)
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textTertiary)
                        Spacer()
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        LazyVStack(spacing: AppSpacing.sm) {
                            ForEach(filteredProjects(search: searchText, status: selectedStatus)) { project in
                                ProjectCard(project: project)
                                    .onTapGesture {
                                        selectedProject = project
                                    }
                            }
                        }
                        .padding(AppSpacing.md)
                    }
                }
            }
            .background(AppColors.background)
            .navigationTitle("nav.projects".localized)
            .toolbar {
                if canCreateProjects {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button(action: { showingNewProject = true }) {
                            Image(systemName: "plus")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundColor(AppColors.primary600)
                        }
                    }
                }
            }
            .sheet(item: $selectedProject) { project in
                ProjectDetailView(project: project)
                    .environmentObject(appState)
            }
        }
    }

    private var searchBar: some View {
        HStack(spacing: AppSpacing.xs) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(AppColors.gray400)
            TextField("projects.searchPlaceholder".localized, text: $searchText)
                .font(AppTypography.body)
                .foregroundColor(AppColors.textPrimary)
        }
        .padding(AppSpacing.sm)
        .background(AppColors.cardBackground)
        .cornerRadius(AppSpacing.radiusMedium)
        .overlay(
            RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                .stroke(AppColors.gray200, lineWidth: 1)
        )
        .padding(.horizontal, AppSpacing.md)
        .padding(.vertical, AppSpacing.sm)
    }

    private var statusFilter: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: AppSpacing.xs) {
                FilterChip(title: "common.all".localized, isSelected: selectedStatus == nil) {
                    selectedStatus = nil
                }
                ForEach(Project.ProjectStatus.allCases, id: \.self) { status in
                    FilterChip(title: status.displayName, isSelected: selectedStatus == status) {
                        selectedStatus = status
                    }
                }
            }
            .padding(.horizontal, AppSpacing.md)
            .padding(.vertical, AppSpacing.xs)
        }
    }

    private var projectStats: some View {
        HStack(spacing: AppSpacing.sm) {
            ProjectStatBadge(count: activeCount, label: "status.active".localized, color: AppColors.success)
            ProjectStatBadge(count: onHoldCount, label: "status.onHold".localized, color: AppColors.warning)
            ProjectStatBadge(count: completedCount, label: "status.completed".localized, color: AppColors.info)
        }
        .padding(.horizontal, AppSpacing.md)
        .padding(.vertical, AppSpacing.xs)
    }
}

// MARK: - Project Stat Badge
struct ProjectStatBadge: View {
    let count: Int
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: AppSpacing.xxs) {
            Text("\(count)")
                .font(AppTypography.heading3)
                .foregroundColor(color)
            Text(label)
                .font(AppTypography.caption)
                .foregroundColor(AppColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, AppSpacing.sm)
        .background(color.opacity(0.1))
        .cornerRadius(AppSpacing.radiusMedium)
    }
}

// MARK: - Project Card
struct ProjectCard: View {
    @EnvironmentObject var appState: AppState
    let project: Project

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                // Header
                HStack {
                    // Type Icon
                    ZStack {
                        RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                            .fill(project.type.color.opacity(0.1))
                            .frame(width: 40, height: 40)
                        Image(systemName: project.type.icon)
                            .font(.system(size: 18))
                            .foregroundColor(project.type.color)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text(project.name)
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)
                            .lineLimit(1)
                        if let number = project.number {
                            Text(number)
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textTertiary)
                        }
                    }

                    Spacer()

                    StatusBadge(text: project.status.displayName, status: project.status.badgeStatus)
                }

                // Address
                HStack(spacing: AppSpacing.xs) {
                    Image(systemName: "mappin.circle.fill")
                        .font(.system(size: 14))
                        .foregroundColor(AppColors.gray400)
                    Text(project.fullAddress)
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                        .lineLimit(1)
                }

                // Client
                if let client = project.clientName {
                    HStack(spacing: AppSpacing.xs) {
                        Image(systemName: "building.2")
                            .font(.system(size: 14))
                            .foregroundColor(AppColors.gray400)
                        Text(client)
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                    }
                }

                // Progress Bar (for active projects)
                if project.status == .active, project.startDate != nil, project.estimatedEndDate != nil {
                    VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                        HStack {
                            Text("projects.progress".localized)
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textTertiary)
                            Spacer()
                            Text("\(Int(project.progressPercentage))%")
                                .font(AppTypography.captionMedium)
                                .foregroundColor(AppColors.primary600)
                        }
                        GeometryReader { geometry in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(AppColors.gray200)
                                    .frame(height: 6)
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(AppColors.primary600)
                                    .frame(width: geometry.size.width * (project.progressPercentage / 100), height: 6)
                            }
                        }
                        .frame(height: 6)
                    }
                }

                Divider()
                    .padding(.vertical, AppSpacing.xxs)

                // Footer Stats
                HStack {
                    Label("\(project.dailyLogCount) logs", systemImage: "doc.text")
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textTertiary)

                    Spacer()

                    // Only show hours if time tracking is enabled and visible
                    if appState.shouldShowModule(.timeTracking) {
                        Label("\(Int(project.hoursTracked))h", systemImage: "clock")
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textTertiary)

                        Spacer()
                    }

                    Label("\(project.crewCount) crew", systemImage: "person.2")
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textTertiary)

                    Image(systemName: "chevron.right")
                        .font(.system(size: 12))
                        .foregroundColor(AppColors.gray400)
                }
            }
        }
    }
}

// MARK: - Project Detail View (for sheet presentation on iPhone)
struct ProjectDetailView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var appState: AppState
    let project: Project
    @State private var showingNewDailyLog = false
    @State private var showingDailyLogs = false
    @State private var showingDocuments = false
    @State private var showingDrawings = false
    @State private var showingTimeTracking = false
    @State private var showingTeam = false

    var body: some View {
        NavigationStack {
            ProjectDetailContent(project: project)
                .navigationTitle("projects.details".localized)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button("common.done".localized) { dismiss() }
                    }
                }
        }
    }
}

// MARK: - Project Detail Content (shared between iPad inline and iPhone sheet)
struct ProjectDetailContent: View {
    @EnvironmentObject var appState: AppState
    @ObservedObject private var projectService = ProjectService.shared
    let project: Project
    @State private var showingNewDailyLog = false
    @State private var showingDailyLogs = false
    @State private var showingDocuments = false

    // Get latest project data from service (for updated stats after team changes)
    private var currentProject: Project {
        projectService.projects.first { $0.id == project.id } ?? project
    }
    @State private var showingDrawings = false
    @State private var showingTimeTracking = false
    @State private var showingTeam = false

    var body: some View {
        ScrollView {
            VStack(spacing: AppSpacing.lg) {
                // Header Card
                AppCard {
                    VStack(alignment: .leading, spacing: AppSpacing.md) {
                        // Type & Status
                        HStack {
                            HStack(spacing: AppSpacing.xs) {
                                Image(systemName: project.type.icon)
                                Text(project.type.rawValue)
                                    .font(AppTypography.secondaryMedium)
                            }
                            .foregroundColor(project.type.color)

                            Spacer()

                            StatusBadge(text: project.status.displayName, status: project.status.badgeStatus)
                        }

                        // Name
                        Text(project.name)
                            .font(AppTypography.heading2)
                            .foregroundColor(AppColors.textPrimary)

                        if let number = project.number {
                            Text(number)
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textTertiary)
                        }

                        Divider()

                        // Details Grid
                        VStack(spacing: AppSpacing.sm) {
                            ProjectDetailRow(icon: "mappin.circle.fill", label: "projects.address".localized, value: project.fullAddress)

                            if let client = project.clientName {
                                ProjectDetailRow(icon: "building.2", label: "projects.client".localized, value: client)
                            }

                            if let budget = project.budget {
                                ProjectDetailRow(icon: "dollarsign.circle", label: "projects.budget".localized, value: formatCurrency(budget))
                            }

                            if let start = project.startDate {
                                ProjectDetailRow(icon: "calendar", label: "projects.startDate".localized, value: formatDate(start))
                            }

                            if let end = project.estimatedEndDate {
                                ProjectDetailRow(icon: "calendar.badge.clock", label: "projects.estCompletion".localized, value: formatDate(end))
                            }
                        }
                    }
                }

                // Description
                if let description = project.description {
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("projects.description".localized)
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textSecondary)
                        AppCard {
                            Text(description)
                                .font(AppTypography.body)
                                .foregroundColor(AppColors.textPrimary)
                        }
                    }
                }

                // Stats Grid
                VStack(alignment: .leading, spacing: AppSpacing.xs) {
                    Text("projects.stats".localized)
                        .font(AppTypography.label)
                        .foregroundColor(AppColors.textSecondary)

                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: AppSpacing.sm) {
                        Button { showingDailyLogs = true } label: {
                            ProjectStatCard(icon: "doc.text.fill", title: "nav.dailyLogs".localized, value: "\(currentProject.dailyLogCount)", color: AppColors.primary600)
                        }
                        .buttonStyle(.plain)

                        // Only show Hours Tracked if time tracking module is enabled and visible
                        if appState.shouldShowModule(.timeTracking) {
                            Button { showingTimeTracking = true } label: {
                                ProjectStatCard(icon: "clock.fill", title: "timeTracking.hoursTracked".localized, value: String(format: "%.1f", currentProject.hoursTracked), color: AppColors.success)
                            }
                            .buttonStyle(.plain)
                        }

                        Button { showingDocuments = true } label: {
                            ProjectStatCard(icon: "folder.fill", title: "nav.documents".localized, value: "\(currentProject.documentCount)", color: AppColors.info)
                        }
                        .buttonStyle(.plain)

                        Button { showingDrawings = true } label: {
                            ProjectStatCard(icon: "doc.richtext.fill", title: "nav.drawings".localized, value: "\(currentProject.drawingCount)", color: AppColors.orange)
                        }
                        .buttonStyle(.plain)

                        Button { showingTeam = true } label: {
                            ProjectStatCard(icon: "person.2.fill", title: "projects.team".localized, value: "\(currentProject.crewCount)", color: AppColors.purple)
                        }
                        .buttonStyle(.plain)
                    }
                }

                // Quick Actions
                VStack(spacing: AppSpacing.sm) {
                    if appState.hasPermission(.createDailyLogs) {
                        PrimaryButton("dailyLogs.new".localized, icon: "plus.circle") {
                            showingNewDailyLog = true
                        }
                    }

                    if appState.hasPermission(.assignUsersToProjects) {
                        OutlineButton("projects.manageTeam".localized, icon: "person.badge.plus") {
                            showingTeam = true
                        }
                    }

                    OutlineButton("projects.viewOnMap".localized, icon: "map") {
                        openInMaps()
                    }
                }
            }
            .padding(AppSpacing.md)
        }
        .background(AppColors.background)
        .sheet(isPresented: $showingNewDailyLog) {
            NewDailyLogView(preselectedProject: project)
        }
        .sheet(isPresented: $showingDailyLogs) {
            ProjectDailyLogsView(project: project)
        }
        .sheet(isPresented: $showingDocuments) {
            DocumentsView()
        }
        .sheet(isPresented: $showingDrawings) {
            DrawingsView()
        }
        .sheet(isPresented: $showingTimeTracking) {
            TimeTrackingView()
        }
        .sheet(isPresented: $showingTeam, onDismiss: {
            Task { await projectService.fetchProjects() }
        }) {
            ProjectTeamView(project: project)
                .environmentObject(appState)
        }
    }

    private func openInMaps() {
        // Try GPS coordinates first
        if let lat = project.gpsLatitude, let lon = project.gpsLongitude {
            let encodedName = project.name.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
            if let url = URL(string: "maps://?ll=\(lat),\(lon)&q=\(encodedName)") {
                UIApplication.shared.open(url)
                return
            }
        }

        // Fall back to address search
        let address = project.address.isEmpty ? project.fullAddress : project.address
        guard !address.isEmpty else { return }

        let encodedAddress = address.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        if let url = URL(string: "maps://?address=\(encodedAddress)") {
            UIApplication.shared.open(url)
        } else if let url = URL(string: "https://maps.apple.com/?address=\(encodedAddress)") {
            UIApplication.shared.open(url)
        }
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: date)
    }

    private func formatCurrency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: value)) ?? "$0"
    }
}

// MARK: - Project Detail Row
struct ProjectDetailRow: View {
    let icon: String
    let label: String
    let value: String

    var body: some View {
        HStack(spacing: AppSpacing.sm) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(AppColors.gray400)
                .frame(width: 24)

            Text(label)
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)

            Spacer()

            Text(value)
                .font(AppTypography.secondaryMedium)
                .foregroundColor(AppColors.textPrimary)
                .multilineTextAlignment(.trailing)
        }
    }
}

// MARK: - Project Stat Card
struct ProjectStatCard: View {
    let icon: String
    let title: String
    let value: String
    let color: Color

    var body: some View {
        AppCard {
            VStack(spacing: AppSpacing.xs) {
                Image(systemName: icon)
                    .font(.system(size: 24))
                    .foregroundColor(color)
                Text(value)
                    .font(AppTypography.heading3)
                    .foregroundColor(AppColors.textPrimary)
                Text(title)
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, AppSpacing.xs)
        }
    }
}

// MARK: - New Project View
struct NewProjectView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var number = ""
    @State private var address = ""
    @State private var city = ""
    @State private var state = ""
    @State private var zipCode = ""
    @State private var projectType: Project.ProjectType = .commercial
    @State private var selectedClient: Client?
    @State private var showingClientSelector = false
    @State private var description = ""
    @State private var startDate = Date()
    @State private var hasEndDate = false
    @State private var endDate = Date()
    @State private var isSaving = false
    @State private var errorMessage: String?

    private let projectService = ProjectService.shared

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Basic Info
                    VStack(spacing: AppSpacing.md) {
                        AppTextField(label: "Project Name", placeholder: "e.g., Downtown Office Complex", text: $name, isRequired: true)
                        AppTextField(label: "Project Number", placeholder: "e.g., PRJ-2024-001", text: $number)

                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("Project Type")
                                .font(AppTypography.label)
                            Picker("Type", selection: $projectType) {
                                ForEach(Project.ProjectType.allCases, id: \.self) { type in
                                    Label(type.rawValue, systemImage: type.icon).tag(type)
                                }
                            }
                            .pickerStyle(.menu)
                        }
                    }

                    Divider()

                    // Location
                    VStack(spacing: AppSpacing.md) {
                        Text("Location")
                            .font(AppTypography.heading3)
                            .frame(maxWidth: .infinity, alignment: .leading)

                        AddressAutocompleteField(
                            label: "Street Address",
                            placeholder: "Start typing an address...",
                            text: $address
                        ) { parsed in
                            // Auto-fill address fields from selection
                            if !parsed.street.isEmpty {
                                address = parsed.street
                            }
                            city = parsed.city
                            state = parsed.state
                            zipCode = parsed.zip
                        }

                        HStack(spacing: AppSpacing.sm) {
                            AppTextField(label: "City", placeholder: "Los Angeles", text: $city, isRequired: true)
                            AppTextField(label: "State", placeholder: "CA", text: $state, isRequired: true)
                        }

                        AppTextField(label: "ZIP Code", placeholder: "90012", text: $zipCode)
                    }

                    Divider()

                    // Client & Description
                    VStack(spacing: AppSpacing.md) {
                        // Client Selector
                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("Client")
                                .font(AppTypography.label)
                                .foregroundColor(AppColors.textSecondary)

                            Button(action: { showingClientSelector = true }) {
                                HStack {
                                    if let client = selectedClient {
                                        HStack(spacing: AppSpacing.sm) {
                                            ZStack {
                                                RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                                                    .fill(AppColors.primary600.opacity(0.1))
                                                    .frame(width: 36, height: 36)
                                                Image(systemName: "building.2.fill")
                                                    .font(.system(size: 14))
                                                    .foregroundColor(AppColors.primary600)
                                            }

                                            VStack(alignment: .leading, spacing: 2) {
                                                Text(client.companyName)
                                                    .font(AppTypography.bodyMedium)
                                                    .foregroundColor(AppColors.textPrimary)
                                                if let contact = client.contactName {
                                                    Text(contact)
                                                        .font(AppTypography.caption)
                                                        .foregroundColor(AppColors.textSecondary)
                                                }
                                            }
                                        }
                                    } else {
                                        HStack(spacing: AppSpacing.sm) {
                                            Image(systemName: "building.2")
                                                .font(.system(size: 16))
                                                .foregroundColor(AppColors.gray400)
                                            Text("clients.selectPlaceholder".localized)
                                                .font(AppTypography.body)
                                                .foregroundColor(AppColors.textTertiary)
                                        }
                                    }

                                    Spacer()

                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 14))
                                        .foregroundColor(AppColors.gray400)
                                }
                                .padding(AppSpacing.sm)
                                .background(AppColors.cardBackground)
                                .cornerRadius(AppSpacing.radiusMedium)
                                .overlay(
                                    RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                                        .stroke(AppColors.gray200, lineWidth: 1)
                                )
                            }
                            .buttonStyle(.plain)
                        }

                        AppTextArea(label: "Description", placeholder: "Project description...", text: $description)
                    }

                    Divider()

                    // Dates
                    VStack(spacing: AppSpacing.md) {
                        Text("Schedule")
                            .font(AppTypography.heading3)
                            .frame(maxWidth: .infinity, alignment: .leading)

                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("Start Date")
                                .font(AppTypography.label)
                            DatePicker("", selection: $startDate, displayedComponents: .date)
                                .datePickerStyle(.compact)
                                .labelsHidden()
                        }

                        Toggle("Has Estimated End Date", isOn: $hasEndDate)
                            .font(AppTypography.bodyMedium)
                            .tint(AppColors.primary600)

                        if hasEndDate {
                            VStack(alignment: .leading, spacing: AppSpacing.xs) {
                                Text("Estimated End Date")
                                    .font(AppTypography.label)
                                DatePicker("", selection: $endDate, in: startDate..., displayedComponents: .date)
                                    .datePickerStyle(.compact)
                                    .labelsHidden()
                            }
                        }
                    }

                    // Error Message
                    if let error = errorMessage {
                        Text(error)
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.error)
                            .padding(AppSpacing.sm)
                            .frame(maxWidth: .infinity)
                            .background(AppColors.errorLight)
                            .cornerRadius(AppSpacing.radiusMedium)
                    }

                    // Submit
                    PrimaryButton("projects.create".localized, icon: "plus.circle", isLoading: isSaving) {
                        saveProject()
                    }
                    .disabled(name.isEmpty || address.isEmpty || city.isEmpty || state.isEmpty || isSaving)
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("projects.new".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("common.cancel".localized) { dismiss() }
                        .disabled(isSaving)
                }
            }
            .sheet(isPresented: $showingClientSelector) {
                ClientSelectorView(selectedClient: $selectedClient)
            }
        }
    }

    private func saveProject() {
        isSaving = true
        errorMessage = nil

        // Combine address parts
        let fullAddress = [address, city, "\(state) \(zipCode)"]
            .filter { !$0.isEmpty }
            .joined(separator: ", ")

        Task {
            let result = await projectService.createProject(
                name: name,
                address: fullAddress,
                gpsLatitude: nil,
                gpsLongitude: nil,
                startDate: startDate,
                endDate: hasEndDate ? endDate : nil,
                description: description.isEmpty ? nil : description,
                clientId: selectedClient?.id,
                assignedUserIds: nil
            )

            await MainActor.run {
                isSaving = false
                if result != nil {
                    dismiss()
                } else {
                    errorMessage = projectService.error ?? "Failed to create project"
                }
            }
        }
    }
}

#Preview {
    ProjectsView()
}
