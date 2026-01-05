package com.constructionpro.app.data

import com.constructionpro.app.data.model.AuthSessionResponse
import com.constructionpro.app.data.model.RefreshTokenRequest
import retrofit2.http.POST
import retrofit2.http.Query
import retrofit2.http.Body
import com.constructionpro.app.data.model.AuthSignInRequest

interface AuthApiService {
  @POST("auth/v1/token")
  suspend fun signInWithPassword(
    @Query("grant_type") grantType: String = "password",
    @Body request: AuthSignInRequest
  ): AuthSessionResponse

  @POST("auth/v1/token")
  suspend fun refreshToken(
    @Query("grant_type") grantType: String = "refresh_token",
    @Body request: RefreshTokenRequest
  ): AuthSessionResponse
}
