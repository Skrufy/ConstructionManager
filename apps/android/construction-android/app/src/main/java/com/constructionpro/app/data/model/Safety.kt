package com.constructionpro.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// ============ INCIDENTS ============

@Serializable
data class Incident(
    val id: String,
    @SerialName("project_id") val projectId: String,
    val project: ProjectSummary? = null,
    @SerialName("project_name") val projectName: String? = null, // API returns flat field
    @SerialName("reported_by") val reportedById: String,
    val reportedBy: UserSummary? = null,
    @SerialName("reporter_name") val reporterName: String? = null, // API returns flat field
    val type: String, // INJURY, NEAR_MISS, PROPERTY_DAMAGE, ENVIRONMENTAL, OTHER
    val severity: String, // LOW, MEDIUM, HIGH, CRITICAL
    val status: String = "REPORTED", // REPORTED, UNDER_INVESTIGATION, CLOSED
    val title: String,
    val description: String? = null,
    val location: String? = null,
    @SerialName("incident_date") val incidentDate: String,
    @SerialName("incident_time") val incidentTime: String? = null,
    @SerialName("immediate_actions") val immediateActions: String? = null,
    @SerialName("involved_personnel") val involvedPersonnel: kotlinx.serialization.json.JsonElement? = null, // Flexible JSON
    val witnesses: kotlinx.serialization.json.JsonElement? = null, // Flexible JSON - API returns raw JSON
    @SerialName("injured_parties") val injuredParties: kotlinx.serialization.json.JsonElement? = null, // API field
    @SerialName("root_cause") val rootCause: String? = null,
    @SerialName("corrective_actions") val correctiveActions: String? = null,
    @SerialName("investigation_notes") val investigationNotes: String? = null,
    @SerialName("osha_recordable") val oshaRecordable: Boolean? = null,
    @SerialName("lost_time_days") val lostTimeDays: Int? = null,
    @SerialName("closed_at") val closedAt: String? = null,
    @SerialName("closed_by") val closedById: String? = null,
    val closedBy: UserSummary? = null,
    @SerialName("closer_name") val closerName: String? = null, // API returns flat field
    val photos: kotlinx.serialization.json.JsonElement? = null, // Flexible JSON
    @SerialName("photo_urls") val photoUrls: kotlinx.serialization.json.JsonElement? = null, // API field
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
) {
    // Helper to get project name from either nested object or flat field
    val displayProjectName: String? get() = project?.name ?: projectName
    // Helper to get reporter name
    val displayReporterName: String? get() = reportedBy?.name ?: reporterName
}

@Serializable
data class IncidentPerson(
    val id: String? = null,
    val name: String? = null,
    val role: String? = null,
    val injuryType: String? = null
)

@Serializable
data class IncidentWitness(
    val id: String? = null,
    val name: String? = null,
    val contact: String? = null
)

@Serializable
data class IncidentsResponse(
    val incidents: List<Incident> = emptyList(),
    val total: Int = 0,
    val page: Int = 1,
    val pageSize: Int = 20
)

@Serializable
data class CreateIncidentRequest(
    val projectId: String,
    val type: String,
    val severity: String,
    val title: String,
    val description: String,
    val location: String? = null,
    val incidentDate: String,
    val immediateActions: String? = null,
    val witnesses: String? = null
)

@Serializable
data class IncidentResponse(
    val incident: Incident
)

// ============ INSPECTIONS ============

