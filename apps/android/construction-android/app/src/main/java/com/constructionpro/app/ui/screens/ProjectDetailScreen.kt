package com.constructionpro.app.ui.screens

import android.content.ContentResolver
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.work.Constraints
import com.constructionpro.app.R
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.ModuleVisibilityPreferences
import com.constructionpro.app.data.local.AppDatabase
import com.constructionpro.app.data.local.FileQueue
import com.constructionpro.app.data.local.PendingActionScheduler
import com.constructionpro.app.data.local.PrefetchDrawingsWorker
import com.constructionpro.app.data.local.toEntity
import com.constructionpro.app.data.model.CompanySettings
import com.constructionpro.app.data.model.ProjectDetail
import com.constructionpro.app.data.model.ProjectUpdateRequest
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import okio.BufferedSink
import okio.source
import retrofit2.HttpException
import java.io.IOException
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import kotlin.math.roundToInt

private data class ProjectDetailState(
    val loading: Boolean = false,
    val project: ProjectDetail? = null,
    val error: String? = null
)

private data class ProjectTeamState(
    val showDialog: Boolean = false,
    val loading: Boolean = false,
    val allUsers: List<com.constructionpro.app.data.model.UserSummary> = emptyList(),
    val selectedUserIds: Set<String> = emptySet(),
    val visibilityMode: String = "ASSIGNED_ONLY",
    val saving: Boolean = false,
    val error: String? = null
)

