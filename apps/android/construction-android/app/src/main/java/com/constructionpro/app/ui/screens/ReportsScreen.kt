package com.constructionpro.app.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
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
import com.constructionpro.app.R
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.model.*
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.LocalDate
import java.time.format.DateTimeFormatter

private data class ReportsState(
    val loading: Boolean = false,
    val reports: List<GeneratedReport> = emptyList(),
    val projects: List<ProjectSummary> = emptyList(),
    val error: String? = null,
    val showGenerateDialog: Boolean = false,
    val generating: Boolean = false
)

private data class GenerateFormState(
    val type: String = ReportType.PROJECT_SUMMARY,
    val projectId: String? = null,
    val period: String = ReportPeriod.THIS_MONTH,
    val format: String = "PDF"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportsScreen(
    apiService: ApiService,
    onBack: () -> Unit,
    onOpenReport: (String) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(ReportsState(loading = true)) }
    var formState by remember { mutableStateOf(GenerateFormState()) }
    val configuration = LocalConfiguration.current
    val isNarrow = configuration.screenWidthDp < 360

    fun loadReports() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val reports = withContext(Dispatchers.IO) {
                    apiService.getGeneratedReports()
                }
                val projects = withContext(Dispatchers.IO) {
                    try {
                        apiService.getProjects().projects
                    } catch (e: Exception) {
                        emptyList()
                    }
                }
                state = state.copy(loading = false, reports = reports, projects = projects)
            } catch (e: Exception) {
                android.util.Log.e("ReportsScreen", "Failed to load reports", e)
                state = state.copy(
                    loading = false,
                    error = "Failed to load reports: ${e.message}"
                )
            }
        }
    }

    fun generateReport() {
        scope.launch {
            state = state.copy(generating = true)
            try {
                val request = ReportRequest(
                    type = formState.type,
                    projectId = formState.projectId,
                    period = formState.period,
                    format = formState.format
                )
                val generatedReport = withContext(Dispatchers.IO) {
                    apiService.generateReport(request)
                }
                // Add the generated report to the local list immediately
                // (The server doesn't persist reports yet, so we need to keep them locally)
                state = state.copy(
                    generating = false,
                    showGenerateDialog = false,
                    reports = listOf(generatedReport) + state.reports
                )
                formState = GenerateFormState()
            } catch (e: Exception) {
                android.util.Log.e("ReportsScreen", "Failed to generate report", e)
                state = state.copy(
                    generating = false,
                    error = e.message ?: "Failed to generate report"
                )
            }
        }
    }

    LaunchedEffect(Unit) {
        loadReports()
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.reports_title),
                subtitle = stringResource(R.string.reports_generated_count, state.reports.size),
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.common_back)
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { loadReports() }) {
                        Icon(Icons.Default.Refresh, contentDescription = stringResource(R.string.common_refresh))
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { state = state.copy(showGenerateDialog = true) },
                containerColor = AppColors.primary600
            ) {
                Icon(Icons.Default.Add, contentDescription = stringResource(R.string.reports_generate))
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(AppSpacing.md),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            // Error Banner
            if (state.error != null) {
                item {
                    CPErrorBanner(
                        message = state.error ?: "An error occurred",
                        onRetry = { loadReports() },
                        onDismiss = { state = state.copy(error = null) }
                    )
                }
            }

            // Quick Generate Section
            item {
                CPCard {
                    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                        Text(
                            text = stringResource(R.string.reports_quick_reports),
                            style = AppTypography.heading3,
                            fontWeight = FontWeight.SemiBold
                        )

                        if (isNarrow) {
                            Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)) {
                                QuickReportButton(
                                    title = stringResource(R.string.reports_project_summary),
                                    icon = Icons.Default.Folder,
                                    onClick = {
                                        formState = GenerateFormState(type = ReportType.PROJECT_SUMMARY)
                                        state = state.copy(showGenerateDialog = true)
                                    },
                                    modifier = Modifier.fillMaxWidth()
                                )
                                QuickReportButton(
                                    title = stringResource(R.string.reports_labor_report),
                                    icon = Icons.Default.People,
                                    onClick = {
                                        formState = GenerateFormState(type = ReportType.LABOR)
                                        state = state.copy(showGenerateDialog = true)
                                    },
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                        } else {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                            ) {
                                QuickReportButton(
                                    title = stringResource(R.string.reports_project_summary),
                                    icon = Icons.Default.Folder,
                                    onClick = {
                                        formState = GenerateFormState(type = ReportType.PROJECT_SUMMARY)
                                        state = state.copy(showGenerateDialog = true)
                                    },
                                    modifier = Modifier.weight(1f)
                                )
                                QuickReportButton(
                                    title = stringResource(R.string.reports_labor_report),
                                    icon = Icons.Default.People,
                                    onClick = {
                                        formState = GenerateFormState(type = ReportType.LABOR)
                                        state = state.copy(showGenerateDialog = true)
                                    },
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }
                    }
                }
            }

            // Section Header
            item {
                Text(
                    text = stringResource(R.string.reports_generated_reports),
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(top = AppSpacing.xs)
                )
            }

            // Loading State
            if (state.loading && state.reports.isEmpty()) {
                item { CPLoadingIndicator(message = stringResource(R.string.reports_loading)) }
            }

            // Empty State
            if (!state.loading && state.reports.isEmpty() && state.error == null) {
                item {
                    CPEmptyState(
                        icon = Icons.Default.Assessment,
                        title = stringResource(R.string.reports_empty_title),
                        description = stringResource(R.string.reports_empty_desc)
                    )
                }
            }

            // Report Cards
            items(state.reports) { report ->
                ReportCard(
                    report = report,
                    onClick = { onOpenReport(report.id) },
                    onDownload = {
                        report.fileUrl?.let { url ->
                            val intent = Intent(Intent.ACTION_VIEW).apply {
                                data = Uri.parse(url)
                            }
                            context.startActivity(intent)
                        }
                    }
                )
            }

            // Bottom spacing
            item { Spacer(modifier = Modifier.height(AppSpacing.bottomNavHeight)) }
        }
    }

    // Generate Report Dialog
    if (state.showGenerateDialog) {
        GenerateReportDialog(
            formState = formState,
            onFormStateChange = { formState = it },
            projects = state.projects,
            generating = state.generating,
            onGenerate = { generateReport() },
            onDismiss = {
                if (!state.generating) {
                    state = state.copy(showGenerateDialog = false)
                    formState = GenerateFormState()
                }
            }
        )
    }
}

