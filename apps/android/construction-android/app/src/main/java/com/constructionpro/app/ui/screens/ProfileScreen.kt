package com.constructionpro.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.constructionpro.app.R
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.model.UserProfile
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class ProfileState(
    val loading: Boolean = false,
    val user: UserProfile? = null,
    val error: String? = null,
    val successMessage: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    apiService: ApiService,
    onLogout: () -> Unit,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(ProfileState(loading = true)) }
    var showEditProfileDialog by remember { mutableStateOf(false) }
    var showChangePasswordDialog by remember { mutableStateOf(false) }
    var showNotificationSettings by remember { mutableStateOf(false) }

    // Localized strings for use in callbacks
    val loadFailedMsg = stringResource(R.string.profile_load_failed)
    val profileApiPendingMsg = stringResource(R.string.profile_api_pending)
    val passwordApiPendingMsg = stringResource(R.string.profile_password_api_pending)
    val notifSavedMsg = stringResource(R.string.profile_notif_saved)

    fun loadProfile() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val response = withContext(Dispatchers.IO) { apiService.getProfile() }
                state = state.copy(loading = false, user = response)
            } catch (error: Exception) {
                state = state.copy(loading = false, error = error.message ?: loadFailedMsg)
            }
        }
    }

    LaunchedEffect(Unit) {
        loadProfile()
    }

    // Edit Profile Dialog
    if (showEditProfileDialog) {
        state.user?.let { user ->
            EditProfileDialog(
                user = user,
                onDismiss = { showEditProfileDialog = false },
                onSave = { name, phone ->
                    // TODO: Implement API call when endpoint is available
                    showEditProfileDialog = false
                    state = state.copy(successMessage = profileApiPendingMsg)
                }
            )
        }
    }

    // Change Password Dialog
    if (showChangePasswordDialog) {
        ChangePasswordDialog(
            onDismiss = { showChangePasswordDialog = false },
            onSave = { currentPassword, newPassword ->
                // TODO: Implement API call when endpoint is available
                showChangePasswordDialog = false
                state = state.copy(successMessage = passwordApiPendingMsg)
            }
        )
    }

    // Notification Settings Bottom Sheet
    if (showNotificationSettings) {
        NotificationSettingsSheet(
            onDismiss = { showNotificationSettings = false },
            onSave = { emailNotifications, pushNotifications, dailyDigest ->
                // TODO: Implement API call when endpoint is available
                showNotificationSettings = false
                state = state.copy(successMessage = notifSavedMsg)
            }
        )
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.profile_title),
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
                    IconButton(onClick = { showEditProfileDialog = true }) {
                        Icon(
                            imageVector = Icons.Default.Edit,
                            contentDescription = stringResource(R.string.profile_edit),
                            tint = Primary600
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
                .verticalScroll(rememberScrollState())
        ) {
            // Error Banner
            if (state.error != null) {
                Box(modifier = Modifier.padding(AppSpacing.md)) {
                    CPErrorBanner(
                        message = state.error ?: stringResource(R.string.profile_error),
                        onRetry = { loadProfile() },
                        onDismiss = { state = state.copy(error = null) }
                    )
                }
            }

            // Success Message
            state.successMessage?.let { message ->
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(AppSpacing.md),
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
                                contentDescription = stringResource(R.string.common_dismiss),
                                modifier = Modifier.size(16.dp),
                                tint = ConstructionGreen
                            )
                        }
                    }
                }
            }

            // Loading State
            if (state.loading) {
                CPLoadingIndicator(message = stringResource(R.string.profile_loading))
            }

            // Profile Content
            state.user?.let { user ->
                // Avatar Section
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(AppColors.primary600)
                        .padding(AppSpacing.xxl),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(96.dp)
                            .clip(CircleShape)
                            .background(androidx.compose.ui.graphics.Color.White),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = user.name.split(" ")
                                .take(2)
                                .mapNotNull { it.firstOrNull()?.uppercaseChar() }
                                .joinToString(""),
                            style = AppTypography.heading1,
                            fontWeight = FontWeight.Bold,
                            color = AppColors.primary600
                        )
                    }

                    Spacer(modifier = Modifier.height(AppSpacing.md))

                    Text(
                        text = user.name,
                        style = AppTypography.heading2,
                        fontWeight = FontWeight.Bold,
                        color = androidx.compose.ui.graphics.Color.White
                    )

                    Spacer(modifier = Modifier.height(AppSpacing.xxs))

                    Text(
                        text = user.email,
                        style = AppTypography.body,
                        color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.8f)
                    )

                    user.role?.let { role ->
                        Spacer(modifier = Modifier.height(AppSpacing.sm))
                        Surface(
                            shape = RoundedCornerShape(50),
                            color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.2f)
                        ) {
                            Text(
                                text = formatRole(role),
                                modifier = Modifier.padding(horizontal = AppSpacing.md, vertical = 6.dp),
                                style = AppTypography.secondaryMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = androidx.compose.ui.graphics.Color.White
                            )
                        }
                    }
                }

                // Profile Details
                Column(
                    modifier = Modifier.padding(AppSpacing.md),
                    verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
                ) {
                    // Account Information
                    CPSectionHeader(title = stringResource(R.string.profile_account_info))

                    CPCard {
                        ProfileInfoRow(
                            icon = Icons.Default.Email,
                            label = stringResource(R.string.profile_email),
                            value = user.email
                        )

                        user.phone?.let { phone ->
                            CPDivider()
                            ProfileInfoRow(
                                icon = Icons.Default.Phone,
                                label = stringResource(R.string.profile_phone),
                                value = phone
                            )
                        }

                        user.status?.let { status ->
                            CPDivider()
                            ProfileInfoRow(
                                icon = Icons.Default.Circle,
                                label = stringResource(R.string.profile_status),
                                value = status.lowercase().replaceFirstChar { it.uppercase() },
                                valueColor = if (status == "ACTIVE") ConstructionGreen else AppColors.textSecondary
                            )
                        }

                        user.createdAt?.let { createdAt ->
                            CPDivider()
                            ProfileInfoRow(
                                icon = Icons.Default.CalendarToday,
                                label = stringResource(R.string.profile_member_since),
                                value = formatDate(createdAt)
                            )
                        }
                    }

                    // Quick Actions
                    CPSectionHeader(title = stringResource(R.string.profile_quick_actions))

                    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                        CPNavigationCard(
                            title = stringResource(R.string.profile_edit),
                            subtitle = stringResource(R.string.profile_update_name_contact),
                            icon = Icons.Default.Person,
                            onClick = { showEditProfileDialog = true },
                            iconBackgroundColor = AppColors.primary100,
                            iconColor = AppColors.primary600
                        )

                        CPNavigationCard(
                            title = stringResource(R.string.profile_change_password),
                            subtitle = stringResource(R.string.profile_update_password),
                            icon = Icons.Default.Lock,
                            onClick = { showChangePasswordDialog = true },
                            iconBackgroundColor = ConstructionOrange.copy(alpha = 0.15f),
                            iconColor = ConstructionOrange
                        )

                        CPNavigationCard(
                            title = stringResource(R.string.profile_notification_settings),
                            subtitle = stringResource(R.string.profile_manage_notifications),
                            icon = Icons.Default.Notifications,
                            onClick = { showNotificationSettings = true },
                            iconBackgroundColor = ConstructionGreen.copy(alpha = 0.15f),
                            iconColor = ConstructionGreen
                        )
                    }

                    // Security Section
                    CPSectionHeader(title = stringResource(R.string.profile_security))

                    CPCard {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = AppSpacing.xxs),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Security,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp),
                                tint = AppColors.textMuted
                            )
                            Spacer(modifier = Modifier.width(AppSpacing.sm))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = stringResource(R.string.profile_2fa),
                                    style = AppTypography.bodyLarge,
                                    fontWeight = FontWeight.Medium,
                                    color = AppColors.textPrimary
                                )
                                Text(
                                    text = stringResource(R.string.profile_2fa_desc),
                                    style = AppTypography.secondary,
                                    color = AppColors.textSecondary
                                )
                            }
                            CPBadge(
                                text = stringResource(R.string.profile_2fa_not_set),
                                color = AppColors.textSecondary,
                                backgroundColor = AppColors.gray100
                            )
                        }

                        CPDivider()

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = AppSpacing.xxs),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Devices,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp),
                                tint = AppColors.textMuted
                            )
                            Spacer(modifier = Modifier.width(AppSpacing.sm))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = stringResource(R.string.profile_active_sessions),
                                    style = AppTypography.bodyLarge,
                                    fontWeight = FontWeight.Medium,
                                    color = AppColors.textPrimary
                                )
                                Text(
                                    text = stringResource(R.string.profile_manage_devices),
                                    style = AppTypography.secondary,
                                    color = AppColors.textSecondary
                                )
                            }
                            Icon(
                                imageVector = Icons.Default.ChevronRight,
                                contentDescription = null,
                                tint = AppColors.textMuted
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(AppSpacing.md))

                    CPButton(
                        text = stringResource(R.string.profile_sign_out),
                        onClick = onLogout,
                        modifier = Modifier.fillMaxWidth(),
                        style = CPButtonStyle.Destructive,
                        icon = Icons.Default.Logout
                    )

                    Spacer(modifier = Modifier.height(AppSpacing.xxl))
                }
            }
        }
    }
}