private data class PrefetchStatus(
    val loading: Boolean = false,
    val total: Int = 0,
    val cached: Int = 0,
    val downloading: Int = 0,
    val failed: Int = 0,
    val percent: Int = 0,
    val source: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProjectDetailScreen(
    apiService: ApiService,
    projectId: String,
    onBack: () -> Unit,
    onViewDailyLogs: () -> Unit,
    onViewTimeEntries: () -> Unit = {},
    onViewFiles: () -> Unit = {},
    onViewDroneFlights: () -> Unit = {},
    onEditProject: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val workManager = remember { WorkManager.getInstance(context) }
    val db = remember { AppDatabase.getInstance(context) }
    val drawingDao = remember { db.drawingDao() }
    val cacheDao = remember { db.documentCacheDao() }
    val downloadDao = remember { db.downloadEntryDao() }
    val pendingFileDao = remember { db.pendingFileDao() }
    val modulePrefs = remember { ModuleVisibilityPreferences.getInstance(context) }
    val moduleVisibility by modulePrefs.visibilityFlow.collectAsState(
        initial = ModuleVisibilityPreferences.ModuleVisibility()
    )

    var state by remember { mutableStateOf(ProjectDetailState(loading = true)) }
    var isAdmin by remember { mutableStateOf(false) }
    var companySettings by remember { mutableStateOf<CompanySettings?>(null) }
    var teamState by remember { mutableStateOf(ProjectTeamState()) }
    var drawingIds by remember { mutableStateOf<List<String>>(emptyList()) }
    var prefetchStatus by remember { mutableStateOf(PrefetchStatus(loading = true)) }
    var prefetchError by remember { mutableStateOf<String?>(null) }
    var uploadCategory by remember { mutableStateOf("DOCUMENTS") }
    var uploadStatus by remember { mutableStateOf<String?>(null) }
    var isUploading by remember { mutableStateOf(false) }
    var showUploadSheet by remember { mutableStateOf(false) }

    fun uploadProjectFile(uri: Uri, category: String) {
        scope.launch {
            isUploading = true
            val trimmedCategory = category.trim().ifEmpty { "DOCUMENTS" }
            try {
                val resolver = context.contentResolver
                val fileName = resolveFileName(resolver, uri) ?: "upload_${System.currentTimeMillis()}"
                val mimeType = resolver.getType(uri) ?: "application/octet-stream"
                val fileBody = buildStreamingRequestBody(resolver, uri, mimeType)
                val filePart = MultipartBody.Part.createFormData("file", fileName, fileBody)
                val textType = "text/plain".toMediaType()
                val projectBody = projectId.toRequestBody(textType)
                val categoryBody = trimmedCategory.toRequestBody(textType)

                withContext(Dispatchers.IO) {
                    apiService.uploadFile(
                        file = filePart,
                        projectId = projectBody,
                        dailyLogId = null,
                        category = categoryBody,
                        gpsLatitude = null,
                        gpsLongitude = null
                    )
                }
                uploadStatus = "Upload complete"
                showUploadSheet = false
            } catch (error: Exception) {
                if (shouldQueueOffline(error)) {
                    val queued = FileQueue.queueFile(
                        context = context,
                        projectId = projectId,
                        dailyLogId = null,
                        category = trimmedCategory,
                        uri = uri
                    )
                    if (queued != null) {
                        withContext(Dispatchers.IO) { pendingFileDao.upsert(queued) }
                        PendingActionScheduler.enqueue(context)
                        uploadStatus = "Queued for upload"
                        showUploadSheet = false
                    } else {
                        uploadStatus = "Unable to queue file"
                    }
                } else {
                    uploadStatus = error.message ?: "Failed to upload"
                }
            } finally {
                isUploading = false
            }
        }
    }

    val filePicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        if (uri != null) {
            uploadStatus = null
            uploadProjectFile(uri, uploadCategory)
        }
    }

    fun loadProject() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val response = withContext(Dispatchers.IO) { apiService.getProject(projectId) }
                state = state.copy(loading = false, project = response.project)
            } catch (error: Exception) {
                state = state.copy(loading = false, error = error.message ?: "Failed to load project")
            }
        }
    }

    fun loadPrefetchStatus() {
        scope.launch {
            prefetchStatus = prefetchStatus.copy(loading = true)
            prefetchError = null
            val (ids, source, errorMessage) = withContext(Dispatchers.IO) {
                try {
                    val response = apiService.getDrawings(projectId = projectId)
                    val entities = response.drawings.map { it.toEntity() }
                    drawingDao.insertAll(entities)
                    Triple(response.drawings.map { it.id }, "online", null)
                } catch (error: Exception) {
                    val cached = drawingDao.getByProject(projectId)
                    val message = if (cached.isEmpty()) {
                        error.message ?: "Failed to load drawings"
                    } else null
                    Triple(cached.map { it.id }, "offline", message)
                }
            }
            prefetchError = errorMessage
            drawingIds = ids
            prefetchStatus = withContext(Dispatchers.IO) {
                calculatePrefetchStatus(ids, cacheDao, downloadDao, source)
            }
        }
    }

    fun refreshPrefetchCounts() {
        scope.launch {
            prefetchStatus = withContext(Dispatchers.IO) {
                calculatePrefetchStatus(drawingIds, cacheDao, downloadDao, prefetchStatus.source)
            }
        }
    }

    fun loadProfileRole() {
        scope.launch {
            try {
                val profile = withContext(Dispatchers.IO) { apiService.getProfile() }
                isAdmin = profile.role == "ADMIN"
            } catch (_: Exception) {
                isAdmin = false
            }
        }
    }

    fun openTeamManagement() {
        // Get currently assigned user IDs
        val currentAssignedIds = state.project?.assignments
            ?.mapNotNull { it.user?.id }
            ?.toSet() ?: emptySet()

        teamState = teamState.copy(
            showDialog = true,
            loading = true,
            selectedUserIds = currentAssignedIds,
            visibilityMode = state.project?.visibilityMode ?: "ASSIGNED_ONLY",
            error = null
        )

        scope.launch {
            try {
                val users = withContext(Dispatchers.IO) { apiService.getUsers(status = "ACTIVE") }
                teamState = teamState.copy(loading = false, allUsers = users)
            } catch (e: Exception) {
                teamState = teamState.copy(
                    loading = false,
                    error = e.message ?: "Failed to load users"
                )
            }
        }
    }

    fun toggleUserSelection(userId: String) {
        val newSelection = if (teamState.selectedUserIds.contains(userId)) {
            teamState.selectedUserIds - userId
        } else {
            teamState.selectedUserIds + userId
        }
        teamState = teamState.copy(selectedUserIds = newSelection)
    }

    fun saveTeamAssignments() {
        scope.launch {
            teamState = teamState.copy(saving = true, error = null)
            try {
                val currentProject = state.project ?: return@launch
                val updateRequest = ProjectUpdateRequest(
                    name = currentProject.name,
                    assignedUserIds = teamState.selectedUserIds.toList(),
                    visibilityMode = teamState.visibilityMode
                )
                val response = withContext(Dispatchers.IO) {
                    apiService.updateProject(projectId, updateRequest)
                }
                state = state.copy(project = response.project)
                teamState = teamState.copy(showDialog = false, saving = false)
            } catch (e: Exception) {
                teamState = teamState.copy(
                    saving = false,
                    error = e.message ?: "Failed to save team"
                )
            }
        }
    }

    fun prefetchDrawings() {
        val input = Data.Builder()
            .putString(PrefetchDrawingsWorker.KEY_PROJECT_ID, projectId)
            .build()
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        val request = OneTimeWorkRequestBuilder<PrefetchDrawingsWorker>()
            .setConstraints(constraints)
            .setInputData(input)
            .addTag("prefetch_drawings_$projectId")
            .build()
        workManager.enqueueUniqueWork(
            "prefetch_drawings_$projectId",
            ExistingWorkPolicy.KEEP,
            request
        )
        refreshPrefetchCounts()
    }

    LaunchedEffect(projectId) {
        loadProject()
        loadProfileRole()
        loadPrefetchStatus()
        // Fetch company settings for module visibility
        try {
            val settings = withContext(Dispatchers.IO) { apiService.getSettings() }
            companySettings = settings.company
        } catch (_: Exception) {
            // Ignore - will use defaults
        }
    }

    LaunchedEffect(drawingIds) {
        if (drawingIds.isEmpty()) return@LaunchedEffect
        while (true) {
            refreshPrefetchCounts()
            kotlinx.coroutines.delay(2000)
        }
    }

    // Team Management Dialog
    if (teamState.showDialog) {
        TeamManagementDialog(
            state = teamState,
            onDismiss = { teamState = teamState.copy(showDialog = false) },
            onToggleUser = { toggleUserSelection(it) },
            onVisibilityChange = { teamState = teamState.copy(visibilityMode = it) },
            onSave = { saveTeamAssignments() }
        )
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = state.project?.name ?: stringResource(R.string.common_details),
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
                    if (isAdmin) {
                        IconButton(onClick = onEditProject) {
                            Icon(
                                imageVector = Icons.Default.Edit,
                                contentDescription = stringResource(R.string.common_edit),
                                tint = Primary600
                            )
                        }
                    }
                    IconButton(onClick = { loadProject() }) {
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
        if (state.loading) {
            CPLoadingIndicator(
                modifier = Modifier
                    .padding(padding)
                    .fillMaxSize(),
                message = stringResource(R.string.projects_loading)
            )
        } else if (state.error != null) {
            Column(
                modifier = Modifier
                    .padding(padding)
                    .fillMaxSize()
                    .padding(AppSpacing.md)
            ) {
                CPErrorBanner(
                    message = state.error ?: "Failed to load",
                    onRetry = { loadProject() },
                    onDismiss = { state = state.copy(error = null) }
                )
            }
        } else {
            state.project?.let { project ->
                LazyColumn(
                    modifier = Modifier
                        .padding(padding)
                        .fillMaxSize(),
                    contentPadding = PaddingValues(AppSpacing.md),
                    verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
                ) {
                    // Project Header Card
                    item {
                        ProjectHeaderCard(project)
                    }

                    // Stats Row - clickable to navigate to respective sections
                    // Only show time tracking if BOTH company has it enabled AND user hasn't hidden it
                    val showTimeTracking = (companySettings?.moduleTimeTracking ?: false) && moduleVisibility.showTimeTracking
                    item {
                        ProjectStatsRow(
                            project = project,
                            showTimeTracking = showTimeTracking,
                            onLogsClick = onViewDailyLogs,
                            onTimeClick = onViewTimeEntries,
                            onFilesClick = onViewFiles
                        )
                    }

                    // Quick Actions Section
                    item {
                        CPSectionHeader(title = stringResource(R.string.dashboard_quick_actions))
                    }

                    // Daily Logs Navigation
                    item {
                        CPNavigationCard(
                            title = stringResource(R.string.nav_daily_logs),
                            subtitle = stringResource(R.string.daily_logs_count, project.count?.dailyLogs ?: 0),
                            icon = Icons.Default.EditNote,
                            iconBackgroundColor = Primary100,
                            iconColor = Primary600,
                            onClick = onViewDailyLogs
                        )
                    }

                    // Drone Flights Navigation (if DroneDeploy module enabled)
                    val showDroneDeploy = (companySettings?.moduleDroneDeploy ?: false) && moduleVisibility.showDroneDeploy
                    if (showDroneDeploy) {
                        item {
                            CPNavigationCard(
                                title = stringResource(R.string.card_drone_flights),
                                subtitle = stringResource(R.string.card_drone_flights_desc),
                                icon = Icons.Default.FlightTakeoff,
                                iconBackgroundColor = Primary100,
                                iconColor = Primary600,
                                onClick = onViewDroneFlights
                            )
                        }
                    }

                    // Prefetch Drawings Card
                    item {
                        PrefetchCard(
                            status = prefetchStatus,
                            error = prefetchError,
                            onPrefetch = { prefetchDrawings() },
                            onRefresh = { loadPrefetchStatus() }
                        )
                    }

                    // Upload File Card
                    item {
                        UploadCard(
                            uploadCategory = uploadCategory,
                            onCategoryChange = { uploadCategory = it },
                            onPickFile = { filePicker.launch("*/*") },
                            isUploading = isUploading,
                            uploadStatus = uploadStatus
                        )
                    }

                    // Project Info Section
                    item {
                        CPSectionHeader(title = stringResource(R.string.detail_information))
                    }

                    item {
                        ProjectInfoCard(project)
                    }

                    // Team Section
                    val assignments = project.assignments ?: emptyList()
                    item {
                        CPSectionHeader(
                            title = "Team (${assignments.size})",
                            action = if (isAdmin) {
                                {
                                    TextButton(onClick = { openTeamManagement() }) {
                                        Icon(
                                            imageVector = Icons.Default.PersonAdd,
                                            contentDescription = null,
                                            modifier = Modifier.size(18.dp)
                                        )
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Manage")
                                    }
                                }
                            } else null
                        )
                    }
                    item {
                        if (assignments.isNotEmpty()) {
                            TeamCard(assignments)
                        } else {
                            CPCard {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(AppSpacing.md),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.GroupAdd,
                                        contentDescription = null,
                                        tint = AppColors.textSecondary,
                                        modifier = Modifier.size(48.dp)
                                    )
                                    Spacer(modifier = Modifier.height(AppSpacing.sm))
                                    Text(
                                        text = "No team members assigned",
                                        style = AppTypography.body,
                                        color = AppColors.textSecondary
                                    )
                                    if (isAdmin) {
                                        Spacer(modifier = Modifier.height(AppSpacing.sm))
                                        CPButton(
                                            text = "Add Team Members",
                                            onClick = { openTeamManagement() },
                                            size = CPButtonSize.Small
                                        )
                                    }
                                }
                            }
                        }
                    }

                    item { Spacer(modifier = Modifier.height(AppSpacing.md)) }
                }
            }
        }
    }
}

