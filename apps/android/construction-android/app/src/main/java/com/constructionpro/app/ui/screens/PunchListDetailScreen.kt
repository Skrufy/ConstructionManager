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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import com.constructionpro.app.R
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.model.*
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import com.constructionpro.app.ui.util.responsiveValue
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class PunchListDetailState(
    val loading: Boolean = false,
    val punchList: PunchList? = null,
    val error: String? = null,
    val updatingItemId: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PunchListDetailScreen(
    apiService: ApiService,
    punchListId: String,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(PunchListDetailState(loading = true)) }

    fun loadData() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val punchList = withContext(Dispatchers.IO) {
                    apiService.getPunchList(punchListId)
                }
                state = state.copy(loading = false, punchList = punchList)
            } catch (error: Exception) {
                state = state.copy(
                    loading = false,
                    error = error.message ?: "Failed to load punch list"
                )
            }
        }
    }

    fun toggleItem(itemId: String, completed: Boolean) {
        scope.launch {
            state = state.copy(updatingItemId = itemId)
            try {
                withContext(Dispatchers.IO) {
                    apiService.updatePunchListItem(
                        punchListId = punchListId,
                        itemId = itemId,
                        request = UpdatePunchListItemRequest(
                            status = if (completed) "COMPLETED" else "OPEN"
                        )
                    )
                }
                loadData()
            } catch (error: Exception) {
                state = state.copy(error = error.message)
            } finally {
                state = state.copy(updatingItemId = null)
            }
        }
    }

    LaunchedEffect(punchListId) {
        loadData()
    }

    Scaffold(
        containerColor = BackgroundLight,
        topBar = {
            CPTopAppBar(
                title = state.punchList?.title ?: "Punch List",
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Back",
                            tint = Gray700
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { loadData() }) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Refresh",
                            tint = Gray600
                        )
                    }
                }
            )
        }
    ) { padding ->
        if (state.loading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CPLoadingIndicator(message = stringResource(R.string.punch_lists_loading))
            }
        } else if (state.error != null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(AppSpacing.md)
            ) {
                CPErrorBanner(
                    message = state.error ?: "An error occurred",
                    onRetry = { loadData() },
                    onDismiss = { state = state.copy(error = null) }
                )
            }
        } else {
            state.punchList?.let { punchList ->
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentPadding = PaddingValues(
                        horizontal = responsiveValue(AppSpacing.md, AppSpacing.xl, AppSpacing.xxl),
                        vertical = AppSpacing.md
                    ),
                    verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
                ) {
                    // Progress Card
                    item {
                        ProgressCard(punchList = punchList)
                    }

                    // Header Info
                    item {
                        PunchListHeaderCard(punchList = punchList)
                    }

                    // Items Section
                    if (punchList.items.isNotEmpty()) {
                        // Open Items
                        val openItems = punchList.items.filter { it.status != "COMPLETED" }
                        if (openItems.isNotEmpty()) {
                            item {
                                CPSectionHeader(title = "Open Items (${openItems.size})")
                            }

                            items(openItems) { item ->
                                PunchListItemCard(
                                    item = item,
                                    isUpdating = state.updatingItemId == item.id,
                                    onToggle = { toggleItem(item.id, true) }
                                )
                            }
                        }

                        // Completed Items
                        val completedItems = punchList.items.filter { it.status == "COMPLETED" }
                        if (completedItems.isNotEmpty()) {
                            item {
                                CPSectionHeader(title = "Completed (${completedItems.size})")
                            }

                            items(completedItems) { item ->
                                PunchListItemCard(
                                    item = item,
                                    isUpdating = state.updatingItemId == item.id,
                                    onToggle = { toggleItem(item.id, false) }
                                )
                            }
                        }
                    } else {
                        item {
                            CPEmptyState(
                                icon = Icons.Default.PlaylistAddCheck,
                                title = stringResource(R.string.punch_lists_empty_title),
                                description = stringResource(R.string.punch_lists_empty_desc)
                            )
                        }
                    }

                    // Description
                    punchList.description?.let { description ->
                        if (description.isNotBlank()) {
                            item {
                                CPSectionHeader(title = "Description")
                            }
                            item {
                                CPCard {
                                    Text(
                                        text = description,
                                        style = AppTypography.body,
                                        color = AppColors.textPrimary
                                    )
                                }
                            }
                        }
                    }

                    item {
                        Spacer(modifier = Modifier.height(AppSpacing.md))
                    }
                }
            }
        }
    }
}

