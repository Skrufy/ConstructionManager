package com.constructionpro.app.ui.document

import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import com.constructionpro.app.ui.theme.*

/**
 * Video player for document viewing using ExoPlayer (Media3)
 * Supports standard video controls
 */
@Composable
fun VideoDocumentPlayer(
    url: String,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    // Create and remember the ExoPlayer
    val exoPlayer = remember {
        ExoPlayer.Builder(context).build().apply {
            // Add listener for loading/error states
            addListener(object : Player.Listener {
                override fun onPlaybackStateChanged(playbackState: Int) {
                    isLoading = playbackState == Player.STATE_BUFFERING
                }

                override fun onPlayerError(playerError: PlaybackException) {
                    error = playerError.message ?: "Failed to play video"
                    isLoading = false
                }
            })
        }
    }

    // Set media item when URL changes
    LaunchedEffect(url) {
        isLoading = true
        error = null
        exoPlayer.setMediaItem(MediaItem.fromUri(url))
        exoPlayer.prepare()
        exoPlayer.playWhenReady = true
    }

    // Clean up player on dispose
    DisposableEffect(Unit) {
        onDispose {
            exoPlayer.release()
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black),
        contentAlignment = Alignment.Center
    ) {
        // Video player view
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    player = exoPlayer
                    layoutParams = FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    useController = true
                    setShowBuffering(PlayerView.SHOW_BUFFERING_ALWAYS)
                }
            },
            modifier = Modifier.fillMaxSize()
        )

        // Loading overlay
        if (isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
                ) {
                    CircularProgressIndicator(color = Color.White)
                    Text(
                        text = "Loading video...",
                        style = AppTypography.secondary,
                        color = Color.White.copy(alpha = 0.8f)
                    )
                }
            }
        }

        // Error overlay
        error?.let { errorMessage ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.8f)),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
                ) {
                    Text(
                        text = "Failed to play video",
                        style = AppTypography.heading3,
                        color = Color.White
                    )
                    Text(
                        text = errorMessage,
                        style = AppTypography.secondary,
                        color = Color.White.copy(alpha = 0.7f)
                    )
                    Spacer(modifier = Modifier.height(AppSpacing.md))
                    Button(
                        onClick = {
                            error = null
                            isLoading = true
                            exoPlayer.prepare()
                            exoPlayer.playWhenReady = true
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Primary600)
                    ) {
                        Text("Try Again")
                    }
                }
            }
        }
    }
}
