package com.constructionpro.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
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
import com.constructionpro.app.ui.util.responsiveValue
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class SafetyState(
    val loading: Boolean = false,
    val incidents: List<Incident> = emptyList(),
    val inspections: List<Inspection> = emptyList(),
    val punchLists: List<PunchList> = emptyList(),
    val meetings: List<SafetyMeeting> = emptyList(),
    val error: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SafetyScreen(
    apiService: ApiService,
    onBack: () -> Unit,
    onOpenIncident: (String) -> Unit = {},
    onOpenInspection: (String) -> Unit = {},
    onOpenPunchList: (String) -> Unit = {},
    onCreateIncident: () -> Unit = {},
    onCreateInspection: () -> Unit = {},
    onCreatePunchList: () -> Unit = {},
    onCreateMeeting: () -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(SafetyState(loading = true)) }
    val pagerState = rememberPagerState(pageCount = { 4 })
    val tabs = listOf(
        stringResource(R.string.safety_incidents),
        stringResource(R.string.safety_inspections),
        stringResource(R.string.safety_punch_lists),
        stringResource(R.string.safety_meetings)
    )

    val loadFailedMsg = stringResource(R.string.safety_load_failed)
    fun loadData() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val incidents = withContext(Dispatchers.IO) {
                    try { apiService.getIncidents(pageSize = 50) } catch (_: Exception) { null }
                }
                val inspections = withContext(Dispatchers.IO) {
                    try { apiService.getInspections(pageSize = 50) } catch (_: Exception) { null }
                }
                val punchLists = withContext(Dispatchers.IO) {
                    try { apiService.getPunchLists(pageSize = 50) } catch (_: Exception) { null }
                }
                val meetings = withContext(Dispatchers.IO) {
                    try { apiService.getSafetyMeetings() } catch (_: Exception) { null }
                }
                state = state.copy(
                    loading = false,
                    incidents = incidents?.incidents ?: emptyList(),
                    inspections = inspections?.inspections ?: emptyList(),
                    punchLists = punchLists?.punchLists ?: emptyList(),
                    meetings = meetings?.meetings ?: emptyList()
                )
            } catch (error: Exception) {
                state = state.copy(
                    loading = false,
                    error = error.message ?: loadFailedMsg
                )
            }
        }
    }

    LaunchedEffect(Unit) {
        loadData()
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.safety_title),
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
                            contentDescription = stringResource(R.string.common_refresh),
                            tint = AppColors.textSecondary
                        )
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Tab Row
            TabRow(
                selectedTabIndex = pagerState.currentPage,
                containerColor = AppColors.cardBackground,
                contentColor = AppColors.primary600,
                indicator = { tabPositions ->
                    TabRowDefaults.SecondaryIndicator(
                        modifier = Modifier.tabIndicatorOffset(tabPositions[pagerState.currentPage]),
                        color = AppColors.primary600
                    )
                }
            ) {
                tabs.forEachIndexed { index, title ->
                    val count = when (index) {
                        0 -> state.incidents.size
                        1 -> state.inspections.size
                        2 -> state.punchLists.size
                        3 -> state.meetings.size
                        else -> 0
                    }
                    Tab(
                        selected = pagerState.currentPage == index,
                        onClick = {
                            scope.launch { pagerState.animateScrollToPage(index) }
                        },
                        text = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(title)
                                if (count > 0) {
                                    Spacer(modifier = Modifier.width(AppSpacing.xxs))
                                    Badge(
                                        containerColor = if (pagerState.currentPage == index)
                                            androidx.compose.ui.graphics.Color.White
                                        else
                                            AppColors.gray100,
                                        contentColor = if (pagerState.currentPage == index)
                                            AppColors.primary600
                                        else
                                            AppColors.textSecondary
                                    ) {
                                        Text("$count")
                                    }
                                }
                            }
                        },
                        selectedContentColor = AppColors.primary600,
                        unselectedContentColor = AppColors.textSecondary
                    )
                }
            }

            // Error Banner
            if (state.error != null) {
                Box(modifier = Modifier.padding(AppSpacing.md)) {
                    CPErrorBanner(
                        message = state.error ?: stringResource(R.string.error_generic),
                        onRetry = { loadData() },
                        onDismiss = { state = state.copy(error = null) }
                    )
                }
            }

            // Pager Content
            HorizontalPager(
                state = pagerState,
                modifier = Modifier.fillMaxSize()
            ) { page ->
                when (page) {
                    0 -> IncidentsTab(
                        incidents = state.incidents,
                        loading = state.loading,
                        onOpenIncident = onOpenIncident,
                        onCreateIncident = onCreateIncident
                    )
                    1 -> InspectionsTab(
                        inspections = state.inspections,
                        loading = state.loading,
                        onOpenInspection = onOpenInspection,
                        onCreateInspection = onCreateInspection
                    )
                    2 -> PunchListsTab(
                        punchLists = state.punchLists,
                        loading = state.loading,
                        onOpenPunchList = onOpenPunchList,
                        onCreatePunchList = onCreatePunchList
                    )
                    3 -> MeetingsTab(
                        meetings = state.meetings,
                        loading = state.loading,
                        onCreateMeeting = onCreateMeeting
                    )
                }
            }
        }
    }
}