@Composable
private fun QuickReportButton(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    OutlinedButton(
        onClick = onClick,
        modifier = modifier
    ) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(AppSpacing.iconMedium))
        Spacer(modifier = Modifier.width(AppSpacing.xs))
        Text(title)
    }
}

@Composable
private fun ReportCard(
    report: GeneratedReport,
    onClick: () -> Unit,
    onDownload: () -> Unit
) {
    CPCard(onClick = onClick) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top
        ) {
            Row(
                modifier = Modifier.weight(1f),
                horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
            ) {
                // Report Type Icon
                Box(
                    modifier = Modifier
                        .size(AppSpacing.iconCircleMedium)
                        .clip(RoundedCornerShape(AppSpacing.xs))
                        .background(Primary100),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = getReportIcon(report.type),
                        contentDescription = null,
                        tint = AppColors.primary600,
                        modifier = Modifier.size(AppSpacing.xl)
                    )
                }

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = report.name,
                        style = AppTypography.heading3,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    Text(
                        text = ReportType.displayName(report.type),
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )

                    Spacer(modifier = Modifier.height(AppSpacing.xxs))

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
                    ) {
                        // Format badge
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(AppSpacing.xxs))
                                .background(AppColors.gray100)
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = report.format,
                                style = AppTypography.caption
                            )
                        }

                        // Date
                        Text(
                            text = formatReportDate(report.createdAt),
                            style = AppTypography.caption,
                            color = AppColors.textMuted
                        )
                    }
                }
            }

            Column(
                horizontalAlignment = Alignment.End,
                verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)
            ) {
                // Status
                ReportStatusBadge(status = report.status)

                // Download button if ready
                if (report.status == "READY" && report.fileUrl != null) {
                    IconButton(
                        onClick = onDownload,
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Download,
                            contentDescription = stringResource(R.string.reports_download),
                            tint = AppColors.primary600
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ReportStatusBadge(status: String) {
    val (backgroundColor, textColor) = when (status) {
        "READY" -> Pair(Success100, Success600)
        "GENERATING" -> Pair(Warning100, Warning600)
        "FAILED" -> Pair(Error100, Error600)
        else -> Pair(Primary100, AppColors.primary600)
    }

    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(AppSpacing.xxs))
            .background(backgroundColor)
            .padding(horizontal = AppSpacing.xs, vertical = AppSpacing.xxs)
    ) {
        Text(
            text = status.lowercase().replaceFirstChar { it.uppercase() },
            style = AppTypography.caption,
            color = textColor,
            fontWeight = FontWeight.Medium
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun GenerateReportDialog(
    formState: GenerateFormState,
    onFormStateChange: (GenerateFormState) -> Unit,
    projects: List<ProjectSummary>,
    generating: Boolean,
    onGenerate: () -> Unit,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = { if (!generating) onDismiss() },
        sheetState = sheetState,
        containerColor = AppColors.cardBackground
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = AppSpacing.md)
                .padding(bottom = AppSpacing.xxl),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.lg)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = stringResource(R.string.reports_generate),
                    style = AppTypography.heading2,
                    fontWeight = FontWeight.Bold
                )
                IconButton(onClick = { if (!generating) onDismiss() }) {
                    Icon(Icons.Default.Close, contentDescription = stringResource(R.string.common_close))
                }
            }

            // Report Type Section
            CPCard {
                Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Description,
                            contentDescription = null,
                            tint = AppColors.primary600,
                            modifier = Modifier.size(AppSpacing.lg)
                        )
                        Text(
                            text = stringResource(R.string.reports_type),
                            style = AppTypography.heading3,
                            fontWeight = FontWeight.SemiBold
                        )
                    }

                    val typeChunks = ReportType.all.chunked(2)
                    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)) {
                        for (chunk in typeChunks) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                            ) {
                                for (type in chunk) {
                                    FilterChip(
                                        selected = formState.type == type,
                                        onClick = {
                                            if (!generating) {
                                                onFormStateChange(formState.copy(type = type))
                                            }
                                        },
                                        label = { Text(ReportType.displayName(type), maxLines = 1) },
                                        colors = FilterChipDefaults.filterChipColors(
                                            selectedContainerColor = Primary600.copy(alpha = 0.15f),
                                            selectedLabelColor = Primary600
                                        ),
                                        modifier = Modifier
                                            .weight(1f)
                                            .height(40.dp)
                                    )
                                }
                                if (chunk.size == 1) {
                                    Spacer(modifier = Modifier.weight(1f))
                                }
                            }
                        }
                    }
                }
            }

            // Time Period Section
            CPCard {
                Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                    ) {
                        Icon(
                            imageVector = Icons.Default.DateRange,
                            contentDescription = null,
                            tint = AppColors.primary600,
                            modifier = Modifier.size(AppSpacing.lg)
                        )
                        Text(
                            text = stringResource(R.string.reports_time_period),
                            style = AppTypography.heading3,
                            fontWeight = FontWeight.SemiBold
                        )
                    }

                    val periodChunks = ReportPeriod.all.chunked(2)
                    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)) {
                        for (chunk in periodChunks) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                            ) {
                                for (period in chunk) {
                                    FilterChip(
                                        selected = formState.period == period,
                                        onClick = {
                                            if (!generating) {
                                                onFormStateChange(formState.copy(period = period))
                                            }
                                        },
                                        label = { Text(ReportPeriod.displayName(period), maxLines = 1) },
                                        colors = FilterChipDefaults.filterChipColors(
                                            selectedContainerColor = Primary600.copy(alpha = 0.15f),
                                            selectedLabelColor = Primary600
                                        ),
                                        modifier = Modifier
                                            .weight(1f)
                                            .height(40.dp)
                                    )
                                }
                                if (chunk.size == 1) {
                                    Spacer(modifier = Modifier.weight(1f))
                                }
                            }
                        }
                    }
                }
            }

            // Format Section
            CPCard {
                Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                    ) {
                        Icon(
                            imageVector = Icons.Default.FileDownload,
                            contentDescription = null,
                            tint = AppColors.primary600,
                            modifier = Modifier.size(AppSpacing.lg)
                        )
                        Text(
                            text = stringResource(R.string.reports_format),
                            style = AppTypography.heading3,
                            fontWeight = FontWeight.SemiBold
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        listOf("PDF" to Icons.Default.PictureAsPdf, "CSV" to Icons.Default.TableChart, "XLSX" to Icons.Default.GridOn).forEach { (format, icon) ->
                            FilterChip(
                                selected = formState.format == format,
                                onClick = {
                                    if (!generating) {
                                        onFormStateChange(formState.copy(format = format))
                                    }
                                },
                                label = {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xxs)
                                    ) {
                                        Icon(icon, null, modifier = Modifier.size(AppSpacing.md))
                                        Text(format)
                                    }
                                },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = AppColors.primary600.copy(alpha = 0.15f),
                                    selectedLabelColor = AppColors.primary600
                                ),
                                modifier = Modifier
                                    .weight(1f)
                                    .height(40.dp)
                            )
                        }
                    }
                }
            }

            // Action Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
            ) {
                OutlinedButton(
                    onClick = { if (!generating) onDismiss() },
                    enabled = !generating,
                    modifier = Modifier
                        .weight(1f)
                        .height(56.dp)
                ) {
                    Text(stringResource(R.string.common_cancel))
                }

                CPButton(
                    text = if (generating) stringResource(R.string.reports_generating) else stringResource(R.string.reports_generate),
                    onClick = onGenerate,
                    enabled = !generating,
                    loading = generating,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

private fun getReportIcon(type: String) = when (type) {
    ReportType.PROJECT_SUMMARY -> Icons.Default.Folder
    ReportType.FINANCIAL -> Icons.Default.AttachMoney
    ReportType.LABOR -> Icons.Default.People
    ReportType.SAFETY -> Icons.Default.HealthAndSafety
    ReportType.DAILY_LOG -> Icons.Default.DateRange
    ReportType.EQUIPMENT -> Icons.Default.Construction
    else -> Icons.Default.Assessment
}

private fun formatReportDate(dateString: String): String {
    return try {
        val date = LocalDate.parse(dateString.substringBefore('T'))
        date.format(DateTimeFormatter.ofPattern("MMM d, yyyy"))
    } catch (e: Exception) {
        dateString.substringBefore('T')
    }
}
