//
//  DrawingsView.swift
//  ConstructionManager
//
//  Construction drawings list and management
//

import SwiftUI
import Combine

struct DrawingsView: View {
    @StateObject private var viewModel = DrawingsViewModel()
    @StateObject private var cacheManager = DrawingCacheManager.shared
    @ObservedObject private var projectService = ProjectService.shared
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var searchText = ""
    @State private var selectedCategory: DrawingCategory?
    @State private var selectedProject: Project?
    @State private var selectedSort: DrawingSortOption = .name
    @State private var viewMode: ViewMode = .grid
    @State private var showingUpload = false
    @State private var selectedDrawing: Drawing?
    @State private var showingCacheOptions = false

    enum ViewMode {
        case grid, list
    }

    enum DrawingSortOption: String, CaseIterable {
        case name = "Name"
        case project = "Project"
        case category = "Category"
        case dateNewest = "Newest First"
        case dateOldest = "Oldest First"
        case sheetNumber = "Sheet Number"

        var icon: String {
            switch self {
            case .name: return "textformat"
            case .project: return "folder.fill"
            case .category: return "square.grid.2x2"
            case .dateNewest: return "calendar.badge.clock"
            case .dateOldest: return "calendar"
            case .sheetNumber: return "number"
            }
        }
    }

    private var isIPad: Bool {
        horizontalSizeClass == .regular
    }

    // Responsive grid columns based on device - use 3 columns max on iPad with minimum width
    private var gridColumns: [GridItem] {
        if isIPad {
            return [
                GridItem(.flexible(minimum: 200)),
                GridItem(.flexible(minimum: 200)),
                GridItem(.flexible(minimum: 200))
            ]
        } else {
            return [
                GridItem(.flexible()),
                GridItem(.flexible())
            ]
        }
    }

    // Filtered drawings based on selected project
    private var projectFilteredDrawings: [Drawing] {
        guard let project = selectedProject else {
            return viewModel.drawings
        }
        return viewModel.drawings.filter { $0.projectId == project.id }
    }