@Composable
private fun IncidentsTab(
    incidents: List<Incident>,
    loading: Boolean,
    onOpenIncident: (String) -> Unit,
    onCreateIncident: () -> Unit
) {
    Box(modifier = Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(
                horizontal = responsiveValue(AppSpacing.md, AppSpacing.xl, AppSpacing.xxl),
                vertical = AppSpacing.md
            ),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            if (loading && incidents.isEmpty()) {
                item { CPLoadingIndicator(message = stringResource(R.string.safety_loading_incidents)) }
            }

            items(incidents) { incident ->
                IncidentCard(incident = incident, onClick = { onOpenIncident(incident.id) })
            }

            if (!loading && incidents.isEmpty()) {
                item {
                    CPEmptyState(
                        icon = Icons.Default.HealthAndSafety,
                        title = stringResource(R.string.safety_no_incidents),
                        description = stringResource(R.string.safety_no_incidents_desc)
                    )
                }
            }

            // Add bottom padding for FAB
            item { Spacer(modifier = Modifier.height(80.dp)) }
        }

        // FAB to create new incident
        FloatingActionButton(
            onClick = onCreateIncident,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(AppSpacing.md),
            containerColor = AppColors.primary600,
            contentColor = androidx.compose.ui.graphics.Color.White
        ) {
            Icon(
                imageVector = Icons.Default.Add,
                contentDescription = stringResource(R.string.safety_new_incident)
            )
        }
    }
}

@Composable
private fun IncidentCard(
    incident: Incident,
    onClick: () -> Unit
) {
    CPCard(onClick = onClick) {
        Row(modifier = Modifier.fillMaxWidth()) {
            // Severity Indicator
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(AppSpacing.sm))
                    .background(getSeverityColor(incident.severity).copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = getSeverityIcon(incident.severity),
                    contentDescription = null,
                    tint = getSeverityColor(incident.severity),
                    modifier = Modifier.size(AppSpacing.xl)
                )
            }

            Spacer(modifier = Modifier.width(AppSpacing.md))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = incident.title,
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(top = AppSpacing.xxs)
                ) {
                    CPBadge(
                        text = incident.type.replace("_", " "),
                        color = AppColors.textSecondary,
                        backgroundColor = AppColors.gray100
                    )
                    Spacer(modifier = Modifier.width(AppSpacing.xs))
                    CPBadge(
                        text = incident.status.replace("_", " "),
                        color = getStatusColor(incident.status),
                        backgroundColor = getStatusColor(incident.status).copy(alpha = 0.1f)
                    )
                }
                incident.displayProjectName?.let { project ->
                    Text(
                        text = project,
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary,
                        modifier = Modifier.padding(top = AppSpacing.xxs)
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                CPBadge(
                    text = incident.severity,
                    color = getSeverityColor(incident.severity),
                    backgroundColor = getSeverityColor(incident.severity).copy(alpha = 0.1f)
                )
                Text(
                    text = incident.incidentDate.take(10),
                    style = AppTypography.secondary,
                    color = AppColors.textSecondary,
                    modifier = Modifier.padding(top = AppSpacing.xxs)
                )
            }
        }
    }
}

