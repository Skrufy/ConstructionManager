//
//  ConstructionManagerApp.swift
//  ConstructionManager
//
//  Created by Steven Taylor on 12/23/25.
//

import SwiftUI

@main
struct ConstructionManagerApp: App {
    @StateObject private var appState = AppState()
    @StateObject private var deepLinkManager = DeepLinkManager.shared
    @Environment(\.scenePhase) private var scenePhase

    init() {
        // Migrate tokens from UserDefaults to Keychain (one-time operation for existing users)
        KeychainHelper.shared.migrateFromUserDefaults()

        // Initialize LocalizationManager early to load saved language preference
        // This ensures the correct language is set before views render
        _ = LocalizationManager.shared
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(appState)
                .environmentObject(deepLinkManager)
                .preferredColorScheme(appState.isDarkMode ? .dark : .light)
                .onOpenURL { url in
                    // Handle deep links (duggin://document/123)
                    deepLinkManager.handleURL(url)
                }
                .onChange(of: scenePhase) { oldPhase, newPhase in
                    if newPhase == .active && oldPhase != .active {
                        // App came to foreground - validate session
                        Task {
                            await appState.onAppBecomeActive()
                        }
                    }
                }
        }
    }
}

// MARK: - Root View (handles auth state)
struct RootView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        Group {
            switch appState.authState {
            case .unknown:
                // Loading state
                ZStack {
                    AppColors.primary600.ignoresSafeArea()
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .scaleEffect(1.5)
                }

            case .signedOut:
                SignInView()

            case .signedIn:
                MainTabView()
            }
        }
        .animation(.easeInOut, value: appState.authState)
    }
}
