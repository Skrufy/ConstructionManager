package com.constructionpro.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.constructionpro.app.data.ApiClient
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.AuthRepository
import com.constructionpro.app.data.AuthTokenStore
import com.constructionpro.app.data.SupabaseAuthClient
import com.constructionpro.app.data.ThemeMode
import com.constructionpro.app.data.ThemePreferences
import dagger.hilt.android.AndroidEntryPoint
import com.constructionpro.app.ui.screens.ApprovalsScreen
import com.constructionpro.app.ui.screens.CertificationCreateScreen
import com.constructionpro.app.ui.screens.CertificationDetailScreen
import com.constructionpro.app.ui.screens.CertificationsScreen
import com.constructionpro.app.ui.screens.ChangeOrderDetailScreen
import com.constructionpro.app.ui.screens.ClientCreateScreen
import com.constructionpro.app.ui.screens.ClientDetailScreen
import com.constructionpro.app.ui.screens.ClientsScreen
import com.constructionpro.app.ui.screens.DashboardScreen
import com.constructionpro.app.ui.screens.DailyLogCreateScreen
import com.constructionpro.app.ui.screens.DailyLogDetailScreen
import com.constructionpro.app.ui.screens.DailyLogEditScreen
import com.constructionpro.app.ui.screens.DailyLogsScreen
import com.constructionpro.app.ui.screens.DocumentDetailScreen
import com.constructionpro.app.ui.screens.DocumentsScreen
import com.constructionpro.app.ui.screens.DocumentViewerScreen
import com.constructionpro.app.ui.screens.DrawingsScreen
import com.constructionpro.app.ui.screens.DrawingViewerScreen
import com.constructionpro.app.ui.screens.EquipmentDetailScreen
import com.constructionpro.app.ui.screens.EquipmentScreen
import com.constructionpro.app.ui.screens.ExpenseDetailScreen
import com.constructionpro.app.ui.screens.FinancialsScreen
import com.constructionpro.app.ui.screens.IncidentCreateScreen
import com.constructionpro.app.ui.screens.IncidentDetailScreen
import com.constructionpro.app.ui.screens.InspectionCreateScreen
import com.constructionpro.app.ui.screens.InspectionDetailScreen
import com.constructionpro.app.ui.screens.InvoiceDetailScreen
import com.constructionpro.app.ui.screens.LabelsScreen
import com.constructionpro.app.ui.screens.LoginScreen
import com.constructionpro.app.ui.screens.OfflineCacheScreen
import com.constructionpro.app.ui.screens.PendingDailyLogUpdateScreen
import com.constructionpro.app.ui.screens.ProfileScreen
import com.constructionpro.app.ui.screens.ProjectDetailScreen
import com.constructionpro.app.ui.screens.ProjectEditScreen
import com.constructionpro.app.ui.screens.ProjectsScreen
import com.constructionpro.app.ui.screens.PunchListCreateScreen
import com.constructionpro.app.ui.screens.PunchListDetailScreen
import com.constructionpro.app.ui.screens.SafetyScreen
import com.constructionpro.app.ui.screens.ScheduleDetailScreen
import com.constructionpro.app.ui.screens.SchedulingScreen
import com.constructionpro.app.ui.screens.SearchScreen
import com.constructionpro.app.ui.screens.SettingsScreen
import com.constructionpro.app.ui.screens.SubcontractorCreateScreen
import com.constructionpro.app.ui.screens.SubcontractorDetailScreen
import com.constructionpro.app.ui.screens.SubcontractorsScreen
import com.constructionpro.app.ui.screens.SyncQueueScreen
import com.constructionpro.app.ui.screens.TimeTrackingScreen
import com.constructionpro.app.ui.screens.UsersScreen
import com.constructionpro.app.ui.screens.WarningCreateScreen
import com.constructionpro.app.ui.screens.WarningDetailScreen
import com.constructionpro.app.ui.screens.WarningsScreen
import com.constructionpro.app.ui.screens.ReportsScreen
import com.constructionpro.app.ui.screens.AnalyticsScreen
import com.constructionpro.app.ui.screens.UserManagementScreen
import com.constructionpro.app.ui.screens.TeamManagementScreen
import com.constructionpro.app.ui.screens.CompanySettingsScreen
import com.constructionpro.app.ui.screens.AuditLogsScreen
import com.constructionpro.app.ui.screens.InvitationsScreen
import com.constructionpro.app.ui.screens.UserDetailScreen
import com.constructionpro.app.ui.screens.NotificationsScreen
import com.constructionpro.app.ui.screens.TasksScreen
import com.constructionpro.app.ui.screens.RfiScreen
import com.constructionpro.app.ui.screens.SecureUploadScreen
import com.constructionpro.app.ui.screens.SafetyMeetingCreateScreen
import com.constructionpro.app.ui.screens.ScheduleCreateScreen
import com.constructionpro.app.ui.screens.DroneFlightsScreen
import com.constructionpro.app.ui.screens.PermissionsScreen
import com.constructionpro.app.ui.theme.ConstructionProTheme
import kotlinx.coroutines.launch

