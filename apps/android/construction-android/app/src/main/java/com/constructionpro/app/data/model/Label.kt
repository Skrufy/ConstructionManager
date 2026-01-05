package com.constructionpro.app.data.model

import kotlinx.serialization.Serializable

// Label categories
object LabelCategory {
    const val ACTIVITY = "ACTIVITY"
    const val LOCATION_BUILDING = "LOCATION_BUILDING"
    const val LOCATION_FLOOR = "LOCATION_FLOOR"
    const val LOCATION_ZONE = "LOCATION_ZONE"
    const val LOCATION_ROOM = "LOCATION_ROOM"
    const val STATUS = "STATUS"
    const val MATERIAL = "MATERIAL"
    const val ISSUE = "ISSUE"
    const val VISITOR = "VISITOR"

    val all = listOf(
        ACTIVITY, LOCATION_BUILDING, LOCATION_FLOOR, LOCATION_ZONE,
        LOCATION_ROOM, STATUS, MATERIAL, ISSUE, VISITOR
    )

    fun displayName(category: String): String {
        return when (category) {
            LOCATION_BUILDING -> "Building"
            LOCATION_FLOOR -> "Floor"
            LOCATION_ZONE -> "Zone"
            LOCATION_ROOM -> "Room"
            else -> category.lowercase().replaceFirstChar { it.uppercase() }
        }
    }
}

@Serializable
data class LabelProject(
    val id: String,
    val name: String? = null
)

@Serializable
data class Label(
    val id: String,
    val category: String,
    val name: String,
    val projectId: String? = null,
    val isActive: Boolean = true,
    val sortOrder: Int = 0,
    val createdAt: String? = null,
    val project: LabelProject? = null
)

@Serializable
data class LabelCreateRequest(
    val category: String,
    val name: String,
    val projectId: String? = null,
    val isActive: Boolean = true,
    val sortOrder: Int? = null,
    val action: String? = null  // "restore" or "hideAll" for special actions
)

@Serializable
data class LabelUpdateRequest(
    val name: String? = null,
    val isActive: Boolean? = null,
    val sortOrder: Int? = null
)

@Serializable
data class LabelRestoreResponse(
    val message: String,
    val created: Int,
    val categories: Int
)

@Serializable
data class LabelHideResponse(
    val message: String,
    val count: Int
)
