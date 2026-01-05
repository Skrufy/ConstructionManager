package com.constructionpro.app.ui.drawing

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.ChatBubble
import androidx.compose.material.icons.filled.Circle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.Create
import androidx.compose.material.icons.filled.DragHandle
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.FormatShapes
import androidx.compose.material.icons.filled.Gesture
import androidx.compose.material.icons.filled.GridOn
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.OpenWith
import androidx.compose.material.icons.filled.PanTool
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material.icons.filled.Redo
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Square
import androidx.compose.material.icons.filled.Straighten
import androidx.compose.material.icons.filled.TouchApp
import androidx.compose.material.icons.filled.Undo
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import com.constructionpro.app.data.model.AnnotationColors
import com.constructionpro.app.data.model.AnnotationTool
import kotlin.math.roundToInt

/**
 * Floating minimal toolbar for annotation tools.
 * Starts collapsed as a semi-transparent FAB, expands on tap to show all tools.
 * Designed for field workers with 56dp+ touch targets.
 */
@Composable
fun AnnotationToolbar(
    currentTool: AnnotationTool,
    currentColor: String,
    showAnnotations: Boolean,
    canUndo: Boolean,
    canRedo: Boolean,
    isVisible: Boolean = true,
    onToolSelected: (AnnotationTool) -> Unit,
    onColorSelected: (String) -> Unit,
    onUndo: () -> Unit,
    onRedo: () -> Unit,
    onToggleAnnotations: () -> Unit,
    onCalibrate: () -> Unit,
    modifier: Modifier = Modifier
) {
    // Color picker visibility
    var showColorPicker by remember { mutableStateOf(false) }

    // Toolbar expanded state - starts COLLAPSED by default
    var isExpanded by remember { mutableStateOf(false) }

    // Draggable toolbar position
    var offsetX by remember { mutableFloatStateOf(0f) }
    var offsetY by remember { mutableFloatStateOf(0f) }

    // Get screen dimensions to constrain dragging
    val configuration = LocalConfiguration.current
    val density = LocalDensity.current
    val screenWidth = with(density) { configuration.screenWidthDp.dp.toPx() }
    val screenHeight = with(density) { configuration.screenHeightDp.dp.toPx() }

    // Toolbar size constraints (approximate)
    val toolbarWidth = with(density) { 400.dp.toPx() } // Approximate expanded width
    val toolbarHeight = with(density) { 200.dp.toPx() } // Approximate expanded height
    val fabSize = with(density) { 64.dp.toPx() } // FAB size

    AnimatedVisibility(
        visible = isVisible,
        enter = fadeIn() + slideInVertically { it },
        exit = fadeOut() + slideOutVertically { it }
    ) {
        Box(
            modifier = modifier
                .fillMaxWidth()
                .padding(bottom = 24.dp)
                .offset { IntOffset(offsetX.roundToInt(), offsetY.roundToInt()) },
            contentAlignment = Alignment.BottomCenter
        ) {
            if (isExpanded) {
                // Expanded toolbar
                Card(
                    modifier = Modifier
                        .shadow(8.dp, RoundedCornerShape(16.dp))
                        .pointerInput(Unit) {
                            detectDragGestures { change, dragAmount ->
                                change.consume()
                                // No constraints - web-style free dragging
                                offsetX += dragAmount.x
                                offsetY += dragAmount.y
                            }
                        },
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.75f)
                    )
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        // Main tools row - 6 essential tools with labels
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            LabeledToolButton(
                                icon = Icons.Default.TouchApp,
                                label = "Select",
                                isSelected = currentTool == AnnotationTool.SELECT,
                                color = currentColor,
                                onClick = { onToolSelected(AnnotationTool.SELECT) }
                            )
                            LabeledToolButton(
                                icon = Icons.Default.OpenWith,
                                label = "Pan",
                                isSelected = currentTool == AnnotationTool.PAN,
                                color = currentColor,
                                onClick = { onToolSelected(AnnotationTool.PAN) }
                            )
                            LabeledToolButton(
                                icon = Icons.Default.LocationOn,
                                label = "Pin",
                                isSelected = currentTool == AnnotationTool.PIN,
                                color = currentColor,
                                onClick = { onToolSelected(AnnotationTool.PIN) }
                            )
                            LabeledToolButton(
                                icon = Icons.Default.Straighten,
                                label = "Measure",
                                isSelected = currentTool == AnnotationTool.MEASUREMENT,
                                color = currentColor,
                                onClick = { onToolSelected(AnnotationTool.MEASUREMENT) }
                            )
                            LabeledToolButton(
                                icon = Icons.Default.Gesture,
                                label = "Freehand",
                                isSelected = currentTool == AnnotationTool.FREEHAND,
                                color = currentColor,
                                onClick = { onToolSelected(AnnotationTool.FREEHAND) }
                            )
                            LabeledToolButton(
                                icon = Icons.Default.Straighten,
                                label = "Calibrate",
                                isSelected = currentTool == AnnotationTool.CALIBRATE,
                                color = currentColor,
                                onClick = { onCalibrate() }
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // Secondary controls row
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Color picker button
                            ColorPickerButton(
                                currentColor = currentColor,
                                onClick = { showColorPicker = !showColorPicker }
                            )

                            Spacer(modifier = Modifier.width(4.dp))

                            // Undo/Redo
                            IconButton(
                                onClick = onUndo,
                                enabled = canUndo,
                                modifier = Modifier.size(48.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Undo,
                                    contentDescription = "Undo",
                                    tint = if (canUndo)
                                        MaterialTheme.colorScheme.primary
                                    else
                                        MaterialTheme.colorScheme.onSurface.copy(alpha = 0.38f)
                                )
                            }

                            IconButton(
                                onClick = onRedo,
                                enabled = canRedo,
                                modifier = Modifier.size(48.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Redo,
                                    contentDescription = "Redo",
                                    tint = if (canRedo)
                                        MaterialTheme.colorScheme.primary
                                    else
                                        MaterialTheme.colorScheme.onSurface.copy(alpha = 0.38f)
                                )
                            }

                            // Toggle annotations visibility
                            IconButton(
                                onClick = onToggleAnnotations,
                                modifier = Modifier.size(48.dp)
                            ) {
                                Icon(
                                    imageVector = if (showAnnotations)
                                        Icons.Default.Visibility
                                    else
                                        Icons.Default.VisibilityOff,
                                    contentDescription = if (showAnnotations) "Hide annotations" else "Show annotations",
                                    tint = MaterialTheme.colorScheme.primary
                                )
                            }
                        }

                        // Color picker popup
                        AnimatedVisibility(
                            visible = showColorPicker,
                            enter = fadeIn() + slideInVertically(),
                            exit = fadeOut() + slideOutVertically()
                        ) {
                            ColorPickerPopup(
                                currentColor = currentColor,
                                onColorSelected = {
                                    onColorSelected(it)
                                    showColorPicker = false
                                },
                                onDismiss = { showColorPicker = false }
                            )
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        // Collapse button
                        Row(
                            modifier = Modifier
                                .clickable {
                                    isExpanded = false
                                    // Reset position to center when collapsing for safety
                                    offsetX = 0f
                                    offsetY = 0f
                                    // Switch to PAN mode when closing toolbar
                                    onToolSelected(AnnotationTool.PAN)
                                }
                                .padding(vertical = 4.dp, horizontal = 12.dp),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "Close",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            } else {
                // Collapsed state - minimal semi-transparent FAB (also draggable)
                Surface(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(CircleShape)
                        .pointerInput(Unit) {
                            detectDragGestures { change, dragAmount ->
                                change.consume()
                                // No constraints - web-style free dragging
                                offsetX += dragAmount.x
                                offsetY += dragAmount.y
                            }
                        }
                        .clickable { isExpanded = true },
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.7f),
                    shadowElevation = 4.dp
                ) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier.size(64.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Edit,
                            contentDescription = "Open annotation tools",
                            tint = MaterialTheme.colorScheme.onPrimaryContainer,
                            modifier = Modifier.size(28.dp)
                        )
                    }
                }
            }
        }
    }
}

