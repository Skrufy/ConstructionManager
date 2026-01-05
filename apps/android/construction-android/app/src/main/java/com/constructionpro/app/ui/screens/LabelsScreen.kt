package com.constructionpro.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Label
import androidx.compose.material.icons.filled.*
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
import com.constructionpro.app.data.local.AppDatabase
import com.constructionpro.app.data.local.toEntity
import com.constructionpro.app.data.local.toModel
import com.constructionpro.app.data.model.Label
import com.constructionpro.app.data.model.LabelCategory
import com.constructionpro.app.data.model.LabelCreateRequest
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class LabelsState(
    val loading: Boolean = false,
    val labels: List<Label> = emptyList(),
    val error: String? = null,
    val offline: Boolean = false,
    val showCreateDialog: Boolean = false,
    val creating: Boolean = false
)

private data class LabelFormState(
    val name: String = "",
    val category: String = LabelCategory.ACTIVITY
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LabelsScreen(
    apiService: ApiService,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(LabelsState(loading = true)) }
    var formState by remember { mutableStateOf(LabelFormState()) }
    var categoryFilter by remember { mutableStateOf<String?>(null) }
    val labelDao = remember { AppDatabase.getInstance(context).labelDao() }
    val configuration = LocalConfiguration.current
    val isNarrow = configuration.screenWidthDp < 360

    fun loadLabels() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val labels = withContext(Dispatchers.IO) {
                    apiService.getLabels(category = categoryFilter)
                }
                // Cache labels
                withContext(Dispatchers.IO) {
                    labelDao.insertAll(labels.map { it.toEntity() })
                }
                state = state.copy(loading = false, labels = labels, offline = false)
            } catch (e: Exception) {
                // Load from cache
                val cached = withContext(Dispatchers.IO) {
                    if (categoryFilter != null) {
                        labelDao.getByCategory(categoryFilter!!)
                    } else {
                        labelDao.getAll()
                    }
                }.map { it.toModel() }
                state = state.copy(
                    loading = false,
                    labels = cached,
                    offline = cached.isNotEmpty(),
                    error = if (cached.isEmpty()) (e.message ?: "Failed to load labels") else null
                )
            }
        }
    }

    fun createLabel() {
        if (formState.name.isBlank()) return

        scope.launch {
            state = state.copy(creating = true)
            try {
                val request = LabelCreateRequest(
                    name = formState.name,
                    category = formState.category
                )
                withContext(Dispatchers.IO) {
                    apiService.createLabel(request)
                }
                state = state.copy(creating = false, showCreateDialog = false)
                formState = LabelFormState()
                loadLabels()
            } catch (e: Exception) {
                state = state.copy(
                    creating = false,
                    error = e.message ?: "Failed to create label"
                )
            }
        }
    }

    LaunchedEffect(categoryFilter) {
        loadLabels()
    }

    // Group labels by category
    val groupedLabels = state.labels.groupBy { it.category }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.labels_title),
                subtitle = "${state.labels.size} ${stringResource(R.string.common_total)}",
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.common_back)
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { loadLabels() }) {
                        Icon(Icons.Default.Refresh, contentDescription = stringResource(R.string.common_refresh))
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { state = state.copy(showCreateDialog = true) },
                containerColor = AppColors.primary600
            ) {
                Icon(Icons.Default.Add, contentDescription = stringResource(R.string.labels_add))
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
            // Category Filter
            item {
                CategoryFilterChips(
                    selected = categoryFilter,
                    onSelected = { categoryFilter = it },
                    isNarrow = isNarrow
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
                        onRetry = { loadLabels() },
                        onDismiss = { state = state.copy(error = null) }
                    )
                }
            }

            // Loading State
            if (state.loading && state.labels.isEmpty()) {
                item { CPLoadingIndicator(message = stringResource(R.string.labels_loading)) }
            }

            // Empty State
            if (!state.loading && state.labels.isEmpty() && state.error == null) {
                item {
                    CPEmptyState(
                        icon = Icons.AutoMirrored.Filled.Label,
                        title = stringResource(R.string.labels_empty_title),
                        description = stringResource(R.string.labels_empty_desc)
                    )
                }
            }

            // Labels by Category
            if (categoryFilter == null) {
                groupedLabels.forEach { (category, labels) ->
                    item {
                        Text(
                            text = LabelCategory.displayName(category),
                            style = AppTypography.heading3,
                            color = AppColors.textPrimary,
                            modifier = Modifier.padding(top = AppSpacing.xs)
                        )
                    }
                    items(labels) { label ->
                        LabelCard(label = label)
                    }
                }
            } else {
                items(state.labels) { label ->
                    LabelCard(label = label)
                }
            }

            // Bottom spacing
            item { Spacer(modifier = Modifier.height(AppSpacing.bottomNavHeight)) }
        }
    }

    // Create Label Dialog
    if (state.showCreateDialog) {
        AlertDialog(
            onDismissRequest = {
                if (!state.creating) {
                    state = state.copy(showCreateDialog = false)
                    formState = LabelFormState()
                }
            },
            title = { Text(stringResource(R.string.labels_add)) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.md)) {
                    OutlinedTextField(
                        value = formState.name,
                        onValueChange = { formState = formState.copy(name = it) },
                        label = { Text(stringResource(R.string.labels_name)) },
                        placeholder = { Text(stringResource(R.string.labels_name)) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        enabled = !state.creating
                    )

                    Text(
                        text = "Category",
                        style = AppTypography.secondaryMedium,
                        color = AppColors.textSecondary
                    )

                    val categoryChunks = LabelCategory.all.chunked(2)
                    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)) {
                        for (chunk in categoryChunks) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                            ) {
                                for (category in chunk) {
                                    FilterChip(
                                        selected = formState.category == category,
                                        onClick = {
                                            if (!state.creating) {
                                                formState = formState.copy(category = category)
                                            }
                                        },
                                        label = {
                                            Text(
                                                LabelCategory.displayName(category),
                                                maxLines = 1
                                            )
                                        },
                                        modifier = Modifier.weight(1f)
                                    )
                                }
                                if (chunk.size == 1) {
                                    Spacer(modifier = Modifier.weight(1f))
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { createLabel() },
                    enabled = !state.creating && formState.name.isNotBlank()
                ) {
                    if (state.creating) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(AppSpacing.iconSmall),
                            strokeWidth = 2.dp
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.xs))
                    }
                    Text(if (state.creating) stringResource(R.string.common_loading) else stringResource(R.string.common_add))
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        state = state.copy(showCreateDialog = false)
                        formState = LabelFormState()
                    },
                    enabled = !state.creating
                ) {
                    Text(stringResource(R.string.common_cancel))
                }
            }
        )
    }
}

