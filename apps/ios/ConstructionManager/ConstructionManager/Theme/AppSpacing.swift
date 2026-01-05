//
//  AppSpacing.swift
//  ConstructionManager
//
//  Spacing and sizing constants
//

import SwiftUI

struct AppSpacing {
    // MARK: - Base Spacing (4px grid)
    static let xxs: CGFloat = 4
    static let xs: CGFloat = 8
    static let sm: CGFloat = 12
    static let md: CGFloat = 16
    static let lg: CGFloat = 20
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 32
    static let xxxl: CGFloat = 48

    // MARK: - Component Sizing
    static let buttonHeight: CGFloat = 48
    static let buttonHeightLarge: CGFloat = 56
    static let inputHeight: CGFloat = 48
    static let iconSmall: CGFloat = 16
    static let iconMedium: CGFloat = 20
    static let iconLarge: CGFloat = 24
    static let iconXL: CGFloat = 28

    // MARK: - Touch Targets (iOS HIG minimum 44pt)
    static let minTouchTarget: CGFloat = 44
    static let touchTargetLarge: CGFloat = 56

    // MARK: - Border Radius
    static let radiusSmall: CGFloat = 8
    static let radiusMedium: CGFloat = 10
    static let radiusLarge: CGFloat = 12
    static let radiusXL: CGFloat = 16
    static let radiusFull: CGFloat = 9999

    // MARK: - Card Dimensions
    static let cardPadding: CGFloat = 20
    static let cardSpacing: CGFloat = 16

    // MARK: - Icon Circle Sizes
    static let iconCircleSmall: CGFloat = 40
    static let iconCircleMedium: CGFloat = 48
    static let iconCircleLarge: CGFloat = 56
}
