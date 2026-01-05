package com.constructionpro.app.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.res.stringResource
import com.constructionpro.app.R
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.model.*
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.NumberFormat
import java.util.Locale

private data class AnalyticsState(
    val loading: Boolean = false,
    val dashboard: AnalyticsDashboard? = null,
    val error: String? = null,
    val selectedPeriod: String = ReportPeriod.THIS_MONTH
)

// Extension function to check if dashboard has no meaningful data
private fun AnalyticsDashboard.isEffectivelyEmpty(): Boolean {
    return summary == null &&
           projectMetrics.isNullOrEmpty() &&
           laborMetrics == null &&
           safetyMetrics == null &&
           financialMetrics == null
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AnalyticsScreen(
    apiService: ApiService,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(AnalyticsState(loading = true)) }
    val configuration = LocalConfiguration.current
    val isNarrow = configuration.screenWidthDp < 360

    // Define getMockDashboard before loadAnalytics since it's called from within
    fun getMockDashboard(): AnalyticsDashboard {
        return AnalyticsDashboard(
            summary = AnalyticsSummary(
                totalProjects = 15,
                activeProjects = 12,
                completedProjects = 3,
                onHoldProjects = 0,
                totalBudget = 2500000.0,
                totalSpent = 1950000.0,
                totalHoursLogged = 847.0,
                avgProjectCompletion = 0.78
            ),
            projectMetrics = listOf(
                ProjectMetric(
                    projectId = "1",
                    projectName = "Downtown Office Complex",
                    status = "ACTIVE",
                    progress = 0.75,
                    budget = 1200000.0,
                    spent = 890000.0,
                    hoursLogged = 2150.0,
                    dailyLogCount = 45
                ),
                ProjectMetric(
                    projectId = "2",
                    projectName = "Harbor View Apartments",
                    status = "ACTIVE",
                    progress = 0.45,
                    budget = 800000.0,
                    spent = 340000.0,
                    hoursLogged = 1200.0,
                    dailyLogCount = 28
                ),
                ProjectMetric(
                    projectId = "3",
                    projectName = "Tech Campus Phase 2",
                    status = "ACTIVE",
                    progress = 0.20,
                    budget = 500000.0,
                    spent = 95000.0,
                    hoursLogged = 420.0,
                    dailyLogCount = 12
                )
            ),
            laborMetrics = LaborMetrics(
                totalHours = 4520.0,
                regularHours = 3800.0,
                overtimeHours = 720.0,
                totalWorkers = 48,
                avgHoursPerWorker = 94.2,
                hoursThisWeek = 847.0,
                hoursLastWeek = 780.0,
                weeklyChange = 8.6
            ),
            safetyMetrics = SafetyMetrics(
                totalIncidents = 2,
                openIncidents = 1,
                closedIncidents = 1,
                daysWithoutIncident = 42,
                inspectionsDue = 2,
                inspectionsCompleted = 18,
                safetyScore = 0.94
            ),
            financialMetrics = FinancialMetrics(
                totalBudget = 2500000.0,
                totalSpent = 1950000.0,
                remainingBudget = 550000.0,
                budgetUtilization = 0.78,
                invoicesPending = 8,
                invoicesOverdue = 1,
                totalInvoiced = 1650000.0,
                totalPaid = 1450000.0
            )
        )
    }

    fun loadAnalytics() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val dashboard = withContext(Dispatchers.IO) {
                    apiService.getAnalyticsDashboard(period = state.selectedPeriod)
                }
                state = state.copy(loading = false, dashboard = dashboard)
            } catch (e: Exception) {
                android.util.Log.e("AnalyticsScreen", "Failed to load analytics", e)
                state = state.copy(
                    loading = false,
                    error = "Failed to load analytics: ${e.message}"
                )
            }
        }
    }

    LaunchedEffect(state.selectedPeriod) {
        loadAnalytics()
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.analytics_title),
                subtitle = ReportPeriod.displayName(state.selectedPeriod),
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.common_back)
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { loadAnalytics() }) {
                        Icon(Icons.Default.Refresh, contentDescription = stringResource(R.string.common_refresh))
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(AppSpacing.md),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
        ) {
            // Period Filter
            item {
                PeriodFilterChips(
                    selected = state.selectedPeriod,
                    onSelected = { state = state.copy(selectedPeriod = it) },
                    isNarrow = isNarrow
                )
            }

            // Error Banner
            if (state.error != null) {
                item {
                    CPErrorBanner(
                        message = state.error ?: "An error occurred",
                        onRetry = { loadAnalytics() },
                        onDismiss = { state = state.copy(error = null) }
                    )
                }
            }

            // Loading State
            if (state.loading) {
                item { CPLoadingIndicator(message = stringResource(R.string.analytics_loading)) }
            }

            state.dashboard?.let { dashboard ->
                // Summary KPIs - show key metrics requested by user
                item {
                    SummarySection(dashboard = dashboard, isNarrow = isNarrow)
                }

                // Project Metrics
                dashboard.projectMetrics?.takeIf { it.isNotEmpty() }?.let { metrics ->
                    item {
                        Text(
                            text = stringResource(R.string.analytics_project_performance),
                            style = AppTypography.heading3,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                    item {
                        ProjectMetricsSection(metrics = metrics)
                    }
                }

                // Labor Metrics
                dashboard.laborMetrics?.let { labor ->
                    item {
                        LaborMetricsCard(metrics = labor, isNarrow = isNarrow)
                    }
                }

                // Safety Metrics
                dashboard.safetyMetrics?.let { safety ->
                    item {
                        SafetyMetricsCard(metrics = safety, isNarrow = isNarrow)
                    }
                }

                // Financial Metrics
                dashboard.financialMetrics?.let { financial ->
                    item {
                        FinancialMetricsCard(metrics = financial, isNarrow = isNarrow)
                    }
                }
            }

            // Empty State
            if (!state.loading && state.dashboard == null && state.error == null) {
                item {
                    CPEmptyState(
                        icon = Icons.Default.Analytics,
                        title = stringResource(R.string.analytics_empty_title),
                        description = stringResource(R.string.analytics_empty_desc)
                    )
                }
            }

            // Bottom spacing
            item { Spacer(modifier = Modifier.height(AppSpacing.xxl)) }
        }
    }
}

