package com.constructionpro.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import com.constructionpro.app.data.model.CreateUserRequest
import com.constructionpro.app.data.model.UserSummary
import com.constructionpro.app.data.model.UserProfile
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class UsersState(
    val loading: Boolean = false,
    val users: List<UserSummary> = emptyList(),
    val error: String? = null,
    val selectedRole: String? = null,
    val profile: UserProfile? = null,
    val saving: Boolean = false,
    val successMessage: String? = null,
    val companyTemplates: List<com.constructionpro.app.data.model.PermissionTemplate> = emptyList()
)

private val AVAILABLE_ROLES = listOf(
    "All Roles" to null,
    "Admin" to "ADMIN",
    "Project Manager" to "PROJECT_MANAGER",
    "Superintendent" to "SUPERINTENDENT",
    "Field Worker" to "FIELD_WORKER",
    "Office" to "OFFICE",
    "Viewer" to "VIEWER"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UsersScreen(
    apiService: ApiService,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(UsersState(loading = true)) }
    var searchQuery by remember { mutableStateOf("") }
    var showRoleFilter by remember { mutableStateOf(false) }
    var showAddUserDialog by remember { mutableStateOf(false) }
    var selectedUser by remember { mutableStateOf<UserSummary?>(null) }

    fun loadUsers(query: String = searchQuery, role: String? = state.selectedRole) {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val response = withContext(Dispatchers.IO) {
                    apiService.getUsers(
                        search = query.takeIf { it.isNotBlank() },
                        role = role
                    )
                }
                val profile = withContext(Dispatchers.IO) {
                    try { apiService.getProfile() } catch (_: Exception) { null }
                }
                // Load company templates for user creation
                val templates = if (profile?.role == "ADMIN") {
                    withContext(Dispatchers.IO) {
                        try {
                            apiService.getPermissionTemplates(scope = "company").companyTemplates
                        } catch (_: Exception) { emptyList() }
                    }
                } else emptyList()
                state = state.copy(
                    loading = false,
                    users = response,
                    profile = profile,
                    companyTemplates = templates
                )
            } catch (error: Exception) {
                state = state.copy(loading = false, error = error.message ?: "Failed to load users")
            }
        }
    }

    fun createUser(name: String, email: String, password: String, phone: String?, role: String, isBlaster: Boolean, companyTemplateId: String?) {
        scope.launch {
            state = state.copy(saving = true, error = null)
            try {
                val request = CreateUserRequest(
                    name = name,
                    email = email,
                    password = password,
                    phone = phone,
                    role = role,
                    status = "ACTIVE"
                )
                val createdUser = withContext(Dispatchers.IO) { apiService.createUser(request) }

                // Update isBlaster field if needed
                if (isBlaster) {
                    withContext(Dispatchers.IO) {
                        try {
                            apiService.updateUser(
                                createdUser.id,
                                com.constructionpro.app.data.model.UpdateUserRequest(isBlaster = true)
                            )
                        } catch (e: Exception) {
                            // Log but don't fail - user was created successfully
                            e.printStackTrace()
                        }
                    }
                }

                // Assign company template if selected
                if (companyTemplateId != null) {
                    withContext(Dispatchers.IO) {
                        try {
                            apiService.assignCompanyTemplate(
                                com.constructionpro.app.data.model.AssignCompanyTemplateRequest(
                                    userId = createdUser.id,
                                    companyTemplateId = companyTemplateId
                                )
                            )
                        } catch (e: Exception) {
                            // Log but don't fail - user was created successfully
                            e.printStackTrace()
                        }
                    }
                }

                state = state.copy(
                    saving = false,
                    successMessage = "User created successfully"
                )
                showAddUserDialog = false
                loadUsers() // Refresh the list
            } catch (error: Exception) {
                state = state.copy(
                    saving = false,
                    error = error.message ?: "Failed to create user"
                )
            }
        }
    }

    LaunchedEffect(Unit) {
        loadUsers(searchQuery)
    }

    LaunchedEffect(searchQuery) {
        delay(300)
        loadUsers(searchQuery)
    }

    // Role Filter Bottom Sheet
    if (showRoleFilter) {
        ModalBottomSheet(
            onDismissRequest = { showRoleFilter = false },
            shape = RoundedCornerShape(topStart = AppSpacing.md, topEnd = AppSpacing.md)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(AppSpacing.md)
            ) {
                Text(
                    text = "Filter by Role",
                    style = AppTypography.heading2,
                    fontWeight = FontWeight.Bold,
                    color = AppColors.textPrimary,
                    modifier = Modifier.padding(bottom = AppSpacing.md)
                )

                AVAILABLE_ROLES.forEach { (label, value) ->
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        onClick = {
                            state = state.copy(selectedRole = value)
                            loadUsers(searchQuery, value)
                            showRoleFilter = false
                        },
                        shape = RoundedCornerShape(AppSpacing.sm),
                        color = if (state.selectedRole == value) Primary50 else AppColors.cardBackground
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(AppSpacing.md),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = label,
                                style = AppTypography.bodyLarge,
                                color = if (state.selectedRole == value) Primary600 else AppColors.textPrimary,
                                fontWeight = if (state.selectedRole == value) FontWeight.SemiBold else FontWeight.Normal
                            )
                            if (state.selectedRole == value) {
                                Icon(
                                    imageVector = Icons.Default.Check,
                                    contentDescription = null,
                                    tint = Primary600
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(AppSpacing.xxl))
            }
        }
    }

    // Add/Edit User Dialog
    val isAdmin = state.profile?.role == "ADMIN"
    if (showAddUserDialog || selectedUser != null) {
        UserEditDialog(
            user = selectedUser,
            isAdmin = isAdmin,
            saving = state.saving,
            companyTemplates = state.companyTemplates,
            onDismiss = {
                showAddUserDialog = false
                selectedUser = null
            },
            onSave = { name, email, password, phone, role, isBlaster, companyTemplateId ->
                if (isAdmin && selectedUser == null) {
                    createUser(name, email, password, phone, role, isBlaster, companyTemplateId)
                } else if (selectedUser != null) {
                    // Viewing existing user - just close the dialog
                    showAddUserDialog = false
                    selectedUser = null
                } else {
                    state = state.copy(error = "Only administrators can create users")
                }
            }
        )
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.users_title),
                subtitle = "${state.users.size} users",
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
                    IconButton(onClick = { loadUsers() }) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Refresh",
                            tint = AppColors.textSecondary
                        )
                    }
                }
            )
        },
        floatingActionButton = {
            if (isAdmin) {
                FloatingActionButton(
                    onClick = { showAddUserDialog = true },
                    containerColor = Primary600,
                    contentColor = androidx.compose.ui.graphics.Color.White
                ) {
                    Icon(
                        imageVector = Icons.Default.PersonAdd,
                        contentDescription = stringResource(R.string.users_invite)
                    )
                }
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(AppSpacing.md),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            // Search Bar
            item {
                CPSearchBar(
                    query = searchQuery,
                    onQueryChange = { searchQuery = it },
                    placeholder = stringResource(R.string.users_search)
                )
            }

            // Role Filter Button
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                ) {
                    FilterChip(
                        selected = state.selectedRole != null,
                        onClick = { showRoleFilter = true },
                        label = {
                            Text(
                                text = AVAILABLE_ROLES.find { it.second == state.selectedRole }?.first ?: "All Roles"
                            )
                        },
                        leadingIcon = {
                            Icon(
                                imageVector = Icons.Default.FilterList,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                        },
                        trailingIcon = if (state.selectedRole != null) {
                            {
                                IconButton(
                                    onClick = {
                                        state = state.copy(selectedRole = null)
                                        loadUsers(searchQuery, null)
                                    },
                                    modifier = Modifier.size(18.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Close,
                                        contentDescription = "Clear filter",
                                        modifier = Modifier.size(14.dp)
                                    )
                                }
                            }
                        } else null,
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Primary100,
                            selectedLabelColor = Primary700,
                            selectedLeadingIconColor = Primary700
                        )
                    )
                }
            }

            // Error Banner
            if (state.error != null) {
                item {
                    CPErrorBanner(
                        message = state.error ?: "An error occurred",
                        onRetry = { loadUsers() },
                        onDismiss = { state = state.copy(error = null) }
                    )
                }
            }

            // Loading State
            if (state.loading && state.users.isEmpty()) {
                item {
                    CPLoadingIndicator(message = stringResource(R.string.users_loading))
                }
            }

            // Empty State
            if (!state.loading && state.users.isEmpty() && state.error == null) {
                item {
                    CPEmptyState(
                        icon = Icons.Default.People,
                        title = stringResource(R.string.users_empty_title),
                        description = stringResource(R.string.users_empty_desc),
                        actionText = stringResource(R.string.users_invite),
                        onAction = { showAddUserDialog = true }
                    )
                }
            }

            // User Cards
            items(state.users) { user ->
                UserCard(
                    user = user,
                    onClick = { selectedUser = user }
                )
            }

            // Bottom spacing for FAB
            item {
                Spacer(modifier = Modifier.height(72.dp))
            }
        }
    }
}

