package com.constructionpro.app.ui.screens

import android.Manifest
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.constructionpro.app.R
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import coil.compose.AsyncImage
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.DeviceLocationProvider
import com.constructionpro.app.data.LocationResult
import com.constructionpro.app.data.local.AppDatabase
import com.constructionpro.app.data.local.DailyLogEntity
import com.constructionpro.app.data.local.PendingActionEntity
import com.constructionpro.app.data.local.PendingActionScheduler
import com.constructionpro.app.data.local.PendingActionTypes
import com.constructionpro.app.data.local.PendingDailyLogCreatePayload
import com.constructionpro.app.data.local.PendingStatus
import com.constructionpro.app.data.local.PhotoQueue
import com.constructionpro.app.data.model.DailyLogUpsertRequest
import com.constructionpro.app.data.model.ProjectSummary
import com.constructionpro.app.data.model.WeatherData
import com.constructionpro.app.data.uploadDailyLogPhotos
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import com.constructionpro.app.ui.util.responsiveValue
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import retrofit2.HttpException
import java.io.File
import java.io.IOException
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.UUID

private data class DailyLogCreateState(
    val step: Int = 1, // 1=Select Project, 2=Weather & Details, 3=Review
    val loadingProjects: Boolean = true,
    val projects: List<ProjectSummary> = emptyList(),
    val selectedProject: ProjectSummary? = null,
    val weatherData: WeatherData? = null,
    val weatherStatus: String = "Fetching weather...",
    val weatherLoading: Boolean = false,
    val weatherDelay: Boolean? = null, // null = not answered, true/false = answered
    val notes: String = "",
    val crewCount: String = "",
    val totalHours: String = "",
    val selectedPhotos: List<Uri> = emptyList(),
    val isSaving: Boolean = false,
    val isUploadingPhotos: Boolean = false,
    val error: String? = null,
    val location: LocationResult? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DailyLogCreateScreen(
    apiService: ApiService,
    projectId: String? = null,
    onBack: () -> Unit,
    onSaved: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val db = remember { AppDatabase.getInstance(context) }
    val pendingDao = remember { db.pendingActionDao() }
    val dailyLogDao = remember { db.dailyLogDao() }
    val pendingPhotoDao = remember { db.pendingPhotoDao() }
    val json = remember { Json { encodeDefaults = true } }

    var state by remember { mutableStateOf(DailyLogCreateState()) }
    var cameraPhotoUri by remember { mutableStateOf<Uri?>(null) }

    // Load projects
    LaunchedEffect(Unit) {
        try {
            val response = withContext(Dispatchers.IO) {
                apiService.getProjects(status = "ACTIVE", pageSize = 100)
            }
            val selectedProject = if (projectId != null) {
                response.projects.find { it.id == projectId }
            } else null

            state = state.copy(
                loadingProjects = false,
                projects = response.projects,
                selectedProject = selectedProject,
                step = if (selectedProject != null) 2 else 1
            )

            // If project pre-selected, fetch weather immediately
            if (selectedProject != null) {
                fetchWeatherForProject(
                    context = context,
                    apiService = apiService,
                    onStateUpdate = { state = it(state) }
                )
            }
        } catch (e: Exception) {
            state = state.copy(
                loadingProjects = false,
                error = "Failed to load projects: ${e.message}"
            )
        }
    }

    // Permission launcher for location
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            scope.launch {
                fetchWeatherForProject(
                    context = context,
                    apiService = apiService,
                    onStateUpdate = { state = it(state) }
                )
            }
        } else {
            state = state.copy(
                weatherStatus = "Location permission needed",
                weatherLoading = false
            )
        }
    }

    // Photo picker for gallery
    val photoPicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetMultipleContents()
    ) { uris ->
        if (uris.isNotEmpty()) {
            state = state.copy(selectedPhotos = state.selectedPhotos + uris)
        }
    }

    // Camera launcher
    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture()
    ) { success ->
        if (success && cameraPhotoUri != null) {
            state = state.copy(selectedPhotos = state.selectedPhotos + cameraPhotoUri!!)
        }
    }

    fun launchCamera() {
        val photoFile = File.createTempFile(
            "daily_log_photo_",
            ".jpg",
            context.cacheDir
        )
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            photoFile
        )
        cameraPhotoUri = uri
        cameraLauncher.launch(uri)
    }

    fun requestLocationAndFetchWeather() {
        val granted = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED

        if (granted) {
            scope.launch {
                fetchWeatherForProject(
                    context = context,
                    apiService = apiService,
                    onStateUpdate = { state = it(state) }
                )
            }
        } else {
            permissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
        }
    }

    fun onSelectProject(project: ProjectSummary) {
        state = state.copy(
            selectedProject = project,
            step = 2,
            weatherData = null,
            weatherStatus = "Fetching weather...",
            weatherLoading = true
        )
        requestLocationAndFetchWeather()
    }

    fun onSubmit() {
        val project = state.selectedProject ?: return

        // Validation
        if (state.weatherData == null) {
            state = state.copy(error = "Weather data is required")
            requestLocationAndFetchWeather()
            return
        }

        if (state.weatherDelay == null) {
            state = state.copy(error = "Please indicate if there are weather delays")
            return
        }

        if (state.weatherDelay == true && state.notes.isBlank()) {
            state = state.copy(error = "Notes are required when there's a weather delay")
            return
        }

        state = state.copy(isSaving = true, error = null)

        scope.launch {
            try {
                val request = DailyLogUpsertRequest(
                    projectId = project.id,
                    date = LocalDate.now().toString(),
                    notes = state.notes.trim().ifEmpty { null },
                    status = "SUBMITTED",
                    crewCount = state.crewCount.toIntOrNull(),
                    totalHours = state.totalHours.toDoubleOrNull(),
                    weatherData = state.weatherData,
                    weatherDelay = state.weatherDelay ?: false,
                    weatherDelayNotes = if (state.weatherDelay == true) state.notes.trim().ifEmpty { null } else null
                )

                val response = withContext(Dispatchers.IO) {
                    apiService.createDailyLog(request)
                }
                val logId = response.dailyLog.id

                // Handle photo uploads
                if (state.selectedPhotos.isNotEmpty()) {
                    state = state.copy(isUploadingPhotos = true)
                    try {
                        uploadDailyLogPhotos(
                            apiService = apiService,
                            resolver = context.contentResolver,
                            projectId = project.id,
                            dailyLogId = logId,
                            photos = state.selectedPhotos,
                            location = state.location
                        )
                    } catch (uploadError: Exception) {
                        // Queue photos for later upload
                        val queued = PhotoQueue.queuePhotos(
                            context = context,
                            projectId = project.id,
                            dailyLogId = logId,
                            photos = state.selectedPhotos,
                            gpsLatitude = state.location?.latitude,
                            gpsLongitude = state.location?.longitude
                        )
                        withContext(Dispatchers.IO) {
                            queued.forEach { pendingPhotoDao.upsert(it) }
                        }
                        PendingActionScheduler.enqueue(context)
                    }
                    state = state.copy(isUploadingPhotos = false)
                }

                state = state.copy(isSaving = false)
                onSaved()
            } catch (exception: Exception) {
                if (shouldQueueOffline(exception)) {
                    // Save offline
                    val localId = "local_${UUID.randomUUID()}"
                    val request = DailyLogUpsertRequest(
                        projectId = project.id,
                        date = LocalDate.now().toString(),
                        notes = state.notes.trim().ifEmpty { null },
                        status = "SUBMITTED",
                        crewCount = state.crewCount.toIntOrNull(),
                        totalHours = state.totalHours.toDoubleOrNull(),
                        weatherData = state.weatherData,
                        weatherDelay = state.weatherDelay ?: false,
                        weatherDelayNotes = if (state.weatherDelay == true) state.notes.trim().ifEmpty { null } else null
                    )

                    val payload = PendingDailyLogCreatePayload(localId = localId, request = request)
                    val action = PendingActionEntity(
                        id = UUID.randomUUID().toString(),
                        type = PendingActionTypes.DAILY_LOG_CREATE,
                        resourceId = project.id,
                        payloadJson = json.encodeToString(payload),
                        status = PendingStatus.PENDING,
                        retryCount = 0,
                        createdAt = System.currentTimeMillis()
                    )

                    val localEntity = DailyLogEntity(
                        id = localId,
                        projectId = project.id,
                        projectName = project.name,
                        date = request.date,
                        status = "PENDING_SYNC",
                        crewCount = request.crewCount,
                        totalHours = request.totalHours,
                        submitterName = null,
                        entriesCount = request.entries?.size,
                        materialsCount = request.materials?.size,
                        issuesCount = request.issues?.size,
                        notes = request.notes,
                        pendingSync = true,
                        updatedAt = System.currentTimeMillis()
                    )

                    val queuedPhotos = if (state.selectedPhotos.isNotEmpty()) {
                        PhotoQueue.queuePhotos(
                            context = context,
                            projectId = project.id,
                            dailyLogId = localId,
                            photos = state.selectedPhotos,
                            gpsLatitude = state.location?.latitude,
                            gpsLongitude = state.location?.longitude
                        )
                    } else emptyList()

                    withContext(Dispatchers.IO) {
                        pendingDao.upsert(action)
                        dailyLogDao.insertAll(listOf(localEntity))
                        queuedPhotos.forEach { pendingPhotoDao.upsert(it) }
                    }
                    PendingActionScheduler.enqueue(context)

                    state = state.copy(isSaving = false)
                    onSaved()
                } else {
                    state = state.copy(
                        isSaving = false,
                        error = exception.message ?: "Failed to create daily log"
                    )
                }
            }
        }
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = when (state.step) {
                    1 -> stringResource(R.string.daily_logs_select_project)
                    2 -> stringResource(R.string.daily_logs_details)
                    else -> stringResource(R.string.daily_logs_new)
                },
                subtitle = state.selectedProject?.name,
                navigationIcon = {
                    IconButton(
                        onClick = {
                            when {
                                state.step > 1 && state.selectedProject != null && projectId == null -> {
                                    state = state.copy(step = state.step - 1)
                                }
                                else -> onBack()
                            }
                        },
                        modifier = Modifier.size(56.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = stringResource(R.string.common_back),
                            tint = AppColors.textSecondary
                        )
                    }
                }
            )
        }
    ) { padding ->
        when (state.step) {
            1 -> ProjectSelectionStep(
                state = state,
                onSelectProject = ::onSelectProject,
                modifier = Modifier.padding(padding)
            )
            2 -> DetailsStep(
                state = state,
                onStateChange = { state = it },
                onRefreshWeather = ::requestLocationAndFetchWeather,
                onAddPhotosFromGallery = { photoPicker.launch("image/*") },
                onTakePhoto = ::launchCamera,
                onRemovePhoto = { uri ->
                    state = state.copy(selectedPhotos = state.selectedPhotos - uri)
                },
                onSubmit = ::onSubmit,
                modifier = Modifier.padding(padding)
            )
        }
    }
}

