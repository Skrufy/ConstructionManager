package com.constructionpro.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.constructionpro.app.R
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.model.AuditLog
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import com.constructionpro.app.ui.util.TimeUtils
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class AuditLogsState(
    val loading: Boolean = false,
    val logs: List<AuditLog> = emptyList(),
    val error: String? = null,
    val filterResourceType: String? = null,
    val showFilters: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AuditLogsScreen(
    apiService: ApiService,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(AuditLogsState(loading = true)) }
    val configuration = LocalConfiguration.current
    val isNarrow = configuration.screenWidthDp < 360

    fun loadLogs() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val response = withContext(Dispatchers.IO) {
                    apiService.getAuditLogs(
                        resourceType = state.filterResourceType
                    )
                }
                state = state.copy(loading = false, logs = response.logs)
            } catch (e: Exception) {
                state = state.copy(loading = false, error = e.message ?: "Failed to load audit logs")
            }
        }
    }

    LaunchedEffect(Unit) {
        loadLogs()
    }

    LaunchedEffect(state.filterResourceType) {
        loadLogs()
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.audit_logs_title),
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.common_back)
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { state = state.copy(showFilters = !state.showFilters) }) {
                        Icon(
                            imageVector = Icons.Default.FilterList,
                            contentDescription = stringResource(R.string.common_filter)
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
            // Filters
            if (state.showFilters) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = AppSpacing.md, vertical = AppSpacing.xs),
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                ) {
                    // All resources filter
                    FilterChip(
                        selected = state.filterResourceType == null,
                        onClick = { state = state.copy(filterResourceType = null) },
                        label = { Text(stringResource(R.string.common_all)) }
                    )
                    // Users filter
                    FilterChip(
                        selected = state.filterResourceType == "USER",
                        onClick = { state = state.copy(filterResourceType = "USER") },
                        label = { Text(stringResource(R.string.audit_logs_resource_users)) }
                    )
                    // Projects filter
                    FilterChip(
                        selected = state.filterResourceType == "PROJECT",
                        onClick = { state = state.copy(filterResourceType = "PROJECT") },
                        label = { Text(stringResource(R.string.audit_logs_resource_projects)) }
                    )
                    // Daily Logs filter
                    FilterChip(
                        selected = state.filterResourceType == "DAILY_LOG",
                        onClick = { state = state.copy(filterResourceType = "DAILY_LOG") },
                        label = { Text(stringResource(R.string.audit_logs_resource_daily_logs)) }
                    )
                    // Teams filter
                    FilterChip(
                        selected = state.filterResourceType == "TEAM",
                        onClick = { state = state.copy(filterResourceType = "TEAM") },
                        label = { Text(stringResource(R.string.audit_logs_resource_teams)) }
                    )
                }
            }

            // Error Banner
            state.error?.let { error ->
                CPErrorBanner(
                    message = error,
                    onRetry = { loadLogs() },
                    onDismiss = { state = state.copy(error = null) }
                )
            }

            when {
                state.loading -> {
                    CPLoadingIndicator(message = stringResource(R.string.audit_logs_loading))
                }
                state.logs.isEmpty() -> {
                    CPEmptyState(
                        icon = Icons.Default.History,
                        title = stringResource(R.string.audit_logs_empty_title),
                        description = stringResource(R.string.audit_logs_empty_desc)
                    )
                }
                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(AppSpacing.md),
                        verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                    ) {
                        items(state.logs, key = { it.id }) { log ->
                            AuditLogCard(
                                log = log,
                                isNarrow = isNarrow
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AuditLogCard(
    log: AuditLog,
    isNarrow: Boolean
) {
    val actionIcon = getActionIcon(log.action)
    val actionColor = getActionColor(log.action)

    CPCard {
        Column(
            verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Action Icon
                    Surface(
                        shape = RoundedCornerShape(AppSpacing.xs),
                        color = actionColor.copy(alpha = 0.1f)
                    ) {
                        Icon(
                            imageVector = actionIcon,
                            contentDescription = null,
                            tint = actionColor,
                            modifier = Modifier.padding(AppSpacing.xs)
                        )
                    }

                    Column(
                        verticalArrangement = Arrangement.spacedBy(2.dp)
                    ) {
                        Text(
                            text = formatAction(log.action),
                            style = AppTypography.bodySemibold,
                            fontWeight = FontWeight.SemiBold
                        )
                        log.userName?.let { userName ->
                            Text(
                                text = stringResource(R.string.audit_logs_by_user, userName),
                                style = AppTypography.secondary,
                                color = AppColors.textSecondary
                            )
                        }
                    }
                }

                // Timestamp
                Text(
                    text = TimeUtils.formatTimestamp(log.timestamp),
                    style = AppTypography.caption,
                    color = AppColors.textSecondary
                )
            }

            // Resource Info
            Row(
                horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(AppSpacing.xxs),
                    color = Primary100
                ) {
                    Text(
                        text = log.resourceType.replace("_", " "),
                        style = AppTypography.caption,
                        color = Primary600,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
                log.resourceName?.let { name ->
                    Text(
                        text = name,
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            // Details
            log.details?.let { details ->
                Text(
                    text = details,
                    style = AppTypography.secondary,
                    color = AppColors.textSecondary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

private fun getActionIcon(action: String): ImageVector {
    return when {
        action.contains("CREATE", ignoreCase = true) -> Icons.Default.Add
        action.contains("UPDATE", ignoreCase = true) -> Icons.Default.Edit
        action.contains("DELETE", ignoreCase = true) -> Icons.Default.Delete
        action.contains("LOGIN", ignoreCase = true) -> Icons.Default.Login
        action.contains("LOGOUT", ignoreCase = true) -> Icons.Default.Logout
        action.contains("INVITE", ignoreCase = true) -> Icons.Default.PersonAdd
        action.contains("APPROVE", ignoreCase = true) -> Icons.Default.CheckCircle
        action.contains("REJECT", ignoreCase = true) -> Icons.Default.Cancel
        action.contains("ASSIGN", ignoreCase = true) -> Icons.Default.AssignmentInd
        else -> Icons.Default.Info
    }
}

private fun getActionColor(action: String): androidx.compose.ui.graphics.Color {
    return when {
        action.contains("CREATE", ignoreCase = true) -> ConstructionGreen
        action.contains("DELETE", ignoreCase = true) -> ConstructionRed
        action.contains("UPDATE", ignoreCase = true) -> ConstructionOrange
        action.contains("LOGIN", ignoreCase = true) -> Primary600
        action.contains("APPROVE", ignoreCase = true) -> ConstructionGreen
        action.contains("REJECT", ignoreCase = true) -> ConstructionRed
        else -> Primary600
    }
}

private fun formatAction(action: String): String {
    return action
        .replace("_", " ")
        .lowercase()
        .replaceFirstChar { it.uppercase() }
}
