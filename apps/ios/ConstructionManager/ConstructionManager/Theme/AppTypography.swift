//
//  AppTypography.swift
//  ConstructionManager
//
//  Typography system matching web app
//

import SwiftUI

struct AppTypography {
    // MARK: - Headings
    static let heading1 = Font.system(size: 28, weight: .bold)
    static let heading2 = Font.system(size: 22, weight: .bold)
    static let heading3 = Font.system(size: 18, weight: .semibold)

    // MARK: - Body Text
    static let bodyLarge = Font.system(size: 18, weight: .regular)
    static let body = Font.system(size: 16, weight: .regular)
    static let bodyMedium = Font.system(size: 16, weight: .medium)
    static let bodySemibold = Font.system(size: 16, weight: .semibold)

    // MARK: - Secondary Text
    static let secondary = Font.system(size: 14, weight: .regular)
    static let secondaryMedium = Font.system(size: 14, weight: .medium)

    // MARK: - Small Text
    static let caption = Font.system(size: 12, weight: .regular)
    static let captionMedium = Font.system(size: 12, weight: .medium)

    // MARK: - Labels
    static let label = Font.system(size: 16, weight: .semibold)
    static let labelSmall = Font.system(size: 14, weight: .semibold)

    // MARK: - Button Text
    static let button = Font.system(size: 16, weight: .semibold)
    static let buttonLarge = Font.system(size: 18, weight: .semibold)
    static let buttonSmall = Font.system(size: 14, weight: .semibold)
}
