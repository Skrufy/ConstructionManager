package com.constructionpro.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.constructionpro.app.R
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.model.*
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import com.constructionpro.app.ui.util.TimeUtils
import com.constructionpro.app.ui.util.responsiveValue
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.WeekFields
import java.util.Locale

private data class SchedulingState(
    val loading: Boolean = false,
    val schedules: List<CrewSchedule> = emptyList(),
    val error: String? = null,
    val selectedWeekStart: LocalDate = LocalDate.now().with(WeekFields.of(Locale.getDefault()).dayOfWeek(), 1),
    val total: Int = 0
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SchedulingScreen(
    apiService: ApiService,
    onBack: () -> Unit,
    onOpenSchedule: (String) -> Unit = {},
    onCreateSchedule: () -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(SchedulingState(loading = true)) }
    val dateFormatter = remember { DateTimeFormatter.ofPattern("yyyy-MM-dd") }
    val displayFormatter = remember { DateTimeFormatter.ofPattern("MMM d") }

    fun loadSchedules() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val weekEnd = state.selectedWeekStart.plusDays(6)
                val response = withContext(Dispatchers.IO) {
                    apiService.getSchedules(
                        startDate = state.selectedWeekStart.format(dateFormatter),
                        endDate = weekEnd.format(dateFormatter),
                        pageSize = 100
                    )
                }
                state = state.copy(
                    loading = false,
                    schedules = response.schedules,
                    total = response.total
                )
            } catch (error: Exception) {
                state = state.copy(
                    loading = false,
                    error = error.message ?: "Failed to load schedules"
                )
            }
        }
    }

    LaunchedEffect(state.selectedWeekStart) {
        loadSchedules()
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.scheduling_title),
                subtitle = "${state.total} assignments",
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
                    IconButton(onClick = { loadSchedules() }) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = null,
                            tint = AppColors.textSecondary
                        )
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onCreateSchedule,
                containerColor = Primary600,
                contentColor = androidx.compose.ui.graphics.Color.White
            ) {
                Icon(Icons.Default.Add, contentDescription = stringResource(R.string.scheduling_add))
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(
                horizontal = responsiveValue(AppSpacing.md, AppSpacing.xl, AppSpacing.xxl),
                vertical = AppSpacing.sm
            ),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            // Week Navigator
            item {
                WeekNavigator(
                    weekStart = state.selectedWeekStart,
                    onPreviousWeek = {
                        state = state.copy(selectedWeekStart = state.selectedWeekStart.minusWeeks(1))
                    },
                    onNextWeek = {
                        state = state.copy(selectedWeekStart = state.selectedWeekStart.plusWeeks(1))
                    },
                    onToday = {
                        state = state.copy(
                            selectedWeekStart = LocalDate.now().with(
                                WeekFields.of(Locale.getDefault()).dayOfWeek(), 1
                            )
                        )
                    }
                )
            }

            // Week Days Header
            item {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    items(7) { dayOffset ->
                        val date = state.selectedWeekStart.plusDays(dayOffset.toLong())
                        val isToday = date == LocalDate.now()
                        DayChip(
                            date = date,
                            isToday = isToday,
                            scheduleCount = state.schedules.count { schedule ->
                                schedule.date == date.format(dateFormatter)
                            }
                        )
                    }
                }
            }

            // Error Banner
            if (state.error != null) {
                item {
                    CPErrorBanner(
                        message = state.error ?: "An error occurred",
                        onRetry = { loadSchedules() },
                        onDismiss = { state = state.copy(error = null) }
                    )
                }
            }

            // Loading
            if (state.loading && state.schedules.isEmpty()) {
                item {
                    CPLoadingIndicator(message = stringResource(R.string.scheduling_loading))
                }
            }

            // Group schedules by date
            val schedulesByDate = state.schedules.groupBy { it.date }
            schedulesByDate.forEach { (date, daySchedules) ->
                item {
                    Text(
                        text = try {
                            LocalDate.parse(date).format(DateTimeFormatter.ofPattern("EEEE, MMM d"))
                        } catch (_: Exception) { date },
                        style = AppTypography.bodySemibold,
                        fontWeight = FontWeight.SemiBold,
                        color = AppColors.textPrimary,
                        modifier = Modifier.padding(top = AppSpacing.xs)
                    )
                }

                items(daySchedules) { schedule ->
                    ScheduleCard(
                        schedule = schedule,
                        onClick = { onOpenSchedule(schedule.id) }
                    )
                }
            }

            // Empty State
            if (!state.loading && state.schedules.isEmpty() && state.error == null) {
                item {
                    CPEmptyState(
                        icon = Icons.Default.CalendarMonth,
                        title = stringResource(R.string.scheduling_empty_title),
                        description = stringResource(R.string.scheduling_empty_desc)
                    )
                }
            }

            item {
                Spacer(modifier = Modifier.height(AppSpacing.md))
            }
        }
    }
}

