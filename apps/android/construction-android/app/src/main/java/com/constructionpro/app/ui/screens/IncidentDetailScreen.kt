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

private data class IncidentDetailState(
    val loading: Boolean = false,
    val incident: Incident? = null,
    val error: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun IncidentDetailScreen(
    apiService: ApiService,
    incidentId: String,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(IncidentDetailState(loading = true)) }

    fun loadData() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val incident = withContext(Dispatchers.IO) {
                    apiService.getIncident(incidentId)
                }
                state = state.copy(loading = false, incident = incident)
            } catch (error: Exception) {
                state = state.copy(
                    loading = false,
                    error = error.message ?: "Failed to load incident details"
                )
            }
        }
    }

    LaunchedEffect(incidentId) {
        loadData()
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.incidents_title),
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
                CPLoadingIndicator(message = stringResource(R.string.incidents_loading))
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
            state.incident?.let { incident ->
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
                    // Severity Banner
                    item {
                        SeverityBanner(severity = incident.severity)
                    }

                    // Header Card
                    item {
                        IncidentHeaderCard(incident = incident)
                    }

                    // Details Section
                    item {
                        CPSectionHeader(title = "Incident Details")
                    }

                    item {
                        IncidentDetailsCard(incident = incident)
                    }

                    // Description
                    incident.description?.let { description ->
                        item {
                            CPSectionHeader(title = "Description")
                        }
                        item {
                            CPCard {
                                Text(
                                    text = description,
                                    style = AppTypography.body,
                                    color = AppColors.textSecondary
                                )
                            }
                        }
                    }

                    // Note: involvedPersonnel and witnesses are stored as flexible JSON
                    // and are not displayed in this detail view currently

                    // Corrective Actions
                    incident.correctiveActions?.let { actions ->
                        if (actions.isNotBlank()) {
                            item {
                                CPSectionHeader(title = stringResource(R.string.incidents_actions_taken))
                            }
                            item {
                                CPCard {
                                    Text(
                                        text = actions,
                                        style = AppTypography.body,
                                        color = AppColors.textSecondary
                                    )
                                }
                            }
                        }
                    }

                    // Root Cause
                    incident.rootCause?.let { cause ->
                        if (cause.isNotBlank()) {
                            item {
                                CPSectionHeader(title = "Root Cause Analysis")
                            }
                            item {
                                CPCard {
                                    Text(
                                        text = cause,
                                        style = AppTypography.body,
                                        color = AppColors.textSecondary
                                    )
                                }
                            }
                        }
                    }

                    // Investigation Notes
                    incident.investigationNotes?.let { notes ->
                        if (notes.isNotBlank()) {
                            item {
                                CPSectionHeader(title = "Investigation Notes")
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

                    item {
                        Spacer(modifier = Modifier.height(AppSpacing.md))
                    }
                }
            }
        }
    }
}

@Composable
private fun SeverityBanner(severity: String) {
    val color = getSeverityColor(severity)
    val icon = getSeverityIcon(severity)

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
                text = "$severity SEVERITY",
                style = AppTypography.heading3,
                fontWeight = FontWeight.Bold,
                color = color
            )
        }
    }
}

@Composable
private fun IncidentHeaderCard(incident: Incident) {
    CPCard {
        Column(modifier = Modifier.fillMaxWidth()) {
            Text(
                text = incident.title,
                style = AppTypography.heading2,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(AppSpacing.sm))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
            ) {
                CPBadge(
                    text = incident.type.replace("_", " "),
                    color = AppColors.textSecondary,
                    backgroundColor = AppColors.gray100
                )
                CPBadge(
                    text = incident.status.replace("_", " "),
                    color = getStatusColor(incident.status),
                    backgroundColor = getStatusColor(incident.status).copy(alpha = 0.1f)
                )
            }

            incident.project?.name?.let { projectName ->
                Spacer(modifier = Modifier.height(AppSpacing.sm))
                Divider(color = AppColors.divider)
                Spacer(modifier = Modifier.height(AppSpacing.sm))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Folder,
                        contentDescription = null,
                        tint = AppColors.textMuted,
                        modifier = Modifier.size(AppSpacing.md)
                    )
                    Spacer(modifier = Modifier.width(AppSpacing.xs))
                    Text(
                        text = projectName,
                        style = AppTypography.body,
                        color = AppColors.textSecondary
                    )
                }
            }
        }
    }
}

