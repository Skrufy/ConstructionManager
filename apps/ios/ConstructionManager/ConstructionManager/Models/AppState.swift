//
//  AppState.swift
//  ConstructionManager
//
//  Global app state including authentication and module settings
//

import Foundation
import SwiftUI
import Combine
import LocalAuthentication

// MARK: - Settings API Response
struct SettingsResponse: Codable {
    let company: CompanySettingsAPI?
    let user: UserPreferencesAPI?
}

struct CompanySettingsAPI: Codable {
    let id: String?
    let companyName: String?
    let moduleProjects: Bool?
    let moduleDailyLogs: Bool?
    let moduleTimeTracking: Bool?
    let moduleTasks: Bool?
    let moduleScheduling: Bool?
    let moduleEquipment: Bool?
    let moduleDocuments: Bool?
    let moduleDrawings: Bool?
    let moduleSafety: Bool?
    let moduleFinancials: Bool?
    let moduleReports: Bool?
    let moduleAnalytics: Bool?
    let moduleSubcontractors: Bool?
    let moduleCertifications: Bool?
    let moduleDroneDeploy: Bool?
    let moduleApprovals: Bool?
    let moduleWarnings: Bool?
    let moduleClients: Bool?
    let moduleMaterials: Bool?
    let hideBuildingInfo: Bool?

    // No CodingKeys needed - API returns camelCase which matches Swift property names
}

struct UserPreferencesAPI: Codable {
    let id: String?
    let userId: String?
    let theme: String?
    let sidebarCollapsed: Bool?
}

// MARK: - Module Settings
struct ModuleSettings: Codable {
    // Enabled flags - synced with web/company settings
    var projectsEnabled: Bool = true       // Core module - always on
    var timeTrackingEnabled: Bool = false  // Disabled by default - enabled per company
    var dailyLogsEnabled: Bool = true
    var tasksEnabled: Bool = true          // Tasks and RFIs
    var schedulingEnabled: Bool = true     // Crew scheduling
    var drawingsEnabled: Bool = true
    var documentsEnabled: Bool = true
    var equipmentEnabled: Bool = false     // Disabled by default
    var safetyEnabled: Bool = false        // Disabled by default - includes punch lists & meetings
    var financialsEnabled: Bool = false    // Often restricted
    var reportsEnabled: Bool = true        // Reports and exports
    var analyticsEnabled: Bool = false     // Advanced analytics
    var subcontractorsEnabled: Bool = false // Subcontractor management
    var certificationsEnabled: Bool = false // Certifications and licenses
    var approvalsEnabled: Bool = false     // Not all companies use this
    var warningsEnabled: Bool = false      // Disabled by default
    var droneDeployEnabled: Bool = false   // Integration feature
    var clientsEnabled: Bool = true        // Client management
    var materialsEnabled: Bool = false     // Materials tracking - disabled by default

    static let `default` = ModuleSettings()
}

// MARK: - Mobile Module Visibility
/// Controls which modules are visible on mobile (separate from enabled)
/// This allows users to hide modules on mobile while keeping them enabled on web
/// Syncs to database via /users/me/preferences API, with UserDefaults as offline fallback
struct MobileModuleVisibility: Codable {
    var projectsVisible: Bool = true
    var timeTrackingVisible: Bool = true
    var dailyLogsVisible: Bool = true
    var tasksVisible: Bool = false        // Off by default - not commonly used on mobile
    var schedulingVisible: Bool = false   // Off by default - not commonly used on mobile
    var drawingsVisible: Bool = true
    var documentsVisible: Bool = true
    var equipmentVisible: Bool = true
    var safetyVisible: Bool = true
    var financialsVisible: Bool = true
    var reportsVisible: Bool = false      // Off by default - not commonly used on mobile
    var analyticsVisible: Bool = true
    var subcontractorsVisible: Bool = true
    var certificationsVisible: Bool = true
    var approvalsVisible: Bool = true
    var warningsVisible: Bool = true
    var droneDeployVisible: Bool = true
    var clientsVisible: Bool = false      // Off by default - not commonly used on mobile
    var materialsVisible: Bool = true

    static let `default` = MobileModuleVisibility()

    // Persistence key for offline fallback (includes user ID for multi-user support)
    private static let userDefaultsKeyPrefix = "mobileModuleVisibility_"

    /// Get the current user's UserDefaults key
    private static func userDefaultsKey(for userId: String?) -> String {
        if let userId = userId {
            return "\(userDefaultsKeyPrefix)\(userId)"
        }
        return "\(userDefaultsKeyPrefix)default"
    }

    /// Save to UserDefaults for a specific user (device-local fallback for offline use)
    func saveToLocal(userId: String? = nil) {
        let key = Self.userDefaultsKey(for: userId)
        if let encoded = try? JSONEncoder().encode(self) {
            UserDefaults.standard.set(encoded, forKey: key)
            print("[MobileModuleVisibility] Saved to local storage for key: \(key)")
        }
    }

    /// Load from UserDefaults for a specific user (offline fallback)
    static func loadFromLocal(userId: String? = nil) -> MobileModuleVisibility {
        let key = userDefaultsKey(for: userId)
        guard let data = UserDefaults.standard.data(forKey: key),
              let visibility = try? JSONDecoder().decode(MobileModuleVisibility.self, from: data) else {
            print("[MobileModuleVisibility] No local data for key: \(key), using defaults")
            return .default
        }
        print("[MobileModuleVisibility] Loaded from local storage for key: \(key)")
        return visibility
    }