    // Cached filtered count to avoid recalculating in view body
    private var filteredDrawingsCount: Int {
        viewModel.filteredDrawings(search: searchText, category: selectedCategory, projectId: selectedProject?.id, sortBy: selectedSort).count
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Project Dropdown
                projectDropdown

                // Search and Filter Bar
                searchAndFilterBar

                // Category Filter
                categoryFilter

                // Network Error Banner
                if viewModel.error != nil {
                    networkWarningBanner
                }

                // Content
                let currentFilteredDrawings = viewModel.filteredDrawings(search: searchText, category: selectedCategory, projectId: selectedProject?.id, sortBy: selectedSort)

                if viewModel.isLoading && viewModel.drawings.isEmpty {
                    Spacer()
                    ProgressView("common.loading".localized)
                        .padding()
                    Spacer()
                } else if currentFilteredDrawings.isEmpty && !viewModel.isLoading {
                    emptyStateView
                } else {
                    ScrollView {
                        if viewMode == .grid {
                            drawingsGrid
                        } else {
                            drawingsList
                        }
                    }
                }
            }
            .background(AppColors.background)
            .navigationTitle("nav.drawings".localized)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    HStack(spacing: AppSpacing.sm) {
                        // Download/Cache Button
                        Button(action: { showingCacheOptions = true }) {
                            ZStack {
                                Image(systemName: "arrow.down.circle")
                                    .font(.system(size: 18))
                                    .foregroundColor(cacheManager.cachedCount > 0 ? AppColors.success : AppColors.textSecondary)

                                // Download progress indicator
                                if cacheManager.isDownloading {
                                    Circle()
                                        .trim(from: 0, to: cacheManager.totalDownloadProgress)
                                        .stroke(AppColors.primary500, lineWidth: 2)
                                        .frame(width: 22, height: 22)
                                        .rotationEffect(.degrees(-90))
                                }
                            }
                        }

                        // View Mode Toggle
                        Button(action: {
                            withAnimation {
                                viewMode = viewMode == .grid ? .list : .grid
                            }
                        }) {
                            Image(systemName: viewMode == .grid ? "list.bullet" : "square.grid.2x2")
                                .font(.system(size: 18))
                                .foregroundColor(AppColors.textSecondary)
                        }

                        // Sort Menu
                        Menu {
                            ForEach(DrawingSortOption.allCases, id: \.self) { option in
                                Button(action: {
                                    withAnimation {
                                        selectedSort = option
                                    }
                                }) {
                                    Label(option.rawValue, systemImage: option.icon)
                                    if selectedSort == option {
                                        Image(systemName: "checkmark")
                                    }
                                }
                            }
                        } label: {
                            Image(systemName: "arrow.up.arrow.down")
                                .font(.system(size: 18))
                                .foregroundColor(AppColors.textSecondary)
                        }

                        // Upload Button
                        Button(action: { showingUpload = true }) {
                            Image(systemName: "plus")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundColor(AppColors.primary600)
                        }
                    }
                }
            }
            .sheet(isPresented: $showingCacheOptions) {
                // Show drawings for selected project or all drawings
                let drawingsToCache: [Drawing] = {
                    if let project = selectedProject {
                        return viewModel.drawings.filter { $0.projectId == project.id }
                    }
                    return viewModel.drawings
                }()
                DrawingCacheSheet(drawings: drawingsToCache, cacheManager: cacheManager)
            }
            .sheet(isPresented: $showingUpload) {
                DrawingUploadView()
            }
            .fullScreenCover(item: $selectedDrawing) { drawing in
                // Pass all filtered drawings for prev/next navigation
                let filteredDrawings = viewModel.filteredDrawings(search: searchText, category: selectedCategory, projectId: selectedProject?.id, sortBy: selectedSort)
                let currentIndex = filteredDrawings.firstIndex(where: { $0.id == drawing.id }) ?? 0
                DrawingViewerView(
                    drawing: drawing,
                    allDrawings: filteredDrawings,
                    currentIndex: currentIndex
                )
            }
            .task {
                await projectService.fetchProjects()
                await viewModel.fetchDrawings()
            }
            .refreshable {
                await projectService.fetchProjects()
                await viewModel.fetchDrawings()
            }
        }
    }

    // MARK: - Project Dropdown
    private var projectDropdown: some View {
        HStack {
            Text("projects.title".localized)
                .font(AppTypography.label)
                .foregroundColor(AppColors.textSecondary)

            Menu {
                // All Projects option
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

                // Active projects with drawing counts
                ForEach(projectService.projects.filter { $0.status == .active }) { project in
                    let count = viewModel.drawings.filter { $0.projectId == project.id }.count
                    Button(action: {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            selectedProject = project
                        }
                    }) {
                        HStack {
                            Label {
                                HStack {
                                    Text(project.name)
                                    if count > 0 {
                                        Text("(\(count))")
                                            .foregroundColor(.secondary)
                                    }
                                }
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
                HStack(spacing: AppSpacing.xs) {
                    Image(systemName: selectedProject == nil ? "folder.fill" : "building.2.fill")
                        .font(.system(size: 14))
                        .foregroundColor(AppColors.primary600)

                    Text(selectedProject?.name ?? "drawings.allProjects".localized)
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                        .lineLimit(1)

                    Image(systemName: "chevron.down")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(AppColors.textSecondary)
                }
                .padding(.horizontal, AppSpacing.sm)
                .padding(.vertical, AppSpacing.xs)
                .background(AppColors.gray100)
                .cornerRadius(AppSpacing.radiusMedium)
            }

            Spacer()

            // Show count of filtered drawings using cached property
            Text(String(format: "drawings.count".localized, filteredDrawingsCount))
                .font(AppTypography.caption)
                .foregroundColor(AppColors.textTertiary)
                .animation(.none, value: filteredDrawingsCount)
        }
        .padding(.horizontal, AppSpacing.md)
        .padding(.vertical, AppSpacing.sm)
    }

    // MARK: - Search and Filter Bar
    private var searchAndFilterBar: some View {
        HStack(spacing: AppSpacing.sm) {
            HStack(spacing: AppSpacing.xs) {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(AppColors.gray400)
                TextField("drawings.searchPlaceholder".localized, text: $searchText)
                    .font(AppTypography.body)
                    .foregroundColor(AppColors.textPrimary)
                if !searchText.isEmpty {
                    Button(action: { searchText = "" }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(AppColors.gray400)
                    }
                }
            }
            .padding(AppSpacing.sm)
            .background(AppColors.cardBackground)
            .cornerRadius(AppSpacing.radiusMedium)
            .overlay(
                RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                    .stroke(AppColors.gray200, lineWidth: 1)
            )
        }
        .padding(.horizontal, AppSpacing.md)
        .padding(.vertical, AppSpacing.sm)
    }

    // MARK: - Category Filter
    private var categoryFilter: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: AppSpacing.xs) {
                FilterChip(title: "common.all".localized, isSelected: selectedCategory == nil) {
                    selectedCategory = nil
                }
                ForEach(DrawingCategory.allCases, id: \.self) { category in
                    CategoryChip(category: category, isSelected: selectedCategory == category) {
                        selectedCategory = category
                    }
                }
            }
            .padding(.horizontal, AppSpacing.md)
            .padding(.vertical, AppSpacing.xs)
        }
    }

    // MARK: - Network Warning Banner
    private var networkWarningBanner: some View {
        HStack(spacing: AppSpacing.sm) {
            Image(systemName: "wifi.exclamationmark")
                .foregroundColor(.white)

            VStack(alignment: .leading, spacing: 2) {
                Text("error.connectionFailed".localized)
                    .font(AppTypography.captionMedium)
                    .foregroundColor(.white)
                if let errorMessage = viewModel.error {
                    Text(errorMessage)
                        .font(AppTypography.caption)
                        .foregroundColor(.white.opacity(0.8))
                        .lineLimit(1)
                }
            }

            Spacer()

            Button(action: {
                Task { await viewModel.fetchDrawings() }
            }) {
                Image(systemName: "arrow.clockwise")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.white)
            }
            .accessibilityLabel("Retry connection")
        }
        .padding(AppSpacing.sm)
        .background(Color.red.opacity(0.9))
        .cornerRadius(AppSpacing.radiusMedium)
        .padding(.horizontal, AppSpacing.md)
        .padding(.bottom, AppSpacing.xs)
    }

    // MARK: - Empty State View
    private var emptyStateView: some View {
        let projectName = selectedProject?.name
        let projectDrawingsCount: Int = {
            if let project = selectedProject {
                return viewModel.drawings.filter { $0.projectId == project.id }.count
            }
            return 0
        }()

        return VStack(spacing: AppSpacing.lg) {
            Spacer()

            Image(systemName: viewModel.error != nil ? "wifi.slash" : "doc.text.image")
                .font(.system(size: 60))
                .foregroundColor(AppColors.gray400)

            VStack(spacing: AppSpacing.xs) {
                if viewModel.error != nil {
                    Text("drawings.unableToLoad".localized)
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                    Text("error.checkConnection".localized)
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                        .multilineTextAlignment(.center)
                } else if let name = projectName, projectDrawingsCount == 0 {
                    Text(String(format: "drawings.noDrawingsFor".localized, name))
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                    Text("drawings.noDrawingsYet".localized)
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                        .multilineTextAlignment(.center)
                } else {
                    Text("drawings.noDrawings".localized)
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                    Text("drawings.willAppear".localized)
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                        .multilineTextAlignment(.center)
                }
            }

            if viewModel.error != nil {
                Button(action: {
                    Task { await viewModel.fetchDrawings() }
                }) {
                    Label("common.retry".localized, systemImage: "arrow.clockwise")
                        .font(AppTypography.button)
                }
                .buttonStyle(.borderedProminent)
                .tint(AppColors.primary600)
            }

            Spacer()
        }
        .padding(AppSpacing.xl)
    }

    // MARK: - Grid View
    private var drawingsGrid: some View {
        LazyVGrid(columns: gridColumns, spacing: AppSpacing.sm) {
            ForEach(viewModel.filteredDrawings(search: searchText, category: selectedCategory, projectId: selectedProject?.id, sortBy: selectedSort)) { drawing in
                DrawingGridCard(drawing: drawing) {
                    selectedDrawing = drawing
                }
            }
        }
        .padding(isIPad ? AppSpacing.lg : AppSpacing.md)
    }

    // MARK: - List View
    private var drawingsList: some View {
        LazyVStack(spacing: AppSpacing.sm) {
            ForEach(viewModel.filteredDrawings(search: searchText, category: selectedCategory, projectId: selectedProject?.id, sortBy: selectedSort)) { drawing in
                DrawingListCard(drawing: drawing) {
                    selectedDrawing = drawing
                }
            }
        }
        .padding(AppSpacing.md)
    }
}

