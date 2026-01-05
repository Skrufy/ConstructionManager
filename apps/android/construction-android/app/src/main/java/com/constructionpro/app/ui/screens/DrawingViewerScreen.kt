package com.constructionpro.app.ui.screens

import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.changedToUp
import androidx.compose.ui.input.pointer.consumePositionChange
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.CloudSync
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Straighten
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import com.constructionpro.app.ui.theme.AppColors
import com.constructionpro.app.ui.theme.AppTypography
import com.constructionpro.app.ui.theme.ConstructionOrange
import com.constructionpro.app.ui.theme.ConstructionRed
import androidx.compose.material3.Scaffold
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Snackbar
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import android.content.res.Configuration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.constructionpro.app.R
import com.constructionpro.app.data.model.AnnotationDraft
import com.constructionpro.app.data.model.AnnotationTool
import com.constructionpro.app.data.model.AnnotationType
import com.constructionpro.app.data.model.NormalizedPoint
import com.constructionpro.app.ui.drawing.AnnotationCanvas
import com.constructionpro.app.ui.drawing.AnnotationRenderer
import com.constructionpro.app.ui.drawing.AnnotationToolbar
import com.constructionpro.app.ui.drawing.CalibrationDialog
import com.constructionpro.app.ui.drawing.CalibrationHintOverlay
import com.constructionpro.app.ui.drawing.PinEntityModal
import com.constructionpro.app.ui.drawing.findAnnotationAt
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import java.io.File
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.local.AppDatabase

/**
 * Entry point composable that creates the ViewModel and initializes the viewer.
 * Matches pattern used in other screens.
 */
@Composable
fun DrawingViewerScreen(
    apiService: ApiService,
    drawingId: String,
    drawingTitle: String = "",
    projectId: String = "",
    fileId: String = "",
    onBack: () -> Unit,
    onNavigateToDrawing: (String) -> Unit = {}
) {
    val context = LocalContext.current
    val db = remember { AppDatabase.getInstance(context) }
    val json = remember { Json { ignoreUnknownKeys = true } }
    val authTokenStore = remember { com.constructionpro.app.data.AuthTokenStore(context) }

    val viewModel = remember(drawingId) {
        DrawingViewerViewModel(
            apiService = apiService,
            annotationDao = db.annotationDao(),
            drawingDao = db.drawingDao(),
            drawingScaleDao = db.drawingScaleDao(),
            documentCacheDao = db.documentCacheDao(),
            pendingActionDao = db.pendingActionDao(),
            authTokenStore = authTokenStore,
            json = json
        )
    }

    // Set navigation callback
    viewModel.onNavigateToDrawing = onNavigateToDrawing

    // Initialize the ViewModel when drawingId changes
    LaunchedEffect(drawingId) {
        viewModel.initialize(
            drawingId = drawingId,
            title = drawingTitle,
            projectId = projectId,
            fileId = fileId.ifEmpty { drawingId },
            context = context
        )
    }

    // Clear annotations when leaving the page
    DisposableEffect(Unit) {
        onDispose {
            viewModel.clearAnnotations()
        }
    }

    DrawingViewerContent(
        viewModel = viewModel,
        onNavigateBack = onBack
    )
}

