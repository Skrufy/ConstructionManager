package com.constructionpro.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.constructionpro.app.R
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.model.*
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class CompanySettingsState(
    val loading: Boolean = false,
    val company: CompanyProfile? = null,
    val settings: CompanySettings? = null,
    val error: String? = null,
    val saving: Boolean = false,
    val saveSuccess: Boolean = false,
    val isEditingProfile: Boolean = false,
    val actionSuccess: String? = null
)

private data class CompanyProfileEditForm(
    val name: String = "",
    val address: String = "",
    val city: String = "",
    val state: String = "",
    val zip: String = "",
    val phone: String = "",
    val email: String = "",
    val website: String = "",
    val taxId: String = "",
    val licenseNumber: String = ""
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CompanySettingsScreen(
    apiService: ApiService,
    onBack: () -> Unit,
    onOpenUserManagement: () -> Unit,
    onOpenTeamManagement: () -> Unit,
    onOpenAuditLogs: () -> Unit,
    onOpenInvitations: () -> Unit = {},
    onOpenPermissions: () -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(CompanySettingsState(loading = true)) }
    var editForm by remember { mutableStateOf(CompanyProfileEditForm()) }
    val configuration = LocalConfiguration.current
    val isNarrow = configuration.screenWidthDp < 360

    fun loadData() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val settingsResponse = withContext(Dispatchers.IO) {
                    apiService.getSettings()
                }
                state = state.copy(
                    loading = false,
                    settings = settingsResponse.company
                )
                // Populate edit form with company name from settings
                settingsResponse.company?.let { settings ->
                    editForm = CompanyProfileEditForm(
                        name = settings.companyName ?: ""
                    )
                }
            } catch (e: Exception) {
                state = state.copy(loading = false, error = e.message ?: "Failed to load settings")
            }
        }
    }

    fun saveCompanyProfile() {
        scope.launch {
            state = state.copy(saving = true, error = null)
            try {
                val request = UpdateSettingsRequest(
                    type = "company",
                    settings = CompanySettingsUpdate(
                        companyName = editForm.name.ifBlank { null }
                    )
                )
                withContext(Dispatchers.IO) {
                    apiService.updateSettings(request)
                }
                // Reload to get updated settings
                loadData()
                state = state.copy(
                    saving = false,
                    isEditingProfile = false,
                    actionSuccess = "Company name updated"
                )
            } catch (e: Exception) {
                state = state.copy(
                    saving = false,
                    error = e.message ?: "Failed to update company"
                )
            }
        }
    }

    LaunchedEffect(Unit) {
        loadData()
    }

    // Success message auto-dismiss
    LaunchedEffect(state.actionSuccess) {
        if (state.actionSuccess != null) {
            kotlinx.coroutines.delay(3000)
            state = state.copy(actionSuccess = null)
        }
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = if (state.isEditingProfile) stringResource(R.string.common_edit) else stringResource(R.string.company_settings_title),
                navigationIcon = {
                    IconButton(
                        onClick = {
                            if (state.isEditingProfile) {
                                state = state.copy(isEditingProfile = false)
                                // Reset form to original values
                                state.company?.let { company ->
                                    editForm = CompanyProfileEditForm(
                                        name = company.name,
                                        address = company.address ?: "",
                                        city = company.city ?: "",
                                        state = company.state ?: "",
                                        zip = company.zip ?: "",
                                        phone = company.phone ?: "",
                                        email = company.email ?: "",
                                        website = company.website ?: "",
                                        taxId = company.taxId ?: "",
                                        licenseNumber = company.licenseNumber ?: ""
                                    )
                                }
                            } else {
                                onBack()
                            }
                        },
                        modifier = Modifier.size(AppSpacing.touchTargetLarge) // Field worker touch target
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.common_back)
                        )
                    }
                },
                actions = {
                    if (!state.isEditingProfile && state.company != null) {
                        IconButton(
                            onClick = { state = state.copy(isEditingProfile = true) },
                            modifier = Modifier.size(AppSpacing.touchTargetLarge)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Edit,
                                contentDescription = stringResource(R.string.common_edit)
                            )
                        }
                    }
                }
            )
        }
    ) { padding ->
        when {
            state.loading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    CPLoadingIndicator(message = stringResource(R.string.company_settings_loading))
                }
            }
            state.error != null -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(AppSpacing.md)
                ) {
                    CPErrorBanner(
                        message = state.error ?: "An error occurred",
                        onRetry = { loadData() },
                        onDismiss = { state = state.copy(error = null) }
                    )
                }
            }
            else -> {
                Box(modifier = Modifier.fillMaxSize()) {
                    if (state.isEditingProfile) {
                        CompanyProfileEditContent(
                            form = editForm,
                            onFormChange = { editForm = it },
                            onSave = { saveCompanyProfile() },
                            saving = state.saving,
                            error = state.error,
                            onDismissError = { state = state.copy(error = null) },
                            modifier = Modifier.padding(padding)
                        )
                    } else {
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(padding),
                            contentPadding = PaddingValues(AppSpacing.md),
                            verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
                        ) {
                            // Company Profile Card
                            item {
                                CompanyProfileCard(
                                    company = state.company,
                                    isNarrow = isNarrow,
                                    onEdit = { state = state.copy(isEditingProfile = true) }
                                )
                            }

                            // Usage Stats (if available)
                            state.company?.usage?.let { usage ->
                                item {
                                    UsageStatsCard(usage = usage, subscription = state.company?.subscription)
                                }
                            }

                            // Admin Navigation
                            item {
                                CPSectionHeader(title = stringResource(R.string.nav_admin))
                            }

                            item {
                                Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)) {
                                    AdminNavCard(
                                        title = stringResource(R.string.company_settings_users),
                                        subtitle = stringResource(R.string.users_empty_desc),
                                        icon = Icons.Default.People,
                                        onClick = onOpenUserManagement
                                    )

                                    AdminNavCard(
                                        title = stringResource(R.string.company_settings_invitations),
                                        subtitle = stringResource(R.string.invitations_empty_desc),
                                        icon = Icons.Default.PersonAdd,
                                        onClick = onOpenInvitations
                                    )

                                    AdminNavCard(
                                        title = stringResource(R.string.company_settings_teams),
                                        subtitle = stringResource(R.string.teams_empty_desc),
                                        icon = Icons.Default.Groups,
                                        onClick = onOpenTeamManagement
                                    )

                                    AdminNavCard(
                                        title = stringResource(R.string.company_settings_audit_logs),
                                        subtitle = stringResource(R.string.audit_logs_empty_desc),
                                        icon = Icons.Default.History,
                                        onClick = onOpenAuditLogs
                                    )

                                    AdminNavCard(
                                        title = "Permissions",
                                        subtitle = "Manage user permissions and templates",
                                        icon = Icons.Default.Security,
                                        onClick = onOpenPermissions
                                    )
                                }
                            }

                            // Module Settings
                            item {
                                Spacer(modifier = Modifier.height(AppSpacing.xs))
                                CPSectionHeader(title = stringResource(R.string.settings_enabled_modules))
                            }

                            item {
                                ModuleSettingsCard(settings = state.settings)
                            }

                            // Workflow Settings
                            item {
                                Spacer(modifier = Modifier.height(AppSpacing.xs))
                                CPSectionHeader(title = stringResource(R.string.nav_settings))
                            }

                            item {
                                WorkflowSettingsCard(
                                    settings = state.settings,
                                    onSettingsChange = { key, value ->
                                        // First, update the local state immediately so it persists
                                        val updatedSettings = state.settings?.copy(
                                            dailyLogApprovalRequired = if (key == "dailyLogApprovalRequired") value else state.settings?.dailyLogApprovalRequired,
                                            requireGpsClockIn = if (key == "requireGpsClockIn") value else state.settings?.requireGpsClockIn,
                                            requirePhotoDaily = if (key == "requirePhotoDaily") value else state.settings?.requirePhotoDaily,
                                            autoApproveTimesheet = if (key == "autoApproveTimesheet") value else state.settings?.autoApproveTimesheet,
                                            dailyLogReminders = if (key == "dailyLogReminders") value else state.settings?.dailyLogReminders,
                                            emailNotifications = if (key == "emailNotifications") value else state.settings?.emailNotifications,
                                            pushNotifications = if (key == "pushNotifications") value else state.settings?.pushNotifications,
                                            hideBuildingInfo = if (key == "hideBuildingInfo") value else state.settings?.hideBuildingInfo
                                        ) ?: CompanySettings(
                                            dailyLogApprovalRequired = if (key == "dailyLogApprovalRequired") value else false,
                                            requireGpsClockIn = if (key == "requireGpsClockIn") value else false,
                                            requirePhotoDaily = if (key == "requirePhotoDaily") value else false,
                                            autoApproveTimesheet = if (key == "autoApproveTimesheet") value else false,
                                            dailyLogReminders = if (key == "dailyLogReminders") value else false,
                                            emailNotifications = if (key == "emailNotifications") value else true,
                                            pushNotifications = if (key == "pushNotifications") value else true,
                                            hideBuildingInfo = if (key == "hideBuildingInfo") value else false
                                        )
                                        state = state.copy(settings = updatedSettings)

                                        // Then call the API
                                        scope.launch {
                                            try {
                                                val settingsUpdate = CompanySettingsUpdate(
                                                    dailyLogApprovalRequired = if (key == "dailyLogApprovalRequired") value else null,
                                                    requireGpsClockIn = if (key == "requireGpsClockIn") value else null,
                                                    requirePhotoDaily = if (key == "requirePhotoDaily") value else null,
                                                    autoApproveTimesheet = if (key == "autoApproveTimesheet") value else null,
                                                    dailyLogReminders = if (key == "dailyLogReminders") value else null,
                                                    emailNotifications = if (key == "emailNotifications") value else null,
                                                    pushNotifications = if (key == "pushNotifications") value else null,
                                                    hideBuildingInfo = if (key == "hideBuildingInfo") value else null
                                                )
                                                val request = UpdateSettingsRequest(
                                                    type = "company",
                                                    settings = settingsUpdate
                                                )
                                                withContext(Dispatchers.IO) {
                                                    apiService.updateSettings(request)
                                                }
                                                state = state.copy(actionSuccess = "Setting updated")
                                            } catch (e: Exception) {
                                                // Setting still updates locally even if API fails
                                                state = state.copy(actionSuccess = "Setting updated (offline)")
                                            }
                                        }
                                    }
                                )
                            }

                            // Bottom padding
                            item {
                                Spacer(modifier = Modifier.height(AppSpacing.xxl))
                            }
                        }
                    }

                    // Success Banner
                    state.actionSuccess?.let { message ->
                        Surface(
                            modifier = Modifier
                                .align(Alignment.BottomCenter)
                                .padding(AppSpacing.md)
                                .fillMaxWidth(),
                            shape = RoundedCornerShape(AppSpacing.sm),
                            color = ConstructionGreen,
                            shadowElevation = AppElevation.high
                        ) {
                            Row(
                                modifier = Modifier.padding(AppSpacing.md),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = Color.White
                                )
                                Spacer(modifier = Modifier.width(AppSpacing.sm))
                                Text(
                                    text = message,
                                    color = Color.White,
                                    style = AppTypography.bodyMedium
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CompanyProfileEditContent(
    form: CompanyProfileEditForm,
    onFormChange: (CompanyProfileEditForm) -> Unit,
    onSave: () -> Unit,
    saving: Boolean,
    error: String?,
    onDismissError: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(AppSpacing.md),
        verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
    ) {
        // Error Banner
        error?.let {
            CPErrorBanner(
                message = it,
                onDismiss = onDismissError
            )
        }

        // Basic Info Card
        CPCard {
            Column(
                verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
            ) {
                Text(
                    text = "Company Information",
                    style = AppTypography.heading3,
                    color = AppColors.textPrimary
                )

                OutlinedTextField(
                    value = form.name,
                    onValueChange = { onFormChange(form.copy(name = it)) },
                    label = { Text("Company Name *") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    leadingIcon = {
                        Icon(Icons.Default.Business, contentDescription = null)
                    },
                    enabled = !saving
                )

                OutlinedTextField(
                    value = form.email,
                    onValueChange = { onFormChange(form.copy(email = it)) },
                    label = { Text("Email") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    leadingIcon = {
                        Icon(Icons.Default.Email, contentDescription = null)
                    },
                    enabled = !saving
                )

                OutlinedTextField(
                    value = form.phone,
                    onValueChange = { onFormChange(form.copy(phone = it)) },
                    label = { Text("Phone") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    leadingIcon = {
                        Icon(Icons.Default.Phone, contentDescription = null)
                    },
                    enabled = !saving
                )

                OutlinedTextField(
                    value = form.website,
                    onValueChange = { onFormChange(form.copy(website = it)) },
                    label = { Text("Website") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    leadingIcon = {
                        Icon(Icons.Default.Language, contentDescription = null)
                    },
                    enabled = !saving
                )
            }
        }

        // Address Card
        CPCard {
            Column(
                verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
            ) {
                Text(
                    text = "Address",
                    style = AppTypography.heading3,
                    color = AppColors.textPrimary
                )

                OutlinedTextField(
                    value = form.address,
                    onValueChange = { onFormChange(form.copy(address = it)) },
                    label = { Text("Street Address") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    leadingIcon = {
                        Icon(Icons.Default.LocationOn, contentDescription = null)
                    },
                    enabled = !saving
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
                ) {
                    OutlinedTextField(
                        value = form.city,
                        onValueChange = { onFormChange(form.copy(city = it)) },
                        label = { Text("City") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        enabled = !saving
                    )

                    OutlinedTextField(
                        value = form.state,
                        onValueChange = { onFormChange(form.copy(state = it)) },
                        label = { Text("State") },
                        modifier = Modifier.weight(0.5f),
                        singleLine = true,
                        enabled = !saving
                    )
                }

                OutlinedTextField(
                    value = form.zip,
                    onValueChange = { onFormChange(form.copy(zip = it)) },
                    label = { Text("ZIP Code") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    enabled = !saving
                )
            }
        }

        // Legal Info Card
        CPCard {
            Column(
                verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
            ) {
                Text(
                    text = "Legal Information",
                    style = AppTypography.heading3,
                    color = AppColors.textPrimary
                )

                OutlinedTextField(
                    value = form.taxId,
                    onValueChange = { onFormChange(form.copy(taxId = it)) },
                    label = { Text("Tax ID / EIN") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    leadingIcon = {
                        Icon(Icons.Default.Badge, contentDescription = null)
                    },
                    enabled = !saving
                )

                OutlinedTextField(
                    value = form.licenseNumber,
                    onValueChange = { onFormChange(form.copy(licenseNumber = it)) },
                    label = { Text("Contractor License Number") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    leadingIcon = {
                        Icon(Icons.Default.VerifiedUser, contentDescription = null)
                    },
                    enabled = !saving
                )
            }
        }

        // Save Button
        CPButton(
            text = if (saving) "Saving..." else "Save Changes",
            onClick = onSave,
            loading = saving,
            enabled = !saving && form.name.isNotBlank(),
            icon = Icons.Default.Save,
            size = CPButtonSize.Large,
            modifier = Modifier.fillMaxWidth()
        )

        // Bottom spacing
        Spacer(modifier = Modifier.height(AppSpacing.xxl))
    }
}

@Composable
private fun CompanyProfileCard(
    company: CompanyProfile?,
    isNarrow: Boolean,
    onEdit: () -> Unit = {}
) {
    CPCard {
        Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.md)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = company?.name ?: "Your Company",
                        style = AppTypography.heading2,
                        color = AppColors.textPrimary
                    )
                    company?.subscription?.let { sub ->
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            val planColor = when (sub.plan) {
                                "ENTERPRISE" -> Primary600
                                "PROFESSIONAL" -> ConstructionGreen
                                "STARTER" -> ConstructionOrange
                                else -> AppColors.textSecondary
                            }
                            Surface(
                                shape = RoundedCornerShape(AppSpacing.xxs),
                                color = planColor.copy(alpha = 0.1f)
                            ) {
                                Text(
                                    text = sub.plan,
                                    style = AppTypography.secondaryMedium,
                                    color = planColor,
                                    modifier = Modifier.padding(horizontal = AppSpacing.xs, vertical = AppSpacing.xxs)
                                )
                            }
                            val statusColor = if (sub.status == "ACTIVE") ConstructionGreen else ConstructionOrange
                            Text(
                                text = sub.status,
                                style = AppTypography.caption,
                                color = statusColor
                            )
                        }
                    }
                }

                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                ) {
                    Icon(
                        imageVector = Icons.Default.Business,
                        contentDescription = null,
                        tint = Primary600,
                        modifier = Modifier.size(AppSpacing.xxxl)
                    )
                    TextButton(
                        onClick = onEdit,
                        modifier = Modifier.defaultMinSize(minHeight = AppSpacing.touchTargetLarge)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Edit,
                            contentDescription = null,
                            modifier = Modifier.size(AppSpacing.iconSmall)
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.xxs))
                        Text("Edit")
                    }
                }
            }

            HorizontalDivider()

            // Contact Info
            Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)) {
                company?.address?.let { address ->
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.LocationOn,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp),
                            tint = AppColors.textSecondary
                        )
                        Text(
                            text = buildString {
                                append(address)
                                company.city?.let { append(", $it") }
                                company.state?.let { append(", $it") }
                                company.zip?.let { append(" $it") }
                            },
                            style = AppTypography.body,
                            color = AppColors.textSecondary
                        )
                    }
                }

                company?.phone?.let { phone ->
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Phone,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp),
                            tint = AppColors.textSecondary
                        )
                        Text(
                            text = phone,
                            style = AppTypography.body,
                            color = AppColors.textSecondary
                        )
                    }
                }

                company?.email?.let { email ->
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Email,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp),
                            tint = AppColors.textSecondary
                        )
                        Text(
                            text = email,
                            style = AppTypography.body,
                            color = AppColors.textSecondary
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun UsageStatsCard(
    usage: UsageStats,
    subscription: SubscriptionInfo?
) {
    CPCard {
        Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.md)) {
            Text(
                text = "Usage",
                style = AppTypography.heading3,
                color = AppColors.textPrimary
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                UsageStatItem(
                    value = "${usage.activeUsers}",
                    label = "Active Users",
                    max = subscription?.maxUsers,
                    icon = Icons.Default.People
                )
                UsageStatItem(
                    value = "${usage.activeProjects}",
                    label = "Active Projects",
                    max = subscription?.maxProjects,
                    icon = Icons.Default.Folder
                )
                UsageStatItem(
                    value = "${usage.storageUsedMB / 1024} GB",
                    label = "Storage Used",
                    maxLabel = subscription?.maxStorageGB?.let { "$it GB" },
                    icon = Icons.Default.Storage
                )
            }

            // Storage Progress Bar
            subscription?.let { sub ->
                if (sub.maxStorageGB > 0) {
                    val storagePercent = (usage.storageUsedMB.toFloat() / 1024 / sub.maxStorageGB).coerceIn(0f, 1f)
                    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.xxs)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "Storage",
                                style = AppTypography.secondary
                            )
                            Text(
                                text = "${(storagePercent * 100).toInt()}%",
                                style = AppTypography.secondaryMedium
                            )
                        }
                        LinearProgressIndicator(
                            progress = { storagePercent },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(AppSpacing.xs)
                                .clip(RoundedCornerShape(AppSpacing.xxs)),
                            color = if (storagePercent > 0.9f) ConstructionRed else Primary600,
                            trackColor = AppColors.gray100
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun UsageStatItem(
    value: String,
    label: String,
    max: Int? = null,
    maxLabel: String? = null,
    icon: ImageVector
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(AppSpacing.xxs)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = Primary600,
            modifier = Modifier.size(AppSpacing.iconLarge)
        )
        Text(
            text = value,
            style = AppTypography.heading2,
            color = AppColors.textPrimary
        )
        Text(
            text = label,
            style = AppTypography.secondary,
            color = AppColors.textSecondary
        )
        if (max != null || maxLabel != null) {
            Text(
                text = "of ${maxLabel ?: max}",
                style = AppTypography.caption,
                color = AppColors.textSecondary
            )
        }
    }
}

