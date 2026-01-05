package com.constructionpro.app.data

import com.constructionpro.app.BuildConfig
import kotlinx.serialization.json.Json
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

class SupabaseAuthClient {
  private val json = Json {
    ignoreUnknownKeys = true
  }

  private val okHttpClient = OkHttpClient.Builder()
    .addInterceptor(SupabaseHeadersInterceptor())
    .addInterceptor(HttpLoggingInterceptor().apply {
      level = HttpLoggingInterceptor.Level.BODY  // Full request/response logging
    })
    .build()

  val authService: AuthApiService = Retrofit.Builder()
    .baseUrl(baseUrl())
    .client(okHttpClient)
    .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
    .build()
    .create(AuthApiService::class.java)

  private fun baseUrl(): String {
    val raw = BuildConfig.SUPABASE_URL
    return if (raw.endsWith("/")) raw else "$raw/"
  }
}

private class SupabaseHeadersInterceptor : Interceptor {
  override fun intercept(chain: Interceptor.Chain): Response {
    val request = chain.request().newBuilder()
      .addHeader("apikey", BuildConfig.SUPABASE_ANON_KEY)
      .addHeader("Authorization", "Bearer ${BuildConfig.SUPABASE_ANON_KEY}")
      .addHeader("Accept", "application/json")
      .build()

    return chain.proceed(request)
  }
}