/**
 * Main entry point for the ConstructionPro Android app.
 *
 * Uses Hilt for dependency injection. The navigation graph is defined
 * in the AppNav composable below.
 *
 * Note: Navigation routes are also defined in core/navigation/Routes.kt
 * for type-safe navigation. Migration to use Routes.kt throughout
 * can be done incrementally.
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Enable edge-to-edge display
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.auto(
                android.graphics.Color.TRANSPARENT,
                android.graphics.Color.TRANSPARENT
            )
        )

        val tokenStore = AuthTokenStore(this)
        val apiClient = ApiClient(tokenStore)
        val apiService = apiClient.apiService
        val authRepository = AuthRepository(SupabaseAuthClient().authService, tokenStore)
        val themePreferences = ThemePreferences.getInstance(this)

        setContent {
            val themeMode by themePreferences.themeModeFlow.collectAsState(initial = ThemeMode.SYSTEM)
            val isDarkTheme = when (themeMode) {
                ThemeMode.SYSTEM -> isSystemInDarkTheme()
                ThemeMode.LIGHT -> false
                ThemeMode.DARK -> true
            }

            ConstructionProTheme(darkTheme = isDarkTheme) {
                Surface {
                    AppRoot(
                        tokenStore = tokenStore,
                        apiClient = apiClient,
                        apiService = apiService,
                        authRepository = authRepository,
                        themePreferences = themePreferences
                    )
                }
            }
        }
    }
}

@Composable
private fun AppRoot(
    tokenStore: AuthTokenStore,
    apiClient: ApiClient,
    apiService: ApiService,
    authRepository: AuthRepository,
    themePreferences: ThemePreferences
) {
    val scope = rememberCoroutineScope()
    val token by tokenStore.tokenFlow.collectAsState(initial = null)
    val authExpired by apiClient.authExpired.collectAsState()

    // When auth expires (token refresh failed), automatically log out
    androidx.compose.runtime.LaunchedEffect(authExpired) {
        if (authExpired) {
            tokenStore.clearToken()
            apiClient.resetAuthExpired()
        }
    }

    val onLogout: () -> Unit = {
        scope.launch { tokenStore.clearToken() }
    }

    if (token.isNullOrBlank()) {
        LoginScreen(
            authRepository = authRepository,
            apiService = apiService,
            tokenStore = tokenStore,
            onLoggedIn = { /* Token already saved by authRepository.signIn() */ }
        )
    } else {
        AppNav(apiService = apiService, onLogout = onLogout, themePreferences = themePreferences)
    }
}

