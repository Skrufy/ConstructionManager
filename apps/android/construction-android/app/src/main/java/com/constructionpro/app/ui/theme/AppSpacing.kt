package com.constructionpro.app.ui.theme

import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Spacing and sizing constants matching iOS design.
 * Uses a 4dp base grid for consistency.
 *
 * Usage:
 *   Modifier.padding(AppSpacing.md)
 *   Spacer(modifier = Modifier.height(AppSpacing.lg))
 */
object AppSpacing {
    // MARK: - Base Spacing (4dp grid)
    val xxs: Dp = 4.dp
    val xs: Dp = 8.dp
    val sm: Dp = 12.dp
    val md: Dp = 16.dp
    val lg: Dp = 20.dp
    val xl: Dp = 24.dp
    val xxl: Dp = 32.dp
    val xxxl: Dp = 48.dp

    // MARK: - Component Sizing
    val buttonHeight: Dp = 48.dp
    val buttonHeightLarge: Dp = 56.dp
    val inputHeight: Dp = 48.dp
    val iconSmall: Dp = 16.dp
    val iconMedium: Dp = 20.dp
    val iconLarge: Dp = 24.dp
    val iconXL: Dp = 28.dp

    // MARK: - Touch Targets (Android guidelines: 48dp minimum)
    val minTouchTarget: Dp = 48.dp
    val touchTargetLarge: Dp = 56.dp

    // MARK: - Border Radius
    val radiusSmall: Dp = 8.dp
    val radiusMedium: Dp = 10.dp
    val radiusLarge: Dp = 12.dp
    val radiusXL: Dp = 16.dp

    // MARK: - Card Dimensions
    val cardPadding: Dp = 20.dp
    val cardSpacing: Dp = 16.dp
    val cardRadius: Dp = 12.dp

    // MARK: - Icon Circle Sizes
    val iconCircleSmall: Dp = 40.dp
    val iconCircleMedium: Dp = 48.dp
    val iconCircleLarge: Dp = 56.dp

    // MARK: - Screen Layout
    val screenPadding: Dp = 16.dp
    val screenPaddingLarge: Dp = 24.dp
    val sectionSpacing: Dp = 24.dp
    val itemSpacing: Dp = 12.dp
    val listItemSpacing: Dp = 8.dp

    // MARK: - FAB
    val fabSize: Dp = 56.dp
    val fabMargin: Dp = 16.dp

    // MARK: - Bottom Navigation
    val bottomNavHeight: Dp = 80.dp

    // MARK: - Toolbar/AppBar
    val toolbarHeight: Dp = 64.dp
}

/**
 * Elevation values for Material Design surfaces.
 */
object AppElevation {
    val none: Dp = 0.dp
    val low: Dp = 1.dp
    val medium: Dp = 2.dp
    val high: Dp = 4.dp
    val dialog: Dp = 8.dp
    val navigation: Dp = 16.dp
}