@Composable
private fun WeekNavigator(
    weekStart: LocalDate,
    onPreviousWeek: () -> Unit,
    onNextWeek: () -> Unit,
    onToday: () -> Unit
) {
    val weekEnd = weekStart.plusDays(6)
    val displayFormatter = DateTimeFormatter.ofPattern("MMM d")

    CPCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            IconButton(
                onClick = onPreviousWeek,
                modifier = Modifier.size(48.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.ChevronLeft,
                    contentDescription = "Previous Week",
                    tint = Primary600
                )
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "${weekStart.format(displayFormatter)} - ${weekEnd.format(displayFormatter)}",
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold
                )
                TextButton(onClick = onToday) {
                    Text("Today", color = Primary600)
                }
            }

            IconButton(
                onClick = onNextWeek,
                modifier = Modifier.size(48.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.ChevronRight,
                    contentDescription = "Next Week",
                    tint = Primary600
                )
            }
        }
    }
}

@Composable
private fun DayChip(
    date: LocalDate,
    isToday: Boolean,
    scheduleCount: Int
) {
    val dayFormatter = DateTimeFormatter.ofPattern("EEE")
    val dateFormatter = DateTimeFormatter.ofPattern("d")

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(AppSpacing.sm))
            .background(if (isToday) Primary600 else AppColors.gray100)
            .padding(horizontal = AppSpacing.sm, vertical = AppSpacing.xs)
            .widthIn(min = 48.dp)
    ) {
        Text(
            text = date.format(dayFormatter).uppercase(),
            style = AppTypography.caption,
            color = if (isToday) androidx.compose.ui.graphics.Color.White.copy(alpha = 0.8f) else AppColors.textSecondary
        )
        Text(
            text = date.format(dateFormatter),
            style = AppTypography.heading3,
            fontWeight = FontWeight.Bold,
            color = if (isToday) androidx.compose.ui.graphics.Color.White else AppColors.textPrimary
        )
        if (scheduleCount > 0) {
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .clip(CircleShape)
                    .background(if (isToday) androidx.compose.ui.graphics.Color.White else Primary600)
            )
        }
    }
}

@Composable
private fun ScheduleCard(
    schedule: CrewSchedule,
    onClick: () -> Unit
) {
    CPCard(onClick = onClick) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Time Block
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .clip(RoundedCornerShape(AppSpacing.xs))
                    .background(AppColors.primary100)
                    .padding(horizontal = AppSpacing.sm, vertical = AppSpacing.xs)
            ) {
                Text(
                    text = schedule.shiftStart?.let { TimeUtils.format12Hour(it) } ?: stringResource(R.string.scheduling_tbd),
                    style = AppTypography.label,
                    fontWeight = FontWeight.SemiBold,
                    color = AppColors.primary600
                )
                if (schedule.shiftEnd != null) {
                    Text(
                        text = TimeUtils.format12Hour(schedule.shiftEnd),
                        style = AppTypography.caption,
                        color = AppColors.primary600
                    )
                }
            }

            Spacer(modifier = Modifier.width(AppSpacing.md))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = schedule.project?.name ?: "Unassigned",
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                schedule.notes?.let { notes ->
                    Text(
                        text = notes,
                        style = AppTypography.body,
                        color = AppColors.textSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                // Crew assignments count
                if (schedule.assignments.isNotEmpty()) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(top = AppSpacing.xxs)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Groups,
                            contentDescription = null,
                            tint = AppColors.textSecondary,
                            modifier = Modifier.size(AppSpacing.md)
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.xxs))
                        Text(
                            text = stringResource(R.string.scheduling_crew_members),
                            style = AppTypography.secondary,
                            color = AppColors.textSecondary
                        )
                    }
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                CPBadge(
                    text = formatScheduleStatus(schedule.status),
                    color = getScheduleStatusColor(schedule.status),
                    backgroundColor = getScheduleStatusColor(schedule.status).copy(alpha = 0.1f)
                )
            }

            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = AppColors.textSecondary,
                modifier = Modifier.padding(start = AppSpacing.xs)
            )
        }
    }
}

private fun getScheduleStatusColor(status: String): androidx.compose.ui.graphics.Color {
    return when (status.uppercase()) {
        "CONFIRMED" -> ConstructionGreen
        "PENDING" -> ConstructionOrange
        "CANCELLED" -> ConstructionRed
        "COMPLETED" -> Primary600
        else -> Gray500
    }
}

private fun formatScheduleStatus(status: String): String {
    return status.replace("_", " ").lowercase().split(" ")
        .joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } }
}
