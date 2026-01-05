package com.constructionpro.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.constructionpro.app.R
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.model.SearchResponse
import com.constructionpro.app.data.model.SearchResult
import com.constructionpro.app.data.model.SearchResultType
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

private data class SearchState(
    val query: String = "",
    val loading: Boolean = false,
    val results: SearchResponse? = null,
    val error: String? = null,
    val hasSearched: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchScreen(
    apiService: ApiService,
    onBack: () -> Unit,
    onOpenProject: (String) -> Unit,
    onOpenDailyLog: (String) -> Unit,
    onOpenDocument: (String) -> Unit,
    onOpenClient: (String) -> Unit,
    onOpenWarning: (String) -> Unit
) {
    var state by remember { mutableStateOf(SearchState()) }
    val focusRequester = remember { FocusRequester() }
    val keyboardController = LocalSoftwareKeyboardController.current

    // Debounced search using LaunchedEffect - handles cancellation properly
    LaunchedEffect(state.query) {
        if (state.query.isBlank()) {
            state = state.copy(results = null, hasSearched = false, loading = false)
            return@LaunchedEffect
        }

        // Debounce
        delay(300)

        state = state.copy(loading = true, error = null)
        try {
            val results = withContext(Dispatchers.IO) {
                apiService.search(state.query)
            }
            state = state.copy(loading = false, results = results, hasSearched = true)
        } catch (e: CancellationException) {
            // Don't show error for cancellation - this is expected when user types quickly
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

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.search_title),
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.common_back)
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
                    .padding(AppSpacing.md)
                    .focusRequester(focusRequester),
                singleLine = true,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(
                    onSearch = {
                        keyboardController?.hide()
                    }
                )
            )

            // Results
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = AppSpacing.md, vertical = AppSpacing.xs),
                verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)
            ) {
                // Loading
                if (state.loading) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(AppSpacing.xxl),
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
                    // Group results by type from the flat results list
                    val allResults = response.results ?: emptyList()
                    val projects = response.projects ?: allResults.filter { it.type == SearchResultType.PROJECT }
                    val dailyLogs = response.dailyLogs ?: allResults.filter { it.type == SearchResultType.DAILY_LOG }
                    val documents = response.documents ?: allResults.filter { it.type == SearchResultType.DOCUMENT }
                    val clients = response.clients ?: allResults.filter { it.type == SearchResultType.CLIENT }
                    val warnings = response.warnings ?: allResults.filter { it.type == SearchResultType.WARNING }
                    val users = allResults.filter { it.type == SearchResultType.USER }

                    val totalCount = projects.size + dailyLogs.size + documents.size +
                            clients.size + warnings.size + users.size

                    if (totalCount == 0) {
                        item {
                            CPEmptyState(
                                icon = Icons.Default.SearchOff,
                                title = stringResource(R.string.search_no_results),
                                description = stringResource(R.string.search_no_results_desc)
                            )
                        }
                    } else {
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
                            item {
                                SectionHeader(
                                    title = "Projects",
                                    count = projects.size
                                )
                            }
                            items(projects) { result ->
                                SearchResultCard(
                                    result = result,
                                    type = SearchResultType.PROJECT,
                                    onClick = { onOpenProject(result.id) }
                                )
                            }
                        }

                        // Daily Logs
                        if (dailyLogs.isNotEmpty()) {
                            item {
                                SectionHeader(
                                    title = "Daily Logs",
                                    count = dailyLogs.size
                                )
                            }
                            items(dailyLogs) { result ->
                                SearchResultCard(
                                    result = result,
                                    type = SearchResultType.DAILY_LOG,
                                    onClick = { onOpenDailyLog(result.id) }
                                )
                            }
                        }

                        // Documents
                        if (documents.isNotEmpty()) {
                            item {
                                SectionHeader(
                                    title = "Documents",
                                    count = documents.size
                                )
                            }
                            items(documents) { result ->
                                SearchResultCard(
                                    result = result,
                                    type = SearchResultType.DOCUMENT,
                                    onClick = { onOpenDocument(result.id) }
                                )
                            }
                        }

                        // Clients
                        if (clients.isNotEmpty()) {
                            item {
                                SectionHeader(
                                    title = "Clients",
                                    count = clients.size
                                )
                            }
                            items(clients) { result ->
                                SearchResultCard(
                                    result = result,
                                    type = SearchResultType.CLIENT,
                                    onClick = { onOpenClient(result.id) }
                                )
                            }
                        }

                        // Users
                        if (users.isNotEmpty()) {
                            item {
                                SectionHeader(
                                    title = "Users",
                                    count = users.size
                                )
                            }
                            items(users) { result ->
                                SearchResultCard(
                                    result = result,
                                    type = SearchResultType.USER,
                                    onClick = { /* Users not clickable for now */ }
                                )
                            }
                        }

                        // Warnings
                        if (warnings.isNotEmpty()) {
                            item {
                                SectionHeader(
                                    title = "Warnings",
                                    count = warnings.size
                                )
                            }
                            items(warnings) { result ->
                                SearchResultCard(
                                    result = result,
                                    type = SearchResultType.WARNING,
                                    onClick = { onOpenWarning(result.id) }
                                )
                            }
                        }
                    }
                }

                // Initial state
                if (!state.hasSearched && state.query.isBlank()) {
                    item {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(AppSpacing.xxl),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Search,
                                contentDescription = null,
                                modifier = Modifier.size(64.dp),
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
                item { Spacer(modifier = Modifier.height(AppSpacing.xxl)) }
            }
        }
    }
}

@Composable
private fun SectionHeader(
    title: String,
    count: Int
) {
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
private fun SearchResultCard(
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
                    .size(44.dp)
                    .clip(RoundedCornerShape(AppSpacing.xs))
                    .background(getTypeBackground(type)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = getTypeIcon(type),
                    contentDescription = null,
                    tint = getTypeColor(type),
                    modifier = Modifier.size(22.dp)
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
