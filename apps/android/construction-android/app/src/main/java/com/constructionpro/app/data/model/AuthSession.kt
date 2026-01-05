package com.constructionpro.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class AuthSessionResponse(
  @SerialName("access_token") val accessToken: String,
  @SerialName("refresh_token") val refreshToken: String? = null,
  @SerialName("expires_in") val expiresIn: Long? = null,
  @SerialName("token_type") val tokenType: String? = null
)

@Serializable
data class RefreshTokenRequest(
  @SerialName("refresh_token") val refreshToken: String
)
