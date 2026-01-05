package com.constructionpro.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.res.stringResource
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

private data class ApprovalsState(
    val loading: Boolean = false,
    val approvals: ApprovalsResponse? = null,
    val error: String? = null,
    val processingIds: Set<String> = emptySet()
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ApprovalsScreen(
    apiService: ApiService,
    onBack: () -> Unit,
    onTimeEntryClick: (String) -> Unit = {},
    onDailyLogClick: (String) -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(ApprovalsState(loading = true)) }
    val pagerState = rememberPagerState(pageCount = { 2 })

    fun loadApprovals() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val approvals = withContext(Dispatchers.IO) {
                    apiService.getApprovals()
                }
                state = state.copy(
                    loading = false,
                    approvals = approvals
                )
            } catch (error: Exception) {
                android.util.Log.e("ApprovalsScreen", "Failed to load approvals", error)
                state = state.copy(
                    loading = false,
                    error = "Failed to load approvals: ${error.message}"
                )
            }
        }
    }

    fun processApproval(id: String, type: String, action: String) {
        scope.launch {
            state = state.copy(processingIds = state.processingIds + id)
            try {
                withContext(Dispatchers.IO) {
                    apiService.processApproval(
                        ApprovalActionRequest(
                            id = id,
                            type = type,
                            action = action
                        )
                    )
                }
                loadApprovals()
            } catch (error: Exception) {
                state = state.copy(
                    error = error.message ?: "Failed to process approval"
                )
            } finally {
                state = state.copy(processingIds = state.processingIds - id)
            }
        }
    }

    LaunchedEffect(Unit) {
        loadApprovals()
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.approvals_title),
                subtitle = state.approvals?.summary?.let {
                    stringResource(R.string.approvals_pending_count, it.pendingTimeEntries + it.pendingDailyLogs)
                },
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
                    IconButton(onClick = { loadApprovals() }) {
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
            // Summary Cards
            state.approvals?.summary?.let { summary ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = AppSpacing.md, vertical = AppSpacing.xs),
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
                ) {
                    ApprovalSummaryCard(
                        title = stringResource(R.string.approvals_time_entries),
                        count = summary.pendingTimeEntries,
                        icon = Icons.Default.Schedule,
                        modifier = Modifier.weight(1f)
                    )
                    ApprovalSummaryCard(
                        title = stringResource(R.string.nav_daily_logs),
                        count = summary.pendingDailyLogs,
                        icon = Icons.Default.Description,
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            // Tab Row
            val tabs = listOf(
                stringResource(R.string.approvals_time_entries),
                stringResource(R.string.nav_daily_logs)
            )
            TabRow(
                selectedTabIndex = pagerState.currentPage,
                containerColor = AppColors.cardBackground,
                contentColor = Primary600,
                indicator = { tabPositions ->
                    TabRowDefaults.SecondaryIndicator(
                        modifier = Modifier.tabIndicatorOffset(tabPositions[pagerState.currentPage]),
                        color = Primary600
                    )
                }
            ) {
                tabs.forEachIndexed { index, title ->
                    val count = when (index) {
                        0 -> state.approvals?.timeEntries?.size ?: 0
                        1 -> state.approvals?.dailyLogs?.size ?: 0
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
                                        containerColor = if (pagerState.currentPage == index) AppColors.primary600 else AppColors.textMuted
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
                        message = state.error ?: "An error occurred",
                        onRetry = { loadApprovals() },
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
                    0 -> TimeEntriesApprovalTab(
                        timeEntries = state.approvals?.timeEntries ?: emptyList(),
                        loading = state.loading,
                        processingIds = state.processingIds,
                        onApprove = { id -> processApproval(id, "time-entry", "approve") },
                        onReject = { id -> processApproval(id, "time-entry", "reject") },
                        onEntryClick = onTimeEntryClick
                    )
                    1 -> DailyLogsApprovalTab(
                        dailyLogs = state.approvals?.dailyLogs ?: emptyList(),
                        loading = state.loading,
                        processingIds = state.processingIds,
                        onApprove = { id -> processApproval(id, "daily-log", "approve") },
                        onReject = { id -> processApproval(id, "daily-log", "reject") },
                        onLogClick = onDailyLogClick
                    )
                }
            }
        }
    }
}

