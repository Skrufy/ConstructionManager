//
//  VideoDocumentPlayer.swift
//  ConstructionManager
//
//  Video player for document viewing using AVKit
//

import SwiftUI
import AVKit

/// Video player view using AVKit
struct VideoDocumentPlayer: View {
    let url: URL
    @State private var player: AVPlayer?
    @State private var isLoading = true
    @State private var loadError: String?

    var body: some View {
        ZStack {
            if isLoading {
                loadingView
            } else if let error = loadError {
                errorView(error)
            } else if let avPlayer = player {
                VideoPlayer(player: avPlayer)
                    .onAppear {
                        // Start playing when view appears
                        avPlayer.play()
                    }
                    .onDisappear {
                        // Pause when view disappears
                        avPlayer.pause()
                    }
            } else {
                errorView("Unable to load video")
            }
        }
        .background(Color.black)
        .task {
            await loadVideo()
        }
    }

    private var loadingView: some View {
        VStack(spacing: AppSpacing.md) {
            ProgressView()
                .scaleEffect(1.5)
                .tint(.white)
            Text("Loading video...")
                .font(AppTypography.secondary)
                .foregroundColor(.white.opacity(0.8))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black)
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: AppSpacing.lg) {
            Image(systemName: "play.slash")
                .font(.system(size: 50))
                .foregroundColor(AppColors.warning)

            Text("Could not load video")
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
                Task { await loadVideo() }
            }
            .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black)
    }

    private func loadVideo() async {
        isLoading = true

        // Create player with the URL
        let avPlayer = AVPlayer(url: url)

        // Wait for the player item to be ready
        do {
            // Check if the asset is playable
            let asset = AVAsset(url: url)
            let isPlayable = try await asset.load(.isPlayable)

            if isPlayable {
                await MainActor.run {
                    self.player = avPlayer
                    self.isLoading = false
                }
            } else {
                await MainActor.run {
                    self.loadError = "Video format not supported"
                    self.isLoading = false
                }
            }
        } catch {
            await MainActor.run {
                self.loadError = error.localizedDescription
                self.isLoading = false
            }
        }
    }
}

// MARK: - Preview

#Preview {
    VideoDocumentPlayer(url: URL(string: "https://example.com/sample.mp4")!)
}
