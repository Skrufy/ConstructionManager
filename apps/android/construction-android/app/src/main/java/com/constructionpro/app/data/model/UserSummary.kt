package com.constructionpro.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class UserSummary(
  val id: String,
  val name: String,
  val email: String? = null,
  val role: String? = null,
  val status: String? = null,
  val phone: String? = null,
  val createdAt: String? = null
)

@Serializable
data class CreateUserRequest(
  val name: String,
  val email: String,
  val password: String,
  val phone: String? = null,
  val role: String = "FIELD_WORKER",
  val status: String = "ACTIVE"
)
