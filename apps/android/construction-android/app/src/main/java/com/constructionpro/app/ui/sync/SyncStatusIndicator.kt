package com.constructionpro.app.ui.sync

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.constructionpro.app.data.local.SyncManager
import com.constructionpro.app.data.local.SyncStatus

/**
 * Compact sync status indicator for app bar or header
 */
@Composable
fun SyncStatusBadge(
    syncState: SyncManager.SyncState,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val totalPending = syncState.pendingCount + syncState.failedCount + syncState.conflictCount

    Box(
        modifier = modifier
            .clickable(onClick = onClick)
            .padding(8.dp),
        contentAlignment = Alignment.Center
    ) {
        when {
            syncState.isSyncing -> {
                // Spinning sync icon
                val infiniteTransition = rememberInfiniteTransition(label = "sync")
                val rotation by infiniteTransition.animateFloat(
                    initialValue = 0f,
                    targetValue = 360f,
                    animationSpec = infiniteRepeatable(
                        animation = tween(1000, easing = LinearEasing),
                        repeatMode = RepeatMode.Restart
                    ),
                    label = "rotation"
                )
                Icon(
                    imageVector = Icons.Default.Refresh,
                    contentDescription = "Syncing",
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.rotate(rotation)
                )
            }
            syncState.conflictCount > 0 -> {
                // Warning badge for conflicts
                BadgedBox(
                    badge = {
                        Badge(
                            containerColor = Color(0xFFFF9800) // Orange
                        ) {
                            Text(syncState.conflictCount.toString())
                        }
                    }
                ) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = "Sync conflicts",
                        tint = Color(0xFFFF9800)
                    )
                }
            }
            syncState.failedCount > 0 -> {
                // Error badge
                BadgedBox(
                    badge = {
                        Badge(
                            containerColor = MaterialTheme.colorScheme.error
                        ) {
                            Text(syncState.failedCount.toString())
                        }
                    }
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Sync failed",
                        tint = MaterialTheme.colorScheme.error
                    )
                }
            }
            syncState.pendingCount > 0 -> {
                // Pending badge
                BadgedBox(
                    badge = {
                        Badge {
                            Text(syncState.pendingCount.toString())
                        }
                    }
                ) {
                    Icon(
                        imageVector = Icons.Default.Refresh,
                        contentDescription = "Pending sync",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            else -> {
                // All synced - green check
                Icon(
                    imageVector = Icons.Default.Check,
                    contentDescription = "All synced",
                    tint = Color(0xFF4CAF50) // Green
                )
            }
        }
    }
}

/**
 * Offline banner shown at top of screen when offline
 */
@Composable
fun OfflineBanner(
    isOffline: Boolean,
    pendingCount: Int,
    modifier: Modifier = Modifier
) {
    AnimatedVisibility(
        visible = isOffline,
        enter = slideInVertically() + fadeIn(),
        exit = slideOutVertically() + fadeOut(),
        modifier = modifier
    ) {
        Surface(
            color = Color(0xFFFFF3E0), // Light orange
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Warning,
                    contentDescription = null,
                    tint = Color(0xFFE65100), // Dark orange
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = if (pendingCount > 0) {
                        "Offline - $pendingCount changes pending"
                    } else {
                        "You're offline"
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color(0xFFE65100)
                )
            }
        }
    }
}

/**
 * Full sync status card for settings or sync management screen
 */
@Composable
fun SyncStatusCard(
    syncState: SyncManager.SyncState,
    onSyncNow: () -> Unit,
    onRetryFailed: () -> Unit,
    onClearFailed: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Sync Status",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                SyncStatusBadge(
                    syncState = syncState,
                    onClick = onSyncNow
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Status rows
            SyncStatusRow(
                label = "Pending",
                count = syncState.pendingCount,
                color = MaterialTheme.colorScheme.primary
            )
            SyncStatusRow(
                label = "Conflicts",
                count = syncState.conflictCount,
                color = Color(0xFFFF9800)
            )
            SyncStatusRow(
                label = "Failed",
                count = syncState.failedCount,
                color = MaterialTheme.colorScheme.error
            )

            // Last sync time
            syncState.lastSyncAt?.let { timestamp ->
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Last sync: ${formatTimestamp(timestamp)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // Action buttons
            if (syncState.pendingCount > 0 || syncState.failedCount > 0) {
                Spacer(modifier = Modifier.height(16.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (syncState.pendingCount > 0) {
                        Button(
                            onClick = onSyncNow,
                            enabled = !syncState.isSyncing,
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Sync Now")
                        }
                    }
                    if (syncState.failedCount > 0) {
                        OutlinedButton(
                            onClick = onRetryFailed,
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Retry")
                        }
                        TextButton(
                            onClick = onClearFailed
                        ) {
                            Text("Clear")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SyncStatusRow(
    label: String,
    count: Int,
    color: Color
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .background(color, CircleShape)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium
            )
        }
        Text(
            text = count.toString(),
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Bold,
            color = if (count > 0) color else MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

private fun formatTimestamp(timestamp: Long): String {
    val now = System.currentTimeMillis()
    val diff = now - timestamp

    return when {
        diff < 60_000 -> "Just now"
        diff < 3600_000 -> "${diff / 60_000}m ago"
        diff < 86400_000 -> "${diff / 3600_000}h ago"
        else -> "${diff / 86400_000}d ago"
    }
}