@Composable
private fun ProjectHeaderCard(project: ProjectDetail) {
    CPCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = project.name,
                    style = AppTypography.heading1,
                    fontWeight = FontWeight.Bold,
                    color = AppColors.textPrimary
                )

                project.address?.let { address ->
                    Spacer(modifier = Modifier.height(AppSpacing.xs))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.LocationOn,
                            contentDescription = null,
                            tint = AppColors.textSecondary,
                            modifier = Modifier.size(AppSpacing.md)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = address,
                            style = AppTypography.body,
                            color = AppColors.textSecondary
                        )
                    }
                }

                project.client?.companyName?.let { client ->
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Business,
                            contentDescription = null,
                            tint = AppColors.textSecondary,
                            modifier = Modifier.size(AppSpacing.md)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = client,
                            style = AppTypography.body,
                            color = AppColors.textSecondary
                        )
                    }
                }
            }

            project.status?.let { status ->
                CPStatusBadge(status = status)
            }
        }
    }
}

@Composable
private fun ProjectStatsRow(
    project: ProjectDetail,
    showTimeTracking: Boolean,
    onLogsClick: () -> Unit = {},
    onTimeClick: () -> Unit = {},
    onFilesClick: () -> Unit = {}
) {
    val count = project.count ?: return
    val configuration = LocalConfiguration.current
    val isNarrow = configuration.screenWidthDp < 320

    if (isNarrow) {
        // Vertical layout for very narrow screens (foldable cover display)
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)
        ) {
            MiniStatCard(
                icon = Icons.Default.EditNote,
                value = (count.dailyLogs ?: 0).toString(),
                label = "Logs",
                backgroundColor = Primary100,
                iconColor = Primary600,
                modifier = Modifier.fillMaxWidth(),
                onClick = onLogsClick
            )

            if (showTimeTracking) {
                MiniStatCard(
                    icon = Icons.Default.Schedule,
                    value = (count.timeEntries ?: 0).toString(),
                    label = "Time",
                    backgroundColor = Success100,
                    iconColor = Success600,
                    modifier = Modifier.fillMaxWidth(),
                    onClick = onTimeClick
                )
            }

            MiniStatCard(
                icon = Icons.Default.Folder,
                value = (count.files ?: 0).toString(),
                label = "Files",
                backgroundColor = Warning100,
                iconColor = Warning600,
                modifier = Modifier.fillMaxWidth(),
                onClick = onFilesClick
            )
        }
    } else {
        // Horizontal layout for normal screens
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            MiniStatCard(
                icon = Icons.Default.EditNote,
                value = (count.dailyLogs ?: 0).toString(),
                label = "Logs",
                backgroundColor = Primary100,
                iconColor = Primary600,
                modifier = Modifier.weight(1f),
                onClick = onLogsClick
            )

            if (showTimeTracking) {
                MiniStatCard(
                    icon = Icons.Default.Schedule,
                    value = (count.timeEntries ?: 0).toString(),
                    label = "Time",
                    backgroundColor = Success100,
                    iconColor = Success600,
                    modifier = Modifier.weight(1f),
                    onClick = onTimeClick
                )
            }

            MiniStatCard(
                icon = Icons.Default.Folder,
                value = (count.files ?: 0).toString(),
                label = "Files",
                backgroundColor = Warning100,
                iconColor = Warning600,
                modifier = Modifier.weight(1f),
                onClick = onFilesClick
            )
        }
    }
}

