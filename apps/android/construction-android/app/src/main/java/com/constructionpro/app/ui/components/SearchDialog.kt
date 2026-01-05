package com.constructionpro.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.constructionpro.app.R
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.model.SearchResponse
import com.constructionpro.app.data.model.SearchResult
import com.constructionpro.app.data.model.SearchResultType
import com.constructionpro.app.ui.theme.*
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

private data class SearchDialogState(
    val query: String = "",
    val loading: Boolean = false,
    val results: SearchResponse? = null,
    val error: String? = null,
    val hasSearched: Boolean = false,
    val activeFilter: String? = null
)

// Search filter definitions
private data class SearchFilter(
    val key: String,
    val label: String,
    val aliases: List<String> = emptyList()
)

private val SEARCH_FILTERS = listOf(
    SearchFilter("projects", "Projects"),
    SearchFilter("logs", "Daily Logs", listOf("dailylogs", "dailylog")),
    SearchFilter("documents", "Documents", listOf("docs")),
    SearchFilter("clients", "Clients"),
    SearchFilter("warnings", "Warnings"),
    SearchFilter("users", "Users"),
    SearchFilter("equipment", "Equipment"),
    SearchFilter("safety", "Safety"),
    SearchFilter("subcontractors", "Subcontractors", listOf("subs"))
)

// Parse query for filter prefix (e.g., "#projects search term")
private fun parseSearchQuery(query: String): Pair<String?, String> {
    val trimmed = query.trim()
    val hashMatch = Regex("^#(\\w+)\\s*(.*)$").find(trimmed)
    if (hashMatch != null) {
        val filterName = hashMatch.groupValues[1].lowercase()
        val searchTerm = hashMatch.groupValues[2].trim()
        val filter = SEARCH_FILTERS.find { f ->
            f.key == filterName || f.aliases.contains(filterName)
        }
        if (filter != null) {
            return Pair(filter.key, searchTerm)
        }
    }
    return Pair(null, trimmed)
}

