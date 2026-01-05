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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.constructionpro.app.R
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.local.AppDatabase
import com.constructionpro.app.data.local.toEntity
import com.constructionpro.app.data.local.toSummary
import com.constructionpro.app.data.local.PendingActionTypes
import com.constructionpro.app.data.local.PendingStatus
import com.constructionpro.app.data.model.DailyLogCount
import com.constructionpro.app.data.model.DailyLogProject
import com.constructionpro.app.data.model.DailyLogSummary
import com.constructionpro.app.data.model.DailyLogUser
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class DailyLogsState(
    val loading: Boolean = false,
    val logs: List<DailyLogSummary> = emptyList(),
    val error: String? = null,
    val offline: Boolean = false,
    val pendingCount: Int = 0
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DailyLogsScreen(
    apiService: ApiService,
    projectId: String? = null,
    onBack: () -> Unit,
    onOpenDailyLog: (String) -> Unit,
    onCreateDailyLog: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(DailyLogsState(loading = true)) }
    var searchQuery by remember { mutableStateOf("") }
    var pageIndex by remember { mutableStateOf(1) }
    var totalPages by remember { mutableStateOf(1) }
    var totalCount by remember { mutableStateOf(0) }
    val pageSize = 10
    val dailyLogDao = remember { AppDatabase.getInstance(context).dailyLogDao() }
    val pendingDao = remember { AppDatabase.getInstance(context).pendingActionDao() }

    val loadFailedMsg = stringResource(R.string.daily_logs_load_failed)
    fun loadLogs(targetPage: Int = pageIndex, query: String = searchQuery) {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val pendingCount = withContext(Dispatchers.IO) {
                    pendingDao.countByType(PendingActionTypes.DAILY_LOG_CREATE, PendingStatus.PENDING) +
                        pendingDao.countByType(PendingActionTypes.DAILY_LOG_UPDATE, PendingStatus.PENDING)
                }
                val response = withContext(Dispatchers.IO) {
                    apiService.getDailyLogs(
                        projectId = projectId,
                        search = query.takeIf { it.isNotBlank() },
                        page = targetPage,
                        pageSize = pageSize
                    )
                }
                val entities = response.dailyLogs.map { log ->
                    log.toEntity(projectIdOverride = projectId ?: log.projectId ?: log.project?.id ?: "")
                }
                withContext(Dispatchers.IO) {
                    dailyLogDao.insertAll(entities)
                }
                val pendingLogs = if (projectId != null) {
                    withContext(Dispatchers.IO) {
                        dailyLogDao.getPendingByProject(projectId)
                    }.map { it.toSummary() }
                } else {
                    withContext(Dispatchers.IO) {
                        dailyLogDao.getAllPending()
                    }.map { it.toSummary() }
                }

                val logsToDisplay = (pendingLogs + response.dailyLogs)
                    .distinctBy { it.id }
                    .sortedByDescending { it.date }

                state = state.copy(
                    loading = false,
                    logs = logsToDisplay,
                    offline = false,
                    pendingCount = pendingCount
                )
                totalPages = (response.totalPages ?: 1).coerceAtLeast(1)
                totalCount = (response.total ?: response.dailyLogs.size) + pendingLogs.size
                pageIndex = response.page ?: targetPage
            } catch (error: Exception) {
                val cached = withContext(Dispatchers.IO) {
                    if (projectId != null) {
                        if (query.isBlank()) {
                            dailyLogDao.getByProject(projectId)
                        } else {
                            dailyLogDao.searchByProject(projectId, "%$query%")
                        }
                    } else {
                        if (query.isBlank()) {
                            dailyLogDao.getAll()
                        } else {
                            dailyLogDao.searchAll("%$query%")
                        }
                    }
                }.map { it.toSummary() }
                    .sortedByDescending { it.date }
                val pendingCount = withContext(Dispatchers.IO) {
                    pendingDao.countByType(PendingActionTypes.DAILY_LOG_CREATE, PendingStatus.PENDING) +
                        pendingDao.countByType(PendingActionTypes.DAILY_LOG_UPDATE, PendingStatus.PENDING)
                }

                state = state.copy(
                    loading = false,
                    logs = cached,
                    offline = true,
                    error = if (cached.isEmpty()) error.message ?: loadFailedMsg else null,
                    pendingCount = pendingCount
                )
                totalPages = 1
                totalCount = cached.size
                pageIndex = 1
            }
        }
    }

    // Initial load
    LaunchedEffect(projectId) {
        loadLogs(1, searchQuery)
    }

    // Refresh when returning to this screen (e.g., after creating a log)
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = androidx.lifecycle.LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                scope.launch {
                    loadLogs(pageIndex, searchQuery)
                }
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    LaunchedEffect(searchQuery) {
        delay(300)
        loadLogs(1, searchQuery)
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.daily_logs_title),
                subtitle = stringResource(R.string.daily_logs_count, totalCount),
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
                    IconButton(onClick = { loadLogs() }) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = stringResource(R.string.common_refresh),
                            tint = AppColors.textSecondary
                        )
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onCreateDailyLog,
                containerColor = Primary600,
                contentColor = androidx.compose.ui.graphics.Color.White
            ) {
                Icon(
                    imageVector = Icons.Default.Add,
                    contentDescription = stringResource(R.string.daily_logs_new)
                )
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(AppSpacing.md),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            // Search Bar
            item {
                CPSearchBar(
                    query = searchQuery,
                    onQueryChange = { searchQuery = it },
                    placeholder = stringResource(R.string.daily_logs_search)
                )
            }

            // Pending Sync Banner
            if (state.pendingCount > 0) {
                item {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(AppSpacing.sm),
                        color = Primary50,
                        border = androidx.compose.foundation.BorderStroke(1.dp, Primary200)
                    ) {
                        Row(
                            modifier = Modifier.padding(AppSpacing.sm),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.CloudSync,
                                contentDescription = null,
                                tint = AppColors.primary600,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(AppSpacing.sm))
                            Text(
                                text = stringResource(R.string.daily_logs_pending_sync, state.pendingCount),
                                style = AppTypography.body,
                                color = Primary700
                            )
                        }
                    }
                }
            }

            // Offline Indicator
            if (state.offline) {
                item {
                    CPOfflineIndicator()
                }
            }

            // Error Banner
            if (state.error != null) {
                item {
                    CPErrorBanner(
                        message = state.error ?: stringResource(R.string.error_generic),
                        onRetry = { loadLogs() },
                        onDismiss = { state = state.copy(error = null) }
                    )
                }
            }

            // Loading State
            if (state.loading && state.logs.isEmpty()) {
                item {
                    CPLoadingIndicator(message = stringResource(R.string.daily_logs_loading))
                }
            }

            // Empty State
            if (!state.loading && state.logs.isEmpty() && state.error == null) {
                item {
                    CPEmptyState(
                        icon = Icons.Default.EditNote,
                        title = stringResource(R.string.daily_logs_empty_title),
                        description = if (searchQuery.isNotBlank())
                            stringResource(R.string.daily_logs_no_match)
                        else
                            stringResource(R.string.daily_logs_empty_desc),
                        actionText = stringResource(R.string.daily_logs_create),
                        onAction = onCreateDailyLog
                    )
                }
            }

            // Daily Log Cards
            items(state.logs) { log ->
                DailyLogCard(log = log, onClick = { onOpenDailyLog(log.id) })
            }

            // Pagination
            if (totalPages > 1 && state.logs.isNotEmpty()) {
                item {
                    PaginationControls(
                        currentPage = pageIndex,
                        totalPages = totalPages,
                        onPrevious = { loadLogs(pageIndex - 1, searchQuery) },
                        onNext = { loadLogs(pageIndex + 1, searchQuery) }
                    )
                }
            }

            // Bottom spacing for FAB
            item {
                Spacer(modifier = Modifier.height(72.dp))
            }
        }
    }
}

