package com.constructionpro.app.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.cacheDataStore by preferencesDataStore(name = "offline_cache")

data class OfflineCacheSettings(
  val maxSizeMb: Int,
  val maxAgeDays: Int
)

class OfflineCachePreferences(private val context: Context) {
  private object Keys {
    val maxSizeMb = intPreferencesKey("max_size_mb")
    val maxAgeDays = intPreferencesKey("max_age_days")
  }

  val settingsFlow: Flow<OfflineCacheSettings> = context.cacheDataStore.data.map { prefs ->
    OfflineCacheSettings(
      maxSizeMb = prefs[Keys.maxSizeMb] ?: 2048,
      maxAgeDays = prefs[Keys.maxAgeDays] ?: 30
    )
  }

  suspend fun updateMaxSizeMb(value: Int) {
    context.cacheDataStore.edit { prefs ->
      prefs[Keys.maxSizeMb] = value
    }
  }

  suspend fun updateMaxAgeDays(value: Int) {
    context.cacheDataStore.edit { prefs ->
      prefs[Keys.maxAgeDays] = value
    }
  }
}