// MARK: - Category Chip
struct CategoryChip: View {
    let category: DrawingCategory
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: AppSpacing.xxs) {
                Image(systemName: category.icon)
                    .font(.system(size: 12))
                Text(category.displayName)
                    .font(AppTypography.captionMedium)
            }
            .padding(.horizontal, AppSpacing.sm)
            .padding(.vertical, AppSpacing.xs)
            .foregroundColor(isSelected ? .white : category.color)
            .background(isSelected ? category.color : category.color.opacity(0.1))
            .cornerRadius(AppSpacing.radiusFull)
        }
    }
}

// MARK: - Drawing Grid Card
struct DrawingGridCard: View {
    let drawing: Drawing
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: AppSpacing.xs) {
                // Thumbnail - use lighter background that works in both modes
                ZStack {
                    Rectangle()
                        .fill(drawing.category.color.opacity(0.15))
                        .aspectRatio(4/3, contentMode: .fit)
                        .cornerRadius(AppSpacing.radiusMedium)

                    VStack(spacing: AppSpacing.xs) {
                        Image(systemName: drawing.category.icon)
                            .font(.system(size: 32))
                            .foregroundColor(drawing.category.color)

                        if let sheetNumber = drawing.sheetNumber {
                            Text(sheetNumber)
                                .font(AppTypography.captionMedium)
                                .foregroundColor(drawing.category.color)
                        }
                    }

                    // Revision Badge
                    VStack {
                        HStack {
                            Spacer()
                            Text("Rev \(drawing.revision)")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(drawing.revisionBadgeColor)
                                .cornerRadius(4)
                        }
                        Spacer()
                    }
                    .padding(AppSpacing.xs)
                }

                // Info
                VStack(alignment: .leading, spacing: 2) {
                    Text(drawing.name)
                        .font(AppTypography.secondaryMedium)
                        .foregroundColor(AppColors.textPrimary)
                        .lineLimit(2)

                    Text(drawing.category.rawValue)
                        .font(AppTypography.caption)
                        .foregroundColor(drawing.category.color)
                }
            }
            .padding(AppSpacing.sm)
            .background(AppColors.cardBackground)
            .cornerRadius(AppSpacing.radiusLarge)
            .shadow(color: Color.black.opacity(0.08), radius: 3, x: 0, y: 1)
        }
        .buttonStyle(ScaleButtonStyle())
    }
}

