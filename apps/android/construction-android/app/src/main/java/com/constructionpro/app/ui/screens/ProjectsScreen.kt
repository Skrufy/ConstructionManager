package com.constructionpro.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.constructionpro.app.R
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.ModuleVisibilityPreferences
import com.constructionpro.app.data.local.AppDatabase
import com.constructionpro.app.data.local.toEntity
import com.constructionpro.app.data.local.toSummary
import com.constructionpro.app.data.model.CompanySettings
import com.constructionpro.app.data.model.ProjectSummary
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class ProjectsState(
    val loading: Boolean = false,
    val projects: List<ProjectSummary> = emptyList(),
    val error: String? = null,
    val offline: Boolean = false,
    val companySettings: CompanySettings? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProjectsScreen(
    apiService: ApiService,
    onLogout: () -> Unit,
    onOpenProfile: () -> Unit,
    onOpenProject: (String) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(ProjectsState(loading = true)) }
    var searchQuery by remember { mutableStateOf("") }
    var pageIndex by remember { mutableStateOf(1) }
    var totalPages by remember { mutableStateOf(1) }
    var totalCount by remember { mutableStateOf(0) }
    val pageSize = 10
    val projectDao = remember { AppDatabase.getInstance(context).projectDao() }
    val modulePrefs = remember { ModuleVisibilityPreferences.getInstance(context) }
    val moduleVisibility by modulePrefs.visibilityFlow.collectAsState(
        initial = ModuleVisibilityPreferences.ModuleVisibility()
    )

    fun loadProjects(targetPage: Int = pageIndex, query: String = searchQuery) {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val response = withContext(Dispatchers.IO) {
                    apiService.getProjects(
                        search = query.takeIf { it.isNotBlank() },
                        page = targetPage,
                        pageSize = pageSize
                    )
                }
                val entities = response.projects.map { it.toEntity() }
                withContext(Dispatchers.IO) {
                    projectDao.insertAll(entities)
                }
                state = state.copy(loading = false, projects = response.projects)
                totalPages = (response.totalPages ?: 1).coerceAtLeast(1)
                totalCount = response.total ?: response.projects.size
                pageIndex = response.page ?: targetPage
                state = state.copy(offline = false)
            } catch (error: Exception) {
                val cached = withContext(Dispatchers.IO) {
                    if (query.isBlank()) {
                        projectDao.getAll()
                    } else {
                        projectDao.search("%$query%")
                    }
                }.map { it.toSummary() }
                state = state.copy(
                    loading = false,
                    projects = cached,
                    offline = cached.isNotEmpty(),
                    error = if (cached.isEmpty()) (error.message ?: "Failed to load projects") else null
                )
                totalPages = 1
                totalCount = cached.size
                pageIndex = 1
            }
        }
    }

    LaunchedEffect(Unit) {
        // Fetch company settings to determine module visibility
        try {
            val settings = withContext(Dispatchers.IO) { apiService.getSettings() }
            state = state.copy(companySettings = settings.company)
        } catch (_: Exception) {
            // Ignore - will use defaults
        }
        loadProjects(1, searchQuery)
    }

    LaunchedEffect(searchQuery) {
        delay(300)
        loadProjects(1, searchQuery)
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.projects_title),
                subtitle = stringResource(R.string.projects_total_count, totalCount),
                navigationIcon = {
                    // No back button on main screens
                },
                actions = {
                    IconButton(onClick = { loadProjects() }) {
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
                    placeholder = stringResource(R.string.projects_search)
                )
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
                        onRetry = { loadProjects() },
                        onDismiss = { state = state.copy(error = null) }
                    )
                }
            }

            // Loading State
            if (state.loading && state.projects.isEmpty()) {
                item {
                    CPLoadingIndicator(message = stringResource(R.string.projects_loading))
                }
            }

            // Empty State
            if (!state.loading && state.projects.isEmpty() && state.error == null) {
                item {
                    CPEmptyState(
                        icon = Icons.Default.FolderOff,
                        title = stringResource(R.string.projects_no_projects),
                        description = if (searchQuery.isNotBlank())
                            stringResource(R.string.projects_no_match)
                        else
                            stringResource(R.string.projects_empty)
                    )
                }
            }

            // Project Cards
            // Only show time tracking if BOTH company has it enabled AND user hasn't hidden it
            val showTimeTracking = (state.companySettings?.moduleTimeTracking ?: false) && moduleVisibility.showTimeTracking
            items(state.projects) { project ->
                ProjectCard(
                    project = project,
                    showTimeTracking = showTimeTracking,
                    onClick = { onOpenProject(project.id) }
                )
            }

            // Pagination
            if (totalPages > 1) {
                item {
                    PaginationBar(
                        currentPage = pageIndex,
                        totalPages = totalPages,
                        onPrevious = { loadProjects(pageIndex - 1, searchQuery) },
                        onNext = { loadProjects(pageIndex + 1, searchQuery) }
                    )
                }
            }

            // Bottom spacing
            item {
                Spacer(modifier = Modifier.height(AppSpacing.md))
            }
        }
    }
}

