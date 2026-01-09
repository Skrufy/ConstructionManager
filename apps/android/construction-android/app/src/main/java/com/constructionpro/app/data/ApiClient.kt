package com.constructionpro.app.data

import android.util.Log
import com.constructionpro.app.BuildConfig
import com.constructionpro.app.data.model.RefreshTokenRequest
import kotlinx.serialization.json.Json
import okhttp3.Authenticator
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.Route
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.concurrent.TimeUnit

class ApiClient(private val tokenStore: AuthTokenStore) {
  private val json = Json {
    ignoreUnknownKeys = true
    isLenient = true
  }

  // Auth state that can be observed by the UI to trigger navigation to login
  private val _authExpired = MutableStateFlow(false)
  val authExpired: StateFlow<Boolean> = _authExpired.asStateFlow()

  fun resetAuthExpired() {
    _authExpired.value = false
  }

  private val okHttpClient = OkHttpClient.Builder()
    .addInterceptor(AuthInterceptor(tokenStore))
    .addInterceptor(ErrorLoggingInterceptor())
    .addInterceptor(HttpLoggingInterceptor().apply {
      level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BODY else HttpLoggingInterceptor.Level.BASIC
    })
    .authenticator(TokenAuthenticator(tokenStore, json) { _authExpired.value = true })
    .connectTimeout(30, TimeUnit.SECONDS)
    .readTimeout(30, TimeUnit.SECONDS)
    .writeTimeout(30, TimeUnit.SECONDS)
    .build()

  val apiService: ApiService = Retrofit.Builder()
    .baseUrl(BuildConfig.API_BASE_URL)
    .client(okHttpClient)
    .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
    .build()
    .create(ApiService::class.java)

  companion object {
    private const val TAG = "ApiClient"
  }
}

private class AuthInterceptor(private val tokenStore: AuthTokenStore) : Interceptor {
  override fun intercept(chain: Interceptor.Chain): Response {
    // Use synchronous cached token access - avoids runBlocking deadlocks
    val token = tokenStore.getTokenSync()
    val request = if (!token.isNullOrBlank()) {
      chain.request().newBuilder()
        .addHeader("Authorization", "Bearer $token")
        .addHeader("Accept", "application/json")
        .addHeader("Content-Type", "application/json")
        .build()
    } else {
      Log.w("AuthInterceptor", "No auth token available for request")
      chain.request().newBuilder()
        .addHeader("Accept", "application/json")
        .build()
    }

    return chain.proceed(request)
  }
}

/**
 * Authenticator that handles 401 responses by refreshing the token.
 * Uses synchronous token access and fire-and-forget saves to avoid runBlocking deadlocks.
 */
private class TokenAuthenticator(
  private val tokenStore: AuthTokenStore,
  private val json: Json,
  private val onAuthFailed: () -> Unit
) : Authenticator {

  // Scope for fire-and-forget token persistence operations
  private val saveScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

  override fun authenticate(route: Route?, response: Response): Request? {
    // Don't retry if we've already tried to refresh
    if (response.request.header("X-Retry-Auth") != null) {
      Log.w("TokenAuthenticator", "Already retried auth, giving up")
      onAuthFailed()
      return null
    }

    // Use synchronous cached refresh token access - avoids runBlocking deadlocks
    val refreshToken = tokenStore.getRefreshTokenSync()
    if (refreshToken.isNullOrBlank()) {
      Log.w("TokenAuthenticator", "No refresh token available")
      onAuthFailed()
      return null
    }

    Log.d("TokenAuthenticator", "Attempting to refresh token...")

    // Refresh token synchronously (OkHttp execute() is already synchronous)
    val newToken = try {
      val supabaseUrl = BuildConfig.SUPABASE_URL
      val refreshRequest = RefreshTokenRequest(refreshToken)
      val requestBody = json.encodeToString(RefreshTokenRequest.serializer(), refreshRequest)
        .toRequestBody("application/json".toMediaType())

      val client = OkHttpClient()
      val request = Request.Builder()
        .url("$supabaseUrl/auth/v1/token?grant_type=refresh_token")
        .post(requestBody)
        .addHeader("apikey", BuildConfig.SUPABASE_ANON_KEY)
        .addHeader("Content-Type", "application/json")
        .build()

      val refreshResponse = client.newCall(request).execute()

      if (refreshResponse.isSuccessful) {
        val responseBody = refreshResponse.body?.string()
        if (responseBody != null) {
          val session = json.decodeFromString(
            com.constructionpro.app.data.model.AuthSessionResponse.serializer(),
            responseBody
          )
          // Fire-and-forget save - token will be cached immediately via Flow collection
          saveScope.launch {
            tokenStore.saveTokens(
              accessToken = session.accessToken,
              refreshToken = session.refreshToken ?: refreshToken,
              expiresIn = session.expiresIn
            )
          }
          Log.d("TokenAuthenticator", "Token refresh successful")
          session.accessToken
        } else null
      } else {
        Log.e("TokenAuthenticator", "Token refresh failed: ${refreshResponse.code}")
        // Fire-and-forget clear tokens on refresh failure
        saveScope.launch { tokenStore.clearToken() }
        null
      }
    } catch (e: Exception) {
      Log.e("TokenAuthenticator", "Token refresh error: ${e.message}")
      null
    }

    return if (newToken != null) {
      // Retry the original request with the new token
      response.request.newBuilder()
        .header("Authorization", "Bearer $newToken")
        .header("X-Retry-Auth", "true")
        .build()
    } else {
      onAuthFailed()
      null
    }
  }
}

private class ErrorLoggingInterceptor : Interceptor {
  override fun intercept(chain: Interceptor.Chain): Response {
    val request = chain.request()
    val response = chain.proceed(request)

    if (!response.isSuccessful) {
      val errorBody = response.peekBody(Long.MAX_VALUE).string()
      Log.e("ApiError", "HTTP ${response.code} for ${request.method} ${request.url}")
      Log.e("ApiError", "Response body: $errorBody")
    }

    return response
  }
}