@Composable
private fun ProjectSelectionStep(
    state: DailyLogCreateState,
    onSelectProject: (ProjectSummary) -> Unit,
    modifier: Modifier = Modifier
) {
    if (state.loadingProjects) {
        Box(
            modifier = modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            CPLoadingIndicator(message = stringResource(R.string.daily_logs_loading))
        }
        return
    }

    if (state.projects.isEmpty()) {
        Box(
            modifier = modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            CPEmptyState(
                icon = Icons.Default.Folder,
                title = stringResource(R.string.daily_logs_no_active_projects),
                description = stringResource(R.string.daily_logs_no_active_projects_desc)
            )
        }
        return
    }

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(
            horizontal = responsiveValue(16.dp, 24.dp, 32.dp),
            vertical = 16.dp
        ),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text(
                text = stringResource(R.string.daily_logs_select_project_to_log),
                style = AppTypography.heading3,
                color = AppColors.textSecondary,
                modifier = Modifier.padding(bottom = AppSpacing.xs)
            )
        }

        items(state.projects, key = { it.id }) { project ->
            ProjectSelectionCard(
                project = project,
                onClick = { onSelectProject(project) }
            )
        }

        item {
            Spacer(modifier = Modifier.height(AppSpacing.md))
        }
    }
}

