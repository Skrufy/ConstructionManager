package com.constructionpro.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class TimeEntry(
    val id: String,
    @SerialName("user_id") val userId: String? = null,
    @SerialName("project_id") val projectId: String? = null,
    @SerialName("clock_in") val clockIn: String,
    @SerialName("clock_out") val clockOut: String? = null,
    @SerialName("break_minutes") val breakMinutes: Int? = null,
    val notes: String? = null,
    val status: String = "PENDING", // PENDING, APPROVED, REJECTED
    // GPS coordinates - support both snake_case and camelCase
    @SerialName("gps_latitude_in") val gpsLatitudeIn: Double? = null,
    @SerialName("gps_longitude_in") val gpsLongitudeIn: Double? = null,
    @SerialName("gps_latitude_out") val gpsLatitudeOut: Double? = null,
    @SerialName("gps_longitude_out") val gpsLongitudeOut: Double? = null,
    // Flat fields from API
    @SerialName("project_name") val projectName: String? = null,
    @SerialName("user_name") val userName: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
    // Nested objects (for backward compat)
    val user: UserSummary? = null,
    val project: ProjectSummary? = null,
    val approvedBy: UserSummary? = null,
    @SerialName("approved_at") val approvedAt: String? = null,
    // Computed field for display
    @SerialName("total_hours") val totalHours: Double? = null,
    val date: String? = null
) {
    // Helper to get project display
    fun getProjectDisplay(): ProjectSummary? {
        return project ?: if (projectId != null || projectName != null) {
            ProjectSummary(id = projectId ?: "", name = projectName ?: "Unknown Project")
        } else null
    }
}

// Note: Using ProjectSummary from Project.kt

@Serializable
data class TimeEntriesResponse(
    @SerialName("time_entries")
    val timeEntries: List<TimeEntry> = emptyList(),
    val total: Int = 0,
    val page: Int = 1,
    @SerialName("page_size")
    val pageSize: Int = 20
)

@Serializable
data class ClockInRequest(
    val projectId: String,
    @SerialName("gpsInLat")
    val gpsInLat: Double? = null,
    @SerialName("gpsInLng")
    val gpsInLng: Double? = null,
    val notes: String? = null
)

@Serializable
data class ClockOutRequest(
    val breakMinutes: Int? = null,
    val notes: String? = null,
    @SerialName("gpsOutLat")
    val gpsOutLat: Double? = null,
    @SerialName("gpsOutLng")
    val gpsOutLng: Double? = null
)

@Serializable
data class TimeEntryResponse(
    val entry: TimeEntry? = null,
    val timeEntry: TimeEntry? = null,
    val message: String? = null
)

// Active time entry check - fallback to filtering from getTimeEntries
@Serializable
data class ActiveTimeEntryResponse(
    val active: TimeEntry? = null,
    val isClockedIn: Boolean = false
)
