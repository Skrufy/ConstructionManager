package com.constructionpro.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// Client status
object ClientStatus {
    const val ACTIVE = "ACTIVE"
    const val INACTIVE = "INACTIVE"
    const val PROSPECT = "PROSPECT"

    val all = listOf(ACTIVE, INACTIVE, PROSPECT)
}

// Industry types
object IndustryTypes {
    const val COMMERCIAL = "COMMERCIAL"
    const val RESIDENTIAL = "RESIDENTIAL"
    const val INDUSTRIAL = "INDUSTRIAL"
    const val GOVERNMENT = "GOVERNMENT"
    const val HEALTHCARE = "HEALTHCARE"
    const val EDUCATION = "EDUCATION"

    fun all(): List<String> = listOf(COMMERCIAL, RESIDENTIAL, INDUSTRIAL, GOVERNMENT, HEALTHCARE, EDUCATION)

    fun displayName(industry: String): String = industry.lowercase()
        .replaceFirstChar { it.uppercase() }
}

@Serializable
data class ClientProjectCount(
    val projects: Int = 0
)

@Serializable
data class Client(
    val id: String,
    val companyName: String,
    val contactName: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val address: String? = null,
    val city: String? = null,
    val state: String? = null,
    val zip: String? = null,
    val status: String = ClientStatus.ACTIVE,
    val notes: String? = null,
    val website: String? = null,
    val industry: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null,
    @SerialName("_count")
    val count: ClientProjectCount? = null
)

@Serializable
data class ClientCreateRequest(
    val companyName: String,
    val contactName: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val address: String? = null,
    val city: String? = null,
    val state: String? = null,
    val zip: String? = null,
    val status: String = ClientStatus.ACTIVE,
    val notes: String? = null,
    val website: String? = null,
    val industry: String? = null
)

@Serializable
data class ClientUpdateRequest(
    val companyName: String? = null,
    val contactName: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val address: String? = null,
    val city: String? = null,
    val state: String? = null,
    val zip: String? = null,
    val status: String? = null,
    val notes: String? = null,
    val website: String? = null,
    val industry: String? = null
)