@Composable
fun SearchDialog(
    apiService: ApiService,
    onDismiss: () -> Unit,
    onOpenProject: (String) -> Unit,
    onOpenDailyLog: (String) -> Unit,
    onOpenDocument: (String) -> Unit,
    onOpenClient: (String) -> Unit,
    onOpenWarning: (String) -> Unit
) {
    var state by remember { mutableStateOf(SearchDialogState()) }
    val focusRequester = remember { FocusRequester() }
    val keyboardController = LocalSoftwareKeyboardController.current

    // Debounced search using LaunchedEffect
    LaunchedEffect(state.query) {
        if (state.query.isBlank()) {
            state = state.copy(results = null, hasSearched = false, loading = false, activeFilter = null)
            return@LaunchedEffect
        }

        delay(300)

        // Parse query for filter prefix
        val (activeFilter, searchTerm) = parseSearchQuery(state.query)

        // If only filter prefix with no search term, wait for more input
        if (searchTerm.isBlank() && activeFilter != null) {
            state = state.copy(activeFilter = activeFilter, loading = false, hasSearched = false)
            return@LaunchedEffect
        }

        state = state.copy(loading = true, error = null, activeFilter = activeFilter)
        try {
            val results = withContext(Dispatchers.IO) {
                apiService.search(searchTerm, category = activeFilter)
            }
            state = state.copy(loading = false, results = results, hasSearched = true)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            state = state.copy(
                loading = false,
                error = e.message ?: "Search failed",
                hasSearched = true
            )
        }
    }

    // Auto-focus search field
    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            dismissOnClickOutside = true
        )
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.95f)
                .fillMaxHeight(0.85f),
            shape = RoundedCornerShape(16.dp),
            color = AppColors.background
        ) {
            Column(
                modifier = Modifier.fillMaxSize()
            ) {
                // Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(AppSpacing.md),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = stringResource(R.string.search_title),
                        style = AppTypography.heading2,
                        fontWeight = FontWeight.SemiBold
                    )
                    IconButton(onClick = onDismiss) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = stringResource(R.string.common_dismiss)
                        )
                    }
                }

                // Search Input
                OutlinedTextField(
                    value = state.query,
                    onValueChange = { state = state.copy(query = it) },
                    placeholder = { Text(stringResource(R.string.search_placeholder)) },
                    leadingIcon = {
                        Icon(Icons.Default.Search, contentDescription = null)
                    },
                    trailingIcon = {
                        if (state.query.isNotBlank()) {
                            IconButton(onClick = { state = state.copy(query = "") }) {
                                Icon(Icons.Default.Clear, contentDescription = stringResource(R.string.common_dismiss))
                            }
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = AppSpacing.md)
                        .focusRequester(focusRequester),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                    keyboardActions = KeyboardActions(
                        onSearch = { keyboardController?.hide() }
                    )
                )

                // Active filter indicator
                state.activeFilter?.let { filter ->
                    val filterLabel = SEARCH_FILTERS.find { it.key == filter }?.label ?: filter
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = AppSpacing.md, vertical = AppSpacing.xs),
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Filtering:",
                            style = AppTypography.secondary,
                            color = AppColors.textMuted
                        )
                        Surface(
                            shape = RoundedCornerShape(AppSpacing.xs),
                            color = AppColors.primary100
                        ) {
                            Text(
                                text = filterLabel,
                                style = AppTypography.secondaryMedium,
                                color = AppColors.primary600,
                                modifier = Modifier.padding(horizontal = AppSpacing.sm, vertical = AppSpacing.xxs)
                            )
                        }
                    }
                }

                // Filter hints when empty
                if (state.query.isEmpty()) {
                    Text(
                        text = "Tip: Use #projects, #logs, #documents to filter",
                        style = AppTypography.caption,
                        color = AppColors.textMuted,
                        modifier = Modifier.padding(horizontal = AppSpacing.md, vertical = AppSpacing.xs)
                    )
                }

                Spacer(modifier = Modifier.height(AppSpacing.sm))

                // Results
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = AppSpacing.md),
                    verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                ) {
                    // Loading
                    if (state.loading) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(AppSpacing.xl),
                                contentAlignment = Alignment.Center
                            ) {
                                CircularProgressIndicator()
                            }
                        }
                    }

                    // Error
                    state.error?.let { error ->
                        item {
                            CPErrorBanner(
                                message = error,
                                onRetry = { state = state.copy(query = state.query) },
                                onDismiss = { state = state.copy(error = null) }
                            )
                        }
                    }

                    // Results by type
                    state.results?.let { response ->
                        val allResults = response.results ?: emptyList()
                        val projects = response.projects ?: allResults.filter { it.type == SearchResultType.PROJECT }
                        val dailyLogs = response.dailyLogs ?: allResults.filter { it.type == SearchResultType.DAILY_LOG }
                        val documents = response.documents ?: allResults.filter { it.type == SearchResultType.DOCUMENT }
                        val clients = response.clients ?: allResults.filter { it.type == SearchResultType.CLIENT }
                        val warnings = response.warnings ?: allResults.filter { it.type == SearchResultType.WARNING }
                        val users = allResults.filter { it.type == SearchResultType.USER }

                        val totalCount = projects.size + dailyLogs.size + documents.size +
                                clients.size + warnings.size + users.size

                        if (totalCount == 0 && !state.loading) {
                            item {
                                CPEmptyState(
                                    icon = Icons.Default.SearchOff,
                                    title = stringResource(R.string.search_no_results),
                                    description = stringResource(R.string.search_no_results_desc)
                                )
                            }
                        } else if (totalCount > 0) {
                            // Result count
                            item {
                                Text(
                                    text = "$totalCount result${if (totalCount != 1) "s" else ""} found",
                                    style = AppTypography.secondary,
                                    color = AppColors.textMuted,
                                    modifier = Modifier.padding(bottom = AppSpacing.xs)
                                )
                            }

                            // Projects
                            if (projects.isNotEmpty()) {
                                item { SearchSectionHeader("Projects", projects.size) }
                                items(projects) { result ->
                                    SearchResultItem(
                                        result = result,
                                        type = SearchResultType.PROJECT,
                                        onClick = {
                                            onDismiss()
                                            onOpenProject(result.id)
                                        }
                                    )
                                }
                            }

                            // Daily Logs
                            if (dailyLogs.isNotEmpty()) {
                                item { SearchSectionHeader("Daily Logs", dailyLogs.size) }
                                items(dailyLogs) { result ->
                                    SearchResultItem(
                                        result = result,
                                        type = SearchResultType.DAILY_LOG,
                                        onClick = {
                                            onDismiss()
                                            onOpenDailyLog(result.id)
                                        }
                                    )
                                }
                            }

                            // Documents
                            if (documents.isNotEmpty()) {
                                item { SearchSectionHeader("Documents", documents.size) }
                                items(documents) { result ->
                                    SearchResultItem(
                                        result = result,
                                        type = SearchResultType.DOCUMENT,
                                        onClick = {
                                            onDismiss()
                                            onOpenDocument(result.id)
                                        }
                                    )
                                }
                            }

                            // Clients
                            if (clients.isNotEmpty()) {
                                item { SearchSectionHeader("Clients", clients.size) }
                                items(clients) { result ->
                                    SearchResultItem(
                                        result = result,
                                        type = SearchResultType.CLIENT,
                                        onClick = {
                                            onDismiss()
                                            onOpenClient(result.id)
                                        }
                                    )
                                }
                            }

                            // Users (not clickable)
                            if (users.isNotEmpty()) {
                                item { SearchSectionHeader("Users", users.size) }
                                items(users) { result ->
                                    SearchResultItem(
                                        result = result,
                                        type = SearchResultType.USER,
                                        onClick = { /* Users not clickable */ }
                                    )
                                }
                            }

                            // Warnings
                            if (warnings.isNotEmpty()) {
                                item { SearchSectionHeader("Warnings", warnings.size) }
                                items(warnings) { result ->
                                    SearchResultItem(
                                        result = result,
                                        type = SearchResultType.WARNING,
                                        onClick = {
                                            onDismiss()
                                            onOpenWarning(result.id)
                                        }
                                    )
                                }
                            }
                        }
                    }

                    // Initial state
                    if (!state.hasSearched && state.query.isBlank() && !state.loading) {
                        item {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(AppSpacing.xl),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Search,
                                    contentDescription = null,
                                    modifier = Modifier.size(48.dp),
                                    tint = AppColors.textMuted
                                )
                                Text(
                                    text = "Search Across Your Data",
                                    style = AppTypography.heading3,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Text(
                                    text = "Find projects, daily logs, documents, clients, and more",
                                    style = AppTypography.body,
                                    color = AppColors.textSecondary
                                )
                            }
                        }
                    }

                    // Bottom spacing
                    item { Spacer(modifier = Modifier.height(AppSpacing.md)) }
                }
            }
        }
    }
}