/**
 * Full-featured Drawing Viewer with annotation tools.
 * Matches web app's DrawingViewer component.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DrawingViewerContent(
    viewModel: DrawingViewerViewModel,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    // Detect landscape mode to hide top bar for more drawing visibility
    val configuration = LocalConfiguration.current
    val isLandscape = configuration.orientation == Configuration.ORIENTATION_LANDSCAPE

    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()

    // PDF state
    var pdfBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var pageWidth by remember { mutableFloatStateOf(0f) }
    var pageHeight by remember { mutableFloatStateOf(0f) }

    // Transform state for pan/zoom
    var scale by remember { mutableFloatStateOf(1f) }
    var offsetX by remember { mutableFloatStateOf(0f) }
    var offsetY by remember { mutableFloatStateOf(0f) }

    // Menu state
    var showMenu by remember { mutableStateOf(false) }
    var showClearConfirmation by remember { mutableStateOf(false) }

    // Load PDF page
    LaunchedEffect(viewModel.pdfFile, viewModel.currentPage) {
        viewModel.pdfFile?.let { file ->
            withContext(Dispatchers.IO) {
                try {
                    val pfd = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
                    val renderer = PdfRenderer(pfd)
                    val page = renderer.openPage(viewModel.currentPage)

                    // Calculate scale to fit within max bitmap size while preserving quality
                    // Max 100MB for bitmap (4 bytes per pixel ARGB_8888)
                    // That's ~25 million pixels max = 5000x5000 for square or equivalent
                    val maxPixels = 25_000_000
                    val pagePixels = page.width * page.height

                    // Scale up for quality, but cap to avoid memory issues
                    val displayMetrics = context.resources.displayMetrics
                    val desiredScale = displayMetrics.density * 2
                    val desiredPixels = (page.width * desiredScale * page.height * desiredScale).toLong()

                    val scaleFactor = if (desiredPixels > maxPixels) {
                        // Scale down to fit within max pixels while maintaining aspect ratio
                        kotlin.math.sqrt(maxPixels.toDouble() / pagePixels.toDouble()).toFloat()
                    } else {
                        desiredScale
                    }

                    val bitmapWidth = (page.width * scaleFactor).toInt().coerceAtLeast(1)
                    val bitmapHeight = (page.height * scaleFactor).toInt().coerceAtLeast(1)

                    val bitmap = Bitmap.createBitmap(
                        bitmapWidth,
                        bitmapHeight,
                        Bitmap.Config.ARGB_8888
                    )
                    // Fill with white background before rendering PDF
                    bitmap.eraseColor(android.graphics.Color.WHITE)
                    page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)

                    withContext(Dispatchers.Main) {
                        pdfBitmap = bitmap
                        pageWidth = bitmap.width.toFloat()
                        pageHeight = bitmap.height.toFloat()
                    }

                    page.close()
                    renderer.close()
                    pfd.close()
                } catch (e: Exception) {
                    // Handle error
                }
            }
        }
    }

    // Show error in snackbar
    LaunchedEffect(error) {
        error?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearError()
        }
    }

    Scaffold(
        topBar = {
            // Hide top bar in landscape mode for more drawing visibility
            if (!isLandscape) {
                TopAppBar(
                    title = {
                        Column {
                            // Drawing number (e.g., "C0.00")
                            if (viewModel.drawingNumber.isNotBlank()) {
                                Text(
                                    text = viewModel.drawingNumber,
                                    style = AppTypography.heading3,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                            // Drawing title (e.g., "Cover Sheet")
                            if (viewModel.drawingTitle.isNotBlank()) {
                                Text(
                                    text = viewModel.drawingTitle,
                                    style = AppTypography.body,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                            // Page indicator
                            Text(
                                text = "Page ${viewModel.currentPage + 1} of ${viewModel.pageCount}",
                                style = AppTypography.secondary,
                                color = AppColors.textSecondary
                            )
                        }
                    },
                    navigationIcon = {
                        IconButton(onClick = onNavigateBack) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = stringResource(R.string.common_back)
                            )
                        }
                    },
                    actions = {
                        // Offline indicator
                        if (viewModel.isOffline) {
                            Surface(
                                color = ConstructionRed.copy(alpha = 0.1f),
                                shape = RoundedCornerShape(4.dp)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.CloudOff,
                                        contentDescription = null,
                                        tint = ConstructionRed,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Text(
                                        text = "Offline",
                                        style = AppTypography.caption,
                                        color = ConstructionRed
                                    )
                                }
                            }
                        } else if (viewModel.pendingChangesCount > 0) {
                            Surface(
                                color = ConstructionOrange.copy(alpha = 0.1f),
                                shape = RoundedCornerShape(4.dp)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.CloudSync,
                                        contentDescription = null,
                                        tint = ConstructionOrange,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Text(
                                        text = "${viewModel.pendingChangesCount}",
                                        style = AppTypography.caption,
                                        color = ConstructionOrange
                                    )
                                }
                            }
                        }

                        // Menu
                        IconButton(onClick = { showMenu = true }) {
                            Icon(
                                imageVector = Icons.Default.MoreVert,
                                contentDescription = "More options"
                            )
                        }

                        DropdownMenu(
                            expanded = showMenu,
                            onDismissRequest = { showMenu = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("Toggle annotations") },
                                onClick = {
                                    viewModel.toggleAnnotationsVisibility()
                                    showMenu = false
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Toggle resolved") },
                                onClick = {
                                    viewModel.toggleResolvedVisibility()
                                    showMenu = false
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Calibrate scale") },
                                onClick = {
                                    viewModel.startCalibration()
                                    showMenu = false
                                },
                                leadingIcon = {
                                    Icon(
                                        imageVector = Icons.Default.Straighten,
                                        contentDescription = null
                                    )
                                }
                            )
                            if (viewModel.annotations.isNotEmpty()) {
                                DropdownMenuItem(
                                    text = { Text("Clear all annotations") },
                                    onClick = {
                                        showMenu = false
                                        showClearConfirmation = true
                                    },
                                    leadingIcon = {
                                        Icon(
                                            imageVector = Icons.Default.Delete,
                                            contentDescription = null,
                                            tint = AppColors.error
                                        )
                                    }
                                )
                            }
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = AppColors.cardBackground
                    )
                )
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        modifier = modifier
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFF2A2A2A))
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center)
                )
            } else if (viewModel.isDownloading) {
                // Download progress UI
                Column(
                    modifier = Modifier.align(Alignment.Center),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    CircularProgressIndicator()
                    Text(
                        text = "Downloading PDF...",
                        color = Color.White,
                        style = AppTypography.body
                    )
                    Text(
                        text = "${viewModel.downloadProgress}%",
                        color = Color.White.copy(alpha = 0.7f),
                        style = AppTypography.secondary
                    )
                }
            } else if (viewModel.downloadError != null) {
                // Download error UI
                Column(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.CloudOff,
                        contentDescription = null,
                        tint = AppColors.error,
                        modifier = Modifier.size(48.dp)
                    )
                    Text(
                        text = viewModel.downloadError ?: "Download failed",
                        color = Color.White,
                        style = AppTypography.body
                    )
                }
            } else if (pdfBitmap == null && viewModel.pdfFile == null) {
                // No PDF available
                Column(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.CloudOff,
                        contentDescription = null,
                        tint = Color.White.copy(alpha = 0.5f),
                        modifier = Modifier.size(48.dp)
                    )
                    Text(
                        text = "PDF not available",
                        color = Color.White,
                        style = AppTypography.body
                    )
                    Text(
                        text = "The drawing file could not be loaded",
                        color = Color.White.copy(alpha = 0.7f),
                        style = AppTypography.secondary
                    )
                }
            } else {
                // Container for PDF and annotations
                // Put gesture detection HERE (on the parent Box) so it always receives touches
                // regardless of pan/zoom transformations
                val pdfBitmapForGestures = pdfBitmap
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .then(
                            // Annotation drawing gestures (when not in SELECT, PAN, or CALIBRATE mode)
                            if (viewModel.currentTool != AnnotationTool.SELECT &&
                                viewModel.currentTool != AnnotationTool.PAN &&
                                viewModel.currentTool != AnnotationTool.CALIBRATE &&
                                pdfBitmapForGestures != null) {
                                Modifier.pointerInput(viewModel.currentTool) {
                                    val bitmapWidth = pdfBitmapForGestures.width.toFloat()
                                    val bitmapHeight = pdfBitmapForGestures.height.toFloat()
                                    val canvasWidthPx = size.width.toFloat()
                                    val canvasHeightPx = size.height.toFloat()

                                    // Detect drawing gestures with immediate response
                                    awaitPointerEventScope {
                                        while (true) {
                                            // Wait for initial press
                                            val down = awaitFirstDown(requireUnconsumed = false)
                                            val downPosition = down.position

                                            // Start drawing immediately on press (no delay)
                                            handleDragStart(viewModel, downPosition, bitmapWidth, bitmapHeight, canvasWidthPx, canvasHeightPx, scale, offsetX, offsetY)

                                            var dragInProgress = true
                                            while (dragInProgress) {
                                                val event = awaitPointerEvent()
                                                val change = event.changes.firstOrNull() ?: break

                                                if (change.pressed) {
                                                    // Continue dragging
                                                    handleDrag(viewModel, change.position, bitmapWidth, bitmapHeight, canvasWidthPx, canvasHeightPx, scale, offsetX, offsetY)
                                                } else {
                                                    // Finger lifted - end drag
                                                    handleDragEnd(viewModel, bitmapWidth, bitmapHeight)
                                                    dragInProgress = false
                                                }
                                            }
                                        }
                                    }
                                }
                            } else Modifier
                        )
                        .then(
                            // Tap gestures for SELECT mode, point-based tools, and calibration
                            if (pdfBitmapForGestures != null &&
                                (viewModel.currentTool == AnnotationTool.SELECT ||
                                 viewModel.currentTool == AnnotationTool.PIN ||
                                 viewModel.currentTool == AnnotationTool.COMMENT ||
                                 viewModel.currentTool == AnnotationTool.CALLOUT ||
                                 viewModel.currentTool == AnnotationTool.AREA ||
                                 viewModel.currentTool == AnnotationTool.CALIBRATE)) {
                                Modifier.pointerInput(viewModel.currentTool) {
                                    val bitmapWidth = pdfBitmapForGestures.width.toFloat()
                                    val bitmapHeight = pdfBitmapForGestures.height.toFloat()
                                    val canvasWidthPx = size.width.toFloat()
                                    val canvasHeightPx = size.height.toFloat()

                                    detectTapGestures(
                                        onTap = { offset ->
                                            handleTap(viewModel, offset, bitmapWidth, bitmapHeight, canvasWidthPx, canvasHeightPx, scale, offsetX, offsetY)
                                        },
                                        onDoubleTap = { offset ->
                                            handleDoubleTap(viewModel, offset, bitmapWidth, bitmapHeight, canvasWidthPx, canvasHeightPx, scale, offsetX, offsetY)
                                        },
                                        onLongPress = { offset ->
                                            handleLongPress(viewModel, offset, bitmapWidth, bitmapHeight, canvasWidthPx, canvasHeightPx, scale, offsetX, offsetY)
                                        }
                                    )
                                }
                            } else Modifier
                        )
                        .then(
                            // Pan/zoom gestures for PAN mode
                            if (viewModel.currentTool == AnnotationTool.PAN) {
                                Modifier.pointerInput(Unit) {
                                    detectTransformGestures { centroid, pan, zoom, _ ->
                                        val oldScale = scale
                                        val newScale = (oldScale * zoom).coerceIn(0.5f, 5f)

                                        // Adjust offset to zoom toward the centroid point
                                        if (oldScale != newScale) {
                                            val scaleRatio = newScale / oldScale
                                            // Calculate how the content position should change based on zoom center
                                            val centerX = size.width / 2f
                                            val centerY = size.height / 2f
                                            // Adjust offset to keep zoom centered on touch point
                                            offsetX = centroid.x - (centroid.x - offsetX) * scaleRatio
                                            offsetY = centroid.y - (centroid.y - offsetY) * scaleRatio
                                        }

                                        scale = newScale
                                        offsetX += pan.x
                                        offsetY += pan.y

                                        // Reset to center when scale is back to ~1.0
                                        if (newScale < 1.1f && newScale > 0.9f) {
                                            // Gently pull back to center when near 1:1
                                            offsetX *= 0.95f
                                            offsetY *= 0.95f
                                        }
                                    }
                                }
                            } else Modifier
                        )
                ) {
                    // PDF Canvas with transformations applied
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .graphicsLayer(
                                scaleX = scale,
                                scaleY = scale,
                                translationX = offsetX,
                                translationY = offsetY
                            )
                    ) {
                        pdfBitmap?.let { bitmap ->
                            Canvas(
                                modifier = Modifier.fillMaxSize()
                            ) {
                                drawImage(
                                    image = bitmap.asImageBitmap(),
                                    topLeft = Offset(
                                        (size.width - bitmap.width) / 2,
                                        (size.height - bitmap.height) / 2
                                    )
                                )
                            }
                        }
                    }

                    // Annotation overlay - must have same transformations as PDF to stay pinned
                    pdfBitmap?.let { bitmap ->
                        val bitmapWidth = bitmap.width.toFloat()
                        val bitmapHeight = bitmap.height.toFloat()

                        BoxWithConstraints(
                            modifier = Modifier
                                .fillMaxSize()
                                .graphicsLayer(
                                    scaleX = scale,
                                    scaleY = scale,
                                    translationX = offsetX,
                                    translationY = offsetY
                                )
                        ) {
                            val canvasWidthPx = with(LocalDensity.current) { maxWidth.toPx() }
                            val canvasHeightPx = with(LocalDensity.current) { maxHeight.toPx() }

                            AnnotationCanvas(
                                modifier = Modifier.fillMaxSize(),
                                annotations = viewModel.annotations,
                                drawingState = viewModel.drawingState,
                                selectedAnnotationId = viewModel.selectedAnnotationId,
                                currentTool = AnnotationTool.SELECT, // Disable gesture detection in AnnotationCanvas
                                currentColor = viewModel.currentColor,
                                currentPageNumber = viewModel.currentPage,
                                pageWidth = bitmapWidth,
                                pageHeight = bitmapHeight,
                                canvasWidth = canvasWidthPx,
                                canvasHeight = canvasHeightPx,
                                showAnnotations = viewModel.showAnnotations,
                                showResolvedAnnotations = viewModel.showResolvedAnnotations,
                                currentScale = viewModel.currentScale,
                                onTap = {}, // Gestures handled at parent level now
                                onDoubleTap = {},
                                onLongPress = {},
                                onDragStart = {},
                                onDrag = {},
                                onDragEnd = {},
                                onAnnotationTap = {},
                                onPan = { _, _ -> }
                            )
                        }
                    }

                    // Calibration hint overlay
                    CalibrationHintOverlay(
                        isActive = viewModel.isCalibrating,
                        step = when {
                            viewModel.calibrationStart == null -> 0
                            viewModel.calibrationEnd == null -> 1
                            else -> 2
                        },
                        modifier = Modifier.align(Alignment.TopCenter)
                    )

                    // Calibration line preview
                    if (viewModel.isCalibrating && viewModel.calibrationStart != null && viewModel.calibrationEnd != null) {
                        pdfBitmap?.let { bitmap ->
                            val bitmapWidth = bitmap.width.toFloat()
                            val bitmapHeight = bitmap.height.toFloat()
                            val primaryColor = AppColors.primary600

                            BoxWithConstraints(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .graphicsLayer(
                                        scaleX = scale,
                                        scaleY = scale,
                                        translationX = offsetX,
                                        translationY = offsetY
                                    )
                            ) {
                                val canvasWidthPx = with(LocalDensity.current) { maxWidth.toPx() }
                                val canvasHeightPx = with(LocalDensity.current) { maxHeight.toPx() }

                                Canvas(modifier = Modifier.fillMaxSize()) {
                                    val start = AnnotationRenderer.toScreenCoords(
                                        viewModel.calibrationStart!!,
                                        bitmapWidth,
                                        bitmapHeight,
                                        canvasWidthPx,
                                        canvasHeightPx
                                    )
                                    val end = AnnotationRenderer.toScreenCoords(
                                        viewModel.calibrationEnd!!,
                                        bitmapWidth,
                                        bitmapHeight,
                                        canvasWidthPx,
                                        canvasHeightPx
                                    )

                                    // Draw calibration line
                                    drawLine(
                                        color = primaryColor,
                                        start = start,
                                        end = end,
                                        strokeWidth = 3.dp.toPx(),
                                        cap = androidx.compose.ui.graphics.StrokeCap.Round
                                    )

                                    // Draw endpoints
                                    drawCircle(
                                        color = primaryColor,
                                        radius = 6.dp.toPx(),
                                        center = start
                                    )
                                    drawCircle(
                                        color = primaryColor,
                                        radius = 6.dp.toPx(),
                                        center = end
                                    )
                                }
                            }
                        }
                    }

                    // Low opacity exit button in landscape mode (top-left corner)
                    if (isLandscape) {
                        IconButton(
                            onClick = onNavigateBack,
                            modifier = Modifier
                                .align(Alignment.TopStart)
                                .padding(8.dp)
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(Color.Black.copy(alpha = 0.3f))
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Exit",
                                tint = Color.White.copy(alpha = 0.7f),
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }

                    // Delete button for selected annotation
                    if (viewModel.selectedAnnotationId != null) {
                        FloatingActionButton(
                            onClick = {
                                viewModel.selectedAnnotationId?.let { id ->
                                    viewModel.deleteAnnotation(id)
                                }
                            },
                            containerColor = ConstructionRed.copy(alpha = 0.1f),
                            contentColor = ConstructionRed,
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(16.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Delete,
                                contentDescription = stringResource(R.string.common_delete)
                            )
                        }
                    }

                    // Floating toolbar
                    AnnotationToolbar(
                        currentTool = viewModel.currentTool,
                        currentColor = viewModel.currentColor,
                        showAnnotations = viewModel.showAnnotations,
                        canUndo = viewModel.historyManager.canUndo,
                        canRedo = viewModel.historyManager.canRedo,
                        isVisible = true,
                        onToolSelected = { viewModel.selectTool(it) },
                        onColorSelected = { viewModel.selectColor(it) },
                        onUndo = { viewModel.undo() },
                        onRedo = { viewModel.redo() },
                        onToggleAnnotations = { viewModel.toggleAnnotationsVisibility() },
                        onCalibrate = { viewModel.showCalibrationDialog = true },
                        modifier = Modifier.align(Alignment.BottomCenter)
                    )
                }
            }
        }
    }

    // PIN Entity Modal
    PinEntityModal(
        isVisible = viewModel.showPinModal,
        pinPosition = viewModel.pendingPinPosition ?: NormalizedPoint.ZERO,
        pageNumber = viewModel.currentPage,
        currentColor = viewModel.currentColor,
        existingPin = viewModel.editingPin,
        projectId = viewModel.projectId,
        entities = viewModel.entitySearchResults,
        isSearching = viewModel.isSearchingEntities,
        onSearch = { type, query -> viewModel.searchEntities(type, query) },
        onSave = { pin ->
            if (viewModel.editingPin != null) {
                viewModel.updateAnnotation(pin)
            } else {
                viewModel.addAnnotation(pin)
            }
            viewModel.dismissPinModal()
        },
        onDelete = viewModel.editingPin?.let {
            { viewModel.deleteAnnotation(it.id ?: "") }
        },
        onDismiss = { viewModel.dismissPinModal() }
    )

    // Calibration Dialog
    CalibrationDialog(
        isVisible = viewModel.showCalibrationDialog,
        currentScale = viewModel.currentScale,
        calibrationPoints = viewModel.calibrationStart?.let { start ->
            viewModel.calibrationEnd?.let { end ->
                start to end
            }
        },
        pixelDistance = viewModel.calibrationStart?.let { start ->
            viewModel.calibrationEnd?.let { end ->
                pdfBitmap?.let { bitmap ->
                    val pageWidth = bitmap.width.toFloat()
                    val pageHeight = bitmap.height.toFloat()
                    kotlin.math.sqrt(
                        (end.x - start.x) * (end.x - start.x) * pageWidth * pageWidth +
                        (end.y - start.y) * (end.y - start.y) * pageHeight * pageHeight
                    )
                }
            }
        },
        onScaleSelected = { scale ->
            viewModel.applyScale(scale)
        },
        onStartCalibration = {
            viewModel.startCalibration()
        },
        onDismiss = { viewModel.dismissCalibrationDialog() }
    )

    // Clear All Annotations Confirmation Dialog
    if (showClearConfirmation) {
        AlertDialog(
            onDismissRequest = { showClearConfirmation = false },
            title = { Text("Clear All Annotations?") },
            text = {
                Text("This will permanently delete all ${viewModel.annotations.size} annotation(s) you've made on this drawing. This action cannot be undone.")
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showClearConfirmation = false
                        viewModel.clearAllAnnotationsFromServer()
                    }
                ) {
                    Text("Clear All", color = AppColors.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showClearConfirmation = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

// ============ GESTURE HANDLERS ============

/**
 * Inverse-transform coordinates from graphicsLayer-transformed space back to screen space.
 * When the AnnotationCanvas is inside a graphicsLayer, touch events receive transformed coordinates.
 * We need to inverse-transform them before converting to normalized PDF coordinates.
 */
