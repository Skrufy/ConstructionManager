package com.constructionpro.app.ui.drawing

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Straighten
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.constructionpro.app.data.model.NormalizedPoint
import kotlin.math.sqrt

/**
 * Scale format types
 */
enum class ScaleFormat(val displayName: String) {
    ARCHITECTURAL("Architectural"),
    CIVIL("Civil/Engineering"),
    METRIC("Metric")
}

/**
 * Common scale presets
 */
sealed class ScalePreset(
    val label: String,
    val scale: String,
    val format: ScaleFormat
) {
    // Architectural presets
    data object QuarterInch : ScalePreset("1/4\" = 1'-0\"", "1/4\" = 1'-0\"", ScaleFormat.ARCHITECTURAL)
    data object EighthInch : ScalePreset("1/8\" = 1'-0\"", "1/8\" = 1'-0\"", ScaleFormat.ARCHITECTURAL)
    data object HalfInch : ScalePreset("1/2\" = 1'-0\"", "1/2\" = 1'-0\"", ScaleFormat.ARCHITECTURAL)
    data object ThreeQuarterInch : ScalePreset("3/4\" = 1'-0\"", "3/4\" = 1'-0\"", ScaleFormat.ARCHITECTURAL)
    data object OneInch : ScalePreset("1\" = 1'-0\"", "1\" = 1'-0\"", ScaleFormat.ARCHITECTURAL)
    data object ThreeInch : ScalePreset("3\" = 1'-0\"", "3\" = 1'-0\"", ScaleFormat.ARCHITECTURAL)

    // Civil/Engineering presets (site plans, utility drawings)
    data object OneToTen : ScalePreset("1\" = 10'", "1\" = 10'", ScaleFormat.CIVIL)
    data object OneToTwenty : ScalePreset("1\" = 20'", "1\" = 20'", ScaleFormat.CIVIL)
    data object OneToThirty : ScalePreset("1\" = 30'", "1\" = 30'", ScaleFormat.CIVIL)
    data object OneToForty : ScalePreset("1\" = 40'", "1\" = 40'", ScaleFormat.CIVIL)
    data object OneToFifty : ScalePreset("1\" = 50'", "1\" = 50'", ScaleFormat.CIVIL)
    data object OneToSixty : ScalePreset("1\" = 60'", "1\" = 60'", ScaleFormat.CIVIL)
    data object OneToHundred : ScalePreset("1\" = 100'", "1\" = 100'", ScaleFormat.CIVIL)
    data object OneToTwoHundred : ScalePreset("1\" = 200'", "1\" = 200'", ScaleFormat.CIVIL)

    // Metric presets
    data object MetricOneToFifty : ScalePreset("1:50", "1:50", ScaleFormat.METRIC)
    data object MetricOneToHundred : ScalePreset("1:100", "1:100", ScaleFormat.METRIC)
    data object MetricOneToTwoHundred : ScalePreset("1:200", "1:200", ScaleFormat.METRIC)
    data object MetricOneToFiveHundred : ScalePreset("1:500", "1:500", ScaleFormat.METRIC)

    companion object {
        val architecturalPresets = listOf(
            QuarterInch, EighthInch, HalfInch, ThreeQuarterInch, OneInch, ThreeInch
        )
        val civilPresets = listOf(
            OneToTen, OneToTwenty, OneToThirty, OneToForty, OneToFifty, OneToSixty, OneToHundred, OneToTwoHundred
        )
        val metricPresets = listOf(
            MetricOneToFifty, MetricOneToHundred, MetricOneToTwoHundred, MetricOneToFiveHundred
        )
    }
}

