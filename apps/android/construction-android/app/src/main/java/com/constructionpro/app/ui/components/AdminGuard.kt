package com.constructionpro.app.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.model.UserProfile
import com.constructionpro.app.data.model.UserRole
import com.constructionpro.app.ui.theme.ConstructionRed
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * A composable that checks if the current user has admin privileges.
 * Shows access denied content if not authorized, otherwise shows the provided content.
 *
 * Admin roles include: ADMIN, PROJECT_MANAGER, HR
 */
@Composable
fun AdminGuard(
    apiService: ApiService,
    modifier: Modifier = Modifier,
    allowedRoles: List<String> = listOf(
        UserRole.ADMIN,
        UserRole.PROJECT_MANAGER,
        UserRole.HR
    ),
    onAccessDenied: (() -> Unit)? = null,
    content: @Composable (userProfile: UserProfile) -> Unit
) {
    var state by remember {
        mutableStateOf(
            AdminGuardState(
                loading = true,
                userProfile = null,
                hasAccess = false,
                error = null
            )
        )
    }

    LaunchedEffect(Unit) {
        try {
            val profile = withContext(Dispatchers.IO) {
                apiService.getProfile()
            }
            val hasAccess = allowedRoles.contains(profile.role)
            state = AdminGuardState(
                loading = false,
                userProfile = profile,
                hasAccess = hasAccess,
                error = null
            )
        } catch (e: Exception) {
            state = AdminGuardState(
                loading = false,
                userProfile = null,
                hasAccess = false,
                error = e.message ?: "Failed to verify access"
            )
        }
    }

    Box(modifier = modifier.fillMaxSize()) {
        when {
            state.loading -> {
                CPLoadingIndicator(message = "Verifying access...")
            }
            state.error != null -> {
                CPErrorBanner(
                    message = state.error ?: "An error occurred",
                    onRetry = null,
                    onDismiss = onAccessDenied
                )
            }
            !state.hasAccess -> {
                AccessDeniedContent(
                    userRole = state.userProfile?.role,
                    allowedRoles = allowedRoles,
                    onGoBack = onAccessDenied
                )
            }
            state.userProfile != null -> {
                content(state.userProfile!!)
            }
        }
    }
}

private data class AdminGuardState(
    val loading: Boolean,
    val userProfile: UserProfile?,
    val hasAccess: Boolean,
    val error: String?
)

@Composable
private fun AccessDeniedContent(
    userRole: String?,
    allowedRoles: List<String>,
    onGoBack: (() -> Unit)?
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Default.Lock,
            contentDescription = null,
            tint = ConstructionRed,
            modifier = Modifier.size(80.dp)
        )

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Access Denied",
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onSurface
        )

        Spacer(modifier = Modifier.height(12.dp))

        Text(
            text = "You don't have permission to access this area.",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )

        if (userRole != null) {
            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "Your current role: ${UserRole.displayName(userRole)}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Required: ${allowedRoles.joinToString(", ") { UserRole.displayName(it) }}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )
        }

        if (onGoBack != null) {
            Spacer(modifier = Modifier.height(32.dp))

            CPButton(
                text = "Go Back",
                onClick = onGoBack,
                size = CPButtonSize.Large
            )
        }
    }
}

/**
 * Inline permission check that returns whether user has access.
 * Use this for conditional UI elements within a screen.
 */
@Composable
fun rememberUserHasAdminAccess(
    apiService: ApiService,
    allowedRoles: List<String> = listOf(
        UserRole.ADMIN,
        UserRole.PROJECT_MANAGER,
        UserRole.HR
    )
): State<Boolean?> {
    val hasAccess = remember { mutableStateOf<Boolean?>(null) }

    LaunchedEffect(Unit) {
        try {
            val profile = withContext(Dispatchers.IO) {
                apiService.getProfile()
            }
            hasAccess.value = allowedRoles.contains(profile.role)
        } catch (_: Exception) {
            hasAccess.value = false
        }
    }

    return hasAccess
}

/**
 * Check if user is specifically an admin (highest level)
 */
@Composable
fun rememberIsAdmin(apiService: ApiService): State<Boolean?> {
    return rememberUserHasAdminAccess(
        apiService = apiService,
        allowedRoles = listOf(UserRole.ADMIN)
    )
}

/**
 * Check if user can manage users (ADMIN or HR)
 */
@Composable
fun rememberCanManageUsers(apiService: ApiService): State<Boolean?> {
    return rememberUserHasAdminAccess(
        apiService = apiService,
        allowedRoles = listOf(UserRole.ADMIN, UserRole.HR)
    )
}

/**
 * Check if user can view audit logs (ADMIN only)
 */
@Composable
fun rememberCanViewAuditLogs(apiService: ApiService): State<Boolean?> {
    return rememberUserHasAdminAccess(
        apiService = apiService,
        allowedRoles = listOf(UserRole.ADMIN)
    )
}
