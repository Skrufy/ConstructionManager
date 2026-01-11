package com.constructionpro.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// Report types
object ReportType {
    const val PROJECT_SUMMARY = "PROJECT_SUMMARY"
    const val FINANCIAL = "FINANCIAL"
    const val LABOR = "LABOR"
    const val SAFETY = "SAFETY"
    const val DAILY_LOG = "DAILY_LOG"
    const val EQUIPMENT = "EQUIPMENT"
    const val WEATHER_DELAY = "WEATHER_DELAY"

    val all = listOf(DAILY_LOG, WEATHER_DELAY, PROJECT_SUMMARY, LABOR, SAFETY, FINANCIAL, EQUIPMENT)

    fun displayName(type: String): String = when (type) {
        PROJECT_SUMMARY -> "Project Summary"
        FINANCIAL -> "Financial Report"
        LABOR -> "Labor Report"
        SAFETY -> "Safety Report"
        DAILY_LOG -> "Daily Logs"
        EQUIPMENT -> "Equipment Report"
        WEATHER_DELAY -> "Weather Delays"
        else -> type.replace("_", " ")
    }
}

// Report period
object ReportPeriod {
    const val TODAY = "TODAY"
    const val THIS_WEEK = "THIS_WEEK"
    const val THIS_MONTH = "THIS_MONTH"
    const val THIS_QUARTER = "THIS_QUARTER"
    const val THIS_YEAR = "THIS_YEAR"
    const val LAST_WEEK = "LAST_WEEK"
    const val LAST_MONTH = "LAST_MONTH"
    const val LAST_QUARTER = "LAST_QUARTER"
    const val LAST_30_DAYS = "LAST_30_DAYS"
    const val LAST_90_DAYS = "LAST_90_DAYS"
    const val CUSTOM = "CUSTOM"

    val all = listOf(TODAY, THIS_WEEK, THIS_MONTH, THIS_QUARTER, THIS_YEAR, LAST_WEEK, LAST_MONTH, LAST_QUARTER, LAST_30_DAYS, LAST_90_DAYS)

    fun displayName(period: String): String = when (period) {
        TODAY -> "Today"
        THIS_WEEK -> "This Week"
        THIS_MONTH -> "This Month"
        THIS_QUARTER -> "This Quarter"
        THIS_YEAR -> "This Year"
        LAST_WEEK -> "Last Week"
        LAST_MONTH -> "Last Month"
        LAST_QUARTER -> "Last Quarter"
        LAST_30_DAYS -> "Last 30 Days"
        LAST_90_DAYS -> "Last 90 Days"
        CUSTOM -> "Custom Range"
        else -> period
    }
}

@Serializable
data class ReportOverview(
    val activeProjects: Int? = null,
    val timeEntries: Int? = null,
    val dailyLogs: Int? = null,
    val incidents: Int? = null,
    val equipment: Int? = null,
    val totalHours: Double? = null,
    val pendingApprovals: Int? = null,
    val openIssues: Int? = null,
    val completedTasks: Int? = null
)

// ============ ANALYTICS MODELS ============

@Serializable
data class AnalyticsDashboard(
    val summary: AnalyticsSummary? = null,
    val projectMetrics: List<ProjectMetric>? = null,
    val laborMetrics: LaborMetrics? = null,
    val safetyMetrics: SafetyMetrics? = null,
    val financialMetrics: FinancialMetrics? = null,
    val trends: TrendData? = null
)

@Serializable
data class AnalyticsSummary(
    val totalProjects: Int = 0,
    val activeProjects: Int = 0,
    val completedProjects: Int = 0,
    val onHoldProjects: Int = 0,
    val totalBudget: Double = 0.0,
    val totalSpent: Double = 0.0,
    val totalHoursLogged: Double = 0.0,
    val avgProjectCompletion: Double = 0.0
)

@Serializable
data class ProjectMetric(
    val projectId: String,
    val projectName: String,
    val status: String,
    val progress: Double = 0.0,
    val budget: Double = 0.0,
    val spent: Double = 0.0,
    val hoursLogged: Double = 0.0,
    val dailyLogCount: Int = 0,
    val openIssues: Int = 0,
    val startDate: String? = null,
    val endDate: String? = null
)