@Composable
private fun ProfileInfoRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String,
    valueColor: androidx.compose.ui.graphics.Color = AppColors.textPrimary
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = AppSpacing.xxs),
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
                color = valueColor
            )
        }
    }
}

@Composable
private fun EditProfileDialog(
    user: UserProfile,
    onDismiss: () -> Unit,
    onSave: (name: String, phone: String?) -> Unit
) {
    var name by remember { mutableStateOf(user.name) }
    var phone by remember { mutableStateOf(user.phone ?: "") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = stringResource(R.string.profile_edit),
                style = AppTypography.heading2,
                fontWeight = FontWeight.SemiBold
            )
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.md)) {
                CPTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = stringResource(R.string.profile_full_name),
                    placeholder = stringResource(R.string.profile_enter_name),
                    leadingIcon = Icons.Default.Person
                )

                CPTextField(
                    value = phone,
                    onValueChange = { phone = it },
                    label = stringResource(R.string.profile_phone_number),
                    placeholder = stringResource(R.string.profile_phone_placeholder),
                    leadingIcon = Icons.Default.Phone,
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Phone
                )

                // Email note
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(AppSpacing.xs),
                    color = AppColors.gray100
                ) {
                    Row(
                        modifier = Modifier.padding(AppSpacing.sm),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Info,
                            contentDescription = null,
                            tint = AppColors.textSecondary,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.xs))
                        Text(
                            text = stringResource(R.string.profile_email_note),
                            style = AppTypography.secondary,
                            color = AppColors.textSecondary
                        )
                    }
                }
            }
        },
        confirmButton = {
            CPButton(
                text = stringResource(R.string.profile_save_changes),
                onClick = { onSave(name, phone.takeIf { it.isNotBlank() }) },
                enabled = name.isNotBlank(),
                size = CPButtonSize.Small,
                icon = Icons.Default.Save
            )
        },
        dismissButton = {
            CPButton(
                text = stringResource(R.string.common_cancel),
                onClick = onDismiss,
                style = CPButtonStyle.Outline,
                size = CPButtonSize.Small
            )
        },
        shape = RoundedCornerShape(AppSpacing.md)
    )
}