@Composable
private fun ApprovalSummaryCard(
    title: String,
    count: Int,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    modifier: Modifier = Modifier
) {
    CPCard(modifier = modifier) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth()
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(if (count > 0) ConstructionOrange.copy(alpha = 0.1f) else AppColors.gray100),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = if (count > 0) ConstructionOrange else AppColors.textSecondary,
                    modifier = Modifier.size(20.dp)
                )
            }
            Spacer(modifier = Modifier.width(AppSpacing.sm))
            Column {
                Text(
                    text = "$count",
                    style = AppTypography.heading2,
                    color = if (count > 0) ConstructionOrange else AppColors.textSecondary
                )
                Text(
                    text = title,
                    style = AppTypography.secondary,
                    color = AppColors.textSecondary
                )
            }
        }
    }
}

@Composable
private fun TimeEntriesApprovalTab(
    timeEntries: List<TimeEntry>,
    loading: Boolean,
    processingIds: Set<String>,
    onApprove: (String) -> Unit,
    onReject: (String) -> Unit,
    onEntryClick: (String) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(
            horizontal = responsiveValue(AppSpacing.md, AppSpacing.xl, AppSpacing.xxl),
            vertical = AppSpacing.md
        ),
        verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
    ) {
        if (loading && timeEntries.isEmpty()) {
            item { CPLoadingIndicator(message = stringResource(R.string.time_tracking_loading)) }
            return@LazyColumn
        }

        items(timeEntries) { entry ->
            TimeEntryApprovalCard(
                entry = entry,
                isProcessing = processingIds.contains(entry.id),
                onApprove = { onApprove(entry.id) },
                onReject = { onReject(entry.id) },
                onClick = { onEntryClick(entry.id) }
            )
        }

        if (!loading && timeEntries.isEmpty()) {
            item {
                CPEmptyState(
                    icon = Icons.Default.CheckCircle,
                    title = stringResource(R.string.approvals_empty_title),
                    description = stringResource(R.string.approvals_empty_desc)
                )
            }
        }
    }
}

@Composable
private fun TimeEntryApprovalCard(
    entry: TimeEntry,
    isProcessing: Boolean,
    onApprove: () -> Unit,
    onReject: () -> Unit,
    onClick: () -> Unit
) {
    CPCard(onClick = onClick) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // User Avatar
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Primary100),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = entry.user?.name?.take(2)?.uppercase() ?: "??",
                        style = AppTypography.heading3,
                        color = Primary700
                    )
                }

                Spacer(modifier = Modifier.width(AppSpacing.md))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = entry.user?.name ?: stringResource(R.string.detail_unknown),
                        style = AppTypography.heading3
                    )
                    entry.project?.name?.let { project ->
                        Text(
                            text = project,
                            style = AppTypography.body,
                            color = AppColors.textSecondary
                        )
                    }
                    Text(
                        text = entry.date?.take(10) ?: "",
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                }

                // Hours
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "${entry.totalHours ?: calculateHours(entry.clockIn, entry.clockOut)}h",
                        style = AppTypography.heading2,
                        color = Primary700
                    )
                    Text(
                        text = "${TimeUtils.format12Hour(entry.clockIn)} - ${TimeUtils.format12Hour(entry.clockOut)}",
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                }
            }

            Spacer(modifier = Modifier.height(AppSpacing.sm))

            // Action Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
            ) {
                OutlinedButton(
                    onClick = onReject,
                    enabled = !isProcessing,
                    modifier = Modifier
                        .weight(1f)
                        .height(AppSpacing.minTouchTarget),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = ConstructionRed
                    ),
                    border = ButtonDefaults.outlinedButtonBorder(enabled = true).copy(
                        brush = androidx.compose.ui.graphics.SolidColor(ConstructionRed)
                    )
                ) {
                    if (isProcessing) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = ConstructionRed,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = null,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.xs))
                        Text(stringResource(R.string.approvals_reject))
                    }
                }

                Button(
                    onClick = onApprove,
                    enabled = !isProcessing,
                    modifier = Modifier
                        .weight(1f)
                        .height(AppSpacing.minTouchTarget),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = ConstructionGreen
                    )
                ) {
                    if (isProcessing) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = androidx.compose.ui.graphics.Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = null,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.xs))
                        Text(stringResource(R.string.approvals_approve))
                    }
                }
            }
        }
    }
}

