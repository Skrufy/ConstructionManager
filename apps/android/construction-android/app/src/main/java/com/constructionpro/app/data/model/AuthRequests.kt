package com.constructionpro.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class AuthSignInRequest(
  val email: String,
  val password: String
)