private fun inverseTransformOffset(
    transformedOffset: Offset,
    canvasWidth: Float,
    canvasHeight: Float,
    scale: Float,
    offsetX: Float,
    offsetY: Float
): Offset {
    // The graphicsLayer transformations are applied in order: scale, then translate
    // To inverse: first remove translation, then remove scale (around center)

    val centerX = canvasWidth / 2f
    val centerY = canvasHeight / 2f

    // Remove translation
    val untranslatedX = transformedOffset.x - offsetX
    val untranslatedY = transformedOffset.y - offsetY

    // Remove scale (applied around center)
    val screenX = centerX + (untranslatedX - centerX) / scale
    val screenY = centerY + (untranslatedY - centerY) / scale

    return Offset(screenX, screenY)
}

private fun handleTap(
    viewModel: DrawingViewerViewModel,
    offset: Offset,
    pageWidth: Float,
    pageHeight: Float,
    canvasWidth: Float,
    canvasHeight: Float,
    currentScale: Float,
    currentOffsetX: Float,
    currentOffsetY: Float
) {
    // pointerInput gives us local coordinates (not transformed by graphicsLayer)
    // so we use them directly without inverse transform
    val normalizedPoint = AnnotationRenderer.toNormalizedCoords(offset, pageWidth, pageHeight, canvasWidth, canvasHeight)

    when (viewModel.currentTool) {
        AnnotationTool.PIN -> {
            viewModel.showPinModalForPosition(normalizedPoint)
        }
        AnnotationTool.COMMENT -> {
            val annotation = AnnotationDraft(
                type = AnnotationType.COMMENT,
                pageNumber = viewModel.currentPage,
                position = normalizedPoint,
                color = viewModel.currentColor,
                isPending = true
            )
            viewModel.addAnnotation(annotation)
        }
        AnnotationTool.CALLOUT -> {
            // First tap - will need to capture second tap for leader
            // For now, create callout without leader
            val annotation = AnnotationDraft(
                type = AnnotationType.CALLOUT,
                pageNumber = viewModel.currentPage,
                position = normalizedPoint,
                color = viewModel.currentColor,
                isPending = true
            )
            viewModel.addAnnotation(annotation)
        }
        AnnotationTool.CALIBRATE -> {
            viewModel.setCalibrationPoint(normalizedPoint)
        }
        AnnotationTool.AREA -> {
            // Add point to area polygon
            viewModel.addAreaPoint(normalizedPoint)
        }
        AnnotationTool.SELECT -> {
            // Check if we tapped on an annotation
            val hitAnnotation = findAnnotationAt(
                annotations = viewModel.annotations,
                screenPoint = offset,
                pageWidth = pageWidth,
                pageHeight = pageHeight,
                canvasWidth = canvasWidth,
                canvasHeight = canvasHeight,
                pageNumber = viewModel.currentPage,
                tolerance = 20f
            )

            if (hitAnnotation != null) {
                // If tapping on an already-selected annotation, delete it
                if (hitAnnotation.id == viewModel.selectedAnnotationId) {
                    hitAnnotation.id?.let { viewModel.deleteAnnotation(it) }
                } else {
                    // Select this annotation
                    viewModel.selectAnnotation(hitAnnotation.id)
                }
            } else {
                viewModel.selectAnnotation(null)
            }
        }
        else -> {
            // Other tools - deselect any selected annotation
            viewModel.selectAnnotation(null)
        }
    }
}

