package com.constructionpro.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class DailyLogsResponse(
  @SerialName("daily_logs") val dailyLogs: List<DailyLogSummary> = emptyList(),
  val page: Int? = null,
  @SerialName("page_size") val pageSize: Int? = null,
  val total: Int? = null,
  @SerialName("total_pages") val totalPages: Int? = null
)

@Serializable
data class DailyLogSummary(
  val id: String,
  val date: String,
  val status: String? = null,
  @SerialName("crew_count") val crewCount: Int? = null,
  @SerialName("total_hours") val totalHours: Double? = null,
  val notes: String? = null,
  @SerialName("weather_delay") val weatherDelay: Boolean? = null,
  @SerialName("weather_delay_notes") val weatherDelayNotes: String? = null,
  // Flat fields from API
  @SerialName("project_id") val projectId: String? = null,
  @SerialName("project_name") val projectName: String? = null,
  @SerialName("submitted_by") val submittedBy: String? = null,
  @SerialName("submitter_name") val submitterName: String? = null,
  @SerialName("entries_count") val entriesCount: Int? = null,
  @SerialName("materials_count") val materialsCount: Int? = null,
  @SerialName("issues_count") val issuesCount: Int? = null,
  @SerialName("created_at") val createdAt: String? = null,
  @SerialName("updated_at") val updatedAt: String? = null,
  // Helper properties to maintain backward compatibility
  val project: DailyLogProject? = null,
  val submitter: DailyLogUser? = null,
  @SerialName("_count") val count: DailyLogCount? = null
) {
  // Computed property for project display
  fun getProjectDisplay(): DailyLogProject? {
    return project ?: if (projectId != null || projectName != null) {
      DailyLogProject(id = projectId, name = projectName)
    } else null
  }

  // Computed property for submitter display
  fun getSubmitterDisplay(): DailyLogUser? {
    return submitter ?: if (submittedBy != null || submitterName != null) {
      DailyLogUser(id = submittedBy, name = submitterName)
    } else null
  }
}

@Serializable
data class DailyLogProject(
  val id: String? = null,
  val name: String? = null
)

@Serializable
data class DailyLogUser(
  val id: String? = null,
  val name: String? = null
)

@Serializable
data class DailyLogCount(
  val entries: Int? = null,
  val materials: Int? = null,
  val issues: Int? = null
)

@Serializable
data class DailyLogDetailResponse(
  val dailyLog: DailyLogDetail
)

@Serializable
data class DailyLogDetail(
  val id: String,
  val date: String,
  val status: String? = null,
  val crewCount: Int? = null,
  val totalHours: Double? = null,
  val notes: String? = null,
  val weatherData: WeatherData? = null,
  val weatherDelay: Boolean? = null,
  val weatherDelayNotes: String? = null,
  val project: DailyLogProjectDetail? = null,
  val submitter: DailyLogUser? = null,
  val entries: List<DailyLogEntry> = emptyList(),
  val materials: List<DailyLogMaterial> = emptyList(),
  val issues: List<DailyLogIssue> = emptyList(),
  val visitors: List<DailyLogVisitor> = emptyList(),
  val photos: List<DailyLogPhoto> = emptyList(),
  val updatedAt: String? = null
)

@Serializable
data class DailyLogProjectDetail(
  val id: String? = null,
  val name: String? = null,
  val gpsLatitude: Double? = null,
  val gpsLongitude: Double? = null
)

@Serializable
data class DailyLogEntry(
  val id: String? = null,
  val percentComplete: Int? = null,
  val notes: String? = null,
  val activityLabel: DailyLogLabel? = null,
  val statusLabel: DailyLogLabel? = null
)

@Serializable
data class DailyLogMaterial(
  val id: String? = null,
  val quantity: Double? = null,
  val unit: String? = null,
  val notes: String? = null,
  val materialLabel: DailyLogLabel? = null
)

@Serializable
data class DailyLogIssue(
  val id: String? = null,
  val delayHours: Double? = null,
  val description: String? = null,
  val issueLabel: DailyLogLabel? = null
)

@Serializable
data class DailyLogVisitor(
  val id: String? = null,
  val visitTime: String? = null,
  val result: String? = null,
  val notes: String? = null,
  val visitorLabel: DailyLogLabel? = null
)

@Serializable
data class DailyLogPhoto(
  val id: String? = null,
  val name: String? = null,
  val type: String? = null,
  val createdAt: String? = null
)

@Serializable
data class DailyLogLabel(
  val id: String? = null,
  val name: String? = null
)

@Serializable
data class DailyLogUpsertRequest(
  val projectId: String,
  val date: String,
  val notes: String? = null,
  val status: String? = null,
  val crewCount: Int? = null,
  val totalHours: Double? = null,
  val weatherData: WeatherData? = null,
  val weatherDelay: Boolean? = null,
  val weatherDelayNotes: String? = null,
  val entries: List<DailyLogEntryRequest>? = null,
  val materials: List<DailyLogMaterialRequest>? = null,
  val issues: List<DailyLogIssueRequest>? = null,
  val visitors: List<DailyLogVisitorRequest>? = null
)

@Serializable
data class DailyLogEntryRequest(
  val activity: String,
  val status: String? = null,
  val locationBuilding: String? = null,
  val locationFloor: String? = null,
  val locationZone: String? = null,
  val percentComplete: Int? = null,
  val notes: String? = null
)

@Serializable
data class DailyLogMaterialRequest(
  val material: String,
  val quantity: Double,
  val unit: String? = null,
  val notes: String? = null
)

@Serializable
data class DailyLogIssueRequest(
  val issueType: String,
  val delayHours: Double? = null,
  val description: String? = null
)

@Serializable
data class DailyLogVisitorRequest(
  val visitorType: String,
  val time: String? = null,
  val result: String? = null,
  val notes: String? = null
)

@Serializable
data class WeatherData(
  val temperature: Double,
  val temperatureUnit: String,
  val condition: String,
  val conditionCode: String,
  val humidity: Int,
  val windSpeed: Int,
  val windDirection: String,
  val precipitation: Double,
  val visibility: Int,
  val uvIndex: Int,
  val sunrise: String,
  val sunset: String,
  val location: String,
  val timestamp: String,
  val source: String
)
