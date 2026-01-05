package com.constructionpro.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
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

private data class InvitationsState(
    val loading: Boolean = false,
    val invitations: List<UserInvitation> = emptyList(),
    val error: String? = null,
    val filterStatus: String? = null, // null = all, PENDING, ACCEPTED, EXPIRED
    val showInviteDialog: Boolean = false,
    val actionSuccess: String? = null,
    val showFilters: Boolean = false
)

private data class InviteFormState(
    val email: String = "",
    val role: String = UserRole.FIELD_WORKER,
    val message: String = "",
    val sending: Boolean = false,
    val error: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InvitationsScreen(
    apiService: ApiService,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(InvitationsState(loading = true)) }
    var inviteForm by remember { mutableStateOf(InviteFormState()) }
    val configuration = LocalConfiguration.current
    val isNarrow = configuration.screenWidthDp < 360

    fun loadInvitations() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val response = withContext(Dispatchers.IO) {
                    apiService.getInvitations(status = state.filterStatus)
                }
                state = state.copy(loading = false, invitations = response.invitations)
            } catch (e: Exception) {
                state = state.copy(
                    loading = false,
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

        if (!inviteForm.email.contains("@")) {
            inviteForm = inviteForm.copy(error = "Please enter a valid email address")
            return
        }

        scope.launch {
            inviteForm = inviteForm.copy(sending = true, error = null)
            try {
                val request = InviteUserRequest(
                    email = inviteForm.email.trim(),
                    role = inviteForm.role,
                    message = inviteForm.message.ifBlank { null }
                )
                withContext(Dispatchers.IO) {
                    apiService.inviteUser(request)
                }
                state = state.copy(
                    showInviteDialog = false,
                    actionSuccess = "Invitation sent to ${inviteForm.email}"
                )
                inviteForm = InviteFormState()
                loadInvitations()
            } catch (e: Exception) {
                inviteForm = inviteForm.copy(
                    sending = false,
                    error = e.message ?: "Failed to send invitation"
                )
            }
        }
    }

    fun resendInvitation(invitation: UserInvitation) {
        scope.launch {
            try {
                withContext(Dispatchers.IO) {
                    apiService.resendInvitation(invitation.id)
                }
                state = state.copy(actionSuccess = "Invitation resent to ${invitation.email}")
                loadInvitations()
            } catch (e: Exception) {
                state = state.copy(error = e.message ?: "Failed to resend invitation")
            }
        }
    }

    fun cancelInvitation(invitation: UserInvitation) {
        scope.launch {
            try {
                withContext(Dispatchers.IO) {
                    apiService.cancelInvitation(invitation.id)
                }
                state = state.copy(actionSuccess = "Invitation cancelled")
                loadInvitations()
            } catch (e: Exception) {
                state = state.copy(error = e.message ?: "Failed to cancel invitation")
            }
        }
    }

    LaunchedEffect(Unit) {
        loadInvitations()
    }

    LaunchedEffect(state.filterStatus) {
        loadInvitations()
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
                title = stringResource(R.string.invitations_title),
                navigationIcon = {
                    IconButton(
                        onClick = onBack,
                        modifier = Modifier.size(56.dp)
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.common_back)
                        )
                    }
                },
                actions = {
                    IconButton(
                        onClick = { state = state.copy(showFilters = !state.showFilters) },
                        modifier = Modifier.size(56.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.FilterList,
                            contentDescription = stringResource(R.string.common_filter)
                        )
                    }
                }
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { state = state.copy(showInviteDialog = true) },
                containerColor = Primary600,
                contentColor = Color.White
            ) {
                Icon(
                    imageVector = Icons.Default.PersonAdd,
                    contentDescription = null
                )
                Spacer(modifier = Modifier.width(AppSpacing.xs))
                Text(stringResource(R.string.users_invite))
            }
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Filters Row
                if (state.showFilters) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = AppSpacing.md, vertical = AppSpacing.xs),
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                    ) {
                        val allLabel = stringResource(R.string.common_all)
                        val pendingLabel = stringResource(R.string.invitations_pending)
                        val acceptedLabel = stringResource(R.string.invitations_accepted)
                        val expiredLabel = stringResource(R.string.invitations_expired)
                        val statusFilters = listOf(
                            allLabel to null,
                            pendingLabel to "PENDING",
                            acceptedLabel to "ACCEPTED",
                            expiredLabel to "EXPIRED"
                        )

                        for ((label, statusValue) in statusFilters) {
                            FilterChip(
                                selected = state.filterStatus == statusValue,
                                onClick = { state = state.copy(filterStatus = statusValue) },
                                label = { Text(label) },
                                modifier = Modifier.defaultMinSize(minHeight = 48.dp)
                            )
                        }
                    }
                }

                // Stats Row
                val pendingCount = state.invitations.count { it.status == "PENDING" }
                val acceptedCount = state.invitations.count { it.status == "ACCEPTED" }
                val expiredCount = state.invitations.count { it.status == "EXPIRED" }

                if (!state.loading && state.invitations.isNotEmpty()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = AppSpacing.md, vertical = AppSpacing.xs),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        StatBadge(
                            label = stringResource(R.string.invitations_pending),
                            count = pendingCount,
                            color = ConstructionOrange
                        )
                        StatBadge(
                            label = stringResource(R.string.invitations_accepted),
                            count = acceptedCount,
                            color = ConstructionGreen
                        )
                        StatBadge(
                            label = stringResource(R.string.invitations_expired),
                            count = expiredCount,
                            color = ConstructionRed
                        )
                    }
                }

                // Error Banner
                state.error?.let { error ->
                    CPErrorBanner(
                        message = error,
                        onRetry = { loadInvitations() },
                        onDismiss = { state = state.copy(error = null) },
                        modifier = Modifier.padding(horizontal = AppSpacing.md)
                    )
                }

                // Content
                when {
                    state.loading -> {
                        CPLoadingIndicator(message = stringResource(R.string.invitations_loading))
                    }
                    state.invitations.isEmpty() -> {
                        CPEmptyState(
                            icon = Icons.Default.Email,
                            title = stringResource(R.string.invitations_empty_title),
                            description = stringResource(R.string.invitations_empty_desc),
                            actionText = stringResource(R.string.users_invite),
                            onAction = { state = state.copy(showInviteDialog = true) }
                        )
                    }
                    else -> {
                        LazyColumn(
                            contentPadding = PaddingValues(AppSpacing.md),
                            verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
                        ) {
                            items(state.invitations, key = { it.id }) { invitation ->
                                InvitationCard(
                                    invitation = invitation,
                                    onResend = { resendInvitation(invitation) },
                                    onCancel = { cancelInvitation(invitation) },
                                    isNarrow = isNarrow
                                )
                            }

                            // Bottom spacing for FAB
                            item {
                                Spacer(modifier = Modifier.height(80.dp))
                            }
                        }
                    }
                }
            }

            // Success Banner
            state.actionSuccess?.let { message ->
                Surface(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(AppSpacing.md)
                        .padding(bottom = 72.dp) // Above FAB
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

    // Invite Dialog
    if (state.showInviteDialog) {
        AlertDialog(
            onDismissRequest = {
                if (!inviteForm.sending) {
                    state = state.copy(showInviteDialog = false)
                    inviteForm = InviteFormState()
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
                                    },
                                    modifier = Modifier.defaultMinSize(minHeight = 56.dp)
                                )
                            }
                        }
                    }

                    OutlinedTextField(
                        value = inviteForm.message,
                        onValueChange = { inviteForm = inviteForm.copy(message = it) },
                        label = { Text("Personal Message (Optional)") },
                        placeholder = { Text("Add a welcome message...") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2,
                        maxLines = 4,
                        enabled = !inviteForm.sending
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = { sendInvitation() },
                    enabled = !inviteForm.sending && inviteForm.email.isNotBlank(),
                    modifier = Modifier.defaultMinSize(minHeight = 56.dp)
                ) {
                    if (inviteForm.sending) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.xs))
                    }
                    Text(stringResource(R.string.users_invite))
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        state = state.copy(showInviteDialog = false)
                        inviteForm = InviteFormState()
                    },
                    enabled = !inviteForm.sending,
                    modifier = Modifier.defaultMinSize(minHeight = 56.dp)
                ) {
                    Text(stringResource(R.string.common_cancel))
                }
            }
        )
    }
}

