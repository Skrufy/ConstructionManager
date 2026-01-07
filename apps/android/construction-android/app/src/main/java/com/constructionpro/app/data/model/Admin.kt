package com.constructionpro.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// ============ USER ROLES ============

object UserRole {
    const val ADMIN = "ADMIN"
    const val PROJECT_MANAGER = "PROJECT_MANAGER"
    const val SUPERINTENDENT = "SUPERINTENDENT"
    const val FOREMAN = "FOREMAN"
    const val FIELD_WORKER = "FIELD_WORKER"
    const val SUBCONTRACTOR = "SUBCONTRACTOR"
    const val CLIENT = "CLIENT"
    const val ACCOUNTANT = "ACCOUNTANT"
    const val HR = "HR"
    const val SAFETY_OFFICER = "SAFETY_OFFICER"
    const val VIEWER = "VIEWER"

    val all = listOf(
        ADMIN, PROJECT_MANAGER, SUPERINTENDENT, FOREMAN,
        FIELD_WORKER, SUBCONTRACTOR, CLIENT, ACCOUNTANT,
        HR, SAFETY_OFFICER, VIEWER
    )

    fun displayName(role: String): String = when (role) {
        ADMIN -> "Administrator"
        PROJECT_MANAGER -> "Project Manager"
        SUPERINTENDENT -> "Superintendent"
        FOREMAN -> "Foreman"
        FIELD_WORKER -> "Field Worker"
        SUBCONTRACTOR -> "Subcontractor"
        CLIENT -> "Client"
        ACCOUNTANT -> "Accountant"
        HR -> "Human Resources"
        SAFETY_OFFICER -> "Safety Officer"
        VIEWER -> "Viewer (Read Only)"
        else -> role.replace("_", " ")
    }

    fun description(role: String): String = when (role) {
        ADMIN -> "Full system access and configuration"
        PROJECT_MANAGER -> "Manage projects, teams, and approvals"
        SUPERINTENDENT -> "Oversee field operations and daily logs"
        FOREMAN -> "Lead crews and submit daily reports"
        FIELD_WORKER -> "Submit time entries and daily logs"
        SUBCONTRACTOR -> "Limited access to assigned projects"
        CLIENT -> "View project progress and documents"
        ACCOUNTANT -> "Access financial and payroll data"
        HR -> "Manage users, certifications, and warnings"
        SAFETY_OFFICER -> "Safety inspections and incident reports"
        VIEWER -> "Read-only access to assigned projects"
        else -> "Custom role"
    }
}

object UserStatus {
    const val ACTIVE = "ACTIVE"
    const val INACTIVE = "INACTIVE"
    const val PENDING = "PENDING"
    const val SUSPENDED = "SUSPENDED"

    val all = listOf(ACTIVE, INACTIVE, PENDING, SUSPENDED)

    fun displayName(status: String): String = when (status) {
        ACTIVE -> "Active"
        INACTIVE -> "Inactive"
        PENDING -> "Pending Activation"
        SUSPENDED -> "Suspended"
        else -> status
    }
}

// ============ PERMISSIONS ============

object PermissionCategory {
    const val PROJECTS = "PROJECTS"
    const val DAILY_LOGS = "DAILY_LOGS"
    const val TIME_TRACKING = "TIME_TRACKING"
    const val DOCUMENTS = "DOCUMENTS"
    const val SAFETY = "SAFETY"
    const val FINANCIALS = "FINANCIALS"
    const val USERS = "USERS"
    const val REPORTS = "REPORTS"
    const val ADMIN = "ADMIN"

    val all = listOf(PROJECTS, DAILY_LOGS, TIME_TRACKING, DOCUMENTS, SAFETY, FINANCIALS, USERS, REPORTS, ADMIN)
}

// Access levels for Procore-style permission system
object AccessLevel {
    const val NONE = "none"
    const val READ_ONLY = "read_only"
    const val STANDARD = "standard"
    const val ADMIN = "admin"

    val all = listOf(NONE, READ_ONLY, STANDARD, ADMIN)

    fun displayName(level: String): String = when (level) {
        NONE -> "None"
        READ_ONLY -> "Read Only"
        STANDARD -> "Standard"
        ADMIN -> "Admin"
        else -> level.replace("_", " ")
    }
}

@Serializable
data class Permission(
    val id: String,
    val name: String,
    val category: String,
    val description: String? = null
)

@Serializable
data class RolePermissions(
    val role: String,
    val permissions: List<String>
)

// ============ PERMISSION TEMPLATES ============

