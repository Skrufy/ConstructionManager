package com.constructionpro.app.ui.screens

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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.constructionpro.app.R
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.model.*
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import com.constructionpro.app.ui.util.TimeUtils
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class UserDetailState(
    val loading: Boolean = false,
    val user: UserDetail? = null,
    val error: String? = null,
    val isEditing: Boolean = false,
    val saving: Boolean = false,
    val showDeleteConfirm: Boolean = false,
    val showResetPasswordConfirm: Boolean = false,
    val actionSuccess: String? = null
)

private data class UserEditForm(
    val name: String = "",
    val email: String = "",
    val phone: String = "",
    val role: String = UserRole.FIELD_WORKER,
    val status: String = UserStatus.ACTIVE,
    val isBlaster: Boolean = false,
    val jobTitle: String = "",
    val department: String = "",
    val employeeId: String = ""
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UserDetailScreen(
    apiService: ApiService,
    userId: String,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(UserDetailState(loading = true)) }
    var editForm by remember { mutableStateOf(UserEditForm()) }
    val configuration = LocalConfiguration.current
    val isNarrow = configuration.screenWidthDp < 360

    fun loadUser() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val user = withContext(Dispatchers.IO) {
                    apiService.getAdminUserDetail(userId)
                }
                state = state.copy(loading = false, user = user)
                // Populate edit form
                editForm = UserEditForm(
                    name = user.name,
                    email = user.email,
                    phone = user.phone ?: "",
                    role = user.role,
                    status = user.status,
                    isBlaster = user.isBlaster,
                    jobTitle = user.jobTitle ?: "",
                    department = user.department ?: "",
                    employeeId = user.employeeId ?: ""
                )
            } catch (e: Exception) {
                state = state.copy(loading = false, error = e.message ?: "Failed to load user")
            }
        }
    }

    fun saveUser() {
        scope.launch {
            state = state.copy(saving = true, error = null)
            try {
                val request = UpdateUserRequest(
                    name = editForm.name.ifBlank { null },
                    email = editForm.email.ifBlank { null },
                    phone = editForm.phone.ifBlank { null },
                    role = editForm.role,
                    status = editForm.status,
                    isBlaster = editForm.isBlaster,
                    jobTitle = editForm.jobTitle.ifBlank { null },
                    department = editForm.department.ifBlank { null },
                    employeeId = editForm.employeeId.ifBlank { null }
                )
                val updatedUser = withContext(Dispatchers.IO) {
                    apiService.updateUser(userId, request)
                }
                state = state.copy(
                    saving = false,
                    user = updatedUser,
                    isEditing = false,
                    actionSuccess = "User updated successfully"
                )
            } catch (e: Exception) {
                state = state.copy(
                    saving = false,
                    error = e.message ?: "Failed to update user"
                )
            }
        }
    }

    fun resetPassword() {
        scope.launch {
            try {
                withContext(Dispatchers.IO) {
                    apiService.resetUserPassword(userId)
                }
                state = state.copy(
                    showResetPasswordConfirm = false,
                    actionSuccess = "Password reset email sent"
                )
            } catch (e: Exception) {
                state = state.copy(
                    showResetPasswordConfirm = false,
                    error = e.message ?: "Failed to reset password"
                )
            }
        }
    }

    fun deleteUser() {
        scope.launch {
            try {
                withContext(Dispatchers.IO) {
                    apiService.deleteUser(userId)
                }
                onBack()
            } catch (e: Exception) {
                state = state.copy(
                    showDeleteConfirm = false,
                    error = e.message ?: "Failed to delete user"
                )
            }
        }
    }

    LaunchedEffect(Unit) {
        loadUser()
    }

    // Success snackbar auto-dismiss
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
                title = if (state.isEditing) "Edit User" else stringResource(R.string.users_details),
                navigationIcon = {
                    IconButton(
                        onClick = {
                            if (state.isEditing) {
                                state = state.copy(isEditing = false)
                                // Reset form to original values
                                state.user?.let { user ->
                                    editForm = UserEditForm(
                                        name = user.name,
                                        email = user.email,
                                        phone = user.phone ?: "",
                                        role = user.role,
                                        status = user.status,
                                        isBlaster = user.isBlaster,
                                        jobTitle = user.jobTitle ?: "",
                                        department = user.department ?: "",
                                        employeeId = user.employeeId ?: ""
                                    )
                                }
                            } else {
                                onBack()
                            }
                        },
                        modifier = Modifier.size(56.dp) // Field worker touch target
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.common_back)
                        )
                    }
                },
                actions = {
                    if (!state.isEditing && state.user != null) {
                        IconButton(
                            onClick = { state = state.copy(isEditing = true) },
                            modifier = Modifier.size(56.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Edit,
                                contentDescription = "Edit"
                            )
                        }
                    }
                }
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when {
                state.loading -> {
                    CPLoadingIndicator(message = stringResource(R.string.users_loading))
                }
                state.error != null && state.user == null -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(AppSpacing.md)
                    ) {
                        CPErrorBanner(
                            message = state.error ?: "An error occurred",
                            onRetry = { loadUser() },
                            onDismiss = { state = state.copy(error = null) }
                        )
                    }
                }
                state.user != null -> {
                    if (state.isEditing) {
                        UserEditContent(
                            form = editForm,
                            onFormChange = { editForm = it },
                            onSave = { saveUser() },
                            saving = state.saving,
                            error = state.error,
                            onDismissError = { state = state.copy(error = null) },
                            isNarrow = isNarrow
                        )
                    } else {
                        UserViewContent(
                            user = state.user!!,
                            onEdit = { state = state.copy(isEditing = true) },
                            onResetPassword = { state = state.copy(showResetPasswordConfirm = true) },
                            onDelete = { state = state.copy(showDeleteConfirm = true) },
                            isNarrow = isNarrow
                        )
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
                    shadowElevation = 4.dp
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
                            style = AppTypography.body,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }
        }
    }

    // Delete Confirmation Dialog
    if (state.showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { state = state.copy(showDeleteConfirm = false) },
            icon = {
                Icon(
                    imageVector = Icons.Default.Warning,
                    contentDescription = null,
                    tint = ConstructionRed
                )
            },
            title = { Text("Delete User?") },
            text = {
                Text("Are you sure you want to delete '${state.user?.name}'? This action cannot be undone and will remove all associated data.")
            },
            confirmButton = {
                Button(
                    onClick = { deleteUser() },
                    colors = ButtonDefaults.buttonColors(containerColor = ConstructionRed),
                    modifier = Modifier.defaultMinSize(minHeight = 56.dp)
                ) {
                    Text("Delete")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { state = state.copy(showDeleteConfirm = false) },
                    modifier = Modifier.defaultMinSize(minHeight = 56.dp)
                ) {
                    Text(stringResource(R.string.common_cancel))
                }
            }
        )
    }

    // Reset Password Confirmation Dialog
    if (state.showResetPasswordConfirm) {
        AlertDialog(
            onDismissRequest = { state = state.copy(showResetPasswordConfirm = false) },
            icon = {
                Icon(
                    imageVector = Icons.Default.LockReset,
                    contentDescription = null,
                    tint = Primary600
                )
            },
            title = { Text("Reset Password?") },
            text = {
                Text("A password reset email will be sent to '${state.user?.email}'. The user will need to set a new password to continue using their account.")
            },
            confirmButton = {
                Button(
                    onClick = { resetPassword() },
                    modifier = Modifier.defaultMinSize(minHeight = 56.dp)
                ) {
                    Text("Send Reset Email")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { state = state.copy(showResetPasswordConfirm = false) },
                    modifier = Modifier.defaultMinSize(minHeight = 56.dp)
                ) {
                    Text(stringResource(R.string.common_cancel))
                }
            }
        )
    }
}

