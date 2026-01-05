package com.constructionpro.app.data.model

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject

@Serializable
data class SettingsResponse(
  val company: CompanySettings? = null,
  val user: UserPreferences? = null
)

@Serializable
data class CompanySettings(
  val companyName: String? = null,
  val companyLogo: String? = null,
  val timezone: String? = null,
  val dateFormat: String? = null,
  val currency: String? = null,
  val moduleProjects: Boolean? = null,
  val moduleDailyLogs: Boolean? = null,
  val moduleTimeTracking: Boolean? = null,
  val moduleScheduling: Boolean? = null,
  val moduleEquipment: Boolean? = null,
  val moduleDocuments: Boolean? = null,
  val moduleSafety: Boolean? = null,
  val moduleFinancials: Boolean? = null,
  val moduleReports: Boolean? = null,
  val moduleAnalytics: Boolean? = null,
  val moduleSubcontractors: Boolean? = null,
  val moduleCertifications: Boolean? = null,
  val moduleDroneDeploy: Boolean? = null,
  val moduleApprovals: Boolean? = null,
  val moduleWarnings: Boolean? = null,
  val moduleTasks: Boolean? = null,
  val moduleRfis: Boolean? = null,
  val moduleNotifications: Boolean? = null,
  val moduleSecureUpload: Boolean? = null,
  val allowFieldWorkerSafety: Boolean? = null,
  val allowFieldWorkerScheduling: Boolean? = null,
  val fieldWorkerDailyLogAccess: String? = null,
  val roleModuleOverrides: JsonObject? = null,
  val roleDataAccess: JsonObject? = null,
  val requireGpsClockIn: Boolean? = null,
  val requirePhotoDaily: Boolean? = null,
  val autoApproveTimesheet: Boolean? = null,
  val dailyLogReminders: Boolean? = null,
  val certExpiryAlertDays: Int? = null,
  val maxFileUploadMB: Int? = null,
  val autoDeleteDocuments: Boolean? = null,
  val autoDeleteDocumentsYears: Int? = null,
  val emailNotifications: Boolean? = null,
  val pushNotifications: Boolean? = null,
  val activitiesEnabled: Boolean? = null,
  val dailyLogApprovalRequired: Boolean? = null,
  val hideBuildingInfo: Boolean? = null
)

@Serializable
data class UserPreferences(
  val theme: String? = null,
  val sidebarCollapsed: Boolean? = null,
  val dashboardLayout: String? = null,
  val defaultProjectId: String? = null,
  val sidebarOrder: List<String>? = null,
  val emailDailyDigest: Boolean? = null,
  val emailApprovals: Boolean? = null,
  val emailMentions: Boolean? = null,
  val emailCertExpiry: Boolean? = null,
  val pushEnabled: Boolean? = null,
  val itemsPerPage: Int? = null,
  val showCompletedTasks: Boolean? = null,
  val defaultView: String? = null
)

@Serializable
data class UpdateSettingsRequest(
  val type: String, // "company" or "user"
  val settings: CompanySettingsUpdate
)

@Serializable
data class CompanySettingsUpdate(
  // Company info
  val timezone: String? = null,
  val dateFormat: String? = null,
  val currency: String? = null,
  // Modules
  val moduleProjects: Boolean? = null,
  val moduleDailyLogs: Boolean? = null,
  val moduleTimeTracking: Boolean? = null,
  val moduleScheduling: Boolean? = null,
  val moduleEquipment: Boolean? = null,
  val moduleDocuments: Boolean? = null,
  val moduleSafety: Boolean? = null,
  val moduleFinancials: Boolean? = null,
  val moduleReports: Boolean? = null,
  val moduleAnalytics: Boolean? = null,
  val moduleSubcontractors: Boolean? = null,
  val moduleCertifications: Boolean? = null,
  val moduleDroneDeploy: Boolean? = null,
  val moduleApprovals: Boolean? = null,
  val moduleWarnings: Boolean? = null,
  val moduleTasks: Boolean? = null,
  val moduleRfis: Boolean? = null,
  val moduleNotifications: Boolean? = null,
  val moduleSecureUpload: Boolean? = null,
  // Workflow settings
  val dailyLogApprovalRequired: Boolean? = null,
  val requireGpsClockIn: Boolean? = null,
  val requirePhotoDaily: Boolean? = null,
  val autoApproveTimesheet: Boolean? = null,
  val dailyLogReminders: Boolean? = null,
  val emailNotifications: Boolean? = null,
  val pushNotifications: Boolean? = null,
  val hideBuildingInfo: Boolean? = null
)

@Serializable
data class UpdateSettingsResponse(
  val success: Boolean,
  val company: CompanySettings? = null,
  val message: String? = null
)

// Response wrapper for GET /users/me/preferences
@Serializable
data class PreferencesResponse(
  val preferences: UserPreferences
)

// Request for PATCH /users/me/preferences - all fields optional for partial updates
@Serializable
data class UpdatePreferencesRequest(
  val theme: String? = null,
  val sidebarCollapsed: Boolean? = null,
  val dashboardLayout: Map<String, String>? = null,
  val defaultProjectId: String? = null,
  val sidebarOrder: List<String>? = null,
  val emailDailyDigest: Boolean? = null,
  val emailApprovals: Boolean? = null,
  val emailMentions: Boolean? = null,
  val emailCertExpiry: Boolean? = null,
  val pushEnabled: Boolean? = null,
  val itemsPerPage: Int? = null,
  val showCompletedTasks: Boolean? = null,
  val defaultView: String? = null
)