@Composable
private fun InspectionsTab(
    inspections: List<Inspection>,
    loading: Boolean,
    onOpenInspection: (String) -> Unit,
    onCreateInspection: () -> Unit
) {
    Box(modifier = Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(
                horizontal = responsiveValue(AppSpacing.md, AppSpacing.xl, AppSpacing.xxl),
                vertical = AppSpacing.md
            ),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            if (loading && inspections.isEmpty()) {
                item { CPLoadingIndicator(message = stringResource(R.string.safety_loading_inspections)) }
            }

            items(inspections) { inspection ->
                InspectionCard(inspection = inspection, onClick = { onOpenInspection(inspection.id) })
            }

            if (!loading && inspections.isEmpty()) {
                item {
                    CPEmptyState(
                        icon = Icons.Default.Checklist,
                        title = stringResource(R.string.safety_no_inspections),
                        description = stringResource(R.string.safety_no_inspections_desc)
                    )
                }
            }

            // Add bottom padding for FAB
            item { Spacer(modifier = Modifier.height(80.dp)) }
        }

        // FAB to create new inspection
        FloatingActionButton(
            onClick = onCreateInspection,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(AppSpacing.md),
            containerColor = AppColors.primary600,
            contentColor = androidx.compose.ui.graphics.Color.White
        ) {
            Icon(
                imageVector = Icons.Default.Add,
                contentDescription = stringResource(R.string.safety_new_inspection)
            )
        }
    }
}

@Composable
private fun InspectionCard(
    inspection: Inspection,
    onClick: () -> Unit
) {
    val generalInspectionText = stringResource(R.string.safety_general_inspection)
    CPCard(onClick = onClick) {
        Row(modifier = Modifier.fillMaxWidth()) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(AppSpacing.sm))
                    .background(getInspectionStatusColor(inspection.status).copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Checklist,
                    contentDescription = null,
                    tint = getInspectionStatusColor(inspection.status),
                    modifier = Modifier.size(AppSpacing.xl)
                )
            }

            Spacer(modifier = Modifier.width(AppSpacing.md))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = inspection.type ?: generalInspectionText,
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold
                )
                inspection.displayProjectName?.let { project ->
                    Text(
                        text = project,
                        style = AppTypography.body,
                        color = AppColors.textSecondary
                    )
                }
                inspection.displayInspectorName?.let { inspector ->
                    Text(
                        text = stringResource(R.string.safety_by_inspector, inspector),
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                CPBadge(
                    text = inspection.status.replace("_", " "),
                    color = getInspectionStatusColor(inspection.status),
                    backgroundColor = getInspectionStatusColor(inspection.status).copy(alpha = 0.1f)
                )
                inspection.overallResult?.let { result ->
                    CPBadge(
                        text = result,
                        color = getResultColor(result),
                        backgroundColor = getResultColor(result).copy(alpha = 0.1f)
                    )
                }
            }
        }
    }
}

