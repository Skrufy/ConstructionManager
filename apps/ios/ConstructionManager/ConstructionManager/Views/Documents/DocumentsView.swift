//
//  DocumentsView.swift
//  ConstructionManager
//
//  Documents list for licenses, certs, and other files
//

import SwiftUI
import UIKit
import Combine

struct DocumentsView: View {
    @StateObject private var viewModel = DocumentsViewModel()
    @StateObject private var documentService = DocumentService.shared
    @StateObject private var projectService = ProjectService.shared
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var deepLinkManager: DeepLinkManager
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var searchText = ""
    @State private var selectedCategory: DocumentCategory?
    @State private var selectedProjectId: String?
    @State private var selectedBlasterIds: Set<String> = []
    @State private var showingUpload = false
    @State private var selectedDocument: Document?

    private var canUploadDocuments: Bool {
        appState.hasPermission(.uploadDocuments)
    }

    private var isIPad: Bool {
        horizontalSizeClass == .regular
    }

    // Responsive grid columns - adaptive based on available width
    private var gridColumns: [GridItem] {
        if isIPad {
            // Use adaptive columns that fit within available space
            return [GridItem(.adaptive(minimum: 320, maximum: 500))]
        } else {
            return [GridItem(.flexible())]
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search Bar
                searchBar

                // Jobsite Filter
                jobsiteFilter

                // Category Filter
                categoryFilter

                // Blaster Filter (shown only for BLASTING category)
                if selectedCategory == .blasting {
                    blasterFilter
                }

                // Expiration Alerts
                if !viewModel.expiringDocuments.isEmpty {
                    expirationAlert
                }

                // Documents List - use list layout for both iPad and iPhone for better readability
                ScrollView {
                    if isIPad {
                        // iPad: 2-column grid with wider cards
                        LazyVGrid(columns: gridColumns, spacing: AppSpacing.md) {
                            ForEach(viewModel.filteredDocuments(search: searchText, category: selectedCategory, projectId: selectedProjectId)) { doc in
                                Button {
                                    selectedDocument = doc
                                } label: {
                                    DocumentCard(document: doc)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(AppSpacing.lg)
                    } else {
                        // iPhone: List layout
                        LazyVStack(spacing: AppSpacing.sm) {
                            ForEach(viewModel.filteredDocuments(search: searchText, category: selectedCategory, projectId: selectedProjectId)) { doc in
                                Button {
                                    selectedDocument = doc
                                } label: {
                                    DocumentCard(document: doc)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(AppSpacing.md)
                    }
                }
                .refreshable {
                    await viewModel.fetchDocuments()
                    await projectService.fetchProjects()
                }
            }
            .background(AppColors.background)
            .navigationTitle("nav.documents".localized)
            .toolbar {
                if canUploadDocuments {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button(action: { showingUpload = true }) {
                            Image(systemName: "plus")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundColor(AppColors.primary600)
                        }
                    }
                }
            }
            .sheet(isPresented: $showingUpload) {
                DocumentUploadView()
            }
            .sheet(item: $selectedDocument) { document in
                DocumentDetailView(document: document)
            }
            .task {
                await viewModel.fetchDocuments()
                await projectService.fetchProjects()
            }
            .onChange(of: deepLinkManager.activeDocumentId) { _, documentId in
                // Handle deep link to specific document
                if let documentId = documentId,
                   let document = viewModel.documents.first(where: { $0.id == documentId }) {
                    selectedDocument = document
                    deepLinkManager.clearActiveLinks()
                }
            }
            .onChange(of: selectedCategory) { _, newCategory in
                // Clear blaster selection when switching away from BLASTING category
                if newCategory != .blasting {
                    selectedBlasterIds = []
                }
            }
            .onAppear {
                // Check for pending deep link when view appears
                if let documentId = deepLinkManager.activeDocumentId,
                   let document = viewModel.documents.first(where: { $0.id == documentId }) {
                    selectedDocument = document
                    deepLinkManager.clearActiveLinks()
                }
            }
        }
    }

    private var searchBar: some View {
        HStack(spacing: AppSpacing.xs) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(AppColors.gray400)
            TextField("documents.searchPlaceholder".localized, text: $searchText)
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

    private var jobsiteFilter: some View {
        HStack(spacing: AppSpacing.sm) {
            Image(systemName: "mappin.and.ellipse")
                .font(.system(size: 14))
                .foregroundColor(AppColors.primary600)

            Picker("documents.jobsite".localized, selection: $selectedProjectId) {
                Text("documents.allJobsites".localized).tag(nil as String?)
                ForEach(projectService.projects.filter { $0.status == .active }) { project in
                    Text(project.name).tag(project.id as String?)
                }
            }
            .pickerStyle(.menu)
            .tint(AppColors.textPrimary)

            Spacer()

            if selectedProjectId != nil {
                Button {
                    selectedProjectId = nil
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 18))
                        .foregroundColor(AppColors.gray400)
                }
            }
        }
        .padding(.horizontal, AppSpacing.md)
        .padding(.vertical, AppSpacing.xs)
    }

    private var categoryFilter: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: AppSpacing.xs) {
                FilterChip(title: "common.all".localized, isSelected: selectedCategory == nil) {
                    selectedCategory = nil
                }
                ForEach(DocumentCategory.allCases, id: \.self) { category in
                    DocCategoryChip(category: category, isSelected: selectedCategory == category) {
                        selectedCategory = category
                    }
                }
            }
            .padding(.horizontal, AppSpacing.md)
            .padding(.vertical, AppSpacing.xs)
        }
    }