@Composable
private fun SearchSectionHeader(title: String, count: Int) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = AppSpacing.xs),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = title,
            style = AppTypography.bodySemibold,
            fontWeight = FontWeight.SemiBold,
            color = AppColors.primary600
        )
        Text(
            text = count.toString(),
            style = AppTypography.secondaryMedium,
            color = AppColors.textMuted
        )
    }
}

@Composable
private fun SearchResultItem(
    result: SearchResult,
    type: String,
    onClick: () -> Unit
) {
    CPCard(onClick = onClick) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Type Icon
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(AppSpacing.xs))
                    .background(getTypeBackground(type)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = getTypeIcon(type),
                    contentDescription = null,
                    tint = getTypeColor(type),
                    modifier = Modifier.size(20.dp)
                )
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = result.title,
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                result.subtitle?.let { subtitle ->
                    Text(
                        text = subtitle,
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = AppColors.textMuted
            )
        }
    }
}

@Composable
private fun getTypeIcon(type: String) = when (type) {
    SearchResultType.PROJECT -> Icons.Default.Folder
    SearchResultType.DAILY_LOG -> Icons.Default.DateRange
    SearchResultType.DOCUMENT -> Icons.Default.Description
    SearchResultType.CLIENT -> Icons.Default.Business
    SearchResultType.WARNING -> Icons.Default.Warning
    SearchResultType.USER -> Icons.Default.Person
    else -> Icons.Default.Article
}

@Composable
private fun getTypeColor(type: String) = when (type) {
    SearchResultType.PROJECT -> Primary600
    SearchResultType.DAILY_LOG -> Success600
    SearchResultType.DOCUMENT -> Warning600
    SearchResultType.CLIENT -> Primary600
    SearchResultType.WARNING -> Error600
    SearchResultType.USER -> Primary600
    else -> Primary600
}

@Composable
private fun getTypeBackground(type: String) = when (type) {
    SearchResultType.PROJECT -> Primary100
    SearchResultType.DAILY_LOG -> Success100
    SearchResultType.DOCUMENT -> Warning100
    SearchResultType.CLIENT -> Primary100
    SearchResultType.WARNING -> Error100
    SearchResultType.USER -> Primary100
    else -> Primary100
}
