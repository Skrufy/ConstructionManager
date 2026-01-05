//
//  LocalizationManager.swift
//  ConstructionManager
//
//  Manages app localization and language preferences
//

import Foundation
import SwiftUI
import Combine

// MARK: - Localization Manager

class LocalizationManager: ObservableObject {
    static let shared = LocalizationManager()

    @Published var currentLanguage: String {
        didSet {
            UserDefaults.standard.set(currentLanguage, forKey: "app_language")
            // Update the app's language bundle
            Bundle.setLanguage(currentLanguage)
            // Post notification to refresh views
            NotificationCenter.default.post(name: .languageDidChange, object: nil)
        }
    }

    private init() {
        // Check for saved preference, then device language, then default to English
        if let saved = UserDefaults.standard.string(forKey: "app_language") {
            currentLanguage = saved
        } else {
            // Auto-detect from device
            let deviceLanguage = Locale.current.language.languageCode?.identifier ?? "en"
            currentLanguage = ["en", "es"].contains(deviceLanguage) ? deviceLanguage : "en"
        }
        Bundle.setLanguage(currentLanguage)
    }

    var supportedLanguages: [(code: String, name: String)] {
        [
            ("en", "English"),
            ("es", "Español")
        ]
    }

    func setLanguage(_ code: String) {
        guard ["en", "es"].contains(code) else { return }
        currentLanguage = code
    }

    /// Sync language preference from API
    func syncFromAPI(language: String) {
        if ["en", "es"].contains(language) && language != currentLanguage {
            currentLanguage = language
        }
    }
}

// MARK: - Notification for Language Change
extension Notification.Name {
    static let languageDidChange = Notification.Name("languageDidChange")
}

// MARK: - Bundle Extension for Runtime Language Switching

private var bundleKey: UInt8 = 0

class BundleEx: Bundle {
    override func localizedString(forKey key: String, value: String?, table tableName: String?) -> String {
        if let bundle = objc_getAssociatedObject(self, &bundleKey) as? Bundle {
            return bundle.localizedString(forKey: key, value: value, table: tableName)
        }
        return super.localizedString(forKey: key, value: value, table: tableName)
    }
}

extension Bundle {
    static func setLanguage(_ language: String) {
        defer {
            object_setClass(Bundle.main, BundleEx.self)
        }

        guard let path = Bundle.main.path(forResource: language, ofType: "lproj"),
              let bundle = Bundle(path: path) else {
            // Fallback to main bundle if language not found
            objc_setAssociatedObject(Bundle.main, &bundleKey, nil, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
            return
        }

        objc_setAssociatedObject(Bundle.main, &bundleKey, bundle, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
    }
}

// MARK: - String Extension for Localization

extension String {
    /// Returns the localized version of this string
    var localized: String {
        NSLocalizedString(self, comment: "")
    }

    /// Returns the localized version with format arguments
    func localized(with arguments: CVarArg...) -> String {
        String(format: self.localized, arguments: arguments)
    }
}

// MARK: - Localized Text View

/// A Text view that automatically uses localized strings
struct LocalizedText: View {
    let key: String

    init(_ key: String) {
        self.key = key
    }

    var body: some View {
        Text(key.localized)
    }
}