private fun handleDoubleTap(
    viewModel: DrawingViewerViewModel,
    offset: Offset,
    pageWidth: Float,
    pageHeight: Float,
    canvasWidth: Float,
    canvasHeight: Float,
    currentScale: Float,
    currentOffsetX: Float,
    currentOffsetY: Float
) {
    // Inverse-transform from graphicsLayer space to screen space
    val screenOffset = inverseTransformOffset(offset, canvasWidth, canvasHeight, currentScale, currentOffsetX, currentOffsetY)
    when (viewModel.currentTool) {
        AnnotationTool.AREA -> {
            // Close the polygon and create annotation
            viewModel.completeAreaAnnotation()
        }
        AnnotationTool.SELECT -> {
            // Open annotation for editing
            val selectedId = viewModel.selectedAnnotationId
            if (selectedId != null) {
                val annotation = viewModel.annotations.find { it.id == selectedId }
                if (annotation?.type == AnnotationType.PIN) {
                    viewModel.showPinModalForEditing(annotation)
                }
            }
        }
        else -> {}
    }
}

private fun handleLongPress(
    viewModel: DrawingViewerViewModel,
    offset: Offset,
    pageWidth: Float,
    pageHeight: Float,
    canvasWidth: Float,
    canvasHeight: Float,
    currentScale: Float,
    currentOffsetX: Float,
    currentOffsetY: Float
) {
    // Gestures are at parent level, so use offset directly (no inverse transform needed)
    // Find annotation at position
    val annotation = findAnnotationAt(
        annotations = viewModel.annotations,
        screenPoint = offset,
        pageWidth = pageWidth,
        pageHeight = pageHeight,
        canvasWidth = canvasWidth,
        canvasHeight = canvasHeight,
        pageNumber = viewModel.currentPage,
        tolerance = 20f
    )

    annotation?.let {
        // Select the annotation and delete it
        val annotationId = it.id ?: return
        viewModel.selectAnnotation(annotationId)
        viewModel.deleteAnnotation(annotationId)
    }
}