    private var blasterFilter: some View {
        VStack(alignment: .leading, spacing: AppSpacing.xs) {
            HStack(spacing: AppSpacing.xs) {
                Image(systemName: "hammer.fill")
                    .font(.system(size: 14))
                    .foregroundColor(AppColors.orange)
                Text("Blasters:")
                    .font(AppTypography.bodyBold)
                Text("(\(selectedBlasterIds.count) selected)")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
            }
            .padding(.horizontal, AppSpacing.md)

            if documentService.isLoadingBlasters {
                ProgressView()
                    .padding()
            } else if documentService.blasters.isEmpty {
                Text("No blasters found. Mark users as \"Certified Blaster\" in Admin Users.")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
                    .padding(.horizontal, AppSpacing.md)
                    .padding(.vertical, AppSpacing.sm)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: AppSpacing.xs) {
                        FilterChip(
                            title: "All Blasters",
                            isSelected: selectedBlasterIds.isEmpty
                        ) {
                            selectedBlasterIds = []
                        }

                        ForEach(documentService.blasters) { blaster in
                            FilterChip(
                                title: blaster.name,
                                isSelected: selectedBlasterIds.contains(blaster.id),
                                color: AppColors.orange
                            ) {
                                if selectedBlasterIds.contains(blaster.id) {
                                    selectedBlasterIds.remove(blaster.id)
                                } else {
                                    selectedBlasterIds.insert(blaster.id)
                                }
                            }
                        }
                    }
                    .padding(.horizontal, AppSpacing.md)
                    .padding(.vertical, AppSpacing.xs)
                }
            }
        }
        .padding(.vertical, AppSpacing.xs)
        .background(AppColors.orange.opacity(0.1))
        .task {
            if documentService.blasters.isEmpty {
                await documentService.fetchBlasters()
            }
        }
        .onChange(of: selectedBlasterIds) { _, newValue in
            Task {
                await viewModel.fetchDocuments(
                    projectId: selectedProjectId,
                    category: selectedCategory?.rawValue,
                    blasterIds: newValue.isEmpty ? nil : Array(newValue)
                )
            }
        }
    }

    private var expirationAlert: some View {
        HStack(spacing: AppSpacing.sm) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(AppColors.warning)
            Text(String(format: "documents.expiringSoon".localized, viewModel.expiringDocuments.count))
                .font(AppTypography.secondaryMedium)
                .foregroundColor(AppColors.warning)
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 12))
                .foregroundColor(AppColors.warning)
        }
        .padding(AppSpacing.sm)
        .background(AppColors.warningLight)
        .cornerRadius(AppSpacing.radiusMedium)
        .padding(.horizontal, AppSpacing.md)
        .padding(.vertical, AppSpacing.xs)
    }
}

// MARK: - Document Category Chip
struct DocCategoryChip: View {
    let category: DocumentCategory
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

// MARK: - Document Card
struct DocumentCard: View {
    let document: Document
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var showingShareSheet = false