@Composable
private fun ProgressCard(punchList: PunchList) {
    val progress = if (punchList.totalCount > 0) {
        punchList.completedCount.toFloat() / punchList.totalCount.toFloat()
    } else 0f
    val isComplete = progress >= 1f

    CPCard {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = if (isComplete) "All Complete!" else "Progress",
                        style = AppTypography.heading3,
                        fontWeight = FontWeight.Bold,
                        color = if (isComplete) ConstructionGreen else AppColors.textPrimary
                    )
                    Text(
                        text = "${punchList.completedCount} of ${punchList.totalCount} items",
                        style = AppTypography.body,
                        color = AppColors.textSecondary
                    )
                }

                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(RoundedCornerShape(32.dp))
                        .background(if (isComplete) ConstructionGreen.copy(alpha = 0.1f) else Primary100),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "${(progress * 100).toInt()}%",
                        style = AppTypography.heading2,
                        fontWeight = FontWeight.Bold,
                        color = if (isComplete) ConstructionGreen else Primary700
                    )
                }
            }

            Spacer(modifier = Modifier.height(AppSpacing.md))

            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(AppSpacing.sm)
                    .clip(RoundedCornerShape(6.dp)),
                color = if (isComplete) ConstructionGreen else AppColors.primary600,
                trackColor = AppColors.gray200
            )
        }
    }
}

@Composable
private fun PunchListHeaderCard(punchList: PunchList) {
    CPCard {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = punchList.title,
                        style = AppTypography.heading2,
                        fontWeight = FontWeight.Bold
                    )
                    punchList.project?.name?.let { projectName ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(top = AppSpacing.xxs)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Folder,
                                contentDescription = null,
                                tint = AppColors.textMuted,
                                modifier = Modifier.size(AppSpacing.md)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = projectName,
                                style = AppTypography.body,
                                color = AppColors.textSecondary
                            )
                        }
                    }
                }

                CPBadge(
                    text = punchList.status,
                    color = getStatusColor(punchList.status),
                    backgroundColor = getStatusColor(punchList.status).copy(alpha = 0.1f)
                )
            }

            punchList.dueDate?.let { dueDate ->
                Spacer(modifier = Modifier.height(AppSpacing.sm))
                Divider(color = AppColors.divider)
                Spacer(modifier = Modifier.height(AppSpacing.sm))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.CalendarToday,
                        contentDescription = null,
                        tint = AppColors.textMuted,
                        modifier = Modifier.size(AppSpacing.md)
                    )
                    Spacer(modifier = Modifier.width(AppSpacing.xs))
                    Text(
                        text = "Due: ${dueDate.take(10)}",
                        style = AppTypography.body,
                        color = AppColors.textPrimary
                    )
                }
            }

        }
    }
}

@Composable
private fun PunchListItemCard(
    item: PunchListItem,
    isUpdating: Boolean,
    onToggle: () -> Unit
) {
    val isCompleted = item.status == "COMPLETED"

    CPCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.Top
        ) {
            // Checkbox
            Box(
                modifier = Modifier
                    .size(AppSpacing.touchTargetLarge)
                    .padding(AppSpacing.xxs),
                contentAlignment = Alignment.Center
            ) {
                if (isUpdating) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(AppSpacing.xl),
                        strokeWidth = 2.dp,
                        color = AppColors.primary600
                    )
                } else {
                    Checkbox(
                        checked = isCompleted,
                        onCheckedChange = { onToggle() },
                        colors = CheckboxDefaults.colors(
                            checkedColor = ConstructionGreen,
                            uncheckedColor = AppColors.textMuted
                        ),
                        modifier = Modifier.size(AppSpacing.xl)
                    )
                }
            }

            Spacer(modifier = Modifier.width(AppSpacing.xs))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = item.description,
                    style = AppTypography.body,
                    fontWeight = FontWeight.Medium,
                    textDecoration = if (isCompleted) TextDecoration.LineThrough else null,
                    color = if (isCompleted) AppColors.textMuted else AppColors.textPrimary
                )

                item.location?.let { location ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(top = AppSpacing.xxs)
                    ) {
                        Icon(
                            imageVector = Icons.Default.LocationOn,
                            contentDescription = null,
                            tint = AppColors.textMuted,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.xxs))
                        Text(
                            text = location,
                            style = AppTypography.secondary,
                            color = AppColors.textMuted
                        )
                    }
                }

                item.notes?.let { notes ->
                    Text(
                        text = notes,
                        style = AppTypography.secondary,
                        color = AppColors.textMuted,
                        modifier = Modifier.padding(top = AppSpacing.xxs)
                    )
                }

                // Priority badge
                item.priority?.let { priority ->
                    Spacer(modifier = Modifier.height(AppSpacing.xs))
                    CPBadge(
                        text = priority,
                        color = getPriorityColor(priority),
                        backgroundColor = getPriorityColor(priority).copy(alpha = 0.1f)
                    )
                }
            }

            // Trade/Category
            item.trade?.let { trade ->
                CPBadge(
                    text = trade,
                    color = AppColors.textSecondary,
                    backgroundColor = AppColors.gray100
                )
            }
        }
    }
}

// Helper functions
private fun getStatusColor(status: String): androidx.compose.ui.graphics.Color {
    return when (status.uppercase()) {
        "COMPLETED" -> ConstructionGreen
        "IN_PROGRESS" -> AppColors.primary600
        "OPEN" -> ConstructionOrange
        else -> AppColors.gray500
    }
}

private fun getPriorityColor(priority: String): androidx.compose.ui.graphics.Color {
    return when (priority.uppercase()) {
        "HIGH", "URGENT" -> ConstructionRed
        "MEDIUM" -> ConstructionOrange
        "LOW" -> ConstructionGreen
        else -> AppColors.gray500
    }
}
