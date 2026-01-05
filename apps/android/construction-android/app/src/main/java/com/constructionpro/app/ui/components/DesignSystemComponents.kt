package com.constructionpro.app.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.constructionpro.app.ui.theme.*

// ============================================
// ICON CIRCLE
// Consistent circular icon containers matching iOS
// ============================================

enum class IconCircleSize {
    Small,  // 40dp
    Medium, // 48dp
    Large   // 56dp
}

@Composable
fun IconCircle(
    icon: ImageVector,
    modifier: Modifier = Modifier,
    size: IconCircleSize = IconCircleSize.Medium,
    backgroundColor: Color = AppColors.primary100,
    iconColor: Color = AppColors.primary600,
    contentDescription: String? = null
) {
    val (circleSize, iconSize) = when (size) {
        IconCircleSize.Small -> AppSpacing.iconCircleSmall to AppSpacing.iconSmall
        IconCircleSize.Medium -> AppSpacing.iconCircleMedium to AppSpacing.iconMedium
        IconCircleSize.Large -> AppSpacing.iconCircleLarge to AppSpacing.iconLarge
    }

    Box(
        modifier = modifier
            .size(circleSize)
            .clip(RoundedCornerShape(AppSpacing.radiusMedium))
            .background(backgroundColor),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = iconColor,
            modifier = Modifier.size(iconSize)
        )
    }
}

// ============================================
// APP CARD
// Standard card using design tokens
// ============================================

@Composable
fun AppCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed && onClick != null) 0.98f else 1f,
        animationSpec = tween(100),
        label = "app_card_scale"
    )

    Surface(
        modifier = modifier
            .scale(scale)
            .then(
                if (onClick != null) {
                    Modifier.clickable(
                        interactionSource = interactionSource,
                        indication = null,
                        onClick = onClick
                    )
                } else Modifier
            ),
        shape = RoundedCornerShape(AppSpacing.cardRadius),
        color = AppColors.cardBackground,
        shadowElevation = AppElevation.low,
        border = androidx.compose.foundation.BorderStroke(1.dp, AppColors.divider)
    ) {
        Column(
            modifier = Modifier.padding(AppSpacing.cardPadding),
            content = content
        )
    }
}

// ============================================
// STAT CARD - Full size
// Matches iOS StatCard
// ============================================

@Composable
fun StatCard(
    label: String,
    value: String,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    iconBackgroundColor: Color = AppColors.primary100,
    iconColor: Color = AppColors.primary600,
    onClick: (() -> Unit)? = null
) {
    AppCard(
        modifier = modifier,
        onClick = onClick
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = label,
                    style = AppTypography.secondary,
                    color = AppColors.textSecondary
                )
                Spacer(modifier = Modifier.height(AppSpacing.xxs))
                Text(
                    text = value,
                    style = AppTypography.statMedium,
                    color = AppColors.textPrimary
                )
            }
            IconCircle(
                icon = icon,
                size = IconCircleSize.Medium,
                backgroundColor = iconBackgroundColor,
                iconColor = iconColor
            )
        }
    }
}

// ============================================
// COMPACT STAT CARD
// Smaller stat card for dashboard grids
// ============================================

@Composable
fun CompactStatCard(
    label: String,
    value: String,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    iconBackgroundColor: Color = AppColors.primary100,
    iconColor: Color = AppColors.primary600,
    onClick: (() -> Unit)? = null
) {
    AppCard(
        modifier = modifier,
        onClick = onClick
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            IconCircle(
                icon = icon,
                size = IconCircleSize.Small,
                backgroundColor = iconBackgroundColor,
                iconColor = iconColor
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = value,
                    style = AppTypography.statSmall,
                    color = AppColors.textPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = label,
                    style = AppTypography.caption,
                    color = AppColors.textSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

// ============================================
// ACTION CARD
// Card with action button, matches iOS ActionCard
// ============================================

@Composable
fun ActionCard(
    title: String,
    description: String,
    icon: ImageVector,
    actionText: String,
    onAction: () -> Unit,
    modifier: Modifier = Modifier,
    iconBackgroundColor: Color = AppColors.primary100,
    iconColor: Color = AppColors.primary600
) {
    AppCard(modifier = modifier) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.Top
        ) {
            IconCircle(
                icon = icon,
                size = IconCircleSize.Medium,
                backgroundColor = iconBackgroundColor,
                iconColor = iconColor
            )
            Spacer(modifier = Modifier.width(AppSpacing.md))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = AppTypography.bodySemibold,
                    color = AppColors.textPrimary
                )
                Spacer(modifier = Modifier.height(AppSpacing.xxs))
                Text(
                    text = description,
                    style = AppTypography.secondary,
                    color = AppColors.textSecondary
                )
                Spacer(modifier = Modifier.height(AppSpacing.sm))
                PrimaryButton(
                    text = actionText,
                    onClick = onAction,
                    size = ButtonSize.Small
                )
            }
        }
    }
}

