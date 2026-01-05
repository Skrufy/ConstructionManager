package com.constructionpro.app.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.constructionpro.app.R
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.DeviceLocationProvider
import com.constructionpro.app.data.model.*
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import com.constructionpro.app.ui.util.responsiveValue
import com.constructionpro.app.ui.util.TimeUtils
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.*

private data class TimeTrackingState(
    val loading: Boolean = false,
    val entries: List<TimeEntry> = emptyList(),
    val activeEntry: TimeEntry? = null,
    val isClocked: Boolean = false,
    val projects: List<ProjectSummary> = emptyList(),
    val error: String? = null,
    val successMessage: String? = null,
    val clockingIn: Boolean = false,
    val clockingOut: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TimeTrackingScreen(
    apiService: ApiService,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(TimeTrackingState(loading = true)) }
    var showClockInDialog by remember { mutableStateOf(false) }
    var showClockOutDialog by remember { mutableStateOf(false) }
    var selectedProjectId by remember { mutableStateOf<String?>(null) }
    var clockInNotes by remember { mutableStateOf("") }
    var clockOutNotes by remember { mutableStateOf("") }
    var breakMinutes by remember { mutableStateOf("0") }
    var currentLocation by remember { mutableStateOf<Pair<Double, Double>?>(null) }

    val locationProvider = remember { DeviceLocationProvider(context) }

    // Location permission
    val locationPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        if (permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true) {
            scope.launch {
                val location = locationProvider.getCurrentLocation()
                currentLocation = location?.let { Pair(it.latitude, it.longitude) }
            }
        }
    }

    fun requestLocation() {
        val hasFineLocation = ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        val hasCoarseLocation = ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        if (hasFineLocation || hasCoarseLocation) {
            scope.launch {
                val location = locationProvider.getCurrentLocation()
                currentLocation = location?.let { Pair(it.latitude, it.longitude) }
            }
        } else {
            locationPermissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        }
    }

    val loadFailedMsg = stringResource(R.string.time_tracking_load_failed)
    fun loadData() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val entriesResponse = withContext(Dispatchers.IO) {
                    apiService.getTimeEntries(pageSize = 50)
                }
                val activeResponse = withContext(Dispatchers.IO) {
                    try { apiService.getActiveTimeEntry() } catch (_: Exception) { null }
                }
                val projectsResponse = withContext(Dispatchers.IO) {
                    apiService.getProjects(status = "ACTIVE", pageSize = 100)
                }

                state = state.copy(
                    loading = false,
                    entries = entriesResponse.timeEntries,
                    activeEntry = activeResponse?.active,
                    isClocked = activeResponse?.isClockedIn ?: false,
                    projects = projectsResponse.projects.map {
                        ProjectSummary(id = it.id, name = it.name, address = it.address)
                    }
                )
            } catch (error: Exception) {
                state = state.copy(
                    loading = false,
                    error = error.message ?: loadFailedMsg
                )
            }
        }
    }

    val selectProjectErrorMsg = stringResource(R.string.time_tracking_select_project_error)
    val clockInSuccessMsg = stringResource(R.string.time_tracking_clock_in_success)
    val clockInFailedMsg = stringResource(R.string.time_tracking_clock_in_failed)
    fun clockIn() {
        if (selectedProjectId == null) {
            state = state.copy(error = selectProjectErrorMsg)
            return
        }
        scope.launch {
            state = state.copy(clockingIn = true, error = null)
            try {
                val request = ClockInRequest(
                    projectId = selectedProjectId!!,
                    gpsInLat = currentLocation?.first,
                    gpsInLng = currentLocation?.second,
                    notes = clockInNotes.takeIf { it.isNotBlank() }
                )
                val response = withContext(Dispatchers.IO) {
                    apiService.clockIn(request)
                }
                state = state.copy(
                    clockingIn = false,
                    activeEntry = response.entry,
                    isClocked = true,
                    successMessage = clockInSuccessMsg
                )
                showClockInDialog = false
                clockInNotes = ""
                selectedProjectId = null
                loadData()
            } catch (error: Exception) {
                state = state.copy(
                    clockingIn = false,
                    error = error.message ?: clockInFailedMsg
                )
            }
        }
    }

    val clockOutSuccessMsg = stringResource(R.string.time_tracking_clock_out_success)
    val clockOutFailedMsg = stringResource(R.string.time_tracking_clock_out_failed)
    fun clockOut() {
        val activeId = state.activeEntry?.id ?: return
        scope.launch {
            state = state.copy(clockingOut = true, error = null)
            try {
                val request = ClockOutRequest(
                    breakMinutes = breakMinutes.toIntOrNull() ?: 0,
                    notes = clockOutNotes.takeIf { it.isNotBlank() },
                    gpsOutLat = currentLocation?.first,
                    gpsOutLng = currentLocation?.second
                )
                withContext(Dispatchers.IO) {
                    apiService.clockOut(activeId, request)
                }
                state = state.copy(
                    clockingOut = false,
                    activeEntry = null,
                    isClocked = false,
                    successMessage = clockOutSuccessMsg
                )
                showClockOutDialog = false
                clockOutNotes = ""
                breakMinutes = "0"
                loadData()
            } catch (error: Exception) {
                state = state.copy(
                    clockingOut = false,
                    error = error.message ?: clockOutFailedMsg
                )
            }
        }
    }

    LaunchedEffect(Unit) {
        loadData()
        requestLocation()
    }

    // Clock In Dialog
    if (showClockInDialog) {
        AlertDialog(
            onDismissRequest = { showClockInDialog = false },
            title = {
                Text(
                    stringResource(R.string.time_tracking_clock_in),
                    style = AppTypography.heading2,
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.md)) {
                    // Project Selector
                    var expanded by remember { mutableStateOf(false) }
                    ExposedDropdownMenuBox(
                        expanded = expanded,
                        onExpandedChange = { expanded = it }
                    ) {
                        OutlinedTextField(
                            value = state.projects.find { it.id == selectedProjectId }?.name ?: "",
                            onValueChange = {},
                            readOnly = true,
                            label = { Text(stringResource(R.string.time_tracking_select_project)) },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor(),
                            shape = RoundedCornerShape(12.dp)
                        )
                        ExposedDropdownMenu(
                            expanded = expanded,
                            onDismissRequest = { expanded = false }
                        ) {
                            state.projects.forEach { project ->
                                DropdownMenuItem(
                                    text = { Text(project.name) },
                                    onClick = {
                                        selectedProjectId = project.id
                                        expanded = false
                                    }
                                )
                            }
                        }
                    }

                    // Notes
                    CPTextField(
                        value = clockInNotes,
                        onValueChange = { clockInNotes = it },
                        label = stringResource(R.string.time_tracking_notes_optional),
                        placeholder = stringResource(R.string.time_tracking_notes_placeholder),
                        leadingIcon = Icons.Default.Notes
                    )

                    // Location indicator
                    if (currentLocation != null) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(ConstructionGreen.copy(alpha = 0.1f), RoundedCornerShape(AppSpacing.xs))
                                .padding(AppSpacing.sm)
                        ) {
                            Icon(
                                imageVector = Icons.Default.LocationOn,
                                contentDescription = null,
                                tint = ConstructionGreen,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(AppSpacing.xs))
                            Text(
                                stringResource(R.string.time_tracking_gps_recorded),
                                style = AppTypography.secondary,
                                color = ConstructionGreen
                            )
                        }
                    }
                }
            },
            confirmButton = {
                CPButton(
                    text = if (state.clockingIn) stringResource(R.string.time_tracking_clocking_in) else stringResource(R.string.time_tracking_clock_in),
                    onClick = { clockIn() },
                    enabled = selectedProjectId != null && !state.clockingIn,
                    icon = Icons.Default.Login
                )
            },
            dismissButton = {
                CPButton(
                    text = stringResource(R.string.common_cancel),
                    onClick = { showClockInDialog = false },
                    style = CPButtonStyle.Outline
                )
            },
            shape = RoundedCornerShape(16.dp)
        )
    }

    // Clock Out Dialog
    if (showClockOutDialog) {
        val unknownProjectText = stringResource(R.string.time_tracking_unknown_project)
        AlertDialog(
            onDismissRequest = { showClockOutDialog = false },
            title = {
                Text(
                    stringResource(R.string.time_tracking_clock_out),
                    style = AppTypography.heading2,
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.md)) {
                    // Active entry info
                    state.activeEntry?.let { entry ->
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(AppSpacing.sm),
                            color = Primary50
                        ) {
                            Column(modifier = Modifier.padding(AppSpacing.sm)) {
                                Text(
                                    text = entry.getProjectDisplay()?.name ?: unknownProjectText,
                                    style = AppTypography.heading3,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Text(
                                    text = stringResource(R.string.time_tracking_clocked_in_at, formatTime(entry.clockIn)),
                                    style = AppTypography.secondary,
                                    color = AppColors.textSecondary
                                )
                            }
                        }
                    }

                    // Break minutes
                    CPTextField(
                        value = breakMinutes,
                        onValueChange = { breakMinutes = it.filter { c -> c.isDigit() } },
                        label = stringResource(R.string.time_tracking_break_minutes),
                        placeholder = "0",
                        leadingIcon = Icons.Default.FreeBreakfast,
                        keyboardType = androidx.compose.ui.text.input.KeyboardType.Number
                    )

                    // Notes
                    CPTextField(
                        value = clockOutNotes,
                        onValueChange = { clockOutNotes = it },
                        label = stringResource(R.string.time_tracking_notes_optional),
                        placeholder = stringResource(R.string.time_tracking_notes_placeholder),
                        leadingIcon = Icons.Default.Notes
                    )
                }
            },
            confirmButton = {
                CPButton(
                    text = if (state.clockingOut) stringResource(R.string.time_tracking_clocking_out) else stringResource(R.string.time_tracking_clock_out),
                    onClick = { clockOut() },
                    enabled = !state.clockingOut,
                    icon = Icons.Default.Logout,
                    style = CPButtonStyle.Destructive
                )
            },
            dismissButton = {
                CPButton(
                    text = stringResource(R.string.common_cancel),
                    onClick = { showClockOutDialog = false },
                    style = CPButtonStyle.Outline
                )
            },
            shape = RoundedCornerShape(16.dp)
        )
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.time_tracking_title),
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = stringResource(R.string.common_back),
                            tint = AppColors.textSecondary
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { loadData() }) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = stringResource(R.string.common_refresh),
                            tint = AppColors.textSecondary
                        )
                    }
                }
            )
        }
    ) { padding ->
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
            // Error Banner
            if (state.error != null) {
                item {
                    CPErrorBanner(
                        message = state.error ?: stringResource(R.string.error_generic),
                        onRetry = { loadData() },
                        onDismiss = { state = state.copy(error = null) }
                    )
                }
            }

            // Success Message
            state.successMessage?.let { message ->
                item {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(AppSpacing.sm),
                        color = ConstructionGreen.copy(alpha = 0.1f)
                    ) {
                        Row(
                            modifier = Modifier.padding(AppSpacing.sm),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = ConstructionGreen
                            )
                            Spacer(modifier = Modifier.width(AppSpacing.xs))
                            Text(
                                text = message,
                                color = ConstructionGreen,
                                modifier = Modifier.weight(1f)
                            )
                            IconButton(
                                onClick = { state = state.copy(successMessage = null) },
                                modifier = Modifier.size(24.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Close,
                                    contentDescription = stringResource(R.string.common_close),
                                    tint = ConstructionGreen,
                                    modifier = Modifier.size(AppSpacing.md)
                                )
                            }
                        }
                    }
                }
            }

            // Clock In/Out Card - Large touch target for field workers
            item {
                ClockInOutCard(
                    isClocked = state.isClocked,
                    activeEntry = state.activeEntry,
                    onClockIn = { showClockInDialog = true },
                    onClockOut = { showClockOutDialog = true }
                )
            }

            // Loading
            if (state.loading && state.entries.isEmpty()) {
                item {
                    CPLoadingIndicator(message = stringResource(R.string.time_tracking_loading))
                }
            }

            // Section Header
            if (state.entries.isNotEmpty()) {
                item {
                    CPSectionHeader(title = stringResource(R.string.time_tracking_recent_entries))
                }
            }

            // Time Entries List
            items(state.entries) { entry ->
                TimeEntryCard(entry = entry)
            }

            // Empty State
            if (!state.loading && state.entries.isEmpty()) {
                item {
                    CPEmptyState(
                        icon = Icons.Default.Schedule,
                        title = stringResource(R.string.time_tracking_empty_title),
                        description = stringResource(R.string.time_tracking_empty_desc)
                    )
                }
            }

            item {
                Spacer(modifier = Modifier.height(AppSpacing.md))
            }
        }
    }
}