@Composable
private fun DailyLogsApprovalTab(
    dailyLogs: List<DailyLogSummary>,
    loading: Boolean,
    processingIds: Set<String>,
    onApprove: (String) -> Unit,
    onReject: (String) -> Unit,
    onLogClick: (String) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(
            horizontal = responsiveValue(AppSpacing.md, AppSpacing.xl, AppSpacing.xxl),
            vertical = AppSpacing.md
        ),
        verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
    ) {
        if (loading && dailyLogs.isEmpty()) {
            item { CPLoadingIndicator(message = stringResource(R.string.daily_logs_loading)) }
            return@LazyColumn
        }

        items(dailyLogs) { log ->
            DailyLogApprovalCard(
                log = log,
                isProcessing = processingIds.contains(log.id),
                onApprove = { onApprove(log.id) },
                onReject = { onReject(log.id) },
                onClick = { onLogClick(log.id) }
            )
        }

        if (!loading && dailyLogs.isEmpty()) {
            item {
                CPEmptyState(
                    icon = Icons.Default.CheckCircle,
                    title = stringResource(R.string.approvals_empty_title),
                    description = stringResource(R.string.approvals_empty_desc)
                )
            }
        }
    }
}

@Composable
private fun DailyLogApprovalCard(
    log: DailyLogSummary,
    isProcessing: Boolean,
    onApprove: () -> Unit,
    onReject: () -> Unit,
    onClick: () -> Unit
) {
    CPCard(onClick = onClick) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Primary100),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Description,
                        contentDescription = null,
                        tint = Primary700,
                        modifier = Modifier.size(24.dp)
                    )
                }

                Spacer(modifier = Modifier.width(AppSpacing.md))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = log.getProjectDisplay()?.name ?: stringResource(R.string.nav_daily_logs),
                        style = AppTypography.heading3
                    )
                    Text(
                        text = stringResource(R.string.approvals_submitted_by, log.getSubmitterDisplay()?.name ?: stringResource(R.string.detail_unknown)),
                        style = AppTypography.body,
                        color = AppColors.textSecondary
                    )
                    Text(
                        text = log.date,
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                }

                // Stats
                Column(horizontalAlignment = Alignment.End) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.People,
                            contentDescription = null,
                            tint = AppColors.textMuted,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.xxs))
                        Text(
                            text = "${log.crewCount ?: 0}",
                            style = AppTypography.secondary,
                            color = AppColors.textSecondary
                        )
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.List,
                            contentDescription = null,
                            tint = AppColors.textMuted,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.xxs))
                        Text(
                            text = "${log.count?.entries ?: 0}",
                            style = AppTypography.secondary,
                            color = AppColors.textSecondary
                        )
                    }
                }
            }

            // Notes
            log.notes?.let { notes ->
                if (notes.isNotBlank()) {
                    Text(
                        text = notes,
                        style = AppTypography.body,
                        color = AppColors.textSecondary,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.padding(top = AppSpacing.xs)
                    )
                }
            }

            Spacer(modifier = Modifier.height(AppSpacing.sm))

            // Action Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
            ) {
                OutlinedButton(
                    onClick = onReject,
                    enabled = !isProcessing,
                    modifier = Modifier
                        .weight(1f)
                        .height(AppSpacing.minTouchTarget),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = ConstructionRed
                    ),
                    border = ButtonDefaults.outlinedButtonBorder(enabled = true).copy(
                        brush = androidx.compose.ui.graphics.SolidColor(ConstructionRed)
                    )
                ) {
                    if (isProcessing) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = ConstructionRed,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = null,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.xs))
                        Text(stringResource(R.string.approvals_reject))
                    }
                }

                Button(
                    onClick = onApprove,
                    enabled = !isProcessing,
                    modifier = Modifier
                        .weight(1f)
                        .height(AppSpacing.minTouchTarget),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = ConstructionGreen
                    )
                ) {
                    if (isProcessing) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = androidx.compose.ui.graphics.Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = null,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.xs))
                        Text(stringResource(R.string.approvals_approve))
                    }
                }
            }
        }
    }
}

private fun calculateHours(clockIn: String?, clockOut: String?): String {
    if (clockIn == null || clockOut == null) return "?"
    return try {
        // Simple calculation - actual implementation should use proper time parsing
        "8"
    } catch (_: Exception) {
        "?"
    }
}