@Composable
private fun ProjectCard(
    project: ProjectSummary,
    showTimeTracking: Boolean = true,
    onClick: () -> Unit
) {
    CPCard(onClick = onClick) {
        // Header Row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = project.name,
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold,
                    color = AppColors.textPrimary
                )
                if (!project.address.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.LocationOn,
                            contentDescription = null,
                            modifier = Modifier.size(AppSpacing.md),
                            tint = AppColors.textMuted
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = project.address,
                            style = AppTypography.body,
                            color = AppColors.textSecondary
                        )
                    }
                }
            }

            if (!project.status.isNullOrBlank()) {
                CPStatusBadge(status = project.status)
            }
        }

        // Client Info
        project.client?.companyName?.let { companyName ->
            Spacer(modifier = Modifier.height(AppSpacing.sm))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Business,
                    contentDescription = null,
                    modifier = Modifier.size(AppSpacing.md),
                    tint = AppColors.textMuted
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = companyName,
                    style = AppTypography.body,
                    color = AppColors.textSecondary
                )
            }
        }

        // Stats Row - use flat fields from API response
        Spacer(modifier = Modifier.height(AppSpacing.sm))
        CPDivider()
        Spacer(modifier = Modifier.height(AppSpacing.xs))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            ProjectStatItem(
                icon = Icons.Default.EditNote,
                value = (project.dailyLogCount ?: 0).toString(),
                label = "Logs"
            )
            if (showTimeTracking) {
                ProjectStatItem(
                    icon = Icons.Default.Schedule,
                    value = (project.rawCount?.timeEntries ?: 0).toString(),
                    label = "Time"
                )
            }
        }
    }
}

@Composable
private fun ProjectStatItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    value: String,
    label: String
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(18.dp),
            tint = AppColors.primary600
        )
        Spacer(modifier = Modifier.width(6.dp))
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
private fun PaginationBar(
    currentPage: Int,
    totalPages: Int,
    onPrevious: () -> Unit,
    onNext: () -> Unit
) {
    val configuration = LocalConfiguration.current
    val isNarrow = configuration.screenWidthDp < 360

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
            if (isNarrow) {
                // Icon-only buttons for narrow screens
                IconButton(
                    onClick = onPrevious,
                    enabled = currentPage > 1
                ) {
                    Icon(
                        imageVector = Icons.Default.ChevronLeft,
                        contentDescription = stringResource(R.string.common_previous),
                        tint = if (currentPage > 1)
                            AppColors.primary600
                        else
                            AppColors.textMuted
                    )
                }

                Text(
                    text = "$currentPage / $totalPages",
                    style = AppTypography.body,
                    color = AppColors.textSecondary
                )

                IconButton(
                    onClick = onNext,
                    enabled = currentPage < totalPages
                ) {
                    Icon(
                        imageVector = Icons.Default.ChevronRight,
                        contentDescription = stringResource(R.string.common_next),
                        tint = if (currentPage < totalPages)
                            AppColors.primary600
                        else
                            AppColors.textMuted
                    )
                }
            } else {
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
}
