package com.constructionpro.app.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.constructionpro.app.ui.theme.*

// ============================================
// TEXT INPUT FIELD
// Standard text input with label
// ============================================

@Composable
fun AppTextField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    label: String? = null,
    placeholder: String? = null,
    leadingIcon: ImageVector? = null,
    trailingIcon: @Composable (() -> Unit)? = null,
    isError: Boolean = false,
    errorMessage: String? = null,
    helperText: String? = null,
    enabled: Boolean = true,
    readOnly: Boolean = false,
    singleLine: Boolean = true,
    maxLines: Int = if (singleLine) 1 else Int.MAX_VALUE,
    minLines: Int = 1,
    keyboardType: KeyboardType = KeyboardType.Text,
    imeAction: ImeAction = ImeAction.Default,
    onImeAction: () -> Unit = {}
) {
    Column(modifier = modifier) {
        if (label != null) {
            Text(
                text = label,
                style = AppTypography.labelSmall,
                color = if (isError) AppColors.error else AppColors.textPrimary,
                modifier = Modifier.padding(bottom = AppSpacing.xs)
            )
        }

        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier
                .fillMaxWidth()
                .defaultMinSize(minHeight = AppSpacing.inputHeight),
            enabled = enabled,
            readOnly = readOnly,
            singleLine = singleLine,
            maxLines = maxLines,
            minLines = minLines,
            placeholder = placeholder?.let {
                { Text(it, style = AppTypography.body, color = AppColors.textMuted) }
            },
            leadingIcon = leadingIcon?.let {
                {
                    Icon(
                        imageVector = it,
                        contentDescription = null,
                        tint = if (isError) AppColors.error else AppColors.textSecondary,
                        modifier = Modifier.size(AppSpacing.iconMedium)
                    )
                }
            },
            trailingIcon = trailingIcon,
            isError = isError,
            textStyle = AppTypography.body.copy(color = AppColors.textPrimary),
            keyboardOptions = KeyboardOptions(
                keyboardType = keyboardType,
                imeAction = imeAction
            ),
            keyboardActions = KeyboardActions(
                onDone = { onImeAction() },
                onSearch = { onImeAction() },
                onGo = { onImeAction() },
                onNext = { onImeAction() }
            ),
            shape = RoundedCornerShape(AppSpacing.radiusMedium),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = AppColors.primary600,
                unfocusedBorderColor = AppColors.border,
                errorBorderColor = AppColors.error,
                focusedContainerColor = AppColors.cardBackground,
                unfocusedContainerColor = AppColors.cardBackground,
                disabledContainerColor = AppColors.gray100,
                cursorColor = AppColors.primary600
            )
        )

        if (isError && errorMessage != null) {
            Spacer(modifier = Modifier.height(AppSpacing.xxs))
            Text(
                text = errorMessage,
                style = AppTypography.caption,
                color = AppColors.error
            )
        } else if (helperText != null) {
            Spacer(modifier = Modifier.height(AppSpacing.xxs))
            Text(
                text = helperText,
                style = AppTypography.caption,
                color = AppColors.textSecondary
            )
        }
    }
}

// ============================================
// PASSWORD INPUT FIELD
// Text input with visibility toggle
// ============================================

@Composable
fun PasswordTextField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    label: String? = null,
    placeholder: String? = null,
    isError: Boolean = false,
    errorMessage: String? = null,
    enabled: Boolean = true,
    imeAction: ImeAction = ImeAction.Done,
    onImeAction: () -> Unit = {}
) {
    var passwordVisible by remember { mutableStateOf(false) }

    AppTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier,
        label = label,
        placeholder = placeholder,
        leadingIcon = Icons.Default.Lock,
        trailingIcon = {
            IconButton(
                onClick = { passwordVisible = !passwordVisible },
                modifier = Modifier.size(AppSpacing.minTouchTarget)
            ) {
                Icon(
                    imageVector = if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                    contentDescription = if (passwordVisible) "Hide password" else "Show password",
                    tint = AppColors.textSecondary,
                    modifier = Modifier.size(AppSpacing.iconMedium)
                )
            }
        },
        isError = isError,
        errorMessage = errorMessage,
        enabled = enabled,
        keyboardType = if (passwordVisible) KeyboardType.Text else KeyboardType.Password,
        imeAction = imeAction,
        onImeAction = onImeAction
    )
}

