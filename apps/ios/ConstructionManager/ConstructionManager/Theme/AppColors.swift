//
//  AppColors.swift
//  ConstructionManager
//
//  Design system colors matching web app with dark mode support
//

import SwiftUI

struct AppColors {
    // MARK: - Primary Blue
    static let primary50 = Color(hex: "eff6ff")
    static let primary100 = Color(hex: "dbeafe")
    static let primary200 = Color(hex: "bfdbfe")
    static let primary300 = Color(hex: "93c5fd")
    static let primary400 = Color(hex: "60a5fa")
    static let primary500 = Color(hex: "3b82f6")
    static let primary600 = Color(hex: "2563eb")
    static let primary700 = Color(hex: "1d4ed8")
    static let primary800 = Color(hex: "1e40af")
    static let primary900 = Color(hex: "1e3a8a")

    // MARK: - Gray Scale (Adaptive for dark mode)
    static let gray50 = Color(light: Color(hex: "f9fafb"), dark: Color(hex: "1f2937"))
    static let gray100 = Color(light: Color(hex: "f3f4f6"), dark: Color(hex: "374151"))
    static let gray200 = Color(light: Color(hex: "e5e7eb"), dark: Color(hex: "4b5563"))
    static let gray300 = Color(light: Color(hex: "d1d5db"), dark: Color(hex: "6b7280"))
    static let gray400 = Color(hex: "9ca3af")
    static let gray500 = Color(hex: "6b7280")
    static let gray600 = Color(hex: "4b5563")
    static let gray700 = Color(hex: "374151")
    static let gray800 = Color(hex: "1f2937")
    static let gray900 = Color(hex: "111827")

    // MARK: - Semantic Colors
    static let success = Color(hex: "22c55e")
    static let successLight = Color(hex: "dcfce7")
    static let warning = Color(hex: "eab308")
    static let warningLight = Color(hex: "fef9c3")
    static let error = Color(hex: "ef4444")
    static let errorLight = Color(hex: "fee2e2")
    static let info = Color(hex: "3b82f6")
    static let infoLight = Color(hex: "dbeafe")

    // MARK: - Construction Specific
    static let orange = Color(hex: "f97316")
    static let orangeLight = Color(hex: "fff7ed")

    // MARK: - Purple (for team/people features)
    static let purple = Color(hex: "8b5cf6")
    static let purpleLight = Color(hex: "ede9fe")

    // MARK: - Adaptive Background Colors (supports dark mode via Color.init with light/dark)
    static let background = Color(light: Color(hex: "f9fafb"), dark: Color(hex: "111827"))
    static let cardBackground = Color(light: .white, dark: Color(hex: "1f2937"))
    static let sidebarBackground = Color(hex: "111827")

    // MARK: - Adaptive Text Colors (supports dark mode)
    static let textPrimary = Color(light: Color(hex: "111827"), dark: Color(hex: "f9fafb"))
    static let textSecondary = Color(light: Color(hex: "4b5563"), dark: Color(hex: "9ca3af"))
    static let textTertiary = Color(light: Color(hex: "6b7280"), dark: Color(hex: "6b7280"))
    static let textMuted = Color(light: Color(hex: "9ca3af"), dark: Color(hex: "4b5563"))
}

// MARK: - Color Extension for Hex Support
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }

    /// Creates an adaptive color that changes based on light/dark mode
    init(light: Color, dark: Color) {
        self.init(uiColor: UIColor { traitCollection in
            switch traitCollection.userInterfaceStyle {
            case .dark:
                return UIColor(dark)
            default:
                return UIColor(light)
            }
        })
    }
}
