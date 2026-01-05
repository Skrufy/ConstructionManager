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
import com.constructionpro.app.ui.util.TimeUtils
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class ScheduleDetailState(
    val loading: Boolean = false,
    val schedule: CrewSchedule? = null,
    val error: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScheduleDetailScreen(
    apiService: ApiService,
    scheduleId: String,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(ScheduleDetailState(loading = true)) }

    fun loadData() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val schedule = withContext(Dispatchers.IO) {
                    apiService.getSchedule(scheduleId)
                }
                state = state.copy(loading = false, schedule = schedule)
            } catch (error: Exception) {
                state = state.copy(
                    loading = false,
                    error = error.message ?: "Failed to load schedule details"
                )
            }
        }
    }

    LaunchedEffect(scheduleId) {
        loadData()
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.scheduling_details),
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = stringResource(R.string.common_back),
                            tint = AppColors.textPrimary
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { loadData() }) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = null,
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
                CPLoadingIndicator(message = stringResource(R.string.scheduling_loading))
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
            state.schedule?.let { schedule ->
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
                    // Status Banner
                    item {
                        ScheduleStatusBanner(status = schedule.status)
                    }

                    // Header Card
                    item {
                        ScheduleHeaderCard(schedule = schedule)
                    }

                    // Shift Details
                    item {
                        CPSectionHeader(title = "Shift Details")
                    }

                    item {
                        ShiftDetailsCard(schedule = schedule)
                    }

                    // Crew Summary
                    item {
                        CPSectionHeader(title = "Crew Summary")
                    }

                    item {
                        CrewSummaryCard(schedule = schedule)
                    }

                    // Crew Assignments
                    if (schedule.assignments.isNotEmpty()) {
                        item {
                            CPSectionHeader(title = stringResource(R.string.scheduling_crew_members))
                        }

                        items(schedule.assignments) { assignment ->
                            CrewAssignmentCard(assignment = assignment)
                        }
                    } else {
                        item {
                            CPEmptyState(
                                icon = Icons.Default.Groups,
                                title = stringResource(R.string.scheduling_no_crew),
                                description = stringResource(R.string.scheduling_no_crew_desc)
                            )
                        }
                    }

                    // Notes
                    schedule.notes?.let { notes ->
                        if (notes.isNotBlank()) {
                            item {
                                CPSectionHeader(title = stringResource(R.string.scheduling_notes))
                            }
                            item {
                                CPCard {
                                    Text(
                                        text = notes,
                                        style = AppTypography.body,
                                        color = AppColors.textPrimary
                                    )
                                }
                            }
                        }
                    }

                    // Created By
                    schedule.createdBy?.let { creator ->
                        item {
                            CPSectionHeader(title = "Created By")
                        }
                        item {
                            CreatorCard(creator = creator, createdAt = schedule.createdAt)
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
private fun ScheduleStatusBanner(status: String) {
    val confirmedText = stringResource(R.string.scheduling_confirmed)
    val cancelledText = stringResource(R.string.scheduling_cancelled)
    val pendingText = stringResource(R.string.scheduling_pending)

    val (color, icon, message) = when (status.uppercase()) {
        "CONFIRMED" -> Triple(ConstructionGreen, Icons.Default.CheckCircle, confirmedText)
        "CANCELLED" -> Triple(ConstructionRed, Icons.Default.Cancel, cancelledText)
        else -> Triple(Primary600, Icons.Default.Schedule, pendingText)
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
                text = message,
                style = AppTypography.heading3,
                fontWeight = FontWeight.Bold,
                color = color
            )
        }
    }
}

@Composable
private fun ScheduleHeaderCard(schedule: CrewSchedule) {
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
                        .background(Primary100),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.CalendarToday,
                        contentDescription = null,
                        tint = Primary600,
                        modifier = Modifier.size(32.dp)
                    )
                }

                Spacer(modifier = Modifier.width(AppSpacing.md))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = formatDate(schedule.date),
                        style = AppTypography.heading2,
                        fontWeight = FontWeight.Bold
                    )
                    schedule.project?.let { project ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(top = AppSpacing.xxs)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Folder,
                                contentDescription = null,
                                tint = AppColors.textMuted,
                                modifier = Modifier.size(AppSpacing.md)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = project.name,
                                style = AppTypography.bodyLarge,
                                color = AppColors.textSecondary
                            )
                        }
                    }
                }

                CPBadge(
                    text = schedule.status,
                    color = getStatusColor(schedule.status),
                    backgroundColor = getStatusColor(schedule.status).copy(alpha = 0.1f)
                )
            }
        }
    }
}

@Composable
private fun ShiftDetailsCard(schedule: CrewSchedule) {
    CPCard {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
        ) {
            // Date
            DetailRow(
                icon = Icons.Default.Event,
                label = stringResource(R.string.scheduling_date),
                value = formatDate(schedule.date)
            )

            // Shift Time
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.WbSunny,
                            contentDescription = null,
                            tint = ConstructionOrange,
                            modifier = Modifier.size(AppSpacing.lg)
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.xs))
                        Column {
                            Text(
                                text = stringResource(R.string.scheduling_shift_start),
                                style = AppTypography.secondary,
                                color = AppColors.textMuted
                            )
                            Text(
                                text = if (schedule.shiftStart != null) TimeUtils.format12Hour(schedule.shiftStart) else stringResource(R.string.scheduling_not_set),
                                style = AppTypography.bodyLarge,
                                fontWeight = FontWeight.Medium,
                                color = AppColors.textPrimary
                            )
                        }
                    }
                }

                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.NightsStay,
                            contentDescription = null,
                            tint = Primary600,
                            modifier = Modifier.size(AppSpacing.lg)
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.xs))
                        Column {
                            Text(
                                text = stringResource(R.string.scheduling_shift_end),
                                style = AppTypography.secondary,
                                color = AppColors.textMuted
                            )
                            Text(
                                text = if (schedule.shiftEnd != null) TimeUtils.format12Hour(schedule.shiftEnd) else stringResource(R.string.scheduling_not_set),
                                style = AppTypography.bodyLarge,
                                fontWeight = FontWeight.Medium,
                                color = AppColors.textPrimary
                            )
                        }
                    }
                }
            }

            // Project
            schedule.project?.let { project ->
                DetailRow(
                    icon = Icons.Default.Business,
                    label = stringResource(R.string.scheduling_project),
                    value = project.name
                )
            }
        }
    }
}

