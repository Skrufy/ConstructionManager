package com.constructionpro.app.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
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

private data class IncidentCreateState(
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val error: String? = null,

    // Form data
    val title: String = "",
    val description: String = "",
    val incidentDate: LocalDate = LocalDate.now(),
    val incidentType: String = "NEAR_MISS",
    val severity: String = "LOW",
    val location: String = "",

    // Project
    val projects: List<ProjectSummary> = emptyList(),
    val selectedProject: ProjectSummary? = null,
    val showProjectPicker: Boolean = false,

    // Pickers
    val showDatePicker: Boolean = false,
    val showTypePicker: Boolean = false,
    val showSeverityPicker: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun IncidentCreateScreen(
    apiService: ApiService,
    projectId: String? = null,
    onBack: () -> Unit,
    onSaved: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(IncidentCreateState()) }

    val incidentTypes = listOf(
        "NEAR_MISS" to "Near Miss",
        "INJURY" to "Injury",
        "PROPERTY_DAMAGE" to "Property Damage",
        "ENVIRONMENTAL" to "Environmental",
        "EQUIPMENT_FAILURE" to "Equipment Failure",
        "OTHER" to "Other"
    )

    val severityLevels = listOf(
        "LOW" to "Low",
        "MEDIUM" to "Medium",
        "HIGH" to "High",
        "CRITICAL" to "Critical"
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
                error = "Failed to load data: ${e.message}"
            )
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.incidents_add)) },
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
                            stringResource(R.string.incidents_title_label),
                            style = AppTypography.heading3,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(Modifier.width(AppSpacing.xs))
                        Text(stringResource(R.string.incidents_required), style = AppTypography.caption, color = ConstructionRed)
                    }
                }

                item {
                    OutlinedTextField(
                        value = state.title,
                        onValueChange = { state = state.copy(title = it) },
                        placeholder = { Text(stringResource(R.string.incidents_title_placeholder)) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                }

                // Project Section (Required)
                item {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            stringResource(R.string.incidents_project),
                            style = AppTypography.heading3,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(Modifier.width(AppSpacing.xs))
                        Text(stringResource(R.string.incidents_required), style = AppTypography.caption, color = ConstructionRed)
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
                                    stringResource(R.string.incidents_select_project),
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
                        stringResource(R.string.incidents_date),
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
                            Text(state.incidentDate.format(DateTimeFormatter.ofPattern("MMM d, yyyy")))
                        }
                    }
                }

                // Type Section
                item {
                    Text(
                        stringResource(R.string.incidents_type),
                        style = AppTypography.heading3,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                item {
                    OutlinedCard(
                        modifier = Modifier.fillMaxWidth(),
                        onClick = { state = state.copy(showTypePicker = true) }
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(AppSpacing.md),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                incidentTypes.find { it.first == state.incidentType }?.second ?: state.incidentType,
                                style = AppTypography.body
                            )
                            Icon(Icons.Default.ChevronRight, "Select", tint = AppColors.textMuted)
                        }
                    }
                }

                // Severity Section
                item {
                    Text(
                        stringResource(R.string.incidents_severity),
                        style = AppTypography.heading3,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                    ) {
                        severityLevels.forEach { (value, label) ->
                            FilterChip(
                                selected = state.severity == value,
                                onClick = { state = state.copy(severity = value) },
                                label = { Text(label) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = getSeverityColor(value).copy(alpha = 0.2f),
                                    selectedLabelColor = getSeverityColor(value)
                                )
                            )
                        }
                    }
                }

                // Location Section
                item {
                    Text(
                        stringResource(R.string.incidents_location),
                        style = AppTypography.heading3,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                item {
                    OutlinedTextField(
                        value = state.location,
                        onValueChange = { state = state.copy(location = it) },
                        placeholder = { Text(stringResource(R.string.incidents_location_placeholder)) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                }

                // Description Section
                item {
                    Text(
                        stringResource(R.string.incidents_description),
                        style = AppTypography.heading3,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                item {
                    OutlinedTextField(
                        value = state.description,
                        onValueChange = { state = state.copy(description = it) },
                        placeholder = { Text(stringResource(R.string.incidents_description_placeholder)) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(120.dp),
                        maxLines = 5
                    )
                }

                // Submit Button
                item {
                    CPButton(
                        text = stringResource(R.string.incidents_save),
                        onClick = {
                            scope.launch {
                                state = state.copy(isSaving = true, error = null)
                                try {
                                    val request = CreateIncidentRequest(
                                        projectId = state.selectedProject!!.id,
                                        type = state.incidentType,
                                        severity = state.severity,
                                        title = state.title,
                                        description = state.description.ifBlank { state.title },
                                        location = state.location.ifBlank { null },
                                        incidentDate = state.incidentDate.toString()
                                    )
                                    withContext(Dispatchers.IO) {
                                        apiService.createIncident(request)
                                    }
                                    onSaved()
                                } catch (e: Exception) {
                                    state = state.copy(isSaving = false, error = "Failed to report incident: ${e.message}")
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
            title = { Text(stringResource(R.string.incidents_select_project_title)) },
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

    // Type Picker Dialog
    if (state.showTypePicker) {
        AlertDialog(
            onDismissRequest = { state = state.copy(showTypePicker = false) },
            title = { Text(stringResource(R.string.incidents_select_type)) },
            text = {
                Column {
                    incidentTypes.forEach { (value, label) ->
                        ListItem(
                            headlineContent = { Text(label) },
                            trailingContent = if (state.incidentType == value) {
                                { Icon(Icons.Default.Check, null, tint = AppColors.primary600) }
                            } else null,
                            modifier = Modifier.clickable {
                                state = state.copy(incidentType = value, showTypePicker = false)
                            }
                        )
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { state = state.copy(showTypePicker = false) }) {
                    Text(stringResource(R.string.common_cancel))
                }
            }
        )
    }

    // Date Picker
    if (state.showDatePicker) {
        val datePickerState = rememberDatePickerState(
            initialSelectedDateMillis = state.incidentDate.toEpochDay() * 24 * 60 * 60 * 1000
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
                                incidentDate = date,
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

private fun getSeverityColor(severity: String) = when (severity) {
    "CRITICAL" -> ConstructionRed
    "HIGH" -> ConstructionOrange
    "MEDIUM" -> AppColors.warning
    "LOW" -> ConstructionGreen
    else -> AppColors.gray500
}