@Composable
private fun IncidentDetailsCard(incident: Incident) {
    CPCard {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
        ) {
            // Date & Time
            DetailRow(
                icon = Icons.Default.CalendarToday,
                label = "Incident Date",
                value = incident.incidentDate.take(10)
            )

            incident.incidentTime?.let { time ->
                DetailRow(
                    icon = Icons.Default.Schedule,
                    label = "Time",
                    value = time
                )
            }

            // Location
            incident.location?.let { location ->
                DetailRow(
                    icon = Icons.Default.LocationOn,
                    label = "Location",
                    value = location
                )
            }

            // Reported By
            incident.reportedBy?.let { reporter ->
                DetailRow(
                    icon = Icons.Default.Person,
                    label = "Reported By",
                    value = reporter.name ?: "Unknown"
                )
            }

            // Report Date
            incident.createdAt?.let { reportDate ->
                DetailRow(
                    icon = Icons.Default.EditNote,
                    label = "Report Filed",
                    value = reportDate.take(10)
                )
            }

            // OSHA Recordable
            incident.oshaRecordable?.let { recordable ->
                DetailRow(
                    icon = Icons.Default.Assignment,
                    label = "OSHA Recordable",
                    value = if (recordable) "Yes" else "No",
                    valueColor = if (recordable) ConstructionRed else ConstructionGreen
                )
            }

            // Lost Time
            incident.lostTimeDays?.let { days ->
                if (days > 0) {
                    DetailRow(
                        icon = Icons.Default.EventBusy,
                        label = "Lost Time",
                        value = "$days day${if (days > 1) "s" else ""}",
                        valueColor = ConstructionRed
                    )
                }
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
private fun PersonnelCard(person: IncidentPerson) {
    CPCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(AppSpacing.radiusMedium))
                    .background(AppColors.primary100),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = person.name?.take(2)?.uppercase() ?: "??",
                    style = AppTypography.bodySemibold,
                    fontWeight = FontWeight.Bold,
                    color = AppColors.primary700
                )
            }

            Spacer(modifier = Modifier.width(AppSpacing.sm))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = person.name ?: "Unknown",
                    style = AppTypography.bodySemibold,
                    fontWeight = FontWeight.SemiBold
                )
                person.role?.let { role ->
                    Text(
                        text = role,
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                }
            }

            person.injuryType?.let { injury ->
                CPBadge(
                    text = injury.replace("_", " "),
                    color = ConstructionRed,
                    backgroundColor = ConstructionRed.copy(alpha = 0.1f)
                )
            }
        }
    }
}

@Composable
private fun WitnessCard(witness: IncidentWitness) {
    CPCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Visibility,
                contentDescription = null,
                tint = AppColors.textMuted,
                modifier = Modifier.size(AppSpacing.lg)
            )
            Spacer(modifier = Modifier.width(AppSpacing.sm))
            Column {
                Text(
                    text = witness.name ?: "Unknown Witness",
                    style = AppTypography.bodySemibold,
                    fontWeight = FontWeight.SemiBold
                )
                witness.contact?.let { contact ->
                    Text(
                        text = contact,
                        style = AppTypography.secondary,
                        color = AppColors.textMuted
                    )
                }
            }
        }
    }
}

// Helper functions
private fun getSeverityColor(severity: String): androidx.compose.ui.graphics.Color {
    return when (severity.uppercase()) {
        "CRITICAL" -> ConstructionRed
        "HIGH" -> ConstructionOrange
        "MEDIUM" -> androidx.compose.ui.graphics.Color(0xFFEAB308)
        "LOW" -> ConstructionGreen
        else -> Gray500
    }
}

private fun getSeverityIcon(severity: String): androidx.compose.ui.graphics.vector.ImageVector {
    return when (severity.uppercase()) {
        "CRITICAL" -> Icons.Default.Error
        "HIGH" -> Icons.Default.Warning
        "MEDIUM" -> Icons.Default.Info
        "LOW" -> Icons.Default.CheckCircle
        else -> Icons.Default.Help
    }
}

private fun getStatusColor(status: String): androidx.compose.ui.graphics.Color {
    return when (status.uppercase()) {
        "CLOSED" -> ConstructionGreen
        "UNDER_INVESTIGATION" -> ConstructionOrange
        "REPORTED" -> Primary600
        else -> Gray500
    }
}
