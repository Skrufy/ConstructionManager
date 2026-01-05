package com.constructionpro.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.constructionpro.app.R
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.local.AppDatabase
import com.constructionpro.app.data.local.toEntity
import com.constructionpro.app.data.local.toModel
import com.constructionpro.app.data.model.Warning
import com.constructionpro.app.data.model.WarningSeverity
import com.constructionpro.app.data.model.WarningStatus
import com.constructionpro.app.data.model.WarningTypes
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.LocalDate
import java.time.format.DateTimeFormatter

private data class WarningsState(
    val loading: Boolean = false,
    val warnings: List<Warning> = emptyList(),
    val error: String? = null,
    val offline: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WarningsScreen(
    apiService: ApiService,
    onBack: () -> Unit,
    onOpenWarning: (String) -> Unit,
    onCreateWarning: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(WarningsState(loading = true)) }
    var searchQuery by remember { mutableStateOf("") }
    var statusFilter by remember { mutableStateOf<String?>(null) }
    val warningDao = remember { AppDatabase.getInstance(context).warningDao() }

    fun loadWarnings() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val warnings = withContext(Dispatchers.IO) {
                    apiService.getWarnings(status = statusFilter)
                }
                // Cache warnings
                withContext(Dispatchers.IO) {
                    warningDao.insertAll(warnings.map { it.toEntity() })
                }
                state = state.copy(loading = false, warnings = warnings, offline = false)
            } catch (e: Exception) {
                // Load from cache
                val cached = withContext(Dispatchers.IO) {
                    if (statusFilter != null) {
                        warningDao.getByStatus(statusFilter!!)
                    } else {
                        warningDao.getAll()
                    }
                }.map { it.toModel() }
                state = state.copy(
                    loading = false,
                    warnings = cached,
                    offline = cached.isNotEmpty(),
                    error = if (cached.isEmpty()) (e.message ?: "Failed to load warnings") else null
                )
            }
        }
    }

    LaunchedEffect(statusFilter) {
        loadWarnings()
    }

    val filteredWarnings = if (searchQuery.isBlank()) {
        state.warnings
    } else {
        val query = searchQuery.lowercase()
        state.warnings.filter { warning ->
            warning.employee?.name?.lowercase()?.contains(query) == true ||
            warning.description.lowercase().contains(query) ||
            warning.warningType.lowercase().contains(query)
        }
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.warnings_title),
                subtitle = "${filteredWarnings.size} total",
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.common_back)
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { loadWarnings() }) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Refresh"
                        )
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onCreateWarning,
                containerColor = AppColors.primary600
            ) {
                Icon(Icons.Default.Add, contentDescription = stringResource(R.string.warnings_add))
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
                    placeholder = stringResource(R.string.warnings_search)
                )
            }

            // Status Filter
            item {
                StatusFilterChips(
                    selected = statusFilter,
                    onSelected = { statusFilter = it }
                )
            }

            // Offline Indicator
            if (state.offline) {
                item { CPOfflineIndicator() }
            }

            // Error Banner
            if (state.error != null) {
                item {
                    CPErrorBanner(
                        message = state.error ?: "An error occurred",
                        onRetry = { loadWarnings() },
                        onDismiss = { state = state.copy(error = null) }
                    )
                }
            }

            // Loading State
            if (state.loading && state.warnings.isEmpty()) {
                item { CPLoadingIndicator(message = stringResource(R.string.warnings_loading)) }
            }

            // Empty State
            if (!state.loading && filteredWarnings.isEmpty() && state.error == null) {
                item {
                    CPEmptyState(
                        icon = Icons.Default.Warning,
                        title = stringResource(R.string.warnings_empty_title),
                        description = stringResource(R.string.warnings_empty_desc)
                    )
                }
            }

            // Warning Cards
            items(filteredWarnings) { warning ->
                WarningCard(
                    warning = warning,
                    onClick = { onOpenWarning(warning.id) }
                )
            }

            // Bottom spacing
            item { Spacer(modifier = Modifier.height(AppSpacing.bottomNavHeight)) }
        }
    }
}

