package com.constructionpro.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// Warning types
object WarningTypes {
    const val TARDINESS = "TARDINESS"
    const val SAFETY_VIOLATION = "SAFETY_VIOLATION"
    const val INSUBORDINATION = "INSUBORDINATION"
    const val POOR_WORK_QUALITY = "POOR_WORK_QUALITY"
    const val NO_SHOW = "NO_SHOW"
    const val DRESS_CODE = "DRESS_CODE"
    const val EQUIPMENT_MISUSE = "EQUIPMENT_MISUSE"
    const val UNPROFESSIONAL_CONDUCT = "UNPROFESSIONAL_CONDUCT"

    val all = listOf(
        TARDINESS, SAFETY_VIOLATION, INSUBORDINATION, POOR_WORK_QUALITY,
        NO_SHOW, DRESS_CODE, EQUIPMENT_MISUSE, UNPROFESSIONAL_CONDUCT
    )

    fun displayName(type: String): String = type.replace("_", " ")
}

// Warning severity levels
object WarningSeverity {
    const val VERBAL = "VERBAL"
    const val WRITTEN = "WRITTEN"
    const val FINAL = "FINAL"

    val all = listOf(VERBAL, WRITTEN, FINAL)

    fun displayName(severity: String): String = when (severity) {
        VERBAL -> "Verbal Warning"
        WRITTEN -> "Written Warning"
        FINAL -> "Final Warning"
        else -> severity
    }
}

// Warning status
object WarningStatus {
    const val ACTIVE = "ACTIVE"
    const val RESOLVED = "RESOLVED"
    const val APPEALED = "APPEALED"
    const val VOID = "VOID"

    val all = listOf(ACTIVE, RESOLVED, APPEALED, VOID)
}

@Serializable
data class WarningEmployee(
    val id: String,
    val name: String? = null,
    val email: String? = null,
    val role: String? = null
)

@Serializable
data class WarningIssuer(
    val id: String,
    val name: String? = null,
    val role: String? = null
)

@Serializable
data class WarningProject(
    val id: String,
    val name: String? = null
)

@Serializable
data class Warning(
    val id: String,
    val employeeId: String,
    val issuedById: String,
    val projectId: String? = null,
    val warningType: String,
    val severity: String,
    val description: String,
    val incidentDate: String,
    val witnessNames: String? = null,
    val actionRequired: String? = null,
    val acknowledged: Boolean = false,
    val acknowledgedAt: String? = null,
    val status: String = WarningStatus.ACTIVE,
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val employee: WarningEmployee? = null,
    val issuedBy: WarningIssuer? = null,
    val project: WarningProject? = null
)

@Serializable
data class WarningCreateRequest(
    val employeeId: String,
    val projectId: String? = null,
    val warningType: String,
    val severity: String,
    val description: String,
    val incidentDate: String,
    val witnessNames: String? = null,
    val actionRequired: String? = null
)

@Serializable
data class WarningUpdateRequest(
    val status: String? = null,
    val acknowledged: Boolean? = null,
    val actionRequired: String? = null
)

@Serializable
data class WarningCreateResponse(
    val message: String,
    val warning: Warning
)
