package com.constructionpro.app.data.model

import kotlinx.serialization.Serializable

// ============ NOTIFICATION TYPES ============

object NotificationType {
    const val DAILY_LOG_SUBMITTED = "DAILY_LOG_SUBMITTED"
    const val DAILY_LOG_APPROVED = "DAILY_LOG_APPROVED"
    const val DAILY_LOG_REJECTED = "DAILY_LOG_REJECTED"
    const val TIME_ENTRY_APPROVED = "TIME_ENTRY_APPROVED"
    const val TIME_ENTRY_REJECTED = "TIME_ENTRY_REJECTED"
    const val TASK_ASSIGNED = "TASK_ASSIGNED"
    const val TASK_COMPLETED = "TASK_COMPLETED"
    const val TASK_DUE_SOON = "TASK_DUE_SOON"
    const val TASK_OVERDUE = "TASK_OVERDUE"
    const val RFI_CREATED = "RFI_CREATED"
    const val RFI_RESPONSE = "RFI_RESPONSE"
    const val RFI_CLOSED = "RFI_CLOSED"
    const val INCIDENT_REPORTED = "INCIDENT_REPORTED"
    const val INSPECTION_DUE = "INSPECTION_DUE"
    const val CERTIFICATION_EXPIRING = "CERTIFICATION_EXPIRING"
    const val DOCUMENT_SHARED = "DOCUMENT_SHARED"
    const val PROJECT_UPDATE = "PROJECT_UPDATE"
    const val MENTION = "MENTION"
    const val COMMENT = "COMMENT"
    const val APPROVAL_REQUIRED = "APPROVAL_REQUIRED"
    const val WARNING_ISSUED = "WARNING_ISSUED"
    const val SCHEDULE_CHANGE = "SCHEDULE_CHANGE"
    const val WEATHER_ALERT = "WEATHER_ALERT"

    fun displayName(type: String): String = when (type) {
        DAILY_LOG_SUBMITTED -> "Daily Log Submitted"
        DAILY_LOG_APPROVED -> "Daily Log Approved"
        DAILY_LOG_REJECTED -> "Daily Log Rejected"
        TIME_ENTRY_APPROVED -> "Time Entry Approved"
        TIME_ENTRY_REJECTED -> "Time Entry Rejected"
        TASK_ASSIGNED -> "Task Assigned"
        TASK_COMPLETED -> "Task Completed"
        TASK_DUE_SOON -> "Task Due Soon"
        TASK_OVERDUE -> "Task Overdue"
        RFI_CREATED -> "RFI Created"
        RFI_RESPONSE -> "RFI Response"
        RFI_CLOSED -> "RFI Closed"
        INCIDENT_REPORTED -> "Incident Reported"
        INSPECTION_DUE -> "Inspection Due"
        CERTIFICATION_EXPIRING -> "Certification Expiring"
        DOCUMENT_SHARED -> "Document Shared"
        PROJECT_UPDATE -> "Project Update"
        MENTION -> "You Were Mentioned"
        COMMENT -> "New Comment"
        APPROVAL_REQUIRED -> "Approval Required"
        WARNING_ISSUED -> "Warning Issued"
        SCHEDULE_CHANGE -> "Schedule Change"
        WEATHER_ALERT -> "Weather Alert"
        else -> type.replace("_", " ")
    }

    fun category(type: String): String = when (type) {
        DAILY_LOG_SUBMITTED, DAILY_LOG_APPROVED, DAILY_LOG_REJECTED -> "Daily Logs"
        TIME_ENTRY_APPROVED, TIME_ENTRY_REJECTED -> "Time Tracking"
        TASK_ASSIGNED, TASK_COMPLETED, TASK_DUE_SOON, TASK_OVERDUE -> "Tasks"
        RFI_CREATED, RFI_RESPONSE, RFI_CLOSED -> "RFIs"
        INCIDENT_REPORTED, INSPECTION_DUE -> "Safety"
        CERTIFICATION_EXPIRING -> "Certifications"
        DOCUMENT_SHARED -> "Documents"
        PROJECT_UPDATE, SCHEDULE_CHANGE -> "Projects"
        MENTION, COMMENT -> "Comments"
        APPROVAL_REQUIRED -> "Approvals"
        WARNING_ISSUED -> "HR"
        WEATHER_ALERT -> "Weather"
        else -> "General"
    }
}

// ============ NOTIFICATION ============

@Serializable
data class Notification(
    val id: String,
    val type: String,
    val title: String,
    val message: String,
    val isRead: Boolean = false,
    val read: Boolean = false, // API may return this instead of isRead
    val resourceType: String? = null, // PROJECT, DAILY_LOG, TASK, RFI, etc.
    val resourceId: String? = null,
    val projectId: String? = null,
    val projectName: String? = null,
    val actorId: String? = null,
    val actorName: String? = null,
    val createdAt: String,
    val readAt: String? = null
)

@Serializable
data class NotificationListResponse(
    val notifications: List<Notification>,
    val unreadCount: Int = 0,
    val total: Int? = null
)