@Serializable
data class PermissionTemplate(
    val id: String,
    val name: String,
    val description: String? = null,
    val scope: String, // "project" or "company"
    @SerialName("tool_permissions") val toolPermissions: Map<String, String> = emptyMap(),
    @SerialName("granular_permissions") val granularPermissions: Map<String, Boolean> = emptyMap(),
    @SerialName("is_system_default") val isSystemDefault: Boolean = false,
    @SerialName("is_protected") val isProtected: Boolean = false,
    @SerialName("sort_order") val sortOrder: Int = 0,
    @SerialName("usage_count") val usageCount: Int = 0,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
)

@Serializable
data class PermissionTemplatesResponse(
    val templates: List<PermissionTemplate>,
    @SerialName("project_templates") val projectTemplates: List<PermissionTemplate>,
    @SerialName("company_templates") val companyTemplates: List<PermissionTemplate>
)

@Serializable
data class AssignCompanyTemplateRequest(
    @SerialName("user_id") val userId: String,
    @SerialName("company_template_id") val companyTemplateId: String
)

@Serializable
data class AssignProjectTemplateRequest(
    @SerialName("user_id") val userId: String,
    @SerialName("project_id") val projectId: String,
    @SerialName("project_template_id") val projectTemplateId: String
)

@Serializable
data class UserPermissionAssignment(
    val id: String,
    @SerialName("user_id") val userId: String,
    @SerialName("company_template_id") val companyTemplateId: String? = null,
    @SerialName("company_template_name") val companyTemplateName: String? = null,
    @SerialName("assigned_by") val assignedBy: String? = null,
    @SerialName("assigned_at") val assignedAt: String? = null
)

@Serializable
data class UserPermissionsResponse(
    @SerialName("user_id") val userId: String,
    @SerialName("company_template") val companyTemplate: PermissionTemplate? = null,
    @SerialName("project_assignments") val projectAssignments: List<ProjectPermissionAssignment> = emptyList(),
    @SerialName("effective_permissions") val effectivePermissions: Map<String, String> = emptyMap()
)

@Serializable
data class ProjectPermissionAssignment(
    val id: String,
    @SerialName("project_id") val projectId: String,
    @SerialName("project_name") val projectName: String? = null,
    @SerialName("project_template_id") val projectTemplateId: String? = null,
    @SerialName("project_template_name") val projectTemplateName: String? = null,
    @SerialName("role_override") val roleOverride: String? = null,
    @SerialName("assigned_by") val assignedBy: String? = null
)

// ============ USER MANAGEMENT ============

@Serializable
data class UserDetail(
    val id: String,
    val email: String,
    val name: String,
    val phone: String? = null,
    val role: String,
    val status: String,
    val isBlaster: Boolean = false,
    val teamId: String? = null,
    val teamName: String? = null,
    val jobTitle: String? = null,
    val department: String? = null,
    val employeeId: String? = null,
    val hireDate: String? = null,
    val avatarUrl: String? = null,
    val lastLoginAt: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val permissions: List<String>? = null,
    val assignedProjects: List<String>? = null
)

@Serializable
data class UserListResponse(
    val users: List<UserDetail>,
    val total: Int? = null,
    val page: Int? = null,
    val limit: Int? = null
)

@Serializable
data class UpdateUserRequest(
    val name: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val role: String? = null,
    val status: String? = null,
    val isBlaster: Boolean? = null,
    val teamId: String? = null,
    val jobTitle: String? = null,
    val department: String? = null,
    val employeeId: String? = null,
    val hireDate: String? = null,
    val permissions: List<String>? = null,
    val assignedProjects: List<String>? = null
)

@Serializable
data class BulkUserAction(
    val userIds: List<String>,
    val action: String, // ACTIVATE, DEACTIVATE, DELETE, CHANGE_ROLE
    val role: String? = null // For CHANGE_ROLE action
)

// ============ USER INVITATION ============

@Serializable
data class UserInvitation(
    val id: String,
    val email: String,
    val role: String,
    @SerialName("invited_by") val invitedBy: InvitedByUser? = null,
    val status: String, // PENDING, ACCEPTED, EXPIRED, CANCELLED
    val message: String? = null,
    @SerialName("expires_at") val expiresAt: String,
    @SerialName("created_at") val createdAt: String,
    @SerialName("updated_at") val updatedAt: String? = null,
    @SerialName("accepted_at") val acceptedAt: String? = null
)

@Serializable
data class InvitedByUser(
    val id: String,
    val name: String,
    val email: String
)

