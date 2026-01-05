package com.constructionpro.app.ui.drawing

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.input.pointer.pointerInput
import com.constructionpro.app.data.model.AnnotationDraft
import com.constructionpro.app.data.model.AnnotationTool
import com.constructionpro.app.data.model.AnnotationType
import com.constructionpro.app.data.model.DrawingState
import com.constructionpro.app.data.model.NormalizedPoint

/**
 * Canvas overlay for rendering annotations on PDF pages.
 * Handles both completed annotations and in-progress drawing previews.
 */
@Composable
fun AnnotationCanvas(
    annotations: List<AnnotationDraft>,
    drawingState: DrawingState?,
    selectedAnnotationId: String?,
    currentTool: AnnotationTool,
    currentColor: String,
    currentPageNumber: Int,
    pageWidth: Float,
    pageHeight: Float,
    canvasWidth: Float,
    canvasHeight: Float,
    showAnnotations: Boolean = true,
    showResolvedAnnotations: Boolean = true,
    currentScale: String? = null,
    onTap: (Offset) -> Unit = {},
    onDoubleTap: (Offset) -> Unit = {},
    onLongPress: (Offset) -> Unit = {},
    onDragStart: (Offset) -> Unit = {},
    onDrag: (Offset) -> Unit = {},
    onDragEnd: () -> Unit = {},
    onAnnotationTap: (AnnotationDraft) -> Unit = {},
    onPan: (Offset, Float) -> Unit = { _, _ -> },
    modifier: Modifier = Modifier
) {
    // Filter annotations for current page
    val pageAnnotations = remember(annotations, currentPageNumber) {
        annotations.filter { it.pageNumber == currentPageNumber }
    }

    Canvas(
        modifier = modifier
            .fillMaxSize()
            .pointerInput(currentTool) {
                // Gestures change based on tool
                when (currentTool) {
                    AnnotationTool.SELECT -> {
                        detectTapGestures(
                            onTap = { offset ->
                                // Check if tapping on annotation
                                val hitAnnotation = pageAnnotations.firstOrNull { annotation ->
                                    AnnotationRenderer.hitTest(
                                        annotation = annotation,
                                        screenPoint = offset,
                                        pageWidth = pageWidth,
                                        pageHeight = pageHeight,
                                        canvasWidth = canvasWidth,
                                        canvasHeight = canvasHeight
                                    )
                                }
                                if (hitAnnotation != null) {
                                    onAnnotationTap(hitAnnotation)
                                } else {
                                    onTap(offset)
                                }
                            },
                            onDoubleTap = { offset -> onDoubleTap(offset) },
                            onLongPress = { offset -> onLongPress(offset) }
                        )
                    }
                    AnnotationTool.PAN -> {
                        // Pan mode - handle pan/zoom gestures
                        detectTransformGestures { _, pan, zoom, _ ->
                            onPan(pan, zoom)
                        }
                    }
                    else -> {
                        // Drawing tool - handle drawing gestures
                        detectDragGestures(
                            onDragStart = { offset -> onDragStart(offset) },
                            onDrag = { change, _ ->
                                change.consume()
                                onDrag(change.position)
                            },
                            onDragEnd = { onDragEnd() },
                            onDragCancel = { onDragEnd() }
                        )
                    }
                }
            }
            .pointerInput(currentTool) {
                // Handle taps for point-based annotations and tools that need tap detection
                if (currentTool in listOf(
                    AnnotationTool.PIN,
                    AnnotationTool.COMMENT,
                    AnnotationTool.CALLOUT,
                    AnnotationTool.AREA       // Taps to add polygon points
                    // Note: CALIBRATE uses drag gestures, not taps
                )) {
                    detectTapGestures(
                        onTap = { offset -> onTap(offset) },
                        onDoubleTap = { offset -> onDoubleTap(offset) }
                    )
                }
            }
    ) {
        // Draw completed annotations
        if (showAnnotations) {
            pageAnnotations.forEach { annotation ->
                with(AnnotationRenderer) {
                    renderAnnotation(
                        annotation = annotation,
                        pageWidth = pageWidth,
                        pageHeight = pageHeight,
                        canvasWidth = canvasWidth,
                        canvasHeight = canvasHeight,
                        isSelected = annotation.id == selectedAnnotationId,
                        showResolved = showResolvedAnnotations,
                        currentScale = currentScale
                    )
                }
            }
        }

        // Draw in-progress annotation
        drawingState?.let { state ->
            with(AnnotationRenderer) {
                renderDrawingPreview(
                    state = state,
                    pageWidth = pageWidth,
                    pageHeight = pageHeight,
                    canvasWidth = canvasWidth,
                    canvasHeight = canvasHeight
                )
            }
        }
    }
}

/**
 * Gesture handler state for drawing annotations
 */