@Composable
private fun CrewSummaryCard(schedule: CrewSchedule) {
    val confirmedCount = schedule.assignments.count { it.confirmed }
    val pendingCount = schedule.assignments.count { !it.confirmed }

    CPCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    imageVector = Icons.Default.Groups,
                    contentDescription = null,
                    tint = Primary600,
                    modifier = Modifier.size(28.dp)
                )
                Spacer(modifier = Modifier.height(AppSpacing.xxs))
                Text(
                    text = "${schedule.crewCount}",
                    style = AppTypography.heading2,
                    fontWeight = FontWeight.Bold,
                    color = Primary700
                )
                Text(
                    text = stringResource(R.string.scheduling_crew),
                    style = AppTypography.secondary,
                    color = AppColors.textMuted
                )
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    imageVector = Icons.Default.HowToReg,
                    contentDescription = null,
                    tint = ConstructionGreen,
                    modifier = Modifier.size(28.dp)
                )
                Spacer(modifier = Modifier.height(AppSpacing.xxs))
                Text(
                    text = "$confirmedCount",
                    style = AppTypography.heading2,
                    fontWeight = FontWeight.Bold,
                    color = ConstructionGreen
                )
                Text(
                    text = stringResource(R.string.scheduling_confirmed),
                    style = AppTypography.secondary,
                    color = AppColors.textMuted
                )
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    imageVector = Icons.Default.PendingActions,
                    contentDescription = null,
                    tint = ConstructionOrange,
                    modifier = Modifier.size(28.dp)
                )
                Spacer(modifier = Modifier.height(AppSpacing.xxs))
                Text(
                    text = "$pendingCount",
                    style = AppTypography.heading2,
                    fontWeight = FontWeight.Bold,
                    color = ConstructionOrange
                )
                Text(
                    text = stringResource(R.string.scheduling_pending),
                    style = AppTypography.secondary,
                    color = AppColors.textMuted
                )
            }
        }
    }
}

@Composable
private fun CrewAssignmentCard(assignment: CrewAssignment) {
    val confirmedText = stringResource(R.string.scheduling_confirmed)
    val pendingText = stringResource(R.string.scheduling_pending)

    CPCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(AppSpacing.sm))
                    .background(if (assignment.confirmed) ConstructionGreen.copy(alpha = 0.1f) else AppColors.gray100),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = assignment.user?.name?.take(2)?.uppercase() ?: "??",
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.Bold,
                    color = if (assignment.confirmed) ConstructionGreen else AppColors.textSecondary
                )
            }

            Spacer(modifier = Modifier.width(AppSpacing.sm))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = assignment.user?.name ?: "Unknown",
                    style = AppTypography.bodySemibold,
                    fontWeight = FontWeight.SemiBold
                )
                assignment.role?.let { role ->
                    Text(
                        text = role.replace("_", " "),
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                }
                assignment.notes?.let { notes ->
                    Text(
                        text = notes,
                        style = AppTypography.secondary,
                        color = AppColors.textMuted,
                        maxLines = 1
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                CPBadge(
                    text = if (assignment.confirmed) confirmedText else pendingText,
                    color = if (assignment.confirmed) ConstructionGreen else ConstructionOrange,
                    backgroundColor = if (assignment.confirmed) ConstructionGreen.copy(alpha = 0.1f) else ConstructionOrange.copy(alpha = 0.1f)
                )
                assignment.role?.let { role ->
                    Spacer(modifier = Modifier.height(AppSpacing.xxs))
                    CPBadge(
                        text = role,
                        color = AppColors.textSecondary,
                        backgroundColor = AppColors.gray100
                    )
                }
            }
        }
    }
}

@Composable
private fun CreatorCard(creator: UserSummary, createdAt: String?) {
    CPCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(Primary100),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Person,
                    contentDescription = null,
                    tint = Primary600,
                    modifier = Modifier.size(AppSpacing.lg)
                )
            }

            Spacer(modifier = Modifier.width(AppSpacing.sm))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = creator.name ?: "Unknown",
                    style = AppTypography.bodySemibold,
                    fontWeight = FontWeight.SemiBold
                )
                createdAt?.let { date ->
                    Text(
                        text = "Created on ${date.take(10)}",
                        style = AppTypography.secondary,
                        color = AppColors.textMuted
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
    value: String
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
                color = AppColors.textPrimary
            )
        }
    }
}

// Helper functions
private fun getStatusColor(status: String): androidx.compose.ui.graphics.Color {
    return when (status.uppercase()) {
        "CONFIRMED" -> ConstructionGreen
        "CANCELLED" -> ConstructionRed
        else -> Primary600
    }
}

private fun formatDate(dateString: String): String {
    return try {
        val date = java.time.LocalDate.parse(dateString.take(10))
        val formatter = java.time.format.DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy")
        date.format(formatter)
    } catch (e: Exception) {
        dateString.take(10)
    }
}