@Serializable
data class LaborMetrics(
    val totalHours: Double = 0.0,
    val regularHours: Double = 0.0,
    val overtimeHours: Double = 0.0,
    val totalWorkers: Int = 0,
    val avgHoursPerWorker: Double = 0.0,
    val hoursThisWeek: Double = 0.0,
    val hoursLastWeek: Double = 0.0,
    val weeklyChange: Double = 0.0
)

@Serializable
data class SafetyMetrics(
    val totalIncidents: Int = 0,
    val openIncidents: Int = 0,
    val closedIncidents: Int = 0,
    val daysWithoutIncident: Int = 0,
    val inspectionsDue: Int = 0,
    val inspectionsCompleted: Int = 0,
    val safetyScore: Double = 0.0
)

@Serializable
data class FinancialMetrics(
    val totalBudget: Double = 0.0,
    val totalSpent: Double = 0.0,
    val remainingBudget: Double = 0.0,
    val budgetUtilization: Double = 0.0,
    val invoicesPending: Int = 0,
    val invoicesOverdue: Int = 0,
    val totalInvoiced: Double = 0.0,
    val totalPaid: Double = 0.0
)

@Serializable
data class TrendData(
    val dailyLogTrend: List<TrendPoint>? = null,
    val hoursTrend: List<TrendPoint>? = null,
    val incidentTrend: List<TrendPoint>? = null,
    val spendingTrend: List<TrendPoint>? = null
)

@Serializable
data class TrendPoint(
    val date: String,
    val value: Double,
    val label: String? = null
)

// ============ REPORT GENERATION ============

@Serializable
data class ReportRequest(
    val type: String,
    val projectId: String? = null,
    val period: String = ReportPeriod.THIS_MONTH,
    val startDate: String? = null,
    val endDate: String? = null,
    val format: String = "PDF" // PDF, CSV, XLSX
)

// Report stat for generated reports
@Serializable
data class ReportStat(
    val id: String,
    val label: String,
    val value: String,
    val change: Double? = null,
    @SerialName("change_label")
    val changeLabel: String? = null
)

// Report data point for chart data
@Serializable
data class ReportDataPoint(
    val id: String,
    val label: String,
    val value: Double,
    val category: String? = null
)

@Serializable
data class GeneratedReport(
    val id: String,
    val type: String,
    val name: String,
    val status: String, // GENERATING, READY, FAILED
    val format: String,
    val description: String? = null,
    val fileUrl: String? = null,
    val chartType: String? = null,
    val stats: List<ReportStat>? = null,
    val data: List<ReportDataPoint>? = null,
    val createdAt: String,
    val projectId: String? = null,
    val projectName: String? = null,
    val period: String? = null,
    val startDate: String? = null,
    val endDate: String? = null,
    val generatedBy: String? = null
)

@Serializable
data class ReportListResponse(
    val reports: List<GeneratedReport>
)

// ============ PROJECT REPORT DETAILS ============

@Serializable
data class ProjectReport(
    val project: ProjectReportSummary,
    val dailyLogs: DailyLogReportSection? = null,
    val labor: LaborReportSection? = null,
    val materials: MaterialsReportSection? = null,
    val issues: IssuesReportSection? = null,
    val photos: Int = 0
)

@Serializable
data class ProjectReportSummary(
    val id: String,
    val name: String,
    val status: String,
    val client: String? = null,
    val address: String? = null,
    val startDate: String? = null,
    val endDate: String? = null,
    val progress: Double = 0.0,
    val budget: Double = 0.0,
    val spent: Double = 0.0
)

@Serializable
data class DailyLogReportSection(
    val total: Int = 0,
    val approved: Int = 0,
    val pending: Int = 0,
    val avgCrewSize: Double = 0.0,
    val totalHours: Double = 0.0
)

@Serializable
data class LaborReportSection(
    val totalHours: Double = 0.0,
    val regularHours: Double = 0.0,
    val overtimeHours: Double = 0.0,
    val uniqueWorkers: Int = 0,
    val laborCost: Double = 0.0
)

@Serializable
data class MaterialsReportSection(
    val totalItems: Int = 0,
    val totalCost: Double = 0.0,
    val delivered: Int = 0,
    val pending: Int = 0
)

@Serializable
data class IssuesReportSection(
    val total: Int = 0,
    val open: Int = 0,
    val resolved: Int = 0,
    val critical: Int = 0
)