@Composable
private fun MiniStatCard(
    icon: ImageVector,
    value: String,
    label: String,
    backgroundColor: Color,
    iconColor: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit = {}
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(AppSpacing.sm),
        color = AppColors.cardBackground,
        shadowElevation = 1.dp,
        onClick = onClick
    ) {
        Column(
            modifier = Modifier.padding(AppSpacing.sm),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(backgroundColor),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = iconColor,
                    modifier = Modifier.size(20.dp)
                )
            }
            Spacer(modifier = Modifier.height(AppSpacing.xs))
            Text(
                text = value,
                style = AppTypography.heading2,
                fontWeight = FontWeight.Bold,
                color = AppColors.textPrimary
            )
            Text(
                text = label,
                style = AppTypography.secondary,
                color = AppColors.textSecondary
            )
        }
    }
}

@Composable
private fun PrefetchCard(
    status: PrefetchStatus,
    error: String?,
    onPrefetch: () -> Unit,
    onRefresh: () -> Unit
) {
    CPCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(AppSpacing.minTouchTarget)
                    .clip(RoundedCornerShape(AppSpacing.sm))
                    .background(Primary100),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.CloudDownload,
                    contentDescription = null,
                    tint = Primary600,
                    modifier = Modifier.size(AppSpacing.xl)
                )
            }

            Spacer(modifier = Modifier.width(AppSpacing.md))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = stringResource(R.string.nav_drawings),
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold
                )
                if (status.loading) {
                    Text(
                        text = stringResource(R.string.common_loading),
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                } else {
                    Text(
                        text = "${status.cached}/${status.total} cached (${status.percent}%)",
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                    if (status.downloading > 0) {
                        Text(
                            text = "${status.downloading} downloading",
                            style = AppTypography.caption,
                            color = Primary600
                        )
                    }
                }
                error?.let {
                    Text(
                        text = it,
                        style = AppTypography.caption,
                        color = ConstructionRed
                    )
                }
            }

            CPButton(
                text = "Prefetch",
                onClick = onPrefetch,
                size = CPButtonSize.Small
            )
        }
    }
}

