package com.constructionpro.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.constructionpro.app.R
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.model.*
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import com.constructionpro.app.ui.util.responsiveValue
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class InspectionDetailState(
    val loading: Boolean = false,
    val inspection: Inspection? = null,
    val error: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InspectionDetailScreen(
    apiService: ApiService,
    inspectionId: String,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(InspectionDetailState(loading = true)) }

    fun loadData() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val inspection = withContext(Dispatchers.IO) {
                    apiService.getInspection(inspectionId)
                }
                state = state.copy(loading = false, inspection = inspection)
            } catch (error: Exception) {
                state = state.copy(
                    loading = false,
                    error = error.message ?: "Failed to load inspection details"
                )
            }
        }
    }

    LaunchedEffect(inspectionId) {
        loadData()
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.inspections_title),
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = stringResource(R.string.common_back),
                            tint = AppColors.textSecondary
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { loadData() }) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Refresh",
                            tint = AppColors.textSecondary
                        )
                    }
                }
            )
        }
    ) { padding ->
        if (state.loading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CPLoadingIndicator(message = stringResource(R.string.inspections_loading))
            }
        } else if (state.error != null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(AppSpacing.md)
            ) {
                CPErrorBanner(
                    message = state.error ?: "An error occurred",
                    onRetry = { loadData() },
                    onDismiss = { state = state.copy(error = null) }
                )
            }
        } else {
            state.inspection?.let { inspection ->
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentPadding = PaddingValues(
                        horizontal = responsiveValue(AppSpacing.md, AppSpacing.xl, AppSpacing.xxl),
                        vertical = AppSpacing.md
                    ),
                    verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
                ) {
                    // Result Banner
                    inspection.overallResult?.let { result ->
                        item {
                            ResultBanner(result = result)
                        }
                    }

                    // Header Card
                    item {
                        InspectionHeaderCard(inspection = inspection)
                    }

                    // Details Section
                    item {
                        CPSectionHeader(title = "Inspection Details")
                    }

                    item {
                        InspectionDetailsCard(inspection = inspection)
                    }

                    // Checklist Items
                    if (inspection.checklistItems?.isNotEmpty() == true) {
                        item {
                            CPSectionHeader(title = "Checklist Items")
                        }

                        items(inspection.checklistItems) { item ->
                            ChecklistItemCard(item = item)
                        }
                    }

                    // Findings
                    if (inspection.findings?.isNotEmpty() == true) {
                        item {
                            CPSectionHeader(title = "Findings")
                        }

                        items(inspection.findings) { finding ->
                            FindingCard(finding = finding)
                        }
                    }

                    // Notes
                    inspection.notes?.let { notes ->
                        if (notes.isNotBlank()) {
                            item {
                                CPSectionHeader(title = stringResource(R.string.inspections_notes))
                            }
                            item {
                                CPCard {
                                    Text(
                                        text = notes,
                                        style = AppTypography.body,
                                        color = AppColors.textSecondary
                                    )
                                }
                            }
                        }
                    }

                    // Recommendations
                    inspection.recommendations?.let { recommendations ->
                        if (recommendations.isNotBlank()) {
                            item {
                                CPSectionHeader(title = "Recommendations")
                            }
                            item {
                                CPCard {
                                    Text(
                                        text = recommendations,
                                        style = AppTypography.body,
                                        color = AppColors.textSecondary
                                    )
                                }
                            }
                        }
                    }

                    item {
                        Spacer(modifier = Modifier.height(AppSpacing.md))
                    }
                }
            }
        }
    }
}

@Composable
private fun ResultBanner(result: String) {
    val (color, icon) = when (result.uppercase()) {
        "PASS" -> Pair(ConstructionGreen, Icons.Default.CheckCircle)
        "FAIL" -> Pair(ConstructionRed, Icons.Default.Cancel)
        "PARTIAL" -> Pair(ConstructionOrange, Icons.Default.Warning)
        else -> Pair(AppColors.textMuted, Icons.Default.Help)
    }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(AppSpacing.sm),
        color = color.copy(alpha = 0.1f)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(AppSpacing.md),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(28.dp)
            )
            Spacer(modifier = Modifier.width(AppSpacing.sm))
            Text(
                text = "INSPECTION ${result.uppercase()}",
                style = AppTypography.heading3,
                fontWeight = FontWeight.Bold,
                color = color
            )
        }
    }
}