@Composable
private fun AppNav(
    apiService: ApiService,
    onLogout: () -> Unit,
    themePreferences: ThemePreferences
) {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = "dashboard") {
        composable("dashboard") {
            DashboardScreen(
                apiService = apiService,
                onOpenProjects = { navController.navigate("projects") },
                onOpenDocuments = { navController.navigate("documents") },
                onOpenDrawings = { navController.navigate("drawings") },
                onOpenSettings = { navController.navigate("settings") },
                onOpenUsers = { navController.navigate("users") },
                onOpenProfile = { navController.navigate("profile") },
                onOpenTimeTracking = { navController.navigate("time-tracking") },
                onOpenEquipment = { navController.navigate("equipment") },
                onOpenSafety = { navController.navigate("safety") },
                onOpenScheduling = { navController.navigate("scheduling") },
                onOpenFinancials = { navController.navigate("financials") },
                onOpenApprovals = { navController.navigate("approvals") },
                onOpenCertifications = { navController.navigate("certifications") },
                onOpenSubcontractors = { navController.navigate("subcontractors") },
                onCreateDailyLog = { navController.navigate("daily-log-create") },
                onOpenDailyLogs = { navController.navigate("daily-logs") },
                onOpenWarnings = { navController.navigate("warnings") },
                onOpenClients = { navController.navigate("clients") },
                onOpenLabels = { navController.navigate("labels") },
                onOpenSearch = { navController.navigate("search") },
                onOpenReports = { navController.navigate("reports") },
                onOpenAnalytics = { navController.navigate("analytics") },
                onOpenCompanySettings = { navController.navigate("company-settings") },
                onOpenNotifications = { navController.navigate("notifications") },
                onOpenTasks = { navController.navigate("tasks") },
                onOpenRfis = { navController.navigate("rfis") },
                onOpenSecureUpload = { navController.navigate("secure-upload") },
                onOpenDroneFlights = { navController.navigate("drone-flights") },
                // Navigation with specific IDs (for search results)
                onOpenProjectById = { projectId -> navController.navigate("project/$projectId") },
                onOpenDailyLogById = { logId -> navController.navigate("daily-log/$logId") },
                onOpenDocumentById = { docId -> navController.navigate("document/$docId") },
                onOpenClientById = { clientId -> navController.navigate("client/$clientId") },
                onOpenWarningById = { warningId -> navController.navigate("warning/$warningId") },
                onLogout = onLogout
            )
        }
        composable("projects") {
            ProjectsScreen(
                apiService = apiService,
                onLogout = onLogout,
                onOpenProfile = { navController.navigate("profile") },
                onOpenProject = { projectId -> navController.navigate("project/$projectId") }
            )
        }
        composable("profile") {
            ProfileScreen(
                apiService = apiService,
                onLogout = onLogout,
                onBack = { navController.popBackStack() }
            )
        }
        composable("documents") {
            DocumentsScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() },
                onOpenDocument = { documentId -> navController.navigate("document/$documentId") }
            )
        }
        composable("document/{documentId}") { backStackEntry ->
            val documentId = backStackEntry.arguments?.getString("documentId")
            if (documentId != null) {
                DocumentViewerScreen(
                    apiService = apiService,
                    documentId = documentId,
                    onBack = { navController.popBackStack() }
                )
            }
        }
        composable("drawings") {
            DrawingsScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() },
                onOpenDrawing = { drawingId -> navController.navigate("drawing/$drawingId") }
            )
        }
        composable("drawing/{drawingId}") { backStackEntry ->
            val drawingId = backStackEntry.arguments?.getString("drawingId")
            if (drawingId != null) {
                DrawingViewerScreen(
                    apiService = apiService,
                    drawingId = drawingId,
                    onBack = { navController.popBackStack() }
                )
            }
        }
        composable("settings") {
            SettingsScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() },
                onOpenOfflineCache = { navController.navigate("offline-cache") },
                onOpenSyncQueue = { navController.navigate("sync-queue") },
                themePreferences = themePreferences
            )
        }
        composable("users") {
            UsersScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() }
            )
        }
        composable("offline-cache") {
            OfflineCacheScreen(
                onBack = { navController.popBackStack() }
            )
        }
        composable("sync-queue") {
            SyncQueueScreen(
                onBack = { navController.popBackStack() },
                onResolveDailyLogUpdate = { actionId ->
                    navController.navigate("pending-daily-log-update/$actionId")
                }
            )
        }
        composable("pending-daily-log-update/{actionId}") { backStackEntry ->
            val actionId = backStackEntry.arguments?.getString("actionId")
            if (actionId != null) {
                PendingDailyLogUpdateScreen(
                    pendingActionId = actionId,
                    onBack = { navController.popBackStack() },
                    onResolved = { navController.popBackStack() }
                )
            }
        }
        composable("project/{projectId}") { backStackEntry ->
            val projectId = backStackEntry.arguments?.getString("projectId")
            if (projectId != null) {
                ProjectDetailScreen(
                    apiService = apiService,
                    projectId = projectId,
                    onBack = { navController.popBackStack() },
                    onViewDailyLogs = { navController.navigate("daily-logs/$projectId") },
                    onViewTimeEntries = { navController.navigate("time-tracking") },
                    onViewFiles = { navController.navigate("documents") },
                    onEditProject = { navController.navigate("project-edit/$projectId") }
                )
            }
        }
        composable("daily-logs/{projectId}") { backStackEntry ->
            val projectId = backStackEntry.arguments?.getString("projectId")
            if (projectId != null) {
                DailyLogsScreen(
                    apiService = apiService,
                    projectId = projectId,
                    onBack = { navController.popBackStack() },
                    onOpenDailyLog = { logId -> navController.navigate("daily-log/$logId") },
                    onCreateDailyLog = { navController.navigate("daily-log-create/$projectId") }
                )
            }
        }
        composable("daily-log/{logId}") { backStackEntry ->
            val logId = backStackEntry.arguments?.getString("logId")
            if (logId != null) {
                DailyLogDetailScreen(
                    apiService = apiService,
                    logId = logId,
                    onBack = { navController.popBackStack() },
                    onEditLog = { navController.navigate("daily-log-edit/$logId") }
                )
            }
        }
        // Daily log create from dashboard (with project selection)
        composable("daily-log-create") {
            DailyLogCreateScreen(
                apiService = apiService,
                projectId = null,
                onBack = { navController.popBackStack() },
                onSaved = { navController.popBackStack() }
            )
        }

        // Daily log create from project detail (pre-selected project)
        composable("daily-log-create/{projectId}") { backStackEntry ->
            val projectId = backStackEntry.arguments?.getString("projectId")
            if (projectId != null) {
                DailyLogCreateScreen(
                    apiService = apiService,
                    projectId = projectId,
                    onBack = { navController.popBackStack() },
                    onSaved = { navController.popBackStack() }
                )
            }
        }

        // All daily logs (from dashboard)
        composable("daily-logs") {
            DailyLogsScreen(
                apiService = apiService,
                projectId = null,
                onBack = { navController.popBackStack() },
                onOpenDailyLog = { logId -> navController.navigate("daily-log/$logId") },
                onCreateDailyLog = { navController.navigate("daily-log-create") }
            )
        }
        composable("daily-log-edit/{logId}") { backStackEntry ->
            val logId = backStackEntry.arguments?.getString("logId")
            if (logId != null) {
                DailyLogEditScreen(
                    apiService = apiService,
                    logId = logId,
                    onBack = { navController.popBackStack() },
                    onSaved = { navController.popBackStack() }
                )
            }
        }
        composable("project-edit/{projectId}") { backStackEntry ->
            val projectId = backStackEntry.arguments?.getString("projectId")
            if (projectId != null) {
                ProjectEditScreen(
                    apiService = apiService,
                    projectId = projectId,
                    onBack = { navController.popBackStack() },
                    onSaved = { navController.popBackStack() }
                )
            }
        }

        // Time Tracking
        composable("time-tracking") {
            TimeTrackingScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() }
            )
        }

        // Equipment
        composable("equipment") {
            EquipmentScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() },
                onOpenEquipment = { equipmentId ->
                    navController.navigate("equipment/$equipmentId")
                }
            )
        }

        composable("equipment/{equipmentId}") { backStackEntry ->
            val equipmentId = backStackEntry.arguments?.getString("equipmentId")
            if (equipmentId != null) {
                EquipmentDetailScreen(
                    apiService = apiService,
                    equipmentId = equipmentId,
                    onBack = { navController.popBackStack() }
                )
            }
        }

        // Safety (Incidents, Inspections, Punch Lists, Meetings)
        composable("safety") {
            SafetyScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() },
                onOpenIncident = { incidentId ->
                    navController.navigate("incident/$incidentId")
                },
                onOpenInspection = { inspectionId ->
                    navController.navigate("inspection/$inspectionId")
                },
                onOpenPunchList = { punchListId ->
                    navController.navigate("punch-list/$punchListId")
                },
                onCreateIncident = {
                    navController.navigate("incident-create")
                },
                onCreateInspection = {
                    navController.navigate("inspection-create")
                },
                onCreatePunchList = {
                    navController.navigate("punch-list-create")
                },
                onCreateMeeting = {
                    navController.navigate("safety-meeting-create")
                }
            )
        }

        composable("safety-meeting-create") {
            SafetyMeetingCreateScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() },
                onSaved = { navController.popBackStack() }
            )
        }

        composable("incident-create") {
            IncidentCreateScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() },
                onSaved = { navController.popBackStack() }
            )
        }

        composable("inspection-create") {
            InspectionCreateScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() },
                onSaved = { navController.popBackStack() }
            )
        }

        composable("punch-list-create") {
            PunchListCreateScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() },
                onSaved = { navController.popBackStack() }
            )
        }

        composable("incident/{incidentId}") { backStackEntry ->
            val incidentId = backStackEntry.arguments?.getString("incidentId")
            if (incidentId != null) {
                IncidentDetailScreen(
                    apiService = apiService,
                    incidentId = incidentId,
                    onBack = { navController.popBackStack() }
                )
            }
        }

        composable("inspection/{inspectionId}") { backStackEntry ->
            val inspectionId = backStackEntry.arguments?.getString("inspectionId")
            if (inspectionId != null) {
                InspectionDetailScreen(
                    apiService = apiService,
                    inspectionId = inspectionId,
                    onBack = { navController.popBackStack() }
                )
            }
        }

        composable("punch-list/{punchListId}") { backStackEntry ->
            val punchListId = backStackEntry.arguments?.getString("punchListId")
            if (punchListId != null) {
                PunchListDetailScreen(
                    apiService = apiService,
                    punchListId = punchListId,
                    onBack = { navController.popBackStack() }
                )
            }
        }

        // Scheduling
        composable("scheduling") {
            SchedulingScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() },
                onOpenSchedule = { scheduleId ->
                    navController.navigate("schedule/$scheduleId")
                },
                onCreateSchedule = {
                    navController.navigate("schedule-create")
                }
            )
        }

        composable("schedule-create") {
            ScheduleCreateScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() },
                onSaved = { navController.popBackStack() }
            )
        }

        composable("schedule/{scheduleId}") { backStackEntry ->
            val scheduleId = backStackEntry.arguments?.getString("scheduleId")
            if (scheduleId != null) {
                ScheduleDetailScreen(
                    apiService = apiService,
                    scheduleId = scheduleId,
                    onBack = { navController.popBackStack() }
                )
            }
        }

        // Financials
        composable("financials") {
            FinancialsScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() },
                onOpenInvoice = { invoiceId ->
                    navController.navigate("invoice/$invoiceId")
                },
                onOpenExpense = { expenseId ->
                    navController.navigate("expense/$expenseId")
                },
                onOpenChangeOrder = { changeOrderId ->
                    navController.navigate("change-order/$changeOrderId")
                }
            )
        }

        composable("invoice/{invoiceId}") { backStackEntry ->
            val invoiceId = backStackEntry.arguments?.getString("invoiceId")
            if (invoiceId != null) {
                InvoiceDetailScreen(
                    apiService = apiService,
                    invoiceId = invoiceId,
                    onBack = { navController.popBackStack() }
                )
            }
        }

        composable("expense/{expenseId}") { backStackEntry ->
            val expenseId = backStackEntry.arguments?.getString("expenseId")
            if (expenseId != null) {
                ExpenseDetailScreen(
                    apiService = apiService,
                    expenseId = expenseId,
                    onBack = { navController.popBackStack() }
                )
            }
        }

        composable("change-order/{changeOrderId}") { backStackEntry ->
            val changeOrderId = backStackEntry.arguments?.getString("changeOrderId")
            if (changeOrderId != null) {
                ChangeOrderDetailScreen(
                    apiService = apiService,
                    changeOrderId = changeOrderId,
                    onBack = { navController.popBackStack() }
                )
            }
        }

        // Approvals
        composable("approvals") {
            ApprovalsScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() }
            )
        }

        // Certifications
        composable("certifications") {
            CertificationsScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() },
                onOpenCertification = { certificationId ->
                    navController.navigate("certification/$certificationId")
                },
                onCreateCertification = {
                    navController.navigate("certification-create")
                }
            )
        }

        composable("certification-create") {
            CertificationCreateScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() },
                onCreated = { certificationId ->
                    navController.popBackStack()
                    navController.navigate("certification/$certificationId")
                }
            )
        }

        composable("certification/{certificationId}") { backStackEntry ->
            val certificationId = backStackEntry.arguments?.getString("certificationId")
            if (certificationId != null) {
                CertificationDetailScreen(
                    apiService = apiService,
                    certificationId = certificationId,
                    onBack = { navController.popBackStack() }
                )
            }
        }

        // Subcontractors
        composable("subcontractors") {
            SubcontractorsScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() },
                onOpenSubcontractor = { subcontractorId ->
                    navController.navigate("subcontractor/$subcontractorId")
                },
                onCreateSubcontractor = {
                    navController.navigate("subcontractor-create")
                }
            )
        }

        composable("subcontractor-create") {
            SubcontractorCreateScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() },
                onCreated = { subcontractorId ->
                    navController.popBackStack()
                    navController.navigate("subcontractor/$subcontractorId")
                }
            )
        }

        composable("subcontractor/{subcontractorId}") { backStackEntry ->
            val subcontractorId = backStackEntry.arguments?.getString("subcontractorId")
            if (subcontractorId != null) {
                SubcontractorDetailScreen(
                    apiService = apiService,
                    subcontractorId = subcontractorId,
                    onBack = { navController.popBackStack() }
                )
            }
        }

        // Warnings
        composable("warnings") {
            WarningsScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() },
                onOpenWarning = { warningId -> navController.navigate("warning/$warningId") },
                onCreateWarning = { navController.navigate("warning-create") }
            )
        }

        composable("warning/{warningId}") { backStackEntry ->
            val warningId = backStackEntry.arguments?.getString("warningId")
            if (warningId != null) {
                WarningDetailScreen(
                    warningId = warningId,
                    apiService = apiService,
                    onBack = { navController.popBackStack() },
                    onEdit = { /* TODO: Add edit screen */ }
                )
            }
        }

        composable("warning-create") {
            WarningCreateScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() },
                onCreated = { warningId ->
                    navController.popBackStack()
                    navController.navigate("warning/$warningId")
                }
            )
        }

        // Clients
        composable("clients") {
            ClientsScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() },
                onOpenClient = { clientId -> navController.navigate("client/$clientId") },
                onCreateClient = { navController.navigate("client-create") }
            )
        }

        composable("client/{clientId}") { backStackEntry ->
            val clientId = backStackEntry.arguments?.getString("clientId")
            if (clientId != null) {
                ClientDetailScreen(
                    clientId = clientId,
                    apiService = apiService,
                    onBack = { navController.popBackStack() },
                    onEdit = { /* TODO: Add edit screen */ }
                )
            }
        }

        composable("client-create") {
            ClientCreateScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() },
                onCreated = { clientId ->
                    navController.popBackStack()
                    navController.navigate("client/$clientId")
                }
            )
        }

        // Labels
        composable("labels") {
            LabelsScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() }
            )
        }

        // Search
        composable("search") {
            SearchScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() },
                onOpenProject = { projectId -> navController.navigate("project/$projectId") },
                onOpenDailyLog = { logId -> navController.navigate("daily-log/$logId") },
                onOpenDocument = { documentId -> navController.navigate("document/$documentId") },
                onOpenClient = { clientId -> navController.navigate("client/$clientId") },
                onOpenWarning = { warningId -> navController.navigate("warning/$warningId") }
            )
        }

        // Reports
        composable("reports") {
            ReportsScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() },
                onOpenReport = { reportId ->
                    // TODO: Could navigate to report detail/download
                }
            )
        }

        // Analytics
        composable("analytics") {
            AnalyticsScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() }
            )
        }

        // Admin - Company Settings
        composable("company-settings") {
            CompanySettingsScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() },
                onOpenUserManagement = { navController.navigate("user-management") },
                onOpenTeamManagement = { navController.navigate("team-management") },
                onOpenAuditLogs = { navController.navigate("audit-logs") },
                onOpenInvitations = { navController.navigate("invitations") },
                onOpenPermissions = { navController.navigate("permissions") }
            )
        }

        // Admin - User Management
        composable("user-management") {
            UserManagementScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() },
                onOpenUser = { userId ->
                    navController.navigate("user-detail/$userId")
                }
            )
        }

        // Admin - User Detail
        composable("user-detail/{userId}") { backStackEntry ->
            val userId = backStackEntry.arguments?.getString("userId")
            if (userId != null) {
                UserDetailScreen(
                    apiService = apiService,
                    userId = userId,
                    onBack = { navController.popBackStack() }
                )
            }
        }

        // Admin - Invitations
        composable("invitations") {
            InvitationsScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() }
            )
        }

        // Admin - Team Management
        composable("team-management") {
            TeamManagementScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() }
            )
        }

        // Admin - Audit Logs
        composable("audit-logs") {
            AuditLogsScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() }
            )
        }

        // Admin - Permissions
        composable("permissions") {
            PermissionsScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() }
            )
        }

        // Notifications
        composable("notifications") {
            NotificationsScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() },
                onNavigateToResource = { resourceType, resourceId ->
                    when (resourceType) {
                        "PROJECT" -> navController.navigate("project/$resourceId")
                        "DAILY_LOG" -> navController.navigate("daily-log/$resourceId")
                        "TASK" -> navController.navigate("task/$resourceId")
                        "RFI" -> navController.navigate("rfi/$resourceId")
                        "DOCUMENT" -> navController.navigate("document/$resourceId")
                        "EQUIPMENT" -> navController.navigate("equipment/$resourceId")
                        "INCIDENT" -> navController.navigate("incident/$resourceId")
                        "INSPECTION" -> navController.navigate("inspection/$resourceId")
                    }
                }
            )
        }

        // Tasks
        composable("tasks") {
            TasksScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() },
                onOpenTask = { taskId ->
                    // Could navigate to task detail screen
                }
            )
        }

        // RFIs
        composable("rfis") {
            RfiScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() },
                onOpenRfi = { rfiId ->
                    // Could navigate to RFI detail screen
                }
            )
        }

        // Secure Upload
        composable("secure-upload") {
            SecureUploadScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() },
                onUploadComplete = { fileId ->
                    // Could navigate to file detail or show toast
                }
            )
        }

        // Drone Flights (DroneDeploy Integration)
        composable("drone-flights") {
            DroneFlightsScreen(
                apiService = apiService,
                projectId = null,
                onBack = { navController.popBackStack() },
                onOpenProject = { projectId -> navController.navigate("project/$projectId") }
            )
        }

        composable("drone-flights/{projectId}") { backStackEntry ->
            val projectId = backStackEntry.arguments?.getString("projectId")
            if (projectId != null) {
                DroneFlightsScreen(
                    apiService = apiService,
                    projectId = projectId,
                    onBack = { navController.popBackStack() },
                    onOpenProject = { id -> navController.navigate("project/$id") }
                )
            }
        }
    }
}
