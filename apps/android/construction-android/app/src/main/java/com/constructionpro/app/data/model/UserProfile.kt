package com.constructionpro.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class UserProfile(
  val id: String,
  val email: String,
  val name: String,
  val phone: String? = null,
  val role: String? = null,
  val status: String? = null,
  val createdAt: String? = null
)
