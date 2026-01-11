package com.constructionpro.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.constructionpro.app.R
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.ModuleVisibilityPreferences
import com.constructionpro.app.data.model.CompanySettings
import com.constructionpro.app.data.model.ReportOverview
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class DashboardState(
    val loading: Boolean = false,
    val overview: ReportOverview? = null,
    val companySettings: CompanySettings? = null,
    val error: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    apiService: ApiService,
    onOpenProjects: () -> Unit,
    onOpenDocuments: () -> Unit,
    onOpenDrawings: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenUsers: () -> Unit,
    onOpenProfile: () -> Unit,
    onOpenTimeTracking: () -> Unit = {},
    onOpenEquipment: () -> Unit = {},
    onOpenSafety: () -> Unit = {},
    onOpenScheduling: () -> Unit = {},
    onOpenFinancials: () -> Unit = {},
    onOpenApprovals: () -> Unit = {},
    onOpenCertifications: () -> Unit = {},
    onOpenSubcontractors: () -> Unit = {},
    onCreateDailyLog: () -> Unit = {},
    onOpenDailyLogs: () -> Unit = {},
    onOpenWarnings: () -> Unit = {},
    onOpenClients: () -> Unit = {},
    onOpenLabels: () -> Unit = {},
    onOpenSearch: () -> Unit = {},
    onOpenReports: () -> Unit = {},
    onOpenAnalytics: () -> Unit = {},
    onOpenCompanySettings: () -> Unit = {},
    onOpenNotifications: () -> Unit = {},
    onOpenTasks: () -> Unit = {},
    onOpenRfis: () -> Unit = {},
    onOpenSecureUpload: () -> Unit = {},
    onOpenDroneFlights: () -> Unit = {},
    // Navigation with specific IDs (for search results)
    onOpenProjectById: (String) -> Unit = {},
    onOpenDailyLogById: (String) -> Unit = {},
    onOpenDocumentById: (String) -> Unit = {},
    onOpenClientById: (String) -> Unit = {},
    onOpenWarningById: (String) -> Unit = {},
    onLogout: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(DashboardState(loading = true)) }

    // Personal module visibility preferences (stored locally on device)
    val moduleVisibilityPrefs = remember { ModuleVisibilityPreferences.getInstance(context) }
    val moduleVisibility by moduleVisibilityPrefs.visibilityFlow.collectAsState(
        initial = ModuleVisibilityPreferences.ModuleVisibility()
    )

    fun loadOverview() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val overview = withContext(Dispatchers.IO) { apiService.getReportOverview() }
                // Also load settings to get module visibility
                val settings = withContext(Dispatchers.IO) {
                    try { apiService.getSettings() } catch (_: Exception) { null }
                }
                state = state.copy(
                    loading = false,
                    overview = overview,
                    companySettings = settings?.company
                )
            } catch (error: Exception) {
                state = state.copy(loading = false, error = error.message ?: "LOAD_FAILED")
            }
        }
    }

    LaunchedEffect(Unit) {
        loadOverview()
    }

    // Module visibility helpers
    // A module is visible only if: (1) company admin enabled it AND (2) user hasn't hidden it
    val modules = state.companySettings
    val showProjects = (modules?.moduleProjects ?: true) && moduleVisibility.showProjects
    val showDailyLogs = (modules?.moduleDailyLogs ?: true) && moduleVisibility.showDailyLogs
    val showDocuments = (modules?.moduleDocuments ?: true) && moduleVisibility.showDocuments
    val showDrawings = (modules?.moduleDocuments ?: true) && moduleVisibility.showDrawings
    val showTimeTracking = (modules?.moduleTimeTracking ?: false) && moduleVisibility.showTimeTracking
    val showEquipment = (modules?.moduleEquipment ?: false) && moduleVisibility.showEquipment
    val showScheduling = (modules?.moduleScheduling ?: false) && moduleVisibility.showScheduling
    val showSafety = (modules?.moduleSafety ?: false) && moduleVisibility.showSafety
    val showFinancials = (modules?.moduleFinancials ?: false) && moduleVisibility.showFinancials
    val showApprovals = (modules?.moduleApprovals ?: false) && moduleVisibility.showApprovals
    val showCertifications = (modules?.moduleCertifications ?: false) && moduleVisibility.showCertifications
    val showSubcontractors = (modules?.moduleSubcontractors ?: false) && moduleVisibility.showSubcontractors
    val showTasks = (modules?.moduleTasks ?: false) && moduleVisibility.showTasks
    val showRfis = (modules?.moduleRfis ?: false) && moduleVisibility.showRfis
    val showNotifications = (modules?.moduleNotifications ?: false) && moduleVisibility.showNotifications
    val showSecureUpload = (modules?.moduleSecureUpload ?: false) && moduleVisibility.showSecureUpload
    val showDroneDeploy = (modules?.moduleDroneDeploy ?: false) && moduleVisibility.showDroneDeploy
    // Additional modules for Insights & Admin sections
    val showAnalytics = (modules?.moduleAnalytics ?: false) && moduleVisibility.showAnalytics
    val showReports = (modules?.moduleReports ?: false) && moduleVisibility.showReports
    val showWarnings = (modules?.moduleWarnings ?: false) && moduleVisibility.showWarnings
    val showClients = moduleVisibility.showClients  // No company toggle for clients
    val showLabels = moduleVisibility.showLabels    // No company toggle for labels
    val showSearch = moduleVisibility.showSearch    // No company toggle for search
    val showCompanySettings = moduleVisibility.showCompanySettings  // Always available for admins

    // Search dialog state
    var showSearchDialog by remember { mutableStateOf(false) }

    // Search Dialog
    if (showSearchDialog) {
        com.constructionpro.app.ui.components.SearchDialog(
            apiService = apiService,
            onDismiss = { showSearchDialog = false },
            onOpenProject = { projectId ->
                showSearchDialog = false
                onOpenProjectById(projectId)
            },
            onOpenDailyLog = { logId ->
                showSearchDialog = false
                onOpenDailyLogById(logId)
            },
            onOpenDocument = { docId ->
                showSearchDialog = false
                onOpenDocumentById(docId)
            },
            onOpenClient = { clientId ->
                showSearchDialog = false
                onOpenClientById(clientId)
            },
            onOpenWarning = { warningId ->
                showSearchDialog = false
                onOpenWarningById(warningId)
            }
        )
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.nav_dashboard),
                subtitle = stringResource(R.string.dashboard_welcome_back),
                actions = {
                    // Search button
                    IconButton(onClick = { showSearchDialog = true }) {
                        Icon(
                            imageVector = Icons.Default.Search,
                            contentDescription = stringResource(R.string.search_title),
                            tint = AppColors.textPrimary
                        )
                    }
                    if (showNotifications) {
                        IconButton(onClick = onOpenNotifications) {
                            Icon(
                                imageVector = Icons.Default.Notifications,
                                contentDescription = stringResource(R.string.nav_notifications),
                                tint = AppColors.textPrimary
                            )
                        }
                    }
                    IconButton(onClick = onOpenProfile) {
                        CPAvatar(name = "User", size = 36.dp)
                    }
                }
            )
        },
        bottomBar = {
            CPBottomNavigation(
                items = listOf(
                    BottomNavItem("dashboard", stringResource(R.string.nav_home), Icons.Filled.Home, Icons.Outlined.Home),
                    BottomNavItem("projects", stringResource(R.string.nav_projects), Icons.Filled.Folder, Icons.Outlined.Folder),
                    BottomNavItem("documents", stringResource(R.string.nav_documents), Icons.Filled.Description, Icons.Outlined.Description),
                    BottomNavItem("settings", stringResource(R.string.nav_settings), Icons.Filled.Settings, Icons.Outlined.Settings)
                ),
                currentRoute = "dashboard",
                onNavigate = { route ->
                    when (route) {
                        "projects" -> onOpenProjects()
                        "documents" -> onOpenDocuments()
                        "settings" -> onOpenSettings()
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
            // Error Banner
            if (state.error != null) {
                item {
                    val localizedError = when (state.error) {
                        "LOAD_FAILED" -> stringResource(R.string.error_load_failed)
                        else -> state.error ?: stringResource(R.string.error_generic)
                    }
                    CPErrorBanner(
                        message = localizedError,
                        onRetry = { loadOverview() },
                        onDismiss = { state = state.copy(error = null) }
                    )
                }
            }

            // Stats Section
            item {
                CPSectionHeader(title = stringResource(R.string.dashboard_overview))
            }

            // Stats Grid
            item {
                if (state.loading) {
                    CPLoadingIndicator(message = stringResource(R.string.dashboard_loading))
                } else {
                    StatsGrid(
                        overview = state.overview,
                        showProjects = showProjects,
                        showDailyLogs = showDailyLogs,
                        showTimeTracking = showTimeTracking,
                        showEquipment = showEquipment,
                        onProjectsClick = onOpenProjects,
                        onDailyLogsClick = onOpenDailyLogs,
                        onTimeTrackingClick = onOpenTimeTracking,
                        onEquipmentClick = onOpenEquipment
                    )
                }
            }

            // Quick Actions Section
            item {
                Spacer(modifier = Modifier.height(AppSpacing.xs))
                CPSectionHeader(title = stringResource(R.string.dashboard_quick_actions))
            }

            // Navigation Cards - Core Modules
            item {
                Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                    // Upload File - Primary Action
                    if (showSecureUpload) {
                        CPNavigationCard(
                            title = stringResource(R.string.card_upload_file),
                            subtitle = stringResource(R.string.card_upload_file_desc),
                            icon = Icons.Default.CloudUpload,
                            onClick = onOpenSecureUpload,
                            iconBackgroundColor = Primary600,
                            iconColor = androidx.compose.ui.graphics.Color.White
                        )
                    }

                    // Add Daily Log - Primary Action (shown if daily logs module is visible)
                    if (showDailyLogs) {
                        CPNavigationCard(
                            title = stringResource(R.string.card_add_daily_log),
                            subtitle = stringResource(R.string.card_add_daily_log_desc),
                            icon = Icons.AutoMirrored.Filled.NoteAdd,
                            onClick = onCreateDailyLog,
                            iconBackgroundColor = Primary600,
                            iconColor = androidx.compose.ui.graphics.Color.White
                        )
                    }

                    if (showProjects) {
                        CPNavigationCard(
                            title = stringResource(R.string.nav_projects),
                            subtitle = stringResource(R.string.card_projects_desc),
                            icon = Icons.Default.FolderOpen,
                            onClick = onOpenProjects,
                            iconBackgroundColor = Primary100,
                            iconColor = Primary600,
                            badge = state.overview?.activeProjects?.toString()
                        )
                    }

                    // Daily Logs List
                    if (showDailyLogs) {
                        CPNavigationCard(
                            title = stringResource(R.string.nav_daily_logs),
                            subtitle = stringResource(R.string.card_daily_logs_desc),
                            icon = Icons.Default.EditNote,
                            onClick = onOpenDailyLogs,
                            iconBackgroundColor = ConstructionGreen.copy(alpha = 0.15f),
                            iconColor = ConstructionGreen,
                            badge = state.overview?.dailyLogs?.toString()
                        )
                    }

                    if (showDocuments) {
                        CPNavigationCard(
                            title = stringResource(R.string.nav_documents),
                            subtitle = stringResource(R.string.card_documents_desc),
                            icon = Icons.Default.Description,
                            onClick = onOpenDocuments,
                            iconBackgroundColor = ConstructionGreen.copy(alpha = 0.15f),
                            iconColor = ConstructionGreen
                        )
                    }

                    if (showDrawings) {
                        CPNavigationCard(
                            title = stringResource(R.string.nav_drawings),
                            subtitle = stringResource(R.string.card_drawings_desc),
                            icon = Icons.Default.Layers,
                            onClick = onOpenDrawings,
                            iconBackgroundColor = ConstructionOrange.copy(alpha = 0.15f),
                            iconColor = ConstructionOrange
                        )
                    }
                }
            }

            // Field Operations Section - only show if at least one module is enabled
            if (showTimeTracking || showEquipment || showScheduling || showDroneDeploy) {
                item {
                    Spacer(modifier = Modifier.height(AppSpacing.xs))
                    CPSectionHeader(title = stringResource(R.string.dashboard_field_operations))
                }

                item {
                    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                        if (showTimeTracking) {
                            CPNavigationCard(
                                title = stringResource(R.string.nav_time_tracking),
                                subtitle = stringResource(R.string.card_time_tracking_desc),
                                icon = Icons.Default.Schedule,
                                onClick = onOpenTimeTracking,
                                iconBackgroundColor = ConstructionOrange.copy(alpha = 0.15f),
                                iconColor = ConstructionOrange,
                                badge = state.overview?.timeEntries?.toString()
                            )
                        }

                        if (showEquipment) {
                            CPNavigationCard(
                                title = stringResource(R.string.nav_equipment),
                                subtitle = stringResource(R.string.card_equipment_desc),
                                icon = Icons.Default.Construction,
                                onClick = onOpenEquipment,
                                iconBackgroundColor = ConstructionYellow.copy(alpha = 0.15f),
                                iconColor = androidx.compose.ui.graphics.Color(0xFFB45309),
                                badge = state.overview?.equipment?.toString()
                            )
                        }

                        if (showScheduling) {
                            CPNavigationCard(
                                title = stringResource(R.string.nav_scheduling),
                                subtitle = stringResource(R.string.card_scheduling_desc),
                                icon = Icons.Default.CalendarMonth,
                                onClick = onOpenScheduling,
                                iconBackgroundColor = Primary100,
                                iconColor = Primary600
                            )
                        }

                        if (showDroneDeploy) {
                            CPNavigationCard(
                                title = stringResource(R.string.card_drone_flights),
                                subtitle = stringResource(R.string.card_drone_flights_desc),
                                icon = Icons.Default.FlightTakeoff,
                                onClick = onOpenDroneFlights,
                                iconBackgroundColor = Primary100,
                                iconColor = Primary600
                            )
                        }
                    }
                }
            }

            // Safety & Compliance Section - only show if at least one module is enabled
            if (showSafety || showCertifications) {
                item {
                    Spacer(modifier = Modifier.height(AppSpacing.xs))
                    CPSectionHeader(title = stringResource(R.string.dashboard_safety_compliance))
                }

                item {
                    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                        if (showSafety) {
                            CPNavigationCard(
                                title = stringResource(R.string.nav_safety),
                                subtitle = stringResource(R.string.card_safety_desc),
                                icon = Icons.Default.HealthAndSafety,
                                onClick = onOpenSafety,
                                iconBackgroundColor = ConstructionRed.copy(alpha = 0.15f),
                                iconColor = ConstructionRed
                            )
                        }

                        if (showCertifications) {
                            CPNavigationCard(
                                title = stringResource(R.string.nav_certifications),
                                subtitle = stringResource(R.string.card_certifications_desc),
                                icon = Icons.Default.VerifiedUser,
                                onClick = onOpenCertifications,
                                iconBackgroundColor = ConstructionGreen.copy(alpha = 0.15f),
                                iconColor = ConstructionGreen
                            )
                        }
                    }
                }
            }

            // Management Section - only show if at least one module is enabled
            if (showFinancials || showApprovals || showSubcontractors) {
                item {
                    Spacer(modifier = Modifier.height(AppSpacing.xs))
                    CPSectionHeader(title = stringResource(R.string.dashboard_management))
                }

                item {
                    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                        if (showFinancials) {
                            CPNavigationCard(
                                title = stringResource(R.string.nav_financials),
                                subtitle = stringResource(R.string.card_financials_desc),
                                icon = Icons.Default.AttachMoney,
                                onClick = onOpenFinancials,
                                iconBackgroundColor = ConstructionGreen.copy(alpha = 0.15f),
                                iconColor = ConstructionGreen
                            )
                        }

                        if (showApprovals) {
                            CPNavigationCard(
                                title = stringResource(R.string.nav_approvals),
                                subtitle = stringResource(R.string.card_approvals_desc),
                                icon = Icons.Default.Checklist,
                                onClick = onOpenApprovals,
                                iconBackgroundColor = ConstructionOrange.copy(alpha = 0.15f),
                                iconColor = ConstructionOrange
                            )
                        }

                        if (showSubcontractors) {
                            CPNavigationCard(
                                title = stringResource(R.string.nav_subcontractors),
                                subtitle = stringResource(R.string.card_subcontractors_desc),
                                icon = Icons.Default.Business,
                                onClick = onOpenSubcontractors,
                                iconBackgroundColor = Primary100,
                                iconColor = Primary600
                            )
                        }
                    }
                }
            }

            // Work Management Section - only show if at least one module is enabled
            if (showTasks || showRfis) {
                item {
                    Spacer(modifier = Modifier.height(AppSpacing.xs))
                    CPSectionHeader(title = stringResource(R.string.dashboard_work_management))
                }

                item {
                    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                        if (showTasks) {
                            CPNavigationCard(
                                title = stringResource(R.string.nav_tasks),
                                subtitle = stringResource(R.string.card_tasks_desc),
                                icon = Icons.Default.AssignmentTurnedIn,
                                onClick = onOpenTasks,
                                iconBackgroundColor = Primary100,
                                iconColor = Primary600
                            )
                        }

                        if (showRfis) {
                            CPNavigationCard(
                                title = stringResource(R.string.card_rfis),
                                subtitle = stringResource(R.string.card_rfis_desc),
                                icon = Icons.Default.QuestionAnswer,
                                onClick = onOpenRfis,
                                iconBackgroundColor = ConstructionOrange.copy(alpha = 0.15f),
                                iconColor = ConstructionOrange
                            )
                        }
                    }
                }
            }

            // Insights & Reports Section - only show if at least one module is visible
            if (showAnalytics || showReports) {
                item {
                    Spacer(modifier = Modifier.height(AppSpacing.xs))
                    CPSectionHeader(title = stringResource(R.string.dashboard_insights_reports))
                }

                item {
                    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                        if (showAnalytics) {
                            CPNavigationCard(
                                title = stringResource(R.string.nav_analytics),
                                subtitle = stringResource(R.string.card_analytics_desc),
                                icon = Icons.Default.Analytics,
                                onClick = onOpenAnalytics,
                                iconBackgroundColor = Primary100,
                                iconColor = Primary600
                            )
                        }

                        if (showReports) {
                            CPNavigationCard(
                                title = stringResource(R.string.nav_reports),
                                subtitle = stringResource(R.string.card_reports_desc),
                                icon = Icons.Default.Assessment,
                                onClick = onOpenReports,
                                iconBackgroundColor = ConstructionGreen.copy(alpha = 0.15f),
                                iconColor = ConstructionGreen
                            )
                        }
                    }
                }
            }

            // Admin & HR Section - only show if at least one module is visible
            if (showWarnings || showClients || showLabels || showCompanySettings) {
                item {
                    Spacer(modifier = Modifier.height(AppSpacing.xs))
                    CPSectionHeader(title = stringResource(R.string.dashboard_admin_hr))
                }

                item {
                    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                        if (showWarnings) {
                            CPNavigationCard(
                                title = stringResource(R.string.common_warning),
                                subtitle = stringResource(R.string.card_warnings_desc),
                                icon = Icons.Default.Warning,
                                onClick = onOpenWarnings,
                                iconBackgroundColor = ConstructionRed.copy(alpha = 0.15f),
                                iconColor = ConstructionRed
                            )
                        }

                        if (showClients) {
                            CPNavigationCard(
                                title = stringResource(R.string.nav_clients),
                                subtitle = stringResource(R.string.card_clients_desc),
                                icon = Icons.Default.BusinessCenter,
                                onClick = onOpenClients,
                                iconBackgroundColor = Primary100,
                                iconColor = Primary600
                            )
                        }

                        if (showLabels) {
                            CPNavigationCard(
                                title = stringResource(R.string.card_labels),
                                subtitle = stringResource(R.string.card_labels_desc),
                                icon = Icons.AutoMirrored.Filled.Label,
                                onClick = onOpenLabels,
                                iconBackgroundColor = ConstructionYellow.copy(alpha = 0.15f),
                                iconColor = androidx.compose.ui.graphics.Color(0xFFB45309)
                            )
                        }

                        if (showCompanySettings) {
                            CPNavigationCard(
                                title = stringResource(R.string.card_company_settings),
                                subtitle = stringResource(R.string.card_company_settings_desc),
                                icon = Icons.Default.AdminPanelSettings,
                                onClick = onOpenCompanySettings,
                                iconBackgroundColor = ConstructionRed.copy(alpha = 0.15f),
                                iconColor = ConstructionRed
                            )
                        }
                    }
                }
            }

            // Bottom padding for nav bar
            item {
                Spacer(modifier = Modifier.height(AppSpacing.md))
            }
        }
    }
}

