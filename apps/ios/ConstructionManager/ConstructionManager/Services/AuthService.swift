//
//  AuthService.swift
//  ConstructionManager
//
//  Authentication service using Supabase
//

import Foundation
import Combine
import UIKit

// MARK: - Supabase Configuration
struct SupabaseConfig {
    static let url = "https://krfithbbutfeeprtdmbx.supabase.co"
    static let anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyZml0aGJidXRmZWVwcnRkbWJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNjc1ODQsImV4cCI6MjA4MTg0MzU4NH0.gxYdQt4h9y8PfD69rAWrVKde7TgEPJwdqImg_Rk83ok"
}

// MARK: - Auth Response Models
struct AuthResponse: Decodable {
    let accessToken: String
    let tokenType: String
    let expiresIn: Int
    let expiresAt: Int?
    let refreshToken: String
    let user: SupabaseUser

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case tokenType = "token_type"
        case expiresIn = "expires_in"
        case expiresAt = "expires_at"
        case refreshToken = "refresh_token"
        case user
    }
}

struct SupabaseUser: Decodable {
    let id: String
    let email: String?
    let phone: String?
    let createdAt: String?
    let updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case email
        case phone
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct AuthError: Decodable {
    let error: String?
    let errorDescription: String?
    let message: String?

    enum CodingKeys: String, CodingKey {
        case error
        case errorDescription = "error_description"
        case message
    }

    var displayMessage: String {
        errorDescription ?? message ?? error ?? "error.authenticationFailed".localized
    }
}

// MARK: - User Profile Response (from your backend)
// API returns user directly, not wrapped in {"user": ...}
struct UserProfile: Decodable {
    let id: String
    let email: String
    let name: String
    let phone: String?
    let role: String
    let status: String
    let isBlaster: Bool?
    let createdAt: Date
    let language: String?
}

// MARK: - Auth Service
@MainActor
class AuthService: ObservableObject {
    static let shared = AuthService()

    @Published var isAuthenticated = false
    @Published var isLoading = false
    @Published var currentUser: User?
    @Published var error: String?

    private let apiClient = APIClient.shared

    private init() {
        // Check for existing token on init
        if apiClient.hasValidToken() {
            isAuthenticated = true
            Task {
                await loadCurrentUser()
            }
        }
    }

    // MARK: - Login with Email/Password

    func login(email: String, password: String) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            // Call Supabase auth endpoint directly
            let authResponse = try await supabaseSignIn(email: email, password: password)

            // Store the access token
            apiClient.setAccessToken(authResponse.accessToken)

            // Store refresh token securely in Keychain
            KeychainHelper.shared.save(token: authResponse.refreshToken, forKey: .refreshToken)

            // Load user profile from your backend
            await loadCurrentUser()