    private var isIPad: Bool {
        horizontalSizeClass == .regular
    }

    var body: some View {
        AppCard {
            HStack(spacing: AppSpacing.sm) {
                // Icon
                ZStack {
                    RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                        .fill(document.category.color.opacity(0.1))
                        .frame(width: 44, height: 44)
                    Image(systemName: document.category.icon)
                        .font(.system(size: 18))
                        .foregroundColor(document.category.color)
                }

                // Info - more compact layout
                VStack(alignment: .leading, spacing: 2) {
                    Text(document.name)
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                        .lineLimit(1)

                    Text(document.category.rawValue)
                        .font(AppTypography.caption)
                        .foregroundColor(document.category.color)

                    HStack(spacing: AppSpacing.xs) {
                        Text(document.fileSizeFormatted)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textTertiary)

                        if let expiresAt = document.expiresAt {
                            Text("•")
                                .foregroundColor(AppColors.textTertiary)
                            Text(formatExpiration(expiresAt))
                                .font(AppTypography.caption)
                                .foregroundColor(document.expirationStatus.color)
                                .lineLimit(1)
                        }
                    }
                }

                Spacer(minLength: AppSpacing.xs)

                // Share button
                Button {
                    showingShareSheet = true
                } label: {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 16))
                        .foregroundColor(AppColors.primary600)
                        .frame(width: 36, height: 36)
                        .background(AppColors.primary100)
                        .cornerRadius(AppSpacing.radiusSmall)
                }
                .buttonStyle(.plain)

                // Status & Action - more compact
                VStack(alignment: .trailing, spacing: AppSpacing.xxs) {
                    if document.expiresAt != nil {
                        Text(document.expirationStatus.label)
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(document.isExpired || document.isExpiringSoon ? AppColors.warning : AppColors.success)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(
                                (document.isExpired || document.isExpiringSoon ? AppColors.warning : AppColors.success).opacity(0.15)
                            )
                            .cornerRadius(4)
                    }

                    Image(systemName: "chevron.right")
                        .font(.system(size: 12))
                        .foregroundColor(AppColors.gray400)
                }
            }
        }
        .sheet(isPresented: $showingShareSheet) {
            ShareSheet(items: [
                "Check out this document: \(document.name)",
                DeepLinkManager.shareURL(for: document)
            ])
        }
    }

    private func formatExpiration(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yy"
        return formatter.string(from: date)
    }
}

// MARK: - Share Sheet
struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