// ============================================
// SEARCH INPUT FIELD
// Search bar with clear button
// ============================================

@Composable
fun SearchField(
    query: String,
    onQueryChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "Search...",
    onSearch: () -> Unit = {}
) {
    OutlinedTextField(
        value = query,
        onValueChange = onQueryChange,
        modifier = modifier
            .fillMaxWidth()
            .defaultMinSize(minHeight = AppSpacing.inputHeight),
        placeholder = {
            Text(
                text = placeholder,
                style = AppTypography.body,
                color = AppColors.textMuted
            )
        },
        leadingIcon = {
            Icon(
                imageVector = Icons.Default.Search,
                contentDescription = "Search",
                tint = AppColors.textSecondary,
                modifier = Modifier.size(AppSpacing.iconMedium)
            )
        },
        trailingIcon = if (query.isNotEmpty()) {
            {
                IconButton(
                    onClick = { onQueryChange("") },
                    modifier = Modifier.size(AppSpacing.minTouchTarget)
                ) {
                    Icon(
                        imageVector = Icons.Default.Clear,
                        contentDescription = "Clear search",
                        tint = AppColors.textSecondary,
                        modifier = Modifier.size(AppSpacing.iconMedium)
                    )
                }
            }
        } else null,
        singleLine = true,
        textStyle = AppTypography.body.copy(color = AppColors.textPrimary),
        shape = RoundedCornerShape(AppSpacing.radiusMedium),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = AppColors.primary600,
            unfocusedBorderColor = AppColors.border,
            focusedContainerColor = AppColors.cardBackground,
            unfocusedContainerColor = AppColors.gray50,
            cursorColor = AppColors.primary600
        ),
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
        keyboardActions = KeyboardActions(onSearch = { onSearch() })
    )
}

// ============================================
// TEXTAREA / MULTILINE INPUT
// For notes, descriptions, etc.
// ============================================

@Composable
fun TextArea(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    label: String? = null,
    placeholder: String? = null,
    isError: Boolean = false,
    errorMessage: String? = null,
    enabled: Boolean = true,
    minLines: Int = 3,
    maxLines: Int = 6,
    maxCharacters: Int? = null
) {
    Column(modifier = modifier) {
        if (label != null) {
            Text(
                text = label,
                style = AppTypography.labelSmall,
                color = if (isError) AppColors.error else AppColors.textPrimary,
                modifier = Modifier.padding(bottom = AppSpacing.xs)
            )
        }

        OutlinedTextField(
            value = value,
            onValueChange = { newValue ->
                if (maxCharacters == null || newValue.length <= maxCharacters) {
                    onValueChange(newValue)
                }
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = enabled,
            singleLine = false,
            minLines = minLines,
            maxLines = maxLines,
            placeholder = placeholder?.let {
                { Text(it, style = AppTypography.body, color = AppColors.textMuted) }
            },
            isError = isError,
            textStyle = AppTypography.body.copy(color = AppColors.textPrimary),
            shape = RoundedCornerShape(AppSpacing.radiusMedium),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = AppColors.primary600,
                unfocusedBorderColor = AppColors.border,
                errorBorderColor = AppColors.error,
                focusedContainerColor = AppColors.cardBackground,
                unfocusedContainerColor = AppColors.cardBackground,
                disabledContainerColor = AppColors.gray100,
                cursorColor = AppColors.primary600
            )
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = AppSpacing.xxs),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            if (isError && errorMessage != null) {
                Text(
                    text = errorMessage,
                    style = AppTypography.caption,
                    color = AppColors.error
                )
            } else {
                Spacer(modifier = Modifier.weight(1f))
            }

            if (maxCharacters != null) {
                Text(
                    text = "${value.length}/$maxCharacters",
                    style = AppTypography.caption,
                    color = if (value.length >= maxCharacters) AppColors.error else AppColors.textSecondary
                )
            }
        }
    }
}

// ============================================
// SELECTION CHIPS
// For filtering, selection options
// ============================================

