package com.constructionpro.app.ui.util

import android.app.Activity
import androidx.compose.material3.windowsizeclass.ExperimentalMaterial3WindowSizeClassApi
import androidx.compose.material3.windowsizeclass.WindowHeightSizeClass
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.material3.windowsizeclass.calculateWindowSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Device form factors for adaptive UI
 */
enum class DevicePosture {
    PHONE_PORTRAIT,      // Regular phone in portrait
    PHONE_LANDSCAPE,     // Regular phone in landscape
    FOLDABLE_CLOSED,     // Foldable in closed/cover screen mode
    FOLDABLE_OPEN,       // Foldable fully opened (tablet-like)
    TABLET_PORTRAIT,     // Tablet in portrait
    TABLET_LANDSCAPE     // Tablet in landscape
}

/**
 * Screen size categories for responsive layouts
 */
enum class ScreenSize {
    COMPACT,    // < 600dp width (phones)
    MEDIUM,     // 600-840dp width (small tablets, foldables)
    EXPANDED    // > 840dp width (large tablets, desktop)
}

/**
 * Adaptive layout configuration based on device characteristics
 */
data class AdaptiveLayoutInfo(
    val screenSize: ScreenSize,
    val devicePosture: DevicePosture,
    val windowWidthSizeClass: WindowWidthSizeClass,
    val windowHeightSizeClass: WindowHeightSizeClass,
    val screenWidthDp: Dp,
    val screenHeightDp: Dp,
    val isLandscape: Boolean,
    val isFoldable: Boolean,
    val showNavigationRail: Boolean,
    val showBottomNav: Boolean,
    val gridColumns: Int,
    val contentMaxWidth: Dp,
    val horizontalPadding: Dp
) {
    val isCompact: Boolean get() = screenSize == ScreenSize.COMPACT
    val isMedium: Boolean get() = screenSize == ScreenSize.MEDIUM
    val isExpanded: Boolean get() = screenSize == ScreenSize.EXPANDED
    val isTablet: Boolean get() = screenSize != ScreenSize.COMPACT
}

val LocalAdaptiveLayout = compositionLocalOf<AdaptiveLayoutInfo> {
    error("No AdaptiveLayoutInfo provided")
}

/**
 * Calculate adaptive layout info from window size class
 */
@OptIn(ExperimentalMaterial3WindowSizeClassApi::class)
@Composable
fun calculateAdaptiveLayoutInfo(activity: Activity): AdaptiveLayoutInfo {
    val windowSizeClass = calculateWindowSizeClass(activity)
    val configuration = LocalConfiguration.current

    val screenWidthDp = configuration.screenWidthDp.dp
    val screenHeightDp = configuration.screenHeightDp.dp
    val isLandscape = configuration.screenWidthDp > configuration.screenHeightDp

    val screenSize = when (windowSizeClass.widthSizeClass) {
        WindowWidthSizeClass.Compact -> ScreenSize.COMPACT
        WindowWidthSizeClass.Medium -> ScreenSize.MEDIUM
        WindowWidthSizeClass.Expanded -> ScreenSize.EXPANDED
        else -> ScreenSize.COMPACT
    }

    // Detect foldable: typically has medium width when opened
    // Samsung Fold has ~585dp cover screen, ~884dp main screen
    val isFoldable = screenWidthDp >= 580.dp && screenWidthDp <= 900.dp

    val devicePosture = when {
        isFoldable && screenWidthDp >= 700.dp -> DevicePosture.FOLDABLE_OPEN
        isFoldable -> DevicePosture.FOLDABLE_CLOSED
        screenSize == ScreenSize.EXPANDED && isLandscape -> DevicePosture.TABLET_LANDSCAPE
        screenSize == ScreenSize.EXPANDED -> DevicePosture.TABLET_PORTRAIT
        isLandscape -> DevicePosture.PHONE_LANDSCAPE
        else -> DevicePosture.PHONE_PORTRAIT
    }

    // Grid columns based on screen size
    val gridColumns = when (screenSize) {
        ScreenSize.COMPACT -> if (isLandscape) 2 else 1
        ScreenSize.MEDIUM -> 2
        ScreenSize.EXPANDED -> if (isLandscape) 3 else 2
    }

    // Show navigation rail on larger screens, bottom nav on phones
    val showNavigationRail = screenSize != ScreenSize.COMPACT
    val showBottomNav = screenSize == ScreenSize.COMPACT

    // Content width constraints
    val contentMaxWidth = when (screenSize) {
        ScreenSize.COMPACT -> Dp.Unspecified
        ScreenSize.MEDIUM -> 840.dp
        ScreenSize.EXPANDED -> 1200.dp
    }

    // Horizontal padding
    val horizontalPadding = when (screenSize) {
        ScreenSize.COMPACT -> 16.dp
        ScreenSize.MEDIUM -> 24.dp
        ScreenSize.EXPANDED -> 32.dp
    }

    return AdaptiveLayoutInfo(
        screenSize = screenSize,
        devicePosture = devicePosture,
        windowWidthSizeClass = windowSizeClass.widthSizeClass,
        windowHeightSizeClass = windowSizeClass.heightSizeClass,
        screenWidthDp = screenWidthDp,
        screenHeightDp = screenHeightDp,
        isLandscape = isLandscape,
        isFoldable = isFoldable,
        showNavigationRail = showNavigationRail,
        showBottomNav = showBottomNav,
        gridColumns = gridColumns,
        contentMaxWidth = contentMaxWidth,
        horizontalPadding = horizontalPadding
    )
}