// ============================================
// PRIMARY BUTTON
// Primary action button using design tokens
// ============================================

enum class ButtonSize {
    Small,   // 40dp height
    Medium,  // 48dp height
    Large    // 56dp height
}

@Composable
fun PrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    size: ButtonSize = ButtonSize.Medium,
    enabled: Boolean = true,
    loading: Boolean = false,
    icon: ImageVector? = null,
    fullWidth: Boolean = false
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed && enabled) 0.98f else 1f,
        animationSpec = tween(100),
        label = "primary_button_scale"
    )

    val (height, textStyle, horizontalPadding) = when (size) {
        ButtonSize.Small -> Triple(40.dp, AppTypography.buttonSmall, AppSpacing.md)
        ButtonSize.Medium -> Triple(AppSpacing.buttonHeight, AppTypography.button, AppSpacing.lg)
        ButtonSize.Large -> Triple(AppSpacing.buttonHeightLarge, AppTypography.buttonLarge, AppSpacing.xl)
    }

    Button(
        onClick = { if (!loading) onClick() },
        modifier = modifier
            .scale(scale)
            .defaultMinSize(minHeight = height)
            .then(if (fullWidth) Modifier.fillMaxWidth() else Modifier),
        enabled = enabled && !loading,
        shape = RoundedCornerShape(AppSpacing.radiusMedium),
        colors = ButtonDefaults.buttonColors(
            containerColor = AppColors.primary600,
            contentColor = Color.White,
            disabledContainerColor = AppColors.primary600.copy(alpha = 0.5f),
            disabledContentColor = Color.White.copy(alpha = 0.5f)
        ),
        contentPadding = PaddingValues(horizontal = horizontalPadding),
        interactionSource = interactionSource
    ) {
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.size(AppSpacing.iconMedium),
                color = Color.White,
                strokeWidth = 2.dp
            )
            Spacer(modifier = Modifier.width(AppSpacing.xs))
        } else if (icon != null) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(AppSpacing.iconMedium)
            )
            Spacer(modifier = Modifier.width(AppSpacing.xs))
        }
        Text(
            text = text,
            style = textStyle
        )
    }
}

// ============================================
// SECONDARY BUTTON
// Outlined style button
// ============================================

@Composable
fun SecondaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    size: ButtonSize = ButtonSize.Medium,
    enabled: Boolean = true,
    loading: Boolean = false,
    icon: ImageVector? = null,
    fullWidth: Boolean = false
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed && enabled) 0.98f else 1f,
        animationSpec = tween(100),
        label = "secondary_button_scale"
    )

    val (height, textStyle, horizontalPadding) = when (size) {
        ButtonSize.Small -> Triple(40.dp, AppTypography.buttonSmall, AppSpacing.md)
        ButtonSize.Medium -> Triple(AppSpacing.buttonHeight, AppTypography.button, AppSpacing.lg)
        ButtonSize.Large -> Triple(AppSpacing.buttonHeightLarge, AppTypography.buttonLarge, AppSpacing.xl)
    }

    OutlinedButton(
        onClick = { if (!loading) onClick() },
        modifier = modifier
            .scale(scale)
            .defaultMinSize(minHeight = height)
            .then(if (fullWidth) Modifier.fillMaxWidth() else Modifier),
        enabled = enabled && !loading,
        shape = RoundedCornerShape(AppSpacing.radiusMedium),
        colors = ButtonDefaults.outlinedButtonColors(
            contentColor = AppColors.primary600,
            disabledContentColor = AppColors.primary600.copy(alpha = 0.5f)
        ),
        border = androidx.compose.foundation.BorderStroke(
            width = 1.5.dp,
            color = if (enabled) AppColors.primary600 else AppColors.primary600.copy(alpha = 0.5f)
        ),
        contentPadding = PaddingValues(horizontal = horizontalPadding),
        interactionSource = interactionSource
    ) {
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.size(AppSpacing.iconMedium),
                color = AppColors.primary600,
                strokeWidth = 2.dp
            )
            Spacer(modifier = Modifier.width(AppSpacing.xs))
        } else if (icon != null) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(AppSpacing.iconMedium)
            )
            Spacer(modifier = Modifier.width(AppSpacing.xs))
        }
        Text(
            text = text,
            style = textStyle
        )
    }
}

