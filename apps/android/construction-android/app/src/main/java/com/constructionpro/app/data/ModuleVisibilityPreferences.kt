package com.constructionpro.app.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.moduleVisibilityDataStore: DataStore<Preferences> by preferencesDataStore(name = "module_visibility_preferences")

/**
 * Stores user's personal preferences for which modules to show/hide on their device.
 * This is separate from company-wide module enable/disable settings.
 *
 * A module is visible on the dashboard only if:
 * 1. Company admin has enabled it (from CompanySettings)
 * 2. User hasn't hidden it locally (from this class)
 */
class ModuleVisibilityPreferences(private val context: Context) {

    companion object {
        // Keys for each module's visibility preference
        // true = visible (default), false = hidden
        private val SHOW_PROJECTS = booleanPreferencesKey("show_projects")
        private val SHOW_DAILY_LOGS = booleanPreferencesKey("show_daily_logs")
        private val SHOW_DOCUMENTS = booleanPreferencesKey("show_documents")
        private val SHOW_DRAWINGS = booleanPreferencesKey("show_drawings")
        private val SHOW_TIME_TRACKING = booleanPreferencesKey("show_time_tracking")
        private val SHOW_EQUIPMENT = booleanPreferencesKey("show_equipment")
        private val SHOW_SCHEDULING = booleanPreferencesKey("show_scheduling")
        private val SHOW_SAFETY = booleanPreferencesKey("show_safety")
        private val SHOW_FINANCIALS = booleanPreferencesKey("show_financials")
        private val SHOW_APPROVALS = booleanPreferencesKey("show_approvals")
        private val SHOW_CERTIFICATIONS = booleanPreferencesKey("show_certifications")
        private val SHOW_SUBCONTRACTORS = booleanPreferencesKey("show_subcontractors")
        private val SHOW_TASKS = booleanPreferencesKey("show_tasks")
        private val SHOW_RFIS = booleanPreferencesKey("show_rfis")
        private val SHOW_NOTIFICATIONS = booleanPreferencesKey("show_notifications")
        private val SHOW_SECURE_UPLOAD = booleanPreferencesKey("show_secure_upload")
        private val SHOW_DRONE_DEPLOY = booleanPreferencesKey("show_drone_deploy")
        // Additional modules for Insights & Admin sections
        private val SHOW_ANALYTICS = booleanPreferencesKey("show_analytics")
        private val SHOW_REPORTS = booleanPreferencesKey("show_reports")
        private val SHOW_WARNINGS = booleanPreferencesKey("show_warnings")
        private val SHOW_CLIENTS = booleanPreferencesKey("show_clients")
        private val SHOW_LABELS = booleanPreferencesKey("show_labels")
        private val SHOW_SEARCH = booleanPreferencesKey("show_search")
        private val SHOW_COMPANY_SETTINGS = booleanPreferencesKey("show_company_settings")

        @Volatile
        private var instance: ModuleVisibilityPreferences? = null

        fun getInstance(context: Context): ModuleVisibilityPreferences {
            return instance ?: synchronized(this) {
                instance ?: ModuleVisibilityPreferences(context.applicationContext).also { instance = it }
            }
        }
    }

    /**
     * Data class containing visibility state for all modules
     */
    data class ModuleVisibility(
        val showProjects: Boolean = true,
        val showDailyLogs: Boolean = true,
        val showDocuments: Boolean = true,
        val showDrawings: Boolean = true,
        val showTimeTracking: Boolean = true,
        val showEquipment: Boolean = true,
        val showScheduling: Boolean = false,  // Off by default - not commonly used on mobile
        val showSafety: Boolean = true,
        val showFinancials: Boolean = true,
        val showApprovals: Boolean = true,
        val showCertifications: Boolean = true,
        val showSubcontractors: Boolean = true,
        val showTasks: Boolean = false,       // Off by default - not commonly used on mobile
        val showRfis: Boolean = false,        // Off by default - not commonly used on mobile
        val showNotifications: Boolean = true,
        val showSecureUpload: Boolean = true,
        val showDroneDeploy: Boolean = true,
        // Additional modules for Insights & Admin sections
        val showAnalytics: Boolean = true,
        val showReports: Boolean = false,     // Off by default - not commonly used on mobile
        val showWarnings: Boolean = true,
        val showClients: Boolean = false,     // Off by default - not commonly used on mobile
        val showLabels: Boolean = true,
        val showSearch: Boolean = true,
        val showCompanySettings: Boolean = true
    )

