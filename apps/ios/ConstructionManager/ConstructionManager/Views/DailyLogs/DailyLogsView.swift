//
//  DailyLogsView.swift
//  ConstructionManager
//
//  Daily logs list view
//

import SwiftUI
import Combine

struct DailyLogsView: View {
    @StateObject private var viewModel = DailyLogsViewModel()
    @EnvironmentObject var appState: AppState
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var showingNewLog = false
    @State private var selectedLog: DailyLog?
    @State private var selectedProject: Project?

    /// Whether this view should include its own NavigationStack (used when displayed in tab bar)
    var embedInNavigationStack: Bool = true

    // Filter logs by selected project
    private var filteredLogs: [DailyLog] {
        guard let project = selectedProject else {
            return viewModel.dailyLogs
        }
        return viewModel.dailyLogs.filter { $0.projectId == project.id }
    }

    private var canCreateDailyLogs: Bool {
        appState.hasPermission(.createDailyLogs)
    }

    private var isIPad: Bool {
        horizontalSizeClass == .regular
    }

    // Responsive grid columns for iPad - use 2 columns max to avoid squished cards
    private var gridColumns: [GridItem] {
        if isIPad {
            return [
                GridItem(.flexible(minimum: 300)),
                GridItem(.flexible(minimum: 300))
            ]
        } else {
            return [GridItem(.flexible())]
        }
    }

    var body: some View {
        if embedInNavigationStack {
            NavigationStack {
                dailyLogsContent
            }
        } else {
            dailyLogsContent
        }
    }

    private var dailyLogsContent: some View {
        VStack(spacing: 0) {
            if viewModel.isLoading && viewModel.dailyLogs.isEmpty {
                Spacer()
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: AppColors.primary600))
                Spacer()
            } else if filteredLogs.isEmpty {
                ScrollView {
                    emptyState
                }
            } else {
                ScrollView {
                    if isIPad {
                        // iPad: Grid layout
                        LazyVGrid(columns: gridColumns, spacing: AppSpacing.md) {
                            ForEach(filteredLogs) { log in
                                DailyLogCard(log: log)
                                    .onTapGesture {
                                        selectedLog = log
                                    }
                            }
                        }
                        .padding(AppSpacing.lg)
                    } else {
                        // iPhone: List layout
                        VStack(spacing: AppSpacing.md) {
                            ForEach(filteredLogs) { log in
                                DailyLogCard(log: log)
                                    .onTapGesture {
                                        selectedLog = log
                                    }
                            }
                        }
                        .padding(AppSpacing.md)
                    }
                }
                .refreshable {
                    await viewModel.fetchDailyLogs()
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(AppColors.background)
        .navigationTitle("nav.dailyLogs".localized)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                projectFilterMenu
            }
            if canCreateDailyLogs {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingNewLog = true }) {
                        Image(systemName: "plus")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(AppColors.primary600)
                    }
                }
            }
        }
        .sheet(isPresented: $showingNewLog) {
            NewDailyLogView()
        }
        .sheet(item: $selectedLog) { log in
            DailyLogDetailView(log: log)
        }
        .task {
            await viewModel.fetchDailyLogs()
        }
    }

    // MARK: - Project Filter Menu
    private var projectFilterMenu: some View {
        Menu {
            Button(action: {
                withAnimation(.easeInOut(duration: 0.2)) {
                    selectedProject = nil
                }
            }) {
                HStack {
                    Label("drawings.allProjects".localized, systemImage: "folder.fill")
                    if selectedProject == nil {
                        Image(systemName: "checkmark")
                    }
                }
            }

            Divider()

            ForEach(ProjectService.shared.projects) { project in
                Button(action: {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        selectedProject = project
                    }
                }) {
                    HStack {
                        Label {
                            Text(project.name)
                        } icon: {
                            Image(systemName: "building.2.fill")
                        }
                        if selectedProject?.id == project.id {
                            Image(systemName: "checkmark")
                        }
                    }
                }
            }
        } label: {
            HStack(spacing: isIPad ? AppSpacing.sm : AppSpacing.xs) {
                Image(systemName: selectedProject == nil ? "folder.fill" : "building.2.fill")
                    .font(.system(size: isIPad ? 18 : 14))
                    .foregroundColor(AppColors.primary600)

                Text(selectedProject?.name ?? "drawings.allProjects".localized)
                    .font(isIPad ? AppTypography.bodyLarge : AppTypography.bodySemibold)
                    .foregroundColor(AppColors.textPrimary)
                    .lineLimit(1)

                Image(systemName: "chevron.down")
                    .font(.system(size: isIPad ? 12 : 10, weight: .semibold))
                    .foregroundColor(AppColors.textSecondary)
            }
            .padding(.horizontal, isIPad ? AppSpacing.lg : AppSpacing.md)
            .padding(.vertical, isIPad ? AppSpacing.md : AppSpacing.sm)
            .background(AppColors.gray100)
            .clipShape(Capsule())
        }
    }

    private var emptyState: some View {
        let projectName = selectedProject?.name
        let emptyMessage: String = {
            if let name = projectName {
                return String(format: "dailyLogs.noLogsFor".localized, name)
            }
            return canCreateDailyLogs ? "dailyLogs.createFirst".localized : "dailyLogs.noLogsYet".localized
        }()

        return VStack(spacing: AppSpacing.md) {
            Image(systemName: "doc.text")
                .font(.system(size: 48))
                .foregroundColor(AppColors.gray400)
            Text("dailyLogs.noLogs".localized)
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)
            Text(emptyMessage)
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)
                .multilineTextAlignment(.center)
            if canCreateDailyLogs {
                PrimaryButton("dailyLogs.create".localized, icon: "plus") {
                    showingNewLog = true
                }
                .padding(.top, AppSpacing.sm)
            }
        }
        .padding(AppSpacing.xl)
    }
}