// ============================================
// DESTRUCTIVE BUTTON
// For dangerous/delete actions
// ============================================

@Composable
fun DestructiveButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    size: ButtonSize = ButtonSize.Medium,
    enabled: Boolean = true,
    loading: Boolean = false,
    icon: ImageVector? = null,
    fullWidth: Boolean = false
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed && enabled) 0.98f else 1f,
        animationSpec = tween(100),
        label = "destructive_button_scale"
    )

    val (height, textStyle, horizontalPadding) = when (size) {
        ButtonSize.Small -> Triple(40.dp, AppTypography.buttonSmall, AppSpacing.md)
        ButtonSize.Medium -> Triple(AppSpacing.buttonHeight, AppTypography.button, AppSpacing.lg)
        ButtonSize.Large -> Triple(AppSpacing.buttonHeightLarge, AppTypography.buttonLarge, AppSpacing.xl)
    }

    Button(
        onClick = { if (!loading) onClick() },
        modifier = modifier
            .scale(scale)
            .defaultMinSize(minHeight = height)
            .then(if (fullWidth) Modifier.fillMaxWidth() else Modifier),
        enabled = enabled && !loading,
        shape = RoundedCornerShape(AppSpacing.radiusMedium),
        colors = ButtonDefaults.buttonColors(
            containerColor = AppColors.error,
            contentColor = Color.White,
            disabledContainerColor = AppColors.error.copy(alpha = 0.5f),
            disabledContentColor = Color.White.copy(alpha = 0.5f)
        ),
        contentPadding = PaddingValues(horizontal = horizontalPadding),
        interactionSource = interactionSource
    ) {
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.size(AppSpacing.iconMedium),
                color = Color.White,
                strokeWidth = 2.dp
            )
            Spacer(modifier = Modifier.width(AppSpacing.xs))
        } else if (icon != null) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(AppSpacing.iconMedium)
            )
            Spacer(modifier = Modifier.width(AppSpacing.xs))
        }
        Text(
            text = text,
            style = textStyle
        )
    }
}

// ============================================
// STATUS BADGE
// Matches iOS StatusBadge
// ============================================

@Composable
fun StatusBadge(
    status: String,
    modifier: Modifier = Modifier
) {
    val textColor = StatusColors.forStatus(status)
    val backgroundColor = StatusColors.backgroundForStatus(status)

    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(50),
        color = backgroundColor
    ) {
        Text(
            text = status.replace("_", " ").lowercase()
                .replaceFirstChar { it.uppercase() },
            modifier = Modifier.padding(horizontal = AppSpacing.sm, vertical = AppSpacing.xxs),
            style = AppTypography.captionMedium,
            color = textColor
        )
    }
}

// ============================================
// LIST ITEM CARD
// Standard list item with icon, title, subtitle
// ============================================

@Composable
fun ListItemCard(
    title: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    icon: ImageVector? = null,
    iconBackgroundColor: Color = AppColors.primary100,
    iconColor: Color = AppColors.primary600,
    trailingContent: @Composable (() -> Unit)? = null,
    showChevron: Boolean = true
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.98f else 1f,
        animationSpec = tween(100),
        label = "list_item_scale"
    )

    Surface(
        modifier = modifier
            .scale(scale)
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                onClick = onClick
            ),
        shape = RoundedCornerShape(AppSpacing.cardRadius),
        color = AppColors.cardBackground,
        shadowElevation = AppElevation.low,
        border = androidx.compose.foundation.BorderStroke(1.dp, AppColors.divider)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(AppSpacing.md),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (icon != null) {
                IconCircle(
                    icon = icon,
                    size = IconCircleSize.Medium,
                    backgroundColor = iconBackgroundColor,
                    iconColor = iconColor
                )
                Spacer(modifier = Modifier.width(AppSpacing.md))
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = AppTypography.bodySemibold,
                    color = AppColors.textPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (subtitle != null) {
                    Spacer(modifier = Modifier.height(AppSpacing.xxs))
                    Text(
                        text = subtitle,
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            if (trailingContent != null) {
                Spacer(modifier = Modifier.width(AppSpacing.sm))
                trailingContent()
            }

            if (showChevron) {
                Spacer(modifier = Modifier.width(AppSpacing.xs))
                Icon(
                    imageVector = Icons.Default.ChevronRight,
                    contentDescription = null,
                    tint = AppColors.textMuted,
                    modifier = Modifier.size(AppSpacing.iconLarge)
                )
            }
        }
    }
}

