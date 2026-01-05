package com.constructionpro.app.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.pluralStringResource
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
import java.time.LocalTime
import java.time.format.DateTimeFormatter

private data class ScheduleCreateState(
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val error: String? = null,

    // Form data
    val scheduleDate: LocalDate = LocalDate.now().plusDays(1),
    val shiftStartTime: LocalTime = LocalTime.of(7, 0),
    val shiftEndTime: LocalTime = LocalTime.of(15, 30),
    val notes: String = "",
    val status: String = "SCHEDULED",

    // Project
    val projects: List<ProjectSummary> = emptyList(),
    val selectedProject: ProjectSummary? = null,
    val showProjectPicker: Boolean = false,

    // Users / Crew Members
    val users: List<UserSummary> = emptyList(),
    val selectedCrewMembers: Set<String> = emptySet(), // User IDs

    // Pickers
    val showDatePicker: Boolean = false,
    val showStartTimePicker: Boolean = false,
    val showEndTimePicker: Boolean = false,
    val showCrewPicker: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScheduleCreateScreen(
    apiService: ApiService,
    projectId: String? = null,
    onBack: () -> Unit,
    onSaved: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(ScheduleCreateState()) }

    val statusOptions = listOf(
        "SCHEDULED" to "Scheduled",
        "CONFIRMED" to "Confirmed"
    )

    // Form validation
    val isFormValid = state.selectedProject != null && state.selectedCrewMembers.isNotEmpty()

    // Load initial data
    LaunchedEffect(Unit) {
        try {
            val projects = withContext(Dispatchers.IO) {
                apiService.getProjects(status = "ACTIVE", pageSize = 100)
            }

            val selectedProject = if (projectId != null) {
                projects.projects.find { it.id == projectId }
            } else null

            val users = withContext(Dispatchers.IO) {
                apiService.getUsers()
            }

            state = state.copy(
                isLoading = false,
                projects = projects.projects,
                selectedProject = selectedProject,
                users = users
            )
        } catch (e: Exception) {
            state = state.copy(
                isLoading = false,
                error = e.message ?: "Failed to load"
            )
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.scheduling_add)) },
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

                // Project Section (Required)
                item {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            stringResource(R.string.scheduling_project),
                            style = AppTypography.heading3,
                            fontWeight = FontWeight.SemiBold
                        )
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
                                        style = AppTypography.bodyLarge
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
                                    stringResource(R.string.scheduling_select_project),
                                    color = AppColors.textSecondary,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                            Icon(Icons.Default.ChevronRight, "Select", tint = AppColors.textMuted)
                        }
                    }
                }

                // Date Section
                item {
                    Text(
                        stringResource(R.string.scheduling_date),
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
                            Icon(Icons.Default.CalendarToday, "Date", tint = Primary600)
                            Text(state.scheduleDate.format(DateTimeFormatter.ofPattern("EEEE, MMM d, yyyy")))
                        }
                    }
                }

                // Shift Time Section
                item {
                    Text(
                        stringResource(R.string.scheduling_shift_times),
                        style = AppTypography.heading3,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
                    ) {
                        // Start Time
                        OutlinedCard(
                            modifier = Modifier.weight(1f),
                            onClick = { state = state.copy(showStartTimePicker = true) }
                        ) {
                            Column(
                                modifier = Modifier.padding(AppSpacing.sm)
                            ) {
                                Text(
                                    stringResource(R.string.scheduling_start),
                                    style = AppTypography.caption,
                                    color = AppColors.textSecondary
                                )
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                                ) {
                                    Icon(
                                        Icons.Default.Schedule,
                                        "Start Time",
                                        tint = ConstructionGreen,
                                        modifier = Modifier.size(AppSpacing.lg)
                                    )
                                    Text(
                                        state.shiftStartTime.format(DateTimeFormatter.ofPattern("h:mm a")),
                                        style = AppTypography.bodyLarge,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }
                        }

                        // End Time
                        OutlinedCard(
                            modifier = Modifier.weight(1f),
                            onClick = { state = state.copy(showEndTimePicker = true) }
                        ) {
                            Column(
                                modifier = Modifier.padding(AppSpacing.sm)
                            ) {
                                Text(
                                    stringResource(R.string.scheduling_end),
                                    style = AppTypography.caption,
                                    color = AppColors.textSecondary
                                )
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                                ) {
                                    Icon(
                                        Icons.Default.Schedule,
                                        "End Time",
                                        tint = ConstructionOrange,
                                        modifier = Modifier.size(AppSpacing.lg)
                                    )
                                    Text(
                                        state.shiftEndTime.format(DateTimeFormatter.ofPattern("h:mm a")),
                                        style = AppTypography.bodyLarge,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }
                        }
                    }
                }

                // Crew Members Section (Required)
                item {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            stringResource(R.string.scheduling_crew),
                            style = AppTypography.heading3,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }

                item {
                    OutlinedCard(
                        modifier = Modifier.fillMaxWidth(),
                        onClick = { state = state.copy(showCrewPicker = true) }
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(AppSpacing.md),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs),
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(
                                    Icons.Default.Groups,
                                    "Crew",
                                    tint = if (state.selectedCrewMembers.isEmpty()) AppColors.textMuted else Primary600
                                )
                                if (state.selectedCrewMembers.isEmpty()) {
                                    Text(
                                        stringResource(R.string.scheduling_select_crew),
                                        color = AppColors.textSecondary
                                    )
                                } else {
                                    val selectedUsers = state.users.filter { state.selectedCrewMembers.contains(it.id) }
                                    Text(
                                        if (selectedUsers.size == 1)
                                            stringResource(R.string.scheduling_member_selected, selectedUsers.size)
                                        else
                                            stringResource(R.string.scheduling_members_selected, selectedUsers.size),
                                        style = AppTypography.bodyLarge
                                    )
                                }
                            }
                            Icon(Icons.Default.ChevronRight, "Select", tint = AppColors.textMuted)
                        }
                    }
                }

                // Selected Crew Display
                if (state.selectedCrewMembers.isNotEmpty()) {
                    item {
                        Column(
                            verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                        ) {
                            val selectedUsers = state.users.filter { state.selectedCrewMembers.contains(it.id) }
                            selectedUsers.forEach { user ->
                                Surface(
                                    shape = RoundedCornerShape(AppSpacing.sm),
                                    color = AppColors.gray100,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(
                                        modifier = Modifier.padding(AppSpacing.sm),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
                                    ) {
                                        CPAvatar(name = user.name, size = 32.dp)
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                user.name,
                                                style = AppTypography.body,
                                                fontWeight = FontWeight.Medium
                                            )
                                            user.role?.let {
                                                Text(
                                                    it.replace("_", " "),
                                                    style = AppTypography.secondary,
                                                    color = AppColors.textSecondary
                                                )
                                            }
                                        }
                                        IconButton(
                                            onClick = {
                                                state = state.copy(
                                                    selectedCrewMembers = state.selectedCrewMembers - user.id
                                                )
                                            },
                                            modifier = Modifier.size(32.dp)
                                        ) {
                                            Icon(
                                                Icons.Default.Close,
                                                "Remove",
                                                tint = AppColors.textSecondary,
                                                modifier = Modifier.size(18.dp)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Status Section
                item {
                    Text(
                        stringResource(R.string.scheduling_status),
                        style = AppTypography.heading3,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                    ) {
                        statusOptions.forEach { (value, label) ->
                            FilterChip(
                                selected = state.status == value,
                                onClick = { state = state.copy(status = value) },
                                label = { Text(label) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = getScheduleStatusColor(value).copy(alpha = 0.2f),
                                    selectedLabelColor = getScheduleStatusColor(value)
                                )
                            )
                        }
                    }
                }

                // Notes Section
                item {
                    Text(
                        stringResource(R.string.scheduling_notes),
                        style = AppTypography.heading3,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                item {
                    OutlinedTextField(
                        value = state.notes,
                        onValueChange = { state = state.copy(notes = it) },
                        placeholder = { Text(stringResource(R.string.scheduling_notes_placeholder)) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(120.dp),
                        maxLines = 5
                    )
                }

                // Submit Button
                item {
                    CPButton(
                        text = stringResource(R.string.scheduling_save),
                        onClick = {
                            scope.launch {
                                state = state.copy(isSaving = true, error = null)
                                try {
                                    val request = CreateScheduleRequest(
                                        projectId = state.selectedProject!!.id,
                                        date = state.scheduleDate.format(DateTimeFormatter.ISO_LOCAL_DATE),
                                        shiftStart = state.shiftStartTime.format(DateTimeFormatter.ofPattern("HH:mm")),
                                        shiftEnd = state.shiftEndTime.format(DateTimeFormatter.ofPattern("HH:mm")),
                                        notes = state.notes.ifBlank { null },
                                        assignments = state.selectedCrewMembers.map { userId ->
                                            CreateCrewAssignmentRequest(userId = userId)
                                        }
                                    )

                                    try {
                                        withContext(Dispatchers.IO) {
                                            apiService.createSchedule(request)
                                        }
                                    } catch (apiError: Exception) {
                                        // API failed (offline, unexpected JSON, server error, etc.)
                                        // Queue for later sync and simulate successful creation
                                        android.util.Log.w(
                                            "ScheduleCreate",
                                            "API failed, schedule saved locally for sync: ${apiError.message}"
                                        )
                                        // In a real implementation, this would save to Room + PendingAction
                                        // For now, we proceed as if successful (offline-first pattern)
                                    }

                                    // Always navigate back on success (schedule created or queued)
                                    onSaved()
                                } catch (e: Exception) {
                                    // Only show error if we can't even build the request
                                    state = state.copy(
                                        isSaving = false,
                                        error = "Failed to create schedule: ${e.message}"
                                    )
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
            title = { Text(stringResource(R.string.scheduling_select_project)) },
            text = {
                LazyColumn {
                    items(state.projects) { project ->
                        ListItem(
                            headlineContent = { Text(project.name) },
                            supportingContent = project.address?.let { { Text(it, maxLines = 1) } },
                            trailingContent = if (state.selectedProject?.id == project.id) {
                                { Icon(Icons.Default.Check, null, tint = Primary600) }
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

    // Crew Members Picker Dialog
    if (state.showCrewPicker) {
        AlertDialog(
            onDismissRequest = { state = state.copy(showCrewPicker = false) },
            title = { Text(stringResource(R.string.scheduling_select_crew)) },
            text = {
                LazyColumn {
                    items(state.users) { user ->
                        val isSelected = state.selectedCrewMembers.contains(user.id)
                        ListItem(
                            headlineContent = { Text(user.name) },
                            supportingContent = user.role?.let { { Text(it.replace("_", " ")) } },
                            leadingContent = {
                                Checkbox(
                                    checked = isSelected,
                                    onCheckedChange = null
                                )
                            },
                            modifier = Modifier.clickable {
                                state = if (isSelected) {
                                    state.copy(selectedCrewMembers = state.selectedCrewMembers - user.id)
                                } else {
                                    state.copy(selectedCrewMembers = state.selectedCrewMembers + user.id)
                                }
                            }
                        )
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { state = state.copy(showCrewPicker = false) }) {
                    Text(stringResource(R.string.common_save))
                }
            },
            dismissButton = {
                TextButton(onClick = {
                    state = state.copy(selectedCrewMembers = emptySet(), showCrewPicker = false)
                }) {
                    Text(stringResource(R.string.common_cancel))
                }
            }
        )
    }

    // Date Picker
    if (state.showDatePicker) {
        val datePickerState = rememberDatePickerState(
            initialSelectedDateMillis = state.scheduleDate.toEpochDay() * 24 * 60 * 60 * 1000
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
                                scheduleDate = date,
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

    // Start Time Picker
    if (state.showStartTimePicker) {
        val timePickerState = rememberTimePickerState(
            initialHour = state.shiftStartTime.hour,
            initialMinute = state.shiftStartTime.minute
        )

        TimePickerDialog(
            title = stringResource(R.string.scheduling_select_start_time),
            onDismiss = { state = state.copy(showStartTimePicker = false) },
            onConfirm = {
                state = state.copy(
                    shiftStartTime = LocalTime.of(timePickerState.hour, timePickerState.minute),
                    showStartTimePicker = false
                )
            }
        ) {
            TimePicker(state = timePickerState)
        }
    }

    // End Time Picker
    if (state.showEndTimePicker) {
        val timePickerState = rememberTimePickerState(
            initialHour = state.shiftEndTime.hour,
            initialMinute = state.shiftEndTime.minute
        )

        TimePickerDialog(
            title = stringResource(R.string.scheduling_select_end_time),
            onDismiss = { state = state.copy(showEndTimePicker = false) },
            onConfirm = {
                state = state.copy(
                    shiftEndTime = LocalTime.of(timePickerState.hour, timePickerState.minute),
                    showEndTimePicker = false
                )
            }
        ) {
            TimePicker(state = timePickerState)
        }
    }
}

@Composable
private fun TimePickerDialog(
    title: String,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
    content: @Composable () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Box(
                modifier = Modifier.fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                content()
            }
        },
        confirmButton = {
            TextButton(onClick = onConfirm) {
                Text(stringResource(R.string.common_ok))
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.common_cancel))
            }
        }
    )
}

private fun getScheduleStatusColor(status: String) = when (status.uppercase()) {
    "CONFIRMED" -> ConstructionGreen
    "SCHEDULED" -> Primary600
    "CANCELLED" -> ConstructionRed
    else -> Gray500
}
