package com.constructionpro.app.data

import android.content.Context
import android.util.Base64
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import java.util.concurrent.atomic.AtomicReference

private val Context.dataStore by preferencesDataStore(name = "auth")

class AuthTokenStore(private val context: Context) {
  private object Keys {
    val accessToken = stringPreferencesKey("access_token")
    val refreshToken = stringPreferencesKey("refresh_token")
    val expiresAt = longPreferencesKey("expires_at")
  }

  // In-memory cache for synchronous access from OkHttp interceptors
  // This avoids runBlocking which can cause deadlocks
  private val cachedAccessToken = AtomicReference<String?>(null)
  private val cachedRefreshToken = AtomicReference<String?>(null)

  // Scope for observing token changes
  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

  // Define flows BEFORE init block to avoid null reference
  val tokenFlow: Flow<String?> = context.dataStore.data.map { prefs ->
    prefs[Keys.accessToken]
  }

  val refreshTokenFlow: Flow<String?> = context.dataStore.data.map { prefs ->
    prefs[Keys.refreshToken]
  }

  init {
    // Observe token changes and update cache
    scope.launch {
      tokenFlow.collect { token ->
        cachedAccessToken.set(token)
      }
    }
    scope.launch {
      refreshTokenFlow.collect { token ->
        cachedRefreshToken.set(token)
      }
    }
  }

  /**
   * Get cached token synchronously - safe to call from OkHttp interceptors
   * Returns null if token hasn't been loaded yet (rare, only on first launch)
   */
  fun getTokenSync(): String? = cachedAccessToken.get()

  /**
   * Get cached refresh token synchronously - safe to call from OkHttp interceptors
   */
  fun getRefreshTokenSync(): String? = cachedRefreshToken.get()

  /**
   * Save both access and refresh tokens
   */
  suspend fun saveTokens(accessToken: String, refreshToken: String?, expiresIn: Long?) {
    val expiresAt = if (expiresIn != null) {
      System.currentTimeMillis() + (expiresIn * 1000)
    } else {
      // Parse exp from JWT if expiresIn not provided
      parseExpirationFromJwt(accessToken)
    }

    context.dataStore.edit { prefs ->
      prefs[Keys.accessToken] = accessToken
      if (refreshToken != null) {
        prefs[Keys.refreshToken] = refreshToken
      }
      if (expiresAt != null) {
        prefs[Keys.expiresAt] = expiresAt
      }
    }
  }

  /**
   * Legacy method for backwards compatibility
   */
  suspend fun saveToken(token: String) {
    saveTokens(token, null, null)
  }

  suspend fun clearToken() {
    context.dataStore.edit { prefs ->
      prefs.remove(Keys.accessToken)
      prefs.remove(Keys.refreshToken)
      prefs.remove(Keys.expiresAt)
    }
  }

  suspend fun getToken(): String? {
    return tokenFlow.firstOrNull()
  }

  suspend fun getRefreshToken(): String? {
    return refreshTokenFlow.firstOrNull()
  }

  suspend fun getExpiresAt(): Long? {
    return context.dataStore.data.map { prefs ->
      prefs[Keys.expiresAt]
    }.firstOrNull()
  }

  /**
   * Check if the token is expired or will expire soon (within 5 minutes)
   */
  suspend fun isTokenExpiredOrExpiring(): Boolean {
    val expiresAt = getExpiresAt() ?: return true
    val bufferMs = 5 * 60 * 1000 // 5 minutes buffer
    return System.currentTimeMillis() >= (expiresAt - bufferMs)
  }

  /**
   * Parse expiration time from JWT token
   */
  private fun parseExpirationFromJwt(token: String): Long? {
    return try {
      val parts = token.split(".")
      if (parts.size != 3) return null

      val payload = String(Base64.decode(parts[1], Base64.URL_SAFE or Base64.NO_PADDING))
      val json = Json.parseToJsonElement(payload).jsonObject
      val exp = json["exp"]?.jsonPrimitive?.long ?: return null

      exp * 1000 // Convert seconds to milliseconds
    } catch (e: Exception) {
      null
    }
  }

  /**
   * Get the user ID from the stored JWT token
   * Returns null if no token or parsing fails
   */
  suspend fun getUserId(): String? {
    val token = getToken() ?: return null
    return parseUserIdFromJwt(token)
  }

  /**
   * Parse user ID (sub claim) from JWT token
   */
  private fun parseUserIdFromJwt(token: String): String? {
    return try {
      val parts = token.split(".")
      if (parts.size != 3) return null

      val payload = String(Base64.decode(parts[1], Base64.URL_SAFE or Base64.NO_PADDING))
      val json = Json.parseToJsonElement(payload).jsonObject
      json["sub"]?.jsonPrimitive?.content
    } catch (e: Exception) {
      null
    }
  }
}
