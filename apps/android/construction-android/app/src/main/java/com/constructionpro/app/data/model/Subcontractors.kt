package com.constructionpro.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class Subcontractor(
    val id: String,
    val companyName: String,
    val contactName: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val address: String? = null,
    val trade: String? = null, // ELECTRICAL, PLUMBING, HVAC, CONCRETE, FRAMING, etc.
    val status: String = "ACTIVE", // ACTIVE, INACTIVE, SUSPENDED
    val rating: Double? = null, // 1-5 rating
    val notes: String? = null,
    val insuranceExpiry: String? = null,
    val licenseNumber: String? = null,
    val certifications: List<Certification> = emptyList(),
    val projects: List<SubcontractorAssignment> = emptyList(), // API returns "projects" not "project_assignments"
    val createdAt: String? = null,
    val updatedAt: String? = null
)

@Serializable
data class SubcontractorAssignment(
    val id: String,
    val subcontractorId: String,
    val projectId: String,
    val project: ProjectSummary? = null,
    val role: String? = null,
    val startDate: String? = null,
    val endDate: String? = null,
    val status: String = "ACTIVE", // ACTIVE, COMPLETED, TERMINATED
    val contractAmount: Double? = null,
    val notes: String? = null,
    val createdAt: String? = null
)

@Serializable
data class SubcontractorsResponse(
    val subcontractors: List<Subcontractor> = emptyList(),
    val total: Int = 0,
    val page: Int = 1,
    val pageSize: Int = 20
)

@Serializable
data class SubcontractorDetailResponse(
    val subcontractor: Subcontractor,
    val certifications: List<Certification> = emptyList(),
    val assignments: List<SubcontractorAssignment> = emptyList()
)

@Serializable
data class CreateSubcontractorRequest(
    val companyName: String,
    val contactName: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val address: String? = null,
    val trade: String? = null,
    val licenseNumber: String? = null,
    val notes: String? = null
)

@Serializable
data class UpdateSubcontractorRequest(
    val companyName: String? = null,
    val contactName: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val trade: String? = null,
    val status: String? = null,
    val rating: Double? = null,
    val notes: String? = null
)

@Serializable
data class SubcontractorAssignRequest(
    val projectId: String,
    val role: String? = null,
    val startDate: String? = null,
    val contractAmount: Double? = null,
    val notes: String? = null
)