/**
 * Calibration dialog for setting drawing scale.
 * Supports two-point calibration where user draws a reference line.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CalibrationDialog(
    isVisible: Boolean,
    currentScale: String?,
    calibrationPoints: Pair<NormalizedPoint, NormalizedPoint>?,
    pixelDistance: Float?,
    onScaleSelected: (String) -> Unit,
    onStartCalibration: () -> Unit,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    if (isVisible) {
        ModalBottomSheet(
            onDismissRequest = onDismiss,
            sheetState = sheetState,
            dragHandle = { CalibrationDragHandle() }
        ) {
            CalibrationContent(
                currentScale = currentScale,
                calibrationPoints = calibrationPoints,
                pixelDistance = pixelDistance,
                onScaleSelected = onScaleSelected,
                onStartCalibration = onStartCalibration,
                onDismiss = onDismiss
            )
        }
    }
}

@Composable
private fun CalibrationDragHandle() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp),
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier = Modifier
                .width(40.dp)
                .height(4.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f))
        )
    }
}

@Composable
private fun CalibrationContent(
    currentScale: String?,
    calibrationPoints: Pair<NormalizedPoint, NormalizedPoint>?,
    pixelDistance: Float?,
    onScaleSelected: (String) -> Unit,
    onStartCalibration: () -> Unit,
    onDismiss: () -> Unit
) {
    var selectedFormat by remember { mutableIntStateOf(0) } // 0 = Architectural, 1 = Civil, 2 = Metric
    var selectedPreset by remember { mutableStateOf<ScalePreset?>(null) }
    var customScale by remember { mutableStateOf("") }
    var manualDistance by remember { mutableStateOf("") }
    var manualUnit by remember { mutableIntStateOf(0) } // 0 = feet, 1 = inches, 2 = meters, 3 = cm

    // Initialize from current scale
    LaunchedEffect(currentScale) {
        currentScale?.let { scale ->
            // Try to match preset
            val allPresets = ScalePreset.architecturalPresets + ScalePreset.civilPresets + ScalePreset.metricPresets
            val matchedPreset = allPresets.find { it.scale == scale }
            if (matchedPreset != null) {
                selectedPreset = matchedPreset
                selectedFormat = when (matchedPreset.format) {
                    ScaleFormat.ARCHITECTURAL -> 0
                    ScaleFormat.CIVIL -> 1
                    ScaleFormat.METRIC -> 2
                }
            } else {
                customScale = scale
            }
        }
    }

    val presets = when (selectedFormat) {
        0 -> ScalePreset.architecturalPresets
        1 -> ScalePreset.civilPresets
        else -> ScalePreset.metricPresets
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .padding(bottom = 24.dp)
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Straighten,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = "Scale Calibration",
                    style = MaterialTheme.typography.titleLarge
                )
            }

            IconButton(onClick = onDismiss) {
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = "Close"
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Current scale display
        currentScale?.let { scale ->
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Current Scale:",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        text = scale,
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }

        // Format selector
        Text(
            text = "Format",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(8.dp))

        SingleChoiceSegmentedButtonRow(
            modifier = Modifier.fillMaxWidth()
        ) {
            ScaleFormat.entries.forEachIndexed { index, format ->
                SegmentedButton(
                    selected = selectedFormat == index,
                    onClick = {
                        selectedFormat = index
                        selectedPreset = null
                    },
                    shape = SegmentedButtonDefaults.itemShape(
                        index = index,
                        count = ScaleFormat.entries.size
                    )
                ) {
                    Text(format.displayName)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Preset selection
        Text(
            text = "Common Scales",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(8.dp))

        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(presets) { preset ->
                FilterChip(
                    selected = selectedPreset == preset,
                    onClick = {
                        selectedPreset = preset
                        customScale = ""
                    },
                    label = { Text(preset.label) },
                    leadingIcon = if (selectedPreset == preset) {
                        {
                            Icon(
                                imageVector = Icons.Default.Check,
                                contentDescription = "Selected",
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    } else null
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Custom scale input
        Text(
            text = "Or enter custom scale",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedTextField(
            value = customScale,
            onValueChange = {
                customScale = it
                selectedPreset = null
            },
            label = { Text("Custom Scale") },
            placeholder = {
                Text(
                    when (selectedFormat) {
                        0 -> "e.g., 1/4\" = 1'-0\""
                        1 -> "e.g., 1\" = 60'"
                        else -> "e.g., 1:100"
                    }
                )
            },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Two-point calibration section
        Card(
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant
            )
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Text(
                    text = "Two-Point Calibration",
                    style = MaterialTheme.typography.titleSmall
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Tap two points on a known dimension (e.g., a door width) and enter the real-world measurement.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(12.dp))

                if (calibrationPoints != null && pixelDistance != null) {
                    // Show calibration result
                    Text(
                        text = "Reference line drawn: ${pixelDistance.toInt()} pixels",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.primary
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    // Distance input
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = manualDistance,
                            onValueChange = { manualDistance = it.filter { c -> c.isDigit() || c == '.' } },
                            label = { Text("Real Distance") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )

                        // Unit selector
                        val units = if (selectedFormat == 2) listOf("m", "cm") else listOf("ft", "in")
                        SingleChoiceSegmentedButtonRow {
                            units.forEachIndexed { index, unit ->
                                SegmentedButton(
                                    selected = manualUnit == index,
                                    onClick = { manualUnit = index },
                                    shape = SegmentedButtonDefaults.itemShape(
                                        index = index,
                                        count = units.size
                                    )
                                ) {
                                    Text(unit)
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Button(
                        onClick = {
                            val distance = manualDistance.toFloatOrNull() ?: return@Button
                            val scale = calculateScaleFromCalibration(
                                pixelDistance = pixelDistance,
                                realDistance = distance,
                                unit = when (manualUnit) {
                                    0 -> if (selectedFormat == 2) "m" else "ft"
                                    else -> if (selectedFormat == 2) "cm" else "in"
                                }
                            )
                            onScaleSelected(scale)
                        },
                        enabled = manualDistance.isNotBlank(),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Apply Calibration")
                    }
                } else {
                    OutlinedButton(
                        onClick = {
                            onDismiss()
                            onStartCalibration()
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(
                            imageVector = Icons.Default.Straighten,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Tap Two Points on Drawing")
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Action buttons
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedButton(
                onClick = onDismiss,
                modifier = Modifier.weight(1f)
            ) {
                Text("Cancel")
            }

            Button(
                onClick = {
                    val scale = selectedPreset?.scale ?: customScale
                    if (scale.isNotBlank()) {
                        onScaleSelected(scale)
                    }
                },
                enabled = selectedPreset != null || customScale.isNotBlank(),
                modifier = Modifier.weight(1f)
            ) {
                Text("Apply Scale")
            }
        }
    }
}

/**
 * Calculate scale string from calibration measurement
 * Returns pixels-per-foot value as a string for high accuracy
 */