@Composable
private fun ChangePasswordDialog(
    onDismiss: () -> Unit,
    onSave: (currentPassword: String, newPassword: String) -> Unit
) {
    var currentPassword by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var showCurrentPassword by remember { mutableStateOf(false) }
    var showNewPassword by remember { mutableStateOf(false) }
    var passwordError by remember { mutableStateOf<String?>(null) }

    val passwordsNoMatchMsg = stringResource(R.string.profile_passwords_no_match)
    val passwordShortMsg = stringResource(R.string.profile_password_short)

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = stringResource(R.string.profile_change_password),
                style = AppTypography.heading2,
                fontWeight = FontWeight.SemiBold
            )
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.md)) {
                CPTextField(
                    value = currentPassword,
                    onValueChange = { currentPassword = it },
                    label = stringResource(R.string.profile_current_password),
                    placeholder = stringResource(R.string.profile_enter_current),
                    leadingIcon = Icons.Default.Lock,
                    isPassword = !showCurrentPassword,
                    trailingIcon = {
                        IconButton(onClick = { showCurrentPassword = !showCurrentPassword }) {
                            Icon(
                                imageVector = if (showCurrentPassword) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                contentDescription = stringResource(R.string.profile_toggle_password),
                                tint = AppColors.textSecondary
                            )
                        }
                    }
                )

                CPTextField(
                    value = newPassword,
                    onValueChange = {
                        newPassword = it
                        passwordError = null
                    },
                    label = stringResource(R.string.profile_new_password),
                    placeholder = stringResource(R.string.profile_enter_new),
                    leadingIcon = Icons.Default.LockOpen,
                    isPassword = !showNewPassword,
                    trailingIcon = {
                        IconButton(onClick = { showNewPassword = !showNewPassword }) {
                            Icon(
                                imageVector = if (showNewPassword) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                contentDescription = stringResource(R.string.profile_toggle_password),
                                tint = AppColors.textSecondary
                            )
                        }
                    },
                    helperText = stringResource(R.string.profile_password_min)
                )

                CPTextField(
                    value = confirmPassword,
                    onValueChange = {
                        confirmPassword = it
                        passwordError = if (it != newPassword && it.isNotEmpty()) passwordsNoMatchMsg else null
                    },
                    label = stringResource(R.string.profile_confirm_password),
                    placeholder = stringResource(R.string.profile_reenter_password),
                    leadingIcon = Icons.Default.LockOpen,
                    isPassword = true,
                    isError = passwordError != null,
                    errorMessage = passwordError
                )

                // Password requirements
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(AppSpacing.xs),
                    color = AppColors.primary50
                ) {
                    Column(modifier = Modifier.padding(AppSpacing.sm)) {
                        Text(
                            text = stringResource(R.string.profile_password_requirements),
                            style = AppTypography.secondaryMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = AppColors.primary700
                        )
                        Spacer(modifier = Modifier.height(AppSpacing.xxs))
                        PasswordRequirement(stringResource(R.string.profile_req_length), newPassword.length >= 8)
                        PasswordRequirement(stringResource(R.string.profile_req_number), newPassword.any { it.isDigit() })
                        PasswordRequirement(stringResource(R.string.profile_req_uppercase), newPassword.any { it.isUpperCase() })
                    }
                }
            }
        },
        confirmButton = {
            CPButton(
                text = stringResource(R.string.profile_update_password_btn),
                onClick = {
                    if (newPassword != confirmPassword) {
                        passwordError = passwordsNoMatchMsg
                    } else if (newPassword.length < 8) {
                        passwordError = passwordShortMsg
                    } else {
                        onSave(currentPassword, newPassword)
                    }
                },
                enabled = currentPassword.isNotBlank() && newPassword.isNotBlank() && confirmPassword.isNotBlank() && passwordError == null,
                size = CPButtonSize.Small,
                icon = Icons.Default.Lock
            )
        },
        dismissButton = {
            CPButton(
                text = stringResource(R.string.common_cancel),
                onClick = onDismiss,
                style = CPButtonStyle.Outline,
                size = CPButtonSize.Small
            )
        },
        shape = RoundedCornerShape(AppSpacing.md)
    )
}

