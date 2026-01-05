package com.constructionpro.app.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.constructionpro.app.R
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.AppLanguage
import com.constructionpro.app.data.LanguagePreferences
import com.constructionpro.app.data.ModuleVisibilityPreferences
import com.constructionpro.app.data.ThemeMode
import com.constructionpro.app.data.ThemePreferences
import com.constructionpro.app.data.local.AppDatabase
import com.constructionpro.app.data.local.PendingActionTypes
import com.constructionpro.app.data.local.PendingStatus
import com.constructionpro.app.data.local.PendingActionScheduler
import com.constructionpro.app.data.model.CompanySettings
import com.constructionpro.app.data.model.CompanySettingsUpdate
import com.constructionpro.app.data.model.UpdatePreferencesRequest
import com.constructionpro.app.data.model.UpdateSettingsRequest
import com.constructionpro.app.data.model.UserPreferences
import com.constructionpro.app.data.model.UserProfile
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import retrofit2.HttpException

private data class SettingsState(
    val loading: Boolean = false,
    val company: CompanySettings? = null,
    val user: UserPreferences? = null,
    val profile: UserProfile? = null,
    val error: String? = null,
    val isAuthError: Boolean = false,
    val pendingCount: Int = 0,
    val failedCount: Int = 0,
    val successMessage: String? = null,
    val savingModules: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    apiService: ApiService,
    onBack: () -> Unit,
    onOpenOfflineCache: () -> Unit,
    onOpenSyncQueue: () -> Unit,
    themePreferences: ThemePreferences? = null,
    languagePreferences: LanguagePreferences? = null,
    onLogout: (() -> Unit)? = null
) {
    val context = LocalContext.current
    val db = remember { AppDatabase.getInstance(context) }
    val pendingDao = remember { db.pendingActionDao() }
    val moduleVisibilityPrefs = remember { ModuleVisibilityPreferences.getInstance(context) }
    val langPrefs = languagePreferences ?: remember { LanguagePreferences.getInstance(context) }
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(SettingsState(loading = true)) }
    var showThemeDialog by remember { mutableStateOf(false) }
    var showLanguageDialog by remember { mutableStateOf(false) }
    var showItemsPerPageDialog by remember { mutableStateOf(false) }
    var showTimezoneDialog by remember { mutableStateOf(false) }
    var showDateFormatDialog by remember { mutableStateOf(false) }
    var showCurrencyDialog by remember { mutableStateOf(false) }

    // Collapsible sections state
    var expandedModules by remember { mutableStateOf(false) }
    var expandedVisibility by remember { mutableStateOf(false) }

    // Personal module visibility preferences (stored locally on device)
    val moduleVisibility by moduleVisibilityPrefs.visibilityFlow.collectAsState(
        initial = ModuleVisibilityPreferences.ModuleVisibility()
    )

    // Use ThemePreferences if available, otherwise fall back to API settings
    val currentThemeMode by themePreferences?.themeModeFlow?.collectAsState(initial = ThemeMode.SYSTEM)
        ?: remember { mutableStateOf(ThemeMode.SYSTEM) }

    var selectedTheme by remember {
        mutableStateOf(
            when (currentThemeMode) {
                ThemeMode.SYSTEM -> "system"
                ThemeMode.LIGHT -> "light"
                ThemeMode.DARK -> "dark"
            }
        )
    }

    // Language preference state
    val currentLanguage by langPrefs.languageFlow.collectAsState(initial = AppLanguage.SYSTEM)
    var selectedLanguage by remember { mutableStateOf(currentLanguage) }

    // Sync selectedLanguage with currentLanguage
    LaunchedEffect(currentLanguage) {
        selectedLanguage = currentLanguage
    }

    var selectedItemsPerPage by remember { mutableStateOf(10) }

    // Sync selectedTheme with currentThemeMode
    LaunchedEffect(currentThemeMode) {
        selectedTheme = when (currentThemeMode) {
            ThemeMode.SYSTEM -> "system"
            ThemeMode.LIGHT -> "light"
            ThemeMode.DARK -> "dark"
        }
    }

    fun loadSettings() {
        scope.launch {
            state = state.copy(loading = true, error = null, isAuthError = false)
            try {
                val response = withContext(Dispatchers.IO) { apiService.getSettings() }
                val profile = withContext(Dispatchers.IO) {
                    try { apiService.getProfile() } catch (_: Exception) { null }
                }
                val pendingCount = withContext(Dispatchers.IO) {
                    pendingDao.countByType(PendingActionTypes.DAILY_LOG_CREATE, PendingStatus.PENDING) +
                        pendingDao.countByType(PendingActionTypes.DAILY_LOG_UPDATE, PendingStatus.PENDING) +
                        pendingDao.countByType(PendingActionTypes.ANNOTATION_CREATE, PendingStatus.PENDING)
                }
                val failedCount = withContext(Dispatchers.IO) {
                    pendingDao.countByType(PendingActionTypes.DAILY_LOG_CREATE, PendingStatus.FAILED) +
                        pendingDao.countByType(PendingActionTypes.DAILY_LOG_UPDATE, PendingStatus.FAILED) +
                        pendingDao.countByType(PendingActionTypes.ANNOTATION_CREATE, PendingStatus.FAILED)
                }
                state = state.copy(
                    loading = false,
                    company = response.company,
                    user = response.user,
                    profile = profile,
                    pendingCount = pendingCount,
                    failedCount = failedCount
                )
                // Initialize items per page from user preferences
                response.user?.itemsPerPage?.let { selectedItemsPerPage = it }
            } catch (error: Exception) {
                val isAuthError = when {
                    error is HttpException && (error.code() == 401 || error.code() == 403) -> true
                    error.message?.contains("401") == true -> true
                    error.message?.contains("Unauthorized", ignoreCase = true) == true -> true
                    else -> false
                }
                val errorMessage = when {
                    isAuthError -> "Session expired. Please log in again."
                    error is HttpException -> "Server error (${error.code()})"
                    else -> error.message ?: "Failed to load settings"
                }
                state = state.copy(
                    loading = false,
                    error = errorMessage,
                    isAuthError = isAuthError
                )
            }
        }
    }

    fun updateModuleSettings(update: CompanySettingsUpdate) {
        scope.launch {
            state = state.copy(savingModules = true)
            try {
                val request = UpdateSettingsRequest(type = "company", settings = update)
                val response = withContext(Dispatchers.IO) { apiService.updateSettings(request) }
                if (response.success && response.company != null) {
                    state = state.copy(
                        savingModules = false,
                        company = response.company,
                        successMessage = response.message ?: "Settings updated"
                    )
                } else {
                    state = state.copy(
                        savingModules = false,
                        error = "Failed to update settings"
                    )
                }
            } catch (error: Exception) {
                state = state.copy(
                    savingModules = false,
                    error = error.message ?: "Failed to update settings"
                )
            }
        }
    }

    fun triggerSync() {
        scope.launch {
            PendingActionScheduler.enqueue(context)
            state = state.copy(successMessage = "Sync started")
        }
    }

    fun applyTheme(themeValue: String) {
        scope.launch {
            val mode = when (themeValue) {
                "light" -> ThemeMode.LIGHT
                "dark" -> ThemeMode.DARK
                else -> ThemeMode.SYSTEM
            }
            themePreferences?.setThemeMode(mode)
            selectedTheme = themeValue

            // Sync theme preference to server
            try {
                withContext(Dispatchers.IO) {
                    apiService.updatePreferences(UpdatePreferencesRequest(theme = themeValue))
                }
                state = state.copy(successMessage = "Theme applied and synced")
            } catch (_: Exception) {
                // Still show success locally even if server sync fails
                state = state.copy(successMessage = "Theme applied (sync pending)")
            }
        }
    }

    fun applyLanguage(language: AppLanguage) {
        scope.launch {
            langPrefs.setLanguage(language)
            selectedLanguage = language
            state = state.copy(successMessage = context.getString(R.string.settings_language_applied))
        }
    }

    fun updatePreference(request: UpdatePreferencesRequest) {
        scope.launch {
            try {
                withContext(Dispatchers.IO) {
                    apiService.updatePreferences(request)
                }
                state = state.copy(successMessage = "Preference saved")
            } catch (_: Exception) {
                state = state.copy(error = "Failed to save preference")
            }
        }
    }

    LaunchedEffect(Unit) {
        loadSettings()
    }

    // Theme Selection Dialog
    if (showThemeDialog) {
        AlertDialog(
            onDismissRequest = { showThemeDialog = false },
            title = {
                Text(
                    "Select Theme",
                    style = AppTypography.heading2,
                    fontWeight = FontWeight.SemiBold
                )
            },
            text = {
                Column {
                    listOf(
                        "system" to "System Default",
                        "light" to "Light",
                        "dark" to "Dark"
                    ).forEach { (value, label) ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = AppSpacing.xs),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            RadioButton(
                                selected = selectedTheme == value,
                                onClick = { selectedTheme = value },
                                colors = RadioButtonDefaults.colors(
                                    selectedColor = AppColors.primary600
                                )
                            )
                            Spacer(modifier = Modifier.width(AppSpacing.sm))
                            Text(
                                text = label,
                                style = AppTypography.bodyLarge,
                                color = AppColors.textPrimary
                            )
                        }
                    }
                }
            },
            confirmButton = {
                CPButton(
                    text = "Apply",
                    onClick = {
                        showThemeDialog = false
                        applyTheme(selectedTheme)
                    },
                    size = CPButtonSize.Small
                )
            },
            dismissButton = {
                CPButton(
                    text = "Cancel",
                    onClick = { showThemeDialog = false },
                    style = CPButtonStyle.Outline,
                    size = CPButtonSize.Small
                )
            },
            shape = RoundedCornerShape(AppSpacing.md)
        )
    }

    // Language Selection Dialog
    if (showLanguageDialog) {
        AlertDialog(
            onDismissRequest = { showLanguageDialog = false },
            title = {
                Text(
                    stringResource(R.string.settings_language_select),
                    style = AppTypography.heading2,
                    fontWeight = FontWeight.SemiBold
                )
            },
            text = {
                Column {
                    listOf(
                        AppLanguage.SYSTEM to stringResource(R.string.settings_language_system),
                        AppLanguage.ENGLISH to stringResource(R.string.settings_language_english),
                        AppLanguage.SPANISH to stringResource(R.string.settings_language_spanish)
                    ).forEach { (lang, label) ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = AppSpacing.xs),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            RadioButton(
                                selected = selectedLanguage == lang,
                                onClick = { selectedLanguage = lang },
                                colors = RadioButtonDefaults.colors(
                                    selectedColor = AppColors.primary600
                                )
                            )
                            Spacer(modifier = Modifier.width(AppSpacing.sm))
                            Text(
                                text = label,
                                style = AppTypography.bodyLarge,
                                color = AppColors.textPrimary
                            )
                        }
                    }
                }
            },
            confirmButton = {
                CPButton(
                    text = stringResource(R.string.settings_apply),
                    onClick = {
                        showLanguageDialog = false
                        applyLanguage(selectedLanguage)
                    },
                    size = CPButtonSize.Small
                )
            },
            dismissButton = {
                CPButton(
                    text = stringResource(R.string.common_cancel),
                    onClick = { showLanguageDialog = false },
                    style = CPButtonStyle.Outline,
                    size = CPButtonSize.Small
                )
            },
            shape = RoundedCornerShape(AppSpacing.md)
        )
    }

    // Items Per Page Dialog
    if (showItemsPerPageDialog) {
        AlertDialog(
            onDismissRequest = { showItemsPerPageDialog = false },
            title = {
                Text(
                    "Items Per Page",
                    style = AppTypography.heading2,
                    fontWeight = FontWeight.SemiBold
                )
            },
            text = {
                Column {
                    listOf(10, 25, 50, 100).forEach { count ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = AppSpacing.xs),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            RadioButton(
                                selected = selectedItemsPerPage == count,
                                onClick = { selectedItemsPerPage = count },
                                colors = RadioButtonDefaults.colors(
                                    selectedColor = AppColors.primary600
                                )
                            )
                            Spacer(modifier = Modifier.width(AppSpacing.sm))
                            Text(
                                text = "$count items",
                                style = AppTypography.bodyLarge,
                                color = AppColors.textPrimary
                            )
                        }
                    }
                }
            },
            confirmButton = {
                CPButton(
                    text = "Apply",
                    onClick = {
                        showItemsPerPageDialog = false
                        updatePreference(UpdatePreferencesRequest(itemsPerPage = selectedItemsPerPage))
                    },
                    size = CPButtonSize.Small
                )
            },
            dismissButton = {
                CPButton(
                    text = "Cancel",
                    onClick = { showItemsPerPageDialog = false },
                    style = CPButtonStyle.Outline,
                    size = CPButtonSize.Small
                )
            },
            shape = RoundedCornerShape(AppSpacing.md)
        )
    }

    // Timezone Selection Dialog
    if (showTimezoneDialog) {
        val timezones = listOf(
            "America/New_York" to "Eastern Time (ET)",
            "America/Chicago" to "Central Time (CT)",
            "America/Denver" to "Mountain Time (MT)",
            "America/Los_Angeles" to "Pacific Time (PT)",
            "America/Phoenix" to "Arizona (no DST)",
            "America/Anchorage" to "Alaska Time",
            "Pacific/Honolulu" to "Hawaii Time",
            "UTC" to "UTC"
        )
        var selectedTz by remember { mutableStateOf(state.company?.timezone ?: "America/New_York") }

        AlertDialog(
            onDismissRequest = { showTimezoneDialog = false },
            title = {
                Text(
                    "Select Timezone",
                    style = AppTypography.heading2,
                    fontWeight = FontWeight.SemiBold
                )
            },
            text = {
                Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                    timezones.forEach { (value, label) ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            RadioButton(
                                selected = selectedTz == value,
                                onClick = { selectedTz = value },
                                colors = RadioButtonDefaults.colors(
                                    selectedColor = AppColors.primary600
                                )
                            )
                            Spacer(modifier = Modifier.width(AppSpacing.sm))
                            Text(
                                text = label,
                                style = AppTypography.bodyLarge,
                                color = AppColors.textPrimary
                            )
                        }
                    }
                }
            },
            confirmButton = {
                CPButton(
                    text = "Save",
                    onClick = {
                        showTimezoneDialog = false
                        updateModuleSettings(CompanySettingsUpdate(timezone = selectedTz))
                    },
                    size = CPButtonSize.Small
                )
            },
            dismissButton = {
                CPButton(
                    text = "Cancel",
                    onClick = { showTimezoneDialog = false },
                    style = CPButtonStyle.Outline,
                    size = CPButtonSize.Small
                )
            },
            shape = RoundedCornerShape(AppSpacing.md)
        )
    }

    // Date Format Selection Dialog
    if (showDateFormatDialog) {
        val formats = listOf(
            "MM/DD/YYYY" to "MM/DD/YYYY (12/31/2024)",
            "DD/MM/YYYY" to "DD/MM/YYYY (31/12/2024)",
            "YYYY-MM-DD" to "YYYY-MM-DD (2024-12-31)",
            "MMM DD, YYYY" to "MMM DD, YYYY (Dec 31, 2024)",
            "DD MMM YYYY" to "DD MMM YYYY (31 Dec 2024)"
        )
        var selectedFormat by remember { mutableStateOf(state.company?.dateFormat ?: "MM/DD/YYYY") }

        AlertDialog(
            onDismissRequest = { showDateFormatDialog = false },
            title = {
                Text(
                    "Select Date Format",
                    style = AppTypography.heading2,
                    fontWeight = FontWeight.SemiBold
                )
            },
            text = {
                Column {
                    formats.forEach { (value, label) ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            RadioButton(
                                selected = selectedFormat == value,
                                onClick = { selectedFormat = value },
                                colors = RadioButtonDefaults.colors(
                                    selectedColor = AppColors.primary600
                                )
                            )
                            Spacer(modifier = Modifier.width(AppSpacing.sm))
                            Text(
                                text = label,
                                style = AppTypography.bodyLarge,
                                color = AppColors.textPrimary
                            )
                        }
                    }
                }
            },
            confirmButton = {
                CPButton(
                    text = "Save",
                    onClick = {
                        showDateFormatDialog = false
                        updateModuleSettings(CompanySettingsUpdate(dateFormat = selectedFormat))
                    },
                    size = CPButtonSize.Small
                )
            },
            dismissButton = {
                CPButton(
                    text = "Cancel",
                    onClick = { showDateFormatDialog = false },
                    style = CPButtonStyle.Outline,
                    size = CPButtonSize.Small
                )
            },
            shape = RoundedCornerShape(AppSpacing.md)
        )
    }

    // Currency Selection Dialog
    if (showCurrencyDialog) {
        val currencies = listOf(
            "USD" to "USD - US Dollar ($)",
            "CAD" to "CAD - Canadian Dollar (C$)",
            "EUR" to "EUR - Euro (€)",
            "GBP" to "GBP - British Pound (£)",
            "AUD" to "AUD - Australian Dollar (A$)",
            "MXN" to "MXN - Mexican Peso (MX$)"
        )
        var selectedCurrency by remember { mutableStateOf(state.company?.currency ?: "USD") }

        AlertDialog(
            onDismissRequest = { showCurrencyDialog = false },
            title = {
                Text(
                    "Select Currency",
                    style = AppTypography.heading2,
                    fontWeight = FontWeight.SemiBold
                )
            },
            text = {
                Column {
                    currencies.forEach { (value, label) ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            RadioButton(
                                selected = selectedCurrency == value,
                                onClick = { selectedCurrency = value },
                                colors = RadioButtonDefaults.colors(
                                    selectedColor = AppColors.primary600
                                )
                            )
                            Spacer(modifier = Modifier.width(AppSpacing.sm))
                            Text(
                                text = label,
                                style = AppTypography.bodyLarge,
                                color = AppColors.textPrimary
                            )
                        }
                    }
                }
            },
            confirmButton = {
                CPButton(
                    text = "Save",
                    onClick = {
                        showCurrencyDialog = false
                        updateModuleSettings(CompanySettingsUpdate(currency = selectedCurrency))
                    },
                    size = CPButtonSize.Small
                )
            },
            dismissButton = {
                CPButton(
                    text = "Cancel",
                    onClick = { showCurrencyDialog = false },
                    style = CPButtonStyle.Outline,
                    size = CPButtonSize.Small
                )
            },
            shape = RoundedCornerShape(AppSpacing.md)
        )
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.settings_title),
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = stringResource(R.string.common_back),
                            tint = AppColors.textSecondary
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { loadSettings() }) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = stringResource(R.string.common_refresh),
                            tint = AppColors.textSecondary
                        )
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
        ) {
            // Error Banner
            if (state.error != null) {
                Column(modifier = Modifier.padding(horizontal = AppSpacing.md)) {
                    CPErrorBanner(
                        message = state.error ?: stringResource(R.string.error_generic),
                        onRetry = if (!state.isAuthError) {{ loadSettings() }} else null,
                        onDismiss = { state = state.copy(error = null) }
                    )
                    if (state.isAuthError && onLogout != null) {
                        Spacer(modifier = Modifier.height(AppSpacing.sm))
                        CPButton(
                            text = stringResource(R.string.settings_log_in_again),
                            onClick = onLogout,
                            modifier = Modifier.fillMaxWidth(),
                            icon = Icons.Default.Login
                        )
                    }
                }
            }

            // Success Message
            state.successMessage?.let { message ->
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = AppSpacing.md),
                    shape = RoundedCornerShape(AppSpacing.sm),
                    color = ConstructionGreen.copy(alpha = 0.1f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, ConstructionGreen.copy(alpha = 0.3f))
                ) {
                    Row(
                        modifier = Modifier.padding(AppSpacing.sm),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = ConstructionGreen,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.sm))
                        Text(
                            text = message,
                            style = AppTypography.body,
                            color = ConstructionGreen,
                            modifier = Modifier.weight(1f)
                        )
                        IconButton(
                            onClick = { state = state.copy(successMessage = null) },
                            modifier = Modifier.size(24.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Dismiss",
                                modifier = Modifier.size(16.dp),
                                tint = ConstructionGreen
                            )
                        }
                    }
                }
            }

            // Loading State
            if (state.loading) {
                CPLoadingIndicator(message = stringResource(R.string.settings_loading))
            }

            // Sync Status Section
            Column(modifier = Modifier.padding(horizontal = AppSpacing.md)) {
                CPSectionHeader(title = stringResource(R.string.settings_sync_status))

                CPCard {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = if (state.pendingCount > 0) Icons.Default.CloudSync else Icons.Default.CloudDone,
                                contentDescription = null,
                                tint = if (state.pendingCount > 0) ConstructionOrange else ConstructionGreen,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(AppSpacing.sm))
                            Column {
                                Text(
                                    text = if (state.pendingCount > 0) stringResource(R.string.settings_pending_count, state.pendingCount) else stringResource(R.string.settings_all_synced),
                                    style = AppTypography.heading3,
                                    fontWeight = FontWeight.SemiBold,
                                    color = AppColors.textPrimary
                                )
                                if (state.failedCount > 0) {
                                    Text(
                                        text = stringResource(R.string.settings_failed_count, state.failedCount),
                                        style = AppTypography.secondary,
                                        color = ConstructionRed
                                    )
                                }
                            }
                        }

                        CPButton(
                            text = stringResource(R.string.settings_sync_now),
                            onClick = { triggerSync() },
                            size = CPButtonSize.Small,
                            icon = Icons.Default.CloudSync
                        )
                    }
                }
            }

            // Data Management Section
            Column(modifier = Modifier.padding(horizontal = AppSpacing.md)) {
                CPSectionHeader(title = stringResource(R.string.settings_data_management))

                Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                    CPNavigationCard(
                        title = stringResource(R.string.settings_sync_queue),
                        subtitle = stringResource(R.string.settings_sync_queue_desc),
                        icon = Icons.Default.Queue,
                        onClick = onOpenSyncQueue,
                        iconBackgroundColor = AppColors.primary100,
                        iconColor = AppColors.primary600,
                        badge = if (state.pendingCount > 0) state.pendingCount.toString() else null
                    )

                    CPNavigationCard(
                        title = stringResource(R.string.settings_offline_cache),
                        subtitle = stringResource(R.string.settings_offline_cache_desc),
                        icon = Icons.Default.Storage,
                        onClick = onOpenOfflineCache,
                        iconBackgroundColor = AppColors.gray100,
                        iconColor = AppColors.textSecondary
                    )
                }
            }

            // User Preferences Section
            Column(modifier = Modifier.padding(horizontal = AppSpacing.md)) {
                CPSectionHeader(title = stringResource(R.string.settings_user_preferences))

                CPCard {
                    // Theme Setting
                    SettingsClickableRow(
                        icon = Icons.Default.Palette,
                        label = stringResource(R.string.settings_theme),
                        value = when (selectedTheme) {
                            "system" -> stringResource(R.string.settings_theme_system)
                            "light" -> stringResource(R.string.settings_theme_light)
                            "dark" -> stringResource(R.string.settings_theme_dark)
                            else -> selectedTheme.replaceFirstChar { it.uppercase() }
                        },
                        onClick = { showThemeDialog = true }
                    )

                    CPDivider()

                    // Language Setting
                    SettingsClickableRow(
                        icon = Icons.Default.Language,
                        label = stringResource(R.string.settings_language),
                        value = when (selectedLanguage) {
                            AppLanguage.SYSTEM -> stringResource(R.string.settings_language_system)
                            AppLanguage.ENGLISH -> stringResource(R.string.settings_language_english)
                            AppLanguage.SPANISH -> stringResource(R.string.settings_language_spanish)
                        },
                        onClick = { showLanguageDialog = true }
                    )

                    CPDivider()

                    // Items Per Page Setting
                    SettingsClickableRow(
                        icon = Icons.Default.ViewList,
                        label = stringResource(R.string.settings_items_per_page),
                        value = stringResource(R.string.settings_items, selectedItemsPerPage),
                        onClick = { showItemsPerPageDialog = true }
                    )

                    CPDivider()

                    // Push Notifications Toggle
                    var pushEnabled by remember { mutableStateOf(state.user?.pushEnabled ?: true) }
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = AppSpacing.xs),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Notifications,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp),
                                tint = AppColors.textMuted
                            )
                            Spacer(modifier = Modifier.width(AppSpacing.sm))
                            Column {
                                Text(
                                    text = stringResource(R.string.settings_push_notifications),
                                    style = AppTypography.bodyLarge,
                                    fontWeight = FontWeight.Medium,
                                    color = AppColors.textPrimary
                                )
                                Text(
                                    text = if (pushEnabled) stringResource(R.string.settings_enabled) else stringResource(R.string.settings_disabled),
                                    style = AppTypography.secondary,
                                    color = if (pushEnabled) ConstructionGreen else AppColors.textSecondary
                                )
                            }
                        }
                        Switch(
                            checked = pushEnabled,
                            onCheckedChange = {
                                pushEnabled = it
                                updatePreference(UpdatePreferencesRequest(pushEnabled = it))
                            },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = androidx.compose.ui.graphics.Color.White,
                                checkedTrackColor = AppColors.primary600,
                                uncheckedThumbColor = AppColors.textMuted,
                                uncheckedTrackColor = AppColors.gray100
                            )
                        )
                    }
                }
            }

            // Company Settings Section
            state.company?.let { company ->
                val isAdmin = state.profile?.role == "ADMIN"

                Column(modifier = Modifier.padding(horizontal = AppSpacing.md)) {
                    CPSectionHeader(title = stringResource(R.string.settings_company_settings))

                    if (isAdmin) {
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = AppSpacing.sm),
                            shape = RoundedCornerShape(AppSpacing.xs),
                            color = AppColors.primary50,
                            border = androidx.compose.foundation.BorderStroke(1.dp, AppColors.primary200)
                        ) {
                            Row(
                                modifier = Modifier.padding(AppSpacing.sm),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Edit,
                                    contentDescription = null,
                                    tint = AppColors.primary600,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Text(
                                    text = stringResource(R.string.settings_company_edit_hint),
                                    style = AppTypography.secondary,
                                    color = AppColors.primary600
                                )
                            }
                        }
                    }

                    CPCard {
                        company.companyName?.let { name ->
                            SettingsInfoRow(
                                icon = Icons.Default.Business,
                                label = "Company",
                                value = name
                            )
                            CPDivider()
                        }

                        // Timezone - editable for admins
                        val timezone = company.timezone ?: "Not set"
                        if (isAdmin) {
                            SettingsClickableRow(
                                icon = Icons.Default.Schedule,
                                label = "Timezone",
                                value = timezone,
                                onClick = { showTimezoneDialog = true }
                            )
                        } else {
                            SettingsInfoRow(
                                icon = Icons.Default.Schedule,
                                label = "Timezone",
                                value = timezone
                            )
                        }
                        CPDivider()

                        // Date Format - editable for admins
                        val dateFormat = company.dateFormat ?: "Not set"
                        if (isAdmin) {
                            SettingsClickableRow(
                                icon = Icons.Default.CalendarToday,
                                label = "Date Format",
                                value = dateFormat,
                                onClick = { showDateFormatDialog = true }
                            )
                        } else {
                            SettingsInfoRow(
                                icon = Icons.Default.CalendarToday,
                                label = "Date Format",
                                value = dateFormat
                            )
                        }
                        CPDivider()

                        // Currency - editable for admins
                        val currency = company.currency ?: "Not set"
                        if (isAdmin) {
                            SettingsClickableRow(
                                icon = Icons.Default.AttachMoney,
                                label = "Currency",
                                value = currency,
                                onClick = { showCurrencyDialog = true }
                            )
                        } else {
                            SettingsInfoRow(
                                icon = Icons.Default.AttachMoney,
                                label = "Currency",
                                value = currency
                            )
                        }
                    }
                }

                // Enabled Modules (Collapsible)
                Column(modifier = Modifier.padding(horizontal = AppSpacing.md)) {
                    // Clickable header
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { expandedModules = !expandedModules },
                        color = AppColors.background
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = AppSpacing.sm),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = if (isAdmin) "Company Modules" else "Enabled Modules",
                                style = AppTypography.bodySemibold,
                                fontWeight = FontWeight.SemiBold,
                                color = AppColors.textPrimary
                            )
                            Icon(
                                imageVector = if (expandedModules) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                contentDescription = if (expandedModules) "Collapse" else "Expand",
                                tint = AppColors.textSecondary
                            )
                        }
                    }

                    AnimatedVisibility(
                        visible = expandedModules,
                        enter = expandVertically(),
                        exit = shrinkVertically()
                    ) {
                        Column {
                    if (isAdmin) {
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = AppSpacing.sm),
                            shape = RoundedCornerShape(AppSpacing.xs),
                            color = AppColors.primary50,
                            border = androidx.compose.foundation.BorderStroke(1.dp, AppColors.primary200)
                        ) {
                            Row(
                                modifier = Modifier.padding(AppSpacing.sm),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.AdminPanelSettings,
                                    contentDescription = null,
                                    tint = AppColors.primary600,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(AppSpacing.sm))
                                Column {
                                    Text(
                                        text = "Admin Controls",
                                        style = AppTypography.secondaryMedium,
                                        fontWeight = FontWeight.SemiBold,
                                        color = AppColors.primary700
                                    )
                                    Text(
                                        text = "Toggle modules on/off company-wide. Changes apply to all users.",
                                        style = AppTypography.secondary,
                                        color = AppColors.primary600
                                    )
                                }
                            }
                        }
                    }

                    CPCard {
                        // Define all modules with their properties
                        data class ModuleInfo(
                            val key: String,
                            val name: String,
                            val icon: androidx.compose.ui.graphics.vector.ImageVector,
                            val enabled: Boolean
                        )

                        val allModules = listOf(
                            ModuleInfo("moduleProjects", "Projects", Icons.Default.Folder, company.moduleProjects ?: true),
                            ModuleInfo("moduleDailyLogs", "Daily Logs", Icons.Default.EditNote, company.moduleDailyLogs ?: true),
                            ModuleInfo("moduleDocuments", "Documents", Icons.Default.Description, company.moduleDocuments ?: true),
                            ModuleInfo("moduleReports", "Reports", Icons.Default.Assessment, company.moduleReports ?: true),
                            ModuleInfo("moduleTimeTracking", "Time Tracking", Icons.Default.Timer, company.moduleTimeTracking ?: false),
                            ModuleInfo("moduleEquipment", "Equipment", Icons.Default.Construction, company.moduleEquipment ?: false),
                            ModuleInfo("moduleScheduling", "Scheduling", Icons.Default.CalendarMonth, company.moduleScheduling ?: false),
                            ModuleInfo("moduleSafety", "Safety", Icons.Default.HealthAndSafety, company.moduleSafety ?: false),
                            ModuleInfo("moduleFinancials", "Financials", Icons.Default.AttachMoney, company.moduleFinancials ?: false),
                            ModuleInfo("moduleAnalytics", "Analytics", Icons.Default.BarChart, company.moduleAnalytics ?: false),
                            ModuleInfo("moduleSubcontractors", "Subcontractors", Icons.Default.Groups, company.moduleSubcontractors ?: false),
                            ModuleInfo("moduleCertifications", "Certifications", Icons.Default.WorkspacePremium, company.moduleCertifications ?: false),
                            ModuleInfo("moduleApprovals", "Approvals", Icons.Default.CheckCircle, company.moduleApprovals ?: false)
                        )

                        allModules.forEachIndexed { index, module ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = AppSpacing.sm),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Icon(
                                        imageVector = module.icon,
                                        contentDescription = null,
                                        modifier = Modifier.size(20.dp),
                                        tint = if (module.enabled) AppColors.primary600 else AppColors.textMuted
                                    )
                                    Spacer(modifier = Modifier.width(AppSpacing.sm))
                                    Text(
                                        text = module.name,
                                        style = AppTypography.bodyLarge,
                                        fontWeight = FontWeight.Medium,
                                        color = AppColors.textPrimary
                                    )
                                }
                                if (isAdmin) {
                                    Switch(
                                        checked = module.enabled,
                                        onCheckedChange = { newValue ->
                                            val update = when (module.key) {
                                                "moduleProjects" -> CompanySettingsUpdate(moduleProjects = newValue)
                                                "moduleDailyLogs" -> CompanySettingsUpdate(moduleDailyLogs = newValue)
                                                "moduleDocuments" -> CompanySettingsUpdate(moduleDocuments = newValue)
                                                "moduleReports" -> CompanySettingsUpdate(moduleReports = newValue)
                                                "moduleTimeTracking" -> CompanySettingsUpdate(moduleTimeTracking = newValue)
                                                "moduleEquipment" -> CompanySettingsUpdate(moduleEquipment = newValue)
                                                "moduleScheduling" -> CompanySettingsUpdate(moduleScheduling = newValue)
                                                "moduleSafety" -> CompanySettingsUpdate(moduleSafety = newValue)
                                                "moduleFinancials" -> CompanySettingsUpdate(moduleFinancials = newValue)
                                                "moduleAnalytics" -> CompanySettingsUpdate(moduleAnalytics = newValue)
                                                "moduleSubcontractors" -> CompanySettingsUpdate(moduleSubcontractors = newValue)
                                                "moduleCertifications" -> CompanySettingsUpdate(moduleCertifications = newValue)
                                                "moduleApprovals" -> CompanySettingsUpdate(moduleApprovals = newValue)
                                                else -> null
                                            }
                                            update?.let { updateModuleSettings(it) }
                                        },
                                        enabled = !state.savingModules,
                                        colors = SwitchDefaults.colors(
                                            checkedThumbColor = androidx.compose.ui.graphics.Color.White,
                                            checkedTrackColor = AppColors.primary600,
                                            uncheckedThumbColor = AppColors.textMuted,
                                            uncheckedTrackColor = AppColors.gray100
                                        )
                                    )
                                } else {
                                    CPBadge(
                                        text = if (module.enabled) "Active" else "Inactive",
                                        color = if (module.enabled) ConstructionGreen else AppColors.textSecondary,
                                        backgroundColor = if (module.enabled) ConstructionGreen.copy(alpha = 0.1f) else AppColors.gray100
                                    )
                                }
                            }
                            if (index < allModules.lastIndex) {
                                CPDivider()
                            }
                        }
                    }
                        } // end Column inside AnimatedVisibility
                    } // end AnimatedVisibility
                }

                // Personal Module Visibility Section (Collapsible)
                Column(modifier = Modifier.padding(horizontal = AppSpacing.md)) {
                    Spacer(modifier = Modifier.height(AppSpacing.xs))

                    // Clickable header
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { expandedVisibility = !expandedVisibility },
                        color = AppColors.background
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = AppSpacing.sm),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Module Visibility",
                                style = AppTypography.bodySemibold,
                                fontWeight = FontWeight.SemiBold,
                                color = AppColors.textPrimary
                            )
                            Icon(
                                imageVector = if (expandedVisibility) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                contentDescription = if (expandedVisibility) "Collapse" else "Expand",
                                tint = AppColors.textSecondary
                            )
                        }
                    }

                    AnimatedVisibility(
                        visible = expandedVisibility,
                        enter = expandVertically(),
                        exit = shrinkVertically()
                    ) {
                        Column {
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = AppSpacing.sm),
                                shape = RoundedCornerShape(AppSpacing.xs),
                                color = AppColors.gray100.copy(alpha = 0.5f)
                            ) {
                                Row(
                                    modifier = Modifier.padding(AppSpacing.sm),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Visibility,
                                        contentDescription = null,
                                        tint = AppColors.textSecondary,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Text(
                                        text = "Hide modules you don't use from your dashboard. This only affects your device.",
                                        style = AppTypography.secondary,
                                        color = AppColors.textSecondary
                                    )
                                }
                            }

                CPCard {
                    // Personal visibility toggles for enabled modules only
                    data class VisibilityItem(
                        val key: String,
                        val name: String,
                        val icon: androidx.compose.ui.graphics.vector.ImageVector,
                        val companyEnabled: Boolean,
                        val userVisible: Boolean
                    )

                    val visibilityItems = listOf(
                        VisibilityItem("projects", "Projects", Icons.Default.Folder, company.moduleProjects ?: true, moduleVisibility.showProjects),
                        VisibilityItem("dailyLogs", "Daily Logs", Icons.Default.EditNote, company.moduleDailyLogs ?: true, moduleVisibility.showDailyLogs),
                        VisibilityItem("documents", "Documents", Icons.Default.Description, company.moduleDocuments ?: true, moduleVisibility.showDocuments),
                        VisibilityItem("drawings", "Drawings", Icons.Default.Layers, company.moduleDocuments ?: true, moduleVisibility.showDrawings),
                        VisibilityItem("timeTracking", "Time Tracking", Icons.Default.Timer, company.moduleTimeTracking ?: false, moduleVisibility.showTimeTracking),
                        VisibilityItem("equipment", "Equipment", Icons.Default.Construction, company.moduleEquipment ?: false, moduleVisibility.showEquipment),
                        VisibilityItem("scheduling", "Scheduling", Icons.Default.CalendarMonth, company.moduleScheduling ?: false, moduleVisibility.showScheduling),
                        VisibilityItem("safety", "Safety", Icons.Default.HealthAndSafety, company.moduleSafety ?: false, moduleVisibility.showSafety),
                        VisibilityItem("financials", "Financials", Icons.Default.AttachMoney, company.moduleFinancials ?: false, moduleVisibility.showFinancials),
                        VisibilityItem("approvals", "Approvals", Icons.Default.CheckCircle, company.moduleApprovals ?: false, moduleVisibility.showApprovals),
                        VisibilityItem("certifications", "Certifications", Icons.Default.WorkspacePremium, company.moduleCertifications ?: false, moduleVisibility.showCertifications),
                        VisibilityItem("subcontractors", "Subcontractors", Icons.Default.Groups, company.moduleSubcontractors ?: false, moduleVisibility.showSubcontractors),
                        VisibilityItem("tasks", "Tasks", Icons.Default.AssignmentTurnedIn, company.moduleTasks ?: true, moduleVisibility.showTasks),
                        VisibilityItem("rfis", "RFIs", Icons.Default.QuestionAnswer, company.moduleRfis ?: true, moduleVisibility.showRfis),
                        VisibilityItem("notifications", "Notifications", Icons.Default.Notifications, company.moduleNotifications ?: true, moduleVisibility.showNotifications),
                        VisibilityItem("secureUpload", "Secure Upload", Icons.Default.CloudUpload, company.moduleSecureUpload ?: true, moduleVisibility.showSecureUpload),
                        // Insights & Reports
                        VisibilityItem("analytics", "Analytics", Icons.Default.Analytics, company.moduleAnalytics ?: true, moduleVisibility.showAnalytics),
                        VisibilityItem("reports", "Reports", Icons.Default.Assessment, company.moduleReports ?: true, moduleVisibility.showReports),
                        // Admin & HR (always enabled at company level, user can hide locally)
                        VisibilityItem("warnings", "Warnings", Icons.Default.Warning, true, moduleVisibility.showWarnings),
                        VisibilityItem("clients", "Clients", Icons.Default.BusinessCenter, true, moduleVisibility.showClients),
                        VisibilityItem("labels", "Labels", Icons.AutoMirrored.Filled.Label, true, moduleVisibility.showLabels),
                        VisibilityItem("search", "Search", Icons.Default.Search, true, moduleVisibility.showSearch),
                        VisibilityItem("companySettings", "Company Settings", Icons.Default.AdminPanelSettings, true, moduleVisibility.showCompanySettings)
                    ).filter { it.companyEnabled } // Only show modules that are enabled company-wide

                    if (visibilityItems.isEmpty()) {
                        Text(
                            text = "No modules available",
                            style = AppTypography.body,
                            color = AppColors.textSecondary,
                            modifier = Modifier.padding(vertical = AppSpacing.md)
                        )
                    } else {
                        visibilityItems.forEachIndexed { index, item ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Icon(
                                        imageVector = item.icon,
                                        contentDescription = null,
                                        modifier = Modifier.size(20.dp),
                                        tint = if (item.userVisible) AppColors.primary600 else AppColors.textMuted.copy(alpha = 0.5f)
                                    )
                                    Spacer(modifier = Modifier.width(AppSpacing.sm))
                                    Column {
                                        Text(
                                            text = item.name,
                                            style = AppTypography.bodyLarge,
                                            fontWeight = FontWeight.Medium,
                                            color = if (item.userVisible) AppColors.textPrimary else AppColors.textPrimary.copy(alpha = 0.5f)
                                        )
                                        Text(
                                            text = if (item.userVisible) "Visible on dashboard" else "Hidden from dashboard",
                                            style = AppTypography.secondary,
                                            color = if (item.userVisible) ConstructionGreen else AppColors.textMuted
                                        )
                                    }
                                }
                                Switch(
                                    checked = item.userVisible,
                                    onCheckedChange = { newValue ->
                                        scope.launch {
                                            moduleVisibilityPrefs.setModuleVisibility(item.key, newValue)
                                            state = state.copy(successMessage = if (newValue) "${item.name} will now appear on dashboard" else "${item.name} hidden from dashboard")
                                        }
                                    },
                                    colors = SwitchDefaults.colors(
                                        checkedThumbColor = androidx.compose.ui.graphics.Color.White,
                                        checkedTrackColor = ConstructionGreen,
                                        uncheckedThumbColor = AppColors.textMuted,
                                        uncheckedTrackColor = AppColors.gray100
                                    )
                                )
                            }
                            if (index < visibilityItems.lastIndex) {
                                CPDivider()
                            }
                        }
                    }
                }

                // Reset visibility button
                CPButton(
                    text = "Show All Modules",
                    onClick = {
                        scope.launch {
                            moduleVisibilityPrefs.resetAll()
                            state = state.copy(successMessage = "All modules are now visible")
                        }
                    },
                    style = CPButtonStyle.Outline,
                    modifier = Modifier.fillMaxWidth(),
                    icon = Icons.Default.VisibilityOff
                )
                        } // end Column inside AnimatedVisibility
                    } // end AnimatedVisibility
                } // end Module Visibility outer Column
            }

            // App Info Section
            Column(modifier = Modifier.padding(horizontal = AppSpacing.md)) {
                CPSectionHeader(title = stringResource(R.string.settings_app_info))

                CPCard {
                    SettingsInfoRow(
                        icon = Icons.Default.Info,
                        label = stringResource(R.string.settings_version),
                        value = "0.1.0 (Build 1)"
                    )
                    CPDivider()
                    SettingsInfoRow(
                        icon = Icons.Default.Security,
                        label = stringResource(R.string.settings_privacy_policy),
                        value = stringResource(R.string.settings_privacy_view)
                    )
                }
            }

            // Bottom spacing
            Spacer(modifier = Modifier.height(AppSpacing.xxl))
        }
    }
}

@Composable
private fun SettingsInfoRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = AppSpacing.xs),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(20.dp),
            tint = AppColors.textMuted
        )
        Spacer(modifier = Modifier.width(AppSpacing.sm))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = label,
                style = AppTypography.secondary,
                color = AppColors.textSecondary
            )
            Text(
                text = value,
                style = AppTypography.bodyLarge,
                fontWeight = FontWeight.Medium,
                color = AppColors.textPrimary
            )
        }
    }
}

@Composable
private fun SettingsClickableRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        color = androidx.compose.ui.graphics.Color.Transparent
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = AppSpacing.xs),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(20.dp),
                tint = AppColors.textMuted
            )
            Spacer(modifier = Modifier.width(AppSpacing.sm))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = label,
                    style = AppTypography.secondary,
                    color = AppColors.textSecondary
                )
                Text(
                    text = value,
                    style = AppTypography.bodyLarge,
                    fontWeight = FontWeight.Medium,
                    color = AppColors.textPrimary
                )
            }
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = AppColors.textMuted
            )
        }
    }
}
