//
//  KeychainHelper.swift
//  ConstructionManager
//
//  Secure token storage using Keychain Services
//

import Foundation
import Security

/// Helper class for secure Keychain operations
class KeychainHelper {
    static let shared = KeychainHelper()

    private let service = Bundle.main.bundleIdentifier ?? "com.constructionpro.app"

    private init() {}

    // MARK: - Token Keys

    enum TokenKey: String {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
    }

    // MARK: - Save Token

    /// Save a token to Keychain
    /// - Parameters:
    ///   - token: The token string to save
    ///   - key: The token key identifier
    /// - Returns: True if save succeeded
    @discardableResult
    func save(token: String, forKey key: TokenKey) -> Bool {
        guard let data = token.data(using: .utf8) else { return false }

        // Delete any existing item first
        delete(key: key)

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key.rawValue,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]

        let status = SecItemAdd(query as CFDictionary, nil)

        #if DEBUG
        if status != errSecSuccess {
            print("[KeychainHelper] Failed to save token: OSStatus \(status)")
        }
        #endif

        return status == errSecSuccess
    }

    // MARK: - Get Token

    /// Retrieve a token from Keychain
    /// - Parameter key: The token key identifier
    /// - Returns: The token string if found
    func get(key: TokenKey) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key.rawValue,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let token = String(data: data, encoding: .utf8) else {
            return nil
        }

        return token
    }

    // MARK: - Delete Token

    /// Delete a token from Keychain
    /// - Parameter key: The token key identifier
    /// - Returns: True if delete succeeded or item didn't exist
    @discardableResult
    func delete(key: TokenKey) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key.rawValue
        ]

        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }

    // MARK: - Clear All Tokens

    /// Remove all stored tokens
    func clearAllTokens() {
        delete(key: .accessToken)
        delete(key: .refreshToken)
    }

    // MARK: - Migration

    /// Migrate tokens from UserDefaults to Keychain (one-time operation)
    func migrateFromUserDefaults() {
        // Migrate access token
        if let accessToken = UserDefaults.standard.string(forKey: "accessToken") {
            if save(token: accessToken, forKey: .accessToken) {
                UserDefaults.standard.removeObject(forKey: "accessToken")
                #if DEBUG
                print("[KeychainHelper] Migrated access token to Keychain")
                #endif
            }
        }

        // Migrate refresh token
        if let refreshToken = UserDefaults.standard.string(forKey: "refreshToken") {
            if save(token: refreshToken, forKey: .refreshToken) {
                UserDefaults.standard.removeObject(forKey: "refreshToken")
                #if DEBUG
                print("[KeychainHelper] Migrated refresh token to Keychain")
                #endif
            }
        }
    }
}