@Composable
fun SelectionChip(
    text: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true
) {
    val backgroundColor by animateColorAsState(
        targetValue = when {
            !enabled -> AppColors.gray100
            selected -> AppColors.primary600
            else -> Color.Transparent
        },
        animationSpec = tween(150),
        label = "chip_bg"
    )
    val contentColor by animateColorAsState(
        targetValue = when {
            !enabled -> AppColors.textMuted
            selected -> Color.White
            else -> AppColors.textSecondary
        },
        animationSpec = tween(150),
        label = "chip_content"
    )
    val borderColor by animateColorAsState(
        targetValue = when {
            !enabled -> AppColors.gray200
            selected -> AppColors.primary600
            else -> AppColors.border
        },
        animationSpec = tween(150),
        label = "chip_border"
    )

    Surface(
        modifier = modifier
            .defaultMinSize(minHeight = 36.dp)
            .clickable(enabled = enabled, onClick = onClick),
        shape = RoundedCornerShape(AppSpacing.radiusSmall),
        color = backgroundColor,
        border = BorderStroke(1.dp, borderColor)
    ) {
        Text(
            text = text,
            style = AppTypography.secondaryMedium,
            color = contentColor,
            modifier = Modifier.padding(
                horizontal = AppSpacing.sm,
                vertical = AppSpacing.xs
            )
        )
    }
}

// ============================================
// CHIP ROW
// Horizontal row of selectable chips
// ============================================

@Composable
fun ChipRow(
    options: List<String>,
    selected: String?,
    onSelected: (String) -> Unit,
    modifier: Modifier = Modifier,
    displayTransform: (String) -> String = { it.replace("_", " ") }
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
    ) {
        options.forEach { option ->
            SelectionChip(
                text = displayTransform(option),
                selected = option == selected,
                onClick = { onSelected(option) }
            )
        }
    }
}

// ============================================
// DROPDOWN SELECTOR
// Clickable field that opens a menu
// ============================================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DropdownSelector(
    value: String,
    options: List<String>,
    onOptionSelected: (String) -> Unit,
    modifier: Modifier = Modifier,
    label: String? = null,
    placeholder: String = "Select...",
    displayTransform: (String) -> String = { it },
    enabled: Boolean = true,
    isError: Boolean = false,
    errorMessage: String? = null
) {
    var expanded by remember { mutableStateOf(false) }

    Column(modifier = modifier) {
        if (label != null) {
            Text(
                text = label,
                style = AppTypography.labelSmall,
                color = if (isError) AppColors.error else AppColors.textPrimary,
                modifier = Modifier.padding(bottom = AppSpacing.xs)
            )
        }

        ExposedDropdownMenuBox(
            expanded = expanded,
            onExpandedChange = { if (enabled) expanded = it }
        ) {
            OutlinedTextField(
                value = if (value.isNotEmpty()) displayTransform(value) else "",
                onValueChange = {},
                modifier = Modifier
                    .fillMaxWidth()
                    .menuAnchor(),
                readOnly = true,
                enabled = enabled,
                placeholder = { Text(placeholder, style = AppTypography.body, color = AppColors.textMuted) },
                trailingIcon = {
                    ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded)
                },
                isError = isError,
                textStyle = AppTypography.body.copy(color = AppColors.textPrimary),
                shape = RoundedCornerShape(AppSpacing.radiusMedium),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = AppColors.primary600,
                    unfocusedBorderColor = AppColors.border,
                    errorBorderColor = AppColors.error,
                    focusedContainerColor = AppColors.cardBackground,
                    unfocusedContainerColor = AppColors.cardBackground,
                    disabledContainerColor = AppColors.gray100
                )
            )

            ExposedDropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false }
            ) {
                options.forEach { option ->
                    DropdownMenuItem(
                        text = {
                            Text(
                                text = displayTransform(option),
                                style = AppTypography.body,
                                color = AppColors.textPrimary
                            )
                        },
                        onClick = {
                            onOptionSelected(option)
                            expanded = false
                        },
                        modifier = Modifier.defaultMinSize(minHeight = AppSpacing.minTouchTarget)
                    )
                }
            }
        }

        if (isError && errorMessage != null) {
            Spacer(modifier = Modifier.height(AppSpacing.xxs))
            Text(
                text = errorMessage,
                style = AppTypography.caption,
                color = AppColors.error
            )
        }
    }
}

// ============================================
// CHECKBOX ROW
// Checkbox with label
// ============================================

