//
//  PDFDocumentViewer.swift
//  ConstructionManager
//
//  Simple PDF viewer with zoom and pan (no annotations)
//

import SwiftUI
import PDFKit

/// Simple PDF viewer using PDFKit - view only, no annotations
struct PDFDocumentViewer: View {
    let url: URL
    @State private var pdfDocument: PDFDocument?
    @State private var isLoading = true
    @State private var loadError: String?

    var body: some View {
        ZStack {
            if isLoading {
                loadingView
            } else if let error = loadError {
                errorView(error)
            } else if let document = pdfDocument {
                SimplePDFView(document: document)
            } else {
                errorView("Unable to load PDF")
            }
        }
        .task {
            await loadPDF()
        }
    }

    private var loadingView: some View {
        VStack(spacing: AppSpacing.md) {
            ProgressView()
                .scaleEffect(1.5)
            Text("Loading PDF...")
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.gray.opacity(0.1))
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: AppSpacing.lg) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 50))
                .foregroundColor(AppColors.warning)

            Text("Could not load PDF")
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)

            Text(message)
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Button("Try Again") {
                loadError = nil
                isLoading = true
                Task { await loadPDF() }
            }
            .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.gray.opacity(0.1))
    }

    private func loadPDF() async {
        isLoading = true
        defer { isLoading = false }

        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            if let document = PDFDocument(data: data) {
                await MainActor.run {
                    self.pdfDocument = document
                }
            } else {
                loadError = "Invalid PDF file"
            }
        } catch {
            loadError = error.localizedDescription
        }
    }
}

// MARK: - Simple PDF View (UIKit wrapper)

/// UIViewRepresentable wrapper for PDFView - simple view-only mode
struct SimplePDFView: UIViewRepresentable {
    let document: PDFDocument

    func makeUIView(context: Context) -> PDFView {
        let pdfView = PDFView()
        pdfView.document = document
        pdfView.autoScales = true
        pdfView.displayMode = .singlePageContinuous
        pdfView.displayDirection = .vertical
        pdfView.backgroundColor = UIColor.systemGray6

        // Enable zoom and pan
        pdfView.minScaleFactor = pdfView.scaleFactorForSizeToFit * 0.5
        pdfView.maxScaleFactor = 5.0

        return pdfView
    }

    func updateUIView(_ pdfView: PDFView, context: Context) {
        if pdfView.document !== document {
            pdfView.document = document
            pdfView.scaleFactor = pdfView.scaleFactorForSizeToFit
        }
    }
}

// MARK: - Preview

#Preview {
    PDFDocumentViewer(url: URL(string: "https://example.com/sample.pdf")!)
}