@Composable
private fun PunchListsTab(
    punchLists: List<PunchList>,
    loading: Boolean,
    onOpenPunchList: (String) -> Unit,
    onCreatePunchList: () -> Unit
) {
    Box(modifier = Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(
                horizontal = responsiveValue(AppSpacing.md, AppSpacing.xl, AppSpacing.xxl),
                vertical = AppSpacing.md
            ),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            if (loading && punchLists.isEmpty()) {
                item { CPLoadingIndicator(message = stringResource(R.string.safety_loading_punch_lists)) }
            }

            items(punchLists) { punchList ->
                PunchListCard(punchList = punchList, onClick = { onOpenPunchList(punchList.id) })
            }

            if (!loading && punchLists.isEmpty()) {
                item {
                    CPEmptyState(
                        icon = Icons.Default.PlaylistAddCheck,
                        title = stringResource(R.string.safety_no_punch_lists),
                        description = stringResource(R.string.safety_no_punch_lists_desc)
                    )
                }
            }

            // Add bottom padding for FAB
            item { Spacer(modifier = Modifier.height(80.dp)) }
        }

        // FAB to create new punch list
        FloatingActionButton(
            onClick = onCreatePunchList,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(AppSpacing.md),
            containerColor = AppColors.primary600,
            contentColor = androidx.compose.ui.graphics.Color.White
        ) {
            Icon(
                imageVector = Icons.Default.Add,
                contentDescription = stringResource(R.string.safety_new_punch_list)
            )
        }
    }
}

@Composable
private fun PunchListCard(
    punchList: PunchList,
    onClick: () -> Unit
) {
    val progress = if (punchList.totalCount > 0) {
        punchList.completedCount.toFloat() / punchList.totalCount.toFloat()
    } else 0f

    CPCard(onClick = onClick) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = punchList.title,
                        style = AppTypography.heading3,
                        fontWeight = FontWeight.SemiBold
                    )
                    punchList.displayProjectName?.let { project ->
                        Text(
                            text = project,
                            style = AppTypography.body,
                            color = AppColors.textSecondary
                        )
                    }
                }

                CPBadge(
                    text = punchList.status,
                    color = getPunchListStatusColor(punchList.status),
                    backgroundColor = getPunchListStatusColor(punchList.status).copy(alpha = 0.1f)
                )
            }

            Spacer(modifier = Modifier.height(AppSpacing.sm))

            // Progress Bar
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                LinearProgressIndicator(
                    progress = { progress },
                    modifier = Modifier
                        .weight(1f)
                        .height(AppSpacing.xs)
                        .clip(RoundedCornerShape(AppSpacing.xxs)),
                    color = if (progress >= 1f) ConstructionGreen else AppColors.primary600,
                    trackColor = AppColors.divider
                )
                Spacer(modifier = Modifier.width(AppSpacing.sm))
                Text(
                    text = "${punchList.completedCount}/${punchList.totalCount}",
                    style = AppTypography.secondaryMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = if (progress >= 1f) ConstructionGreen else AppColors.textSecondary
                )
            }
        }
    }
}

@Composable
private fun MeetingsTab(
    meetings: List<SafetyMeeting>,
    loading: Boolean,
    onCreateMeeting: () -> Unit
) {
    Box(modifier = Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(
                horizontal = responsiveValue(AppSpacing.md, AppSpacing.xl, AppSpacing.xxl),
                vertical = AppSpacing.md
            ),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            if (loading && meetings.isEmpty()) {
                item { CPLoadingIndicator(message = stringResource(R.string.safety_loading_meetings)) }
            }

            items(meetings) { meeting ->
                MeetingCard(meeting = meeting)
            }

            if (!loading && meetings.isEmpty()) {
                item {
                    CPEmptyState(
                        icon = Icons.Default.Groups,
                        title = stringResource(R.string.safety_no_meetings),
                        description = stringResource(R.string.safety_no_meetings_desc)
                    )
                }
            }

            // Add bottom padding for FAB
            item { Spacer(modifier = Modifier.height(80.dp)) }
        }

        // FAB to create new meeting
        FloatingActionButton(
            onClick = onCreateMeeting,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(AppSpacing.md),
            containerColor = AppColors.primary600,
            contentColor = androidx.compose.ui.graphics.Color.White
        ) {
            Icon(
                imageVector = Icons.Default.Add,
                contentDescription = stringResource(R.string.safety_new_meeting)
            )
        }
    }
}