@Serializable
data class InviteUserRequest(
    val email: String,
    val role: String,
    val teamId: String? = null,
    val assignedProjects: List<String>? = null,
    val message: String? = null
)

@Serializable
data class InvitationListResponse(
    val invitations: List<UserInvitation>
)

// ============ TEAM MANAGEMENT ============

@Serializable
data class Team(
    val id: String,
    val name: String,
    val description: String? = null,
    val leaderId: String? = null,
    val leaderName: String? = null,
    val memberCount: Int = 0,
    val projectIds: List<String>? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null
)

@Serializable
data class TeamDetail(
    val id: String,
    val name: String,
    val description: String? = null,
    val leader: UserSummary? = null,
    val members: List<TeamMember>? = null,
    val projects: List<ProjectSummary>? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null
)

@Serializable
data class TeamMember(
    val id: String,
    val userId: String,
    val name: String,
    val email: String,
    val role: String,
    val jobTitle: String? = null,
    val joinedAt: String? = null
)

@Serializable
data class TeamListResponse(
    val teams: List<Team>
)

@Serializable
data class CreateTeamRequest(
    val name: String,
    val description: String? = null,
    val leaderId: String? = null,
    val memberIds: List<String>? = null,
    val projectIds: List<String>? = null
)

@Serializable
data class UpdateTeamRequest(
    val name: String? = null,
    val description: String? = null,
    val leaderId: String? = null
)

@Serializable
data class TeamMemberAction(
    val userIds: List<String>,
    val action: String // ADD, REMOVE
)

// ============ AUDIT LOG ============

@Serializable
data class AuditLog(
    val id: String,
    val userId: String,
    val userName: String? = null,
    val action: String,
    val resourceType: String, // USER, PROJECT, DAILY_LOG, etc.
    val resourceId: String? = null,
    val resourceName: String? = null,
    val details: String? = null,
    val ipAddress: String? = null,
    val userAgent: String? = null,
    val timestamp: String
)

@Serializable
data class AuditLogListResponse(
    val logs: List<AuditLog>,
    val total: Int? = null,
    val page: Int? = null
)

// ============ COMPANY PROFILE ============

@Serializable
data class CompanyProfile(
    val id: String,
    val name: String,
    val logo: String? = null,
    val address: String? = null,
    val city: String? = null,
    val state: String? = null,
    val zip: String? = null,
    val country: String? = null,
    val phone: String? = null,
    val email: String? = null,
    val website: String? = null,
    val taxId: String? = null,
    val licenseNumber: String? = null,
    val insuranceInfo: String? = null,
    val createdAt: String? = null,
    val subscription: SubscriptionInfo? = null,
    val usage: UsageStats? = null
)

@Serializable
data class SubscriptionInfo(
    val plan: String, // FREE, STARTER, PROFESSIONAL, ENTERPRISE
    val status: String, // ACTIVE, TRIAL, EXPIRED, CANCELLED
    val maxUsers: Int,
    val maxProjects: Int,
    val maxStorageGB: Int,
    val billingCycle: String? = null, // MONTHLY, ANNUAL
    val nextBillingDate: String? = null,
    val trialEndsAt: String? = null
)

@Serializable
data class UsageStats(
    val totalUsers: Int = 0,
    val activeUsers: Int = 0,
    val totalProjects: Int = 0,
    val activeProjects: Int = 0,
    val storageUsedMB: Long = 0,
    val documentsCount: Int = 0,
    val dailyLogsThisMonth: Int = 0
)

@Serializable
data class UpdateCompanyProfileRequest(
    val name: String? = null,
    val address: String? = null,
    val city: String? = null,
    val state: String? = null,
    val zip: String? = null,
    val country: String? = null,
    val phone: String? = null,
    val email: String? = null,
    val website: String? = null,
    val taxId: String? = null,
    val licenseNumber: String? = null,
    val insuranceInfo: String? = null
)

// ============ PASSWORD & SECURITY ============

@Serializable
data class ChangePasswordRequest(
    val currentPassword: String,
    val newPassword: String
)

@Serializable
data class ResetPasswordRequest(
    val userId: String
)

@Serializable
data class SecuritySettings(
    val twoFactorEnabled: Boolean = false,
    val sessionTimeoutMinutes: Int = 480,
    val passwordExpiryDays: Int = 90,
    val maxLoginAttempts: Int = 5,
    val requireComplexPassword: Boolean = true,
    val allowRememberMe: Boolean = true
)

// Note: ProjectSummary is defined in Project.kt