@Composable
private fun CategoryFilterChips(
    selected: String?,
    onSelected: (String?) -> Unit,
    isNarrow: Boolean
) {
    val categories: List<String?> = listOf(null) + LabelCategory.all

    if (isNarrow) {
        val chunks = categories.chunked(2)
        Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)) {
            for (chunk in chunks) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                ) {
                    for (category in chunk) {
                        FilterChip(
                            selected = selected == category,
                            onClick = { onSelected(category) },
                            label = {
                                Text(
                                    if (category != null) LabelCategory.displayName(category) else "All",
                                    maxLines = 1
                                )
                            },
                            modifier = Modifier.weight(1f)
                        )
                    }
                    if (chunk.size == 1) {
                        Spacer(modifier = Modifier.weight(1f))
                    }
                }
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
                selected = selected == LabelCategory.ACTIVITY,
                onClick = { onSelected(LabelCategory.ACTIVITY) },
                label = { Text("Activity") }
            )
            FilterChip(
                selected = selected == LabelCategory.LOCATION_BUILDING,
                onClick = { onSelected(LabelCategory.LOCATION_BUILDING) },
                label = { Text("Location") }
            )
        }
    }
}

@Composable
private fun LabelCard(label: Label) {
    CPCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Label Icon
                Box(
                    modifier = Modifier
                        .size(AppSpacing.iconCircleSmall)
                        .clip(RoundedCornerShape(AppSpacing.xs))
                        .background(Primary100),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.Label,
                        contentDescription = null,
                        tint = Primary600,
                        modifier = Modifier.size(AppSpacing.iconMedium)
                    )
                }

                Column {
                    Text(
                        text = label.name,
                        style = AppTypography.heading3,
                        color = AppColors.textPrimary
                    )
                    Text(
                        text = LabelCategory.displayName(label.category),
                        style = AppTypography.secondary,
                        color = AppColors.textMuted
                    )
                }
            }

            // Active indicator
            if (label.isActive) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(AppSpacing.xxs))
                        .background(Success100)
                        .padding(horizontal = AppSpacing.xs, vertical = AppSpacing.xxs)
                ) {
                    Text(
                        text = "Active",
                        style = AppTypography.caption,
                        color = Success600
                    )
                }
            }
        }
    }
}