    /// Clear local storage for a specific user (called on sign out)
    static func clearLocal(userId: String? = nil) {
        let key = userDefaultsKey(for: userId)
        UserDefaults.standard.removeObject(forKey: key)
        print("[MobileModuleVisibility] Cleared local storage for key: \(key)")
    }

    /// Save to both local storage and API
    func save(userId: String? = nil) {
        // Always save locally for offline fallback
        saveToLocal(userId: userId)
    }
}

// MARK: - Module Type Enum (for visibility helpers)
enum ModuleType: String, CaseIterable, Identifiable {
    case projects
    case timeTracking
    case dailyLogs
    case tasks
    case scheduling
    case drawings
    case documents
    case equipment
    case safety
    case financials
    case reports
    case analytics
    case subcontractors
    case certifications
    case approvals
    case warnings
    case droneDeploy
    case clients
    case materials

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .projects: return "Projects"
        case .timeTracking: return "Time Tracking"
        case .dailyLogs: return "Daily Logs"
        case .tasks: return "Tasks & RFIs"
        case .scheduling: return "Scheduling"
        case .drawings: return "Drawings"
        case .documents: return "Documents"
        case .equipment: return "Equipment"
        case .safety: return "Safety & Quality"
        case .financials: return "Financials"
        case .reports: return "Reports"
        case .analytics: return "Analytics"
        case .subcontractors: return "Subcontractors"
        case .certifications: return "Certifications"
        case .approvals: return "Approvals"
        case .warnings: return "Warnings"
        case .droneDeploy: return "DroneDeploy"
        case .clients: return "Clients"
        case .materials: return "Materials"
        }
    }

    var icon: String {
        switch self {
        case .projects: return "folder.fill"
        case .timeTracking: return "clock.fill"
        case .dailyLogs: return "doc.text.fill"
        case .tasks: return "checklist"
        case .scheduling: return "calendar"
        case .drawings: return "doc.richtext"
        case .documents: return "doc.fill"
        case .equipment: return "wrench.and.screwdriver.fill"
        case .safety: return "shield.checkered"
        case .financials: return "dollarsign.circle.fill"
        case .reports: return "chart.bar.doc.horizontal"
        case .analytics: return "chart.xyaxis.line"
        case .subcontractors: return "person.2.badge.gearshape"
        case .certifications: return "checkmark.seal.fill"
        case .approvals: return "checkmark.circle.fill"
        case .warnings: return "exclamationmark.triangle.fill"
        case .droneDeploy: return "airplane"
        case .clients: return "building.2.fill"
        case .materials: return "shippingbox.fill"
        }
    }

    var description: String {
        switch self {
        case .projects: return "View and manage construction projects"
        case .timeTracking: return "Clock in/out and track work hours"
        case .dailyLogs: return "Daily progress reports and notes"
        case .tasks: return "Task management and RFIs"
        case .scheduling: return "Crew scheduling and calendar"
        case .drawings: return "Construction drawings and blueprints"
        case .documents: return "Project documents and files"
        case .equipment: return "Equipment tracking and maintenance"
        case .safety: return "Safety incidents, inspections, and punch lists"
        case .financials: return "Budgets, invoices, and expenses"
        case .reports: return "Generate and export reports"
        case .analytics: return "Advanced analytics and dashboards"
        case .subcontractors: return "Subcontractor directory and management"
        case .certifications: return "Licenses and certification tracking"
        case .approvals: return "Approval workflows and queues"
        case .warnings: return "Employee warnings and discipline"
        case .droneDeploy: return "Drone and aerial mapping integration"
        case .clients: return "Client management and contacts"
        case .materials: return "Materials tracking and inventory"
        }
    }
}

// MARK: - Auth State
enum AuthState {
    case unknown
    case signedOut
    case signedIn
}

// MARK: - Navigation Destination (for programmatic navigation from Dashboard to sidebar items)
enum NavigationDestination: String, Hashable {
    case projects
    case documents
    case drawings
    case dailyLogs
    case timeTracking
}

// MARK: - App State
@MainActor
class AppState: ObservableObject {
    // MARK: - Authentication
    @Published var authState: AuthState = .unknown
    @Published var currentUser: User? {
        didSet {
            // Sync language preference when user is loaded
            if let language = currentUser?.language {
                LocalizationManager.shared.syncFromAPI(language: language)
                print("[AppState] 🌐 Synced language from user profile: \(language)")
            }
        }
    }
    @Published var isLoading = false
    @Published var authError: String?

    // MARK: - Navigation
    @Published var requestedNavigation: NavigationDestination?

    // MARK: - Module Settings
    @Published var moduleSettings: ModuleSettings = .default
    @Published var hideBuildingInfo: Bool = false