@Composable
private fun InspectionHeaderCard(inspection: Inspection) {
    CPCard {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .clip(RoundedCornerShape(AppSpacing.radiusLarge))
                        .background(getStatusColor(inspection.status).copy(alpha = 0.1f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Checklist,
                        contentDescription = null,
                        tint = getStatusColor(inspection.status),
                        modifier = Modifier.size(28.dp)
                    )
                }

                Spacer(modifier = Modifier.width(AppSpacing.md))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = inspection.type ?: "General Inspection",
                        style = AppTypography.heading2,
                        fontWeight = FontWeight.Bold
                    )
                    inspection.project?.name?.let { projectName ->
                        Text(
                            text = projectName,
                            style = AppTypography.bodyLarge,
                            color = AppColors.textSecondary
                        )
                    }
                }

                CPBadge(
                    text = inspection.status.replace("_", " "),
                    color = getStatusColor(inspection.status),
                    backgroundColor = getStatusColor(inspection.status).copy(alpha = 0.1f)
                )
            }

            inspection.inspector?.let { inspector ->
                Spacer(modifier = Modifier.height(AppSpacing.sm))
                Divider(color = AppColors.divider)
                Spacer(modifier = Modifier.height(AppSpacing.sm))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = null,
                        tint = AppColors.textMuted,
                        modifier = Modifier.size(AppSpacing.md)
                    )
                    Spacer(modifier = Modifier.width(AppSpacing.xs))
                    Text(
                        text = "${stringResource(R.string.inspections_inspector)}: ${inspector.name ?: "Unknown"}",
                        style = AppTypography.body,
                        color = AppColors.textSecondary
                    )
                }
            }
        }
    }
}

@Composable
private fun InspectionDetailsCard(inspection: Inspection) {
    CPCard {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
        ) {
            // Scheduled Date
            inspection.scheduledDate?.let { date ->
                DetailRow(
                    icon = Icons.Default.CalendarToday,
                    label = "Scheduled Date",
                    value = date.take(10)
                )
            }

            // Completed Date
            inspection.completedDate?.let { date ->
                DetailRow(
                    icon = Icons.Default.CheckCircle,
                    label = "Completed Date",
                    value = date.take(10)
                )
            }

            // Location
            inspection.location?.let { location ->
                DetailRow(
                    icon = Icons.Default.LocationOn,
                    label = "Location",
                    value = location
                )
            }

            // Area
            inspection.area?.let { area ->
                DetailRow(
                    icon = Icons.Default.GridView,
                    label = "Area/Zone",
                    value = area
                )
            }

            // Score
            inspection.score?.let { score ->
                DetailRow(
                    icon = Icons.Default.Score,
                    label = "Score",
                    value = "${score.toInt()}%",
                    valueColor = when {
                        score >= 90 -> ConstructionGreen
                        score >= 70 -> ConstructionOrange
                        else -> ConstructionRed
                    }
                )
            }
        }
    }
}

@Composable
private fun DetailRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String,
    valueColor: androidx.compose.ui.graphics.Color = AppColors.textPrimary
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = AppColors.textMuted,
            modifier = Modifier.size(AppSpacing.lg)
        )
        Spacer(modifier = Modifier.width(AppSpacing.sm))
        Column {
            Text(
                text = label,
                style = AppTypography.secondary,
                color = AppColors.textMuted
            )
            Text(
                text = value,
                style = AppTypography.body,
                fontWeight = FontWeight.Medium,
                color = valueColor
            )
        }
    }
}