@Composable
private fun ClockInOutCard(
    isClocked: Boolean,
    activeEntry: TimeEntry?,
    onClockIn: () -> Unit,
    onClockOut: () -> Unit
) {
    val touchTargetSize = responsiveValue(72.dp, 80.dp, 88.dp)
    val unknownProjectText = stringResource(R.string.time_tracking_unknown_project)

    // Live timer state
    var elapsedTime by remember { mutableStateOf(0L) }

    // Update elapsed time every second when clocked in
    LaunchedEffect(isClocked, activeEntry?.clockIn) {
        if (isClocked && activeEntry?.clockIn != null) {
            while (true) {
                try {
                    val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply {
                        timeZone = java.util.TimeZone.getTimeZone("UTC")
                    }
                    val clockInTime = format.parse(activeEntry.clockIn.take(19))
                    elapsedTime = System.currentTimeMillis() - (clockInTime?.time ?: System.currentTimeMillis())
                    // Ensure we don't show negative time
                    if (elapsedTime < 0) elapsedTime = 0L
                } catch (_: Exception) {
                    elapsedTime = 0L
                }
                kotlinx.coroutines.delay(1000)
            }
        }
    }

    // Format elapsed time as HH:MM:SS
    fun formatElapsedTime(millis: Long): String {
        val seconds = (millis / 1000) % 60
        val minutes = (millis / (1000 * 60)) % 60
        val hours = millis / (1000 * 60 * 60)
        return String.format("%02d:%02d:%02d", hours, minutes, seconds)
    }

    // Pulsing animation for the indicator
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 0.3f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse_alpha"
    )

    CPCard {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            if (isClocked && activeEntry != null) {
                // Clocked In State - Enhanced UI
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    color = ConstructionGreen.copy(alpha = 0.1f)
                ) {
                    Column(
                        modifier = Modifier.padding(AppSpacing.lg),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        // Status Row with pulsing indicator
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(AppSpacing.sm)
                                    .clip(CircleShape)
                                    .background(ConstructionGreen.copy(alpha = pulseAlpha))
                            )
                            Spacer(modifier = Modifier.width(AppSpacing.xs))
                            Text(
                                text = stringResource(R.string.time_tracking_clocked_in),
                                style = AppTypography.label,
                                fontWeight = FontWeight.Bold,
                                color = ConstructionGreen,
                                letterSpacing = 1.sp
                            )
                        }

                        Spacer(modifier = Modifier.height(AppSpacing.md))

                        // Large Timer Display
                        Text(
                            text = formatElapsedTime(elapsedTime),
                            style = AppTypography.heading1,
                            fontWeight = FontWeight.Bold,
                            color = AppColors.textPrimary,
                            fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                        )

                        Spacer(modifier = Modifier.height(AppSpacing.sm))

                        // Project name
                        Text(
                            text = activeEntry.getProjectDisplay()?.name ?: unknownProjectText,
                            style = AppTypography.heading3,
                            fontWeight = FontWeight.SemiBold,
                            color = AppColors.textPrimary,
                            textAlign = TextAlign.Center
                        )

                        // Clock in time
                        Text(
                            text = stringResource(R.string.time_tracking_started_at, formatTime(activeEntry.clockIn)),
                            style = AppTypography.body,
                            color = AppColors.textSecondary
                        )
                    }
                }

                Spacer(modifier = Modifier.height(AppSpacing.md))

                // Large Clock Out Button
                Button(
                    onClick = onClockOut,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(touchTargetSize),
                    shape = RoundedCornerShape(AppSpacing.md),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = ConstructionRed,
                        contentColor = Color.White
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.Logout,
                        contentDescription = null,
                        modifier = Modifier.size(28.dp)
                    )
                    Spacer(modifier = Modifier.width(AppSpacing.sm))
                    Text(
                        text = stringResource(R.string.time_tracking_clock_out).uppercase(),
                        style = AppTypography.heading2,
                        fontWeight = FontWeight.Bold
                    )
                }
            } else {
                // Not Clocked In State
                Icon(
                    imageVector = Icons.Default.Schedule,
                    contentDescription = null,
                    tint = AppColors.textSecondary,
                    modifier = Modifier.size(48.dp)
                )

                Spacer(modifier = Modifier.height(AppSpacing.sm))

                Text(
                    text = stringResource(R.string.time_tracking_not_clocked_in),
                    style = AppTypography.heading3,
                    color = AppColors.textSecondary
                )

                Text(
                    text = stringResource(R.string.time_tracking_tap_to_start),
                    style = AppTypography.secondary,
                    color = AppColors.textSecondary
                )

                Spacer(modifier = Modifier.height(AppSpacing.md))

                // Large Clock In Button
                Button(
                    onClick = onClockIn,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(touchTargetSize),
                    shape = RoundedCornerShape(AppSpacing.md),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = ConstructionGreen,
                        contentColor = Color.White
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.Login,
                        contentDescription = null,
                        modifier = Modifier.size(28.dp)
                    )
                    Spacer(modifier = Modifier.width(AppSpacing.sm))
                    Text(
                        text = stringResource(R.string.time_tracking_clock_in).uppercase(),
                        style = AppTypography.heading2,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@Composable
private fun TimeEntryCard(entry: TimeEntry) {
    val unknownProjectText = stringResource(R.string.time_tracking_unknown_project)
    val activeText = stringResource(R.string.time_tracking_active)
    val statusApproved = stringResource(R.string.status_approved)
    val statusRejected = stringResource(R.string.status_rejected)
    val statusPending = stringResource(R.string.status_pending)

    CPCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Status indicator
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(AppSpacing.sm))
                    .background(
                        when (entry.status) {
                            "APPROVED" -> ConstructionGreen.copy(alpha = 0.1f)
                            "REJECTED" -> ConstructionRed.copy(alpha = 0.1f)
                            else -> ConstructionOrange.copy(alpha = 0.1f)
                        }
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = when (entry.status) {
                        "APPROVED" -> Icons.Default.CheckCircle
                        "REJECTED" -> Icons.Default.Cancel
                        else -> Icons.Default.Schedule
                    },
                    contentDescription = null,
                    tint = when (entry.status) {
                        "APPROVED" -> ConstructionGreen
                        "REJECTED" -> ConstructionRed
                        else -> ConstructionOrange
                    }
                )
            }

            Spacer(modifier = Modifier.width(AppSpacing.md))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = entry.getProjectDisplay()?.name ?: unknownProjectText,
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = formatDate(entry.clockIn),
                    style = AppTypography.secondary,
                    color = AppColors.textSecondary
                )
                Row {
                    Text(
                        text = "${formatTime(entry.clockIn)} - ${entry.clockOut?.let { formatTime(it) } ?: activeText}",
                        style = AppTypography.body,
                        color = AppColors.textSecondary
                    )
                    entry.breakMinutes?.let { breaks ->
                        if (breaks > 0) {
                            Text(
                                text = " (${stringResource(R.string.time_tracking_break_format, breaks)})",
                                style = AppTypography.secondary,
                                color = AppColors.textSecondary
                            )
                        }
                    }
                }
            }

            // Duration
            entry.clockOut?.let { clockOut ->
                val duration = calculateDuration(entry.clockIn, clockOut, entry.breakMinutes ?: 0)
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = duration,
                        style = AppTypography.heading3,
                        fontWeight = FontWeight.Bold,
                        color = AppColors.primary600
                    )
                    CPBadge(
                        text = when (entry.status) {
                            "APPROVED" -> statusApproved
                            "REJECTED" -> statusRejected
                            else -> statusPending
                        },
                        color = when (entry.status) {
                            "APPROVED" -> ConstructionGreen
                            "REJECTED" -> ConstructionRed
                            else -> ConstructionOrange
                        },
                        backgroundColor = when (entry.status) {
                            "APPROVED" -> ConstructionGreen.copy(alpha = 0.1f)
                            "REJECTED" -> ConstructionRed.copy(alpha = 0.1f)
                            else -> ConstructionOrange.copy(alpha = 0.1f)
                        }
                    )
                }
            }
        }
    }
}

private fun formatTime(isoString: String): String {
    return try {
        val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
        val outputFormat = SimpleDateFormat("h:mm a", Locale.US)
        val date = inputFormat.parse(isoString.take(19))
        outputFormat.format(date!!)
    } catch (_: Exception) {
        TimeUtils.format12Hour(isoString)
    }
}

private fun formatDate(isoString: String): String {
    return try {
        val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
        val outputFormat = SimpleDateFormat("EEE, MMM d", Locale.US)
        val date = inputFormat.parse(isoString.take(19))
        outputFormat.format(date!!)
    } catch (_: Exception) {
        isoString.take(10)
    }
}

private fun calculateDuration(clockIn: String, clockOut: String, breakMinutes: Int): String {
    return try {
        val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
        val start = format.parse(clockIn.take(19))!!
        val end = format.parse(clockOut.take(19))!!
        val diffMillis = end.time - start.time - (breakMinutes * 60 * 1000)
        val hours = diffMillis / (1000 * 60 * 60)
        val minutes = (diffMillis / (1000 * 60)) % 60
        "${hours}h ${minutes}m"
    } catch (_: Exception) {
        "--"
    }
}
