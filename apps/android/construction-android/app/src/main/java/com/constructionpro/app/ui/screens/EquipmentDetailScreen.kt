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

private data class EquipmentDetailState(
    val loading: Boolean = false,
    val equipment: Equipment? = null,
    val logs: List<EquipmentLog> = emptyList(),
    val serviceLogs: List<EquipmentLog> = emptyList(),
    val assignments: List<EquipmentAssignment> = emptyList(),
    val error: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EquipmentDetailScreen(
    apiService: ApiService,
    equipmentId: String,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(EquipmentDetailState(loading = true)) }

    fun loadData() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val response = withContext(Dispatchers.IO) {
                    apiService.getEquipmentDetail(equipmentId)
                }
                // Separate service/maintenance logs from activity logs
                val serviceLogs = response.logs.filter { log ->
                    log.type.uppercase() in listOf("SERVICE", "MAINTENANCE", "INSPECTION")
                }
                val activityLogs = response.logs.filter { log ->
                    log.type.uppercase() !in listOf("SERVICE", "MAINTENANCE", "INSPECTION")
                }
                state = state.copy(
                    loading = false,
                    equipment = response.equipment,
                    logs = activityLogs,
                    serviceLogs = serviceLogs,
                    assignments = response.assignments
                )
            } catch (error: Exception) {
                state = state.copy(
                    loading = false,
                    error = error.message ?: "Failed to load equipment details"
                )
            }
        }
    }

    LaunchedEffect(equipmentId) {
        loadData()
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = state.equipment?.name ?: stringResource(R.string.equipment_title),
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
                CPLoadingIndicator(message = "Loading equipment details...")
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
            state.equipment?.let { equipment ->
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
                    // Header Card with Status
                    item {
                        EquipmentHeaderCard(equipment = equipment)
                    }

                    // Specifications
                    item {
                        CPSectionHeader(title = "Specifications")
                    }

                    item {
                        SpecificationsCard(equipment = equipment)
                    }

                    // Current Assignment
                    equipment.currentProject?.let { project ->
                        item {
                            CPSectionHeader(title = "Current Assignment")
                        }
                        item {
                            CurrentAssignmentCard(project = project)
                        }
                    }

                    // Usage Stats
                    item {
                        CPSectionHeader(title = "Usage Statistics")
                    }

                    item {
                        UsageStatsCard(equipment = equipment)
                    }

                    // Service Logs Section
                    if (state.serviceLogs.isNotEmpty()) {
                        item {
                            CPSectionHeader(title = "Service Logs")
                        }

                        items(state.serviceLogs) { log ->
                            ServiceLogCard(log = log)
                        }
                    }

                    // Recent Activity Logs
                    if (state.logs.isNotEmpty()) {
                        item {
                            CPSectionHeader(title = "Recent Activity")
                        }

                        items(state.logs.take(5)) { log ->
                            EquipmentLogCard(log = log)
                        }
                    }

                    // Assignment History
                    if (state.assignments.isNotEmpty()) {
                        item {
                            CPSectionHeader(title = "Assignment History")
                        }

                        items(state.assignments.take(5)) { assignment ->
                            AssignmentHistoryCard(assignment = assignment)
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
private fun EquipmentHeaderCard(equipment: Equipment) {
    CPCard {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(RoundedCornerShape(AppSpacing.md))
                        .background(getEquipmentStatusColor(equipment.status).copy(alpha = 0.1f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Construction,
                        contentDescription = null,
                        tint = getEquipmentStatusColor(equipment.status),
                        modifier = Modifier.size(32.dp)
                    )
                }

                Spacer(modifier = Modifier.width(AppSpacing.md))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = equipment.name,
                        style = AppTypography.heading2,
                        fontWeight = FontWeight.Bold
                    )
                    if (equipment.make != null || equipment.model != null) {
                        Text(
                            text = listOfNotNull(equipment.make, equipment.model).joinToString(" "),
                            style = AppTypography.body,
                            color = AppColors.textSecondary
                        )
                    }
                    equipment.type?.let { type ->
                        Text(
                            text = type.replace("_", " "),
                            style = AppTypography.body,
                            color = AppColors.textSecondary
                        )
                    }
                }

                CPBadge(
                    text = formatStatus(equipment.status),
                    color = getEquipmentStatusColor(equipment.status),
                    backgroundColor = getEquipmentStatusColor(equipment.status).copy(alpha = 0.1f)
                )
            }

            equipment.serialNumber?.let { serial ->
                Spacer(modifier = Modifier.height(AppSpacing.sm))
                HorizontalDivider(color = AppColors.divider)
                Spacer(modifier = Modifier.height(AppSpacing.sm))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Tag,
                        contentDescription = null,
                        tint = AppColors.textSecondary,
                        modifier = Modifier.size(AppSpacing.md)
                    )
                    Spacer(modifier = Modifier.width(AppSpacing.xs))
                    Text(
                        text = "S/N: $serial",
                        style = AppTypography.body,
                        color = AppColors.textPrimary
                    )
                }
            }
        }
    }
}