@Composable
private fun UploadCard(
    uploadCategory: String,
    onCategoryChange: (String) -> Unit,
    onPickFile: () -> Unit,
    isUploading: Boolean,
    uploadStatus: String?
) {
    CPCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(AppSpacing.minTouchTarget)
                    .clip(RoundedCornerShape(AppSpacing.sm))
                    .background(Success100),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.CloudUpload,
                    contentDescription = null,
                    tint = Success600,
                    modifier = Modifier.size(AppSpacing.xl)
                )
            }

            Spacer(modifier = Modifier.width(AppSpacing.md))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = stringResource(R.string.card_upload_file),
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "Category: $uploadCategory",
                    style = AppTypography.secondary,
                    color = AppColors.textSecondary
                )
                if (isUploading) {
                    Text(
                        text = stringResource(R.string.common_loading),
                        style = AppTypography.caption,
                        color = Primary600
                    )
                }
                uploadStatus?.let {
                    Text(
                        text = it,
                        style = AppTypography.caption,
                        color = if (it.contains("complete", ignoreCase = true)) Success600 else Warning600
                    )
                }
            }

            CPButton(
                text = "Upload",
                onClick = onPickFile,
                size = CPButtonSize.Small,
                loading = isUploading
            )
        }
    }
}

@Composable
private fun ProjectInfoCard(project: ProjectDetail) {
    CPCard {
        Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
            // Dates Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                project.startDate?.let { startDate ->
                    Column {
                        Text(
                            text = stringResource(R.string.projects_start_date),
                            style = AppTypography.caption,
                            color = AppColors.textSecondary
                        )
                        Text(
                            text = formatDate(startDate),
                            style = AppTypography.body,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
                project.endDate?.let { endDate ->
                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = stringResource(R.string.projects_end_date),
                            style = AppTypography.caption,
                            color = AppColors.textSecondary
                        )
                        Text(
                            text = formatDate(endDate),
                            style = AppTypography.body,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            // Description
            project.description?.let { description ->
                if (description.isNotBlank()) {
                    HorizontalDivider(color = AppColors.divider)
                    Column {
                        Text(
                            text = stringResource(R.string.projects_description),
                            style = AppTypography.caption,
                            color = AppColors.textSecondary
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = description,
                            style = AppTypography.body
                        )
                    }
                }
            }

            // Visibility
            project.visibilityMode?.let { visibility ->
                HorizontalDivider(color = AppColors.divider)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Visibility",
                        style = AppTypography.caption,
                        color = AppColors.textSecondary
                    )
                    val displayText = when (visibility) {
                        "ALL" -> "All Users"
                        "ASSIGNED_ONLY" -> "Assigned Only"
                        else -> visibility.replace("_", " ")
                    }
                    val isLimited = visibility == "ASSIGNED_ONLY"
                    CPBadge(
                        text = displayText,
                        color = if (isLimited) Warning600 else Success600,
                        backgroundColor = if (isLimited) Warning100 else Success100
                    )
                }
            }
        }
    }
}

