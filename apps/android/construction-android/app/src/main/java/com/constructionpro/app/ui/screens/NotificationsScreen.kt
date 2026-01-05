package com.constructionpro.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
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

private data class NotificationsState(
    val loading: Boolean = false,
    val notifications: List<Notification> = emptyList(),
    val unreadCount: Int = 0,
    val error: String? = null,
    val filterUnreadOnly: Boolean = false,
    val showMenu: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(
    apiService: ApiService,
    onBack: () -> Unit,
    onNavigateToResource: (resourceType: String, resourceId: String) -> Unit
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(NotificationsState(loading = true)) }

    // Localized strings for use in coroutines
    val loadFailedMsg = stringResource(R.string.notifications_load_failed)

    fun loadNotifications() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val response = withContext(Dispatchers.IO) {
                    apiService.getNotifications(
                        unreadOnly = if (state.filterUnreadOnly) true else null
                    )
                }
                state = state.copy(
                    loading = false,
                    notifications = response.notifications,
                    unreadCount = response.unreadCount
                )
            } catch (e: Exception) {
                state = state.copy(loading = false, error = e.message ?: loadFailedMsg)
            }
        }
    }

    fun markAsRead(notificationId: String) {
        scope.launch {
            try {
                withContext(Dispatchers.IO) {
                    apiService.markNotificationsRead(
                        MarkNotificationsRequest(listOf(notificationId), true)
                    )
                }
                state = state.copy(
                    notifications = state.notifications.map {
                        if (it.id == notificationId) it.copy(isRead = true) else it
                    },
                    unreadCount = (state.unreadCount - 1).coerceAtLeast(0)
                )
            } catch (_: Exception) {}
        }
    }

    fun markAllAsRead() {
        scope.launch {
            try {
                withContext(Dispatchers.IO) {
                    apiService.markAllNotificationsRead()
                }
                state = state.copy(
                    notifications = state.notifications.map { it.copy(isRead = true) },
                    unreadCount = 0
                )
            } catch (_: Exception) {}
        }
    }

    fun deleteNotification(notificationId: String) {
        scope.launch {
            try {
                withContext(Dispatchers.IO) {
                    apiService.deleteNotification(notificationId)
                }
                val notification = state.notifications.find { it.id == notificationId }
                state = state.copy(
                    notifications = state.notifications.filter { it.id != notificationId },
                    unreadCount = if (notification?.isRead == false)
                        (state.unreadCount - 1).coerceAtLeast(0)
                    else state.unreadCount
                )
            } catch (_: Exception) {}
        }
    }

    // Load notifications when filter changes (including initial load)
    LaunchedEffect(state.filterUnreadOnly) {
        loadNotifications()
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.notifications_title),
                subtitle = if (state.unreadCount > 0) stringResource(R.string.notifications_unread_count, state.unreadCount) else null,
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.common_back)
                        )
                    }
                },
                actions = {
                    Box {
                        IconButton(onClick = { state = state.copy(showMenu = true) }) {
                            Icon(
                                imageVector = Icons.Default.MoreVert,
                                contentDescription = stringResource(R.string.notifications_menu)
                            )
                        }
                        DropdownMenu(
                            expanded = state.showMenu,
                            onDismissRequest = { state = state.copy(showMenu = false) }
                        ) {
                            DropdownMenuItem(
                                text = { Text(stringResource(R.string.notifications_mark_all_read)) },
                                onClick = {
                                    markAllAsRead()
                                    state = state.copy(showMenu = false)
                                },
                                leadingIcon = {
                                    Icon(Icons.Default.DoneAll, contentDescription = null)
                                }
                            )
                            DropdownMenuItem(
                                text = {
                                    Text(
                                        if (state.filterUnreadOnly) stringResource(R.string.notifications_show_all)
                                        else stringResource(R.string.notifications_show_unread)
                                    )
                                },
                                onClick = {
                                    state = state.copy(
                                        filterUnreadOnly = !state.filterUnreadOnly,
                                        showMenu = false
                                    )
                                },
                                leadingIcon = {
                                    Icon(
                                        if (state.filterUnreadOnly) Icons.Default.Visibility
                                        else Icons.Default.VisibilityOff,
                                        contentDescription = null
                                    )
                                }
                            )
                        }
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Error Banner
            state.error?.let { error ->
                CPErrorBanner(
                    message = error,
                    onRetry = { loadNotifications() },
                    onDismiss = { state = state.copy(error = null) }
                )
            }

            when {
                state.loading -> {
                    CPLoadingIndicator(message = "Loading notifications...")
                }
                state.notifications.isEmpty() -> {
                    CPEmptyState(
                        icon = Icons.Default.Notifications,
                        title = if (state.filterUnreadOnly) "No Unread Notifications"
                               else "No Notifications",
                        description = if (state.filterUnreadOnly)
                            "You're all caught up!"
                        else
                            "You'll see updates here when there's activity"
                    )
                }
                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(vertical = AppSpacing.xs)
                    ) {
                        items(
                        items = state.notifications,
                        key = { it.id }
                    ) { notification ->
                        NotificationItem(
                                notification = notification,
                                onClick = {
                                    if (!notification.isRead) {
                                        markAsRead(notification.id)
                                    }
                                    notification.resourceType?.let { type ->
                                        notification.resourceId?.let { id ->
                                            onNavigateToResource(type, id)
                                        }
                                    }
                                },
                                onDelete = { deleteNotification(notification.id) }
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
private fun NotificationItem(
    notification: Notification,
    onClick: () -> Unit,
    onDelete: () -> Unit
) {
    var showDeleteConfirm by remember { mutableStateOf(false) }

    val dismissState = rememberSwipeToDismissBoxState(
        confirmValueChange = { value ->
            if (value == SwipeToDismissBoxValue.EndToStart) {
                showDeleteConfirm = true
                false
            } else {
                false
            }
        }
    )

    SwipeToDismissBox(
        state = dismissState,
        backgroundContent = {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(ConstructionRed)
                    .padding(horizontal = AppSpacing.lg),
                contentAlignment = Alignment.CenterEnd
            ) {
                Icon(
                    imageVector = Icons.Default.Delete,
                    contentDescription = "Delete",
                    tint = Color.White
                )
            }
        },
        enableDismissFromStartToEnd = false
    ) {
        Surface(
            onClick = onClick,
            color = if (notification.isRead)
                AppColors.cardBackground
            else
                AppColors.primary100.copy(alpha = 0.3f)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = AppSpacing.md, vertical = AppSpacing.sm),
                horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
            ) {
                // Icon
                val (icon, iconColor) = getNotificationIcon(notification.type)
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(iconColor.copy(alpha = 0.1f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = iconColor,
                        modifier = Modifier.size(20.dp)
                    )
                }

                // Content
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(AppSpacing.xxs)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Top
                    ) {
                        Text(
                            text = notification.title,
                            style = AppTypography.body,
                            fontWeight = if (notification.isRead) FontWeight.Normal else FontWeight.SemiBold,
                            modifier = Modifier.weight(1f)
                        )

                        Text(
                            text = formatNotificationTime(notification.createdAt),
                            style = AppTypography.caption,
                            color = AppColors.textSecondary
                        )
                    }

                    Text(
                        text = notification.message,
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )

                    notification.projectName?.let { projectName ->
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(AppSpacing.xxs),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Folder,
                                contentDescription = null,
                                modifier = Modifier.size(AppSpacing.sm),
                                tint = AppColors.textSecondary
                            )
                            Text(
                                text = projectName,
                                style = AppTypography.caption,
                                color = AppColors.textSecondary
                            )
                        }
                    }
                }

                // Unread indicator
                if (!notification.isRead) {
                    Box(
                        modifier = Modifier
                            .size(AppSpacing.xs)
                            .clip(CircleShape)
                            .background(AppColors.primary600)
                    )
                }
            }
        }
    }

    // Delete Confirmation
    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            title = { Text("Delete Notification?") },
            text = { Text("This notification will be permanently deleted.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        onDelete()
                        showDeleteConfirm = false
                    }
                ) {
                    Text("Delete", color = ConstructionRed)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

private fun getNotificationIcon(type: String): Pair<ImageVector, Color> {
    return when (type) {
        NotificationType.DAILY_LOG_SUBMITTED,
        NotificationType.DAILY_LOG_APPROVED -> Icons.Default.EditNote to ConstructionGreen
        NotificationType.DAILY_LOG_REJECTED -> Icons.Default.EditNote to ConstructionRed
        NotificationType.TIME_ENTRY_APPROVED -> Icons.Default.Schedule to ConstructionGreen
        NotificationType.TIME_ENTRY_REJECTED -> Icons.Default.Schedule to ConstructionRed
        NotificationType.TASK_ASSIGNED -> Icons.Default.AssignmentInd to AppColors.primary600
        NotificationType.TASK_COMPLETED -> Icons.Default.CheckCircle to ConstructionGreen
        NotificationType.TASK_DUE_SOON,
        NotificationType.TASK_OVERDUE -> Icons.Default.Warning to ConstructionOrange
        NotificationType.RFI_CREATED,
        NotificationType.RFI_RESPONSE -> Icons.Default.QuestionAnswer to AppColors.primary600
        NotificationType.RFI_CLOSED -> Icons.Default.CheckCircle to ConstructionGreen
        NotificationType.INCIDENT_REPORTED -> Icons.Default.Report to ConstructionRed
        NotificationType.INSPECTION_DUE -> Icons.Default.Checklist to ConstructionOrange
        NotificationType.CERTIFICATION_EXPIRING -> Icons.Default.CardMembership to ConstructionOrange
        NotificationType.DOCUMENT_SHARED -> Icons.Default.Description to AppColors.primary600
        NotificationType.PROJECT_UPDATE -> Icons.Default.Folder to AppColors.primary600
        NotificationType.MENTION -> Icons.Default.AlternateEmail to AppColors.primary600
        NotificationType.COMMENT -> Icons.Default.Comment to AppColors.primary600
        NotificationType.APPROVAL_REQUIRED -> Icons.Default.Approval to ConstructionOrange
        NotificationType.WARNING_ISSUED -> Icons.Default.Warning to ConstructionRed
        NotificationType.SCHEDULE_CHANGE -> Icons.Default.CalendarMonth to ConstructionOrange
        NotificationType.WEATHER_ALERT -> Icons.Default.Cloud to ConstructionOrange
        else -> Icons.Default.Notifications to AppColors.primary600
    }
}

private fun formatNotificationTime(timestamp: String): String {
    // Simple relative time formatting with 12-hour time
    return try {
        val datePart = timestamp.substringBefore("T")
        val today = java.time.LocalDate.now().toString()
        val yesterday = java.time.LocalDate.now().minusDays(1).toString()

        when (datePart) {
            today -> TimeUtils.format12Hour(timestamp) // 12-hour format
            yesterday -> "Yesterday"
            else -> datePart.substring(5) // MM-DD
        }
    } catch (_: Exception) {
        timestamp.substringBefore("T")
    }
}
