package com.constructionpro.app.data

import android.content.Context
import android.content.SharedPreferences
import android.util.Base64
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import java.util.concurrent.atomic.AtomicReference

private const val PREFS_NAME = "auth_encrypted"

class AuthTokenStore(private val context: Context) {
  private object Keys {
    const val ACCESS_TOKEN = "access_token"
    const val REFRESH_TOKEN = "refresh_token"
    const val EXPIRES_AT = "expires_at"
  }

  // In-memory cache for synchronous access from OkHttp interceptors
  // This avoids runBlocking which can cause deadlocks
  private val cachedAccessToken = AtomicReference<String?>(null)
  private val cachedRefreshToken = AtomicReference<String?>(null)

  // Scope for observing token changes
  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

  // Encrypted SharedPreferences instance
  private val encryptedPrefs: SharedPreferences by lazy {
    val masterKey = MasterKey.Builder(context)
      .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
      .build()

    EncryptedSharedPreferences.create(
      context,
      PREFS_NAME,
      masterKey,
      EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
      EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
  }

  // Flow that emits when token changes
  val tokenFlow: Flow<String?> = callbackFlow {
    val listener = SharedPreferences.OnSharedPreferenceChangeListener { _, key ->
      if (key == Keys.ACCESS_TOKEN) {
        trySend(encryptedPrefs.getString(Keys.ACCESS_TOKEN, null))
      }
    }
    encryptedPrefs.registerOnSharedPreferenceChangeListener(listener)
    // Emit current value
    send(encryptedPrefs.getString(Keys.ACCESS_TOKEN, null))
    awaitClose {
      encryptedPrefs.unregisterOnSharedPreferenceChangeListener(listener)
    }
  }

  val refreshTokenFlow: Flow<String?> = callbackFlow {
    val listener = SharedPreferences.OnSharedPreferenceChangeListener { _, key ->
      if (key == Keys.REFRESH_TOKEN) {
        trySend(encryptedPrefs.getString(Keys.REFRESH_TOKEN, null))
      }
    }
    encryptedPrefs.registerOnSharedPreferenceChangeListener(listener)
    // Emit current value
    send(encryptedPrefs.getString(Keys.REFRESH_TOKEN, null))
    awaitClose {
      encryptedPrefs.unregisterOnSharedPreferenceChangeListener(listener)
    }
  }

  init {
    // Initialize cache from encrypted storage
    cachedAccessToken.set(encryptedPrefs.getString(Keys.ACCESS_TOKEN, null))
    cachedRefreshToken.set(encryptedPrefs.getString(Keys.REFRESH_TOKEN, null))

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

    encryptedPrefs.edit().apply {
      putString(Keys.ACCESS_TOKEN, accessToken)
      if (refreshToken != null) {
        putString(Keys.REFRESH_TOKEN, refreshToken)
      }
      if (expiresAt != null) {
        putLong(Keys.EXPIRES_AT, expiresAt)
      }
      apply()
    }

    // Update cache immediately
    cachedAccessToken.set(accessToken)
    if (refreshToken != null) {
      cachedRefreshToken.set(refreshToken)
    }
  }

  /**
   * Legacy method for backwards compatibility
   */
  suspend fun saveToken(token: String) {
    saveTokens(token, null, null)
  }

  suspend fun clearToken() {
    encryptedPrefs.edit().apply {
      remove(Keys.ACCESS_TOKEN)
      remove(Keys.REFRESH_TOKEN)
      remove(Keys.EXPIRES_AT)
      apply()
    }

    // Clear cache immediately
    cachedAccessToken.set(null)
    cachedRefreshToken.set(null)
  }

  suspend fun getToken(): String? {
    return tokenFlow.firstOrNull()
  }

  suspend fun getRefreshToken(): String? {
    return refreshTokenFlow.firstOrNull()
  }

  suspend fun getExpiresAt(): Long? {
    val expiresAt = encryptedPrefs.getLong(Keys.EXPIRES_AT, -1L)
    return if (expiresAt == -1L) null else expiresAt
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
