package com.constructionpro.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.constructionpro.app.R
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.local.AppDatabase
import com.constructionpro.app.data.local.toModel
import com.constructionpro.app.data.model.Warning
import com.constructionpro.app.data.model.WarningSeverity
import com.constructionpro.app.data.model.WarningStatus
import com.constructionpro.app.data.model.WarningTypes
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.LocalDate
import java.time.format.DateTimeFormatter

private data class WarningDetailState(
    val loading: Boolean = false,
    val warning: Warning? = null,
    val error: String? = null,
    val offline: Boolean = false,
    val acknowledging: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WarningDetailScreen(
    warningId: String,
    apiService: ApiService,
    onBack: () -> Unit,
    onEdit: (String) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(WarningDetailState(loading = true)) }
    val warningDao = remember { AppDatabase.getInstance(context).warningDao() }

    fun loadWarning() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val warning = withContext(Dispatchers.IO) {
                    apiService.getWarning(warningId)
                }
                state = state.copy(loading = false, warning = warning, offline = false)
            } catch (e: Exception) {
                // Try cache
                val cached = withContext(Dispatchers.IO) {
                    warningDao.getById(warningId)?.toModel()
                }
                state = state.copy(
                    loading = false,
                    warning = cached,
                    offline = cached != null,
                    error = if (cached == null) (e.message ?: "Failed to load warning") else null
                )
            }
        }
    }

    fun acknowledgeWarning() {
        scope.launch {
            state = state.copy(acknowledging = true)
            try {
                withContext(Dispatchers.IO) {
                    apiService.acknowledgeWarning(warningId)
                }
                loadWarning()
            } catch (e: Exception) {
                state = state.copy(
                    acknowledging = false,
                    error = e.message ?: "Failed to acknowledge warning"
                )
            }
        }
    }

    LaunchedEffect(warningId) {
        loadWarning()
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.warnings_details),
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.common_back)
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { loadWarning() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                }
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when {
                state.loading -> {
                    CPLoadingIndicator(
                        message = stringResource(R.string.warnings_loading),
                        modifier = Modifier.align(Alignment.Center)
                    )
                }
                state.error != null && state.warning == null -> {
                    CPErrorBanner(
                        message = state.error ?: "An error occurred",
                        onRetry = { loadWarning() },
                        modifier = Modifier.padding(AppSpacing.md)
                    )
                }
                state.warning != null -> {
                    WarningDetailContent(
                        warning = state.warning!!,
                        offline = state.offline,
                        acknowledging = state.acknowledging,
                        onAcknowledge = { acknowledgeWarning() },
                        onEdit = { onEdit(warningId) }
                    )
                }
            }
        }
    }
}