@Composable
private fun ProjectSelectionCard(
    project: ProjectSummary,
    onClick: () -> Unit
) {
    CPCard(
        onClick = onClick,
        modifier = Modifier.defaultMinSize(minHeight = 72.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Project Icon
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(RoundedCornerShape(AppSpacing.sm))
                    .background(AppColors.primary600.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Folder,
                    contentDescription = null,
                    tint = AppColors.primary600,
                    modifier = Modifier.size(28.dp)
                )
            }

            Spacer(modifier = Modifier.width(AppSpacing.md))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = project.name,
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold,
                    color = AppColors.textPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                project.address?.let { address ->
                    Text(
                        text = address,
                        style = AppTypography.body,
                        color = AppColors.textSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                project.client?.companyName?.let { client ->
                    Text(
                        text = client,
                        style = AppTypography.secondary,
                        color = AppColors.textMuted
                    )
                }
            }

            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = AppColors.textMuted,
                modifier = Modifier.padding(start = AppSpacing.xs)
            )
        }
    }
}

@Composable
private fun DetailsStep(
    state: DailyLogCreateState,
    onStateChange: (DailyLogCreateState) -> Unit,
    onRefreshWeather: () -> Unit,
    onAddPhotosFromGallery: () -> Unit,
    onTakePhoto: () -> Unit,
    onRemovePhoto: (Uri) -> Unit,
    onSubmit: () -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(
            horizontal = responsiveValue(AppSpacing.md, AppSpacing.xl, AppSpacing.xxl),
            vertical = AppSpacing.md
        ),
        verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
    ) {
        // Date Display
        item {
            CPCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.CalendarToday,
                        contentDescription = null,
                        tint = AppColors.primary600,
                        modifier = Modifier.size(AppSpacing.xl)
                    )
                    Spacer(modifier = Modifier.width(AppSpacing.sm))
                    Column {
                        Text(
                            text = stringResource(R.string.daily_logs_date),
                            style = AppTypography.secondaryMedium,
                            color = AppColors.textSecondary
                        )
                        Text(
                            text = LocalDate.now().format(DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy")),
                            style = AppTypography.heading3,
                            fontWeight = FontWeight.SemiBold,
                            color = AppColors.textPrimary
                        )
                    }
                }
            }
        }

        // Error Banner
        if (state.error != null) {
            item {
                CPErrorBanner(
                    message = state.error ?: "An error occurred",
                    onDismiss = { onStateChange(state.copy(error = null)) }
                )
            }
        }

        // Weather Section
        item {
            WeatherSection(
                weatherData = state.weatherData,
                weatherStatus = state.weatherStatus,
                weatherLoading = state.weatherLoading,
                onRefresh = onRefreshWeather
            )
        }

        // Weather Delay Question
        item {
            WeatherDelaySection(
                weatherDelay = state.weatherDelay,
                onWeatherDelayChange = { onStateChange(state.copy(weatherDelay = it)) }
            )
        }

        // Notes Section
        item {
            NotesSection(
                notes = state.notes,
                onNotesChange = { onStateChange(state.copy(notes = it)) },
                isRequired = state.weatherDelay == true
            )
        }

        // Photos Section
        item {
            PhotosSection(
                photos = state.selectedPhotos,
                onAddFromGallery = onAddPhotosFromGallery,
                onTakePhoto = onTakePhoto,
                onRemovePhoto = onRemovePhoto
            )
        }

        // Submit Button
        item {
            CPButton(
                text = if (state.isSaving) {
                    if (state.isUploadingPhotos) stringResource(R.string.daily_logs_uploading_photos) else stringResource(R.string.daily_logs_saving)
                } else stringResource(R.string.common_submit),
                onClick = onSubmit,
                modifier = Modifier
                    .fillMaxWidth()
                    .defaultMinSize(minHeight = 64.dp),
                size = CPButtonSize.XLarge,
                style = CPButtonStyle.Primary,
                enabled = !state.isSaving && state.weatherDelay != null,
                loading = state.isSaving,
                icon = Icons.Default.Check
            )
        }

        item {
            Spacer(modifier = Modifier.height(AppSpacing.xxl))
        }
    }
}