class AnnotationGestureHandler(
    private val pageWidth: Float,
    private val pageHeight: Float,
    private val canvasWidth: Float,
    private val canvasHeight: Float,
    private val onDrawingStateChanged: (DrawingState?) -> Unit,
    private val onAnnotationComplete: (AnnotationDraft) -> Unit,
    private val currentColor: () -> String,
    private val currentTool: () -> AnnotationTool,
    private val currentPageNumber: () -> Int
) {
    private var drawingStart: NormalizedPoint? = null
    private var areaPoints: MutableList<NormalizedPoint> = mutableListOf()
    private var freehandPoints: MutableList<NormalizedPoint> = mutableListOf()

    fun onTap(offset: Offset) {
        val tool = currentTool()
        val annotationType = tool.toAnnotationType() ?: return
        val normalizedPoint = AnnotationRenderer.toNormalizedCoords(offset, pageWidth, pageHeight, canvasWidth, canvasHeight)

        when (annotationType) {
            AnnotationType.PIN,
            AnnotationType.COMMENT -> {
                // Single tap creates the annotation
                val annotation = AnnotationDraft(
                    type = annotationType,
                    pageNumber = currentPageNumber(),
                    position = normalizedPoint,
                    color = currentColor(),
                    isPending = true
                )
                onAnnotationComplete(annotation)
            }
            AnnotationType.CALLOUT -> {
                // First tap sets callout position
                if (drawingStart == null) {
                    drawingStart = normalizedPoint
                    onDrawingStateChanged(
                        DrawingState.Point(
                            position = normalizedPoint,
                            type = annotationType,
                            color = currentColor()
                        )
                    )
                } else {
                    // Second tap sets leader end point
                    val annotation = AnnotationDraft(
                        type = annotationType,
                        pageNumber = currentPageNumber(),
                        position = drawingStart!!,
                        leaderEndPoint = normalizedPoint,
                        color = currentColor(),
                        number = 1, // Will be set by caller
                        isPending = true
                    )
                    onAnnotationComplete(annotation)
                    reset()
                }
            }
            AnnotationType.AREA -> {
                // Each tap adds a vertex
                areaPoints.add(normalizedPoint)
                onDrawingStateChanged(
                    DrawingState.Polygon(
                        points = areaPoints.toList(),
                        type = annotationType,
                        color = currentColor()
                    )
                )
            }
            else -> {}
        }
    }

    fun onDoubleTap(offset: Offset) {
        val tool = currentTool()
        val annotationType = tool.toAnnotationType() ?: return

        when (annotationType) {
            AnnotationType.AREA -> {
                // Double tap closes the polygon
                if (areaPoints.size >= 3) {
                    val annotation = AnnotationDraft(
                        type = annotationType,
                        pageNumber = currentPageNumber(),
                        position = areaPoints.first(),
                        points = areaPoints.toList(),
                        color = currentColor(),
                        fillOpacity = 0.2f,
                        isPending = true
                    )
                    onAnnotationComplete(annotation)
                }
                reset()
            }
            else -> {}
        }
    }

    fun onDragStart(offset: Offset) {
        val tool = currentTool()
        val annotationType = tool.toAnnotationType() ?: return
        val normalizedPoint = AnnotationRenderer.toNormalizedCoords(offset, pageWidth, pageHeight, canvasWidth, canvasHeight)

        drawingStart = normalizedPoint

        when (annotationType) {
            AnnotationType.FREEHAND -> {
                freehandPoints.clear()
                freehandPoints.add(normalizedPoint)
                onDrawingStateChanged(
                    DrawingState.Path(
                        points = freehandPoints.toList(),
                        type = annotationType,
                        color = currentColor()
                    )
                )
            }
            AnnotationType.LINE,
            AnnotationType.ARROW,
            AnnotationType.MEASUREMENT -> {
                onDrawingStateChanged(
                    DrawingState.Line(
                        start = normalizedPoint,
                        end = normalizedPoint,
                        type = annotationType,
                        color = currentColor()
                    )
                )
            }
            AnnotationType.RECTANGLE,
            AnnotationType.CIRCLE,
            AnnotationType.CLOUD -> {
                onDrawingStateChanged(
                    DrawingState.Shape(
                        start = normalizedPoint,
                        end = normalizedPoint,
                        type = annotationType,
                        color = currentColor()
                    )
                )
            }
            else -> {}
        }
    }

    fun onDrag(offset: Offset) {
        val tool = currentTool()
        val annotationType = tool.toAnnotationType() ?: return
        val start = drawingStart ?: return
        val normalizedPoint = AnnotationRenderer.toNormalizedCoords(offset, pageWidth, pageHeight, canvasWidth, canvasHeight)

        when (annotationType) {
            AnnotationType.FREEHAND -> {
                freehandPoints.add(normalizedPoint)
                onDrawingStateChanged(
                    DrawingState.Path(
                        points = freehandPoints.toList(),
                        type = annotationType,
                        color = currentColor()
                    )
                )
            }
            AnnotationType.LINE,
            AnnotationType.ARROW,
            AnnotationType.MEASUREMENT -> {
                onDrawingStateChanged(
                    DrawingState.Line(
                        start = start,
                        end = normalizedPoint,
                        type = annotationType,
                        color = currentColor()
                    )
                )
            }
            AnnotationType.RECTANGLE,
            AnnotationType.CIRCLE,
            AnnotationType.CLOUD -> {
                onDrawingStateChanged(
                    DrawingState.Shape(
                        start = start,
                        end = normalizedPoint,
                        type = annotationType,
                        color = currentColor()
                    )
                )
            }
            else -> {}
        }
    }

    fun onDragEnd() {
        val tool = currentTool()
        val annotationType = tool.toAnnotationType() ?: return
        val start = drawingStart ?: return

        when (annotationType) {
            AnnotationType.FREEHAND -> {
                if (freehandPoints.size >= 2) {
                    val annotation = AnnotationDraft(
                        type = annotationType,
                        pageNumber = currentPageNumber(),
                        position = freehandPoints.first(),
                        points = freehandPoints.toList(),
                        color = currentColor(),
                        isPending = true
                    )
                    onAnnotationComplete(annotation)
                }
            }
            AnnotationType.LINE,
            AnnotationType.ARROW,
            AnnotationType.MEASUREMENT -> {
                val state = (getCurrentDrawingState() as? DrawingState.Line)
                if (state != null) {
                    val annotation = AnnotationDraft(
                        type = annotationType,
                        pageNumber = currentPageNumber(),
                        position = state.start,
                        endPoint = state.end,
                        color = currentColor(),
                        isPending = true
                    )
                    onAnnotationComplete(annotation)
                }
            }
            AnnotationType.RECTANGLE,
            AnnotationType.CIRCLE,
            AnnotationType.CLOUD -> {
                val state = (getCurrentDrawingState() as? DrawingState.Shape)
                if (state != null) {
                    val minX = minOf(state.start.x, state.end.x)
                    val minY = minOf(state.start.y, state.end.y)
                    val maxX = maxOf(state.start.x, state.end.x)
                    val maxY = maxOf(state.start.y, state.end.y)

                    val annotation = AnnotationDraft(
                        type = annotationType,
                        pageNumber = currentPageNumber(),
                        position = NormalizedPoint(minX, minY),
                        width = maxX - minX,
                        height = maxY - minY,
                        color = currentColor(),
                        isPending = true
                    )
                    onAnnotationComplete(annotation)
                }
            }
            else -> {}
        }

        reset()
    }

    private var currentState: DrawingState? = null

    private fun getCurrentDrawingState(): DrawingState? = currentState

    fun reset() {
        drawingStart = null
        areaPoints.clear()
        freehandPoints.clear()
        currentState = null
        onDrawingStateChanged(null)
    }
}

