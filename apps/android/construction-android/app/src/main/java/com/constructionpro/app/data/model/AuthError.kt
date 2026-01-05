package com.constructionpro.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class AuthErrorResponse(
  val error: String? = null,
  @SerialName("error_description") val errorDescription: String? = null,
  @SerialName("msg") val message: String? = null
)
