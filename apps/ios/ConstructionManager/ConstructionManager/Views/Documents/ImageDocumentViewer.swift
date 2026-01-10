//
//  ImageDocumentViewer.swift
//  ConstructionManager
//
//  Zoomable image viewer for document viewing
//

import SwiftUI
import UIKit

/// Zoomable image viewer with pan support
struct ImageDocumentViewer: View {
    let url: URL
    @State private var image: UIImage?
    @State private var isLoading = true
    @State private var loadError: String?

    // Zoom state
    @State private var scale: CGFloat = 1.0
    @State private var lastScale: CGFloat = 1.0
    @State private var offset: CGSize = .zero
    @State private var lastOffset: CGSize = .zero

    private let minScale: CGFloat = 1.0
    private let maxScale: CGFloat = 5.0

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                if isLoading {
                    loadingView
                } else if let error = loadError {
                    errorView(error)
                } else if let loadedImage = image {
                    imageView(loadedImage, in: geometry)
                } else {
                    errorView("Unable to load image")
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(Color.black.opacity(0.05))
        .task {
            await loadImage()
        }
    }

    private var loadingView: some View {
        VStack(spacing: AppSpacing.md) {
            ProgressView()
                .scaleEffect(1.5)
            Text("Loading image...")
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)
        }
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: AppSpacing.lg) {
            Image(systemName: "photo.badge.exclamationmark")
                .font(.system(size: 50))
                .foregroundColor(AppColors.warning)

            Text("Could not load image")
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
                Task { await loadImage() }
            }
            .buttonStyle(.borderedProminent)
        }
    }

    private func imageView(_ uiImage: UIImage, in geometry: GeometryProxy) -> some View {
        Image(uiImage: uiImage)
            .resizable()
            .aspectRatio(contentMode: .fit)
            .scaleEffect(scale)
            .offset(offset)
            .gesture(
                MagnificationGesture()
                    .onChanged { value in
                        let delta = value / lastScale
                        lastScale = value
                        scale = min(max(scale * delta, minScale), maxScale)
                    }
                    .onEnded { _ in
                        lastScale = 1.0
                        // Reset offset if zoomed out to minimum
                        if scale <= minScale {
                            withAnimation(.spring()) {
                                offset = .zero
                                lastOffset = .zero
                            }
                        }
                    }
            )
            .simultaneousGesture(
                DragGesture()
                    .onChanged { value in
                        if scale > minScale {
                            offset = CGSize(
                                width: lastOffset.width + value.translation.width,
                                height: lastOffset.height + value.translation.height
                            )
                        }
                    }
                    .onEnded { _ in
                        lastOffset = offset
                    }
            )
            .onTapGesture(count: 2) {
                // Double tap to reset zoom
                withAnimation(.spring()) {
                    scale = 1.0
                    offset = .zero
                    lastOffset = .zero
                }
            }
    }

    private func loadImage() async {
        isLoading = true
        defer { isLoading = false }

        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            if let uiImage = UIImage(data: data) {
                await MainActor.run {
                    self.image = uiImage
                }
            } else {
                loadError = "Invalid image file"
            }
        } catch {
            loadError = error.localizedDescription
        }
    }
}

// MARK: - Preview

#Preview {
    ImageDocumentViewer(url: URL(string: "https://example.com/sample.jpg")!)
}
