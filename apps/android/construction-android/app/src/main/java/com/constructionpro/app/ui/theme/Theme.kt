package com.constructionpro.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

// Light color scheme - matching web platform
private val LightColors = lightColorScheme(
    primary = Primary600,
    onPrimary = Color.White,
    primaryContainer = Primary100,
    onPrimaryContainer = Primary900,

    secondary = ConstructionOrange,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFFFF7ED),
    onSecondaryContainer = Color(0xFF7C2D12),

    tertiary = ConstructionGreen,
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFFD1FAE5),
    onTertiaryContainer = Color(0xFF065F46),

    error = ConstructionRed,
    onError = Color.White,
    errorContainer = Color(0xFFFEE2E2),
    onErrorContainer = Color(0xFF991B1B),

    background = BackgroundLight,
    onBackground = Gray900,

    surface = SurfaceLight,
    onSurface = Gray900,
    surfaceVariant = Gray100,
    onSurfaceVariant = Gray600,

    outline = Gray300,
    outlineVariant = Gray200
)

// Dark color scheme
private val DarkColors = darkColorScheme(
    primary = Primary400,
    onPrimary = Primary900,
    primaryContainer = Primary800,
    onPrimaryContainer = Primary100,

    secondary = ConstructionOrange,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFF7C2D12),
    onSecondaryContainer = Color(0xFFFFF7ED),

    tertiary = Color(0xFF34D399),
    onTertiary = Color(0xFF065F46),
    tertiaryContainer = Color(0xFF065F46),
    onTertiaryContainer = Color(0xFFD1FAE5),

    error = Color(0xFFF87171),
    onError = Color(0xFF7F1D1D),
    errorContainer = Color(0xFF991B1B),
    onErrorContainer = Color(0xFFFEE2E2),

    background = BackgroundDark,
    onBackground = Gray100,

    surface = SurfaceDark,
    onSurface = Gray100,
    surfaceVariant = Gray800,
    onSurfaceVariant = Gray400,

    outline = Gray600,
    outlineVariant = Gray700
)

// Rounded shapes matching web platform (12px/16px radius)
val Shapes = Shapes(
    extraSmall = RoundedCornerShape(4.dp),
    small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(12.dp),  // Cards, buttons - matches web rounded-xl
    large = RoundedCornerShape(16.dp),   // Modals - matches web rounded-2xl
    extraLarge = RoundedCornerShape(24.dp)
)

// Extended colors not in Material3
data class ExtendedColors(
    val success: Color,
    val onSuccess: Color,
    val successContainer: Color,
    val warning: Color,
    val onWarning: Color,
    val warningContainer: Color,
    val info: Color,
    val onInfo: Color,
    val constructionOrange: Color,
    val surfaceElevated: Color
)

val LocalExtendedColors = staticCompositionLocalOf {
    ExtendedColors(
        success = ConstructionGreen,
        onSuccess = Color.White,
        successContainer = Color(0xFFD1FAE5),
        warning = ConstructionYellow,
        onWarning = Color.Black,
        warningContainer = Color(0xFFFEF3C7),
        info = Primary500,
        onInfo = Color.White,
        constructionOrange = ConstructionOrange,
        surfaceElevated = Color.White
    )
}

private val LightExtendedColors = ExtendedColors(
    success = ConstructionGreen,
    onSuccess = Color.White,
    successContainer = Color(0xFFD1FAE5),
    warning = ConstructionYellow,
    onWarning = Color.Black,
    warningContainer = Color(0xFFFEF3C7),
    info = Primary500,
    onInfo = Color.White,
    constructionOrange = ConstructionOrange,
    surfaceElevated = Color.White
)

private val DarkExtendedColors = ExtendedColors(
    success = Color(0xFF34D399),
    onSuccess = Color(0xFF065F46),
    successContainer = Color(0xFF065F46),
    warning = Color(0xFFFCD34D),
    onWarning = Color(0xFF78350F),
    warningContainer = Color(0xFF78350F),
    info = Primary400,
    onInfo = Primary900,
    constructionOrange = ConstructionOrange,
    surfaceElevated = Gray800
)

@Composable
fun ConstructionProTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colors = if (darkTheme) DarkColors else LightColors
    val extendedColors = if (darkTheme) DarkExtendedColors else LightExtendedColors

    CompositionLocalProvider(LocalExtendedColors provides extendedColors) {
        MaterialTheme(
            colorScheme = colors,
            typography = Typography,
            shapes = Shapes,
            content = content
        )
    }
}

// Extension property to access extended colors
object ConstructionProTheme {
    val extendedColors: ExtendedColors
        @Composable
        get() = LocalExtendedColors.current
}
