package com.constructionpro.app.core.auth

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking
import javax.inject.Inject
import javax.inject.Singleton

private val Context.authDataStore by preferencesDataStore(name = "auth_prefs")

@Singleton
class AuthTokenProvider @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val dataStore = context.authDataStore

    companion object {
        private val ACCESS_TOKEN = stringPreferencesKey("access_token")
        private val REFRESH_TOKEN = stringPreferencesKey("refresh_token")
        private val TOKEN_EXPIRY = longPreferencesKey("token_expiry")
        private val USER_ID = stringPreferencesKey("user_id")
        private val USER_EMAIL = stringPreferencesKey("user_email")
        private val USER_NAME = stringPreferencesKey("user_name")
        private val USER_ROLE = stringPreferencesKey("user_role")
    }

    val isAuthenticated: Flow<Boolean> = dataStore.data.map { prefs ->
        prefs[ACCESS_TOKEN] != null
    }

    val currentUserId: Flow<String?> = dataStore.data.map { prefs ->
        prefs[USER_ID]
    }

    val currentUserEmail: Flow<String?> = dataStore.data.map { prefs ->
        prefs[USER_EMAIL]
    }

    val currentUserName: Flow<String?> = dataStore.data.map { prefs ->
        prefs[USER_NAME]
    }

    val currentUserRole: Flow<String?> = dataStore.data.map { prefs ->
        prefs[USER_ROLE]
    }

    fun getAccessToken(): String? {
        return runBlocking {
            dataStore.data.first()[ACCESS_TOKEN]
        }
    }

    fun getRefreshToken(): String? {
        return runBlocking {
            dataStore.data.first()[REFRESH_TOKEN]
        }
    }

    suspend fun saveTokens(
        accessToken: String,
        refreshToken: String?,
        expiryMs: Long
    ) {
        dataStore.edit { prefs ->
            prefs[ACCESS_TOKEN] = accessToken
            refreshToken?.let { prefs[REFRESH_TOKEN] = it }
            prefs[TOKEN_EXPIRY] = expiryMs
        }
    }

    suspend fun saveUser(
        userId: String,
        email: String,
        name: String,
        role: String
    ) {
        dataStore.edit { prefs ->
            prefs[USER_ID] = userId
            prefs[USER_EMAIL] = email
            prefs[USER_NAME] = name
            prefs[USER_ROLE] = role
        }
    }

    suspend fun clearAuth() {
        dataStore.edit { prefs ->
            prefs.remove(ACCESS_TOKEN)
            prefs.remove(REFRESH_TOKEN)
            prefs.remove(TOKEN_EXPIRY)
            prefs.remove(USER_ID)
            prefs.remove(USER_EMAIL)
            prefs.remove(USER_NAME)
            prefs.remove(USER_ROLE)
        }
    }

    suspend fun isTokenExpired(): Boolean {
        val expiry = dataStore.data.first()[TOKEN_EXPIRY] ?: return true
        return System.currentTimeMillis() >= expiry
    }
}
