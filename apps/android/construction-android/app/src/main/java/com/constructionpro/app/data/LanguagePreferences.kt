package com.constructionpro.app.data

import android.content.Context
import android.content.res.Configuration
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import java.util.Locale

private val Context.languageDataStore: DataStore<Preferences> by preferencesDataStore(name = "language_preferences")

enum class AppLanguage(val code: String, val displayName: String) {
    SYSTEM("system", "System Default"),
    ENGLISH("en", "English"),
    SPANISH("es", "Español");

    companion object {
        fun fromCode(code: String): AppLanguage {
            return entries.find { it.code == code } ?: SYSTEM
        }
    }
}

class LanguagePreferences(private val context: Context) {

    companion object {
        private val LANGUAGE_KEY = stringPreferencesKey("app_language")

        @Volatile
        private var instance: LanguagePreferences? = null

        fun getInstance(context: Context): LanguagePreferences {
            return instance ?: synchronized(this) {
                instance ?: LanguagePreferences(context.applicationContext).also { instance = it }
            }
        }

        /**
         * Get the device's default language, falling back to English if not supported
         */
        fun getDeviceLanguage(): AppLanguage {
            val deviceLocale = Locale.getDefault().language
            return AppLanguage.entries.find { it.code == deviceLocale } ?: AppLanguage.ENGLISH
        }
    }

    val languageFlow: Flow<AppLanguage> = context.languageDataStore.data.map { preferences ->
        val code = preferences[LANGUAGE_KEY]
        if (code != null) {
            AppLanguage.fromCode(code)
        } else {
            // Auto-detect from device
            getDeviceLanguage()
        }
    }

    suspend fun getCurrentLanguage(): AppLanguage {
        return languageFlow.first()
    }

    suspend fun setLanguage(language: AppLanguage) {
        context.languageDataStore.edit { preferences ->
            preferences[LANGUAGE_KEY] = language.code
        }
        // Apply the locale change to the app
        applyLocale(language)
    }

    /**
     * Apply the locale to the app using AppCompatDelegate (per-app language support)
     */
    fun applyLocale(language: AppLanguage) {
        val localeList = when (language) {
            AppLanguage.SYSTEM -> LocaleListCompat.getEmptyLocaleList() // Use system default
            else -> LocaleListCompat.forLanguageTags(language.code)
        }
        AppCompatDelegate.setApplicationLocales(localeList)
    }

    /**
     * Sync language preference from API response
     */
    suspend fun syncFromAPI(languageCode: String) {
        val language = AppLanguage.fromCode(languageCode)
        val current = getCurrentLanguage()
        if (language != current) {
            setLanguage(language)
        }
    }

    /**
     * Get the locale for the current language (for formatting dates, etc.)
     */
    fun getLocale(language: AppLanguage): Locale {
        return when (language) {
            AppLanguage.SYSTEM -> Locale.getDefault()
            AppLanguage.ENGLISH -> Locale.ENGLISH
            AppLanguage.SPANISH -> Locale("es", "ES")
        }
    }
}
