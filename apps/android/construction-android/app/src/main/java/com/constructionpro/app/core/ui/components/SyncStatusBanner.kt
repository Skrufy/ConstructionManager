package com.constructionpro.app.core.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.CloudQueue
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

enum class SyncState {
    IDLE,
    SYNCING,
    OFFLINE,
    ERROR
}

@Composable
fun SyncStatusBanner(
    syncState: SyncState,
    pendingCount: Int,
    modifier: Modifier = Modifier
) {
    val (backgroundColor, icon, text) = when (syncState) {
        SyncState.IDLE -> {
            if (pendingCount > 0) {
                Triple(
                    Color(0xFFFFF3E0),
                    Icons.Default.CloudQueue,
                    "$pendingCount changes pending"
                )
            } else {
                return // Don't show banner when fully synced
            }
        }
        SyncState.SYNCING -> Triple(
            Color(0xFFE3F2FD),
            null, // Will use progress indicator
            "Syncing..."
        )
        SyncState.OFFLINE -> Triple(
            Color(0xFFFFEBEE),
            Icons.Default.CloudOff,
            "Offline - changes saved locally"
        )
        SyncState.ERROR -> Triple(
            Color(0xFFFFEBEE),
            Icons.Default.Sync,
            "Sync error - will retry"
        )
    }

    AnimatedVisibility(
        visible = syncState != SyncState.IDLE || pendingCount > 0,
        enter = expandVertically(),
        exit = shrinkVertically(),
        modifier = modifier
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(backgroundColor)
                .padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (syncState == SyncState.SYNCING) {
                CircularProgressIndicator(
                    modifier = Modifier.size(16.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.primary
                )
            } else if (icon != null) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = if (syncState == SyncState.OFFLINE || syncState == SyncState.ERROR) {
                        Color(0xFFD32F2F)
                    } else {
                        Color(0xFFF57C00)
                    }
                )
            }

            Text(
                text = text,
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFF424242),
                modifier = Modifier.padding(start = 8.dp)
            )
        }
    }
}