// MARK: - Daily Log Card
struct DailyLogCard: View {
    @EnvironmentObject var appState: AppState
    let log: DailyLog

    private var dateFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter
    }

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                HStack {
                    VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                        HStack(spacing: AppSpacing.xs) {
                            Image(systemName: "calendar")
                                .font(.system(size: 14))
                                .foregroundColor(AppColors.primary600)
                            Text(dateFormatter.string(from: log.date))
                                .font(AppTypography.bodySemibold)
                                .foregroundColor(AppColors.textPrimary)
                        }
                        HStack(spacing: AppSpacing.xs) {
                            Image(systemName: "building.2")
                                .font(.system(size: 14))
                                .foregroundColor(AppColors.textTertiary)
                            Text(log.projectName ?? "dailyLogs.unknownProject".localized)
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textSecondary)
                        }
                    }
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(AppColors.gray400)
                }

                if let submitterName = log.submitterName {
                    HStack(spacing: AppSpacing.xs) {
                        Image(systemName: "person.fill")
                            .font(.system(size: 12))
                            .foregroundColor(AppColors.textTertiary)
                        Text(submitterName)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textTertiary)
                    }
                }

                // Only show stats row if there's visible data to show (respecting module settings)
                let hasVisibleStats = log.entriesCount > 0 ||
                    (log.materialsCount > 0 && appState.shouldShowModule(.materials)) ||
                    (log.totalHours > 0 && appState.shouldShowModule(.timeTracking))
                if hasVisibleStats {
                    Divider()

                    HStack(spacing: AppSpacing.md) {
                        if log.entriesCount > 0 {
                            Label(String(format: "dailyLogs.entries".localized, log.entriesCount), systemImage: "list.bullet")
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textTertiary)
                        }
                        // Only show materials if module is enabled
                        if log.materialsCount > 0 && appState.shouldShowModule(.materials) {
                            Label(String(format: "dailyLogs.materials".localized, log.materialsCount), systemImage: "shippingbox")
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textTertiary)
                        }
                        // Only show hours if time tracking module is enabled
                        if log.totalHours > 0 && appState.shouldShowModule(.timeTracking) {
                            Label("\(Int(log.totalHours))h", systemImage: "clock")
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textTertiary)
                        }
                    }
                }

                if log.weatherDelay {
                    HStack(spacing: AppSpacing.xs) {
                        Image(systemName: "cloud.rain.fill")
                            .font(.system(size: 12))
                            .foregroundColor(AppColors.warning)
                        Text("dailyLogs.weatherDelay".localized)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.warning)
                    }
                }
            }
        }
    }
}

// MARK: - ViewModel
@MainActor
class DailyLogsViewModel: ObservableObject {
    @Published var dailyLogs: [DailyLog] = []
    @Published var isLoading = false

    private let dailyLogService = DailyLogService.shared

    func fetchDailyLogs(projectId: String? = nil) async {
        isLoading = true
        defer { isLoading = false }

        await dailyLogService.fetchDailyLogs(projectId: projectId)
        dailyLogs = dailyLogService.dailyLogs
    }
}

// MARK: - Project-Specific Daily Logs View
struct ProjectDailyLogsView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = DailyLogsViewModel()
    @State private var showingNewLog = false
    let project: Project

    var body: some View {
        NavigationStack {
            ScrollView {
                if viewModel.isLoading && viewModel.dailyLogs.isEmpty {
                    VStack {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: AppColors.primary600))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, AppSpacing.xl)
                } else if viewModel.dailyLogs.isEmpty {
                    emptyState
                } else {
                    VStack(spacing: AppSpacing.md) {
                        ForEach(viewModel.dailyLogs) { log in
                            DailyLogCard(log: log)
                        }
                    }
                    .padding(AppSpacing.md)
                }
            }
            .background(AppColors.background)
            .navigationTitle("nav.dailyLogs".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("common.done".localized) { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingNewLog = true }) {
                        Image(systemName: "plus")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(AppColors.primary600)
                    }
                }
            }
            .sheet(isPresented: $showingNewLog) {
                NewDailyLogView(preselectedProject: project)
            }
            .task {
                await viewModel.fetchDailyLogs(projectId: project.id)
            }
            .refreshable {
                await viewModel.fetchDailyLogs(projectId: project.id)
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: AppSpacing.md) {
            Image(systemName: "doc.text")
                .font(.system(size: 48))
                .foregroundColor(AppColors.gray400)
            Text("dailyLogs.noLogs".localized)
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)
            Text(String(format: "dailyLogs.noLogsForProject".localized, project.name))
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)
                .multilineTextAlignment(.center)
            PrimaryButton("dailyLogs.create".localized, icon: "plus") {
                showingNewLog = true
            }
            .padding(.top, AppSpacing.sm)
        }
        .padding(AppSpacing.xl)
    }
}

#Preview {
    DailyLogsView()
}