/**
 * Helper to get responsive values based on screen size
 */
@Composable
fun <T> responsiveValue(
    compact: T,
    medium: T = compact,
    expanded: T = medium
): T {
    val configuration = LocalConfiguration.current
    val screenWidthDp = configuration.screenWidthDp

    return when {
        screenWidthDp < 600 -> compact
        screenWidthDp < 840 -> medium
        else -> expanded
    }
}

/**
 * Get touch target size - larger for foldables in tablet mode
 */
@Composable
fun adaptiveTouchTarget(): Dp {
    return responsiveValue(
        compact = 56.dp,    // Standard touch target
        medium = 56.dp,     // Same for foldables
        expanded = 48.dp    // Can be slightly smaller on tablets with precise touch
    )
}

/**
 * Get card width for grid layouts
 */
@Composable
fun adaptiveCardWidth(): Dp {
    val configuration = LocalConfiguration.current
    val screenWidthDp = configuration.screenWidthDp.dp
    val padding = responsiveValue(16.dp, 24.dp, 32.dp)
    val columns = responsiveValue(1, 2, 3)
    val spacing = 12.dp

    return if (columns == 1) {
        Dp.Unspecified // Full width minus padding
    } else {
        (screenWidthDp - (padding * 2) - (spacing * (columns - 1))) / columns
    }
}

/**
 * Responsive text sizes
 */
object AdaptiveTextSize {
    @Composable
    fun headline(): Int = responsiveValue(24, 28, 32)

    @Composable
    fun title(): Int = responsiveValue(20, 22, 24)

    @Composable
    fun body(): Int = responsiveValue(16, 16, 18)

    @Composable
    fun label(): Int = responsiveValue(14, 14, 16)
}

/**
 * Detect if the current display is narrow (like a foldable cover screen).
 * Cover display: 6.5-inch, 2520 × 1080 pixels (21:9 aspect ratio) ≈ 257dp width
 * Regular phone: typically 360-412dp width
 */
@Composable
fun isNarrowScreen(): Boolean {
    val configuration = LocalConfiguration.current
    val screenWidthDp = configuration.screenWidthDp
    // Consider narrow if width < 320dp (covers folding phone cover screens)
    // or if aspect ratio is > 2.0 (very tall/narrow)
    val aspectRatio = configuration.screenHeightDp.toFloat() / configuration.screenWidthDp.toFloat()
    return screenWidthDp < 320 || aspectRatio > 2.0f
}

/**
 * Check if display should use compact horizontal layouts
 * Threshold: < 360dp width (typical minimum for modern phones)
 */
@Composable
fun useCompactHorizontalLayout(): Boolean {
    val configuration = LocalConfiguration.current
    return configuration.screenWidthDp < 360
}
