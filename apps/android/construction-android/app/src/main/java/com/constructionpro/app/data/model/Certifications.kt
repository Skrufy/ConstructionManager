package com.constructionpro.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class Certification(
    val id: String,
    val type: String, // user, subcontractor
    val userId: String? = null,
    val user: UserSummary? = null,
    val subcontractorId: String? = null,
    val subcontractor: SubcontractorSummary? = null,
    val certType: String, // LICENSE, TRAINING, OSHA, EQUIPMENT, INSURANCE, BOND
    val name: String,
    val issuingAuthority: String? = null,
    val certificateNumber: String? = null,
    val issueDate: String? = null,
    val expiryDate: String? = null,
    val status: String = "VALID", // VALID, EXPIRING_SOON, EXPIRED
    val documentUrl: String? = null,
    val notes: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null
)

@Serializable
data class SubcontractorSummary(
    val id: String,
    val companyName: String,
    val contactName: String? = null
)

@Serializable
data class CertificationsResponse(
    val certifications: List<Certification> = emptyList(),
    val total: Int = 0,
    val expiringCount: Int = 0,
    val expiredCount: Int = 0
)

@Serializable
data class CreateCertificationRequest(
    val type: String, // user, subcontractor
    val userId: String? = null,
    val subcontractorId: String? = null,
    val certType: String,
    val name: String,
    val issuingAuthority: String? = null,
    val certificateNumber: String? = null,
    val issueDate: String? = null,
    val expiryDate: String? = null,
    val notes: String? = null
)

@Serializable
data class UpdateCertificationRequest(
    val name: String? = null,
    val expiryDate: String? = null,
    val certificateNumber: String? = null,
    val notes: String? = null
)