@Composable
private fun ChecklistItemCard(item: InspectionChecklistItem) {
    CPCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(RoundedCornerShape(AppSpacing.xs))
                    .background(
                        when (item.status?.uppercase()) {
                            "PASS", "PASSED", "OK" -> ConstructionGreen.copy(alpha = 0.1f)
                            "FAIL", "FAILED" -> ConstructionRed.copy(alpha = 0.1f)
                            "NA", "N/A" -> AppColors.gray100
                            else -> ConstructionOrange.copy(alpha = 0.1f)
                        }
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = when (item.status?.uppercase()) {
                        "PASS", "PASSED", "OK" -> Icons.Default.Check
                        "FAIL", "FAILED" -> Icons.Default.Close
                        "NA", "N/A" -> Icons.Default.Remove
                        else -> Icons.Default.HourglassEmpty
                    },
                    contentDescription = null,
                    tint = when (item.status?.uppercase()) {
                        "PASS", "PASSED", "OK" -> ConstructionGreen
                        "FAIL", "FAILED" -> ConstructionRed
                        "NA", "N/A" -> AppColors.textMuted
                        else -> ConstructionOrange
                    },
                    modifier = Modifier.size(18.dp)
                )
            }

            Spacer(modifier = Modifier.width(AppSpacing.sm))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = item.description ?: "Checklist Item",
                    style = AppTypography.body,
                    fontWeight = FontWeight.Medium
                )
                item.notes?.let { notes ->
                    Text(
                        text = notes,
                        style = AppTypography.secondary,
                        color = AppColors.textMuted
                    )
                }
            }

            item.status?.let { status ->
                Text(
                    text = status,
                    style = AppTypography.caption,
                    fontWeight = FontWeight.SemiBold,
                    color = when (status.uppercase()) {
                        "PASS", "PASSED", "OK" -> ConstructionGreen
                        "FAIL", "FAILED" -> ConstructionRed
                        else -> AppColors.textSecondary
                    }
                )
            }
        }
    }
}

@Composable
private fun FindingCard(finding: InspectionFinding) {
    CPCard {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(AppSpacing.radiusMedium))
                        .background(getSeverityColor(finding.severity).copy(alpha = 0.1f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = getSeverityIcon(finding.severity),
                        contentDescription = null,
                        tint = getSeverityColor(finding.severity),
                        modifier = Modifier.size(AppSpacing.lg)
                    )
                }

                Spacer(modifier = Modifier.width(AppSpacing.sm))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = finding.title ?: "Finding",
                        style = AppTypography.bodySemibold,
                        fontWeight = FontWeight.SemiBold
                    )
                    Row {
                        CPBadge(
                            text = finding.severity ?: "Unknown",
                            color = getSeverityColor(finding.severity),
                            backgroundColor = getSeverityColor(finding.severity).copy(alpha = 0.1f)
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.xs))
                        finding.status?.let { status ->
                            CPBadge(
                                text = status,
                                color = AppColors.textSecondary,
                                backgroundColor = AppColors.gray100
                            )
                        }
                    }
                }
            }

            finding.description?.let { description ->
                Spacer(modifier = Modifier.height(AppSpacing.sm))
                Text(
                    text = description,
                    style = AppTypography.secondary,
                    color = AppColors.textSecondary
                )
            }

            finding.recommendation?.let { recommendation ->
                Spacer(modifier = Modifier.height(AppSpacing.xs))
                Row(verticalAlignment = Alignment.Top) {
                    Icon(
                        imageVector = Icons.Default.Lightbulb,
                        contentDescription = null,
                        tint = AppColors.primary600,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(AppSpacing.xxs))
                    Text(
                        text = recommendation,
                        style = AppTypography.secondary,
                        color = AppColors.primary700
                    )
                }
            }
        }
    }
}

// Helper functions
private fun getStatusColor(status: String): androidx.compose.ui.graphics.Color {
    return when (status.uppercase()) {
        "COMPLETED" -> ConstructionGreen
        "FAILED" -> ConstructionRed
        "IN_PROGRESS" -> Primary600
        "SCHEDULED" -> ConstructionOrange
        else -> Gray500
    }
}

private fun getSeverityColor(severity: String?): androidx.compose.ui.graphics.Color {
    return when (severity?.uppercase()) {
        "CRITICAL", "HIGH" -> ConstructionRed
        "MEDIUM" -> ConstructionOrange
        "LOW" -> ConstructionGreen
        else -> Gray500
    }
}

private fun getSeverityIcon(severity: String?): androidx.compose.ui.graphics.vector.ImageVector {
    return when (severity?.uppercase()) {
        "CRITICAL", "HIGH" -> Icons.Default.Error
        "MEDIUM" -> Icons.Default.Warning
        "LOW" -> Icons.Default.Info
        else -> Icons.Default.Help
    }
}