@Composable
private fun PasswordRequirement(text: String, isMet: Boolean) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.padding(vertical = 2.dp)
    ) {
        Icon(
            imageVector = if (isMet) Icons.Default.Check else Icons.Default.Close,
            contentDescription = null,
            modifier = Modifier.size(14.dp),
            tint = if (isMet) ConstructionGreen else AppColors.textMuted
        )
        Spacer(modifier = Modifier.width(AppSpacing.xs))
        Text(
            text = text,
            style = AppTypography.secondary,
            color = if (isMet) ConstructionGreen else AppColors.textSecondary
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NotificationSettingsSheet(
    onDismiss: () -> Unit,
    onSave: (emailNotifications: Boolean, pushNotifications: Boolean, dailyDigest: Boolean) -> Unit
) {
    var emailNotifications by remember { mutableStateOf(true) }
    var pushNotifications by remember { mutableStateOf(true) }
    var dailyDigest by remember { mutableStateOf(false) }
    var projectUpdates by remember { mutableStateOf(true) }
    var taskAssignments by remember { mutableStateOf(true) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        shape = RoundedCornerShape(topStart = AppSpacing.md, topEnd = AppSpacing.md)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(AppSpacing.md)
        ) {
            Text(
                text = stringResource(R.string.profile_notification_settings),
                style = AppTypography.heading2,
                fontWeight = FontWeight.Bold,
                color = AppColors.textPrimary
            )

            Spacer(modifier = Modifier.height(AppSpacing.xl))

            // General Settings
            Text(
                text = stringResource(R.string.profile_notif_general),
                style = AppTypography.caption,
                color = AppColors.textSecondary,
                fontWeight = FontWeight.SemiBold
            )

            Spacer(modifier = Modifier.height(AppSpacing.xs))

            NotificationToggle(
                title = stringResource(R.string.profile_notif_email),
                description = stringResource(R.string.profile_notif_email_desc),
                icon = Icons.Default.Email,
                checked = emailNotifications,
                onCheckedChange = { emailNotifications = it }
            )

            NotificationToggle(
                title = stringResource(R.string.profile_notif_push),
                description = stringResource(R.string.profile_notif_push_desc),
                icon = Icons.Default.Notifications,
                checked = pushNotifications,
                onCheckedChange = { pushNotifications = it }
            )

            NotificationToggle(
                title = stringResource(R.string.profile_notif_daily),
                description = stringResource(R.string.profile_notif_daily_desc),
                icon = Icons.Default.Summarize,
                checked = dailyDigest,
                onCheckedChange = { dailyDigest = it }
            )

            Spacer(modifier = Modifier.height(AppSpacing.md))

            // Activity Notifications
            Text(
                text = stringResource(R.string.profile_notif_activity),
                style = AppTypography.caption,
                color = AppColors.textSecondary,
                fontWeight = FontWeight.SemiBold
            )

            Spacer(modifier = Modifier.height(AppSpacing.xs))

            NotificationToggle(
                title = stringResource(R.string.profile_notif_project),
                description = stringResource(R.string.profile_notif_project_desc),
                icon = Icons.Default.Folder,
                checked = projectUpdates,
                onCheckedChange = { projectUpdates = it }
            )

            NotificationToggle(
                title = stringResource(R.string.profile_notif_task),
                description = stringResource(R.string.profile_notif_task_desc),
                icon = Icons.Default.Assignment,
                checked = taskAssignments,
                onCheckedChange = { taskAssignments = it }
            )

            Spacer(modifier = Modifier.height(AppSpacing.xl))

            CPButton(
                text = stringResource(R.string.profile_save_preferences),
                onClick = { onSave(emailNotifications, pushNotifications, dailyDigest) },
                modifier = Modifier.fillMaxWidth(),
                icon = Icons.Default.Save
            )

            Spacer(modifier = Modifier.height(AppSpacing.xxl))
        }
    }
}

@Composable
private fun NotificationToggle(
    title: String,
    description: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = AppSpacing.sm),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(AppSpacing.xl),
            tint = AppColors.textSecondary
        )
        Spacer(modifier = Modifier.width(AppSpacing.sm))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = AppTypography.bodyLarge,
                fontWeight = FontWeight.Medium,
                color = AppColors.textPrimary
            )
            Text(
                text = description,
                style = AppTypography.secondary,
                color = AppColors.textSecondary
            )
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = androidx.compose.ui.graphics.Color.White,
                checkedTrackColor = AppColors.primary600,
                uncheckedThumbColor = AppColors.textMuted,
                uncheckedTrackColor = AppColors.divider
            )
        )
    }
}

private fun formatRole(role: String): String {
    return when (role) {
        "ADMIN" -> "Admin"
        "PROJECT_MANAGER" -> "Project Manager"
        "SUPERINTENDENT" -> "Superintendent"
        "FOREMAN" -> "Foreman"
        "WORKER" -> "Worker"
        "VIEWER" -> "Viewer"
        else -> role.replace("_", " ").lowercase().split(" ")
            .joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } }
    }
}

private fun formatDate(dateString: String): String {
    return try {
        val parts = dateString.take(10).split("-")
        if (parts.size == 3) {
            val months = listOf("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
            val month = parts[1].toIntOrNull()?.let { months.getOrNull(it - 1) } ?: parts[1]
            "$month ${parts[2]}, ${parts[0]}"
        } else {
            dateString.take(10)
        }
    } catch (e: Exception) {
        dateString.take(10)
    }
}