@Composable
private fun PeriodFilterChips(
    selected: String,
    onSelected: (String) -> Unit,
    isNarrow: Boolean
) {
    val periods = listOf(
        ReportPeriod.THIS_WEEK,
        ReportPeriod.THIS_MONTH,
        ReportPeriod.LAST_30_DAYS,
        ReportPeriod.THIS_YEAR
    )

    if (isNarrow) {
        val chunks = periods.chunked(2)
        Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)) {
            for (chunk in chunks) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                ) {
                    for (period in chunk) {
                        FilterChip(
                            selected = selected == period,
                            onClick = { onSelected(period) },
                            label = { Text(ReportPeriod.displayName(period)) },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }
        }
    } else {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
        ) {
            for (period in periods) {
                FilterChip(
                    selected = selected == period,
                    onClick = { onSelected(period) },
                    label = { Text(ReportPeriod.displayName(period)) }
                )
            }
        }
    }
}

@Composable
private fun SummarySection(
    dashboard: AnalyticsDashboard,
    isNarrow: Boolean
) {
    val summary = dashboard.summary
    val safetyMetrics = dashboard.safetyMetrics
    val financialMetrics = dashboard.financialMetrics
    val laborMetrics = dashboard.laborMetrics

    // Extract key values with fallbacks
    val activeProjects = summary?.activeProjects ?: 0
    val hoursThisWeek = laborMetrics?.hoursThisWeek ?: summary?.totalHoursLogged ?: 0.0
    val budgetUtilization = financialMetrics?.budgetUtilization ?: 0.0
    val safetyIncidents = safetyMetrics?.totalIncidents ?: 0
    val pendingApprovals = financialMetrics?.invoicesPending ?: 0

    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
        // First row: Active Projects, Hours This Week
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            KpiCard(
                title = stringResource(R.string.analytics_active_projects),
                value = activeProjects.toString(),
                icon = Icons.Default.Folder,
                color = Primary600,
                modifier = Modifier.weight(1f)
            )
            KpiCard(
                title = stringResource(R.string.analytics_hours_this_week),
                value = formatNumber(hoursThisWeek),
                icon = Icons.Default.Schedule,
                color = Warning600,
                modifier = Modifier.weight(1f)
            )
        }
        // Second row: Budget Utilization, Safety Incidents
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            KpiCard(
                title = stringResource(R.string.analytics_budget_utilization),
                value = "${(budgetUtilization * 100).toInt()}%",
                icon = Icons.Default.AttachMoney,
                color = Success600,
                modifier = Modifier.weight(1f)
            )
            KpiCard(
                title = stringResource(R.string.analytics_safety_incidents),
                value = safetyIncidents.toString(),
                icon = Icons.Default.Warning,
                color = if (safetyIncidents > 0) Error600 else Success600,
                modifier = Modifier.weight(1f)
            )
        }
        // Third row: Pending Approvals (centered or full width)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            KpiCard(
                title = stringResource(R.string.analytics_pending_approvals),
                value = pendingApprovals.toString(),
                icon = Icons.Default.Pending,
                color = if (pendingApprovals > 5) Warning600 else Primary600,
                modifier = Modifier.weight(1f)
            )
            // Spacer to balance the layout on wider screens
            if (!isNarrow) {
                Spacer(modifier = Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun KpiCard(
    title: String,
    value: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    color: Color,
    modifier: Modifier = Modifier
) {
    CPCard(modifier = modifier) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(color.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.size(20.dp)
                )
            }
            Text(
                text = value,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = title,
                style = AppTypography.caption,
                color = AppColors.textSecondary,
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
private fun ProjectMetricsSection(metrics: List<ProjectMetric>) {
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
    ) {
        items(metrics) { metric ->
            ProjectMetricCard(metric = metric)
        }
    }
}

@Composable
private fun ProjectMetricCard(metric: ProjectMetric) {
    CPCard(
        modifier = Modifier.width(200.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)) {
            Text(
                text = metric.projectName,
                style = AppTypography.bodySemibold,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            // Progress bar
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = stringResource(R.string.analytics_progress),
                        style = AppTypography.caption,
                        color = AppColors.textMuted
                    )
                    Text(
                        text = "${(metric.progress * 100).toInt()}%",
                        style = AppTypography.caption,
                        fontWeight = FontWeight.Medium
                    )
                }
                LinearProgressIndicator(
                    progress = { metric.progress.toFloat() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .clip(RoundedCornerShape(3.dp)),
                    color = Primary600,
                    trackColor = Primary100
                )
            }

            // Stats
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        text = formatNumber(metric.hoursLogged),
                        style = AppTypography.secondaryMedium,
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        text = stringResource(R.string.analytics_hours),
                        style = AppTypography.caption,
                        color = AppColors.textMuted
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = metric.dailyLogCount.toString(),
                        style = AppTypography.secondaryMedium,
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        text = stringResource(R.string.analytics_logs),
                        style = AppTypography.caption,
                        color = AppColors.textMuted
                    )
                }
            }
        }
    }
}

