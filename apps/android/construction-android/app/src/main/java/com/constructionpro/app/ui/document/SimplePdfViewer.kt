package com.constructionpro.app.ui.document

import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import android.util.LruCache
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import com.constructionpro.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.Closeable
import java.io.File

/**
 * Simple view-only PDF viewer with zoom/pan support
 * No annotation tools - just viewing
 */
@Composable
fun SimplePdfViewer(
    filePath: String,
    modifier: Modifier = Modifier
) {
    var pageIndex by remember { mutableStateOf(0) }
    var pageCount by remember { mutableStateOf(1) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    // Load page count
    LaunchedEffect(filePath) {
        isLoading = true
        error = null
        try {
            val count = withContext(Dispatchers.IO) {
                val file = File(filePath)
                if (!file.exists()) {
                    throw IllegalStateException("PDF file not found")
                }
                val descriptor = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
                val renderer = PdfRenderer(descriptor)
                val total = renderer.pageCount
                renderer.close()
                descriptor.close()
                total
            }
            pageCount = count.coerceAtLeast(1)
            isLoading = false
        } catch (e: Exception) {
            error = e.message ?: "Failed to load PDF"
            isLoading = false
        }
    }

    Column(modifier = modifier.fillMaxSize()) {
        when {
            isLoading -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = Primary600)
                }
            }
            error != null -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "Failed to load PDF",
                            style = AppTypography.heading3,
                            color = AppColors.textPrimary
                        )
                        Spacer(modifier = Modifier.height(AppSpacing.sm))
                        Text(
                            text = error ?: "",
                            style = AppTypography.secondary,
                            color = AppColors.textSecondary
                        )
                    }
                }
            }
            else -> {
                // PDF Page Viewer
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                ) {
                    PdfPageView(
                        filePath = filePath,
                        pageIndex = pageIndex
                    )
                }

                // Page Navigation
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = AppColors.cardBackground,
                    shadowElevation = 4.dp
                ) {
                    Column {
                        // Thumbnail Strip
                        if (pageCount > 1) {
                            PdfThumbnails(
                                filePath = filePath,
                                pageCount = pageCount,
                                selectedPage = pageIndex,
                                onSelectPage = { pageIndex = it }
                            )
                        }

                        // Page Controls
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(AppSpacing.sm),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            IconButton(
                                onClick = { if (pageIndex > 0) pageIndex -= 1 },
                                enabled = pageIndex > 0
                            ) {
                                Icon(
                                    imageVector = Icons.Default.ChevronLeft,
                                    contentDescription = "Previous page",
                                    tint = if (pageIndex > 0) Primary600 else AppColors.textMuted
                                )
                            }

                            Text(
                                text = "Page ${pageIndex + 1} of $pageCount",
                                style = AppTypography.heading3,
                                color = AppColors.textPrimary
                            )

                            IconButton(
                                onClick = { if (pageIndex < pageCount - 1) pageIndex += 1 },
                                enabled = pageIndex < pageCount - 1
                            ) {
                                Icon(
                                    imageVector = Icons.Default.ChevronRight,
                                    contentDescription = "Next page",
                                    tint = if (pageIndex < pageCount - 1) Primary600 else AppColors.textMuted
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

/**
 * Single PDF page with zoom/pan gestures
 */
@Composable
private fun PdfPageView(
    filePath: String,
    pageIndex: Int
) {
    val renderer = rememberSimplePdfRenderer(filePath)
    val density = LocalDensity.current
    var bitmap by remember(filePath, pageIndex) { mutableStateOf<Bitmap?>(null) }
    var isLoading by remember(filePath, pageIndex) { mutableStateOf(true) }

    var zoom by remember { mutableStateOf(1f) }
    var offset by remember { mutableStateOf(Offset.Zero) }

    // Reset zoom when page changes
    LaunchedEffect(pageIndex) {
        zoom = 1f
        offset = Offset.Zero
    }

    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
        val targetWidthPx = with(density) { maxWidth.toPx() }.toInt().coerceAtLeast(1)

        LaunchedEffect(filePath, pageIndex, targetWidthPx) {
            isLoading = true
            val rendered = withContext(Dispatchers.IO) {
                renderer?.renderPage(pageIndex, targetWidthPx)
            }
            bitmap = rendered
            isLoading = false
        }

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(AppColors.gray100)
                .pointerInput(Unit) {
                    detectTransformGestures { _, pan, zoomChange, _ ->
                        val nextZoom = (zoom * zoomChange).coerceIn(0.5f, 5f)
                        zoom = nextZoom
                        offset += pan
                    }
                },
            contentAlignment = Alignment.Center
        ) {
            if (isLoading) {
                CircularProgressIndicator(color = Primary600)
            } else {
                bitmap?.let { bmp ->
                    Image(
                        bitmap = bmp.asImageBitmap(),
                        contentDescription = "PDF page ${pageIndex + 1}",
                        modifier = Modifier
                            .fillMaxSize()
                            .graphicsLayer {
                                scaleX = zoom
                                scaleY = zoom
                                translationX = offset.x
                                translationY = offset.y
                            }
                    )
                }
            }
        }
    }
}

/**
 * Thumbnail strip for page navigation
 */
@Composable
private fun PdfThumbnails(
    filePath: String,
    pageCount: Int,
    selectedPage: Int,
    onSelectPage: (Int) -> Unit
) {
    val renderer = rememberSimplePdfRenderer(filePath)
    val density = LocalDensity.current
    val thumbWidth = 72.dp
    val targetWidthPx = with(density) { thumbWidth.toPx() }.toInt().coerceAtLeast(1)

    LazyRow(
        modifier = Modifier
            .fillMaxWidth()
            .height(100.dp)
            .padding(vertical = AppSpacing.xs),
        contentPadding = PaddingValues(horizontal = AppSpacing.sm),
        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
    ) {
        items((0 until pageCount).toList()) { index ->
            var thumbnail by remember(filePath, index) { mutableStateOf<Bitmap?>(null) }

            LaunchedEffect(filePath, index, targetWidthPx) {
                val rendered = withContext(Dispatchers.IO) {
                    renderer?.renderPage(index, targetWidthPx)
                }
                thumbnail = rendered
            }

            Surface(
                modifier = Modifier
                    .width(thumbWidth)
                    .fillMaxHeight()
                    .clickable { onSelectPage(index) },
                shape = RoundedCornerShape(AppSpacing.xs),
                border = if (index == selectedPage) {
                    androidx.compose.foundation.BorderStroke(2.dp, Primary600)
                } else null,
                color = AppColors.gray100
            ) {
                thumbnail?.let { bmp ->
                    Image(
                        bitmap = bmp.asImageBitmap(),
                        contentDescription = "Page ${index + 1}",
                        modifier = Modifier
                            .fillMaxSize()
                            .graphicsLayer {
                                alpha = if (index == selectedPage) 1f else 0.7f
                            }
                    )
                }
            }
        }
    }
}

/**
 * Simple PDF renderer for view-only mode
 */
private class SimplePdfRenderer(filePath: String) : Closeable {
    private val fileDescriptor = ParcelFileDescriptor.open(
        File(filePath),
        ParcelFileDescriptor.MODE_READ_ONLY
    )
    private val renderer = PdfRenderer(fileDescriptor)

    fun renderPage(pageIndex: Int, targetWidthPx: Int): Bitmap? {
        if (pageIndex < 0 || pageIndex >= renderer.pageCount) return null

        val cacheKey = "${fileDescriptor.statSize}|$pageIndex|$targetWidthPx"
        SimplePdfBitmapCache.get(cacheKey)?.let { return it }

        val page = renderer.openPage(pageIndex)
        val scale = targetWidthPx.toFloat() / page.width.toFloat()
        val targetHeight = (page.height * scale).toInt().coerceAtLeast(1)
        val bitmap = Bitmap.createBitmap(targetWidthPx, targetHeight, Bitmap.Config.ARGB_8888)
        page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
        page.close()
        SimplePdfBitmapCache.put(cacheKey, bitmap)
        return bitmap
    }

    val pageCount: Int
        get() = renderer.pageCount

    override fun close() {
        renderer.close()
        fileDescriptor.close()
    }
}

/**
 * LRU cache for PDF bitmaps (64MB)
 */
private object SimplePdfBitmapCache {
    private const val MAX_BYTES = 64 * 1024 * 1024
    private val cache = object : LruCache<String, Bitmap>(MAX_BYTES) {
        override fun sizeOf(key: String, value: Bitmap): Int = value.byteCount
    }

    fun get(key: String): Bitmap? = cache.get(key)
    fun put(key: String, bitmap: Bitmap) = cache.put(key, bitmap)
}

@Composable
private fun rememberSimplePdfRenderer(filePath: String): SimplePdfRenderer? {
    val renderer = remember(filePath) {
        if (filePath.isBlank()) null else {
            try {
                SimplePdfRenderer(filePath)
            } catch (e: Exception) {
                null
            }
        }
    }
    DisposableEffect(renderer) {
        onDispose {
            renderer?.close()
        }
    }
    return renderer
}