private var dragStartPoint: NormalizedPoint? = null

private fun handleDragStart(
    viewModel: DrawingViewerViewModel,
    offset: Offset,
    pageWidth: Float,
    pageHeight: Float,
    canvasWidth: Float,
    canvasHeight: Float,
    currentScale: Float,
    currentOffsetX: Float,
    currentOffsetY: Float
) {
    // Inverse-transform from graphicsLayer space to screen space
    val screenOffset = inverseTransformOffset(offset, canvasWidth, canvasHeight, currentScale, currentOffsetX, currentOffsetY)
    val normalizedPoint = AnnotationRenderer.toNormalizedCoords(screenOffset, pageWidth, pageHeight, canvasWidth, canvasHeight)
    dragStartPoint = normalizedPoint

    // Handle calibration drag start
    if (viewModel.currentTool == AnnotationTool.CALIBRATE) {
        viewModel.calibrationStart = normalizedPoint
        viewModel.calibrationEnd = null
    }
}

private fun handleDrag(
    viewModel: DrawingViewerViewModel,
    offset: Offset,
    pageWidth: Float,
    pageHeight: Float,
    canvasWidth: Float,
    canvasHeight: Float,
    currentScale: Float,
    currentOffsetX: Float,
    currentOffsetY: Float
) {
    // Inverse-transform from graphicsLayer space to screen space
    val screenOffset = inverseTransformOffset(offset, canvasWidth, canvasHeight, currentScale, currentOffsetX, currentOffsetY)
    val currentPoint = AnnotationRenderer.toNormalizedCoords(screenOffset, pageWidth, pageHeight, canvasWidth, canvasHeight)
    val startPoint = dragStartPoint ?: return

    // Handle calibration drag (update end point for preview)
    if (viewModel.currentTool == AnnotationTool.CALIBRATE) {
        viewModel.calibrationEnd = currentPoint
        return
    }

    val tool = viewModel.currentTool
    val annotationType = tool.toAnnotationType() ?: return

    when (annotationType) {
        AnnotationType.LINE,
        AnnotationType.ARROW,
        AnnotationType.MEASUREMENT -> {
            viewModel.updateDrawingState(
                com.constructionpro.app.data.model.DrawingState.Line(
                    start = startPoint,
                    end = currentPoint,
                    type = annotationType,
                    color = viewModel.currentColor
                )
            )
        }
        AnnotationType.RECTANGLE,
        AnnotationType.CIRCLE,
        AnnotationType.CLOUD -> {
            viewModel.updateDrawingState(
                com.constructionpro.app.data.model.DrawingState.Shape(
                    start = startPoint,
                    end = currentPoint,
                    type = annotationType,
                    color = viewModel.currentColor
                )
            )
        }
        AnnotationType.FREEHAND -> {
            val currentState = viewModel.drawingState as? com.constructionpro.app.data.model.DrawingState.Path
            val points = currentState?.points?.toMutableList() ?: mutableListOf(startPoint)
            points.add(currentPoint)
            viewModel.updateDrawingState(
                com.constructionpro.app.data.model.DrawingState.Path(
                    points = points,
                    type = annotationType,
                    color = viewModel.currentColor
                )
            )
        }
        else -> {}
    }
}

