package com.constructionpro.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.ui.graphics.Color

/**
 * Semantic color system matching iOS design.
 * Provides adaptive colors that change based on light/dark theme.
 *
 * Usage:
 *   AppColors.textPrimary   // Adaptive text color
 *   AppColors.cardBackground // Adaptive card background
 */
object AppColors {
    // MARK: - Primary Blue (same as Color.kt, re-exported for consistency)
    val primary50 = Primary50
    val primary100 = Primary100
    val primary200 = Primary200
    val primary300 = Primary300
    val primary400 = Primary400
    val primary500 = Primary500
    val primary600 = Primary600
    val primary700 = Primary700
    val primary800 = Primary800
    val primary900 = Primary900

    // MARK: - Semantic Colors
    val success = Color(0xFF22C55E)
    val successLight = Color(0xFFDCFCE7)
    val warning = Color(0xFFEAB308)
    val warningLight = Color(0xFFFEF9C3)
    val error = Color(0xFFEF4444)
    val errorLight = Color(0xFFFEE2E2)
    val info = Color(0xFF3B82F6)
    val infoLight = Color(0xFFDBEAFE)

    // MARK: - Construction Specific
    val orange = Color(0xFFF97316)
    val orangeLight = Color(0xFFFFF7ED)

    // MARK: - Purple (for team/people features)
    val purple = Color(0xFF8B5CF6)
    val purpleLight = Color(0xFFEDE9FE)

    // MARK: - Adaptive Colors (Composable)

    /** Primary text color - adapts to theme */
    val textPrimary: Color
        @Composable
        @ReadOnlyComposable
        get() = if (isSystemInDarkTheme()) Color(0xFFF9FAFB) else Color(0xFF111827)

    /** Secondary text color - adapts to theme */
    val textSecondary: Color
        @Composable
        @ReadOnlyComposable
        get() = if (isSystemInDarkTheme()) Color(0xFF9CA3AF) else Color(0xFF4B5563)

    /** Tertiary/muted text color */
    val textTertiary: Color
        @Composable
        @ReadOnlyComposable
        get() = Color(0xFF6B7280)

    /** Muted text color - adapts to theme */
    val textMuted: Color
        @Composable
        @ReadOnlyComposable
        get() = if (isSystemInDarkTheme()) Color(0xFF4B5563) else Color(0xFF9CA3AF)

    /** Screen background color - adapts to theme */
    val background: Color
        @Composable
        @ReadOnlyComposable
        get() = if (isSystemInDarkTheme()) Color(0xFF111827) else Color(0xFFF9FAFB)

    /** Card/surface background - adapts to theme */
    val cardBackground: Color
        @Composable
        @ReadOnlyComposable
        get() = if (isSystemInDarkTheme()) Color(0xFF1F2937) else Color.White

    /** Surface variant for subtle differentiation - adapts to theme */
    val surfaceVariant: Color
        @Composable
        @ReadOnlyComposable
        get() = if (isSystemInDarkTheme()) Color(0xFF374151) else Color(0xFFF3F4F6)

    /** Sidebar/navigation background */
    val sidebarBackground = Color(0xFF111827)

    // MARK: - Gray Scale (adaptive)

    val gray50: Color
        @Composable
        @ReadOnlyComposable
        get() = if (isSystemInDarkTheme()) Color(0xFF1F2937) else Color(0xFFF9FAFB)

    val gray100: Color
        @Composable
        @ReadOnlyComposable
        get() = if (isSystemInDarkTheme()) Color(0xFF374151) else Color(0xFFF3F4F6)

    val gray200: Color
        @Composable
        @ReadOnlyComposable
        get() = if (isSystemInDarkTheme()) Color(0xFF4B5563) else Color(0xFFE5E7EB)

    val gray300: Color
        @Composable
        @ReadOnlyComposable
        get() = if (isSystemInDarkTheme()) Color(0xFF6B7280) else Color(0xFFD1D5DB)

    // Non-adaptive grays
    val gray400 = Color(0xFF9CA3AF)
    val gray500 = Color(0xFF6B7280)
    val gray600 = Color(0xFF4B5563)
    val gray700 = Color(0xFF374151)
    val gray800 = Color(0xFF1F2937)
    val gray900 = Color(0xFF111827)

    // MARK: - Divider/Border Colors
    val divider: Color
        @Composable
        @ReadOnlyComposable
        get() = if (isSystemInDarkTheme()) Color(0xFF374151) else Color(0xFFE5E7EB)

    val border: Color
        @Composable
        @ReadOnlyComposable
        get() = if (isSystemInDarkTheme()) Color(0xFF4B5563) else Color(0xFFD1D5DB)
}

/**
 * Status colors for daily logs, time entries, etc.
 */
object StatusColors {
    val draft = Color(0xFF6B7280)       // Gray
    val submitted = Color(0xFF3B82F6)   // Blue
    val approved = Color(0xFF22C55E)    // Green
    val rejected = Color(0xFFEF4444)    // Red
    val pending = Color(0xFFF59E0B)     // Amber
    val active = Color(0xFF22C55E)      // Green
    val onHold = Color(0xFFF59E0B)      // Amber
    val completed = Color(0xFF3B82F6)   // Blue
    val cancelled = Color(0xFF6B7280)   // Gray

    fun forStatus(status: String): Color = when (status.uppercase()) {
        "DRAFT" -> draft
        "SUBMITTED" -> submitted
        "APPROVED" -> approved
        "REJECTED" -> rejected
        "PENDING" -> pending
        "ACTIVE" -> active
        "ON_HOLD", "ONHOLD" -> onHold
        "COMPLETED" -> completed
        "CANCELLED", "CANCELED" -> cancelled
        else -> draft
    }

    fun backgroundForStatus(status: String): Color = when (status.uppercase()) {
        "DRAFT" -> Color(0xFFF3F4F6)
        "SUBMITTED" -> Color(0xFFDBEAFE)
        "APPROVED" -> Color(0xFFDCFCE7)
        "REJECTED" -> Color(0xFFFEE2E2)
        "PENDING" -> Color(0xFFFEF3C7)
        "ACTIVE" -> Color(0xFFDCFCE7)
        "ON_HOLD", "ONHOLD" -> Color(0xFFFEF3C7)
        "COMPLETED" -> Color(0xFFDBEAFE)
        "CANCELLED", "CANCELED" -> Color(0xFFF3F4F6)
        else -> Color(0xFFF3F4F6)
    }
}