@Serializable
data class Inspection(
    val id: String,
    @SerialName("project_id") val projectId: String,
    val project: ProjectSummary? = null,
    @SerialName("project_name") val projectName: String? = null, // API returns flat field
    @SerialName("template_id") val templateId: String? = null,
    val template: InspectionTemplate? = null,
    @SerialName("template_name") val templateName: String? = null, // API returns flat field
    @SerialName("template_category") val templateCategory: String? = null, // API returns flat field
    @SerialName("inspector_id") val inspectorId: String,
    val inspector: UserSummary? = null,
    @SerialName("inspector_name") val inspectorName: String? = null, // API returns flat field
    val status: String = "SCHEDULED", // SCHEDULED, IN_PROGRESS, COMPLETED, FAILED
    @SerialName("scheduled_date") val scheduledDate: String? = null,
    @SerialName("completed_date") val completedDate: String? = null,
    val date: String? = null, // API may return this instead of scheduledDate
    val type: String? = null, // SAFETY, QUALITY, ENVIRONMENTAL, EQUIPMENT
    val location: String? = null,
    val area: String? = null,
    val score: Double? = null,
    val notes: String? = null,
    val recommendations: String? = null,
    @SerialName("overall_result") val overallResult: String? = null, // PASS, FAIL, PARTIAL
    @SerialName("overall_status") val overallStatus: String? = null,
    @SerialName("signature_url") val signatureUrl: String? = null,
    val items: List<InspectionItem> = emptyList(),
    val checklistItems: List<InspectionChecklistItem> = emptyList(),
    val responses: kotlinx.serialization.json.JsonElement? = null, // API returns JSON object
    val findings: List<InspectionFinding> = emptyList(),
    val photos: List<InspectionPhoto> = emptyList(),
    @SerialName("photo_count") val photoCount: Int = 0,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
) {
    // Helper to get project name from either nested object or flat field
    val displayProjectName: String? get() = project?.name ?: projectName
    // Helper to get inspector name
    val displayInspectorName: String? get() = inspector?.name ?: inspectorName
}

@Serializable
data class InspectionChecklistItem(
    val id: String,
    val description: String? = null,
    val status: String? = null, // PASS, FAIL, NA
    val notes: String? = null
)

@Serializable
data class InspectionFinding(
    val id: String,
    val title: String? = null,
    val description: String? = null,
    val severity: String? = null, // LOW, MEDIUM, HIGH, CRITICAL
    val status: String? = null, // OPEN, IN_PROGRESS, RESOLVED
    val recommendation: String? = null
)

@Serializable
data class InspectionTemplate(
    val id: String,
    val name: String,
    val type: String? = null,
    val description: String? = null,
    val items: List<InspectionTemplateItem> = emptyList()
)

@Serializable
data class InspectionTemplateItem(
    val id: String,
    val question: String,
    val type: String = "YES_NO", // YES_NO, TEXT, NUMBER, PHOTO
    val required: Boolean = true,
    val order: Int = 0
)

@Serializable
data class InspectionItem(
    val id: String,
    val templateItemId: String? = null,
    val question: String,
    val response: String? = null,
    val passed: Boolean? = null,
    val notes: String? = null,
    val photoUrl: String? = null
)

@Serializable
data class InspectionPhoto(
    val id: String,
    val url: String,
    val caption: String? = null
)

@Serializable
data class InspectionsResponse(
    val inspections: List<Inspection> = emptyList(),
    val total: Int = 0,
    val page: Int = 1,
    val pageSize: Int = 20
)

@Serializable
data class CreateInspectionRequest(
    val projectId: String,
    val templateId: String? = null,
    val type: String? = null,
    val scheduledDate: String? = null,
    val location: String? = null
)

@Serializable
data class InspectionResponse(
    val inspection: Inspection
)

// ============ PUNCH LISTS ============

@Serializable
data class PunchList(
    val id: String,
    @SerialName("project_id") val projectId: String,
    val project: ProjectSummary? = null,
    @SerialName("project_name") val projectName: String? = null, // API returns flat field
    val title: String,
    val description: String? = null,
    val status: String = "OPEN", // OPEN, IN_PROGRESS, COMPLETED
    @SerialName("due_date") val dueDate: String? = null,
    @SerialName("created_by") val createdById: String? = null,
    val createdBy: UserSummary? = null,
    @SerialName("created_by_name") val createdByName: String? = null, // API returns flat field
    val items: List<PunchListItem> = emptyList(),
    @SerialName("completed_count") val completedCount: Int = 0,
    @SerialName("total_count") val totalCount: Int = 0,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
) {
    // Helper to get project name from either nested object or flat field
    val displayProjectName: String? get() = project?.name ?: projectName
}