    // MARK: - Mobile Module Visibility (device-local preference)
    /// Flag to prevent didSet from saving during initialization
    private var isInitializing = true
    /// Flag to prevent didSet from saving during API sync operations
    /// When true, setting mobileModuleVisibility will NOT trigger local save
    private var isSyncingFromAPI = false
    @Published var mobileModuleVisibility: MobileModuleVisibility = .default {
        didSet {
            // Don't save during initialization - wait until user is authenticated
            guard !isInitializing, currentUser != nil else {
                print("[AppState] Skipping local save - initializing: \(isInitializing), hasUser: \(currentUser != nil)")
                return
            }
            // Don't save when syncing from API - only save on explicit user changes
            guard !isSyncingFromAPI else {
                print("[AppState] Skipping local save - syncing from API (read-only)")
                return
            }
            // Save to local storage with user ID for per-user isolation
            // This only triggers on user-initiated changes (e.g., toggling in settings)
            mobileModuleVisibility.save(userId: currentUser?.id)
            print("[AppState] didSet saved mobileModuleVisibility to local storage (user change)")
        }
    }

    // MARK: - Module Visibility Helpers
    /// Returns true if a module should be shown on mobile (enabled AND visible)
    func shouldShowModule(_ module: ModuleType) -> Bool {
        switch module {
        case .projects:
            return moduleSettings.projectsEnabled && mobileModuleVisibility.projectsVisible
        case .timeTracking:
            return moduleSettings.timeTrackingEnabled && mobileModuleVisibility.timeTrackingVisible
        case .dailyLogs:
            return moduleSettings.dailyLogsEnabled && mobileModuleVisibility.dailyLogsVisible
        case .tasks:
            return moduleSettings.tasksEnabled && mobileModuleVisibility.tasksVisible
        case .scheduling:
            return moduleSettings.schedulingEnabled && mobileModuleVisibility.schedulingVisible
        case .drawings:
            return moduleSettings.drawingsEnabled && mobileModuleVisibility.drawingsVisible
        case .documents:
            return moduleSettings.documentsEnabled && mobileModuleVisibility.documentsVisible
        case .equipment:
            return moduleSettings.equipmentEnabled && mobileModuleVisibility.equipmentVisible
        case .safety:
            return moduleSettings.safetyEnabled && mobileModuleVisibility.safetyVisible
        case .financials:
            return moduleSettings.financialsEnabled && mobileModuleVisibility.financialsVisible
        case .reports:
            return moduleSettings.reportsEnabled && mobileModuleVisibility.reportsVisible
        case .analytics:
            // Analytics is combined with Reports - use same flag
            return moduleSettings.reportsEnabled && mobileModuleVisibility.reportsVisible
        case .subcontractors:
            return moduleSettings.subcontractorsEnabled && mobileModuleVisibility.subcontractorsVisible
        case .certifications:
            return moduleSettings.certificationsEnabled && mobileModuleVisibility.certificationsVisible
        case .approvals:
            return moduleSettings.approvalsEnabled && mobileModuleVisibility.approvalsVisible
        case .warnings:
            return moduleSettings.warningsEnabled && mobileModuleVisibility.warningsVisible
        case .droneDeploy:
            return moduleSettings.droneDeployEnabled && mobileModuleVisibility.droneDeployVisible
        case .clients:
            return moduleSettings.clientsEnabled && mobileModuleVisibility.clientsVisible
        case .materials:
            return moduleSettings.materialsEnabled && mobileModuleVisibility.materialsVisible
        }
    }

    /// Returns true if a module is enabled at the company level (regardless of visibility)
    func isModuleEnabled(_ module: ModuleType) -> Bool {
        switch module {
        case .projects: return moduleSettings.projectsEnabled
        case .timeTracking: return moduleSettings.timeTrackingEnabled
        case .dailyLogs: return moduleSettings.dailyLogsEnabled
        case .tasks: return moduleSettings.tasksEnabled
        case .scheduling: return moduleSettings.schedulingEnabled
        case .drawings: return moduleSettings.drawingsEnabled
        case .documents: return moduleSettings.documentsEnabled
        case .equipment: return moduleSettings.equipmentEnabled
        case .safety: return moduleSettings.safetyEnabled
        case .financials: return moduleSettings.financialsEnabled
        case .reports: return moduleSettings.reportsEnabled
        case .analytics: return moduleSettings.analyticsEnabled
        case .subcontractors: return moduleSettings.subcontractorsEnabled
        case .certifications: return moduleSettings.certificationsEnabled
        case .approvals: return moduleSettings.approvalsEnabled
        case .warnings: return moduleSettings.warningsEnabled
        case .droneDeploy: return moduleSettings.droneDeployEnabled
        case .clients: return moduleSettings.clientsEnabled
        case .materials: return moduleSettings.materialsEnabled
        }
    }

    /// Get/set mobile visibility for a module
    func isMobileVisible(_ module: ModuleType) -> Bool {
        switch module {
        case .projects: return mobileModuleVisibility.projectsVisible
        case .timeTracking: return mobileModuleVisibility.timeTrackingVisible
        case .dailyLogs: return mobileModuleVisibility.dailyLogsVisible
        case .tasks: return mobileModuleVisibility.tasksVisible
        case .scheduling: return mobileModuleVisibility.schedulingVisible
        case .drawings: return mobileModuleVisibility.drawingsVisible
        case .documents: return mobileModuleVisibility.documentsVisible
        case .equipment: return mobileModuleVisibility.equipmentVisible
        case .safety: return mobileModuleVisibility.safetyVisible
        case .financials: return mobileModuleVisibility.financialsVisible
        case .reports: return mobileModuleVisibility.reportsVisible
        case .analytics: return mobileModuleVisibility.analyticsVisible
        case .subcontractors: return mobileModuleVisibility.subcontractorsVisible
        case .certifications: return mobileModuleVisibility.certificationsVisible
        case .approvals: return mobileModuleVisibility.approvalsVisible
        case .warnings: return mobileModuleVisibility.warningsVisible
        case .droneDeploy: return mobileModuleVisibility.droneDeployVisible
        case .clients: return mobileModuleVisibility.clientsVisible
        case .materials: return mobileModuleVisibility.materialsVisible
        }
    }

