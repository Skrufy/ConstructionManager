//
//  SearchView.swift
//  ConstructionManager
//
//  Global search view
//

import SwiftUI

struct SearchView: View {
    @StateObject private var searchService = SearchService.shared
    @State private var searchText = ""
    @State private var selectedTypes: Set<SearchResultType> = []
    @Environment(\.dismiss) private var dismiss
    @FocusState private var isSearchFocused: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search Bar
                searchBar

                // Type Filters
                typeFilters

                // Content
                if searchText.isEmpty {
                    recentSearchesView
                } else if searchService.isSearching {
                    loadingView
                } else if searchService.results.isEmpty {
                    emptyResultsView
                } else {
                    searchResultsList
                }
            }
            .background(AppColors.background)
            .navigationTitle("Search")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .onChange(of: searchText) { _, newValue in
            Task {
                try? await Task.sleep(nanoseconds: 300_000_000) // Debounce
                if searchText == newValue {
                    await performSearch()
                }
            }
        }
        .onAppear {
            // Auto-focus search field when view appears
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                isSearchFocused = true
            }
        }
    }

    private var searchBar: some View {
        VStack(spacing: AppSpacing.xs) {
            HStack(spacing: AppSpacing.xs) {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(AppColors.gray400)
                TextField("Search projects, documents, equipment...", text: $searchText)
                    .font(AppTypography.body)
                    .foregroundColor(AppColors.textPrimary)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    .focused($isSearchFocused)
                if !searchText.isEmpty {
                    Button(action: {
                        searchText = ""
                        searchService.clearResults()
                    }) {
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
            .contentShape(Rectangle())
            .onTapGesture {
                isSearchFocused = true
            }

            // Filter indicator
            if let filterLabel = searchService.activeFilterLabel {
                HStack(spacing: AppSpacing.xs) {
                    Text("Filtering:")
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                    Text(filterLabel)
                        .font(AppTypography.labelSmall)
                        .foregroundColor(AppColors.primary600)
                        .padding(.horizontal, AppSpacing.sm)
                        .padding(.vertical, 2)
                        .background(AppColors.primary100)
                        .cornerRadius(4)
                    Spacer()
                }
            }

            // Filter hints
            if searchText.isEmpty {
                Text("Tip: Use #projects, #logs, #documents to filter")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textTertiary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(.horizontal, AppSpacing.md)
        .padding(.vertical, AppSpacing.sm)
    }

    private var typeFilters: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: AppSpacing.xs) {
                FilterChip(title: "All", isSelected: selectedTypes.isEmpty) {
                    selectedTypes.removeAll()
                    Task { await performSearch() }
                }
                ForEach(SearchResultType.allCases, id: \.self) { type in
                    FilterChip(title: type.displayName, isSelected: selectedTypes.contains(type)) {
                        if selectedTypes.contains(type) {
                            selectedTypes.remove(type)
                        } else {
                            selectedTypes.insert(type)
                        }
                        Task { await performSearch() }
                    }
                }
            }
            .padding(.horizontal, AppSpacing.md)
            .padding(.bottom, AppSpacing.sm)
        }
    }

    private var recentSearchesView: some View {
        VStack(alignment: .leading, spacing: AppSpacing.md) {
            if !searchService.recentSearches.isEmpty {
                HStack {
                    Text("Recent Searches")
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                    Spacer()
                    Button("Clear") {
                        searchService.clearRecentSearches()
                    }
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.primary600)
                }
                .padding(.horizontal, AppSpacing.md)
                .padding(.top, AppSpacing.md)

                ForEach(searchService.recentSearches, id: \.self) { query in
                    HStack {
                        Image(systemName: "clock.arrow.circlepath")
                            .foregroundColor(AppColors.gray400)
                        Text(query)
                            .font(AppTypography.body)
                            .foregroundColor(AppColors.textPrimary)
                        Spacer()
                        Button {
                            searchService.removeRecentSearch(query)
                        } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 12))
                                .foregroundColor(AppColors.gray400)
                        }
                    }
                    .padding(.horizontal, AppSpacing.md)
                    .padding(.vertical, AppSpacing.xs)
                    .contentShape(Rectangle())
                    .onTapGesture {
                        searchText = query
                        Task { await performSearch() }
                    }
                }
            }
            Spacer()
        }
    }

    private var loadingView: some View {
        VStack {
            Spacer()
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: AppColors.primary600))
            Text("Searching...")
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)
                .padding(.top, AppSpacing.sm)
            Spacer()
        }
    }

    private var emptyResultsView: some View {
        VStack(spacing: AppSpacing.md) {
            Spacer()
            Image(systemName: "magnifyingglass")
                .font(.system(size: 48))
                .foregroundColor(AppColors.gray300)
            Text("No Results Found")
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)
            Text("Try different keywords or filters")
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)
            Spacer()
        }
    }

    private var searchResultsList: some View {
        ScrollView {
            LazyVStack(spacing: AppSpacing.sm) {
                ForEach(searchService.results) { result in
                    SearchResultCard(result: result)
                }
            }
            .padding(AppSpacing.md)
        }
    }

    private func performSearch() async {
        let types = selectedTypes.isEmpty ? nil : Array(selectedTypes)
        await searchService.search(query: searchText, types: types)
    }
}

// MARK: - Search Result Card
struct SearchResultCard: View {
    let result: SearchResult

    var body: some View {
        AppCard {
            HStack(spacing: AppSpacing.sm) {
                // Icon
                ZStack {
                    Circle()
                        .fill(AppColors.primary100)
                        .frame(width: 40, height: 40)
                    Image(systemName: result.type.icon)
                        .font(.system(size: 16))
                        .foregroundColor(AppColors.primary600)
                }

                // Content
                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                    HStack {
                        Text(result.type.displayName)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.primary600)
                            .padding(.horizontal, AppSpacing.xs)
                            .padding(.vertical, 2)
                            .background(AppColors.primary100)
                            .cornerRadius(4)
                        Spacer()
                    }
                    Text(result.title)
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                        .lineLimit(1)
                    if let subtitle = result.subtitle {
                        Text(subtitle)
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                            .lineLimit(1)
                    }
                    if let description = result.description {
                        Text(description)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textTertiary)
                            .lineLimit(2)
                    }
                }

                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundColor(AppColors.gray400)
            }
        }
    }
}

#Preview {
    SearchView()
}