@Composable
private fun AdminNavCard(
    title: String,
    subtitle: String,
    icon: ImageVector,
    onClick: () -> Unit
) {
    CPNavigationCard(
        title = title,
        subtitle = subtitle,
        icon = icon,
        onClick = onClick,
        iconBackgroundColor = Primary100,
        iconColor = Primary600
    )
}

@Composable
private fun ModuleSettingsCard(settings: CompanySettings?) {
    CPCard {
        Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
            Text(
                text = "The following modules are enabled for your organization:",
                style = AppTypography.secondary,
                color = AppColors.textSecondary
            )

            val modules = listOf(
                Triple("Projects", settings?.moduleProjects ?: true, Icons.Default.Folder),
                Triple("Daily Logs", settings?.moduleDailyLogs ?: true, Icons.Default.EditNote),
                Triple("Time Tracking", settings?.moduleTimeTracking ?: false, Icons.Default.Schedule),
                Triple("Equipment", settings?.moduleEquipment ?: false, Icons.Default.Construction),
                Triple("Scheduling", settings?.moduleScheduling ?: false, Icons.Default.CalendarMonth),
                Triple("Documents", settings?.moduleDocuments ?: true, Icons.Default.Description),
                Triple("Safety", settings?.moduleSafety ?: false, Icons.Default.HealthAndSafety),
                Triple("Financials", settings?.moduleFinancials ?: false, Icons.Default.AttachMoney),
                Triple("Reports", settings?.moduleReports ?: true, Icons.Default.Assessment),
                Triple("Analytics", settings?.moduleAnalytics ?: true, Icons.Default.Analytics),
                Triple("Subcontractors", settings?.moduleSubcontractors ?: false, Icons.Default.Business),
                Triple("Certifications", settings?.moduleCertifications ?: false, Icons.Default.VerifiedUser),
                Triple("Approvals", settings?.moduleApprovals ?: false, Icons.Default.Checklist),
                Triple("Warnings", settings?.moduleWarnings ?: false, Icons.Default.Warning)
            )

            for ((name, enabled, icon) in modules) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = icon,
                            contentDescription = null,
                            tint = if (enabled) Primary600 else AppColors.textSecondary.copy(alpha = 0.5f),
                            modifier = Modifier.size(AppSpacing.iconMedium)
                        )
                        Text(
                            text = name,
                            style = AppTypography.body,
                            color = if (enabled) AppColors.textPrimary else AppColors.textSecondary.copy(alpha = 0.5f)
                        )
                    }
                    if (enabled) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "Enabled",
                            tint = ConstructionGreen,
                            modifier = Modifier.size(AppSpacing.iconMedium)
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Default.Cancel,
                            contentDescription = "Disabled",
                            tint = AppColors.textSecondary.copy(alpha = 0.3f),
                            modifier = Modifier.size(AppSpacing.iconMedium)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun WorkflowSettingsCard(
    settings: CompanySettings?,
    onSettingsChange: (String, Boolean) -> Unit = { _, _ -> }
) {
    var localSettings by remember(settings) {
        mutableStateOf(
            mapOf(
                "dailyLogApprovalRequired" to (settings?.dailyLogApprovalRequired ?: false),
                "requireGpsClockIn" to (settings?.requireGpsClockIn ?: false),
                "requirePhotoDaily" to (settings?.requirePhotoDaily ?: false),
                "autoApproveTimesheet" to (settings?.autoApproveTimesheet ?: false),
                "dailyLogReminders" to (settings?.dailyLogReminders ?: false),
                "emailNotifications" to (settings?.emailNotifications ?: true),
                "pushNotifications" to (settings?.pushNotifications ?: true),
                "hideBuildingInfo" to (settings?.hideBuildingInfo ?: false)
            )
        )
    }

    CPCard {
        Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
            val workflowSettings = listOf(
                Triple("Daily Log Approval Required", "dailyLogApprovalRequired", Icons.Default.Approval),
                Triple("Require GPS for Clock-In", "requireGpsClockIn", Icons.Default.LocationOn),
                Triple("Require Daily Photo", "requirePhotoDaily", Icons.Default.PhotoCamera),
                Triple("Auto-Approve Timesheets", "autoApproveTimesheet", Icons.Default.Timer),
                Triple("Daily Log Reminders", "dailyLogReminders", Icons.Default.Notifications),
                Triple("Email Notifications", "emailNotifications", Icons.Default.Email),
                Triple("Push Notifications", "pushNotifications", Icons.Default.NotificationsActive),
                Triple("Hide Building/Location Info", "hideBuildingInfo", Icons.Default.LocationOff)
            )

            for ((displayName, key, icon) in workflowSettings) {
                val enabled = localSettings[key] ?: false
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm),
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(
                            imageVector = icon,
                            contentDescription = null,
                            tint = AppColors.textSecondary,
                            modifier = Modifier.size(AppSpacing.iconMedium)
                        )
                        Text(
                            text = displayName,
                            style = AppTypography.body
                        )
                    }
                    Switch(
                        checked = enabled,
                        onCheckedChange = { newValue ->
                            localSettings = localSettings + (key to newValue)
                            onSettingsChange(key, newValue)
                        },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color.White,
                            checkedTrackColor = Primary600
                        )
                    )
                }
            }

            settings?.certExpiryAlertDays?.let { days ->
                HorizontalDivider()
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Certification Expiry Alert",
                        style = AppTypography.body
                    )
                    Text(
                        text = "$days days before",
                        style = AppTypography.bodyMedium,
                        color = Primary600
                    )
                }
            }

            settings?.maxFileUploadMB?.let { maxMB ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Max File Upload Size",
                        style = AppTypography.body
                    )
                    Text(
                        text = "$maxMB MB",
                        style = AppTypography.bodyMedium,
                        color = Primary600
                    )
                }
            }
        }
    }
}