/**
 * Individual tool button with icon and optional label
 */
@Composable
private fun ToolButton(
    icon: ImageVector,
    label: String,
    isSelected: Boolean,
    color: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val backgroundColor = if (isSelected) {
        AnnotationRenderer.parseColor(color).copy(alpha = 0.15f)
    } else {
        Color.Transparent
    }

    val borderColor = if (isSelected) {
        AnnotationRenderer.parseColor(color)
    } else {
        Color.Transparent
    }

    Box(
        modifier = modifier
            .size(56.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(backgroundColor)
            .border(2.dp, borderColor, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = label,
            tint = if (isSelected)
                AnnotationRenderer.parseColor(color)
            else
                MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(28.dp)
        )
    }
}

/**
 * Tool button with icon and label underneath for better discoverability
 */
@Composable
private fun LabeledToolButton(
    icon: ImageVector,
    label: String,
    isSelected: Boolean,
    color: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val backgroundColor = if (isSelected) {
        AnnotationRenderer.parseColor(color).copy(alpha = 0.15f)
    } else {
        Color.Transparent
    }

    val borderColor = if (isSelected) {
        AnnotationRenderer.parseColor(color)
    } else {
        Color.Transparent
    }

    Column(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(backgroundColor)
            .border(2.dp, borderColor, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(8.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector = icon,
            contentDescription = label,
            tint = if (isSelected)
                AnnotationRenderer.parseColor(color)
            else
                MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(28.dp)
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = if (isSelected)
                AnnotationRenderer.parseColor(color)
            else
                MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

/**
 * Color picker button showing current color
 */
@Composable
private fun ColorPickerButton(
    currentColor: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .size(48.dp)
            .clip(CircleShape)
            .background(AnnotationRenderer.parseColor(currentColor))
            .border(2.dp, MaterialTheme.colorScheme.outline, CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        // Inner white ring
        Box(
            modifier = Modifier
                .size(20.dp)
                .clip(CircleShape)
                .background(Color.White)
                .border(1.dp, Color.Gray, CircleShape)
        )
    }
}

/**
 * Color picker popup with 8 color options
 */
@Composable
private fun ColorPickerPopup(
    currentColor: String,
    onColorSelected: (String) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .padding(top = 8.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Select Color",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                AnnotationColors.ALL.forEach { color ->
                    ColorSwatch(
                        color = color,
                        isSelected = color == currentColor,
                        onClick = { onColorSelected(color) }
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Tap outside to close",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
            )
        }
    }
}

/**
 * Individual color swatch in the color picker
 */
@Composable
private fun ColorSwatch(
    color: String,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .size(40.dp)
            .clip(CircleShape)
            .background(AnnotationRenderer.parseColor(color))
            .border(
                width = if (isSelected) 3.dp else 1.dp,
                color = if (isSelected) Color.White else Color.Gray.copy(alpha = 0.5f),
                shape = CircleShape
            )
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        if (isSelected) {
            Icon(
                imageVector = Icons.Default.Circle,
                contentDescription = "Selected",
                tint = Color.White,
                modifier = Modifier.size(16.dp)
            )
        }
    }
}

/**
 * Compact version of the toolbar for smaller screens
 */
@Composable
fun CompactAnnotationToolbar(
    currentTool: AnnotationTool,
    currentColor: String,
    onToolSelected: (AnnotationTool) -> Unit,
    onColorSelected: (String) -> Unit,
    onMoreTools: () -> Unit,
    modifier: Modifier = Modifier
) {
    var showColorPicker by remember { mutableStateOf(false) }

    Card(
        modifier = modifier.shadow(4.dp, RoundedCornerShape(28.dp)),
        shape = RoundedCornerShape(28.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Quick access tools
            val quickTools = listOf(
                AnnotationTool.SELECT to Icons.Default.TouchApp,
                AnnotationTool.PAN to Icons.Default.OpenWith,
                AnnotationTool.PIN to Icons.Default.LocationOn,
                AnnotationTool.MEASUREMENT to Icons.Default.Straighten,
                AnnotationTool.FREEHAND to Icons.Default.Gesture
            )

            quickTools.forEach { (tool, icon) ->
                IconButton(
                    onClick = { onToolSelected(tool) },
                    modifier = Modifier.size(48.dp)
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = tool.name,
                        tint = if (currentTool == tool)
                            AnnotationRenderer.parseColor(currentColor)
                        else
                            MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Color picker
            ColorPickerButton(
                currentColor = currentColor,
                onClick = { showColorPicker = !showColorPicker }
            )

            // More tools button
            IconButton(
                onClick = onMoreTools,
                modifier = Modifier.size(48.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.FormatShapes,
                    contentDescription = "More tools",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }

    // Color picker popup
    if (showColorPicker) {
        ColorPickerPopup(
            currentColor = currentColor,
            onColorSelected = {
                onColorSelected(it)
                showColorPicker = false
            },
            onDismiss = { showColorPicker = false }
        )
    }
}

/**
 * Bottom sheet style tool selector for more tools
 */
@Composable
fun ToolSelectorSheet(
    currentTool: AnnotationTool,
    currentColor: String,
    onToolSelected: (AnnotationTool) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 4.dp
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Drag handle
            Box(
                modifier = Modifier
                    .width(40.dp)
                    .height(4.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f))
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "Annotation Tools",
                style = MaterialTheme.typography.titleMedium
            )

            Spacer(modifier = Modifier.height(16.dp))

            // All tools in a grid
            val tools = listOf(
                Triple(AnnotationTool.SELECT, Icons.Default.TouchApp, "Select"),
                Triple(AnnotationTool.PAN, Icons.Default.OpenWith, "Pan"),
                Triple(AnnotationTool.PIN, Icons.Default.LocationOn, "Pin"),
                Triple(AnnotationTool.COMMENT, Icons.Default.ChatBubble, "Comment"),
                Triple(AnnotationTool.RECTANGLE, Icons.Default.Square, "Rectangle"),
                Triple(AnnotationTool.CIRCLE, Icons.Default.RadioButtonUnchecked, "Circle"),
                Triple(AnnotationTool.CLOUD, Icons.Default.Cloud, "Cloud"),
                Triple(AnnotationTool.ARROW, Icons.Default.ArrowForward, "Arrow"),
                Triple(AnnotationTool.LINE, Icons.Default.Remove, "Line"),
                Triple(AnnotationTool.CALLOUT, Icons.Default.Add, "Callout"),
                Triple(AnnotationTool.MEASUREMENT, Icons.Default.Straighten, "Measure"),
                Triple(AnnotationTool.AREA, Icons.Default.GridOn, "Area"),
                Triple(AnnotationTool.FREEHAND, Icons.Default.Gesture, "Freehand")
            )

            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(tools) { (tool, icon, label) ->
                    ToolChip(
                        icon = icon,
                        label = label,
                        isSelected = currentTool == tool,
                        color = currentColor,
                        onClick = {
                            onToolSelected(tool)
                            onDismiss()
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

/**
 * Tool chip for bottom sheet selector
 */
@Composable
private fun ToolChip(
    icon: ImageVector,
    label: String,
    isSelected: Boolean,
    color: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val chipColor = if (isSelected) {
        AnnotationRenderer.parseColor(color)
    } else {
        MaterialTheme.colorScheme.surfaceVariant
    }

    Surface(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .clickable(onClick = onClick),
        color = chipColor,
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(24.dp)
            )
            Text(
                text = label,
                style = MaterialTheme.typography.labelLarge,
                color = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
