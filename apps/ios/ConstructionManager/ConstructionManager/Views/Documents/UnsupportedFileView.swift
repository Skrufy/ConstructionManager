//
//  UnsupportedFileView.swift
//  ConstructionManager
//
//  View for unsupported file types with share sheet functionality
//

import SwiftUI
import UIKit

/// View for unsupported file types - shows file info and share button
struct UnsupportedFileView: View {
    let document: Document
    let signedURL: URL?
    @State private var showingShareSheet = false
    @State private var isPreparingShare = false
    @State private var shareError: String?

    var body: some View {
        VStack(spacing: AppSpacing.xl) {
            // File icon
            VStack(spacing: AppSpacing.md) {
                Image(systemName: fileIcon)
                    .font(.system(size: 80))
                    .foregroundColor(AppColors.primary500.opacity(0.6))

                Text(document.name)
                    .font(AppTypography.heading3)
                    .foregroundColor(AppColors.textPrimary)
                    .multilineTextAlignment(.center)
                    .lineLimit(3)
                    .padding(.horizontal)
            }

            // File info
            VStack(spacing: AppSpacing.sm) {
                Text(fileTypeLabel)
                    .font(AppTypography.secondary)
                    .foregroundColor(AppColors.textSecondary)

                if let fileSize = document.fileSize, fileSize > 0 {
                    Text(formattedFileSize)
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textTertiary)
                }
            }

            // Message
            Text("This file type cannot be previewed in the app.")
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, AppSpacing.xl)

            // Share button
            if isPreparingShare {
                ProgressView()
                    .scaleEffect(1.2)
            } else {
                Button(action: { prepareAndShare() }) {
                    HStack(spacing: AppSpacing.sm) {
                        Image(systemName: "square.and.arrow.up")
                            .font(.system(size: 18, weight: .semibold))
                        Text("Open in Another App")
                            .font(AppTypography.buttonLarge)
                    }
                    .foregroundColor(.white)
                    .frame(minWidth: 200)
                    .padding(.horizontal, AppSpacing.xl)
                    .padding(.vertical, AppSpacing.md)
                    .background(AppColors.primary500)
                    .cornerRadius(AppSpacing.radiusLarge)
                }
                .disabled(signedURL == nil)
            }

            // Error message
            if let error = shareError {
                Text(error)
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.error)
                    .padding(.horizontal)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.gray.opacity(0.05))
        .sheet(isPresented: $showingShareSheet) {
            if let url = signedURL {
                ShareSheet(items: [url])
            }
        }
    }

    private var fileIcon: String {
        let ext = FileTypeDetector.getExtension(from: document.name).lowercased()
        switch ext {
        case "doc", "docx": return "doc.fill"
        case "xls", "xlsx": return "tablecells.fill"
        case "ppt", "pptx": return "rectangle.on.rectangle.angled"
        case "txt": return "doc.text.fill"
        case "zip", "rar", "7z": return "doc.zipper"
        case "dwg", "dxf": return "cube.fill"
        default: return "doc.fill"
        }
    }

    private var fileTypeLabel: String {
        let ext = FileTypeDetector.getExtension(from: document.name).lowercased()
        switch ext {
        case "doc", "docx": return "Microsoft Word Document"
        case "xls", "xlsx": return "Microsoft Excel Spreadsheet"
        case "ppt", "pptx": return "Microsoft PowerPoint"
        case "txt": return "Text File"
        case "zip": return "ZIP Archive"
        case "rar": return "RAR Archive"
        case "7z": return "7-Zip Archive"
        case "dwg": return "AutoCAD Drawing"
        case "dxf": return "DXF Drawing"
        default: return ext.uppercased() + " File"
        }
    }

    private var formattedFileSize: String {
        guard let fileSize = document.fileSize else { return "Unknown" }
        let formatter = ByteCountFormatter()
        formatter.allowedUnits = [.useKB, .useMB, .useGB]
        formatter.countStyle = .file
        return formatter.string(fromByteCount: fileSize)
    }

    private func prepareAndShare() {
        guard signedURL != nil else {
            shareError = "Unable to share file"
            return
        }
        shareError = nil
        showingShareSheet = true
    }
}

// MARK: - Preview

#Preview {
    UnsupportedFileView(
        document: Document(
            id: "test-123",
            projectId: nil,
            userId: nil,
            name: "Construction_Plans.dwg",
            description: nil,
            category: .other,
            fileUrl: "",
            thumbnailUrl: nil,
            fileType: "dwg",
            fileSize: 15_000_000,
            uploadedBy: "John Doe",
            uploadedAt: Date(),
            expiresAt: nil,
            tags: [],
            blasterAssignments: nil,
            storagePath: "",
            createdAt: Date(),
            updatedAt: Date()
        ),
        signedURL: URL(string: "https://example.com/file.dwg")
    )
}