@Composable
private fun WeatherSection(
    weatherData: WeatherData?,
    weatherStatus: String,
    weatherLoading: Boolean,
    onRefresh: () -> Unit
) {
    CPCard {
        Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.WbSunny,
                        contentDescription = null,
                        tint = ConstructionOrange,
                        modifier = Modifier.size(AppSpacing.xl)
                    )
                    Spacer(modifier = Modifier.width(AppSpacing.xs))
                    Text(
                        text = stringResource(R.string.daily_logs_weather),
                        style = AppTypography.heading3,
                        fontWeight = FontWeight.SemiBold,
                        color = AppColors.textPrimary
                    )
                }

                IconButton(
                    onClick = onRefresh,
                    enabled = !weatherLoading,
                    modifier = Modifier.size(48.dp)
                ) {
                    if (weatherLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            strokeWidth = 2.dp,
                            color = AppColors.primary600
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = stringResource(R.string.daily_logs_refresh_weather),
                            tint = AppColors.textSecondary
                        )
                    }
                }
            }

            if (weatherData != null) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Temperature
                    Column(
                        modifier = Modifier.weight(1f),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "${weatherData.temperature?.toInt() ?: "--"}°",
                            style = AppTypography.statMedium,
                            fontWeight = FontWeight.Bold,
                            color = AppColors.textPrimary
                        )
                        Text(
                            text = weatherData.condition ?: stringResource(R.string.daily_logs_unknown),
                            style = AppTypography.body,
                            color = AppColors.textSecondary
                        )
                    }

                    // Divider
                    Box(
                        modifier = Modifier
                            .width(1.dp)
                            .height(60.dp)
                            .background(AppColors.divider)
                    )

                    // Wind
                    Column(
                        modifier = Modifier.weight(1f),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Air,
                                contentDescription = null,
                                tint = AppColors.textSecondary,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "${weatherData.windSpeed?.toInt() ?: "--"} mph",
                                style = AppTypography.heading3,
                                fontWeight = FontWeight.SemiBold,
                                color = AppColors.textPrimary
                            )
                        }
                        Text(
                            text = weatherData.windDirection ?: stringResource(R.string.daily_logs_wind),
                            style = AppTypography.secondary,
                            color = AppColors.textSecondary
                        )
                    }

                    // Humidity if available
                    weatherData.humidity?.let { humidity ->
                        Box(
                            modifier = Modifier
                                .width(1.dp)
                                .height(60.dp)
                                .background(AppColors.divider)
                        )

                        Column(
                            modifier = Modifier.weight(1f),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.WaterDrop,
                                    contentDescription = null,
                                    tint = AppColors.primary600,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "${humidity.toInt()}%",
                                    style = AppTypography.heading3,
                                    fontWeight = FontWeight.SemiBold,
                                    color = AppColors.textPrimary
                                )
                            }
                            Text(
                                text = stringResource(R.string.daily_logs_humidity),
                                style = AppTypography.secondary,
                                color = AppColors.textSecondary
                            )
                        }
                    }
                }

                weatherData.location?.let { location ->
                    Text(
                        text = location,
                        style = AppTypography.secondary,
                        color = AppColors.textMuted,
                        modifier = Modifier.padding(top = AppSpacing.xs)
                    )
                }
            } else {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = AppSpacing.md),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (weatherLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(AppSpacing.xl),
                            strokeWidth = 2.dp,
                            color = AppColors.primary600
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.sm))
                    }
                    Text(
                        text = weatherStatus,
                        style = AppTypography.body,
                        color = AppColors.textSecondary
                    )
                }
            }
        }
    }
}