@Composable
fun CheckboxRow(
    text: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    description: String? = null
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .defaultMinSize(minHeight = AppSpacing.minTouchTarget)
            .clickable(enabled = enabled) { onCheckedChange(!checked) }
            .padding(vertical = AppSpacing.xs),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Checkbox(
            checked = checked,
            onCheckedChange = onCheckedChange,
            enabled = enabled,
            colors = CheckboxDefaults.colors(
                checkedColor = AppColors.primary600,
                uncheckedColor = AppColors.border,
                checkmarkColor = Color.White,
                disabledCheckedColor = AppColors.primary600.copy(alpha = 0.5f),
                disabledUncheckedColor = AppColors.gray300
            )
        )
        Spacer(modifier = Modifier.width(AppSpacing.sm))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = text,
                style = AppTypography.body,
                color = if (enabled) AppColors.textPrimary else AppColors.textMuted
            )
            if (description != null) {
                Spacer(modifier = Modifier.height(AppSpacing.xxs))
                Text(
                    text = description,
                    style = AppTypography.caption,
                    color = AppColors.textSecondary
                )
            }
        }
    }
}

// ============================================
// SWITCH ROW
// Toggle switch with label
// ============================================

@Composable
fun SwitchRow(
    text: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    description: String? = null
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .defaultMinSize(minHeight = AppSpacing.minTouchTarget)
            .clickable(enabled = enabled) { onCheckedChange(!checked) }
            .padding(vertical = AppSpacing.xs),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = text,
                style = AppTypography.body,
                color = if (enabled) AppColors.textPrimary else AppColors.textMuted
            )
            if (description != null) {
                Spacer(modifier = Modifier.height(AppSpacing.xxs))
                Text(
                    text = description,
                    style = AppTypography.caption,
                    color = AppColors.textSecondary
                )
            }
        }
        Spacer(modifier = Modifier.width(AppSpacing.md))
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            enabled = enabled,
            colors = SwitchDefaults.colors(
                checkedThumbColor = Color.White,
                checkedTrackColor = AppColors.primary600,
                uncheckedThumbColor = Color.White,
                uncheckedTrackColor = AppColors.gray300,
                disabledCheckedThumbColor = Color.White.copy(alpha = 0.5f),
                disabledCheckedTrackColor = AppColors.primary600.copy(alpha = 0.5f),
                disabledUncheckedThumbColor = Color.White.copy(alpha = 0.5f),
                disabledUncheckedTrackColor = AppColors.gray200
            )
        )
    }
}

// ============================================
// DATE/TIME PICKER BUTTON
// Styled button for date/time selection
// ============================================

@Composable
fun DatePickerButton(
    value: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    label: String? = null,
    placeholder: String = "Select date",
    enabled: Boolean = true,
    isError: Boolean = false,
    errorMessage: String? = null
) {
    Column(modifier = modifier) {
        if (label != null) {
            Text(
                text = label,
                style = AppTypography.labelSmall,
                color = if (isError) AppColors.error else AppColors.textPrimary,
                modifier = Modifier.padding(bottom = AppSpacing.xs)
            )
        }

        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .defaultMinSize(minHeight = AppSpacing.inputHeight)
                .clickable(enabled = enabled, onClick = onClick),
            shape = RoundedCornerShape(AppSpacing.radiusMedium),
            color = if (enabled) AppColors.cardBackground else AppColors.gray100,
            border = BorderStroke(
                width = 1.dp,
                color = when {
                    isError -> AppColors.error
                    else -> AppColors.border
                }
            )
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = AppSpacing.md),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.CalendarToday,
                    contentDescription = null,
                    tint = if (enabled) AppColors.textSecondary else AppColors.textMuted,
                    modifier = Modifier.size(AppSpacing.iconMedium)
                )
                Spacer(modifier = Modifier.width(AppSpacing.sm))
                Text(
                    text = value.ifEmpty { placeholder },
                    style = AppTypography.body,
                    color = when {
                        value.isEmpty() -> AppColors.textMuted
                        enabled -> AppColors.textPrimary
                        else -> AppColors.textSecondary
                    },
                    modifier = Modifier.weight(1f)
                )
                Icon(
                    imageVector = Icons.Default.ChevronRight,
                    contentDescription = null,
                    tint = AppColors.textMuted,
                    modifier = Modifier.size(AppSpacing.iconMedium)
                )
            }
        }

        if (isError && errorMessage != null) {
            Spacer(modifier = Modifier.height(AppSpacing.xxs))
            Text(
                text = errorMessage,
                style = AppTypography.caption,
                color = AppColors.error
            )
        }
    }
}