// MARK: - Document Upload View
struct DocumentUploadView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var projectService = ProjectService.shared
    @StateObject private var documentService = DocumentService.shared
    @State private var name = ""
    @State private var selectedCategory: DocumentCategory = .other
    @State private var selectedProjectId: String? = nil
    @State private var description = ""
    @State private var hasExpiration = false
    @State private var expirationDate = Date()
    @State private var selectedBlasterIds: Set<String> = []
    @State private var showImagePicker = false
    @State private var selectedImage: UIImage?
    @State private var errorMessage: String?
    @State private var isUploading = false

    private var activeProjects: [Project] {
        projectService.projects.filter { $0.status == .active }
    }

    private var canUpload: Bool {
        // Must have a name and selected image
        guard !name.isEmpty, selectedImage != nil else { return false }

        // If BLASTING category, must have at least one blaster selected
        if selectedCategory == .blasting {
            return !selectedBlasterIds.isEmpty
        }
        return true
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // File Selection
                    Button {
                        showImagePicker = true
                    } label: {
                        ZStack {
                            RoundedRectangle(cornerRadius: AppSpacing.radiusLarge)
                                .stroke(style: StrokeStyle(lineWidth: 2, dash: [8]))
                                .foregroundColor(selectedImage != nil ? AppColors.success : AppColors.gray300)
                                .frame(height: 150)

                            if let selectedImage = selectedImage {
                                VStack(spacing: AppSpacing.sm) {
                                    Image(systemName: "checkmark.circle.fill")
                                        .font(.system(size: 40))
                                        .foregroundColor(AppColors.success)
                                    Text("Image Selected")
                                        .font(AppTypography.secondary)
                                        .foregroundColor(AppColors.success)
                                }
                            } else {
                                VStack(spacing: AppSpacing.sm) {
                                    Image(systemName: "doc.badge.plus")
                                        .font(.system(size: 40))
                                        .foregroundColor(AppColors.primary600)
                                    Text("documents.tapToSelect".localized)
                                        .font(AppTypography.secondary)
                                        .foregroundColor(AppColors.textSecondary)
                                }
                            }
                        }
                    }
                    .buttonStyle(.plain)
                    .sheet(isPresented: $showImagePicker) {
                        ImagePicker(image: $selectedImage)
                    }

                    // Error message
                    if let errorMessage = errorMessage {
                        HStack(spacing: AppSpacing.xs) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(AppColors.error)
                            Text(errorMessage)
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.error)
                        }
                        .padding(AppSpacing.sm)
                        .background(AppColors.error.opacity(0.1))
                        .cornerRadius(AppSpacing.radiusSmall)
                    }

                    // Form
                    VStack(spacing: AppSpacing.md) {
                        AppTextField(label: "Document Name", placeholder: "e.g., Contractor License", text: $name, isRequired: true)

                        // Project Picker (required)
                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            HStack {
                                Text("Upload to Project")
                                    .font(AppTypography.label)
                                Text("*")
                                    .foregroundColor(.red)
                            }
                            Picker("Upload to Project", selection: $selectedProjectId) {
                                Text("📋 Not Project Specific (Company-wide)").tag(nil as String?)
                                ForEach(activeProjects) { project in
                                    Text(project.name).tag(project.id as String?)
                                }
                            }
                            .pickerStyle(.menu)
                            .tint(AppColors.textPrimary)
                        }

                        // Category Picker
                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            HStack {
                                Text("documents.category".localized)
                                    .font(AppTypography.label)
                                Text("*")
                                    .foregroundColor(.red)
                            }
                            Picker("documents.category".localized, selection: $selectedCategory) {
                                ForEach(DocumentCategory.allCases, id: \.self) { cat in
                                    Text(cat.displayName).tag(cat)
                                }
                            }
                            .pickerStyle(.menu)
                            .tint(AppColors.textPrimary)
                            .onChange(of: selectedCategory) { newValue in
                                if newValue == .blasting && documentService.blasters.isEmpty {
                                    Task {
                                        await documentService.fetchBlasters()
                                    }
                                }
                                if newValue != .blasting {
                                    selectedBlasterIds = []
                                }
                            }
                        }

                        // Blaster Selection (shown only for BLASTING category)
                        if selectedCategory == .blasting {
                            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                                HStack {
                                    Image(systemName: "hammer.fill")
                                        .foregroundColor(AppColors.orange)
                                    Text("Assign Blasters")
                                        .font(AppTypography.bodyBold)
                                    Text("*")
                                        .foregroundColor(.red)
                                }

                                Text("Only ADMINS and selected blasters will be able to view this document")
                                    .font(AppTypography.caption)
                                    .foregroundColor(AppColors.textSecondary)

                                if documentService.isLoadingBlasters {
                                    ProgressView()
                                        .padding()
                                } else if documentService.blasters.isEmpty {
                                    Text("No blasters found. Mark users as \"Certified Blaster\" in Admin Users.")
                                        .font(AppTypography.caption)
                                        .foregroundColor(AppColors.textSecondary)
                                        .padding()
                                } else {
                                    VStack(spacing: AppSpacing.sm) {
                                        ForEach(documentService.blasters) { blaster in
                                            BlasterSelectionRow(
                                                blaster: blaster,
                                                isSelected: selectedBlasterIds.contains(blaster.id)
                                            ) {
                                                if selectedBlasterIds.contains(blaster.id) {
                                                    selectedBlasterIds.remove(blaster.id)
                                                } else {
                                                    selectedBlasterIds.insert(blaster.id)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            .padding(AppSpacing.md)
                            .background(AppColors.orange.opacity(0.1))
                            .cornerRadius(AppSpacing.radiusMedium)
                        }

                        AppTextArea(label: "Description", placeholder: "Optional description...", text: $description)

                        Toggle("documents.hasExpiration".localized, isOn: $hasExpiration)
                            .font(AppTypography.bodyMedium)
                            .tint(AppColors.primary600)

                        if hasExpiration {
                            VStack(alignment: .leading, spacing: AppSpacing.xs) {
                                Text("documents.expirationDate".localized)
                                    .font(AppTypography.label)
                                DatePicker("", selection: $expirationDate, displayedComponents: .date)
                                    .datePickerStyle(.compact)
                                    .labelsHidden()
                            }
                        }
                    }

                    if isUploading {
                        VStack(spacing: AppSpacing.sm) {
                            ProgressView()
                            Text("Uploading...")
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textSecondary)
                        }
                        .padding()
                    } else {
                        PrimaryButton("documents.upload".localized, icon: "arrow.up.circle.fill") {
                            Task {
                                await uploadDocument()
                            }
                        }
                        .disabled(!canUpload)
                        .opacity(canUpload ? 1.0 : 0.5)
                    }
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("documents.upload".localized)
            .navigationBarTitleDisplayMode(.inline)
            .task {
                await projectService.fetchProjects()
            }
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("common.cancel".localized) { dismiss() }
                }
            }
        }
    }

    private func uploadDocument() async {
        guard let selectedImage = selectedImage else { return }

        isUploading = true
        errorMessage = nil

        do {
            _ = try await documentService.uploadImage(
                projectId: selectedProjectId,
                image: selectedImage,
                name: name,
                category: selectedCategory,
                description: description.isEmpty ? nil : description,
                blasterIds: selectedBlasterIds.isEmpty ? nil : Array(selectedBlasterIds)
            )

            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            isUploading = false
        }
    }
}

