package com.constructionpro.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.constructionpro.app.R
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.model.*
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class RfiListState(
    val loading: Boolean = false,
    val rfis: List<Rfi> = emptyList(),
    val projects: List<ProjectSummary> = emptyList(),
    val error: String? = null,
    val filterStatus: String? = null,
    val filterPriority: String? = null,
    val filterProjectId: String? = null,
    val searchQuery: String = "",
    val showFilters: Boolean = false,
    val showCreateDialog: Boolean = false
)

private data class RfiFormState(
    val subject: String = "",
    val question: String = "",
    val projectId: String = "",
    val priority: String = RfiPriority.NORMAL,
    val drawingReference: String = "",
    val specificationReference: String = "",
    val costImpact: Boolean? = null,
    val scheduleImpact: Boolean? = null,
    val saving: Boolean = false,
    val error: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RfiScreen(
    apiService: ApiService,
    onBack: () -> Unit,
    onOpenRfi: (String) -> Unit
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(RfiListState(loading = true)) }
    var formState by remember { mutableStateOf(RfiFormState()) }

    fun loadRfis() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val response = withContext(Dispatchers.IO) {
                    apiService.getRfis(
                        projectId = state.filterProjectId,
                        status = state.filterStatus,
                        priority = state.filterPriority,
                        search = state.searchQuery.ifBlank { null }
                    )
                }
                state = state.copy(loading = false, rfis = response.rfis)
            } catch (e: Exception) {
                state = state.copy(loading = false, error = e.message ?: "Failed to load RFIs")
            }
        }
    }

    fun loadProjects() {
        scope.launch {
            try {
                val response = withContext(Dispatchers.IO) {
                    apiService.getProjects()
                }
                state = state.copy(projects = response.projects)
            } catch (_: Exception) {}
        }
    }

    fun createRfi() {
        if (formState.subject.isBlank()) {
            formState = formState.copy(error = "Please enter a subject")
            return
        }
        if (formState.question.isBlank()) {
            formState = formState.copy(error = "Please enter the question/request")
            return
        }
        if (formState.projectId.isBlank()) {
            formState = formState.copy(error = "Please select a project")
            return
        }

        scope.launch {
            formState = formState.copy(saving = true, error = null)
            try {
                val request = CreateRfiRequest(
                    subject = formState.subject.trim(),
                    question = formState.question.trim(),
                    projectId = formState.projectId,
                    priority = formState.priority,
                    drawingReference = formState.drawingReference.ifBlank { null },
                    specificationReference = formState.specificationReference.ifBlank { null },
                    costImpact = formState.costImpact,
                    scheduleImpact = formState.scheduleImpact
                )
                val rfi = withContext(Dispatchers.IO) {
                    apiService.createRfi(request)
                }
                state = state.copy(showCreateDialog = false)
                formState = RfiFormState()
                onOpenRfi(rfi.id)
            } catch (e: Exception) {
                formState = formState.copy(
                    saving = false,
                    error = e.message ?: "Failed to create RFI"
                )
            }
        }
    }

    // Load projects once on initial composition
    LaunchedEffect(Unit) {
        loadProjects()
    }

    // Load RFIs when filters or search change (including initial load)
    LaunchedEffect(state.filterStatus, state.filterPriority, state.filterProjectId, state.searchQuery) {
        loadRfis()
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.rfis_title),
                subtitle = stringResource(R.string.card_rfis_desc),
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
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { state = state.copy(showCreateDialog = true) },
                containerColor = AppColors.primary600
            ) {
                Icon(
                    imageVector = Icons.Default.Add,
                    contentDescription = stringResource(R.string.rfis_add),
                    tint = Color.White
                )
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Search
            OutlinedTextField(
                value = state.searchQuery,
                onValueChange = { state = state.copy(searchQuery = it) },
                placeholder = { Text(stringResource(R.string.rfis_search)) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = AppSpacing.md, vertical = AppSpacing.xs),
                singleLine = true,
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                trailingIcon = {
                    if (state.searchQuery.isNotBlank()) {
                        IconButton(onClick = { state = state.copy(searchQuery = "") }) {
                            Icon(Icons.Default.Clear, contentDescription = stringResource(R.string.common_dismiss))
                        }
                    }
                }
            )

            // Filters
            if (state.showFilters) {
                Column(
                    modifier = Modifier.padding(horizontal = AppSpacing.md),
                    verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                ) {
                    // Status Filters
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                    ) {
                        FilterChip(
                            selected = state.filterStatus == null,
                            onClick = { state = state.copy(filterStatus = null) },
                            label = { Text("All") }
                        )
                        for (status in listOf(RfiStatus.OPEN, RfiStatus.PENDING, RfiStatus.ANSWERED, RfiStatus.CLOSED)) {
                            FilterChip(
                                selected = state.filterStatus == status,
                                onClick = { state = state.copy(filterStatus = status) },
                                label = { Text(RfiStatus.displayName(status)) }
                            )
                        }
                    }

                    // Priority Filters
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                    ) {
                        FilterChip(
                            selected = state.filterPriority == null,
                            onClick = { state = state.copy(filterPriority = null) },
                            label = { Text("Any Priority") }
                        )
                        for (priority in RfiPriority.all) {
                            FilterChip(
                                selected = state.filterPriority == priority,
                                onClick = { state = state.copy(filterPriority = priority) },
                                label = { Text(RfiPriority.displayName(priority)) }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(AppSpacing.xs))
            }

            // Error Banner
            state.error?.let { error ->
                CPErrorBanner(
                    message = error,
                    onRetry = { loadRfis() },
                    onDismiss = { state = state.copy(error = null) }
                )
            }

            when {
                state.loading -> {
                    CPLoadingIndicator(message = stringResource(R.string.rfis_loading))
                }
                state.rfis.isEmpty() -> {
                    CPEmptyState(
                        icon = Icons.Default.QuestionAnswer,
                        title = stringResource(R.string.rfis_empty_title),
                        description = stringResource(R.string.rfis_empty_desc)
                    )
                }
                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(AppSpacing.md),
                        verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
                    ) {
                        items(state.rfis, key = { it.id }) { rfi ->
                            RfiCard(
                                rfi = rfi,
                                onClick = { onOpenRfi(rfi.id) }
                            )
                        }
                    }
                }
            }
        }
    }

    // Create RFI Dialog
    if (state.showCreateDialog) {
        AlertDialog(
            onDismissRequest = {
                if (!formState.saving) {
                    state = state.copy(showCreateDialog = false)
                    formState = RfiFormState()
                }
            },
            title = { Text(stringResource(R.string.rfis_add)) },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
                ) {
                    formState.error?.let { error ->
                        Text(
                            text = error,
                            color = AppColors.error,
                            style = AppTypography.secondary
                        )
                    }

                    OutlinedTextField(
                        value = formState.subject,
                        onValueChange = { formState = formState.copy(subject = it) },
                        label = { Text("Subject *") },
                        placeholder = { Text("Brief description of the request") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        enabled = !formState.saving
                    )

                    // Project Dropdown
                    var projectExpanded by remember { mutableStateOf(false) }
                    ExposedDropdownMenuBox(
                        expanded = projectExpanded,
                        onExpandedChange = { if (!formState.saving) projectExpanded = it }
                    ) {
                        OutlinedTextField(
                            value = state.projects.find { it.id == formState.projectId }?.name ?: "",
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Project *") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = projectExpanded) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor(),
                            enabled = !formState.saving
                        )
                        ExposedDropdownMenu(
                            expanded = projectExpanded,
                            onDismissRequest = { projectExpanded = false }
                        ) {
                            for (project in state.projects) {
                                DropdownMenuItem(
                                    text = { Text(project.name) },
                                    onClick = {
                                        formState = formState.copy(projectId = project.id)
                                        projectExpanded = false
                                    }
                                )
                            }
                        }
                    }

                    OutlinedTextField(
                        value = formState.question,
                        onValueChange = { formState = formState.copy(question = it) },
                        label = { Text("Question/Request *") },
                        placeholder = { Text("Describe what information you need...") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 3,
                        maxLines = 6,
                        enabled = !formState.saving
                    )

                    // Priority Dropdown
                    var priorityExpanded by remember { mutableStateOf(false) }
                    ExposedDropdownMenuBox(
                        expanded = priorityExpanded,
                        onExpandedChange = { if (!formState.saving) priorityExpanded = it }
                    ) {
                        OutlinedTextField(
                            value = RfiPriority.displayName(formState.priority),
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Priority") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = priorityExpanded) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor(),
                            enabled = !formState.saving
                        )
                        ExposedDropdownMenu(
                            expanded = priorityExpanded,
                            onDismissRequest = { priorityExpanded = false }
                        ) {
                            for (priority in RfiPriority.all) {
                                DropdownMenuItem(
                                    text = {
                                        Row(
                                            horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Box(
                                                modifier = Modifier
                                                    .size(AppSpacing.xs)
                                                    .clip(RoundedCornerShape(2.dp))
                                                    .background(getRfiPriorityColor(priority))
                                            )
                                            Text(RfiPriority.displayName(priority))
                                        }
                                    },
                                    onClick = {
                                        formState = formState.copy(priority = priority)
                                        priorityExpanded = false
                                    }
                                )
                            }
                        }
                    }

                    // References
                    OutlinedTextField(
                        value = formState.drawingReference,
                        onValueChange = { formState = formState.copy(drawingReference = it) },
                        label = { Text("Drawing Reference") },
                        placeholder = { Text("e.g., A-101, Sheet 5") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        enabled = !formState.saving
                    )

                    OutlinedTextField(
                        value = formState.specificationReference,
                        onValueChange = { formState = formState.copy(specificationReference = it) },
                        label = { Text("Specification Reference") },
                        placeholder = { Text("e.g., Section 03300") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        enabled = !formState.saving
                    )

                    // Impact toggles
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.md)
                    ) {
                        Row(
                            modifier = Modifier.weight(1f),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Checkbox(
                                checked = formState.costImpact == true,
                                onCheckedChange = {
                                    formState = formState.copy(costImpact = if (it) true else null)
                                },
                                enabled = !formState.saving
                            )
                            Text(
                                text = "Cost Impact",
                                style = AppTypography.body
                            )
                        }
                        Row(
                            modifier = Modifier.weight(1f),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Checkbox(
                                checked = formState.scheduleImpact == true,
                                onCheckedChange = {
                                    formState = formState.copy(scheduleImpact = if (it) true else null)
                                },
                                enabled = !formState.saving
                            )
                            Text(
                                text = "Schedule Impact",
                                style = AppTypography.body
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { createRfi() },
                    enabled = !formState.saving &&
                              formState.subject.isNotBlank() &&
                              formState.question.isNotBlank() &&
                              formState.projectId.isNotBlank()
                ) {
                    if (formState.saving) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(AppSpacing.lg),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text(stringResource(R.string.common_add))
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        state = state.copy(showCreateDialog = false)
                        formState = RfiFormState()
                    },
                    enabled = !formState.saving
                ) {
                    Text(stringResource(R.string.common_cancel))
                }
            }
        )
    }
}

@Composable
private fun RfiCard(
    rfi: Rfi,
    onClick: () -> Unit
) {
    CPCard(
        onClick = onClick
    ) {
        Column(
            verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(AppSpacing.xxs)
                ) {
                    // RFI Number
                    Text(
                        text = rfi.number,
                        style = AppTypography.secondaryMedium,
                        color = AppColors.primary600,
                        fontWeight = FontWeight.Medium
                    )

                    // Subject
                    Text(
                        text = rfi.subject,
                        style = AppTypography.heading3,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                // Status Badge
                val statusColor = getRfiStatusColor(rfi.status)
                Surface(
                    shape = RoundedCornerShape(AppSpacing.xxs),
                    color = statusColor.copy(alpha = 0.1f)
                ) {
                    Text(
                        text = RfiStatus.displayName(rfi.status),
                        style = AppTypography.caption,
                        color = statusColor,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(horizontal = AppSpacing.xs, vertical = AppSpacing.xxs)
                    )
                }
            }

            // Question preview
            Text(
                text = rfi.question,
                style = AppTypography.secondary,
                color = AppColors.textSecondary,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )

            // Meta info row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(AppSpacing.md)
            ) {
                // Priority
                Row(
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.xxs),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(AppSpacing.xs)
                            .clip(RoundedCornerShape(2.dp))
                            .background(getRfiPriorityColor(rfi.priority))
                    )
                    Text(
                        text = RfiPriority.displayName(rfi.priority),
                        style = AppTypography.caption,
                        color = AppColors.textSecondary
                    )
                }

                // Project
                rfi.projectName?.let { projectName ->
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xxs),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Folder,
                            contentDescription = null,
                            modifier = Modifier.size(AppSpacing.sm),
                            tint = AppColors.textSecondary
                        )
                        Text(
                            text = projectName,
                            style = AppTypography.caption,
                            color = AppColors.textSecondary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                // Responses count
                if (rfi.responses > 0) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xxs),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Comment,
                            contentDescription = null,
                            modifier = Modifier.size(AppSpacing.sm),
                            tint = AppColors.textSecondary
                        )
                        Text(
                            text = "${rfi.responses}",
                            style = AppTypography.caption,
                            color = AppColors.textSecondary
                        )
                    }
                }
            }

            // Impact indicators
            if (rfi.costImpact == true || rfi.scheduleImpact == true) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                ) {
                    if (rfi.costImpact == true) {
                        Surface(
                            shape = RoundedCornerShape(AppSpacing.xxs),
                            color = ConstructionRed.copy(alpha = 0.1f)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                horizontalArrangement = Arrangement.spacedBy(AppSpacing.xxs),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.AttachMoney,
                                    contentDescription = null,
                                    modifier = Modifier.size(AppSpacing.sm),
                                    tint = ConstructionRed
                                )
                                Text(
                                    text = "Cost Impact",
                                    style = AppTypography.caption,
                                    color = ConstructionRed
                                )
                            }
                        }
                    }
                    if (rfi.scheduleImpact == true) {
                        Surface(
                            shape = RoundedCornerShape(AppSpacing.xxs),
                            color = ConstructionOrange.copy(alpha = 0.1f)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                horizontalArrangement = Arrangement.spacedBy(AppSpacing.xxs),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Schedule,
                                    contentDescription = null,
                                    modifier = Modifier.size(AppSpacing.sm),
                                    tint = ConstructionOrange
                                )
                                Text(
                                    text = "Schedule Impact",
                                    style = AppTypography.caption,
                                    color = ConstructionOrange
                                )
                            }
                        }
                    }
                }
            }

            // Footer - Created date and assignee
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Created ${rfi.createdAt.substringBefore("T")}",
                    style = AppTypography.caption,
                    color = AppColors.textSecondary
                )

                rfi.assignedToName?.let { assignee ->
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xxs),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Person,
                            contentDescription = null,
                            modifier = Modifier.size(AppSpacing.sm),
                            tint = AppColors.textSecondary
                        )
                        Text(
                            text = assignee,
                            style = AppTypography.caption,
                            color = AppColors.textSecondary
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun rememberScrollState() = androidx.compose.foundation.rememberScrollState()

private fun getRfiStatusColor(status: String): Color {
    return when (status) {
        RfiStatus.DRAFT -> Primary600.copy(alpha = 0.6f)
        RfiStatus.OPEN -> Primary600
        RfiStatus.PENDING -> ConstructionOrange
        RfiStatus.ANSWERED -> ConstructionGreen
        RfiStatus.CLOSED -> ConstructionGreen
        RfiStatus.VOID -> ConstructionRed.copy(alpha = 0.5f)
        else -> Primary600
    }
}

private fun getRfiPriorityColor(priority: String): Color {
    return when (priority) {
        RfiPriority.LOW -> ConstructionGreen
        RfiPriority.NORMAL -> Primary600
        RfiPriority.HIGH -> ConstructionOrange
        RfiPriority.CRITICAL -> ConstructionRed
        else -> Primary600
    }
}