@Composable
private fun UserViewContent(
    user: UserDetail,
    onEdit: () -> Unit,
    onResetPassword: () -> Unit,
    onDelete: () -> Unit,
    isNarrow: Boolean
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(AppSpacing.md),
        verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
    ) {
        // Profile Header Card
        item {
            CPCard {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    CPAvatar(
                        name = user.name,
                        size = 80.dp,
                        backgroundColor = Primary600
                    )

                    Spacer(modifier = Modifier.height(AppSpacing.md))

                    Text(
                        text = user.name,
                        style = AppTypography.heading2,
                        fontWeight = FontWeight.Bold
                    )

                    Text(
                        text = user.email,
                        style = AppTypography.body,
                        color = AppColors.textSecondary
                    )

                    Spacer(modifier = Modifier.height(AppSpacing.sm))

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                    ) {
                        // Role Badge
                        Surface(
                            shape = RoundedCornerShape(AppSpacing.xxs),
                            color = Primary100
                        ) {
                            Text(
                                text = UserRole.displayName(user.role),
                                style = AppTypography.secondaryMedium,
                                color = Primary600,
                                fontWeight = FontWeight.Medium,
                                modifier = Modifier.padding(horizontal = AppSpacing.xs, vertical = AppSpacing.xxs)
                            )
                        }

                        // Status Badge
                        val statusColor = when (user.status) {
                            UserStatus.ACTIVE -> ConstructionGreen
                            UserStatus.INACTIVE -> AppColors.textSecondary
                            UserStatus.PENDING -> ConstructionOrange
                            UserStatus.SUSPENDED -> ConstructionRed
                            else -> AppColors.textSecondary
                        }
                        Surface(
                            shape = RoundedCornerShape(AppSpacing.xxs),
                            color = statusColor.copy(alpha = 0.1f)
                        ) {
                            Text(
                                text = UserStatus.displayName(user.status),
                                style = AppTypography.secondaryMedium,
                                color = statusColor,
                                fontWeight = FontWeight.Medium,
                                modifier = Modifier.padding(horizontal = AppSpacing.xs, vertical = AppSpacing.xxs)
                            )
                        }

                        // Blaster Badge
                        if (user.isBlaster) {
                            Surface(
                                shape = RoundedCornerShape(AppSpacing.xxs),
                                color = ConstructionOrange.copy(alpha = 0.1f)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = AppSpacing.xs, vertical = AppSpacing.xxs),
                                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.xxs),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.LocalFireDepartment,
                                        contentDescription = null,
                                        tint = ConstructionOrange,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Text(
                                        text = "Blaster",
                                        style = AppTypography.secondaryMedium,
                                        color = ConstructionOrange,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // Contact & Work Info
        item {
            CPSectionHeader(title = stringResource(R.string.users_contact_info))
        }

        item {
            CPCard {
                Column(
                    verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
                ) {
                    user.phone?.let { phone ->
                        InfoRow(
                            icon = Icons.Default.Phone,
                            label = "Phone",
                            value = phone
                        )
                    }

                    user.jobTitle?.let { title ->
                        InfoRow(
                            icon = Icons.Default.Work,
                            label = "Job Title",
                            value = title
                        )
                    }

                    user.department?.let { dept ->
                        InfoRow(
                            icon = Icons.Default.Business,
                            label = "Department",
                            value = dept
                        )
                    }

                    user.employeeId?.let { empId ->
                        InfoRow(
                            icon = Icons.Default.Badge,
                            label = "Employee ID",
                            value = empId
                        )
                    }

                    user.teamName?.let { team ->
                        InfoRow(
                            icon = Icons.Default.Groups,
                            label = "Team",
                            value = team
                        )
                    }

                    user.hireDate?.let { date ->
                        InfoRow(
                            icon = Icons.Default.CalendarMonth,
                            label = "Hire Date",
                            value = date.substringBefore("T")
                        )
                    }

                    user.lastLoginAt?.let { login ->
                        InfoRow(
                            icon = Icons.Default.Login,
                            label = "Last Login",
                            value = formatDateTime(login)
                        )
                    }

                    user.createdAt?.let { created ->
                        InfoRow(
                            icon = Icons.Default.Schedule,
                            label = "Created",
                            value = created.substringBefore("T")
                        )
                    }
                }
            }
        }

        // Actions Section
        item {
            CPSectionHeader(title = "Actions")
        }

        item {
            Column(
                verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)
            ) {
                CPButton(
                    text = "Edit User",
                    onClick = onEdit,
                    icon = Icons.Default.Edit,
                    size = CPButtonSize.Large,
                    modifier = Modifier.fillMaxWidth()
                )

                CPButton(
                    text = "Reset Password",
                    onClick = onResetPassword,
                    icon = Icons.Default.LockReset,
                    style = CPButtonStyle.Outline,
                    size = CPButtonSize.Large,
                    modifier = Modifier.fillMaxWidth()
                )

                CPButton(
                    text = "Delete User",
                    onClick = onDelete,
                    icon = Icons.Default.Delete,
                    style = CPButtonStyle.Destructive,
                    size = CPButtonSize.Large,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        // Bottom spacing
        item {
            Spacer(modifier = Modifier.height(AppSpacing.xxl))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun UserEditContent(
    form: UserEditForm,
    onFormChange: (UserEditForm) -> Unit,
    onSave: () -> Unit,
    saving: Boolean,
    error: String?,
    onDismissError: () -> Unit,
    isNarrow: Boolean
) {
    Column(
        modifier = Modifier
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
                    text = "Basic Information",
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold
                )

                OutlinedTextField(
                    value = form.name,
                    onValueChange = { onFormChange(form.copy(name = it)) },
                    label = { Text("Full Name *") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    leadingIcon = {
                        Icon(Icons.Default.Person, contentDescription = null)
                    },
                    enabled = !saving
                )

                OutlinedTextField(
                    value = form.email,
                    onValueChange = { onFormChange(form.copy(email = it)) },
                    label = { Text("Email Address *") },
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
                    label = { Text("Phone Number") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    leadingIcon = {
                        Icon(Icons.Default.Phone, contentDescription = null)
                    },
                    enabled = !saving
                )
            }
        }

        // Role & Status Card
        CPCard {
            Column(
                verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
            ) {
                Text(
                    text = "Role & Status",
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold
                )

                // Role Dropdown
                var roleExpanded by remember { mutableStateOf(false) }
                ExposedDropdownMenuBox(
                    expanded = roleExpanded,
                    onExpandedChange = { if (!saving) roleExpanded = it }
                ) {
                    OutlinedTextField(
                        value = UserRole.displayName(form.role),
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Role") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = roleExpanded) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor(),
                        enabled = !saving
                    )
                    ExposedDropdownMenu(
                        expanded = roleExpanded,
                        onDismissRequest = { roleExpanded = false }
                    ) {
                        for (role in UserRole.all) {
                            DropdownMenuItem(
                                text = {
                                    Column {
                                        Text(UserRole.displayName(role))
                                        Text(
                                            text = UserRole.description(role),
                                            style = AppTypography.secondary,
                                            color = AppColors.textSecondary
                                        )
                                    }
                                },
                                onClick = {
                                    onFormChange(form.copy(role = role))
                                    roleExpanded = false
                                },
                                modifier = Modifier.defaultMinSize(minHeight = 56.dp)
                            )
                        }
                    }
                }

                // Status Dropdown
                var statusExpanded by remember { mutableStateOf(false) }
                ExposedDropdownMenuBox(
                    expanded = statusExpanded,
                    onExpandedChange = { if (!saving) statusExpanded = it }
                ) {
                    OutlinedTextField(
                        value = UserStatus.displayName(form.status),
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Status") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = statusExpanded) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor(),
                        enabled = !saving
                    )
                    ExposedDropdownMenu(
                        expanded = statusExpanded,
                        onDismissRequest = { statusExpanded = false }
                    ) {
                        for (status in UserStatus.all) {
                            DropdownMenuItem(
                                text = { Text(UserStatus.displayName(status)) },
                                onClick = {
                                    onFormChange(form.copy(status = status))
                                    statusExpanded = false
                                },
                                modifier = Modifier.defaultMinSize(minHeight = 56.dp)
                            )
                        }
                    }
                }

                // Blaster Certification Toggle
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .defaultMinSize(minHeight = 56.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
                    ) {
                        Icon(
                            imageVector = Icons.Default.LocalFireDepartment,
                            contentDescription = null,
                            tint = if (form.isBlaster) ConstructionOrange else AppColors.textSecondary
                        )
                        Column {
                            Text(
                                text = "Blaster Certification",
                                style = AppTypography.body,
                                fontWeight = FontWeight.Medium,
                                color = AppColors.textPrimary
                            )
                            Text(
                                text = "Can be assigned to blasting documents",
                                style = AppTypography.secondary,
                                color = AppColors.textSecondary
                            )
                        }
                    }
                    Switch(
                        checked = form.isBlaster,
                        onCheckedChange = { onFormChange(form.copy(isBlaster = it)) },
                        enabled = !saving,
                        modifier = Modifier.defaultMinSize(minWidth = 56.dp, minHeight = 56.dp)
                    )
                }
            }
        }

        // Work Info Card
        CPCard {
            Column(
                verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
            ) {
                Text(
                    text = "Work Information",
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold
                )

                OutlinedTextField(
                    value = form.jobTitle,
                    onValueChange = { onFormChange(form.copy(jobTitle = it)) },
                    label = { Text("Job Title") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    leadingIcon = {
                        Icon(Icons.Default.Work, contentDescription = null)
                    },
                    enabled = !saving
                )

                OutlinedTextField(
                    value = form.department,
                    onValueChange = { onFormChange(form.copy(department = it)) },
                    label = { Text("Department") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    leadingIcon = {
                        Icon(Icons.Default.Business, contentDescription = null)
                    },
                    enabled = !saving
                )

                OutlinedTextField(
                    value = form.employeeId,
                    onValueChange = { onFormChange(form.copy(employeeId = it)) },
                    label = { Text("Employee ID") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    leadingIcon = {
                        Icon(Icons.Default.Badge, contentDescription = null)
                    },
                    enabled = !saving
                )
            }
        }

        // Save Button
        CPButton(
            text = if (saving) "Saving..." else stringResource(R.string.common_save),
            onClick = onSave,
            loading = saving,
            enabled = !saving && form.name.isNotBlank() && form.email.isNotBlank(),
            icon = Icons.Default.Save,
            size = CPButtonSize.Large,
            modifier = Modifier.fillMaxWidth()
        )

        // Bottom spacing
        Spacer(modifier = Modifier.height(AppSpacing.xxl))
    }
}

@Composable
private fun InfoRow(
    icon: ImageVector,
    label: String,
    value: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = AppColors.textSecondary,
            modifier = Modifier.size(AppSpacing.lg)
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
                style = AppTypography.body,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

private fun formatDateTime(timestamp: String): String {
    return try {
        val datePart = timestamp.substringBefore("T")
        val time12 = TimeUtils.format12Hour(timestamp)
        "$datePart $time12"
    } catch (_: Exception) {
        timestamp.substringBefore("T")
    }
}
