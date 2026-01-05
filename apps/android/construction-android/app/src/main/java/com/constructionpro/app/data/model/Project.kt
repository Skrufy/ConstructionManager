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
  @SerialName("_count") val count: ProjectCount? = null
)

@Serializable
data class ClientSummary(
  val id: String? = null,
  val companyName: String? = null,
  val contactName: String? = null
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
  val startDate: String? = null,
  val endDate: String? = null,
  val visibilityMode: String? = null,
  val client: ClientSummary? = null,
  val assignments: List<ProjectAssignment>? = null,
  @SerialName("_count") val count: ProjectCount? = null
)

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