@Composable
private fun WeatherDelaySection(
    weatherDelay: Boolean?,
    onWeatherDelayChange: (Boolean) -> Unit
) {
    CPCard {
        Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.md)) {
            Text(
                text = stringResource(R.string.daily_logs_weather_delay),
                style = AppTypography.heading3,
                fontWeight = FontWeight.SemiBold,
                color = AppColors.textPrimary
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
            ) {
                // Yes Button
                WeatherDelayButton(
                    text = stringResource(R.string.daily_logs_delay_reason),
                    icon = Icons.Default.Warning,
                    isSelected = weatherDelay == true,
                    color = ConstructionOrange,
                    onClick = { onWeatherDelayChange(true) },
                    modifier = Modifier.weight(1f)
                )

                // No Button
                WeatherDelayButton(
                    text = stringResource(R.string.daily_logs_no_delays),
                    icon = Icons.Default.CheckCircle,
                    isSelected = weatherDelay == false,
                    color = ConstructionGreen,
                    onClick = { onWeatherDelayChange(false) },
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
private fun WeatherDelayButton(
    text: String,
    icon: ImageVector,
    isSelected: Boolean,
    color: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val backgroundColor = if (isSelected) color.copy(alpha = 0.15f) else AppColors.gray100
    val borderColor = if (isSelected) color else AppColors.textMuted.copy(alpha = 0.3f)
    val contentColor = if (isSelected) color else AppColors.textSecondary

    Surface(
        onClick = onClick,
        modifier = modifier
            .defaultMinSize(minHeight = 72.dp)
            .border(
                width = if (isSelected) 2.dp else 1.dp,
                color = borderColor,
                shape = RoundedCornerShape(AppSpacing.md)
            ),
        shape = RoundedCornerShape(AppSpacing.md),
        color = backgroundColor
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(AppSpacing.md),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = contentColor,
                modifier = Modifier.size(28.dp)
            )
            Spacer(modifier = Modifier.height(AppSpacing.xs))
            Text(
                text = text,
                style = AppTypography.label,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                color = contentColor,
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
private fun NotesSection(
    notes: String,
    onNotesChange: (String) -> Unit,
    isRequired: Boolean
) {
    CPCard {
        Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = stringResource(R.string.daily_logs_notes),
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold,
                    color = AppColors.textPrimary
                )
                if (isRequired) {
                    Text(
                        text = " *",
                        style = AppTypography.heading3,
                        color = ConstructionRed
                    )
                    Spacer(modifier = Modifier.width(AppSpacing.xs))
                    Text(
                        text = "(${stringResource(R.string.daily_logs_notes_required)})",
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                } else {
                    Text(
                        text = " (${stringResource(R.string.daily_logs_notes_optional)})",
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                }
            }

            OutlinedTextField(
                value = notes,
                onValueChange = onNotesChange,
                modifier = Modifier
                    .fillMaxWidth()
                    .defaultMinSize(minHeight = 120.dp),
                placeholder = {
                    Text(
                        text = if (isRequired)
                            stringResource(R.string.daily_logs_notes_placeholder_delay)
                        else
                            stringResource(R.string.daily_logs_notes_placeholder),
                        color = AppColors.textSecondary.copy(alpha = 0.6f)
                    )
                },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = AppColors.primary600,
                    unfocusedBorderColor = AppColors.textMuted,
                    focusedContainerColor = AppColors.cardBackground,
                    unfocusedContainerColor = AppColors.cardBackground,
                    cursorColor = AppColors.primary600
                ),
                shape = RoundedCornerShape(AppSpacing.sm),
                maxLines = 6
            )
        }
    }
}

@Composable
private fun PhotosSection(
    photos: List<Uri>,
    onAddFromGallery: () -> Unit,
    onTakePhoto: () -> Unit,
    onRemovePhoto: (Uri) -> Unit
) {
    CPCard {
        Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
            Text(
                text = stringResource(R.string.daily_logs_photos) + " (${photos.size})",
                style = AppTypography.heading3,
                fontWeight = FontWeight.SemiBold,
                color = AppColors.textPrimary
            )

            // Photo action buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
            ) {
                // Take Photo Button
                Surface(
                    onClick = onTakePhoto,
                    modifier = Modifier
                        .weight(1f)
                        .defaultMinSize(minHeight = 64.dp),
                    shape = RoundedCornerShape(AppSpacing.sm),
                    color = AppColors.primary600.copy(alpha = 0.1f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, AppColors.primary600.copy(alpha = 0.3f))
                ) {
                    Row(
                        modifier = Modifier.padding(AppSpacing.md),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.CameraAlt,
                            contentDescription = null,
                            tint = AppColors.primary600,
                            modifier = Modifier.size(AppSpacing.xl)
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.xs))
                        Text(
                            text = stringResource(R.string.daily_logs_take_photo),
                            style = AppTypography.label,
                            fontWeight = FontWeight.SemiBold,
                            color = AppColors.primary600
                        )
                    }
                }

                // Add from Gallery Button
                Surface(
                    onClick = onAddFromGallery,
                    modifier = Modifier
                        .weight(1f)
                        .defaultMinSize(minHeight = 64.dp),
                    shape = RoundedCornerShape(AppSpacing.sm),
                    color = AppColors.gray100,
                    border = androidx.compose.foundation.BorderStroke(1.dp, AppColors.textMuted.copy(alpha = 0.3f))
                ) {
                    Row(
                        modifier = Modifier.padding(AppSpacing.md),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.PhotoLibrary,
                            contentDescription = null,
                            tint = AppColors.textSecondary,
                            modifier = Modifier.size(AppSpacing.xl)
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.xs))
                        Text(
                            text = stringResource(R.string.daily_logs_gallery),
                            style = AppTypography.label,
                            fontWeight = FontWeight.SemiBold,
                            color = AppColors.textSecondary
                        )
                    }
                }
            }

            // Photo thumbnails
            if (photos.isNotEmpty()) {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    items(photos) { uri ->
                        Box(modifier = Modifier.size(100.dp)) {
                            AsyncImage(
                                model = uri,
                                contentDescription = stringResource(R.string.daily_logs_photos),
                                modifier = Modifier
                                    .fillMaxSize()
                                    .clip(RoundedCornerShape(AppSpacing.sm)),
                                contentScale = ContentScale.Crop
                            )

                            // Remove button
                            IconButton(
                                onClick = { onRemovePhoto(uri) },
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .size(32.dp)
                                    .padding(4.dp)
                                    .background(
                                        color = Color.Black.copy(alpha = 0.5f),
                                        shape = CircleShape
                                    )
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Close,
                                    contentDescription = stringResource(R.string.common_cancel),
                                    tint = Color.White,
                                    modifier = Modifier.size(AppSpacing.md)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

private suspend fun fetchWeatherForProject(
    context: android.content.Context,
    apiService: ApiService,
    onStateUpdate: ((DailyLogCreateState) -> DailyLogCreateState) -> Unit
) {
    onStateUpdate { it.copy(weatherLoading = true, weatherStatus = "Fetching weather...") }

    try {
        val provider = DeviceLocationProvider(context)
        val location = withContext(Dispatchers.IO) { provider.getCurrentLocation() }

        if (location == null) {
            onStateUpdate {
                it.copy(
                    weatherLoading = false,
                    weatherStatus = "Unable to get location"
                )
            }
            return
        }

        val weatherData = withContext(Dispatchers.IO) {
            apiService.getWeather(location.latitude, location.longitude)
        }

        onStateUpdate {
            it.copy(
                weatherData = weatherData,
                weatherLoading = false,
                weatherStatus = "Weather updated",
                location = location
            )
        }
    } catch (e: Exception) {
        onStateUpdate {
            it.copy(
                weatherLoading = false,
                weatherStatus = e.message ?: "Failed to fetch weather"
            )
        }
    }
}

private fun shouldQueueOffline(error: Exception): Boolean {
    return when (error) {
        is IOException -> true
        is HttpException -> error.code() >= 500
        else -> false
    }
}
