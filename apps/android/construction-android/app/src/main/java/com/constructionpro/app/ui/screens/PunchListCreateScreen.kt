package com.constructionpro.app.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.constructionpro.app.R
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.model.*
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.LocalDate
import java.time.format.DateTimeFormatter

private data class PunchListCreateState(
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val error: String? = null,

    // Form data
    val title: String = "",
    val description: String = "",
    val dueDate: LocalDate = LocalDate.now().plusDays(7),
    val priority: String = "MEDIUM",
    val location: String = "",

    // Project
    val projects: List<ProjectSummary> = emptyList(),
    val selectedProject: ProjectSummary? = null,
    val showProjectPicker: Boolean = false,

    // Pickers
    val showDatePicker: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PunchListCreateScreen(
    apiService: ApiService,
    projectId: String? = null,
    onBack: () -> Unit,
    onSaved: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var state by remember { mutableStateOf(PunchListCreateState()) }

    val priorityLevels = listOf(
        "LOW" to stringResource(R.string.punch_lists_priority_low),
        "MEDIUM" to stringResource(R.string.punch_lists_priority_medium),
        "HIGH" to stringResource(R.string.punch_lists_priority_high),
        "URGENT" to stringResource(R.string.punch_lists_priority_urgent)
    )

    // Form validation
    val isFormValid = state.title.isNotBlank() && state.selectedProject != null

    // Load initial data
    LaunchedEffect(Unit) {
        try {
            val projects = withContext(Dispatchers.IO) {
                apiService.getProjects(status = "ACTIVE", pageSize = 100)
            }

            val selectedProject = if (projectId != null) {
                projects.projects.find { it.id == projectId }
            } else null

            state = state.copy(
                isLoading = false,
                projects = projects.projects,
                selectedProject = selectedProject
            )
        } catch (e: Exception) {
            state = state.copy(
                isLoading = false,
                error = "${context.getString(R.string.punch_lists_load_failed)}: ${e.message}"
            )
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.punch_lists_add)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.common_back))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = AppColors.cardBackground
                )
            )
        }
    ) { padding ->
        if (state.isLoading) {
            Box(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = AppSpacing.md),
                verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
            ) {
                item { Spacer(Modifier.height(AppSpacing.xs)) }

                // Error banner
                state.error?.let { error ->
                    item {
                        CPErrorBanner(
                            message = error,
                            onDismiss = { state = state.copy(error = null) }
                        )
                    }
                }

                // Title Section (Required)
                item {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            stringResource(R.string.punch_lists_item),
                            style = AppTypography.heading3,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(Modifier.width(AppSpacing.xs))
                        Text(stringResource(R.string.common_required), style = AppTypography.caption, color = ConstructionRed)
                    }
                }

                item {
                    OutlinedTextField(
                        value = state.title,
                        onValueChange = { state = state.copy(title = it) },
                        placeholder = { Text(stringResource(R.string.punch_lists_title_placeholder)) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                }

                // Project Section (Required)
                item {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            stringResource(R.string.punch_lists_project),
                            style = AppTypography.heading3,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(Modifier.width(AppSpacing.xs))
                        Text(stringResource(R.string.common_required), style = AppTypography.caption, color = ConstructionRed)
                    }
                }

                item {
                    OutlinedCard(
                        modifier = Modifier.fillMaxWidth(),
                        onClick = { state = state.copy(showProjectPicker = true) }
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(AppSpacing.md),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            if (state.selectedProject != null) {
                                Column(Modifier.weight(1f)) {
                                    Text(
                                        state.selectedProject!!.name,
                                        style = AppTypography.body
                                    )
                                    state.selectedProject!!.address?.let {
                                        Text(
                                            it,
                                            style = AppTypography.secondary,
                                            color = AppColors.textSecondary,
                                            maxLines = 1
                                        )
                                    }
                                }
                            } else {
                                Text(
                                    stringResource(R.string.punch_lists_select_project),
                                    color = AppColors.textSecondary,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                            Icon(Icons.Default.ChevronRight, stringResource(R.string.common_select), tint = AppColors.textMuted)
                        }
                    }
                }

                // Due Date Section
                item {
                    Text(
                        stringResource(R.string.punch_lists_due_date),
                        style = AppTypography.heading3,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                item {
                    OutlinedCard(
                        modifier = Modifier.fillMaxWidth(),
                        onClick = { state = state.copy(showDatePicker = true) }
                    ) {
                        Row(
                            modifier = Modifier.padding(AppSpacing.md),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                        ) {
                            Icon(Icons.Default.CalendarToday, "Date", tint = AppColors.primary600)
                            Text(state.dueDate.format(DateTimeFormatter.ofPattern("MMM d, yyyy")))
                        }
                    }
                }

                // Priority Section
                item {
                    Text(
                        stringResource(R.string.punch_lists_priority),
                        style = AppTypography.heading3,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                    ) {
                        priorityLevels.forEach { (value, label) ->
                            FilterChip(
                                selected = state.priority == value,
                                onClick = { state = state.copy(priority = value) },
                                label = { Text(label) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = getPriorityColor(value).copy(alpha = 0.2f),
                                    selectedLabelColor = getPriorityColor(value)
                                )
                            )
                        }
                    }
                }

                // Location Section
                item {
                    Text(
                        stringResource(R.string.punch_lists_location),
                        style = AppTypography.heading3,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                item {
                    OutlinedTextField(
                        value = state.location,
                        onValueChange = { state = state.copy(location = it) },
                        placeholder = { Text(stringResource(R.string.punch_lists_location_placeholder)) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                }

                // Description Section
                item {
                    Text(
                        stringResource(R.string.punch_lists_description),
                        style = AppTypography.heading3,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                item {
                    OutlinedTextField(
                        value = state.description,
                        onValueChange = { state = state.copy(description = it) },
                        placeholder = { Text(stringResource(R.string.punch_lists_description_placeholder)) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(120.dp),
                        maxLines = 5
                    )
                }

                // Submit Button
                item {
                    CPButton(
                        text = stringResource(R.string.punch_lists_save),
                        onClick = {
                            scope.launch {
                                state = state.copy(isSaving = true, error = null)
                                try {
                                    val request = CreatePunchListRequest(
                                        projectId = state.selectedProject!!.id,
                                        title = state.title,
                                        description = state.description.ifBlank { null },
                                        dueDate = state.dueDate.toString()
                                    )
                                    withContext(Dispatchers.IO) {
                                        apiService.createPunchList(request)
                                    }
                                    onSaved()
                                } catch (e: Exception) {
                                    state = state.copy(isSaving = false, error = "${context.getString(R.string.punch_lists_create_failed)}: ${e.message}")
                                }
                            }
                        },
                        enabled = isFormValid && !state.isSaving,
                        loading = state.isSaving,
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                item { Spacer(Modifier.height(AppSpacing.xxl)) }
            }
        }
    }

    // Project Picker Dialog
    if (state.showProjectPicker) {
        AlertDialog(
            onDismissRequest = { state = state.copy(showProjectPicker = false) },
            title = { Text(stringResource(R.string.punch_lists_select_project_title)) },
            text = {
                LazyColumn {
                    items(state.projects.size) { index ->
                        val project = state.projects[index]
                        ListItem(
                            headlineContent = { Text(project.name) },
                            supportingContent = project.address?.let { { Text(it, maxLines = 1) } },
                            trailingContent = if (state.selectedProject?.id == project.id) {
                                { Icon(Icons.Default.Check, null, tint = AppColors.primary600) }
                            } else null,
                            modifier = Modifier.clickable {
                                state = state.copy(selectedProject = project, showProjectPicker = false)
                            }
                        )
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { state = state.copy(showProjectPicker = false) }) {
                    Text(stringResource(R.string.common_cancel))
                }
            }
        )
    }

    // Date Picker
    if (state.showDatePicker) {
        val datePickerState = rememberDatePickerState(
            initialSelectedDateMillis = state.dueDate.toEpochDay() * 24 * 60 * 60 * 1000
        )

        DatePickerDialog(
            onDismissRequest = { state = state.copy(showDatePicker = false) },
            confirmButton = {
                TextButton(
                    onClick = {
                        datePickerState.selectedDateMillis?.let { millis ->
                            val date = java.time.Instant.ofEpochMilli(millis)
                                .atZone(java.time.ZoneId.systemDefault())
                                .toLocalDate()
                            state = state.copy(
                                dueDate = date,
                                showDatePicker = false
                            )
                        }
                    }
                ) {
                    Text(stringResource(R.string.common_ok))
                }
            },
            dismissButton = {
                TextButton(onClick = { state = state.copy(showDatePicker = false) }) {
                    Text(stringResource(R.string.common_cancel))
                }
            }
        ) {
            DatePicker(state = datePickerState)
        }
    }
}

private fun getPriorityColor(priority: String) = when (priority) {
    "URGENT" -> ConstructionRed
    "HIGH" -> ConstructionOrange
    "MEDIUM" -> AppColors.primary600
    "LOW" -> ConstructionGreen
    else -> AppColors.gray500
}