@Composable
private fun DailyLogCard(
    log: DailyLogSummary,
    onClick: () -> Unit
) {
    val isPending = log.status == "PENDING_SYNC"

    // Format date nicely (e.g., "Monday, January 15, 2024")
    val formattedDate = remember(log.date) {
        try {
            // Handle both "2024-01-15" and "2024-01-15T10:30:00.000Z" formats
            val dateOnly = log.date.substringBefore("T")
            val parsedDate = LocalDate.parse(dateOnly)
            val formatter = DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy", Locale.getDefault())
            parsedDate.format(formatter)
        } catch (e: Exception) {
            log.date.substringBefore("T") // Fallback: at least strip time portion
        }
    }

    CPCard(onClick = onClick) {
        // Header Row - Date and Status
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = formattedDate,
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.Bold,
                    color = AppColors.textPrimary
                )
                Row(
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Project name
                    log.getProjectDisplay()?.name?.let { projectName ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Folder,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp),
                                tint = AppColors.primary600
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = projectName,
                                style = AppTypography.secondary,
                                color = AppColors.primary600,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                    // Submitter
                    log.getSubmitterDisplay()?.name?.let { name ->
                        Text(
                            text = "• $name",
                            style = AppTypography.secondary,
                            color = AppColors.textSecondary
                        )
                    }
                }
            }

            // Status badge - more prominent
            log.status?.let { status ->
                val displayStatus = if (isPending) "PENDING" else status
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = when (displayStatus.uppercase()) {
                        "SUBMITTED" -> AppColors.primary600
                        "APPROVED" -> Success600
                        "REJECTED" -> Error600
                        "PENDING" -> ConstructionOrange
                        else -> AppColors.gray100
                    }
                ) {
                    Text(
                        text = displayStatus.replace("_", " "),
                        style = AppTypography.caption,
                        fontWeight = FontWeight.SemiBold,
                        color = androidx.compose.ui.graphics.Color.White,
                        modifier = Modifier.padding(horizontal = AppSpacing.sm, vertical = 6.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Weather & Stats Row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Weather Delay Chip
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = if (log.weatherDelay == true) Warning100 else Success100
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = AppSpacing.sm, vertical = AppSpacing.xs),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = if (log.weatherDelay == true) Icons.Default.WbCloudy else Icons.Default.WbSunny,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp),
                        tint = if (log.weatherDelay == true) Warning700 else Success700
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (log.weatherDelay == true) stringResource(R.string.daily_logs_weather_delay) else stringResource(R.string.daily_logs_no_delays),
                        style = AppTypography.secondaryMedium,
                        color = if (log.weatherDelay == true) Warning700 else Success700,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

        }

        // Weather Delay Notes (if present)
        if (log.weatherDelay == true && !log.weatherDelayNotes.isNullOrBlank()) {
            Spacer(modifier = Modifier.height(AppSpacing.sm))
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(10.dp),
                color = Warning50
            ) {
                Row(
                    modifier = Modifier.padding(AppSpacing.sm),
                    verticalAlignment = Alignment.Top
                ) {
                    Icon(
                        imageVector = Icons.Default.ReportProblem,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp),
                        tint = Warning600
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = stringResource(R.string.daily_logs_delay_reason),
                            style = AppTypography.caption,
                            color = Warning600,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = log.weatherDelayNotes,
                            style = AppTypography.secondary,
                            color = Warning800,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
        }

        // Notes Preview
        log.notes?.takeIf { it.isNotBlank() && (log.weatherDelay != true || log.weatherDelayNotes.isNullOrBlank()) }?.let { notes ->
            Spacer(modifier = Modifier.height(AppSpacing.sm))
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(10.dp),
                color = AppColors.gray100.copy(alpha = 0.5f)
            ) {
                Row(
                    modifier = Modifier.padding(AppSpacing.sm),
                    verticalAlignment = Alignment.Top
                ) {
                    Icon(
                        imageVector = Icons.Default.Notes,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp),
                        tint = AppColors.textSecondary
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = notes,
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}

@Composable
private fun LogStatItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    value: String,
    label: String
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(AppSpacing.md),
            tint = AppColors.textMuted
        )
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            text = value,
            style = AppTypography.bodySemibold,
            fontWeight = FontWeight.SemiBold,
            color = AppColors.textPrimary
        )
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            text = label,
            style = AppTypography.secondary,
            color = AppColors.textSecondary
        )
    }
}

@Composable
private fun PaginationControls(
    currentPage: Int,
    totalPages: Int,
    onPrevious: () -> Unit,
    onNext: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(AppSpacing.sm),
        color = AppColors.cardBackground,
        border = androidx.compose.foundation.BorderStroke(1.dp, AppColors.divider)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(AppSpacing.xs),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            CPButton(
                text = stringResource(R.string.common_previous),
                onClick = onPrevious,
                style = CPButtonStyle.Outline,
                size = CPButtonSize.Small,
                enabled = currentPage > 1,
                icon = Icons.Default.ChevronLeft
            )

            Text(
                text = stringResource(R.string.common_page_of, currentPage, totalPages),
                style = AppTypography.body,
                color = AppColors.textSecondary
            )

            CPButton(
                text = stringResource(R.string.common_next),
                onClick = onNext,
                style = CPButtonStyle.Outline,
                size = CPButtonSize.Small,
                enabled = currentPage < totalPages,
                icon = Icons.Default.ChevronRight
            )
        }
    }
}
