package com.constructionpro.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// ============ DRONE DEPLOY MODELS ============

@Serializable
data class DroneFlightsResponse(
    val flights: List<DroneFlight>,
    val pagination: DronePagination? = null
)

@Serializable
data class DronePagination(
    val page: Int,
    @SerialName("page_size")
    val pageSize: Int,
    val total: Int,
    @SerialName("total_pages")
    val totalPages: Int
)

@Serializable
data class DroneFlight(
    val id: String,
    @SerialName("project_id")
    val projectId: String? = null,
    @SerialName("project_name")
    val projectName: String? = null,
    @SerialName("dronedeploy_plan_id")
    val droneDeployPlanId: String? = null,
    @SerialName("dronedeploy_map_id")
    val droneDeployMapId: String? = null,
    val name: String,
    val status: String, // planned, in_progress, completed, processing, failed
    @SerialName("flight_date")
    val flightDate: String? = null,
    @SerialName("scheduled_date")
    val scheduledDate: String? = null,
    val pilot: DronePilot? = null,
    @SerialName("pilot_name")
    val pilotName: String? = null,
    @SerialName("images_captured")
    val imagesCaptured: Int? = null,
    @SerialName("area_covered_acres")
    val areaCoveredAcres: Double? = null,
    @SerialName("flight_duration_minutes")
    val flightDurationMinutes: Int? = null,
    val altitude: Int? = null, // feet
    val overlap: Int? = null, // percentage
    @SerialName("has_orthomosaic")
    val hasOrthomosaic: Boolean = false,
    @SerialName("has_3d_model")
    val has3dModel: Boolean = false,
    @SerialName("has_elevation_map")
    val hasElevationMap: Boolean = false,
    @SerialName("orthomosaic_url")
    val orthomosaicUrl: String? = null,
    @SerialName("thumbnail_url")
    val thumbnailUrl: String? = null,
    @SerialName("dronedeploy_url")
    val droneDeployUrl: String? = null,
    val notes: String? = null,
    @SerialName("weather_conditions")
    val weatherConditions: String? = null,
    @SerialName("created_at")
    val createdAt: String? = null,
    @SerialName("updated_at")
    val updatedAt: String? = null,
    @SerialName("created_by")
    val createdBy: UserSummary? = null
)

@Serializable
data class DronePilot(
    val id: String,
    val name: String,
    val email: String? = null,
    @SerialName("faa_certification")
    val faaCertification: String? = null,
    @SerialName("certification_expiry")
    val certificationExpiry: String? = null
)

@Serializable
data class DroneFlightDetailResponse(
    val flight: DroneFlight,
    val images: List<DroneImage>? = null,
    val maps: List<DroneMap>? = null
)

@Serializable
data class DroneImage(
    val id: String,
    @SerialName("flight_id")
    val flightId: String,
    val filename: String,
    val url: String? = null,
    @SerialName("thumbnail_url")
    val thumbnailUrl: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val altitude: Double? = null,
    @SerialName("captured_at")
    val capturedAt: String? = null
)

@Serializable
data class DroneMap(
    val id: String,
    @SerialName("flight_id")
    val flightId: String,
    val type: String, // orthomosaic, elevation, 3d_model
    val name: String,
    val status: String, // processing, completed, failed
    val url: String? = null,
    @SerialName("thumbnail_url")
    val thumbnailUrl: String? = null,
    @SerialName("dronedeploy_url")
    val droneDeployUrl: String? = null,
    @SerialName("file_size_mb")
    val fileSizeMb: Double? = null,
    @SerialName("created_at")
    val createdAt: String? = null
)

@Serializable
data class CreateDroneFlightRequest(
    @SerialName("project_id")
    val projectId: String,
    val name: String,
    @SerialName("flight_date")
    val flightDate: String? = null,
    @SerialName("scheduled_date")
    val scheduledDate: String? = null,
    @SerialName("pilot_name")
    val pilotName: String? = null,
    @SerialName("pilot_id")
    val pilotId: String? = null,
    @SerialName("drone_model")
    val droneModel: String? = null,
    @SerialName("flight_duration_minutes")
    val flightDurationMinutes: Int? = null,
    @SerialName("area_covered_acres")
    val areaCoveredAcres: Double? = null,
    @SerialName("images_captured")
    val imagesCaptured: Int? = null,
    val notes: String? = null,
    val altitude: Int? = null,
    val overlap: Int? = null,
    val status: String? = null // "completed" for manual logs
)

@Serializable
data class UpdateDroneFlightRequest(
    val status: String? = null,
    @SerialName("flight_date")
    val flightDate: String? = null,
    @SerialName("images_captured")
    val imagesCaptured: Int? = null,
    @SerialName("flight_duration_minutes")
    val flightDurationMinutes: Int? = null,
    @SerialName("area_covered_acres")
    val areaCoveredAcres: Double? = null,
    @SerialName("weather_conditions")
    val weatherConditions: String? = null,
    val notes: String? = null
)

// DroneDeploy connection status
@Serializable
data class DroneDeployConnectionStatus(
    @SerialName("is_connected")
    val isConnected: Boolean,
    @SerialName("organization_name")
    val organizationName: String? = null,
    @SerialName("last_sync")
    val lastSync: String? = null,
    @SerialName("plans_count")
    val plansCount: Int? = null
)