    func setMobileVisibility(_ module: ModuleType, visible: Bool) {
        print("[AppState] 🔀 setMobileVisibility: \(module.rawValue) → \(visible)")
        switch module {
        case .projects: mobileModuleVisibility.projectsVisible = visible
        case .timeTracking: mobileModuleVisibility.timeTrackingVisible = visible
        case .dailyLogs: mobileModuleVisibility.dailyLogsVisible = visible
        case .tasks: mobileModuleVisibility.tasksVisible = visible
        case .scheduling: mobileModuleVisibility.schedulingVisible = visible
        case .drawings: mobileModuleVisibility.drawingsVisible = visible
        case .documents: mobileModuleVisibility.documentsVisible = visible
        case .equipment: mobileModuleVisibility.equipmentVisible = visible
        case .safety: mobileModuleVisibility.safetyVisible = visible
        case .financials: mobileModuleVisibility.financialsVisible = visible
        case .reports: mobileModuleVisibility.reportsVisible = visible
        case .analytics: mobileModuleVisibility.analyticsVisible = visible
        case .subcontractors: mobileModuleVisibility.subcontractorsVisible = visible
        case .certifications: mobileModuleVisibility.certificationsVisible = visible
        case .approvals: mobileModuleVisibility.approvalsVisible = visible
        case .warnings: mobileModuleVisibility.warningsVisible = visible
        case .droneDeploy: mobileModuleVisibility.droneDeployVisible = visible
        case .clients: mobileModuleVisibility.clientsVisible = visible
        case .materials: mobileModuleVisibility.materialsVisible = visible
        }
        print("[AppState] 🔀 Current state - safety:\(mobileModuleVisibility.safetyVisible) reports:\(mobileModuleVisibility.reportsVisible) projects:\(mobileModuleVisibility.projectsVisible)")
    }

    /// Set mobile module visibility from API sync without triggering local save
    /// Use this when loading preferences from the server - avoids unnecessary saves
    /// The caller is responsible for saving to local storage if needed
    func setMobileVisibilityFromAPI(_ visibility: MobileModuleVisibility) {
        print("[AppState] 🔄 setMobileVisibilityFromAPI (no local save)")
        isSyncingFromAPI = true
        mobileModuleVisibility = visibility
        isSyncingFromAPI = false
    }

    // MARK: - Theme
    @Published var isDarkMode: Bool = false {
        didSet {
            UserDefaults.standard.set(isDarkMode, forKey: "isDarkMode")
        }
    }

    // MARK: - Development Mode
    // Set to false when ready to use real authentication
    @Published var skipAuth: Bool = false

    // Services
    private let authService = AuthService.shared
    private let apiClient = APIClient.shared

    // Notification observer for auth expiration
    private var authExpirationObserver: NSObjectProtocol?

    // MARK: - Biometrics
    var biometricsAvailable: Bool {
        let context = LAContext()
        var error: NSError?
        return context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
    }

    var biometricType: String {
        let context = LAContext()
        _ = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
        switch context.biometryType {
        case .faceID: return "Face ID"
        case .touchID: return "Touch ID"
        case .opticID: return "Optic ID"
        default: return "Biometrics"
        }
    }

    init() {
        // Load saved preferences
        isDarkMode = UserDefaults.standard.bool(forKey: "isDarkMode")

        // Note: Mobile module visibility starts with defaults
        // It will be loaded from API after successful authentication
        // We DON'T set mobileModuleVisibility here to avoid triggering didSet
        print("[AppState] init() - starting with default visibility")

        // Log API configuration for debugging
        apiClient.logConfiguration()

        // Listen for auth session expiration (401 errors)
        authExpirationObserver = NotificationCenter.default.addObserver(
            forName: .authSessionExpired,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                self?.handleSessionExpired()
            }
        }

        // Mark initialization as complete - now didSet can save to local storage
        isInitializing = false
        print("[AppState] init() complete - isInitializing set to false")

        // Check auth state
        if skipAuth {
            // Development mode - auto sign in with mock user
            authState = .signedIn
            currentUser = User.currentUser
        } else {
            checkAuthState()
        }

