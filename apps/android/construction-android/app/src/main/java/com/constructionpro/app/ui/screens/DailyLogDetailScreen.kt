package com.constructionpro.app.ui.screens

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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.constructionpro.app.R
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.model.DailyLogDetail
import com.constructionpro.app.data.model.DailyLogEntry
import com.constructionpro.app.data.model.DailyLogPhoto
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.LocalDate
import java.time.format.DateTimeFormatter

private data class DailyLogDetailState(
    val loading: Boolean = false,
    val dailyLog: DailyLogDetail? = null,
    val error: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DailyLogDetailScreen(
    apiService: ApiService,
    logId: String,
    onBack: () -> Unit,
    onEditLog: (String) -> Unit
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(DailyLogDetailState(loading = true)) }
    var profileId by remember { mutableStateOf<String?>(null) }
    var profileRole by remember { mutableStateOf<String?>(null) }

    fun loadLog() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val response = withContext(Dispatchers.IO) { apiService.getDailyLog(logId) }
                state = state.copy(loading = false, dailyLog = response.dailyLog)
            } catch (error: Exception) {
                state = state.copy(loading = false, error = error.message ?: "Failed to load daily log")
            }
        }
    }

    fun loadProfile() {
        scope.launch {
            try {
                val profile = withContext(Dispatchers.IO) { apiService.getProfile() }
                profileId = profile.id
                profileRole = profile.role
            } catch (_: Exception) {
                profileId = null
                profileRole = null
            }
        }
    }

    LaunchedEffect(logId) {
        loadLog()
        loadProfile()
    }

    val canEdit = state.dailyLog?.let { log ->
        val role = profileRole
        val isOwner = profileId != null && profileId == log.submitter?.id
        val isSuperintendent = role == "SUPERINTENDENT"
        val isProjectManager = role == "PROJECT_MANAGER"
        val isAdmin = role == "ADMIN"
        val isApproved = log.status == "APPROVED"
        if (isApproved) {
            isProjectManager || isAdmin
        } else {
            isOwner || isSuperintendent || isProjectManager || isAdmin
        }
    } ?: false

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.daily_logs_title),
                subtitle = state.dailyLog?.project?.name,
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
                    if (canEdit) {
                        IconButton(onClick = { onEditLog(logId) }) {
                            Icon(
                                imageVector = Icons.Default.Edit,
                                contentDescription = stringResource(R.string.common_save),
                                tint = Primary600
                            )
                        }
                    }
                    IconButton(onClick = { loadLog() }) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Refresh",
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
                message = stringResource(R.string.daily_logs_loading)
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
                    onRetry = { loadLog() },
                    onDismiss = { state = state.copy(error = null) }
                )
            }
        } else {
            state.dailyLog?.let { log ->
                LazyColumn(
                    modifier = Modifier
                        .padding(padding)
                        .fillMaxSize(),
                    contentPadding = PaddingValues(AppSpacing.md),
                    verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
                ) {
                    // Header Card with Status and Date
                    item {
                        LogHeaderCard(log)
                    }

                    // Weather Section (Amber themed)
                    item {
                        WeatherSection(log)
                    }

                    // Notes Section
                    if (!log.notes.isNullOrBlank()) {
                        item {
                            NotesSection(log.notes)
                        }
                    }

                    // Photos Section
                    if (log.photos.isNotEmpty()) {
                        item {
                            CPSectionHeader(title = stringResource(R.string.daily_logs_photos) + " (${log.photos.size})")
                        }
                        items(log.photos) { photo ->
                            PhotoCard(photo)
                        }
                    }

                    // Submitter Info
                    item {
                        SubmitterSection(log)
                    }

                    item { Spacer(modifier = Modifier.height(AppSpacing.md)) }
                }
            }
        }
    }
}

@Composable
private fun LogHeaderCard(log: DailyLogDetail) {
    CPCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                // Date
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.CalendarToday,
                        contentDescription = null,
                        tint = Primary600,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(AppSpacing.xs))
                    Text(
                        text = formatDate(log.date),
                        style = AppTypography.heading2,
                        fontWeight = FontWeight.Bold,
                        color = AppColors.textPrimary
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                // Project
                log.project?.name?.let { projectName ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Folder,
                            contentDescription = null,
                            tint = AppColors.textSecondary,
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

            // Status Badge
            log.status?.let { status ->
                CPStatusBadge(status = status)
            }
        }
    }
}

