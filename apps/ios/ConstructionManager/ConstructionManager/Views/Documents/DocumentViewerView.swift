//
//  DocumentViewerView.swift
//  ConstructionManager
//
//  Full-screen document viewer modal - supports PDFs, images, and videos
//

import SwiftUI
import UIKit

/// Full-screen modal document viewer with prev/next navigation
struct DocumentViewerView: View {
    @State private var currentDocument: Document
    let allDocuments: [Document]
    @State private var currentIndex: Int
    @Environment(\.dismiss) private var dismiss

    @State private var signedURL: URL?
    @State private var isLoading = true
    @State private var loadError: String?
    @State private var showingShareSheet = false

    private let cacheManager = DocumentCacheManager.shared

    // Navigation helpers
    private var hasPrevious: Bool { currentIndex > 0 }
    private var hasNext: Bool { currentIndex < allDocuments.count - 1 }

    /// Initialize with a single document (no navigation)
    init(document: Document) {
        self._currentDocument = State(initialValue: document)
        self.allDocuments = [document]
        self._currentIndex = State(initialValue: 0)
    }

    /// Initialize with all documents for prev/next navigation
    init(document: Document, allDocuments: [Document], currentIndex: Int) {
        self._currentDocument = State(initialValue: document)
        self.allDocuments = allDocuments
        self._currentIndex = State(initialValue: currentIndex)
    }

    var body: some View {
        ZStack {
            // Background
            Color.black.opacity(0.95)
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                headerView

                // Content
                if isLoading {
                    loadingView
                } else if let error = loadError {
                    errorView(error)
                } else if let url = signedURL {
                    contentView(url: url)
                        .id(currentDocument.id) // Force view refresh when document changes
                } else {
                    errorView("Unable to load document")
                }
            }
        }
        .task(id: currentDocument.id) {
            await loadDocument()
        }
        .sheet(isPresented: $showingShareSheet) {
            if let url = signedURL {
                ShareSheet(items: [url])
            }
        }
    }

    // MARK: - Header

    private var headerView: some View {
        HStack(spacing: AppSpacing.sm) {
            // Close button
            Button(action: { dismiss() }) {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(width: 36, height: 36)
                    .background(Color.white.opacity(0.1))
                    .cornerRadius(8)
            }

            // Previous button (only show if multiple documents)
            if allDocuments.count > 1 {
                Button(action: { navigateToPrevious() }) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(hasPrevious ? .white : .white.opacity(0.3))
                        .frame(width: 36, height: 36)
                        .background(Color.white.opacity(0.1))
                        .cornerRadius(8)
                }
                .disabled(!hasPrevious)
            }

            // File info (centered)
            VStack(spacing: 2) {
                Text(currentDocument.name)
                    .font(AppTypography.bodyMedium)
                    .foregroundColor(.white)
                    .lineLimit(1)

                HStack(spacing: AppSpacing.xs) {
                    Text(fileType.label)
                        .font(AppTypography.caption)
                        .foregroundColor(.white.opacity(0.6))

                    if allDocuments.count > 1 {
                        Text("•")
                            .foregroundColor(.white.opacity(0.4))
                        Text("\(currentIndex + 1) of \(allDocuments.count)")
                            .font(AppTypography.caption)
                            .foregroundColor(.white.opacity(0.6))
                    }
                }
            }
            .frame(maxWidth: .infinity)

            // Next button (only show if multiple documents)
            if allDocuments.count > 1 {
                Button(action: { navigateToNext() }) {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(hasNext ? .white : .white.opacity(0.3))
                        .frame(width: 36, height: 36)
                        .background(Color.white.opacity(0.1))
                        .cornerRadius(8)
                }
                .disabled(!hasNext)
            }

            // Share button
            Button(action: { showingShareSheet = true }) {
                Image(systemName: "square.and.arrow.up")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.white)
                    .frame(width: 36, height: 36)
                    .background(Color.white.opacity(0.1))
                    .cornerRadius(8)
            }
            .disabled(signedURL == nil)
        }
        .padding(.horizontal, AppSpacing.md)
        .padding(.vertical, AppSpacing.sm)
        .background(Color.black.opacity(0.8))
    }

    // MARK: - Navigation

    private func navigateToPrevious() {
        guard hasPrevious else { return }
        currentIndex -= 1
        currentDocument = allDocuments[currentIndex]
        signedURL = nil
        loadError = nil
        isLoading = true
    }

    private func navigateToNext() {
        guard hasNext else { return }
        currentIndex += 1
        currentDocument = allDocuments[currentIndex]
        signedURL = nil
        loadError = nil
        isLoading = true
    }

    // MARK: - Content Views

    private var loadingView: some View {
        VStack(spacing: AppSpacing.md) {
            ProgressView()
                .scaleEffect(1.5)
                .tint(.white)
            Text("Loading document...")
                .font(AppTypography.secondary)
                .foregroundColor(.white.opacity(0.7))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: AppSpacing.lg) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 50))
                .foregroundColor(AppColors.warning)

            Text("Could not load document")
                .font(AppTypography.heading3)
                .foregroundColor(.white)

            Text(message)
                .font(AppTypography.secondary)
                .foregroundColor(.white.opacity(0.7))
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Button("Try Again") {
                loadError = nil
                isLoading = true
                Task { await loadDocument() }
            }
            .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    @ViewBuilder
    private func contentView(url: URL) -> some View {
        switch fileType {
        case .pdf:
            PDFDocumentViewer(url: url)

        case .image:
            ImageDocumentViewer(url: url)

        case .video:
            VideoDocumentPlayer(url: url)

        case .unsupported:
            UnsupportedFileView(document: currentDocument, signedURL: url)
        }
    }

    // MARK: - Helpers

    private var fileType: ViewableFileType {
        FileTypeDetector.detect(from: currentDocument.name)
    }

    private func formattedFileSize(_ bytes: Int64) -> String {
        let formatter = ByteCountFormatter()
        formatter.allowedUnits = [.useKB, .useMB, .useGB]
        formatter.countStyle = .file
        return formatter.string(fromByteCount: bytes)
    }

    private func loadDocument() async {
        isLoading = true
        defer { isLoading = false }

        do {
            // Get signed URL from cache manager
            let url = try await cacheManager.getSignedURL(for: currentDocument.id)
            await MainActor.run {
                self.signedURL = url
            }
        } catch {
            await MainActor.run {
                self.loadError = error.localizedDescription
            }
        }
    }
}

// MARK: - Preview

#Preview {
    DocumentViewerView(
        document: Document(
            id: "test-123",
            projectId: nil,
            userId: nil,
            name: "Sample_Document.pdf",
            description: nil,
            category: .other,
            fileUrl: "",
            thumbnailUrl: nil,
            fileType: "pdf",
            fileSize: 2_500_000,
            uploadedBy: "John Doe",
            uploadedAt: Date(),
            expiresAt: nil,
            tags: [],
            blasterAssignments: nil,
            storagePath: "",
            createdAt: Date(),
            updatedAt: Date()
        )
    )
}