@Composable
private fun StatusFilterChips(
    selected: String?,
    onSelected: (String?) -> Unit
) {
    val configuration = LocalConfiguration.current
    val isNarrow = configuration.screenWidthDp < 360

    if (isNarrow) {
        Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)) {
            Row(horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)) {
                FilterChip(
                    selected = selected == null,
                    onClick = { onSelected(null) },
                    label = { Text("All") },
                    modifier = Modifier.weight(1f)
                )
                FilterChip(
                    selected = selected == WarningStatus.ACTIVE,
                    onClick = { onSelected(WarningStatus.ACTIVE) },
                    label = { Text("Active") },
                    modifier = Modifier.weight(1f)
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)) {
                FilterChip(
                    selected = selected == WarningStatus.RESOLVED,
                    onClick = { onSelected(WarningStatus.RESOLVED) },
                    label = { Text("Resolved") },
                    modifier = Modifier.weight(1f)
                )
                FilterChip(
                    selected = selected == WarningStatus.APPEALED,
                    onClick = { onSelected(WarningStatus.APPEALED) },
                    label = { Text("Appealed") },
                    modifier = Modifier.weight(1f)
                )
            }
        }
    } else {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
        ) {
            FilterChip(
                selected = selected == null,
                onClick = { onSelected(null) },
                label = { Text("All") }
            )
            FilterChip(
                selected = selected == WarningStatus.ACTIVE,
                onClick = { onSelected(WarningStatus.ACTIVE) },
                label = { Text("Active") }
            )
            FilterChip(
                selected = selected == WarningStatus.RESOLVED,
                onClick = { onSelected(WarningStatus.RESOLVED) },
                label = { Text("Resolved") }
            )
            FilterChip(
                selected = selected == WarningStatus.APPEALED,
                onClick = { onSelected(WarningStatus.APPEALED) },
                label = { Text("Appealed") }
            )
        }
    }
}

@Composable
private fun WarningCard(
    warning: Warning,
    onClick: () -> Unit
) {
    CPCard(onClick = onClick) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top
        ) {
            Row(
                modifier = Modifier.weight(1f),
                horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
            ) {
                // Severity Indicator
                SeverityIndicator(severity = warning.severity)

                Column(modifier = Modifier.weight(1f)) {
                    // Employee Name
                    Text(
                        text = warning.employee?.name ?: "Unknown Employee",
                        style = AppTypography.heading3,
                        fontWeight = FontWeight.SemiBold
                    )

                    // Warning Type
                    Text(
                        text = WarningTypes.displayName(warning.warningType),
                        style = AppTypography.body,
                        color = AppColors.textSecondary
                    )

                    Spacer(modifier = Modifier.height(AppSpacing.xxs))

                    // Description Preview
                    Text(
                        text = warning.description,
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )

                    Spacer(modifier = Modifier.height(AppSpacing.xs))

                    // Date and Issuer
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.md)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.CalendarToday,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp),
                                tint = AppColors.textMuted
                            )
                            Spacer(modifier = Modifier.width(AppSpacing.xxs))
                            Text(
                                text = formatDate(warning.incidentDate),
                                style = AppTypography.caption,
                                color = AppColors.textMuted
                            )
                        }
                        warning.issuedBy?.name?.let { issuer ->
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.Person,
                                    contentDescription = null,
                                    modifier = Modifier.size(14.dp),
                                    tint = AppColors.textMuted
                                )
                                Spacer(modifier = Modifier.width(AppSpacing.xxs))
                                Text(
                                    text = issuer,
                                    style = AppTypography.caption,
                                    color = AppColors.textMuted
                                )
                            }
                        }
                    }
                }
            }

            // Status Badge
            CPStatusBadge(status = warning.status)
        }

        // Acknowledged indicator
        if (warning.acknowledged) {
            Spacer(modifier = Modifier.height(AppSpacing.xs))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(AppSpacing.xs))
                    .background(Success100)
                    .padding(AppSpacing.xs)
            ) {
                Icon(
                    imageVector = Icons.Default.Check,
                    contentDescription = null,
                    modifier = Modifier.size(AppSpacing.md),
                    tint = Success600
                )
                Spacer(modifier = Modifier.width(AppSpacing.xs))
                Text(
                    text = stringResource(R.string.warnings_acknowledged),
                    style = AppTypography.caption,
                    color = Success600
                )
            }
        }
    }
}

@Composable
private fun SeverityIndicator(severity: String) {
    val (color, backgroundColor) = when (severity) {
        WarningSeverity.VERBAL -> Pair(Primary600, Primary100)
        WarningSeverity.WRITTEN -> Pair(Warning600, Warning100)
        WarningSeverity.FINAL -> Pair(Error600, Error100)
        else -> Pair(Primary600, Primary100)
    }

    Box(
        modifier = Modifier
            .size(AppSpacing.iconCircleMedium)
            .clip(CircleShape)
            .background(backgroundColor),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = when (severity) {
                WarningSeverity.VERBAL -> Icons.Default.RecordVoiceOver
                WarningSeverity.WRITTEN -> Icons.Default.Description
                WarningSeverity.FINAL -> Icons.Default.Gavel
                else -> Icons.Default.Warning
            },
            contentDescription = severity,
            tint = color,
            modifier = Modifier.size(AppSpacing.iconLarge)
        )
    }
}

private fun formatDate(dateString: String): String {
    return try {
        val date = LocalDate.parse(dateString.substringBefore('T'))
        date.format(DateTimeFormatter.ofPattern("MMM d, yyyy"))
    } catch (e: Exception) {
        dateString.substringBefore('T')
    }
}