@Serializable
data class PunchListItem(
    val id: String,
    @SerialName("punch_list_id") val punchListId: String? = null,
    @SerialName("project_id") val projectId: String? = null,
    @SerialName("project_name") val projectName: String? = null,
    val description: String,
    val location: String? = null,
    val priority: String = "MEDIUM", // LOW, MEDIUM, HIGH, CRITICAL
    val status: String = "OPEN", // OPEN, IN_PROGRESS, COMPLETED, VERIFIED
    val trade: String? = null,
    @SerialName("assigned_to") val assignedToId: String? = null,
    val assignedTo: UserSummary? = null,
    @SerialName("assigned_to_name") val assignedToName: String? = null, // API returns flat field
    @SerialName("due_date") val dueDate: String? = null,
    @SerialName("completed_at") val completedAt: String? = null,
    @SerialName("completed_by") val completedById: String? = null,
    val completedBy: UserSummary? = null,
    @SerialName("verified_at") val verifiedAt: String? = null,
    @SerialName("verified_by") val verifiedById: String? = null,
    val verifiedBy: UserSummary? = null,
    val photos: kotlinx.serialization.json.JsonElement? = null, // Flexible JSON
    val notes: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
)

@Serializable
data class PunchListsResponse(
    @SerialName("punch_lists") val punchLists: List<PunchList> = emptyList(),
    val items: List<PunchListItem> = emptyList(), // Flat list for iOS compatibility
    val total: Int = 0,
    val page: Int = 1,
    @SerialName("page_size") val pageSize: Int = 20
)

@Serializable
data class CreatePunchListRequest(
    val projectId: String,
    val title: String,
    val description: String? = null,
    val dueDate: String? = null,
    val items: List<CreatePunchListItemRequest> = emptyList()
)

@Serializable
data class CreatePunchListItemRequest(
    val description: String,
    val location: String? = null,
    val priority: String = "MEDIUM",
    val trade: String? = null,
    val assignedToId: String? = null,
    val dueDate: String? = null
)

@Serializable
data class UpdatePunchListItemRequest(
    val status: String? = null,
    val notes: String? = null
)

@Serializable
data class PunchListResponse(
    val punchList: PunchList
)

// ============ EMPLOYEES ============

@Serializable
data class Employee(
    val id: String,
    val name: String,
    val email: String? = null,
    val phone: String? = null,
    val company: String? = null,
    val jobTitle: String? = null,
    val userId: String? = null,
    val isActive: Boolean = true,
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val user: UserSummary? = null
) {
    val displayCompany: String get() = company ?: "Internal"

    val initials: String get() {
        val parts = name.split(" ")
        return if (parts.size >= 2) {
            "${parts[0].firstOrNull() ?: ""}${parts[1].firstOrNull() ?: ""}".uppercase()
        } else {
            name.take(2).uppercase()
        }
    }
}

@Serializable
data class CreateEmployeeRequest(
    val name: String,
    val email: String? = null,
    val phone: String? = null,
    val company: String? = null,
    val jobTitle: String? = null
)

// ============ SAFETY TOPICS ============

@Serializable
data class SafetyTopic(
    val id: String,
    val name: String,
    val description: String? = null,
    val category: String? = null, // GENERAL, HAZARDS, PPE, EQUIPMENT, PROCEDURES, EMERGENCY
    val isDefault: Boolean = true,
    val isActive: Boolean = true,
    val sortOrder: Int = 0,
    val createdAt: String? = null
) {
    val displayCategory: String get() = when (category) {
        "GENERAL" -> "General"
        "HAZARDS" -> "Hazards"
        "PPE" -> "PPE"
        "EQUIPMENT" -> "Equipment"
        "PROCEDURES" -> "Procedures"
        "EMERGENCY" -> "Emergency"
        else -> "General"
    }

    val categoryIcon: String get() = when (category) {
        "GENERAL" -> "checkmark_shield"
        "HAZARDS" -> "warning"
        "PPE" -> "person_shield"
        "EQUIPMENT" -> "build"
        "PROCEDURES" -> "checklist"
        "EMERGENCY" -> "medical_services"
        else -> "checkmark_shield"
    }
}