private fun calculateScaleFromCalibration(
    pixelDistance: Float,
    realDistance: Float,
    unit: String
): String {
    // Calculate pixels per unit (foot, inch, meter, cm)
    val pixelsPerUnit = pixelDistance / realDistance

    // Convert to pixels per foot for consistency
    val pixelsPerFoot = when {
        // Imperial units
        unit == "ft" -> pixelsPerUnit  // Already in pixels per foot
        unit == "in" -> pixelsPerUnit * 12f  // Convert inches to feet (12 inches = 1 foot)
        // Metric units - convert to feet equivalent (1 meter ≈ 3.28084 feet)
        unit == "m" -> pixelsPerUnit * 3.28084f
        unit == "cm" -> pixelsPerUnit * 0.0328084f
        else -> pixelsPerUnit
    }

    // Return as direct number string (pixels per foot)
    // This format is parseable by parseScaleToPixelsPerFoot in AnnotationRenderer
    return pixelsPerFoot.toString()
}

/**
 * Inline calibration hint overlay
 */
@Composable
fun CalibrationHintOverlay(
    isActive: Boolean,
    step: Int, // 0 = start, 1 = first point set, 2 = complete
    modifier: Modifier = Modifier
) {
    if (!isActive) return

    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(16.dp),
        contentAlignment = Alignment.TopCenter
    ) {
        Surface(
            color = MaterialTheme.colorScheme.inverseSurface,
            shape = RoundedCornerShape(8.dp)
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Straighten,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.inverseOnSurface
                )
                Text(
                    text = when (step) {
                        0 -> "Tap the first point of a known dimension"
                        1 -> "Tap the second point to complete"
                        else -> "Enter the real-world distance"
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.inverseOnSurface
                )
            }
        }
    }
}

/**
 * Scale info chip for display in viewer
 */
@Composable
fun ScaleInfoChip(
    scale: String?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .clickable(onClick = onClick),
        color = MaterialTheme.colorScheme.surfaceVariant,
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Straighten,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(16.dp)
            )
            Text(
                text = scale ?: "No Scale",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