@Composable
private fun WeatherSection(log: DailyLogDetail) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(AppSpacing.sm),
        color = Warning50
    ) {
        Column(modifier = Modifier.padding(AppSpacing.md)) {
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.WbSunny,
                    contentDescription = null,
                    tint = Warning600,
                    modifier = Modifier.size(AppSpacing.xl)
                )
                Spacer(modifier = Modifier.width(AppSpacing.xs))
                Text(
                    text = stringResource(R.string.daily_logs_weather),
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold,
                    color = Warning800
                )
            }

            Spacer(modifier = Modifier.height(AppSpacing.sm))

            log.weatherData?.let { weather ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    // Temperature
                    Column {
                        Text(
                            text = "${weather.temperature ?: "--"}${weather.temperatureUnit ?: ""}",
                            style = AppTypography.statMedium,
                            fontWeight = FontWeight.Bold,
                            color = Warning900
                        )
                        Text(
                            text = weather.condition ?: "Unknown",
                            style = AppTypography.body,
                            color = Warning700
                        )
                    }

                    // Wind & Humidity
                    Column(horizontalAlignment = Alignment.End) {
                        weather.windSpeed?.let { windSpeed ->
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.Air,
                                    contentDescription = null,
                                    tint = Warning600,
                                    modifier = Modifier.size(AppSpacing.md)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "$windSpeed ${weather.windDirection ?: ""}",
                                    style = AppTypography.body,
                                    color = Warning700
                                )
                            }
                        }
                        weather.humidity?.let { humidity ->
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.WaterDrop,
                                    contentDescription = null,
                                    tint = Warning600,
                                    modifier = Modifier.size(AppSpacing.md)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "$humidity%",
                                    style = AppTypography.body,
                                    color = Warning700
                                )
                            }
                        }
                    }
                }
            } ?: Text(
                text = "Weather not captured",
                style = AppTypography.body,
                color = Warning600
            )

            // Weather Delay
            if (log.weatherDelay == true) {
                Spacer(modifier = Modifier.height(AppSpacing.sm))
                Surface(
                    shape = RoundedCornerShape(AppSpacing.xs),
                    color = Error100
                ) {
                    Row(
                        modifier = Modifier.padding(AppSpacing.xs),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Warning,
                            contentDescription = null,
                            tint = Error600,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.xs))
                        Column {
                            Text(
                                text = stringResource(R.string.daily_logs_weather_delay),
                                style = AppTypography.secondaryMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = Error700
                            )
                            log.weatherDelayNotes?.let { notes ->
                                Text(
                                    text = notes,
                                    style = AppTypography.secondary,
                                    color = Error600
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun NotesSection(notes: String) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(AppSpacing.sm),
        color = Primary50
    ) {
        Column(modifier = Modifier.padding(AppSpacing.md)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Notes,
                    contentDescription = null,
                    tint = AppColors.primary600,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(AppSpacing.xs))
                Text(
                    text = stringResource(R.string.daily_logs_notes),
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold,
                    color = Primary700
                )
            }
            Spacer(modifier = Modifier.height(AppSpacing.xs))
            Text(
                text = notes,
                style = AppTypography.body,
                color = Primary800
            )
        }
    }
}

@Composable
private fun PhotoCard(photo: DailyLogPhoto) {
    CPCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Photo thumbnail placeholder
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(RoundedCornerShape(AppSpacing.xs))
                    .background(Gray200),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Image,
                    contentDescription = null,
                    tint = Gray500,
                    modifier = Modifier.size(28.dp)
                )
            }

            Spacer(modifier = Modifier.width(AppSpacing.sm))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = photo.name ?: "Photo",
                    style = AppTypography.bodySemibold,
                    fontWeight = FontWeight.Medium,
                    color = AppColors.textPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                photo.createdAt?.let { createdAt ->
                    Text(
                        text = createdAt.substringBefore('T'),
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                }
            }

            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = AppColors.textMuted
            )
        }
    }
}

@Composable
private fun SubmitterSection(log: DailyLogDetail) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(AppSpacing.sm),
        color = AppColors.gray100.copy(alpha = 0.5f)
    ) {
        Row(
            modifier = Modifier.padding(AppSpacing.md),
            verticalAlignment = Alignment.CenterVertically
        ) {
            log.submitter?.name?.let { name ->
                CPAvatar(name = name, size = 40.dp)
                Spacer(modifier = Modifier.width(AppSpacing.sm))
                Column {
                    Text(
                        text = "Submitted by",
                        style = AppTypography.caption,
                        color = AppColors.textSecondary
                    )
                    Text(
                        text = name,
                        style = AppTypography.bodySemibold,
                        fontWeight = FontWeight.Medium,
                        color = AppColors.textPrimary
                    )
                }
            }
        }
    }
}

private fun formatDate(dateString: String): String {
    return try {
        val date = LocalDate.parse(dateString.substringBefore('T'))
        date.format(DateTimeFormatter.ofPattern("MMMM d, yyyy"))
    } catch (e: Exception) {
        dateString.substringBefore('T')
    }
}