@Composable
private fun TeamCard(assignments: List<com.constructionpro.app.data.model.ProjectAssignment>) {
    CPCard {
        Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
            assignments.take(5).forEach { assignment ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CPAvatar(
                        name = assignment.user?.name ?: "?",
                        size = 40.dp
                    )
                    Spacer(modifier = Modifier.width(AppSpacing.sm))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = assignment.user?.name ?: "Unknown",
                            style = AppTypography.bodySemibold,
                            fontWeight = FontWeight.Medium
                        )
                        assignment.user?.role?.let { userRole ->
                            Text(
                                text = userRole.replace("_", " "),
                                style = AppTypography.secondary,
                                color = AppColors.textSecondary
                            )
                        }
                    }
                }
                if (assignment != assignments.take(5).last()) {
                    HorizontalDivider(color = AppColors.divider)
                }
            }
            if (assignments.size > 5) {
                Text(
                    text = "+${assignments.size - 5} more members",
                    style = AppTypography.secondary,
                    color = AppColors.textSecondary
                )
            }
        }
    }
}

private fun formatDate(dateString: String): String {
    return try {
        val date = LocalDate.parse(dateString.substringBefore('T'))
        date.format(DateTimeFormatter.ofPattern("MMM d, yyyy"))
    } catch (e: Exception) {
        dateString.substringBefore('T')
    }
}