        // Load module settings (would come from API in production)
        loadModuleSettings()
    }

    deinit {
        if let observer = authExpirationObserver {
            NotificationCenter.default.removeObserver(observer)
        }
    }

    /// Handle session expiration - redirect user to login
    private func handleSessionExpired() {
        print("[AppState] Session expired, signing out user")
        authState = .signedOut
        currentUser = nil
        authError = "error.sessionExpired".localized

        // Clear any cached data
        OfflineDataStore.shared.clearAllData()
    }

    /// Called when app becomes active to refresh all data
    /// Uses request deduplication - safe to call multiple times
    func refreshOnAppLaunch() async {
        guard apiClient.hasValidToken() else {
            print("[AppState] refreshOnAppLaunch - no valid token, skipping")
            return
        }

        print("[AppState] 🔄 refreshOnAppLaunch starting...")

        // Reload user profile first (needed for permissions)
        await authService.loadCurrentUser()
        currentUser = authService.currentUser

        // Reload company settings (needed for module visibility)
        await fetchCompanySettings()

        // Fetch user preferences (theme, mobile visibility, etc.)
        // This is critical for ensuring settings sync on app launch
        await fetchUserPreferences()

        // Fetch projects - the service handles deduplication
        // so this won't make a duplicate request if called again soon
        await ProjectService.shared.fetchProjects()

        print("[AppState] ✅ refreshOnAppLaunch complete")

        // Note: Other data (drawings, documents, daily logs) are fetched
        // on-demand when their respective views appear, not at launch
        // This reduces initial network load significantly
    }

    // MARK: - Authentication Methods

    /// Check auth state on app startup
    /// This validates the token both locally (expiry) and remotely (API call)
    func checkAuthState() {
        // First check if we have a locally valid token (not expired)
        guard apiClient.hasValidToken() else {
            print("[AppState] No valid token found, setting state to signedOut")
            authState = .signedOut
            return
        }

        // Token exists and hasn't expired locally
        // Start with unknown state while we validate
        authState = .unknown

        // Validate the session by making an API call
        Task {
            await validateSession()
        }
    }

    /// Validate the current session by attempting to load the user profile
    /// This catches cases where the token is locally valid but server-side invalid
    func validateSession() async {
        guard apiClient.hasValidToken() else {
            authState = .signedOut
            return
        }

        print("[AppState] Validating session with server...")

        do {
            // Try to load user profile - this will fail with 401 if session is invalid
            let user: User = try await apiClient.get("/users/me")
            print("[AppState] Session valid, user: \(user.name)")
            authService.setCurrentUser(user)
            currentUser = user
            authState = .signedIn

            // Load module settings
            await fetchCompanySettings()

            // Sync user preferences from server (theme, mobile visibility, etc.)
            await fetchUserPreferences()
        } catch APIError.unauthorized {
            // Session is invalid - the 401 handler will already have posted notification
            print("[AppState] Session invalid (401)")
            // handleSessionExpired() will be called by the notification
        } catch APIError.networkError {
            // Network error - assume session is still valid if token isn't expired
            // The user can continue using the app offline
            print("[AppState] Network error during validation, assuming session valid")
            if apiClient.hasValidToken() {
                authState = .signedIn
                // Try to use cached user if available
                if let cachedUser = authService.currentUser {
                    currentUser = cachedUser
                }
            } else {
                authState = .signedOut
            }
        } catch {
            // Other errors - check token validity as fallback
            print("[AppState] Validation error: \(error), checking token validity")
            if apiClient.hasValidToken() {
                authState = .signedIn
                if let cachedUser = authService.currentUser {
                    currentUser = cachedUser
                }
            } else {
                authState = .signedOut
            }
        }
    }

    /// Called when app becomes active from background
    /// Revalidates the session to catch expired tokens
    func onAppBecomeActive() async {
        guard authState == .signedIn else { return }

        // Quick local check first - if token is expired, sign out immediately
        guard apiClient.hasValidToken() else {
            print("[AppState] Token expired while app was in background")
            handleSessionExpired()
            return
        }

        // Optionally validate with server (less aggressive, better UX)
        // Only do this if token will expire soon (within 5 minutes)
        if let expiry = apiClient.getTokenExpirationDate() {
            let fiveMinutesFromNow = Date().addingTimeInterval(5 * 60)
            if expiry < fiveMinutesFromNow {
                print("[AppState] Token expiring soon, attempting refresh")
                let refreshed = await authService.refreshToken()
                if !refreshed {
                    print("[AppState] Token refresh failed, signing out")
                    handleSessionExpired()
                }
            }
        }
    }

    /// Load user profile from API and update currentUser
    private func loadUserProfile() async {
        // First check if AuthService already has the user
        if let user = authService.currentUser {
            currentUser = user
            // Also update module settings after we have the user
            await fetchCompanySettings()
            return
        }

        // Load from API
        await authService.loadCurrentUser()
        if let user = authService.currentUser {
            currentUser = user
            // Also update module settings after we have the user
            await fetchCompanySettings()
        }
    }

    /// Sign in with email and password
    func signIn(email: String, password: String) async -> Bool {
        // In development mode, use mock login
        if skipAuth {
            authState = .signedIn
            currentUser = User.currentUser
            return true
        }

        isLoading = true
        authError = nil
        defer { isLoading = false }

        // Check server connectivity first (fast 5-second check)
        if let connectivityError = await apiClient.checkServerConnectivity() {
            print("[AppState] Server connectivity check failed: \(connectivityError)")
            authError = connectivityError
            return false
        }

        let success = await authService.login(email: email, password: password)

        if success {
            // Clear cached data from previous sessions to ensure fresh data
            OfflineDataStore.shared.clearAllData()

            // Get user from AuthService
            currentUser = authService.currentUser
            authState = .signedIn

            // Initialize other services after login
            await initializeServicesAfterLogin()

            // If user profile wasn't loaded, try one more time
            if currentUser == nil {
                await authService.loadCurrentUser()
                currentUser = authService.currentUser
            }

            return true
        } else {
            authError = authService.error ?? "Login failed"
            return false
        }
    }

    /// Sign in with biometrics (requires previous successful login)
    func signInWithBiometrics() async -> Bool {
        let context = LAContext()
        context.localizedCancelTitle = "Use Password"

        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: "Sign in to Duggin Construction"
            )

            if success {
                // Try to refresh the token
                let refreshed = await authService.refreshToken()
                if refreshed {
                    authState = .signedIn
                    await authService.loadCurrentUser()
                    currentUser = authService.currentUser
                    return true
                } else {
                    // Token refresh failed, need to sign in with password
                    authError = "error.sessionExpiredPassword".localized
                    return false
                }
            }
        } catch {
            print("Biometric auth failed: \(error)")
            authError = "error.biometricFailed".localized
        }

        return false
    }

    /// Sign out and clear all data
    func signOut() async {
        isLoading = true
        defer { isLoading = false }

        // Store user ID before clearing for cleanup
        let userId = currentUser?.id

        await authService.logout()

        authState = .signedOut
        currentUser = nil
        authError = nil

        // Reset mobile module visibility to defaults
        // (local cache is preserved for when user signs back in)
        mobileModuleVisibility = .default

        print("[AppState] User signed out, reset to default visibility")
    }

    /// Convenience sync method for views that don't use async
    func signOut() {
        Task {
            await signOut()
        }
    }

    // MARK: - Post-Login Initialization

    private func initializeServicesAfterLogin() async {
        // Fetch company settings from API first (required for module visibility)
        await fetchCompanySettings()

        // Fetch user preferences (theme, mobile visibility, etc.)
        await fetchUserPreferences()

        // Essential data - fetch sequentially to avoid overwhelming network
        await ProjectService.shared.fetchProjects(force: true)

        // Non-essential data - fetch these in background, don't block
        // They use request throttling so won't overwhelm the network
        Task.detached(priority: .utility) {
            await TimeTrackingManager.shared.fetchTimeEntries()
        }

        Task.detached(priority: .low) {
            await NotificationService.shared.fetchNotifications()
        }

        // Request push notification permission (doesn't block UI)
        Task.detached(priority: .low) {
            let granted = await NotificationService.shared.requestPushPermission()
            if granted {
                print("Push notifications enabled")
            }
        }
    }

    /// Fetch company settings from the API and update module settings
    private func fetchCompanySettings() async {
        do {
            let response: SettingsResponse = try await APIClient.shared.get("/settings")

            // Update module settings based on company settings
            if let company = response.company {
                // IMPORTANT: Default ALL modules to TRUE when API returns null
                // This ensures modules are enabled by default until an admin explicitly disables them
                moduleSettings = ModuleSettings(
                    projectsEnabled: company.moduleProjects ?? true,
                    timeTrackingEnabled: company.moduleTimeTracking ?? true,
                    dailyLogsEnabled: company.moduleDailyLogs ?? true,
                    tasksEnabled: company.moduleTasks ?? true,
                    schedulingEnabled: company.moduleScheduling ?? true,
                    drawingsEnabled: company.moduleDrawings ?? company.moduleDocuments ?? true,
                    documentsEnabled: company.moduleDocuments ?? true,
                    equipmentEnabled: company.moduleEquipment ?? true,
                    safetyEnabled: company.moduleSafety ?? true,
                    financialsEnabled: company.moduleFinancials ?? true,
                    reportsEnabled: company.moduleReports ?? true,
                    analyticsEnabled: company.moduleAnalytics ?? true,
                    subcontractorsEnabled: company.moduleSubcontractors ?? true,
                    certificationsEnabled: company.moduleCertifications ?? true,
                    approvalsEnabled: company.moduleApprovals ?? true,
                    warningsEnabled: company.moduleWarnings ?? true,
                    droneDeployEnabled: company.moduleDroneDeploy ?? true,
                    clientsEnabled: company.moduleClients ?? true,
                    materialsEnabled: company.moduleMaterials ?? true
                )
                hideBuildingInfo = company.hideBuildingInfo ?? false
                print("Loaded module settings from API")
            } else {
                print("No company settings in response, using role-based defaults")
                // Fallback to role-based defaults
                loadModuleSettingsForRole()
            }
        } catch {
            print("Failed to fetch company settings: \(error)")
            // Fallback to role-based defaults
            loadModuleSettingsForRole()
        }
    }

    /// Fetch user preferences from the API and update local state
    /// This syncs theme, module visibility, and notification preferences
    /// IMPORTANT: This should be called after user is authenticated and currentUser is set
    /// NOTE: This is a READ-ONLY operation - it does NOT save to API or trigger didSet saves
    func fetchUserPreferences() async {
        guard let userId = currentUser?.id else {
            print("[AppState] ❌ Cannot fetch preferences: no current user")
            return
        }

        print("[AppState] 🔄 Fetching user preferences for user: \(userId) (read-only refresh)")

        // Set flag to prevent didSet from saving during this sync operation
        isSyncingFromAPI = true
        defer { isSyncingFromAPI = false }

        do {
            struct PreferencesResponse: Decodable {
                let preferences: UserPreferencesData
            }

            struct UserPreferencesData: Decodable {
                let theme: String?
                let defaultView: String?
                let showCompletedTasks: Bool?
                let emailDailyDigest: Bool?
                let emailApprovals: Bool?
                let emailCertExpiry: Bool?
                let mobileModuleVisibility: MobileModuleVisibility?
            }

            let response: PreferencesResponse = try await APIClient.shared.get("/users/me/preferences")

            // Update theme
            if let theme = response.preferences.theme {
                isDarkMode = theme == "dark"
                print("[AppState] ✅ Theme from API: \(theme)")
            }

            // Sync mobile module visibility from server (READ-ONLY - no local save)
            if let visibility = response.preferences.mobileModuleVisibility {
                print("[AppState] ✅ Got mobileModuleVisibility from API (read-only refresh):")
                print("[AppState]    - projectsVisible: \(visibility.projectsVisible)")
                print("[AppState]    - tasksVisible: \(visibility.tasksVisible)")
                print("[AppState]    - schedulingVisible: \(visibility.schedulingVisible)")
                print("[AppState]    - safetyVisible: \(visibility.safetyVisible)")
                print("[AppState]    - reportsVisible: \(visibility.reportsVisible)")
                print("[AppState]    - analyticsVisible: \(visibility.analyticsVisible)")
                print("[AppState]    - clientsVisible: \(visibility.clientsVisible)")
                print("[AppState]    - financialsVisible: \(visibility.financialsVisible)")
                print("[AppState]    - subcontractorsVisible: \(visibility.subcontractorsVisible)")
                print("[AppState]    - certificationsVisible: \(visibility.certificationsVisible)")

                // Update state - didSet will NOT save because isSyncingFromAPI is true
                mobileModuleVisibility = visibility
                print("[AppState] ✅ Synced mobile module visibility from server (no local save)")
            } else {
                print("[AppState] ⚠️ No mobileModuleVisibility in API response (null/missing)")
                // First user or visibility never saved - try local cache first
                let localVisibility = MobileModuleVisibility.loadFromLocal(userId: userId)
                mobileModuleVisibility = localVisibility
                print("[AppState] 📱 Loaded visibility from local cache (may be defaults)")
            }
        } catch {
            print("[AppState] ❌ Failed to fetch user preferences: \(error)")
            // API failed - use local cache as fallback
            let localVisibility = MobileModuleVisibility.loadFromLocal(userId: userId)
            mobileModuleVisibility = localVisibility
            print("[AppState] 📱 Loaded preferences from local cache (API failed)")
        }
    }

    // MARK: - Module Settings

    private func loadModuleSettings() {
        // Check if we have a user role to base settings on
        loadModuleSettingsForRole()
    }

    /// Load module settings based on the user's role
    /// This mirrors the backend MODULE_ROLE_DEFAULTS from permissions.ts
    private func loadModuleSettingsForRole() {
        guard let user = currentUser else {
            // Default settings if no user
            moduleSettings = .default
            return
        }

        let role = user.role

        switch role {
        case .admin:
            // Admins have access to all modules
            moduleSettings = ModuleSettings(
                projectsEnabled: true,
                timeTrackingEnabled: true,
                dailyLogsEnabled: true,
                tasksEnabled: true,
                schedulingEnabled: true,
                drawingsEnabled: true,
                documentsEnabled: true,
                equipmentEnabled: true,
                safetyEnabled: true,
                financialsEnabled: true,
                reportsEnabled: true,
                analyticsEnabled: true,
                subcontractorsEnabled: true,
                certificationsEnabled: true,
                approvalsEnabled: true,
                warningsEnabled: true,
                droneDeployEnabled: true,
                clientsEnabled: true,
                materialsEnabled: true
            )

        case .projectManager:
            // Project managers have access to most modules
            moduleSettings = ModuleSettings(
                projectsEnabled: true,
                timeTrackingEnabled: true,
                dailyLogsEnabled: true,
                tasksEnabled: true,
                schedulingEnabled: true,
                drawingsEnabled: true,
                documentsEnabled: true,
                equipmentEnabled: true,
                safetyEnabled: true,
                financialsEnabled: true,
                reportsEnabled: true,
                analyticsEnabled: true,
                subcontractorsEnabled: true,
                certificationsEnabled: true,
                approvalsEnabled: true,
                warningsEnabled: true,
                droneDeployEnabled: true,
                clientsEnabled: true,
                materialsEnabled: true
            )

        case .developer:
            moduleSettings = ModuleSettings(
                projectsEnabled: true,
                timeTrackingEnabled: false,
                dailyLogsEnabled: true,
                tasksEnabled: true,
                schedulingEnabled: false,
                drawingsEnabled: true,
                documentsEnabled: true,
                equipmentEnabled: false,
                safetyEnabled: true,
                financialsEnabled: true,
                reportsEnabled: true,
                analyticsEnabled: false,
                subcontractorsEnabled: false,
                certificationsEnabled: false,
                approvalsEnabled: false,
                warningsEnabled: false,
                droneDeployEnabled: true,
                clientsEnabled: true,
                materialsEnabled: false
            )

        case .architect:
            moduleSettings = ModuleSettings(
                projectsEnabled: true,
                timeTrackingEnabled: false,
                dailyLogsEnabled: false,
                tasksEnabled: true,
                schedulingEnabled: false,
                drawingsEnabled: true,
                documentsEnabled: true,
                equipmentEnabled: false,
                safetyEnabled: false,
                financialsEnabled: false,
                reportsEnabled: false,
                analyticsEnabled: false,
                subcontractorsEnabled: false,
                certificationsEnabled: false,
                approvalsEnabled: false,
                warningsEnabled: false,
                droneDeployEnabled: true,
                clientsEnabled: false,
                materialsEnabled: false
            )

        case .foreman:
            moduleSettings = ModuleSettings(
                projectsEnabled: true,
                timeTrackingEnabled: true,
                dailyLogsEnabled: true,
                tasksEnabled: true,
                schedulingEnabled: true,
                drawingsEnabled: true,
                documentsEnabled: true,
                equipmentEnabled: true,
                safetyEnabled: true,
                financialsEnabled: false,
                reportsEnabled: false,
                analyticsEnabled: false,
                subcontractorsEnabled: true,
                certificationsEnabled: true,
                approvalsEnabled: true,
                warningsEnabled: true,
                droneDeployEnabled: true,
                clientsEnabled: false,
                materialsEnabled: true
            )

        case .crewLeader:
            moduleSettings = ModuleSettings(
                projectsEnabled: true,
                timeTrackingEnabled: true,
                dailyLogsEnabled: true,
                tasksEnabled: true,
                schedulingEnabled: true,
                drawingsEnabled: true,
                documentsEnabled: true,
                equipmentEnabled: false,
                safetyEnabled: true,
                financialsEnabled: false,
                reportsEnabled: false,
                analyticsEnabled: false,
                subcontractorsEnabled: false,
                certificationsEnabled: false,
                approvalsEnabled: false,
                warningsEnabled: false,
                droneDeployEnabled: false,
                clientsEnabled: false,
                materialsEnabled: false
            )

        case .officeStaff:
            moduleSettings = ModuleSettings(
                projectsEnabled: true,
                timeTrackingEnabled: true,
                dailyLogsEnabled: true,
                tasksEnabled: true,
                schedulingEnabled: true,
                drawingsEnabled: true,
                documentsEnabled: true,
                equipmentEnabled: false,
                safetyEnabled: false,
                financialsEnabled: false,
                reportsEnabled: true,
                analyticsEnabled: false,
                subcontractorsEnabled: true,
                certificationsEnabled: true,
                approvalsEnabled: false,
                warningsEnabled: false,
                droneDeployEnabled: false,
                clientsEnabled: true,
                materialsEnabled: false
            )

        case .fieldWorker:
            moduleSettings = ModuleSettings(
                projectsEnabled: true,
                timeTrackingEnabled: true,
                dailyLogsEnabled: true,
                tasksEnabled: true,
                schedulingEnabled: false,
                drawingsEnabled: true,
                documentsEnabled: true,
                equipmentEnabled: false,
                safetyEnabled: false,
                financialsEnabled: false,
                reportsEnabled: false,
                analyticsEnabled: false,
                subcontractorsEnabled: false,
                certificationsEnabled: false,
                approvalsEnabled: false,
                warningsEnabled: false,
                droneDeployEnabled: false,
                clientsEnabled: false,
                materialsEnabled: false
            )

        case .viewer:
            moduleSettings = ModuleSettings(
                projectsEnabled: true,
                timeTrackingEnabled: false,
                dailyLogsEnabled: true,
                tasksEnabled: false,
                schedulingEnabled: false,
                drawingsEnabled: true,
                documentsEnabled: true,
                equipmentEnabled: false,
                safetyEnabled: true,
                financialsEnabled: false,
                reportsEnabled: false,
                analyticsEnabled: false,
                subcontractorsEnabled: false,
                certificationsEnabled: false,
                approvalsEnabled: false,
                warningsEnabled: false,
                droneDeployEnabled: false,
                clientsEnabled: false,
                materialsEnabled: false
            )
        }

        print("Loaded module settings for role: \(role.rawValue)")
    }

    func updateModuleSettings(_ settings: ModuleSettings) {
        moduleSettings = settings
        // In production, save to API
    }

    // MARK: - Permission Checking Convenience Methods

    /// Check if current user has a specific permission
    func hasPermission(_ permission: Permission) -> Bool {
        guard let user = currentUser else { return false }
        return PermissionManager.shared.hasPermission(permission, user: user)
    }

    /// Check if current user has a permission for a specific project
    func hasPermission(_ permission: Permission, forProject projectId: String) -> Bool {
        guard let user = currentUser else { return false }
        return PermissionManager.shared.hasPermission(permission, user: user, projectId: projectId)
    }

    /// Get daily log visibility level for current user
    func getDailyLogVisibility() -> DailyLogVisibility {
        guard let user = currentUser else { return .ownOnly }
        return PermissionManager.shared.getDailyLogVisibility(for: user)
    }

    /// Check if current user can manage another user
    func canManage(target: User) -> Bool {
        guard let currentUser = currentUser else { return false }
        return PermissionManager.shared.canManage(manager: currentUser, target: target)
    }

    /// Check if current user is admin
    var isAdmin: Bool {
        currentUser?.role == .admin
    }

    /// Check if current user is project manager or higher
    var isProjectManagerOrHigher: Bool {
        guard let user = currentUser else { return false }
        return user.role.hierarchyLevel >= UserRole.projectManager.hierarchyLevel
    }

    /// Check if current user is foreman or higher
    var isForemanOrHigher: Bool {
        guard let user = currentUser else { return false }
        return user.role.hierarchyLevel >= UserRole.foreman.hierarchyLevel
    }
}