            // Auth succeeded - mark as authenticated even if user profile loading had issues
            // The user profile will be retried on next app launch if needed
            isAuthenticated = true
            return true
        } catch {
            self.error = error.localizedDescription
            return false
        }
    }

    // MARK: - Supabase Sign In

    private func supabaseSignIn(email: String, password: String) async throws -> AuthResponse {
        let url = URL(string: "\(SupabaseConfig.url)/auth/v1/token?grant_type=password")!

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")

        let body = ["email": email, "password": password]
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.unknown
        }

        if httpResponse.statusCode != 200 {
            if let authError = try? JSONDecoder().decode(AuthError.self, from: data) {
                throw APIError.serverError(httpResponse.statusCode, authError.displayMessage)
            }
            throw APIError.serverError(httpResponse.statusCode, "error.loginFailed".localized)
        }

        let decoder = JSONDecoder()
        return try decoder.decode(AuthResponse.self, from: data)
    }

    // MARK: - User Management

    /// Set the current user (used when validating session externally)
    func setCurrentUser(_ user: User) {
        currentUser = user
        isAuthenticated = true
    }

    // MARK: - Load Current User

    func loadCurrentUser() async {
        guard apiClient.hasValidToken() else { return }

        do {
            // API returns user directly, not wrapped
            let profile: UserProfile = try await apiClient.get("/users/me")

            currentUser = User(
                id: profile.id,
                name: profile.name,
                email: profile.email,
                phone: profile.phone,
                role: UserRole(rawValue: profile.role) ?? .fieldWorker,
                status: UserStatus(rawValue: profile.status) ?? .active,
                isBlaster: profile.isBlaster,
                createdAt: profile.createdAt,
                language: profile.language
            )
        } catch {
            print("Failed to load user profile: \(error)")
            // If unauthorized, clear auth state
            if case APIError.unauthorized = error {
                await logout()
            }
        }
    }

    // MARK: - Refresh Token

    func refreshToken() async -> Bool {
        guard let refreshToken = KeychainHelper.shared.get(key: .refreshToken) else {
            return false
        }

        do {
            let url = URL(string: "\(SupabaseConfig.url)/auth/v1/token?grant_type=refresh_token")!

            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")

            let body = ["refresh_token": refreshToken]
            request.httpBody = try JSONEncoder().encode(body)

            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                return false
            }

            let authResponse = try JSONDecoder().decode(AuthResponse.self, from: data)

            // Update tokens securely in Keychain
            apiClient.setAccessToken(authResponse.accessToken)
            KeychainHelper.shared.save(token: authResponse.refreshToken, forKey: .refreshToken)

            return true
        } catch {
            print("Token refresh failed: \(error)")
            return false
        }
    }

    // MARK: - Logout

    func logout() async {
        isLoading = true
        defer { isLoading = false }

        // Clear all tokens from Keychain
        KeychainHelper.shared.clearAllTokens()
        apiClient.clearAccessToken()

        // Clear state
        currentUser = nil
        isAuthenticated = false
    }

    // MARK: - Register Device for Push Notifications

    func registerDeviceToken(_ token: String, appVersion: String? = nil) async {
        guard apiClient.hasValidToken() else { return }

        struct DeviceRegistration: Encodable {
            let token: String
            let platform: String
            let deviceId: String?
            let appVersion: String?
        }

        let deviceId = UIDevice.current.identifierForVendor?.uuidString

        let registration = DeviceRegistration(
            token: token,
            platform: "IOS",
            deviceId: deviceId,
            appVersion: appVersion
        )

        do {
            try await apiClient.post("/notifications/register-device", body: registration)
            print("Device registered for push notifications")
        } catch {
            print("Failed to register device: \(error)")
        }
    }

    // MARK: - Update Profile

    func updateProfile(name: String?, phone: String?) async -> Bool {
        struct ProfileUpdate: Encodable {
            let name: String?
            let phone: String?
        }

        do {
            let _: UserProfile = try await apiClient.put(
                "/users/me",
                body: ProfileUpdate(name: name, phone: phone)
            )
            await loadCurrentUser()
            return true
        } catch {
            self.error = error.localizedDescription
            return false
        }
    }

    // MARK: - Change Password

    func changePassword(currentPassword: String, newPassword: String) async -> Bool {
        struct PasswordChange: Encodable {
            let currentPassword: String
            let newPassword: String
        }

        do {
            let _: EmptyResponse = try await apiClient.put(
                "/users/me/password",
                body: PasswordChange(currentPassword: currentPassword, newPassword: newPassword)
            )
            return true
        } catch {
            self.error = error.localizedDescription
            return false
        }
    }

    // MARK: - Reset Password (Forgot Password)

    /// Request a password reset email via Supabase
    func resetPassword(email: String) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let url = URL(string: "\(SupabaseConfig.url)/auth/v1/recover")!

            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")

            let body = ["email": email]
            request.httpBody = try JSONEncoder().encode(body)

            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.unknown
            }

            // Supabase returns 200 on success, even if email doesn't exist (for security)
            if httpResponse.statusCode == 200 {
                return true
            } else {
                if let authError = try? JSONDecoder().decode(AuthError.self, from: data) {
                    throw APIError.serverError(httpResponse.statusCode, authError.displayMessage)
                }
                throw APIError.serverError(httpResponse.statusCode, "auth.resetPasswordFailed".localized)
            }
        } catch {
            self.error = error.localizedDescription
            return false
        }
    }
}

// MARK: - Empty Response for endpoints that return no data
struct EmptyResponse: Decodable {}
