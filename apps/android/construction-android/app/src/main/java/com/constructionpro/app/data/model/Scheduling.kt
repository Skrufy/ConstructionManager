package com.constructionpro.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class CrewSchedule(
    val id: String,
    val projectId: String,
    val project: ProjectSummary? = null,
    val date: String,
    val shiftStart: String? = null,
    val shiftEnd: String? = null,
    val status: String = "SCHEDULED", // SCHEDULED, CONFIRMED, CANCELLED
    val notes: String? = null,
    val createdById: String? = null,
    val createdBy: UserSummary? = null,
    val assignments: List<CrewAssignment> = emptyList(),
    val crewCount: Int = 0,
    val createdAt: String? = null,
    val updatedAt: String? = null
)

@Serializable
data class CrewAssignment(
    val id: String,
    val scheduleId: String,
    val userId: String,
    val user: UserSummary? = null,
    val role: String? = null, // FOREMAN, LABORER, OPERATOR, etc.
    val confirmed: Boolean = false,
    val notes: String? = null
)

@Serializable
data class SchedulesResponse(
    val schedules: List<CrewSchedule> = emptyList(),
    val total: Int = 0,
    val page: Int = 1,
    val pageSize: Int = 20
)

@Serializable
data class CreateScheduleRequest(
    val projectId: String,
    val date: String,
    val shiftStart: String? = null,
    val shiftEnd: String? = null,
    val notes: String? = null,
    val assignments: List<CreateCrewAssignmentRequest> = emptyList()
)

@Serializable
data class CreateCrewAssignmentRequest(
    val userId: String,
    val role: String? = null
)

@Serializable
data class UpdateScheduleRequest(
    val status: String? = null,
    val shiftStart: String? = null,
    val shiftEnd: String? = null,
    val notes: String? = null
)

@Serializable
data class ScheduleResponse(
    val schedule: CrewSchedule
)