@Composable
private fun UserCard(
    user: UserSummary,
    onClick: () -> Unit
) {
    CPCard(onClick = onClick) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Avatar
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(Primary600),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = user.name.split(" ")
                        .take(2)
                        .mapNotNull { it.firstOrNull()?.uppercaseChar() }
                        .joinToString(""),
                    style = AppTypography.heading3,
                    color = androidx.compose.ui.graphics.Color.White,
                    fontWeight = FontWeight.SemiBold
                )
            }

            Spacer(modifier = Modifier.width(AppSpacing.md))

            // User Info
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = user.name,
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold,
                    color = AppColors.textPrimary
                )
                Text(
                    text = user.email ?: "",
                    style = AppTypography.body,
                    color = AppColors.textSecondary
                )
            }

            // Role Badge
            user.role?.let { role ->
                Column(horizontalAlignment = Alignment.End) {
                    CPBadge(
                        text = formatRole(role),
                        color = getRoleColor(role),
                        backgroundColor = getRoleBackgroundColor(role)
                    )
                    user.status?.let { status ->
                        Spacer(modifier = Modifier.height(AppSpacing.xxs))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(AppSpacing.xs)
                                    .clip(CircleShape)
                                    .background(
                                        if (status == "ACTIVE") ConstructionGreen else AppColors.textMuted
                                    )
                            )
                            Spacer(modifier = Modifier.width(AppSpacing.xxs))
                            Text(
                                text = status.lowercase().replaceFirstChar { it.uppercase() },
                                style = AppTypography.caption,
                                color = if (status == "ACTIVE") ConstructionGreen else AppColors.textSecondary
                            )
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun UserEditDialog(
    user: UserSummary?,
    isAdmin: Boolean,
    saving: Boolean,
    companyTemplates: List<com.constructionpro.app.data.model.PermissionTemplate>,
    onDismiss: () -> Unit,
    onSave: (name: String, email: String, password: String, phone: String?, role: String, isBlaster: Boolean, companyTemplateId: String?) -> Unit
) {
    var name by remember { mutableStateOf(user?.name ?: "") }
    var email by remember { mutableStateOf(user?.email ?: "") }
    var password by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf(user?.phone ?: "") }
    var selectedRole by remember { mutableStateOf(user?.role ?: "FIELD_WORKER") }
    var isBlaster by remember { mutableStateOf(false) }
    var selectedTemplateId by remember { mutableStateOf<String?>(null) }
    var showRoleDropdown by remember { mutableStateOf(false) }
    var showTemplateDropdown by remember { mutableStateOf(false) }
    var showPassword by remember { mutableStateOf(false) }

    // Password validation
    val passwordError = if (user == null && password.isNotEmpty()) {
        when {
            password.length < 8 -> "Password must be at least 8 characters"
            !password.any { it.isLowerCase() } -> "Must contain a lowercase letter"
            !password.any { it.isUpperCase() } -> "Must contain an uppercase letter"
            !password.any { it.isDigit() } -> "Must contain a number"
            else -> null
        }
    } else null

    val isFormValid = name.isNotBlank() && email.isNotBlank() &&
        (user != null || (password.isNotBlank() && passwordError == null))

    AlertDialog(
        onDismissRequest = { if (!saving) onDismiss() },
        title = {
            Text(
                text = if (user == null) "Add Team Member" else "Team Member Details",
                style = AppTypography.heading2,
                fontWeight = FontWeight.SemiBold
            )
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.md)) {
                CPTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = "Full Name",
                    placeholder = "John Doe",
                    leadingIcon = Icons.Default.Person,
                    enabled = user == null && isAdmin
                )

                CPTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = "Email Address",
                    placeholder = "john@example.com",
                    leadingIcon = Icons.Default.Email,
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Email,
                    enabled = user == null && isAdmin
                )

                // Password field (only for new users)
                if (user == null && isAdmin) {
                    Column {
                        OutlinedTextField(
                            value = password,
                            onValueChange = { password = it },
                            label = { Text("Password") },
                            placeholder = { Text("Min 8 chars, upper+lower+number") },
                            leadingIcon = {
                                Icon(
                                    imageVector = Icons.Default.Lock,
                                    contentDescription = null,
                                    tint = AppColors.textMuted
                                )
                            },
                            trailingIcon = {
                                IconButton(onClick = { showPassword = !showPassword }) {
                                    Icon(
                                        imageVector = if (showPassword) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                        contentDescription = if (showPassword) "Hide password" else "Show password",
                                        tint = AppColors.textMuted
                                    )
                                }
                            },
                            visualTransformation = if (showPassword)
                                androidx.compose.ui.text.input.VisualTransformation.None
                            else
                                androidx.compose.ui.text.input.PasswordVisualTransformation(),
                            isError = passwordError != null,
                            supportingText = if (passwordError != null) {
                                { Text(passwordError, color = ConstructionRed) }
                            } else null,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(AppSpacing.sm),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Primary600,
                                unfocusedBorderColor = AppColors.divider,
                                errorBorderColor = ConstructionRed
                            ),
                            singleLine = true
                        )
                    }
                }

                // Phone field
                CPTextField(
                    value = phone,
                    onValueChange = { phone = it },
                    label = "Phone Number (optional)",
                    placeholder = "(555) 123-4567",
                    leadingIcon = Icons.Default.Phone,
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Phone,
                    enabled = user == null && isAdmin
                )

                // Role Selector
                Column {
                    Text(
                        text = "Role",
                        style = AppTypography.label,
                        color = AppColors.textPrimary,
                        modifier = Modifier.padding(bottom = AppSpacing.xs)
                    )

                    ExposedDropdownMenuBox(
                        expanded = showRoleDropdown && user == null && isAdmin,
                        onExpandedChange = { if (user == null && isAdmin) showRoleDropdown = it }
                    ) {
                        OutlinedTextField(
                            value = formatRole(selectedRole),
                            onValueChange = {},
                            readOnly = true,
                            enabled = user == null && isAdmin,
                            trailingIcon = {
                                if (user == null && isAdmin) {
                                    ExposedDropdownMenuDefaults.TrailingIcon(expanded = showRoleDropdown)
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor(),
                            shape = RoundedCornerShape(AppSpacing.sm),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Primary600,
                                unfocusedBorderColor = AppColors.divider,
                                disabledBorderColor = AppColors.divider,
                                disabledTextColor = AppColors.textSecondary,
                                focusedContainerColor = AppColors.cardBackground,
                                unfocusedContainerColor = AppColors.cardBackground
                            )
                        )

                        ExposedDropdownMenu(
                            expanded = showRoleDropdown,
                            onDismissRequest = { showRoleDropdown = false }
                        ) {
                            AVAILABLE_ROLES.drop(1).forEach { (label, value) ->
                                DropdownMenuItem(
                                    text = { Text(label) },
                                    onClick = {
                                        selectedRole = value ?: "FIELD_WORKER"
                                        showRoleDropdown = false
                                    },
                                    leadingIcon = {
                                        if (selectedRole == value) {
                                            Icon(
                                                imageVector = Icons.Default.Check,
                                                contentDescription = null,
                                                tint = Primary600
                                            )
                                        }
                                    }
                                )
                            }
                        }
                    }
                }

                // Company Permission Template Selector (only for new users if templates available)
                if (user == null && isAdmin && companyTemplates.isNotEmpty()) {
                    Column {
                        Text(
                            text = "Company Permissions",
                            style = AppTypography.label,
                            color = AppColors.textPrimary,
                            modifier = Modifier.padding(bottom = AppSpacing.xs)
                        )

                        ExposedDropdownMenuBox(
                            expanded = showTemplateDropdown,
                            onExpandedChange = { showTemplateDropdown = it }
                        ) {
                            OutlinedTextField(
                                value = companyTemplates.find { it.id == selectedTemplateId }?.name
                                    ?: "Select permission template...",
                                onValueChange = {},
                                readOnly = true,
                                trailingIcon = {
                                    ExposedDropdownMenuDefaults.TrailingIcon(expanded = showTemplateDropdown)
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .menuAnchor(),
                                shape = RoundedCornerShape(AppSpacing.sm),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Primary600,
                                    unfocusedBorderColor = AppColors.divider,
                                    focusedContainerColor = AppColors.cardBackground,
                                    unfocusedContainerColor = AppColors.cardBackground
                                )
                            )

                            ExposedDropdownMenu(
                                expanded = showTemplateDropdown,
                                onDismissRequest = { showTemplateDropdown = false }
                            ) {
                                companyTemplates.forEach { template ->
                                    DropdownMenuItem(
                                        text = {
                                            Column {
                                                Text(
                                                    text = template.name,
                                                    style = AppTypography.body
                                                )
                                                template.description?.let { desc ->
                                                    Text(
                                                        text = desc,
                                                        style = AppTypography.secondary,
                                                        color = AppColors.textSecondary
                                                    )
                                                }
                                            }
                                        },
                                        onClick = {
                                            selectedTemplateId = template.id
                                            showTemplateDropdown = false
                                        },
                                        leadingIcon = {
                                            if (selectedTemplateId == template.id) {
                                                Icon(
                                                    imageVector = Icons.Default.Check,
                                                    contentDescription = null,
                                                    tint = Primary600
                                                )
                                            }
                                        }
                                    )
                                }
                            }
                        }

                        Text(
                            text = "Defines access to company-wide tools like user management and reports",
                            style = AppTypography.secondary,
                            color = AppColors.textSecondary,
                            modifier = Modifier.padding(top = AppSpacing.xxs)
                        )
                    }
                }

                // Special Certifications
                if (user == null && isAdmin) {
                    Column {
                        Text(
                            text = "Special Certifications",
                            style = AppTypography.bodyBold,
                            color = AppColors.textPrimary,
                            modifier = Modifier.padding(bottom = AppSpacing.sm)
                        )

                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(AppSpacing.sm),
                            color = ConstructionOrange.copy(alpha = 0.1f)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(AppSpacing.md),
                                verticalAlignment = Alignment.Top
                            ) {
                                Checkbox(
                                    checked = isBlaster,
                                    onCheckedChange = { isBlaster = it },
                                    colors = CheckboxDefaults.colors(
                                        checkedColor = ConstructionOrange,
                                        uncheckedColor = AppColors.textMuted
                                    )
                                )
                                Spacer(modifier = Modifier.width(AppSpacing.sm))
                                Column(modifier = Modifier.weight(1f)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            imageVector = Icons.Default.Engineering,
                                            contentDescription = null,
                                            tint = ConstructionOrange,
                                            modifier = Modifier.size(16.dp)
                                        )
                                        Spacer(modifier = Modifier.width(AppSpacing.xxs))
                                        Text(
                                            text = "Certified Blaster",
                                            style = AppTypography.bodyBold,
                                            color = AppColors.textPrimary
                                        )
                                    }
                                    Spacer(modifier = Modifier.height(AppSpacing.xxs))
                                    Text(
                                        text = "User can be assigned to blasting documents and will appear in the blaster dropdown on the documents page",
                                        style = AppTypography.caption,
                                        color = AppColors.textSecondary
                                    )
                                }
                            }
                        }
                    }
                }

                // Info Note
                if (user == null && isAdmin) {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(AppSpacing.xs),
                        color = Primary50
                    ) {
                        Row(
                            modifier = Modifier.padding(AppSpacing.sm),
                            verticalAlignment = Alignment.Top
                        ) {
                            Icon(
                                imageVector = Icons.Default.Info,
                                contentDescription = null,
                                tint = Primary600,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(AppSpacing.xs))
                            Text(
                                text = "User will be created with the specified password. Share the login credentials securely.",
                                style = AppTypography.secondary,
                                color = Primary700
                            )
                        }
                    }
                }

                // View-only notice for non-admins or when viewing existing user
                if (user != null || !isAdmin) {
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
                                imageVector = Icons.Default.Visibility,
                                contentDescription = null,
                                tint = AppColors.textSecondary,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(AppSpacing.xs))
                            Text(
                                text = if (!isAdmin) "Only administrators can edit users" else "Viewing user details",
                                style = AppTypography.secondary,
                                color = AppColors.textSecondary
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            if (user == null && isAdmin) {
                CPButton(
                    text = if (saving) "Creating..." else "Create User",
                    onClick = { onSave(name, email, password, phone.takeIf { it.isNotBlank() }, selectedRole, isBlaster, selectedTemplateId) },
                    enabled = isFormValid && !saving,
                    size = CPButtonSize.Small,
                    icon = Icons.Default.PersonAdd
                )
            } else {
                CPButton(
                    text = "Close",
                    onClick = onDismiss,
                    size = CPButtonSize.Small
                )
            }
        },
        dismissButton = {
            if (user == null && isAdmin) {
                CPButton(
                    text = "Cancel",
                    onClick = onDismiss,
                    style = CPButtonStyle.Outline,
                    size = CPButtonSize.Small,
                    enabled = !saving
                )
            }
        },
        shape = RoundedCornerShape(AppSpacing.md)
    )
}

