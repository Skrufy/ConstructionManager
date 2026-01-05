package com.constructionpro.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import androidx.compose.ui.graphics.Color
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

private data class WarningFormState(
    val employeeId: String = "",
    val employeeName: String = "",
    val projectId: String? = null,
    val projectName: String? = null,
    val warningType: String = WarningTypes.TARDINESS,
    val severity: String = WarningSeverity.VERBAL,
    val description: String = "",
    val incidentDate: String = LocalDate.now().toString(),
    val witnessNames: String = "",
    val actionRequired: String = "",
    val saving: Boolean = false,
    val error: String? = null,
    val showEmployeeSearch: Boolean = false,
    val showProjectSearch: Boolean = false,
    val showDatePicker: Boolean = false,
    val employees: List<Employee> = emptyList(),
    val employeesLoading: Boolean = false,
    val projects: List<ProjectSummary> = emptyList(),
    val projectsLoading: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WarningCreateScreen(
    apiService: ApiService,
    onBack: () -> Unit,
    onCreated: (String) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(WarningFormState()) }
    val configuration = LocalConfiguration.current
    val isNarrow = configuration.screenWidthDp < 360

    val selectEmployeeError = stringResource(R.string.warnings_select_employee)
    val descriptionError = stringResource(R.string.warnings_description)

    fun createWarning() {
        if (state.employeeId.isBlank()) {
            state = state.copy(error = selectEmployeeError)
            return
        }
        if (state.description.isBlank()) {
            state = state.copy(error = descriptionError)
            return
        }

        scope.launch {
            state = state.copy(saving = true, error = null)
            try {
                val request = WarningCreateRequest(
                    employeeId = state.employeeId,
                    projectId = state.projectId,
                    warningType = state.warningType,
                    severity = state.severity,
                    description = state.description,
                    incidentDate = state.incidentDate,
                    witnessNames = state.witnessNames.ifBlank { null },
                    actionRequired = state.actionRequired.ifBlank { null }
                )
                val response = withContext(Dispatchers.IO) {
                    apiService.createWarning(request)
                }
                onCreated(response.warning.id)
            } catch (e: Exception) {
                state = state.copy(
                    saving = false,
                    error = e.message ?: "Failed to create warning"
                )
            }
        }
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.warnings_add),
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
                .verticalScroll(rememberScrollState())
                .padding(AppSpacing.md),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
        ) {
            // Error Banner
            state.error?.let { error ->
                CPErrorBanner(
                    message = error,
                    onDismiss = { state = state.copy(error = null) }
                )
            }

            // Employee Selection
            CPCard {
                Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                    Text(
                        text = stringResource(R.string.warnings_employee) + " *",
                        style = AppTypography.heading3,
                        fontWeight = FontWeight.SemiBold
                    )

                    OutlinedButton(
                        onClick = { state = state.copy(showEmployeeSearch = true) },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(
                            imageVector = if (state.employeeId.isBlank()) Icons.Default.PersonAdd else Icons.Default.Person,
                            contentDescription = null
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.xs))
                        Text(
                            text = state.employeeName.ifBlank { stringResource(R.string.warnings_select_employee) }
                        )
                    }
                }
            }

            // Warning Type & Severity
            CPCard {
                Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.md)) {
                    // Warning Type
                    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)) {
                        Text(
                            text = stringResource(R.string.warnings_type) + " *",
                            style = AppTypography.heading3,
                            fontWeight = FontWeight.SemiBold
                        )

                        if (isNarrow) {
                            val chunks = WarningTypes.all.chunked(2)
                            Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)) {
                                for (chunk in chunks) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                                    ) {
                                        for (type in chunk) {
                                            FilterChip(
                                                selected = state.warningType == type,
                                                onClick = { state = state.copy(warningType = type) },
                                                label = { Text(WarningTypes.displayName(type), maxLines = 1) },
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
                            val chunks = WarningTypes.all.chunked(3)
                            Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)) {
                                for (chunk in chunks) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                                    ) {
                                        for (type in chunk) {
                                            FilterChip(
                                                selected = state.warningType == type,
                                                onClick = { state = state.copy(warningType = type) },
                                                label = { Text(WarningTypes.displayName(type)) },
                                                modifier = Modifier.weight(1f)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    HorizontalDivider()

                    // Severity
                    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)) {
                        Text(
                            text = stringResource(R.string.warnings_severity_required),
                            style = AppTypography.heading3,
                            fontWeight = FontWeight.SemiBold
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                        ) {
                            SeverityChip(
                                severity = WarningSeverity.VERBAL,
                                selected = state.severity == WarningSeverity.VERBAL,
                                onClick = { state = state.copy(severity = WarningSeverity.VERBAL) },
                                modifier = Modifier.weight(1f)
                            )
                            SeverityChip(
                                severity = WarningSeverity.WRITTEN,
                                selected = state.severity == WarningSeverity.WRITTEN,
                                onClick = { state = state.copy(severity = WarningSeverity.WRITTEN) },
                                modifier = Modifier.weight(1f)
                            )
                            SeverityChip(
                                severity = WarningSeverity.FINAL,
                                selected = state.severity == WarningSeverity.FINAL,
                                onClick = { state = state.copy(severity = WarningSeverity.FINAL) },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }

            // Incident Details
            CPCard {
                Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.md)) {
                    Text(
                        text = stringResource(R.string.warnings_details),
                        style = AppTypography.heading3,
                        fontWeight = FontWeight.SemiBold
                    )

                    // Date
                    OutlinedButton(
                        onClick = { state = state.copy(showDatePicker = true) },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.CalendarToday, contentDescription = null)
                        Spacer(modifier = Modifier.width(AppSpacing.xs))
                        Text(formatDisplayDate(state.incidentDate))
                    }

                    // Project (optional)
                    OutlinedButton(
                        onClick = { state = state.copy(showProjectSearch = true) },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Business, contentDescription = null)
                        Spacer(modifier = Modifier.width(AppSpacing.xs))
                        Text(state.projectName ?: stringResource(R.string.warnings_select_project_optional))
                    }

                    // Description
                    OutlinedTextField(
                        value = state.description,
                        onValueChange = { state = state.copy(description = it) },
                        label = { Text(stringResource(R.string.warnings_description) + " *") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 4,
                        maxLines = 8
                    )

                    // Witnesses
                    OutlinedTextField(
                        value = state.witnessNames,
                        onValueChange = { state = state.copy(witnessNames = it) },
                        label = { Text(stringResource(R.string.warnings_witnesses_label)) },
                        placeholder = { Text(stringResource(R.string.warnings_witnesses_placeholder)) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )

                    // Action Required
                    OutlinedTextField(
                        value = state.actionRequired,
                        onValueChange = { state = state.copy(actionRequired = it) },
                        label = { Text(stringResource(R.string.warnings_action_required)) },
                        placeholder = { Text(stringResource(R.string.warnings_action_placeholder)) },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2,
                        maxLines = 4
                    )
                }
            }

            // Submit Button
            Button(
                onClick = { createWarning() },
                enabled = !state.saving && state.employeeId.isNotBlank() && state.description.isNotBlank(),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(AppSpacing.buttonHeightLarge),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Primary600
                )
            ) {
                if (state.saving) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(AppSpacing.iconLarge),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                    Spacer(modifier = Modifier.width(AppSpacing.xs))
                    Text(stringResource(R.string.warnings_save))
                } else {
                    Icon(Icons.Default.Warning, contentDescription = null)
                    Spacer(modifier = Modifier.width(AppSpacing.xs))
                    Text(stringResource(R.string.warnings_add))
                }
            }

            // Bottom spacing
            Spacer(modifier = Modifier.height(AppSpacing.xxl))
        }
    }

    // Employee Search Dialog
    if (state.showEmployeeSearch) {
        // Load employees when dialog opens
        LaunchedEffect(state.showEmployeeSearch) {
            if (state.employees.isEmpty() && !state.employeesLoading) {
                state = state.copy(employeesLoading = true)
                try {
                    val employees = withContext(Dispatchers.IO) {
                        apiService.getEmployees()
                    }
                    state = state.copy(employees = employees, employeesLoading = false)
                } catch (e: Exception) {
                    state = state.copy(
                        employeesLoading = false,
                        error = e.message ?: "Failed to load employees"
                    )
                }
            }
        }

        EmployeeSearchDialog(
            employees = state.employees,
            loading = state.employeesLoading,
            onDismiss = { state = state.copy(showEmployeeSearch = false) },
            onSelect = { employee ->
                state = state.copy(
                    employeeId = employee.id,
                    employeeName = employee.name,
                    showEmployeeSearch = false
                )
            },
            onSearch = { query ->
                scope.launch {
                    state = state.copy(employeesLoading = true)
                    try {
                        val employees = withContext(Dispatchers.IO) {
                            apiService.getEmployees(search = query.ifBlank { null })
                        }
                        state = state.copy(employees = employees, employeesLoading = false)
                    } catch (e: Exception) {
                        state = state.copy(
                            employeesLoading = false,
                            error = e.message ?: "Failed to search employees"
                        )
                    }
                }
            }
        )
    }

    // Project Search Dialog
    if (state.showProjectSearch) {
        // Load projects when dialog opens
        LaunchedEffect(state.showProjectSearch) {
            if (state.projects.isEmpty() && !state.projectsLoading) {
                state = state.copy(projectsLoading = true)
                try {
                    val response = withContext(Dispatchers.IO) {
                        apiService.getProjects()
                    }
                    state = state.copy(
                        projects = response.projects,
                        projectsLoading = false
                    )
                } catch (e: Exception) {
                    state = state.copy(
                        projectsLoading = false,
                        error = e.message ?: "Failed to load projects"
                    )
                }
            }
        }

        ProjectSearchDialog(
            projects = state.projects,
            loading = state.projectsLoading,
            onDismiss = { state = state.copy(showProjectSearch = false) },
            onSelect = { project ->
                state = state.copy(
                    projectId = project.id,
                    projectName = project.name,
                    showProjectSearch = false
                )
            },
            onClear = {
                state = state.copy(
                    projectId = null,
                    projectName = null,
                    showProjectSearch = false
                )
            },
            onSearch = { query ->
                scope.launch {
                    state = state.copy(projectsLoading = true)
                    try {
                        val response = withContext(Dispatchers.IO) {
                            apiService.getProjects(search = query.ifBlank { null })
                        }
                        state = state.copy(
                            projects = response.projects,
                            projectsLoading = false
                        )
                    } catch (e: Exception) {
                        state = state.copy(
                            projectsLoading = false,
                            error = e.message ?: "Failed to search projects"
                        )
                    }
                }
            }
        )
    }

    // Date Picker
    if (state.showDatePicker) {
        val datePickerState = rememberDatePickerState(
            initialSelectedDateMillis = try {
                LocalDate.parse(state.incidentDate).toEpochDay() * 24 * 60 * 60 * 1000
            } catch (e: Exception) {
                System.currentTimeMillis()
            }
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
                                incidentDate = date.toString(),
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

@Composable
private fun SeverityChip(
    severity: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val (color, backgroundColor) = when (severity) {
        WarningSeverity.VERBAL -> Pair(Primary600, Primary100)
        WarningSeverity.WRITTEN -> Pair(Warning600, Warning100)
        WarningSeverity.FINAL -> Pair(Error600, Error100)
        else -> Pair(Primary600, Primary100)
    }

    FilterChip(
        selected = selected,
        onClick = onClick,
        label = { Text(WarningSeverity.displayName(severity)) },
        leadingIcon = {
            Icon(
                imageVector = when (severity) {
                    WarningSeverity.VERBAL -> Icons.Default.RecordVoiceOver
                    WarningSeverity.WRITTEN -> Icons.Default.Description
                    WarningSeverity.FINAL -> Icons.Default.Gavel
                    else -> Icons.Default.Warning
                },
                contentDescription = null,
                modifier = Modifier.size(AppSpacing.iconMedium - 2.dp)
            )
        },
        colors = FilterChipDefaults.filterChipColors(
            selectedContainerColor = backgroundColor,
            selectedLabelColor = color,
            selectedLeadingIconColor = color
        ),
        modifier = modifier
    )
}

private fun formatDisplayDate(dateString: String): String {
    return try {
        val date = LocalDate.parse(dateString)
        date.format(DateTimeFormatter.ofPattern("MMMM d, yyyy"))
    } catch (e: Exception) {
        dateString
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EmployeeSearchDialog(
    employees: List<Employee>,
    loading: Boolean,
    onDismiss: () -> Unit,
    onSelect: (Employee) -> Unit,
    onSearch: (String) -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(max = 500.dp),
        title = {
            Text(
                text = stringResource(R.string.warnings_select_employee),
                style = AppTypography.heading2
            )
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
            ) {
                // Search field
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = {
                        searchQuery = it
                        onSearch(it)
                    },
                    placeholder = { Text(stringResource(R.string.warnings_search_employee)) },
                    leadingIcon = {
                        Icon(Icons.Default.Search, contentDescription = stringResource(R.string.common_search))
                    },
                    trailingIcon = {
                        if (searchQuery.isNotBlank()) {
                            IconButton(onClick = {
                                searchQuery = ""
                                onSearch("")
                            }) {
                                Icon(Icons.Default.Clear, contentDescription = stringResource(R.string.common_clear))
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                // Loading or employee list
                if (loading) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(200.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                } else if (employees.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(200.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                imageVector = Icons.Default.PersonOff,
                                contentDescription = null,
                                modifier = Modifier.size(AppSpacing.iconCircleMedium),
                                tint = AppColors.textMuted
                            )
                            Spacer(modifier = Modifier.height(AppSpacing.xs))
                            Text(
                                text = stringResource(R.string.warnings_no_employees_found),
                                style = AppTypography.body,
                                color = AppColors.textSecondary
                            )
                        }
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 300.dp),
                        verticalArrangement = Arrangement.spacedBy(AppSpacing.xxs)
                    ) {
                        items(employees) { employee ->
                            EmployeeListItem(
                                employee = employee,
                                onClick = { onSelect(employee) }
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.common_cancel))
            }
        }
    )
}

@Composable
private fun EmployeeListItem(
    employee: Employee,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(AppSpacing.xs))
            .clickable(onClick = onClick),
        color = AppColors.gray100.copy(alpha = 0.5f),
        shape = RoundedCornerShape(AppSpacing.xs)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(AppSpacing.sm),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            // Avatar with initials
            Box(
                modifier = Modifier
                    .size(AppSpacing.iconCircleSmall)
                    .clip(CircleShape)
                    .background(AppColors.primary600),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = employee.initials,
                    style = AppTypography.bodySemibold,
                    color = Color.White
                )
            }

            // Employee info
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = employee.name,
                    style = AppTypography.bodySemibold,
                    fontWeight = FontWeight.Medium,
                    color = AppColors.textPrimary
                )
                Row(
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                ) {
                    employee.jobTitle?.let { title ->
                        Text(
                            text = title,
                            style = AppTypography.secondary,
                            color = AppColors.textSecondary
                        )
                    }
                    employee.company?.let { company ->
                        Text(
                            text = company,
                            style = AppTypography.secondary,
                            color = AppColors.textMuted
                        )
                    }
                }
            }

            // Selection indicator
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = "Select",
                tint = AppColors.textMuted
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProjectSearchDialog(
    projects: List<ProjectSummary>,
    loading: Boolean,
    onDismiss: () -> Unit,
    onSelect: (ProjectSummary) -> Unit,
    onClear: () -> Unit,
    onSearch: (String) -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(max = 500.dp),
        title = {
            Text(
                text = stringResource(R.string.warnings_select_project_title),
                style = AppTypography.heading2
            )
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
            ) {
                // Search field
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = {
                        searchQuery = it
                        onSearch(it)
                    },
                    placeholder = { Text(stringResource(R.string.warnings_search_projects)) },
                    leadingIcon = {
                        Icon(Icons.Default.Search, contentDescription = stringResource(R.string.common_search))
                    },
                    trailingIcon = {
                        if (searchQuery.isNotBlank()) {
                            IconButton(onClick = {
                                searchQuery = ""
                                onSearch("")
                            }) {
                                Icon(Icons.Default.Clear, contentDescription = stringResource(R.string.common_clear))
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                // Clear selection button
                OutlinedButton(
                    onClick = onClear,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Clear, contentDescription = null)
                    Spacer(modifier = Modifier.width(AppSpacing.xs))
                    Text(stringResource(R.string.warnings_no_project_selected))
                }

                // Loading or project list
                if (loading) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(200.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                } else if (projects.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(150.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                imageVector = Icons.Default.Business,
                                contentDescription = null,
                                modifier = Modifier.size(AppSpacing.iconCircleMedium),
                                tint = AppColors.textMuted
                            )
                            Spacer(modifier = Modifier.height(AppSpacing.xs))
                            Text(
                                text = stringResource(R.string.warnings_no_projects_found),
                                style = AppTypography.body,
                                color = AppColors.textSecondary
                            )
                        }
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 250.dp),
                        verticalArrangement = Arrangement.spacedBy(AppSpacing.xxs)
                    ) {
                        items(projects) { project ->
                            ProjectListItem(
                                project = project,
                                onClick = { onSelect(project) }
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.common_cancel))
            }
        }
    )
}

@Composable
private fun ProjectListItem(
    project: ProjectSummary,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(AppSpacing.xs))
            .clickable(onClick = onClick),
        color = AppColors.gray100.copy(alpha = 0.5f),
        shape = RoundedCornerShape(AppSpacing.xs)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(AppSpacing.sm),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            // Project icon
            Box(
                modifier = Modifier
                    .size(AppSpacing.iconCircleSmall)
                    .clip(RoundedCornerShape(AppSpacing.xs))
                    .background(AppColors.primary100),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Business,
                    contentDescription = null,
                    tint = AppColors.primary600
                )
            }

            // Project info
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = project.name,
                    style = AppTypography.bodySemibold,
                    fontWeight = FontWeight.Medium,
                    color = AppColors.textPrimary
                )
                val unknownStatusText = stringResource(R.string.warnings_unknown_status)
                Text(
                    text = project.status?.replace("_", " ") ?: unknownStatusText,
                    style = AppTypography.secondary,
                    color = AppColors.textSecondary
                )
            }

            // Selection indicator
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = "Select",
                tint = AppColors.textMuted
            )
        }
    }
}
