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
import androidx.compose.ui.text.style.TextDecoration
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

private data class TasksState(
    val loading: Boolean = false,
    val tasks: List<Task> = emptyList(),
    val projects: List<ProjectSummary> = emptyList(),
    val error: String? = null,
    val filterStatus: String? = null,
    val filterPriority: String? = null,
    val filterProjectId: String? = null,
    val showMyTasks: Boolean = true,
    val showFilters: Boolean = false,
    val showCreateDialog: Boolean = false
)

private data class TaskFormState(
    val title: String = "",
    val description: String = "",
    val projectId: String = "",
    val priority: String = TaskPriority.MEDIUM,
    val dueDate: String = "",
    val saving: Boolean = false,
    val error: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TasksScreen(
    apiService: ApiService,
    onBack: () -> Unit,
    onOpenTask: (String) -> Unit
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(TasksState(loading = true)) }
    var formState by remember { mutableStateOf(TaskFormState()) }

    fun loadTasks() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val response = withContext(Dispatchers.IO) {
                    if (state.showMyTasks) {
                        apiService.getMyTasks(
                            status = state.filterStatus,
                            includeCompleted = state.filterStatus == TaskStatus.COMPLETED
                        )
                    } else {
                        apiService.getTasks(
                            projectId = state.filterProjectId,
                            status = state.filterStatus,
                            priority = state.filterPriority
                        )
                    }
                }
                state = state.copy(loading = false, tasks = response.tasks)
            } catch (e: Exception) {
                state = state.copy(loading = false, error = e.message ?: "Failed to load tasks")
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

    fun createTask() {
        if (formState.title.isBlank()) {
            formState = formState.copy(error = "Please enter a task title")
            return
        }
        if (formState.projectId.isBlank()) {
            formState = formState.copy(error = "Please select a project")
            return
        }

        scope.launch {
            formState = formState.copy(saving = true, error = null)
            try {
                val request = CreateTaskRequest(
                    title = formState.title.trim(),
                    description = formState.description.ifBlank { null },
                    projectId = formState.projectId,
                    priority = formState.priority,
                    dueDate = formState.dueDate.ifBlank { null }
                )
                withContext(Dispatchers.IO) {
                    apiService.createTask(request)
                }
                state = state.copy(showCreateDialog = false)
                formState = TaskFormState()
                loadTasks()
            } catch (e: Exception) {
                formState = formState.copy(
                    saving = false,
                    error = e.message ?: "Failed to create task"
                )
            }
        }
    }

    fun completeTask(taskId: String) {
        scope.launch {
            try {
                withContext(Dispatchers.IO) {
                    apiService.completeTask(taskId)
                }
                state = state.copy(
                    tasks = state.tasks.map {
                        if (it.id == taskId) it.copy(status = TaskStatus.COMPLETED) else it
                    }
                )
            } catch (_: Exception) {}
        }
    }

    // Load projects once on initial composition
    LaunchedEffect(Unit) {
        loadProjects()
    }

    // Load tasks when filters change (including initial load)
    LaunchedEffect(state.filterStatus, state.filterPriority, state.filterProjectId, state.showMyTasks) {
        loadTasks()
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.tasks_title),
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
                    contentDescription = stringResource(R.string.tasks_add),
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
            // Toggle between My Tasks and All Tasks
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = AppSpacing.md, vertical = AppSpacing.xs),
                horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
            ) {
                FilterChip(
                    selected = state.showMyTasks,
                    onClick = { state = state.copy(showMyTasks = true) },
                    label = { Text("My Tasks") },
                    leadingIcon = if (state.showMyTasks) {
                        { Icon(Icons.Default.Check, null, Modifier.size(AppSpacing.md)) }
                    } else null
                )
                FilterChip(
                    selected = !state.showMyTasks,
                    onClick = { state = state.copy(showMyTasks = false) },
                    label = { Text("All Tasks") },
                    leadingIcon = if (!state.showMyTasks) {
                        { Icon(Icons.Default.Check, null, Modifier.size(AppSpacing.md)) }
                    } else null
                )
            }

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
                        for (status in listOf(TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED)) {
                            FilterChip(
                                selected = state.filterStatus == status,
                                onClick = { state = state.copy(filterStatus = status) },
                                label = { Text(TaskStatus.displayName(status)) }
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
                        for (priority in TaskPriority.all) {
                            FilterChip(
                                selected = state.filterPriority == priority,
                                onClick = { state = state.copy(filterPriority = priority) },
                                label = { Text(TaskPriority.displayName(priority)) }
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
                    onRetry = { loadTasks() },
                    onDismiss = { state = state.copy(error = null) }
                )
            }

            when {
                state.loading -> {
                    CPLoadingIndicator(message = stringResource(R.string.tasks_loading))
                }
                state.tasks.isEmpty() -> {
                    CPEmptyState(
                        icon = Icons.Default.CheckCircle,
                        title = stringResource(R.string.tasks_empty_title),
                        description = stringResource(R.string.tasks_empty_desc)
                    )
                }
                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(AppSpacing.md),
                        verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                    ) {
                        items(state.tasks, key = { it.id }) { task ->
                            TaskCard(
                                task = task,
                                onClick = { onOpenTask(task.id) },
                                onComplete = { completeTask(task.id) }
                            )
                        }
                    }
                }
            }
        }
    }

    // Create Task Dialog
    if (state.showCreateDialog) {
        AlertDialog(
            onDismissRequest = {
                if (!formState.saving) {
                    state = state.copy(showCreateDialog = false)
                    formState = TaskFormState()
                }
            },
            title = { Text(stringResource(R.string.tasks_add)) },
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
                        value = formState.title,
                        onValueChange = { formState = formState.copy(title = it) },
                        label = { Text("Task Title *") },
                        placeholder = { Text("What needs to be done?") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        enabled = !formState.saving
                    )

                    OutlinedTextField(
                        value = formState.description,
                        onValueChange = { formState = formState.copy(description = it) },
                        label = { Text("Description") },
                        placeholder = { Text("Add details...") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2,
                        maxLines = 4,
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

                    // Priority Dropdown
                    var priorityExpanded by remember { mutableStateOf(false) }
                    ExposedDropdownMenuBox(
                        expanded = priorityExpanded,
                        onExpandedChange = { if (!formState.saving) priorityExpanded = it }
                    ) {
                        OutlinedTextField(
                            value = TaskPriority.displayName(formState.priority),
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
                            for (priority in TaskPriority.all) {
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
                                                    .background(getPriorityColor(priority))
                                            )
                                            Text(TaskPriority.displayName(priority))
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
                }
            },
            confirmButton = {
                Button(
                    onClick = { createTask() },
                    enabled = !formState.saving && formState.title.isNotBlank() && formState.projectId.isNotBlank()
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
                        formState = TaskFormState()
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
private fun TaskCard(
    task: Task,
    onClick: () -> Unit,
    onComplete: () -> Unit
) {
    val isCompleted = task.status == TaskStatus.COMPLETED

    CPCard(
        onClick = onClick
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm),
            verticalAlignment = Alignment.Top
        ) {
            // Checkbox
            Checkbox(
                checked = isCompleted,
                onCheckedChange = { if (!isCompleted) onComplete() },
                colors = CheckboxDefaults.colors(
                    checkedColor = ConstructionGreen,
                    uncheckedColor = AppColors.textSecondary
                )
            )

            // Content
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(AppSpacing.xxs)
            ) {
                Text(
                    text = task.title,
                    style = AppTypography.bodyLarge,
                    fontWeight = FontWeight.Medium,
                    textDecoration = if (isCompleted) TextDecoration.LineThrough else null,
                    color = if (isCompleted)
                        AppColors.textSecondary
                    else
                        AppColors.textPrimary
                )

                task.description?.let { desc ->
                    Text(
                        text = desc,
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
                ) {
                    // Priority Badge
                    Surface(
                        shape = RoundedCornerShape(AppSpacing.xxs),
                        color = getPriorityColor(task.priority).copy(alpha = 0.1f)
                    ) {
                        Text(
                            text = TaskPriority.displayName(task.priority),
                            style = AppTypography.caption,
                            color = getPriorityColor(task.priority),
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }

                    // Status Badge (if not completed)
                    if (!isCompleted && task.status != TaskStatus.TODO) {
                        Surface(
                            shape = RoundedCornerShape(AppSpacing.xxs),
                            color = getStatusColor(task.status).copy(alpha = 0.1f)
                        ) {
                            Text(
                                text = TaskStatus.displayName(task.status),
                                style = AppTypography.caption,
                                color = getStatusColor(task.status),
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }

                    // Due Date
                    task.dueDate?.let { dueDate ->
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(AppSpacing.xxs),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Schedule,
                                contentDescription = null,
                                modifier = Modifier.size(AppSpacing.sm),
                                tint = AppColors.textSecondary
                            )
                            Text(
                                text = dueDate.substringBefore("T"),
                                style = AppTypography.caption,
                                color = AppColors.textSecondary
                            )
                        }
                    }
                }

                // Project and Assignee
                Row(
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    task.projectName?.let { projectName ->
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

                    task.assigneeName?.let { assignee ->
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

                    // Subtasks progress
                    if (task.subtasks > 0) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(AppSpacing.xxs),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Checklist,
                                contentDescription = null,
                                modifier = Modifier.size(AppSpacing.sm),
                                tint = AppColors.textSecondary
                            )
                            Text(
                                text = "${task.subtasksCompleted}/${task.subtasks}",
                                style = AppTypography.caption,
                                color = AppColors.textSecondary
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun rememberScrollState() = androidx.compose.foundation.rememberScrollState()

private fun getPriorityColor(priority: String): Color {
    return when (priority) {
        TaskPriority.LOW -> ConstructionGreen
        TaskPriority.MEDIUM -> Primary600
        TaskPriority.HIGH -> ConstructionOrange
        TaskPriority.URGENT -> ConstructionRed
        else -> Primary600
    }
}

private fun getStatusColor(status: String): Color {
    return when (status) {
        TaskStatus.TODO -> Primary600
        TaskStatus.IN_PROGRESS -> ConstructionOrange
        TaskStatus.BLOCKED -> ConstructionRed
        TaskStatus.COMPLETED -> ConstructionGreen
        TaskStatus.CANCELLED -> ConstructionRed.copy(alpha = 0.5f)
        else -> Primary600
    }
}