@Serializable
data class NotificationPreferences(
    // Push notifications
    val pushEnabled: Boolean = true,
    val pushDailyLogs: Boolean = true,
    val pushApprovals: Boolean = true,
    val pushTasks: Boolean = true,
    val pushRFIs: Boolean = true,
    val pushSafety: Boolean = true,
    val pushMentions: Boolean = true,
    // Email notifications
    val emailEnabled: Boolean = true,
    val emailDigestFrequency: String = "DAILY", // NEVER, INSTANT, DAILY, WEEKLY
    val emailApprovals: Boolean = true,
    val emailTasks: Boolean = true,
    val emailCertifications: Boolean = true,
    // Quiet hours
    val quietHoursEnabled: Boolean = false,
    val quietHoursStart: String? = null, // "22:00"
    val quietHoursEnd: String? = null // "07:00"
)

@Serializable
data class MarkNotificationsRequest(
    val notificationIds: List<String>,
    val isRead: Boolean
)

// ============ ACTIVITY FEED ============

object ActivityType {
    const val CREATED = "CREATED"
    const val UPDATED = "UPDATED"
    const val DELETED = "DELETED"
    const val COMMENTED = "COMMENTED"
    const val APPROVED = "APPROVED"
    const val REJECTED = "REJECTED"
    const val ASSIGNED = "ASSIGNED"
    const val COMPLETED = "COMPLETED"
    const val UPLOADED = "UPLOADED"
    const val SHARED = "SHARED"
    const val MENTIONED = "MENTIONED"
    const val STATUS_CHANGED = "STATUS_CHANGED"

    fun displayName(type: String): String = when (type) {
        CREATED -> "created"
        UPDATED -> "updated"
        DELETED -> "deleted"
        COMMENTED -> "commented on"
        APPROVED -> "approved"
        REJECTED -> "rejected"
        ASSIGNED -> "assigned"
        COMPLETED -> "completed"
        UPLOADED -> "uploaded"
        SHARED -> "shared"
        MENTIONED -> "mentioned you in"
        STATUS_CHANGED -> "changed status of"
        else -> type.lowercase()
    }
}

@Serializable
data class ActivityItem(
    val id: String,
    val type: String,
    val resourceType: String, // PROJECT, DAILY_LOG, DOCUMENT, etc.
    val resourceId: String,
    val resourceName: String? = null,
    val userId: String,
    val userName: String,
    val userAvatarUrl: String? = null,
    val projectId: String? = null,
    val projectName: String? = null,
    val description: String? = null,
    val metadata: Map<String, String>? = null,
    val createdAt: String
)

@Serializable
data class ActivityFeedResponse(
    val activities: List<ActivityItem>,
    val hasMore: Boolean = false,
    val nextCursor: String? = null
)

// ============ TASKS ============

object TaskStatus {
    const val TODO = "TODO"
    const val IN_PROGRESS = "IN_PROGRESS"
    const val BLOCKED = "BLOCKED"
    const val COMPLETED = "COMPLETED"
    const val CANCELLED = "CANCELLED"

    val all = listOf(TODO, IN_PROGRESS, BLOCKED, COMPLETED, CANCELLED)

    fun displayName(status: String): String = when (status) {
        TODO -> "To Do"
        IN_PROGRESS -> "In Progress"
        BLOCKED -> "Blocked"
        COMPLETED -> "Completed"
        CANCELLED -> "Cancelled"
        else -> status.replace("_", " ")
    }
}

object TaskPriority {
    const val LOW = "LOW"
    const val MEDIUM = "MEDIUM"
    const val HIGH = "HIGH"
    const val URGENT = "URGENT"

    val all = listOf(LOW, MEDIUM, HIGH, URGENT)

    fun displayName(priority: String): String = when (priority) {
        LOW -> "Low"
        MEDIUM -> "Medium"
        HIGH -> "High"
        URGENT -> "Urgent"
        else -> priority
    }
}

@Serializable
data class Task(
    val id: String,
    val title: String,
    val description: String? = null,
    val status: String = TaskStatus.TODO,
    val priority: String = TaskPriority.MEDIUM,
    val projectId: String,
    val projectName: String? = null,
    val assigneeId: String? = null,
    val assigneeName: String? = null,
    val createdById: String? = null,
    val createdBy: String? = null, // API may return this instead of createdById
    val createdByName: String? = null,
    val dueDate: String? = null,
    val startDate: String? = null,
    val completedAt: String? = null,
    val estimatedHours: Double? = null,
    val actualHours: Double? = null,
    val tags: List<String>? = null,
    val attachments: Int = 0,
    val comments: Int = 0,
    val subtasks: Int = 0,
    val subtasksCompleted: Int = 0,
    val createdAt: String? = null,
    val updatedAt: String? = null
)

@Serializable
data class TaskListResponse(
    val tasks: List<Task>,
    val total: Int? = null
)