@Composable
private fun StatsGrid(
    overview: ReportOverview?,
    showProjects: Boolean,
    showDailyLogs: Boolean,
    showTimeTracking: Boolean,
    showEquipment: Boolean,
    onProjectsClick: (() -> Unit)? = null,
    onDailyLogsClick: (() -> Unit)? = null,
    onTimeTrackingClick: (() -> Unit)? = null,
    onEquipmentClick: (() -> Unit)? = null
) {
    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
        // First row - show Projects and Daily Logs based on visibility
        if (showProjects || showDailyLogs) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
            ) {
                if (showProjects) {
                    CPStatCard(
                        label = stringResource(R.string.dashboard_active_projects),
                        value = (overview?.activeProjects ?: 0).toString(),
                        icon = Icons.Default.Folder,
                        iconBackgroundColor = Primary100,
                        iconColor = Primary600,
                        modifier = Modifier.weight(1f),
                        onClick = onProjectsClick
                    )
                }
                if (showDailyLogs) {
                    CPStatCard(
                        label = stringResource(R.string.nav_daily_logs),
                        value = (overview?.dailyLogs ?: 0).toString(),
                        icon = Icons.Default.EditNote,
                        iconBackgroundColor = ConstructionGreen.copy(alpha = 0.15f),
                        iconColor = ConstructionGreen,
                        modifier = Modifier.weight(1f),
                        onClick = onDailyLogsClick
                    )
                }
                // Add spacer if only one is visible to keep alignment
                if (showProjects != showDailyLogs) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
        // Second row - only show if modules are enabled
        if (showTimeTracking || showEquipment) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
            ) {
                if (showTimeTracking) {
                    CPStatCard(
                        label = stringResource(R.string.dashboard_time_entries),
                        value = (overview?.timeEntries ?: 0).toString(),
                        icon = Icons.Default.Schedule,
                        iconBackgroundColor = ConstructionOrange.copy(alpha = 0.15f),
                        iconColor = ConstructionOrange,
                        modifier = Modifier.weight(1f),
                        onClick = onTimeTrackingClick
                    )
                }
                if (showEquipment) {
                    CPStatCard(
                        label = stringResource(R.string.nav_equipment),
                        value = (overview?.equipment ?: 0).toString(),
                        icon = Icons.Default.Construction,
                        iconBackgroundColor = ConstructionYellow.copy(alpha = 0.15f),
                        iconColor = androidx.compose.ui.graphics.Color(0xFFB45309.toInt()),
                        modifier = Modifier.weight(1f),
                        onClick = onEquipmentClick
                    )
                }
                // Add spacer if only one is visible to keep alignment
                if (showTimeTracking != showEquipment) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}