@Composable
private fun SpecificationsCard(equipment: Equipment) {
    CPCard {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            equipment.year?.let { year ->
                SpecRow(label = "Year", value = year.toString())
            }
            equipment.make?.let { make ->
                SpecRow(label = "Manufacturer", value = make)
            }
            equipment.model?.let { model ->
                SpecRow(label = "Model", value = model)
            }
            equipment.serialNumber?.let { serial ->
                SpecRow(label = "Serial Number", value = serial)
            }
            equipment.licensePlate?.let { plate ->
                SpecRow(label = "License Plate", value = plate)
            }
            equipment.fuelType?.let { fuel ->
                SpecRow(label = "Fuel Type", value = fuel)
            }
        }
    }
}

@Composable
private fun SpecRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = AppTypography.body,
            color = AppColors.textSecondary
        )
        Text(
            text = value,
            style = AppTypography.body,
            fontWeight = FontWeight.Medium,
            color = AppColors.textPrimary
        )
    }
}

@Composable
private fun CurrentAssignmentCard(project: ProjectSummary) {
    CPCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(AppSpacing.sm))
                    .background(AppColors.primary100),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Folder,
                    contentDescription = null,
                    tint = AppColors.primary600,
                    modifier = Modifier.size(AppSpacing.xl)
                )
            }

            Spacer(modifier = Modifier.width(AppSpacing.md))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = project.name,
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold
                )
                project.address?.let { address ->
                    Text(
                        text = address,
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                }
            }

            CPBadge(
                text = "Active",
                color = ConstructionGreen,
                backgroundColor = ConstructionGreen.copy(alpha = 0.1f)
            )
        }
    }
}

@Composable
private fun UsageStatsCard(equipment: Equipment) {
    CPCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            StatItem(
                label = "Hour Meter",
                value = equipment.hourMeterReading?.let { "${it.toInt()}h" } ?: "--",
                icon = Icons.Default.Schedule
            )
            StatItem(
                label = "Odometer",
                value = equipment.odometerReading?.let { "${it.toInt()} mi" } ?: "--",
                icon = Icons.Default.Speed
            )
            StatItem(
                label = "Last Service",
                value = equipment.lastServiceDate?.take(10) ?: "--",
                icon = Icons.Default.Build
            )
        }
    }
}

@Composable
private fun StatItem(
    label: String,
    value: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = AppColors.primary600,
            modifier = Modifier.size(AppSpacing.xl)
        )
        Spacer(modifier = Modifier.height(AppSpacing.xxs))
        Text(
            text = value,
            style = AppTypography.heading3,
            fontWeight = FontWeight.Bold,
            color = AppColors.textPrimary
        )
        Text(
            text = label,
            style = AppTypography.secondary,
            color = AppColors.textSecondary
        )
    }
}

@Composable
private fun EquipmentLogCard(log: EquipmentLog) {
    CPCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(AppSpacing.radiusMedium))
                    .background(getLogTypeColor(log.type).copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = getLogTypeIcon(log.type),
                    contentDescription = null,
                    tint = getLogTypeColor(log.type),
                    modifier = Modifier.size(AppSpacing.lg)
                )
            }

            Spacer(modifier = Modifier.width(AppSpacing.sm))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = log.type.replace("_", " "),
                    style = AppTypography.bodySemibold,
                    fontWeight = FontWeight.SemiBold
                )
                log.notes?.let { notes ->
                    Text(
                        text = notes,
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary,
                        maxLines = 2
                    )
                }
            }

            Text(
                text = log.createdAt?.take(10) ?: "",
                style = AppTypography.secondary,
                color = AppColors.textSecondary
            )
        }
    }
}