@Composable
private fun MeetingCard(
    meeting: SafetyMeeting
) {
    CPCard {
        Row(modifier = Modifier.fillMaxWidth()) {
            // Icon
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(AppSpacing.sm))
                    .background(AppColors.primary600.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Groups,
                    contentDescription = null,
                    tint = AppColors.primary600,
                    modifier = Modifier.size(AppSpacing.xl)
                )
            }

            Spacer(modifier = Modifier.width(AppSpacing.md))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = meeting.topic,
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                meeting.displayProjectName?.let { project ->
                    Text(
                        text = project,
                        style = AppTypography.body,
                        color = AppColors.textSecondary
                    )
                }
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(top = AppSpacing.xxs)
                ) {
                    Icon(
                        imageVector = Icons.Default.People,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = AppColors.textSecondary
                    )
                    Spacer(modifier = Modifier.width(AppSpacing.xxs))
                    Text(
                        text = stringResource(R.string.safety_attendees, meeting.attendeeCount),
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                    meeting.duration?.let { duration ->
                        Spacer(modifier = Modifier.width(AppSpacing.sm))
                        Icon(
                            imageVector = Icons.Default.Schedule,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp),
                            tint = AppColors.textSecondary
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.xxs))
                        Text(
                            text = stringResource(R.string.safety_duration_minutes, duration),
                            style = AppTypography.secondary,
                            color = AppColors.textSecondary
                        )
                    }
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = meeting.date.take(10),
                    style = AppTypography.secondary,
                    color = AppColors.textSecondary
                )
                meeting.time?.let { time ->
                    Text(
                        text = time,
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                }
            }
        }
    }
}

// Helper functions
private fun getSeverityColor(severity: String) = when (severity) {
    "CRITICAL" -> ConstructionRed
    "HIGH" -> ConstructionOrange
    "MEDIUM" -> androidx.compose.ui.graphics.Color(0xFFEAB308)
    "LOW" -> ConstructionGreen
    else -> androidx.compose.ui.graphics.Color(0xFF6B7280) // Gray fallback
}

private fun getSeverityIcon(severity: String) = when (severity) {
    "CRITICAL" -> Icons.Default.Error
    "HIGH" -> Icons.Default.Warning
    "MEDIUM" -> Icons.Default.Info
    "LOW" -> Icons.Default.CheckCircle
    else -> Icons.Default.Help
}

private fun getStatusColor(status: String) = when (status) {
    "CLOSED" -> ConstructionGreen
    "UNDER_INVESTIGATION" -> ConstructionOrange
    "REPORTED" -> Primary600
    else -> androidx.compose.ui.graphics.Color(0xFF6B7280) // Gray fallback
}

private fun getInspectionStatusColor(status: String) = when (status) {
    "COMPLETED" -> ConstructionGreen
    "FAILED" -> ConstructionRed
    "IN_PROGRESS" -> Primary600
    "SCHEDULED" -> ConstructionOrange
    else -> androidx.compose.ui.graphics.Color(0xFF6B7280) // Gray fallback
}

private fun getResultColor(result: String) = when (result) {
    "PASS" -> ConstructionGreen
    "FAIL" -> ConstructionRed
    "PARTIAL" -> ConstructionOrange
    else -> androidx.compose.ui.graphics.Color(0xFF6B7280) // Gray fallback
}

private fun getPunchListStatusColor(status: String) = when (status) {
    "COMPLETED" -> ConstructionGreen
    "IN_PROGRESS" -> Primary600
    "OPEN" -> ConstructionOrange
    else -> androidx.compose.ui.graphics.Color(0xFF6B7280) // Gray fallback
}