private fun formatRole(role: String): String {
    return when (role) {
        "ADMIN" -> "Admin"
        "PROJECT_MANAGER" -> "Project Manager"
        "SUPERINTENDENT" -> "Superintendent"
        "FIELD_WORKER" -> "Field Worker"
        "OFFICE" -> "Office"
        "VIEWER" -> "Viewer"
        else -> role.replace("_", " ").lowercase().split(" ")
            .joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } }
    }
}

private fun getRoleColor(role: String): androidx.compose.ui.graphics.Color {
    return when (role) {
        "ADMIN" -> androidx.compose.ui.graphics.Color(0xFF7C3AED) // Purple
        "PROJECT_MANAGER" -> androidx.compose.ui.graphics.Color(0xFF2563EB) // Blue
        "SUPERINTENDENT" -> androidx.compose.ui.graphics.Color(0xFF059669) // Green
        "FIELD_WORKER" -> androidx.compose.ui.graphics.Color(0xFFD97706) // Orange
        "OFFICE" -> androidx.compose.ui.graphics.Color(0xFF0891B2) // Cyan
        "VIEWER" -> androidx.compose.ui.graphics.Color(0xFF6B7280) // Gray
        else -> androidx.compose.ui.graphics.Color(0xFF6B7280) // Gray fallback
    }
}

private fun getRoleBackgroundColor(role: String): androidx.compose.ui.graphics.Color {
    return when (role) {
        "ADMIN" -> androidx.compose.ui.graphics.Color(0xFFEDE9FE) // Purple light
        "PROJECT_MANAGER" -> androidx.compose.ui.graphics.Color(0xFFDBEAFE) // Blue light
        "SUPERINTENDENT" -> androidx.compose.ui.graphics.Color(0xFFD1FAE5) // Green light
        "FIELD_WORKER" -> androidx.compose.ui.graphics.Color(0xFFFEF3C7) // Orange light
        "OFFICE" -> androidx.compose.ui.graphics.Color(0xFFCFFAFE) // Cyan light
        "VIEWER" -> androidx.compose.ui.graphics.Color(0xFFF3F4F6) // Gray light
        else -> androidx.compose.ui.graphics.Color(0xFFF3F4F6) // Gray light fallback
    }
}
