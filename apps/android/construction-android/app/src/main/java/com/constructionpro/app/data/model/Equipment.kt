package com.constructionpro.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Equipment(
    val id: String,
    val name: String,
    val type: String? = null,
    val make: String? = null,
    val model: String? = null,
    val year: Int? = null,
    @SerialName("serial_number") val serialNumber: String? = null,
    @SerialName("license_plate") val licensePlate: String? = null,
    @SerialName("fuel_type") val fuelType: String? = null,
    val status: String = "AVAILABLE", // AVAILABLE, IN_USE, MAINTENANCE, OUT_OF_SERVICE
    @SerialName("samsara_id") val samsaraId: String? = null,
    @SerialName("current_project_id") val currentProjectId: String? = null,
    @SerialName("current_project") val currentProject: ProjectSummary? = null,
    @SerialName("current_lat") val currentLat: Double? = null,
    @SerialName("current_lng") val currentLng: Double? = null,
    @SerialName("last_service_date") val lastServiceDate: String? = null,
    @SerialName("next_service_due") val nextServiceDue: String? = null,
    @SerialName("hour_meter_reading") val hourMeterReading: Double? = null,
    @SerialName("odometer_reading") val odometerReading: Double? = null,
    @SerialName("fuel_level") val fuelLevel: Double? = null,
    @SerialName("gps_latitude") val gpsLatitude: Double? = null,
    @SerialName("gps_longitude") val gpsLongitude: Double? = null,
    @SerialName("last_updated") val lastUpdated: String? = null,
    val notes: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
    // Flattened counts from API
    @SerialName("assignment_count") val assignmentCount: Int = 0,
    @SerialName("log_count") val logCount: Int = 0
)

@Serializable
data class EquipmentResponse(
    val equipment: List<Equipment> = emptyList(),
    val total: Int = 0,
    val page: Int = 1,
    @SerialName("page_size") val pageSize: Int = 20
)

@Serializable
data class EquipmentDetailResponse(
    val equipment: Equipment,
    val assignments: List<EquipmentAssignment> = emptyList(),
    val logs: List<EquipmentLog> = emptyList()
)

@Serializable
data class EquipmentAssignment(
    val id: String,
    @SerialName("equipment_id") val equipmentId: String,
    @SerialName("project_id") val projectId: String,
    val project: ProjectSummary? = null,
    @SerialName("assigned_by") val assignedBy: UserSummary? = null,
    @SerialName("assigned_at") val assignedAt: String? = null,
    @SerialName("returned_at") val returnedAt: String? = null,
    val notes: String? = null
)

@Serializable
data class EquipmentLog(
    val id: String,
    @SerialName("equipment_id") val equipmentId: String,
    @SerialName("project_id") val projectId: String? = null,
    @SerialName("user_id") val userId: String? = null,
    val user: UserSummary? = null,
    val type: String, // USAGE, FUEL, SERVICE, INSPECTION, TRANSFER
    @SerialName("hours_used") val hoursUsed: Double? = null,
    @SerialName("fuel_added") val fuelAdded: Double? = null,
    val notes: String? = null,
    @SerialName("gps_latitude") val gpsLatitude: Double? = null,
    @SerialName("gps_longitude") val gpsLongitude: Double? = null,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class CreateEquipmentRequest(
    val name: String,
    val type: String? = null,
    val make: String? = null,
    val model: String? = null,
    @SerialName("serial_number") val serialNumber: String? = null,
    val status: String = "AVAILABLE"
)

@Serializable
data class EquipmentLogRequest(
    val type: String,
    @SerialName("project_id") val projectId: String? = null,
    @SerialName("hours_used") val hoursUsed: Double? = null,
    @SerialName("fuel_added") val fuelAdded: Double? = null,
    val notes: String? = null,
    @SerialName("gps_latitude") val gpsLatitude: Double? = null,
    @SerialName("gps_longitude") val gpsLongitude: Double? = null
)

@Serializable
data class EquipmentAssignRequest(
    @SerialName("project_id") val projectId: String,
    val notes: String? = null
)