// MARK: - Blaster Selection Row
struct BlasterSelectionRow: View {
    let blaster: User
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: AppSpacing.sm) {
                Image(systemName: isSelected ? "checkmark.square.fill" : "square")
                    .foregroundColor(isSelected ? AppColors.orange : AppColors.gray400)
                    .font(.system(size: 20))

                VStack(alignment: .leading, spacing: 2) {
                    Text(blaster.name)
                        .font(AppTypography.body)
                        .foregroundColor(AppColors.textPrimary)
                    Text(blaster.email)
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textSecondary)
                }

                Spacer()
            }
            .padding(AppSpacing.sm)
            .background(AppColors.surface)
            .cornerRadius(AppSpacing.radiusSmall)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Document Detail View
struct DocumentDetailView: View {
    @Environment(\.dismiss) private var dismiss
    let document: Document
    @State private var isLoading = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Document Header
                    VStack(spacing: AppSpacing.md) {
                        ZStack {
                            RoundedRectangle(cornerRadius: AppSpacing.radiusLarge)
                                .fill(document.category.color.opacity(0.1))
                                .frame(width: 80, height: 80)
                            Image(systemName: document.category.icon)
                                .font(.system(size: 36))
                                .foregroundColor(document.category.color)
                        }

                        Text(document.name)
                            .font(AppTypography.heading2)
                            .foregroundColor(AppColors.textPrimary)
                            .multilineTextAlignment(.center)

                        StatusBadge(
                            text: document.category.rawValue,
                            status: .active
                        )
                    }
                    .padding(.top, AppSpacing.md)

                    // Document Details Card
                    AppCard {
                        VStack(spacing: AppSpacing.md) {
                            DocumentDetailRow(icon: "folder.fill", label: "Category", value: document.category.rawValue)
                            DocumentDetailRow(icon: "doc.fill", label: "Size", value: document.fileSizeFormatted)
                            DocumentDetailRow(icon: "person.fill", label: "Uploaded By", value: document.uploadedBy)
                            DocumentDetailRow(icon: "calendar", label: "Uploaded", value: formatDate(document.uploadedAt))

                            if let expiresAt = document.expiresAt {
                                DocumentDetailRow(
                                    icon: "exclamationmark.triangle.fill",
                                    label: "Expires",
                                    value: formatDate(expiresAt),
                                    valueColor: document.expirationStatus.color
                                )
                            }
                        }
                    }

                    // Description
                    if let description = document.description, !description.isEmpty {
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

                    // Tags
                    if !document.tags.isEmpty {
                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("documents.tags".localized)
                                .font(AppTypography.label)
                                .foregroundColor(AppColors.textSecondary)
                            FlowLayout(spacing: AppSpacing.xs) {
                                ForEach(document.tags, id: \.self) { tag in
                                    Text(tag)
                                        .font(AppTypography.caption)
                                        .foregroundColor(AppColors.textSecondary)
                                        .padding(.horizontal, AppSpacing.sm)
                                        .padding(.vertical, AppSpacing.xxs)
                                        .background(AppColors.gray100)
                                        .cornerRadius(AppSpacing.radiusFull)
                                }
                            }
                        }
                    }