    /**
     * Flow of all module visibility preferences
     */
    val visibilityFlow: Flow<ModuleVisibility> = context.moduleVisibilityDataStore.data.map { preferences ->
        ModuleVisibility(
            showProjects = preferences[SHOW_PROJECTS] ?: true,
            showDailyLogs = preferences[SHOW_DAILY_LOGS] ?: true,
            showDocuments = preferences[SHOW_DOCUMENTS] ?: true,
            showDrawings = preferences[SHOW_DRAWINGS] ?: true,
            showTimeTracking = preferences[SHOW_TIME_TRACKING] ?: true,
            showEquipment = preferences[SHOW_EQUIPMENT] ?: true,
            showScheduling = preferences[SHOW_SCHEDULING] ?: false,  // Off by default
            showSafety = preferences[SHOW_SAFETY] ?: true,
            showFinancials = preferences[SHOW_FINANCIALS] ?: true,
            showApprovals = preferences[SHOW_APPROVALS] ?: true,
            showCertifications = preferences[SHOW_CERTIFICATIONS] ?: true,
            showSubcontractors = preferences[SHOW_SUBCONTRACTORS] ?: true,
            showTasks = preferences[SHOW_TASKS] ?: false,            // Off by default
            showRfis = preferences[SHOW_RFIS] ?: false,              // Off by default
            showNotifications = preferences[SHOW_NOTIFICATIONS] ?: true,
            showSecureUpload = preferences[SHOW_SECURE_UPLOAD] ?: true,
            showDroneDeploy = preferences[SHOW_DRONE_DEPLOY] ?: true,
            showAnalytics = preferences[SHOW_ANALYTICS] ?: true,
            showReports = preferences[SHOW_REPORTS] ?: false,        // Off by default
            showWarnings = preferences[SHOW_WARNINGS] ?: true,
            showClients = preferences[SHOW_CLIENTS] ?: false,        // Off by default
            showLabels = preferences[SHOW_LABELS] ?: true,
            showSearch = preferences[SHOW_SEARCH] ?: true,
            showCompanySettings = preferences[SHOW_COMPANY_SETTINGS] ?: true
        )
    }

    /**
     * Update visibility for a specific module
     */
    suspend fun setModuleVisibility(module: String, visible: Boolean) {
        context.moduleVisibilityDataStore.edit { preferences ->
            val key = when (module) {
                "projects" -> SHOW_PROJECTS
                "dailyLogs" -> SHOW_DAILY_LOGS
                "documents" -> SHOW_DOCUMENTS
                "drawings" -> SHOW_DRAWINGS
                "timeTracking" -> SHOW_TIME_TRACKING
                "equipment" -> SHOW_EQUIPMENT
                "scheduling" -> SHOW_SCHEDULING
                "safety" -> SHOW_SAFETY
                "financials" -> SHOW_FINANCIALS
                "approvals" -> SHOW_APPROVALS
                "certifications" -> SHOW_CERTIFICATIONS
                "subcontractors" -> SHOW_SUBCONTRACTORS
                "tasks" -> SHOW_TASKS
                "rfis" -> SHOW_RFIS
                "notifications" -> SHOW_NOTIFICATIONS
                "secureUpload" -> SHOW_SECURE_UPLOAD
                "droneDeploy" -> SHOW_DRONE_DEPLOY
                "analytics" -> SHOW_ANALYTICS
                "reports" -> SHOW_REPORTS
                "warnings" -> SHOW_WARNINGS
                "clients" -> SHOW_CLIENTS
                "labels" -> SHOW_LABELS
                "search" -> SHOW_SEARCH
                "companySettings" -> SHOW_COMPANY_SETTINGS
                else -> return@edit
            }
            preferences[key] = visible
        }
    }

    /**
     * Reset all modules to their default visibility
     */
    suspend fun resetAll() {
        context.moduleVisibilityDataStore.edit { preferences ->
            preferences[SHOW_PROJECTS] = true
            preferences[SHOW_DAILY_LOGS] = true
            preferences[SHOW_DOCUMENTS] = true
            preferences[SHOW_DRAWINGS] = true
            preferences[SHOW_TIME_TRACKING] = true
            preferences[SHOW_EQUIPMENT] = true
            preferences[SHOW_SCHEDULING] = false  // Off by default
            preferences[SHOW_SAFETY] = true
            preferences[SHOW_FINANCIALS] = true
            preferences[SHOW_APPROVALS] = true
            preferences[SHOW_CERTIFICATIONS] = true
            preferences[SHOW_SUBCONTRACTORS] = true
            preferences[SHOW_TASKS] = false       // Off by default
            preferences[SHOW_RFIS] = false        // Off by default
            preferences[SHOW_NOTIFICATIONS] = true
            preferences[SHOW_SECURE_UPLOAD] = true
            preferences[SHOW_DRONE_DEPLOY] = true
            preferences[SHOW_ANALYTICS] = true
            preferences[SHOW_REPORTS] = false     // Off by default
            preferences[SHOW_WARNINGS] = true
            preferences[SHOW_CLIENTS] = false     // Off by default
            preferences[SHOW_LABELS] = true
            preferences[SHOW_SEARCH] = true
            preferences[SHOW_COMPANY_SETTINGS] = true
        }
    }
}