@Composable
private fun LaborMetricsCard(
    metrics: LaborMetrics,
    isNarrow: Boolean
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
                        imageVector = Icons.Default.People,
                        contentDescription = null,
                        tint = Primary600,
                        modifier = Modifier.size(AppSpacing.xl)
                    )
                    Spacer(modifier = Modifier.width(AppSpacing.xs))
                    Text(
                        text = stringResource(R.string.analytics_labor_metrics),
                        style = AppTypography.heading3,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                // Weekly change indicator
                val changeColor = if (metrics.weeklyChange >= 0) Success600 else Error600
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .background(changeColor.copy(alpha = 0.1f))
                        .padding(horizontal = AppSpacing.xs, vertical = AppSpacing.xxs)
                ) {
                    @Suppress("DEPRECATION")
                    Icon(
                        imageVector = if (metrics.weeklyChange >= 0)
                            Icons.AutoMirrored.Filled.TrendingUp
                        else
                            Icons.Filled.TrendingDown,
                        contentDescription = null,
                        tint = changeColor,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(AppSpacing.xxs))
                    Text(
                        text = "${if (metrics.weeklyChange >= 0) "+" else ""}${metrics.weeklyChange.toInt()}%",
                        style = AppTypography.caption,
                        color = changeColor,
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            HorizontalDivider()

            if (isNarrow) {
                Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                    MetricRow(stringResource(R.string.analytics_total_hours), formatNumber(metrics.totalHours))
                    MetricRow(stringResource(R.string.analytics_regular_hours), formatNumber(metrics.regularHours))
                    MetricRow(stringResource(R.string.analytics_overtime_hours), formatNumber(metrics.overtimeHours))
                    MetricRow(stringResource(R.string.analytics_total_workers), metrics.totalWorkers.toString())
                    MetricRow(stringResource(R.string.analytics_avg_hours_worker), formatNumber(metrics.avgHoursPerWorker))
                }
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    MetricColumn(stringResource(R.string.analytics_total), formatNumber(metrics.totalHours), stringResource(R.string.analytics_hrs))
                    MetricColumn(stringResource(R.string.analytics_regular), formatNumber(metrics.regularHours), stringResource(R.string.analytics_hrs))
                    MetricColumn(stringResource(R.string.analytics_overtime), formatNumber(metrics.overtimeHours), stringResource(R.string.analytics_hrs))
                    MetricColumn(stringResource(R.string.analytics_workers), metrics.totalWorkers.toString(), "")
                }
            }
        }
    }
}