@Serializable
data class CreateSafetyTopicRequest(
    val name: String,
    val description: String? = null,
    val category: String? = null
)

// ============ MEETING ATTENDEE ============

@Serializable
data class MeetingAttendee(
    val id: String,
    @SerialName("meeting_id") val meetingId: String,
    @SerialName("employee_id") val employeeId: String? = null,
    @SerialName("user_id") val userId: String? = null, // API returns this
    val name: String? = null, // API returns flat field
    val company: String? = null, // API returns flat field
    val attended: Boolean = true,
    @SerialName("signature_url") val signatureUrl: String? = null,
    @SerialName("signed_at") val signedAt: String? = null,
    val employee: Employee? = null
)

// ============ SAFETY MEETINGS ============

@Serializable
data class SafetyMeeting(
    val id: String,
    @SerialName("project_id") val projectId: String? = null,
    val project: ProjectSummary? = null,
    @SerialName("project_name") val projectName: String? = null, // API returns flat field
    val type: String? = null, // API returns meeting type
    val title: String? = null, // API returns this
    @SerialName("conducted_by") val conductedBy: String,
    val conductor: UserSummary? = null,
    @SerialName("conducted_by_name") val conductedByName: String? = null, // API returns flat field
    val date: String,
    val time: String? = null,
    val location: String? = null,
    val topic: String,
    @SerialName("topic_id") val topicId: String? = null,
    val safetyTopic: SafetyTopic? = null,
    val description: String? = null,
    val duration: Int? = null, // minutes
    val attendees: kotlinx.serialization.json.JsonElement? = null, // Flexible JSON - API returns array of objects
    @SerialName("meeting_attendees") val meetingAttendees: List<MeetingAttendee> = emptyList(),
    @SerialName("attendee_count") val attendeeCount: Int = 0,
    @SerialName("leader_signature") val leaderSignature: String? = null,
    @SerialName("photo_url") val photoUrl: String? = null,
    val notes: String? = null,
    @SerialName("follow_up_items") val followUpItems: kotlinx.serialization.json.JsonElement? = null, // Flexible JSON
    @SerialName("action_items") val actionItems: kotlinx.serialization.json.JsonElement? = null, // API returns this
    val attachments: kotlinx.serialization.json.JsonElement? = null, // Flexible JSON
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
) {
    // Helper to get project name from either nested object or flat field
    val displayProjectName: String? get() = project?.name ?: projectName
    // Helper to get conductor name
    val displayConductorName: String? get() = conductor?.name ?: conductedByName
}

@Serializable
data class FollowUpItem(
    val id: String? = null,
    @SerialName("meeting_id") val meetingId: String? = null,
    val description: String? = null,
    @SerialName("assigned_to") val assignedTo: String? = null,
    @SerialName("assigned_to_name") val assignedToName: String? = null,
    @SerialName("due_date") val dueDate: String? = null,
    val completed: Boolean = false,
    @SerialName("completed_at") val completedAt: String? = null
)

@Serializable
data class SafetyMeetingsResponse(
    val meetings: List<SafetyMeeting> = emptyList(),
    val total: Int = 0
)

@Serializable
data class CreateSafetyMeetingRequest(
    val projectId: String? = null,
    val date: String,
    val time: String? = null,
    val location: String? = null,
    val topic: String,
    val topicId: String? = null,
    val description: String? = null,
    val duration: Int? = null,
    val attendees: List<Map<String, String>>? = null, // Legacy format
    val attendeeIds: List<String> = emptyList(), // New format with employee IDs
    val leaderSignature: String, // Required - base64 or URL
    val photoUrl: String, // Required - base64 or URL
    val notes: String? = null
)

@Serializable
data class SafetyMeetingResponse(
    val meeting: SafetyMeeting
)