// ============================================
// SECTION HEADER
// Section title with optional action
// ============================================

@Composable
fun SectionHeader(
    title: String,
    modifier: Modifier = Modifier,
    action: String? = null,
    onAction: (() -> Unit)? = null
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = AppSpacing.xs),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = title,
            style = AppTypography.heading3,
            color = AppColors.textPrimary
        )
        if (action != null && onAction != null) {
            TextButton(onClick = onAction) {
                Text(
                    text = action,
                    style = AppTypography.secondaryMedium,
                    color = AppColors.primary600
                )
            }
        }
    }
}

// ============================================
// INFO ROW
// Label-value pair row
// ============================================

@Composable
fun InfoRow(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    valueColor: Color = AppColors.textPrimary
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = AppSpacing.xs),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = AppTypography.secondary,
            color = AppColors.textSecondary
        )
        Text(
            text = value,
            style = AppTypography.secondaryMedium,
            color = valueColor
        )
    }
}

// ============================================
// BANNER ALERTS
// Info, Warning, Error banners
// ============================================

enum class BannerType {
    Info,
    Warning,
    Error,
    Success
}

@Composable
fun AlertBanner(
    message: String,
    type: BannerType,
    modifier: Modifier = Modifier,
    onDismiss: (() -> Unit)? = null
) {
    val (backgroundColor, borderColor, textColor) = when (type) {
        BannerType.Info -> Triple(AppColors.infoLight, AppColors.info, AppColors.info)
        BannerType.Warning -> Triple(AppColors.warningLight, AppColors.warning, Color(0xFF92400E))
        BannerType.Error -> Triple(AppColors.errorLight, AppColors.error, AppColors.error)
        BannerType.Success -> Triple(AppColors.successLight, AppColors.success, Color(0xFF065F46))
    }

    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(AppSpacing.radiusSmall),
        color = backgroundColor,
        border = androidx.compose.foundation.BorderStroke(1.dp, borderColor.copy(alpha = 0.3f))
    ) {
        Row(
            modifier = Modifier.padding(AppSpacing.sm),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = message,
                style = AppTypography.secondary,
                color = textColor,
                modifier = Modifier.weight(1f)
            )
            if (onDismiss != null) {
                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Dismiss",
                        tint = textColor,
                        modifier = Modifier.size(AppSpacing.iconSmall)
                    )
                }
            }
        }
    }
}

// ============================================
// EMPTY STATE
// Centered empty state with icon
// ============================================

@Composable
fun EmptyState(
    icon: ImageVector,
    title: String,
    modifier: Modifier = Modifier,
    description: String? = null,
    actionText: String? = null,
    onAction: (() -> Unit)? = null
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(AppSpacing.xxl),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(80.dp)
                .clip(CircleShape)
                .background(AppColors.gray100),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = AppColors.textMuted,
                modifier = Modifier.size(40.dp)
            )
        }

        Spacer(modifier = Modifier.height(AppSpacing.lg))

        Text(
            text = title,
            style = AppTypography.heading3,
            color = AppColors.textPrimary,
            textAlign = TextAlign.Center
        )

        if (description != null) {
            Spacer(modifier = Modifier.height(AppSpacing.xs))
            Text(
                text = description,
                style = AppTypography.secondary,
                color = AppColors.textSecondary,
                textAlign = TextAlign.Center
            )
        }

        if (actionText != null && onAction != null) {
            Spacer(modifier = Modifier.height(AppSpacing.lg))
            PrimaryButton(
                text = actionText,
                onClick = onAction
            )
        }
    }
}

// ============================================
// LOADING STATE
// Centered loading indicator
// ============================================

@Composable
fun LoadingIndicator(
    modifier: Modifier = Modifier,
    message: String? = null
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(AppSpacing.xxl),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        CircularProgressIndicator(
            modifier = Modifier.size(AppSpacing.iconCircleMedium),
            color = AppColors.primary600,
            strokeWidth = 3.dp
        )
        if (message != null) {
            Spacer(modifier = Modifier.height(AppSpacing.md))
            Text(
                text = message,
                style = AppTypography.secondary,
                color = AppColors.textSecondary
            )
        }
    }
}