@Composable
private fun StatBadge(
    label: String,
    count: Int,
    color: Color
) {
    Surface(
        shape = RoundedCornerShape(AppSpacing.xs),
        color = color.copy(alpha = 0.1f)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = AppSpacing.sm, vertical = AppSpacing.xs),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = count.toString(),
                style = AppTypography.heading3,
                fontWeight = FontWeight.Bold,
                color = color
            )
            Text(
                text = label,
                style = AppTypography.secondary,
                color = color
            )
        }
    }
}

@Composable
private fun InvitationCard(
    invitation: UserInvitation,
    onResend: () -> Unit,
    onCancel: () -> Unit,
    isNarrow: Boolean
) {
    val statusColor = when (invitation.status) {
        "PENDING" -> ConstructionOrange
        "ACCEPTED" -> ConstructionGreen
        "EXPIRED" -> ConstructionRed
        "CANCELLED" -> AppColors.textSecondary
        else -> AppColors.textSecondary
    }

    CPCard {
        Column(
            verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            // Header Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(AppSpacing.xxs)
                ) {
                    Text(
                        text = invitation.email,
                        style = AppTypography.heading3,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    Text(
                        text = UserRole.displayName(invitation.role),
                        style = AppTypography.body,
                        color = AppColors.textSecondary
                    )
                }

                // Status Badge
                Surface(
                    shape = RoundedCornerShape(AppSpacing.xxs),
                    color = statusColor.copy(alpha = 0.1f)
                ) {
                    Text(
                        text = invitation.status,
                        style = AppTypography.captionMedium,
                        color = statusColor,
                        fontWeight = FontWeight.Medium,
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
                    val expiryText = if (invitation.status == "PENDING") {
                        "Expires: ${invitation.expiresAt.substringBefore("T")}"
                    } else {
                        "Sent: ${invitation.createdAt.substringBefore("T")}"
                    }
                    Text(
                        text = expiryText,
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                }
            }

            // Message if present
            invitation.message?.let { message ->
                Surface(
                    shape = RoundedCornerShape(AppSpacing.xs),
                    color = AppColors.gray100
                ) {
                    Text(
                        text = message,
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.padding(AppSpacing.xs)
                    )
                }
            }

            // Actions (only for pending invitations)
            if (invitation.status == "PENDING") {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(
                        onClick = onCancel,
                        modifier = Modifier.defaultMinSize(minHeight = 56.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Cancel,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp),
                            tint = ConstructionRed
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.xxs))
                        Text(stringResource(R.string.invitations_cancel), color = ConstructionRed)
                    }

                    Spacer(modifier = Modifier.width(AppSpacing.xs))

                    Button(
                        onClick = onResend,
                        colors = ButtonDefaults.buttonColors(containerColor = Primary600),
                        modifier = Modifier.defaultMinSize(minHeight = 56.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Send,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.xxs))
                        Text(stringResource(R.string.invitations_resend))
                    }
                }
            }

            // Accepted info
            if (invitation.status == "ACCEPTED" && invitation.acceptedAt != null) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.xxs),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = null,
                        modifier = Modifier.size(AppSpacing.md),
                        tint = ConstructionGreen
                    )
                    Text(
                        text = "Accepted on ${invitation.acceptedAt.substringBefore("T")}",
                        style = AppTypography.secondary,
                        color = ConstructionGreen
                    )
                }
            }
        }
    }
}