// MARK: - Drawing List Card
struct DrawingListCard: View {
    let drawing: Drawing
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            AppCard {
                HStack(spacing: AppSpacing.md) {
                    // Icon
                    ZStack {
                        RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                            .fill(drawing.category.color.opacity(0.1))
                            .frame(width: 56, height: 56)
                        Image(systemName: drawing.category.icon)
                            .font(.system(size: 24))
                            .foregroundColor(drawing.category.color)
                    }

                    // Info
                    VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                        HStack {
                            if let sheetNumber = drawing.sheetNumber {
                                Text(sheetNumber)
                                    .font(AppTypography.captionMedium)
                                    .foregroundColor(drawing.category.color)
                            }
                            Text("Rev \(drawing.revision)")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(drawing.revisionBadgeColor)
                                .cornerRadius(4)
                        }

                        Text(drawing.name)
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)
                            .lineLimit(1)

                        Text(drawing.category.rawValue)
                            .font(AppTypography.caption)
                            .foregroundColor(drawing.category.color)
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.system(size: 14))
                        .foregroundColor(AppColors.gray400)
                }
            }
        }
        .buttonStyle(ScaleButtonStyle())
    }
}

// MARK: - ViewModel
@MainActor
class DrawingsViewModel: ObservableObject {
    @Published var drawings: [Drawing] = []
    @Published var isLoading = false
    @Published var error: String?

    private let drawingService = DrawingService.shared

    func fetchDrawings(projectId: String? = nil, discipline: String? = nil) async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        await drawingService.fetchDrawings(projectId: projectId, discipline: discipline)

