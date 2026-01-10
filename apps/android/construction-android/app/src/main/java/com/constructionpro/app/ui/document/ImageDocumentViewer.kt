package com.constructionpro.app.ui.document

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import coil.compose.SubcomposeAsyncImage
import coil.request.ImageRequest
import com.constructionpro.app.ui.theme.*

/**
 * Zoomable image viewer for document viewing
 * Supports pinch-to-zoom and pan gestures
 * Double-tap to reset zoom
 */
@Composable
fun ImageDocumentViewer(
    url: String,
    modifier: Modifier = Modifier,
    contentDescription: String = "Document image"
) {
    val context = LocalContext.current
    var zoom by remember { mutableStateOf(1f) }
    var offset by remember { mutableStateOf(Offset.Zero) }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(AppColors.gray100)
            .pointerInput(Unit) {
                detectTransformGestures { _, pan, zoomChange, _ ->
                    val nextZoom = (zoom * zoomChange).coerceIn(0.5f, 5f)
                    zoom = nextZoom

                    // Only allow panning when zoomed in
                    if (zoom > 1f) {
                        offset += pan
                    }
                }
            }
            .pointerInput(Unit) {
                detectTapGestures(
                    onDoubleTap = {
                        // Reset zoom on double tap
                        zoom = 1f
                        offset = Offset.Zero
                    }
                )
            },
        contentAlignment = Alignment.Center
    ) {
        SubcomposeAsyncImage(
            model = ImageRequest.Builder(context)
                .data(url)
                .crossfade(true)
                .build(),
            contentDescription = contentDescription,
            modifier = Modifier
                .fillMaxSize()
                .graphicsLayer {
                    scaleX = zoom
                    scaleY = zoom
                    translationX = offset.x
                    translationY = offset.y
                },
            contentScale = ContentScale.Fit,
            loading = {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
                    ) {
                        CircularProgressIndicator(color = Primary600)
                        Text(
                            text = "Loading image...",
                            style = AppTypography.secondary,
                            color = AppColors.textSecondary
                        )
                    }
                }
            },
            error = {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
                    ) {
                        Text(
                            text = "Failed to load image",
                            style = AppTypography.heading3,
                            color = AppColors.textPrimary
                        )
                        Text(
                            text = "The image could not be loaded",
                            style = AppTypography.secondary,
                            color = AppColors.textSecondary
                        )
                    }
                }
            }
        )
    }
}