@Serializable
data class CreateTaskRequest(
    val title: String,
    val description: String? = null,
    val projectId: String,
    val assigneeId: String? = null,
    val priority: String = TaskPriority.MEDIUM,
    val dueDate: String? = null,
    val startDate: String? = null,
    val estimatedHours: Double? = null,
    val tags: List<String>? = null
)

@Serializable
data class UpdateTaskRequest(
    val title: String? = null,
    val description: String? = null,
    val status: String? = null,
    val priority: String? = null,
    val assigneeId: String? = null,
    val dueDate: String? = null,
    val startDate: String? = null,
    val estimatedHours: Double? = null,
    val actualHours: Double? = null,
    val tags: List<String>? = null
)

@Serializable
data class Subtask(
    val id: String,
    val taskId: String,
    val title: String,
    val isCompleted: Boolean = false,
    val order: Int = 0
)

// ============ RFI (Request for Information) ============

object RfiStatus {
    const val DRAFT = "DRAFT"
    const val OPEN = "OPEN"
    const val PENDING = "PENDING"
    const val ANSWERED = "ANSWERED"
    const val CLOSED = "CLOSED"
    const val VOID = "VOID"

    val all = listOf(DRAFT, OPEN, PENDING, ANSWERED, CLOSED, VOID)

    fun displayName(status: String): String = when (status) {
        DRAFT -> "Draft"
        OPEN -> "Open"
        PENDING -> "Pending Response"
        ANSWERED -> "Answered"
        CLOSED -> "Closed"
        VOID -> "Void"
        else -> status.replace("_", " ")
    }
}

object RfiPriority {
    const val LOW = "LOW"
    const val NORMAL = "NORMAL"
    const val HIGH = "HIGH"
    const val CRITICAL = "CRITICAL"

    val all = listOf(LOW, NORMAL, HIGH, CRITICAL)

    fun displayName(priority: String): String = priority.lowercase().replaceFirstChar { it.uppercase() }
}

@Serializable
data class Rfi(
    val id: String,
    val number: String, // RFI-001, RFI-002, etc.
    val subject: String,
    val question: String,
    val status: String = RfiStatus.OPEN,
    val priority: String = RfiPriority.NORMAL,
    val projectId: String,
    val projectName: String? = null,
    val createdById: String,
    val createdBy: String? = null, // API may return this instead of createdById
    val createdByName: String? = null,
    val assignedToId: String? = null,
    val assignedTo: String? = null, // API may return this instead of assignedToId
    val assignedToName: String? = null,
    val dueDate: String? = null,
    val responseDueDate: String? = null,
    val closedAt: String? = null,
    val closedById: String? = null,
    val closedByName: String? = null,
    val drawingReference: String? = null,
    val specificationReference: String? = null,
    val costImpact: Boolean? = null,
    val scheduleImpact: Boolean? = null,
    val attachments: Int = 0,
    val responses: Int = 0,
    val createdAt: String,
    val updatedAt: String? = null
)

@Serializable
data class RfiResponse(
    val id: String,
    val rfiId: String,
    val content: String,
    val respondedById: String,
    val respondedByName: String? = null,
    val isOfficial: Boolean = false,
    val attachments: List<String>? = null,
    val createdAt: String
)

@Serializable
data class RfiListResponse(
    val rfis: List<Rfi>,
    val total: Int? = null
)

@Serializable
data class RfiDetailResponse(
    val rfi: Rfi,
    val responses: List<RfiResponse>? = null
)

@Serializable
data class CreateRfiRequest(
    val subject: String,
    val question: String,
    val projectId: String,
    val assignedToId: String? = null,
    val priority: String = RfiPriority.NORMAL,
    val dueDate: String? = null,
    val drawingReference: String? = null,
    val specificationReference: String? = null,
    val costImpact: Boolean? = null,
    val scheduleImpact: Boolean? = null
)

@Serializable
data class UpdateRfiRequest(
    val subject: String? = null,
    val question: String? = null,
    val status: String? = null,
    val priority: String? = null,
    val assignedToId: String? = null,
    val dueDate: String? = null,
    val drawingReference: String? = null,
    val specificationReference: String? = null,
    val costImpact: Boolean? = null,
    val scheduleImpact: Boolean? = null
)

@Serializable
data class AddRfiResponseRequest(
    val content: String,
    val isOfficial: Boolean = false
)

// ============ COMMENTS ============

@Serializable
data class Comment(
    val id: String,
    val content: String,
    val resourceType: String, // TASK, RFI, DAILY_LOG, etc.
    val resourceId: String,
    val authorId: String,
    val authorName: String,
    val authorAvatarUrl: String? = null,
    val mentions: List<String>? = null,
    val attachments: List<String>? = null,
    val isEdited: Boolean = false,
    val createdAt: String,
    val updatedAt: String? = null
)

@Serializable
data class CommentListResponse(
    val comments: List<Comment>
)

@Serializable
data class AddCommentRequest(
    val content: String,
    val resourceType: String,
    val resourceId: String,
    val mentions: List<String>? = null
)