        if let serviceError = drawingService.error {
            error = serviceError
        } else {
            // API returned successfully - use whatever it returned (even if empty)
            drawings = drawingService.drawings
        }
    }

    func filteredDrawings(search: String, category: DrawingCategory?, projectId: String? = nil, sortBy: DrawingsView.DrawingSortOption = .name) -> [Drawing] {
        var result = drawings

        // Filter by project
        if let projectId = projectId {
            result = result.filter { $0.projectId == projectId }
        }

        // Filter by category
        if let category = category {
            result = result.filter { $0.category == category }
        }

        // Filter by search
        if !search.isEmpty {
            result = result.filter {
                $0.name.localizedCaseInsensitiveContains(search) ||
                ($0.sheetNumber?.localizedCaseInsensitiveContains(search) ?? false) ||
                ($0.description?.localizedCaseInsensitiveContains(search) ?? false)
            }
        }

        // Sort results
        switch sortBy {
        case .name:
            result.sort { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        case .project:
            result.sort { $0.projectId.localizedCaseInsensitiveCompare($1.projectId) == .orderedAscending }
        case .category:
            result.sort { $0.category.rawValue.localizedCaseInsensitiveCompare($1.category.rawValue) == .orderedAscending }
        case .dateNewest:
            result.sort { $0.uploadedAt > $1.uploadedAt }
        case .dateOldest:
            result.sort { $0.uploadedAt < $1.uploadedAt }
        case .sheetNumber:
            result.sort {
                let sheet1 = $0.sheetNumber ?? $0.name
                let sheet2 = $1.sheetNumber ?? $1.name
                return sheet1.localizedCaseInsensitiveCompare(sheet2) == .orderedAscending
            }
        }

        return result
    }
}

// MARK: - Drawing Cache Sheet
struct DrawingCacheSheet: View {
    let drawings: [Drawing]
    @ObservedObject var cacheManager: DrawingCacheManager
    @Environment(\.dismiss) private var dismiss

    var cachedCount: Int {
        drawings.filter { cacheManager.isCached(drawingId: $0.id) }.count
    }

    var body: some View {
        NavigationStack {
            List {
                // Status Section
                Section {
                    HStack {
                        Label("Cached Drawings", systemImage: "arrow.down.circle.fill")
                        Spacer()
                        Text("\(cachedCount) / \(drawings.count)")
                            .foregroundColor(AppColors.textSecondary)
                    }

                    HStack {
                        Label("Storage Used", systemImage: "internaldrive")
                        Spacer()
                        Text(cacheManager.cacheSizeFormatted)
                            .foregroundColor(AppColors.textSecondary)
                    }
                }

                // Download Section
                Section {
                    // Download All Button
                    Button(action: downloadAll) {
                        HStack {
                            Label("Download All for Offline", systemImage: "arrow.down.to.line")
                            Spacer()
                            if cacheManager.isDownloading {
                                ProgressView()
                                    .scaleEffect(0.8)
                            }
                        }
                    }
                    .disabled(cacheManager.isDownloading || cachedCount == drawings.count)

                    // Progress
                    if cacheManager.isDownloading {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Downloading...")
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textSecondary)
                            ProgressView(value: cacheManager.totalDownloadProgress)
                                .tint(AppColors.primary500)
                        }
                    }
                } header: {
                    Text("Offline Access")
                }

                // Drawings List
                Section {
                    ForEach(drawings) { drawing in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(drawing.sheetNumber ?? drawing.name)
                                    .font(AppTypography.bodyMedium)
                                Text(drawing.name)
                                    .font(AppTypography.caption)
                                    .foregroundColor(AppColors.textSecondary)
                                    .lineLimit(1)
                            }

                            Spacer()

                            if cacheManager.isCached(drawingId: drawing.id) {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(AppColors.success)
                            } else if let progress = cacheManager.downloadProgress[drawing.id] {
                                ProgressView(value: progress)
                                    .frame(width: 40)
                            } else {
                                Image(systemName: "icloud.and.arrow.down")
                                    .foregroundColor(AppColors.textTertiary)
                            }
                        }
                        .swipeActions(edge: .trailing) {
                            if cacheManager.isCached(drawingId: drawing.id) {
                                Button(role: .destructive) {
                                    cacheManager.removeFromCache(drawingId: drawing.id)
                                } label: {
                                    Label("Remove", systemImage: "trash")
                                }
                            }
                        }
                    }
                } header: {
                    Text("Drawings")
                }

                // Clear Cache Section
                Section {
                    Button(role: .destructive, action: clearCache) {
                        Label("Clear All Cached Drawings", systemImage: "trash")
                    }
                    .disabled(cacheManager.cachedCount == 0)
                }
            }
            .navigationTitle("drawings.offlineDrawings".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("common.done".localized) { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private func downloadAll() {
        Task {
            await cacheManager.downloadDrawingsForProject(
                projectId: drawings.first?.projectId ?? "",
                drawings: drawings
            )
        }
    }

    private func clearCache() {
        cacheManager.clearCache()
    }
}

#Preview {
    DrawingsView()
}