@Composable
private fun WarningDetailContent(
    warning: Warning,
    offline: Boolean,
    acknowledging: Boolean,
    onAcknowledge: () -> Unit,
    onEdit: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(AppSpacing.md),
        verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
    ) {
        if (offline) {
            CPOfflineIndicator()
        }

        // Header Card
        CPCard {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm),
                    modifier = Modifier.weight(1f)
                ) {
                    SeverityIndicatorLarge(severity = warning.severity)
                    Column {
                        Text(
                            text = warning.employee?.name ?: "Unknown Employee",
                            style = AppTypography.heading2,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = WarningTypes.displayName(warning.warningType),
                            style = AppTypography.heading3,
                            color = AppColors.textSecondary
                        )
                    }
                }
                CPStatusBadge(status = warning.status)
            }
        }

        // Description
        CPCard {
            Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)) {
                Text(
                    text = stringResource(R.string.warnings_description),
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = warning.description,
                    style = AppTypography.bodyLarge,
                    color = AppColors.textSecondary
                )
            }
        }

        // Details Grid
        CPCard {
            Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                Text(
                    text = stringResource(R.string.warnings_details),
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold
                )

                DetailRow(
                    icon = Icons.Default.CalendarToday,
                    label = stringResource(R.string.warnings_date),
                    value = formatDate(warning.incidentDate)
                )

                DetailRow(
                    icon = Icons.Default.Warning,
                    label = "Severity",
                    value = WarningSeverity.displayName(warning.severity)
                )

                warning.project?.name?.let { projectName ->
                    DetailRow(
                        icon = Icons.Default.Business,
                        label = "Project",
                        value = projectName
                    )
                }

                warning.issuedBy?.name?.let { issuer ->
                    DetailRow(
                        icon = Icons.Default.Person,
                        label = stringResource(R.string.warnings_issued_by),
                        value = issuer
                    )
                }

                warning.witnessNames?.let { witnesses ->
                    if (witnesses.isNotBlank()) {
                        DetailRow(
                            icon = Icons.Default.Group,
                            label = "Witnesses",
                            value = witnesses
                        )
                    }
                }
            }
        }

        // Action Required
        warning.actionRequired?.let { action ->
            if (action.isNotBlank()) {
                CPCard {
                    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Assignment,
                                contentDescription = null,
                                tint = Warning600,
                                modifier = Modifier.size(AppSpacing.lg)
                            )
                            Spacer(modifier = Modifier.width(AppSpacing.xs))
                            Text(
                                text = "Action Required",
                                style = AppTypography.heading3,
                                fontWeight = FontWeight.SemiBold,
                                color = Warning600
                            )
                        }
                        Text(
                            text = action,
                            style = AppTypography.bodyLarge,
                            color = AppColors.textSecondary
                        )
                    }
                }
            }
        }

        // Acknowledgment Status
        CPCard {
            if (warning.acknowledged) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(AppSpacing.xs))
                        .background(Success100)
                        .padding(AppSpacing.sm),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = null,
                        tint = Success600,
                        modifier = Modifier.size(AppSpacing.iconLarge)
                    )
                    Spacer(modifier = Modifier.width(AppSpacing.sm))
                    Column {
                        Text(
                            text = stringResource(R.string.warnings_acknowledged),
                            style = AppTypography.bodySemibold,
                            fontWeight = FontWeight.SemiBold,
                            color = Success600
                        )
                        warning.acknowledgedAt?.let { acknowledgedAt ->
                            Text(
                                text = formatDateTime(acknowledgedAt),
                                style = AppTypography.secondary,
                                color = Success600
                            )
                        }
                    }
                }
            } else if (warning.status == WarningStatus.ACTIVE) {
                Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(AppSpacing.xs))
                            .background(Warning100)
                            .padding(AppSpacing.sm),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Pending,
                            contentDescription = null,
                            tint = Warning600,
                            modifier = Modifier.size(AppSpacing.iconLarge)
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.sm))
                        Text(
                            text = stringResource(R.string.warnings_pending_ack),
                            style = AppTypography.bodySemibold,
                            fontWeight = FontWeight.SemiBold,
                            color = Warning600
                        )
                    }

                    Button(
                        onClick = onAcknowledge,
                        enabled = !acknowledging && !offline,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Primary600
                        )
                    ) {
                        if (acknowledging) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(AppSpacing.lg),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                            Spacer(modifier = Modifier.width(AppSpacing.xs))
                        }
                        Text(stringResource(R.string.warnings_acknowledgment))
                    }
                }
            }
        }

        // Metadata
        CPCard {
            Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)) {
                Text(
                    text = "Record Information",
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold
                )
                warning.createdAt?.let { createdAt ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Created",
                            style = AppTypography.body,
                            color = AppColors.textMuted
                        )
                        Text(
                            text = formatDateTime(createdAt),
                            style = AppTypography.body
                        )
                    }
                }
            }
        }

        // Bottom spacing
        Spacer(modifier = Modifier.height(AppSpacing.xxl))
    }
}

@Composable
private fun DetailRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = AppColors.textMuted,
            modifier = Modifier.size(AppSpacing.lg)
        )
        Spacer(modifier = Modifier.width(AppSpacing.sm))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = label,
                style = AppTypography.caption,
                color = AppColors.textMuted
            )
            Text(
                text = value,
                style = AppTypography.body
            )
        }
    }
}

@Composable
private fun SeverityIndicatorLarge(severity: String) {
    val (color, backgroundColor) = when (severity) {
        WarningSeverity.VERBAL -> Pair(Primary600, Primary100)
        WarningSeverity.WRITTEN -> Pair(Warning600, Warning100)
        WarningSeverity.FINAL -> Pair(Error600, Error100)
        else -> Pair(Primary600, Primary100)
    }

    Box(
        modifier = Modifier
            .size(AppSpacing.iconCircleLarge)
            .clip(CircleShape)
            .background(backgroundColor),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = when (severity) {
                WarningSeverity.VERBAL -> Icons.Default.RecordVoiceOver
                WarningSeverity.WRITTEN -> Icons.Default.Description
                WarningSeverity.FINAL -> Icons.Default.Gavel
                else -> Icons.Default.Warning
            },
            contentDescription = severity,
            tint = color,
            modifier = Modifier.size(AppSpacing.iconXL)
        )
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

private fun formatDateTime(dateString: String): String {
    return try {
        val date = LocalDate.parse(dateString.substringBefore('T'))
        date.format(DateTimeFormatter.ofPattern("MMM d, yyyy"))
    } catch (e: Exception) {
        dateString.substringBefore('T')
    }
}