private suspend fun calculatePrefetchStatus(
    drawingIds: List<String>,
    cacheDao: com.constructionpro.app.data.local.DocumentCacheDao,
    downloadDao: com.constructionpro.app.data.local.DownloadEntryDao,
    source: String?
): PrefetchStatus {
    if (drawingIds.isEmpty()) {
        return PrefetchStatus(
            loading = false,
            total = 0,
            cached = 0,
            downloading = 0,
            failed = 0,
            percent = 0,
            source = source
        )
    }
    val cachedEntries = cacheDao.getByIds(drawingIds)
    val downloadEntries = downloadDao.getByIds(drawingIds)
    val cachedIds = cachedEntries.map { it.fileId }.toSet()
    val downloadingEntries = downloadEntries.filter { it.status == "DOWNLOADING" || it.status == "QUEUED" }
    val failedEntries = downloadEntries.filter { it.status == "FAILED" }
    val progressContribution = downloadingEntries.sumOf { entry ->
        entry.progress.coerceIn(0, 100).toDouble() / 100.0
    }
    val total = drawingIds.size
    val percent = (((cachedIds.size + progressContribution) / total.toDouble()) * 100.0)
        .roundToInt()
        .coerceIn(0, 100)
    return PrefetchStatus(
        loading = false,
        total = total,
        cached = cachedIds.size,
        downloading = downloadingEntries.size,
        failed = failedEntries.size,
        percent = percent,
        source = source
    )
}

private fun resolveFileName(resolver: ContentResolver, uri: Uri): String? {
    resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
        if (cursor.moveToFirst()) {
            val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (index >= 0) {
                return cursor.getString(index)
            }
        }
    }
    return null
}

private fun buildStreamingRequestBody(
    resolver: ContentResolver,
    uri: Uri,
    mimeType: String
): RequestBody {
    val length = resolver.openAssetFileDescriptor(uri, "r")?.use { it.length } ?: -1L
    return object : RequestBody() {
        override fun contentType() = mimeType.toMediaType()

        override fun contentLength(): Long {
            return if (length >= 0) length else -1L
        }

        override fun writeTo(sink: BufferedSink) {
            resolver.openInputStream(uri)?.use { input ->
                sink.writeAll(input.source())
            }
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

@Composable
private fun TeamManagementDialog(
    state: ProjectTeamState,
    onDismiss: () -> Unit,
    onToggleUser: (String) -> Unit,
    onVisibilityChange: (String) -> Unit,
    onSave: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = "Manage Team",
                style = AppTypography.heading2,
                color = MaterialTheme.colorScheme.onSurface
            )
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 450.dp)
            ) {
                if (state.loading) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(200.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                } else if (state.error != null) {
                    Text(
                        text = state.error,
                        color = ConstructionRed,
                        style = AppTypography.body
                    )
                } else {
                    // Visibility Mode Toggle
                    Text(
                        text = "Project Visibility",
                        style = AppTypography.bodySemibold,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(AppSpacing.xs))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                    ) {
                        FilterChip(
                            selected = state.visibilityMode == "ASSIGNED_ONLY",
                            onClick = { onVisibilityChange("ASSIGNED_ONLY") },
                            label = { Text("Assigned Only") },
                            modifier = Modifier.weight(1f)
                        )
                        FilterChip(
                            selected = state.visibilityMode == "ALL",
                            onClick = { onVisibilityChange("ALL") },
                            label = { Text("All Users") },
                            modifier = Modifier.weight(1f)
                        )
                    }

                    Spacer(modifier = Modifier.height(AppSpacing.md))
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                    Spacer(modifier = Modifier.height(AppSpacing.md))

                    Text(
                        text = "Team Members (${state.selectedUserIds.size} selected)",
                        style = AppTypography.bodySemibold,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(AppSpacing.sm))

                    androidx.compose.foundation.lazy.LazyColumn(
                        modifier = Modifier.weight(1f, fill = false),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        items(state.allUsers.size) { index ->
                            val user = state.allUsers[index]
                            val isSelected = state.selectedUserIds.contains(user.id)

                            Surface(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(AppSpacing.xs),
                                color = if (isSelected) MaterialTheme.colorScheme.surfaceVariant else Color.Transparent,
                                onClick = { onToggleUser(user.id) }
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(AppSpacing.sm),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Checkbox(
                                        checked = isSelected,
                                        onCheckedChange = { onToggleUser(user.id) }
                                    )
                                    Spacer(modifier = Modifier.width(AppSpacing.sm))
                                    CPAvatar(name = user.name, size = 36.dp)
                                    Spacer(modifier = Modifier.width(AppSpacing.sm))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = user.name,
                                            style = AppTypography.bodySemibold,
                                            fontWeight = FontWeight.Medium,
                                            color = MaterialTheme.colorScheme.onSurface
                                        )
                                        user.role?.let { role ->
                                            Text(
                                                text = role.replace("_", " "),
                                                style = AppTypography.secondary,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onSave,
                enabled = !state.saving && !state.loading
            ) {
                if (state.saving) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Text("Save")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}