/**
 * Remember a gesture handler for annotation drawing
 */
@Composable
fun rememberAnnotationGestureHandler(
    pageWidth: Float,
    pageHeight: Float,
    canvasWidth: Float,
    canvasHeight: Float,
    currentTool: () -> AnnotationTool,
    currentColor: () -> String,
    currentPageNumber: () -> Int,
    onDrawingStateChanged: (DrawingState?) -> Unit,
    onAnnotationComplete: (AnnotationDraft) -> Unit
): AnnotationGestureHandler {
    return remember(pageWidth, pageHeight, canvasWidth, canvasHeight) {
        AnnotationGestureHandler(
            pageWidth = pageWidth,
            pageHeight = pageHeight,
            canvasWidth = canvasWidth,
            canvasHeight = canvasHeight,
            onDrawingStateChanged = onDrawingStateChanged,
            onAnnotationComplete = onAnnotationComplete,
            currentColor = currentColor,
            currentTool = currentTool,
            currentPageNumber = currentPageNumber
        )
    }
}

/**
 * Get annotation at a screen position (for selection)
 */
fun findAnnotationAt(
    annotations: List<AnnotationDraft>,
    screenPoint: Offset,
    pageWidth: Float,
    pageHeight: Float,
    canvasWidth: Float,
    canvasHeight: Float,
    pageNumber: Int,
    tolerance: Float = 20f
): AnnotationDraft? {
    return annotations
        .filter { it.pageNumber == pageNumber }
        .firstOrNull { annotation ->
            AnnotationRenderer.hitTest(
                annotation = annotation,
                screenPoint = screenPoint,
                pageWidth = pageWidth,
                pageHeight = pageHeight,
                canvasWidth = canvasWidth,
                canvasHeight = canvasHeight,
                tolerance = tolerance
            )
        }
}