private fun handleDragEnd(
    viewModel: DrawingViewerViewModel,
    pageWidth: Float,
    pageHeight: Float
) {
    // Handle calibration drag end (show dialog)
    if (viewModel.currentTool == AnnotationTool.CALIBRATE) {
        if (viewModel.calibrationStart != null && viewModel.calibrationEnd != null) {
            viewModel.showCalibrationDialog = true
        }
        dragStartPoint = null
        return
    }

    val state = viewModel.drawingState ?: return
    val startPoint = dragStartPoint ?: return

    when (state) {
        is com.constructionpro.app.data.model.DrawingState.Line -> {
            val annotation = AnnotationDraft(
                type = state.type,
                pageNumber = viewModel.currentPage,
                position = state.start,
                endPoint = state.end,
                color = viewModel.currentColor,
                isPending = true
            )
            viewModel.addAnnotation(annotation)
        }
        is com.constructionpro.app.data.model.DrawingState.Shape -> {
            val minX = minOf(state.start.x, state.end.x)
            val minY = minOf(state.start.y, state.end.y)
            val maxX = maxOf(state.start.x, state.end.x)
            val maxY = maxOf(state.start.y, state.end.y)

            val annotation = AnnotationDraft(
                type = state.type,
                pageNumber = viewModel.currentPage,
                position = NormalizedPoint(minX, minY),
                width = maxX - minX,
                height = maxY - minY,
                color = viewModel.currentColor,
                isPending = true
            )
            viewModel.addAnnotation(annotation)
        }
        is com.constructionpro.app.data.model.DrawingState.Path -> {
            if (state.points.size >= 2) {
                val annotation = AnnotationDraft(
                    type = state.type,
                    pageNumber = viewModel.currentPage,
                    position = state.points.first(),
                    points = state.points,
                    color = viewModel.currentColor,
                    isPending = true
                )
                viewModel.addAnnotation(annotation)
            }
        }
        else -> {}
    }

    viewModel.updateDrawingState(null)
    dragStartPoint = null
}
