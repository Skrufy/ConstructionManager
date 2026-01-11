package com.constructionpro.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
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
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class UserManagementState(
    val loading: Boolean = false,
    val loadingInvitations: Boolean = false,
    val users: List<UserDetail> = emptyList(),
    val invitations: List<UserInvitation> = emptyList(),
    val selectedTab: Int = 0, // 0=Users, 1=Invitations
    val searchQuery: String = "",
    val filterRole: String? = null,
    val filterStatus: String? = null,
    val error: String? = null,
    val showFilters: Boolean = false,
    val showInviteDialog: Boolean = false,
    val selectedUser: UserDetail? = null,
    val showUserActions: Boolean = false
)

private data class UserInviteFormState(
    val email: String = "",
    val role: String = UserRole.FIELD_WORKER,
    val sending: Boolean = false,
    val error: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UserManagementScreen(
    apiService: ApiService,
    onBack: () -> Unit,
    onOpenUser: (String) -> Unit
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(UserManagementState(loading = true)) }
    var inviteForm by remember { mutableStateOf(UserInviteFormState()) }
    val configuration = LocalConfiguration.current
    val isNarrow = configuration.screenWidthDp < 360

    fun loadUsers() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val users = withContext(Dispatchers.IO) {
                    apiService.getAdminUsers(
                        search = state.searchQuery.ifBlank { null },
                        role = state.filterRole,
                        status = state.filterStatus
                    )
                }
                state = state.copy(loading = false, users = users)
            } catch (e: Exception) {
                state = state.copy(
                    loading = false,
                    error = e.message ?: "Failed to load users"
                )
            }
        }
    }

    fun loadInvitations() {
        scope.launch {
            state = state.copy(loadingInvitations = true)
            try {
                val response = withContext(Dispatchers.IO) {
                    apiService.getInvitations()
                }
                state = state.copy(loadingInvitations = false, invitations = response.invitations)
            } catch (e: Exception) {
                state = state.copy(
                    loadingInvitations = false,
                    error = e.message ?: "Failed to load invitations"
                )
            }
        }
    }

    fun sendInvitation() {
        if (inviteForm.email.isBlank()) {
            inviteForm = inviteForm.copy(error = "Please enter an email address")
            return
        }

        scope.launch {
            inviteForm = inviteForm.copy(sending = true, error = null)
            try {
                val request = InviteUserRequest(
                    email = inviteForm.email.trim(),
                    role = inviteForm.role
                )
                withContext(Dispatchers.IO) {
                    apiService.inviteUser(request)
                }
                state = state.copy(showInviteDialog = false)
                inviteForm = UserInviteFormState()
                loadInvitations()
            } catch (e: Exception) {
                inviteForm = inviteForm.copy(
                    sending = false,
                    error = e.message ?: "Failed to send invitation"
                )
            }
        }
    }

    LaunchedEffect(Unit) {
        loadUsers()
        loadInvitations()
    }

    LaunchedEffect(state.searchQuery, state.filterRole, state.filterStatus) {
        loadUsers()
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.users_title),
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.common_back)
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { state = state.copy(showFilters = !state.showFilters) }) {
                        Icon(
                            imageVector = Icons.Default.FilterList,
                            contentDescription = "Filter"
                        )
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { state = state.copy(showInviteDialog = true) },
                containerColor = Primary600
            ) {
                Icon(
                    imageVector = Icons.Default.PersonAdd,
                    contentDescription = stringResource(R.string.users_invite),
                    tint = Color.White
                )
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Tab Row
            TabRow(
                selectedTabIndex = state.selectedTab,
                containerColor = AppColors.cardBackground
            ) {
                Tab(
                    selected = state.selectedTab == 0,
                    onClick = { state = state.copy(selectedTab = 0) },
                    text = { Text("Users (${state.users.size})") }
                )
                Tab(
                    selected = state.selectedTab == 1,
                    onClick = { state = state.copy(selectedTab = 1) },
                    text = {
                        if (state.loadingInvitations) {
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Invitations")
                                CircularProgressIndicator(
                                    modifier = Modifier.size(14.dp),
                                    strokeWidth = 2.dp
                                )
                            }
                        } else {
                            Text("Invitations (${state.invitations.size})")
                        }
                    }
                )
            }

            // Search and Filters
            if (state.selectedTab == 0) {
                Column(
                    modifier = Modifier.padding(AppSpacing.md),
                    verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                ) {
                    OutlinedTextField(
                        value = state.searchQuery,
                        onValueChange = { state = state.copy(searchQuery = it) },
                        placeholder = { Text(stringResource(R.string.users_search)) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        leadingIcon = {
                            Icon(Icons.Default.Search, contentDescription = null)
                        },
                        trailingIcon = {
                            if (state.searchQuery.isNotBlank()) {
                                IconButton(onClick = { state = state.copy(searchQuery = "") }) {
                                    Icon(Icons.Default.Clear, contentDescription = "Clear")
                                }
                            }
                        }
                    )

                    if (state.showFilters) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                        ) {
                            // Role Filter
                            FilterChip(
                                selected = state.filterRole != null,
                                onClick = {
                                    state = state.copy(
                                        filterRole = if (state.filterRole != null) null else UserRole.FIELD_WORKER
                                    )
                                },
                                label = {
                                    Text(state.filterRole?.let { UserRole.displayName(it) } ?: "Role")
                                },
                                leadingIcon = if (state.filterRole != null) {
                                    {
                                        Icon(
                                            Icons.Default.Check,
                                            contentDescription = null,
                                            modifier = Modifier.size(AppSpacing.md)
                                        )
                                    }
                                } else null
                            )

                            // Status Filter
                            FilterChip(
                                selected = state.filterStatus != null,
                                onClick = {
                                    state = state.copy(
                                        filterStatus = if (state.filterStatus != null) null else UserStatus.ACTIVE
                                    )
                                },
                                label = {
                                    Text(state.filterStatus?.let { UserStatus.displayName(it) } ?: "Status")
                                },
                                leadingIcon = if (state.filterStatus != null) {
                                    {
                                        Icon(
                                            Icons.Default.Check,
                                            contentDescription = null,
                                            modifier = Modifier.size(AppSpacing.md)
                                        )
                                    }
                                } else null
                            )
                        }
                    }
                }
            }

            // Error Banner
            state.error?.let { error ->
                CPErrorBanner(
                    message = error,
                    onRetry = { loadUsers() },
                    onDismiss = { state = state.copy(error = null) }
                )
            }

            // Content
            when {
                state.loading -> {
                    CPLoadingIndicator(message = stringResource(R.string.users_loading))
                }
                state.selectedTab == 0 -> {
                    // Users List
                    if (state.users.isEmpty()) {
                        CPEmptyState(
                            icon = Icons.Default.People,
                            title = stringResource(R.string.users_empty_title),
                            description = stringResource(R.string.users_empty_desc)
                        )
                    } else {
                        LazyColumn(
                            contentPadding = PaddingValues(AppSpacing.md),
                            verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                        ) {
                            items(state.users, key = { it.id }) { user ->
                                UserCard(
                                    user = user,
                                    onClick = { onOpenUser(user.id) },
                                    isNarrow = isNarrow
                                )
                            }
                        }
                    }
                }
                else -> {
                    // Invitations List
                    if (state.invitations.isEmpty()) {
                        CPEmptyState(
                            icon = Icons.Default.Email,
                            title = stringResource(R.string.users_empty_title),
                            description = stringResource(R.string.users_empty_desc)
                        )
                    } else {
                        LazyColumn(
                            contentPadding = PaddingValues(AppSpacing.md),
                            verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                        ) {
                            items(state.invitations, key = { it.id }) { invitation ->
                                InvitationCard(
                                    invitation = invitation,
                                    onResend = {
                                        scope.launch {
                                            try {
                                                withContext(Dispatchers.IO) {
                                                    apiService.resendInvitation(invitation.id)
                                                }
                                                loadInvitations()
                                            } catch (_: Exception) {}
                                        }
                                    },
                                    onCancel = {
                                        scope.launch {
                                            try {
                                                withContext(Dispatchers.IO) {
                                                    apiService.cancelInvitation(invitation.id)
                                                }
                                                loadInvitations()
                                            } catch (_: Exception) {}
                                        }
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // Invite Dialog
    if (state.showInviteDialog) {
        AlertDialog(
            onDismissRequest = {
                if (!inviteForm.sending) {
                    state = state.copy(showInviteDialog = false)
                    inviteForm = UserInviteFormState()
                }
            },
            title = { Text(stringResource(R.string.users_invite)) },
            text = {
                Column(
                    verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
                ) {
                    inviteForm.error?.let { error ->
                        Text(
                            text = error,
                            color = AppColors.error,
                            style = AppTypography.secondary
                        )
                    }

                    OutlinedTextField(
                        value = inviteForm.email,
                        onValueChange = { inviteForm = inviteForm.copy(email = it) },
                        label = { Text("Email Address *") },
                        placeholder = { Text("user@company.com") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        leadingIcon = {
                            Icon(Icons.Default.Email, contentDescription = null)
                        },
                        enabled = !inviteForm.sending
                    )

                    // Role Dropdown
                    var roleExpanded by remember { mutableStateOf(false) }
                    ExposedDropdownMenuBox(
                        expanded = roleExpanded,
                        onExpandedChange = { if (!inviteForm.sending) roleExpanded = it }
                    ) {
                        OutlinedTextField(
                            value = UserRole.displayName(inviteForm.role),
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Role") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = roleExpanded) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor(),
                            enabled = !inviteForm.sending
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
                                        inviteForm = inviteForm.copy(role = role)
                                        roleExpanded = false
                                    }
                                )
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { sendInvitation() },
                    enabled = !inviteForm.sending && inviteForm.email.isNotBlank()
                ) {
                    if (inviteForm.sending) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(AppSpacing.lg),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text("Send Invitation")
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        state = state.copy(showInviteDialog = false)
                        inviteForm = UserInviteFormState()
                    },
                    enabled = !inviteForm.sending
                ) {
                    Text(stringResource(R.string.common_cancel))
                }
            }
        )
    }
}

@Composable
private fun UserCard(
    user: UserDetail,
    onClick: () -> Unit,
    isNarrow: Boolean
) {
    CPCard(
        onClick = onClick
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Avatar
            CPAvatar(
                name = user.name,
                size = if (isNarrow) 44.dp else 48.dp
            )

            // User Info
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(AppSpacing.xxs)
            ) {
                Text(
                    text = user.name,
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                Text(
                    text = user.email,
                    style = AppTypography.secondary,
                    color = AppColors.textSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                Row(
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Role Badge
                    Surface(
                        shape = RoundedCornerShape(AppSpacing.xxs),
                        color = Primary100
                    ) {
                        Text(
                            text = UserRole.displayName(user.role),
                            style = AppTypography.caption,
                            color = Primary600,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
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
                            style = AppTypography.caption,
                            color = statusColor,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            // Chevron
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = "View details",
                tint = AppColors.textSecondary
            )
        }
    }
}

@Composable
private fun InvitationCard(
    invitation: UserInvitation,
    onResend: () -> Unit,
    onCancel: () -> Unit
) {
    CPCard {
        Column(
            verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(AppSpacing.xxs)
                ) {
                    Text(
                        text = invitation.email,
                        style = AppTypography.heading3,
                        fontWeight = FontWeight.SemiBold
                    )

                    Text(
                        text = "Role: ${UserRole.displayName(invitation.role)}",
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                }

                // Status Badge
                val statusColor = when (invitation.status) {
                    "PENDING" -> ConstructionOrange
                    "ACCEPTED" -> ConstructionGreen
                    "EXPIRED" -> ConstructionRed
                    else -> AppColors.textSecondary
                }
                Surface(
                    shape = RoundedCornerShape(AppSpacing.xxs),
                    color = statusColor.copy(alpha = 0.1f)
                ) {
                    Text(
                        text = invitation.status,
                        style = AppTypography.caption,
                        color = statusColor,
                        modifier = Modifier.padding(horizontal = AppSpacing.xs, vertical = AppSpacing.xxs)
                    )
                }
            }

            // Meta Info
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(AppSpacing.md)
            ) {
                invitation.invitedBy?.name?.let { inviter ->
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xxs),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Person,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp),
                            tint = AppColors.textSecondary
                        )
                        Text(
                            text = "By $inviter",
                            style = AppTypography.secondary,
                            color = AppColors.textSecondary
                        )
                    }
                }

                Row(
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.xxs),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Schedule,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = AppColors.textSecondary
                    )
                    Text(
                        text = "Expires: ${invitation.expiresAt.substringBefore("T")}",
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                }
            }

            // Actions (only for pending invitations)
            if (invitation.status == "PENDING") {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    TextButton(onClick = onCancel) {
                        Text(stringResource(R.string.common_cancel), color = ConstructionRed)
                    }
                    Button(
                        onClick = onResend,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Primary600
                        )
                    ) {
                        Icon(
                            imageVector = Icons.Default.Send,
                            contentDescription = null,
                            modifier = Modifier.size(AppSpacing.md)
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.xxs))
                        Text(stringResource(R.string.users_resend_invite))
                    }
                }
            }
        }
    }
}