@Composable
private fun AssignmentHistoryCard(assignment: EquipmentAssignment) {
    val isActive = assignment.returnedAt == null
    val statusText = if (isActive) "ACTIVE" else "RETURNED"

    CPCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = assignment.project?.name ?: "Unknown Project",
                    style = AppTypography.bodySemibold,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "${assignment.assignedAt?.take(10) ?: "?"} - ${assignment.returnedAt?.take(10) ?: "Present"}",
                    style = AppTypography.secondary,
                    color = AppColors.textSecondary
                )
            }

            CPBadge(
                text = statusText,
                color = if (isActive) ConstructionGreen else AppColors.textSecondary,
                backgroundColor = if (isActive) ConstructionGreen.copy(alpha = 0.1f) else AppColors.surfaceVariant
            )
        }
    }
}

@Composable
private fun ServiceLogCard(log: EquipmentLog) {
    CPCard {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            // Header row with type and date
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(RoundedCornerShape(AppSpacing.sm))
                        .background(getServiceLogTypeColor(log.type).copy(alpha = 0.1f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = getServiceLogTypeIcon(log.type),
                        contentDescription = null,
                        tint = getServiceLogTypeColor(log.type),
                        modifier = Modifier.size(AppSpacing.xl)
                    )
                }

                Spacer(modifier = Modifier.width(AppSpacing.sm))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = formatServiceLogType(log.type),
                        style = AppTypography.heading3,
                        fontWeight = FontWeight.SemiBold
                    )
                    log.user?.name?.let { userName ->
                        Text(
                            text = "By $userName",
                            style = AppTypography.secondary,
                            color = AppColors.textSecondary
                        )
                    }
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = log.createdAt?.take(10) ?: "",
                        style = AppTypography.body,
                        fontWeight = FontWeight.Medium,
                        color = AppColors.textPrimary
                    )
                    Text(
                        text = log.createdAt?.substring(11, 16) ?: "",
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                }
            }

            // Notes section
            log.notes?.let { notes ->
                HorizontalDivider(color = AppColors.divider)
                Text(
                    text = notes,
                    style = AppTypography.body,
                    color = AppColors.textPrimary
                )
            }
        }
    }
}

// Service log specific helper functions
private fun getServiceLogTypeIcon(type: String): androidx.compose.ui.graphics.vector.ImageVector {
    return when (type.uppercase()) {
        "SERVICE" -> Icons.Default.Build
        "MAINTENANCE" -> Icons.Default.Handyman
        "INSPECTION" -> Icons.Default.Checklist
        else -> Icons.Default.Description
    }
}

private fun getServiceLogTypeColor(type: String): androidx.compose.ui.graphics.Color {
    return when (type.uppercase()) {
        "SERVICE" -> Primary600
        "MAINTENANCE" -> ConstructionOrange
        "INSPECTION" -> ConstructionGreen
        else -> Gray600
    }
}

private fun formatServiceLogType(type: String): String {
    return when (type.uppercase()) {
        "SERVICE" -> "Scheduled Service"
        "MAINTENANCE" -> "Maintenance"
        "INSPECTION" -> "Safety Inspection"
        else -> type.replace("_", " ").lowercase()
            .replaceFirstChar { it.uppercase() }
    }
}

// Helper functions
private fun getEquipmentStatusColor(status: String): androidx.compose.ui.graphics.Color {
    return when (status.uppercase()) {
        "AVAILABLE" -> ConstructionGreen
        "IN_USE" -> Primary600
        "MAINTENANCE" -> ConstructionOrange
        "OUT_OF_SERVICE" -> ConstructionRed
        else -> Gray500
    }
}

private fun formatStatus(status: String): String {
    return status.replace("_", " ").lowercase().split(" ")
        .joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } }
}

private fun getLogTypeIcon(type: String): androidx.compose.ui.graphics.vector.ImageVector {
    return when (type.uppercase()) {
        "MAINTENANCE" -> Icons.Default.Build
        "INSPECTION" -> Icons.Default.Checklist
        "FUEL" -> Icons.Default.LocalGasStation
        "REPAIR" -> Icons.Default.Handyman
        "INCIDENT" -> Icons.Default.Warning
        else -> Icons.Default.Description
    }
}

private fun getLogTypeColor(type: String): androidx.compose.ui.graphics.Color {
    return when (type.uppercase()) {
        "MAINTENANCE" -> ConstructionOrange
        "INSPECTION" -> Primary600
        "FUEL" -> ConstructionGreen
        "REPAIR" -> ConstructionRed
        "INCIDENT" -> ConstructionRed
        else -> Gray600
    }
}