                    // Actions
                    VStack(spacing: AppSpacing.sm) {
                        PrimaryButton("documents.view".localized, icon: "eye.fill") {
                            openDocument()
                        }

                        OutlineButton("common.download".localized, icon: "arrow.down.circle") {
                            downloadDocument()
                        }
                    }
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("documents.details".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("common.done".localized) { dismiss() }
                }
            }
        }
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: date)
    }

    private func openDocument() {
        // Open document in browser or viewer
        guard let url = URL(string: document.fileUrl) else { return }
        UIApplication.shared.open(url)
    }

    private func downloadDocument() {
        // Download document
        guard let url = URL(string: document.fileUrl) else { return }
        UIApplication.shared.open(url)
    }
}

// MARK: - Document Detail Row
struct DocumentDetailRow: View {
    let icon: String
    let label: String
    let value: String
    var valueColor: Color = AppColors.textPrimary

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
                .foregroundColor(valueColor)
        }
    }
}

// MARK: - Flow Layout for Tags
struct FlowLayout: Layout {
    var spacing: CGFloat

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(in: proposal.width ?? 0, subviews: subviews, spacing: spacing)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(in: bounds.width, subviews: subviews, spacing: spacing)
        for (index, subview) in subviews.enumerated() {
            subview.place(at: CGPoint(x: bounds.minX + result.positions[index].x, y: bounds.minY + result.positions[index].y), proposal: .unspecified)
        }
    }

    struct FlowResult {
        var size: CGSize = .zero
        var positions: [CGPoint] = []

        init(in maxWidth: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var x: CGFloat = 0
            var y: CGFloat = 0
            var rowHeight: CGFloat = 0

            for subview in subviews {
                let size = subview.sizeThatFits(.unspecified)
                if x + size.width > maxWidth && x > 0 {
                    x = 0
                    y += rowHeight + spacing
                    rowHeight = 0
                }
                positions.append(CGPoint(x: x, y: y))
                rowHeight = max(rowHeight, size.height)
                x += size.width + spacing
            }

            self.size = CGSize(width: maxWidth, height: y + rowHeight)
        }
    }
}

// MARK: - ViewModel
@MainActor
class DocumentsViewModel: ObservableObject {
    @Published var documents: [Document] = []
    @Published var isLoading = false

    private let documentService = DocumentService.shared

    var expiringDocuments: [Document] {
        documents.filter { $0.isExpiringSoon || $0.isExpired }
    }

    func fetchDocuments(projectId: String? = nil, category: String? = nil, blasterIds: [String]? = nil) async {
        isLoading = true
        defer { isLoading = false }

        await documentService.fetchDocuments(
            projectId: projectId,
            category: category,
            blasterIds: blasterIds
        )

        if !documentService.documents.isEmpty {
            documents = documentService.documents
        } else {
            // Fallback to mock data if no documents from API
            documents = Document.mockDocuments
        }
    }

    func filteredDocuments(search: String, category: DocumentCategory?, projectId: String? = nil) -> [Document] {
        var result = documents

        // Filter by project/jobsite
        if let projectId = projectId {
            result = result.filter { $0.projectId == projectId }
        }

        // Filter by category
        if let category = category {
            result = result.filter { $0.category == category }
        }

        // Filter by search text
        if !search.isEmpty {
            result = result.filter {
                $0.name.localizedCaseInsensitiveContains(search) ||
                ($0.description?.localizedCaseInsensitiveContains(search) ?? false) ||
                $0.tags.contains { $0.localizedCaseInsensitiveContains(search) }
            }
        }

        return result
    }
}

// MARK: - Image Picker
struct ImagePicker: UIViewControllerRepresentable {
    @Binding var image: UIImage?
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .photoLibrary
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: ImagePicker

        init(_ parent: ImagePicker) {
            self.parent = parent
        }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let image = info[.originalImage] as? UIImage {
                parent.image = image
            }
            parent.dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }
    }
}

#Preview {
    DocumentsView()
}
