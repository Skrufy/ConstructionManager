package com.constructionpro.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ProjectsResponse(
  val projects: List<ProjectSummary> = emptyList(),
  val page: Int? = null,
  val pageSize: Int? = null,
  val total: Int? = null,
  val totalPages: Int? = null
)

@Serializable
data class ProjectSummary(
  val id: String,
  val name: String,
  val status: String? = null,
  val address: String? = null,
  val client: ClientSummary? = null,
  @SerialName("_count") val rawCount: ProjectCount? = null,
  // Flat fields returned by API
  @SerialName("crew_count") val crewCount: Int? = null,
  @SerialName("daily_log_count") val dailyLogCount: Int? = null,
  @SerialName("document_count") val documentCount: Int? = null,
  @SerialName("drawing_count") val drawingCount: Int? = null
) {
  // Helper to get team count from either flat field or nested count
  val teamCount: Int
    get() = crewCount ?: rawCount?.assignments ?: 0
}

@Serializable
data class ClientSummary(
  val id: String? = null,
  @SerialName("company_name") val companyName: String? = null,
  @SerialName("contact_name") val contactName: String? = null
)

@Serializable
data class ProjectCount(
  val assignments: Int? = null,
  val dailyLogs: Int? = null,
  val timeEntries: Int? = null,
  val files: Int? = null
)

@Serializable
data class ProjectDetailResponse(
  val project: ProjectDetail
)

@Serializable
data class ProjectDetail(
  val id: String,
  val name: String,
  val status: String? = null,
  val address: String? = null,
  val description: String? = null,
  @SerialName("start_date") val startDate: String? = null,
  @SerialName("end_date") val endDate: String? = null,
  @SerialName("visibility_mode") val visibilityMode: String? = null,
  val client: ClientSummary? = null,
  val assignments: List<ProjectAssignment>? = null,
  // Counts are returned as flat snake_case fields from API
  @SerialName("daily_log_count") val dailyLogCount: Int? = null,
  @SerialName("document_count") val documentCount: Int? = null,
  @SerialName("drawing_count") val drawingCount: Int? = null,
  @SerialName("crew_count") val crewCount: Int? = null,
  @SerialName("hours_tracked") val hoursTracked: Int? = null
) {
  // Helper to provide backward-compatible count access
  val count: ProjectCount?
    get() = ProjectCount(
      assignments = crewCount,
      dailyLogs = dailyLogCount,
      timeEntries = hoursTracked,
      files = (documentCount ?: 0) + (drawingCount ?: 0)
    )
}

@Serializable
data class ProjectAssignment(
  val id: String? = null,
  val userId: String? = null,
  val user: ProjectUser? = null
)

@Serializable
data class ProjectUser(
  val id: String? = null,
  val name: String? = null,
  val email: String? = null,
  val role: String? = null
)

@Serializable
data class ProjectUpdateRequest(
  val name: String,
  val address: String? = null,
  val description: String? = null,
  val status: String? = null,
  val visibilityMode: String? = null,
  val assignedUserIds: List<String>? = null
)