@Composable
private fun SafetyMetricsCard(
    metrics: SafetyMetrics,
    isNarrow: Boolean
) {
    CPCard {
        Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.HealthAndSafety,
                    contentDescription = null,
                    tint = Success600,
                    modifier = Modifier.size(AppSpacing.xl)
                )
                Spacer(modifier = Modifier.width(AppSpacing.xs))
                Text(
                    text = stringResource(R.string.analytics_safety_metrics),
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold
                )
            }

            // Safety Score
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(AppSpacing.xs))
                    .background(Success100)
                    .padding(AppSpacing.sm),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = stringResource(R.string.analytics_safety_score),
                    style = AppTypography.bodySemibold,
                    color = Success600
                )
                Text(
                    text = "${(metrics.safetyScore * 100).toInt()}%",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = Success600
                )
            }

            HorizontalDivider()

            if (isNarrow) {
                Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                    MetricRow(stringResource(R.string.analytics_days_without_incident), metrics.daysWithoutIncident.toString())
                    MetricRow(stringResource(R.string.analytics_total_incidents), metrics.totalIncidents.toString())
                    MetricRow(stringResource(R.string.analytics_open_incidents), metrics.openIncidents.toString())
                    MetricRow(stringResource(R.string.analytics_inspections_completed), metrics.inspectionsCompleted.toString())
                }
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    MetricColumn(stringResource(R.string.analytics_no_incidents), metrics.daysWithoutIncident.toString(), stringResource(R.string.analytics_days))
                    MetricColumn(stringResource(R.string.analytics_total), metrics.totalIncidents.toString(), stringResource(R.string.analytics_incidents))
                    MetricColumn(stringResource(R.string.analytics_open_incidents), metrics.openIncidents.toString(), stringResource(R.string.analytics_incidents))
                    MetricColumn(stringResource(R.string.analytics_inspections_completed), metrics.inspectionsCompleted.toString(), stringResource(R.string.analytics_done))
                }
            }
        }
    }
}

@Composable
private fun FinancialMetricsCard(
    metrics: FinancialMetrics,
    isNarrow: Boolean
) {
    val currencyFormat = remember { NumberFormat.getCurrencyInstance(Locale.US) }

    CPCard {
        Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.AttachMoney,
                    contentDescription = null,
                    tint = Success600,
                    modifier = Modifier.size(AppSpacing.xl)
                )
                Spacer(modifier = Modifier.width(AppSpacing.xs))
                Text(
                    text = stringResource(R.string.analytics_financial_overview),
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold
                )
            }

            // Budget utilization bar
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Budget Utilization",
                        style = AppTypography.secondaryMedium
                    )
                    Text(
                        text = "${(metrics.budgetUtilization * 100).toInt()}%",
                        style = AppTypography.secondaryMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
                LinearProgressIndicator(
                    progress = { metrics.budgetUtilization.toFloat().coerceIn(0f, 1f) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                        .clip(RoundedCornerShape(4.dp)),
                    color = if (metrics.budgetUtilization > 0.9) Error600 else Primary600,
                    trackColor = Primary100
                )
            }

            HorizontalDivider()

            if (isNarrow) {
                Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                    MetricRow(stringResource(R.string.analytics_total_budget), currencyFormat.format(metrics.totalBudget))
                    MetricRow(stringResource(R.string.analytics_total_spent), currencyFormat.format(metrics.totalSpent))
                    MetricRow(stringResource(R.string.analytics_remaining), currencyFormat.format(metrics.remainingBudget))
                    MetricRow(stringResource(R.string.analytics_invoices_pending), metrics.invoicesPending.toString())
                }
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    MetricColumn(stringResource(R.string.analytics_budget), formatCurrency(metrics.totalBudget), "")
                    MetricColumn(stringResource(R.string.analytics_spent), formatCurrency(metrics.totalSpent), "")
                    MetricColumn(stringResource(R.string.analytics_remaining), formatCurrency(metrics.remainingBudget), "")
                    MetricColumn(stringResource(R.string.analytics_pending), metrics.invoicesPending.toString(), stringResource(R.string.analytics_invoices))
                }
            }
        }
    }
}

@Composable
private fun MetricRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = AppTypography.body,
            color = AppColors.textSecondary
        )
        Text(
            text = value,
            style = AppTypography.body,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun MetricColumn(
    label: String,
    value: String,
    unit: String
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = value,
            style = AppTypography.heading3,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = if (unit.isNotEmpty()) "$label ($unit)" else label,
            style = AppTypography.caption,
            color = AppColors.textMuted,
            textAlign = TextAlign.Center
        )
    }
}

private fun formatNumber(value: Double): String {
    return if (value >= 1000) {
        String.format("%.1fK", value / 1000)
    } else {
        String.format("%.0f", value)
    }
}

private fun formatCurrency(value: Double): String {
    return when {
        value >= 1_000_000 -> String.format("$%.1fM", value / 1_000_000)
        value >= 1_000 -> String.format("$%.0fK", value / 1_000)
        else -> String.format("$%.0f", value)
    }
}
