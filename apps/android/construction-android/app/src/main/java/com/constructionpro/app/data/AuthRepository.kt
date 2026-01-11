package com.constructionpro.app.data

import com.constructionpro.app.data.model.AuthErrorResponse
import com.constructionpro.app.data.model.AuthSessionResponse
import com.constructionpro.app.data.model.AuthSignInRequest
import com.constructionpro.app.data.model.RefreshTokenRequest
import kotlinx.serialization.json.Json
import retrofit2.HttpException

class AuthRepository(
  private val authService: AuthApiService,
  private val tokenStore: AuthTokenStore
) {
  private val json = Json {
    ignoreUnknownKeys = true
  }

  /**
   * Sign in with email and password, returns the session without saving tokens.
   * Call saveSession() after verifying the user to complete login.
   * This prevents a race condition where saving tokens triggers navigation
   * before profile verification completes.
   */
  suspend fun signIn(email: String, password: String): Result<AuthSessionResponse> {
    return try {
      val response = authService.signInWithPassword(request = AuthSignInRequest(email, password))
      Result.success(response)
    } catch (exception: HttpException) {
      Result.failure(IllegalStateException(parseError(exception)))
    } catch (exception: Exception) {
      Result.failure(exception)
    }
  }

  /**
   * Save session tokens after successful profile verification.
   * This triggers navigation to the dashboard.
   */
  suspend fun saveSession(session: AuthSessionResponse) {
    tokenStore.saveTokens(
      accessToken = session.accessToken,
      refreshToken = session.refreshToken,
      expiresIn = session.expiresIn
    )
  }

  /**
   * Refresh the access token using the stored refresh token
   */
  suspend fun refreshToken(): Result<AuthSessionResponse> {
    val refreshToken = tokenStore.getRefreshToken()
      ?: return Result.failure(IllegalStateException("No refresh token available"))

    return try {
      val response = authService.refreshToken(request = RefreshTokenRequest(refreshToken))
      // Save the new tokens
      tokenStore.saveTokens(
        accessToken = response.accessToken,
        refreshToken = response.refreshToken ?: refreshToken, // Keep old refresh token if not returned
        expiresIn = response.expiresIn
      )
      Result.success(response)
    } catch (exception: HttpException) {
      // If refresh fails with 401/403, the refresh token is invalid - clear everything
      if (exception.code() in listOf(401, 403)) {
        tokenStore.clearToken()
      }
      Result.failure(IllegalStateException(parseError(exception)))
    } catch (exception: Exception) {
      Result.failure(exception)
    }
  }

  /**
   * Check if tokens need refresh
   */
  suspend fun isTokenExpiredOrExpiring(): Boolean {
    return tokenStore.isTokenExpiredOrExpiring()
  }

  /**
   * Sign out - clear all tokens
   */
  suspend fun signOut() {
    tokenStore.clearToken()
  }

  private fun parseError(exception: HttpException): String {
    val body = exception.response()?.errorBody()?.string()
    val parsed = body?.let {
      runCatching { json.decodeFromString<AuthErrorResponse>(it) }.getOrNull()
    }
    return parsed?.errorDescription
      ?: parsed?.message
      ?: parsed?.error
      ?: "Login failed (${exception.code()})"
  }
}
