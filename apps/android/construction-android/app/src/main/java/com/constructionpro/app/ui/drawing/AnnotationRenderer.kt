package com.constructionpro.app.ui.drawing

import android.graphics.PointF
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.unit.dp
import com.constructionpro.app.data.model.AnnotationDraft
import com.constructionpro.app.data.model.AnnotationType
import com.constructionpro.app.data.model.DrawingState
import com.constructionpro.app.data.model.NormalizedPoint
import kotlin.math.PI
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * AnnotationRenderer handles Canvas-based drawing for all 13 annotation types.
 * Uses normalized coordinates (0-1) that are converted to screen coordinates.
 */
object AnnotationRenderer {

    // ============ MAIN RENDER METHODS ============

    /**
     * Render a completed annotation
     */
    fun DrawScope.renderAnnotation(
        annotation: AnnotationDraft,
        pageWidth: Float,
        pageHeight: Float,
        canvasWidth: Float = pageWidth,
        canvasHeight: Float = pageHeight,
        isSelected: Boolean = false,
        showResolved: Boolean = true,
        currentScale: String? = null
    ) {
        // Skip resolved annotations if not showing them
        if (annotation.resolvedAt != null && !showResolved) return

        val color = parseColor(annotation.color)
        val alpha = if (annotation.resolvedAt != null) 0.5f else 1f
        val strokeWidth = annotation.strokeWidth.dp.toPx()

        when (annotation.type) {
            AnnotationType.PIN -> drawPin(
                annotation, pageWidth, pageHeight, canvasWidth, canvasHeight, color.copy(alpha = alpha), isSelected
            )
            AnnotationType.COMMENT -> drawComment(
                annotation, pageWidth, pageHeight, canvasWidth, canvasHeight, color.copy(alpha = alpha), isSelected
            )
            AnnotationType.RECTANGLE -> drawRectangle(
                annotation, pageWidth, pageHeight, canvasWidth, canvasHeight, color.copy(alpha = alpha), strokeWidth, isSelected
            )
            AnnotationType.CIRCLE -> drawCircle(
                annotation, pageWidth, pageHeight, canvasWidth, canvasHeight, color.copy(alpha = alpha), strokeWidth, isSelected
            )
            AnnotationType.CLOUD -> drawCloud(
                annotation, pageWidth, pageHeight, canvasWidth, canvasHeight, color.copy(alpha = alpha), strokeWidth, isSelected
            )
            AnnotationType.ARROW -> drawArrow(
                annotation, pageWidth, pageHeight, canvasWidth, canvasHeight, color.copy(alpha = alpha), strokeWidth, isSelected
            )
            AnnotationType.LINE -> drawLine(
                annotation, pageWidth, pageHeight, canvasWidth, canvasHeight, color.copy(alpha = alpha), strokeWidth, isSelected
            )
            AnnotationType.CALLOUT -> drawCallout(
                annotation, pageWidth, pageHeight, canvasWidth, canvasHeight, color.copy(alpha = alpha), strokeWidth, isSelected
            )
            AnnotationType.MEASUREMENT -> drawMeasurement(
                annotation, pageWidth, pageHeight, canvasWidth, canvasHeight, color.copy(alpha = alpha), strokeWidth, isSelected, currentScale
            )
            AnnotationType.AREA -> drawArea(
                annotation, pageWidth, pageHeight, canvasWidth, canvasHeight, color.copy(alpha = alpha), strokeWidth, isSelected
            )
            AnnotationType.FREEHAND -> drawFreehand(
                annotation, pageWidth, pageHeight, canvasWidth, canvasHeight, color.copy(alpha = alpha), strokeWidth, isSelected
            )
            AnnotationType.MARKUP -> drawFreehand(
                annotation, pageWidth, pageHeight, canvasWidth, canvasHeight, color.copy(alpha = alpha), strokeWidth, isSelected
            )
            AnnotationType.HIGHLIGHT -> drawHighlight(
                annotation, pageWidth, pageHeight, canvasWidth, canvasHeight, color.copy(alpha = alpha), strokeWidth, isSelected
            )
        }

        // Draw selection handles if selected
        if (isSelected) {
            drawSelectionHandles(annotation, pageWidth, pageHeight, canvasWidth, canvasHeight)
        }
    }

    /**
     * Render an in-progress drawing (preview while user is drawing)
     */
    fun DrawScope.renderDrawingPreview(
        state: DrawingState,
        pageWidth: Float,
        pageHeight: Float,
        canvasWidth: Float = pageWidth,
        canvasHeight: Float = pageHeight
    ) {
        val dashEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 10f), 0f)
        val strokeWidth = 2.dp.toPx()

        when (state) {
            is DrawingState.Point -> {
                val pos = toScreenCoords(state.position, pageWidth, pageHeight, canvasWidth, canvasHeight)
                val color = parseColor(state.color)
                drawPreviewMarker(pos, color, state.type)
            }

            is DrawingState.Line -> {
                val start = toScreenCoords(state.start, pageWidth, pageHeight, canvasWidth, canvasHeight)
                val end = toScreenCoords(state.end, pageWidth, pageHeight, canvasWidth, canvasHeight)
                val color = parseColor(state.color)

                when (state.type) {
                    AnnotationType.ARROW -> {
                        drawLine(
                            color = color,
                            start = start,
                            end = end,
                            strokeWidth = strokeWidth,
                            pathEffect = dashEffect
                        )
                        drawArrowHead(end, start, color, strokeWidth, true)
                    }
                    AnnotationType.MEASUREMENT -> {
                        drawLine(
                            color = color,
                            start = start,
                            end = end,
                            strokeWidth = strokeWidth,
                            pathEffect = dashEffect
                        )
                        // Draw end markers
                        drawEndMarker(start, end, color, strokeWidth)
                        drawEndMarker(end, start, color, strokeWidth)
                    }
                    else -> {
                        drawLine(
                            color = color,
                            start = start,
                            end = end,
                            strokeWidth = strokeWidth,
                            pathEffect = dashEffect
                        )
                    }
                }
            }

            is DrawingState.Shape -> {
                val start = toScreenCoords(state.start, pageWidth, pageHeight, canvasWidth, canvasHeight)
                val end = toScreenCoords(state.end, pageWidth, pageHeight, canvasWidth, canvasHeight)
                val color = parseColor(state.color)
                val rect = Rect(
                    left = minOf(start.x, end.x),
                    top = minOf(start.y, end.y),
                    right = maxOf(start.x, end.x),
                    bottom = maxOf(start.y, end.y)
                )

                when (state.type) {
                    AnnotationType.RECTANGLE -> {
                        drawRect(
                            color = color,
                            topLeft = rect.topLeft,
                            size = rect.size,
                            style = Stroke(width = strokeWidth, pathEffect = dashEffect)
                        )
                    }
                    AnnotationType.CIRCLE -> {
                        drawOval(
                            color = color,
                            topLeft = rect.topLeft,
                            size = rect.size,
                            style = Stroke(width = strokeWidth, pathEffect = dashEffect)
                        )
                    }
                    AnnotationType.CLOUD -> {
                        val path = createCloudPath(rect)
                        drawPath(
                            path = path,
                            color = color,
                            style = Stroke(width = strokeWidth, pathEffect = dashEffect)
                        )
                    }
                    else -> {}
                }
            }

            is DrawingState.Path -> {
                if (state.points.size >= 2) {
                    val color = parseColor(state.color)
                    val path = Path().apply {
                        val first = toScreenCoords(state.points.first(), pageWidth, pageHeight, canvasWidth, canvasHeight)
                        moveTo(first.x, first.y)
                        state.points.drop(1).forEach { point ->
                            val p = toScreenCoords(point, pageWidth, pageHeight, canvasWidth, canvasHeight)
                            lineTo(p.x, p.y)
                        }
                    }
                    drawPath(
                        path = path,
                        color = color,
                        style = Stroke(width = strokeWidth, cap = StrokeCap.Round, join = StrokeJoin.Round)
                    )
                }
            }

            is DrawingState.Polygon -> {
                if (state.points.size >= 2) {
                    val color = parseColor(state.color)
                    val path = Path().apply {
                        val first = toScreenCoords(state.points.first(), pageWidth, pageHeight, canvasWidth, canvasHeight)
                        moveTo(first.x, first.y)
                        state.points.drop(1).forEach { point ->
                            val p = toScreenCoords(point, pageWidth, pageHeight, canvasWidth, canvasHeight)
                            lineTo(p.x, p.y)
                        }
                        if (state.isClosed) close()
                    }

                    // Draw fill
                    if (state.isClosed) {
                        drawPath(
                            path = path,
                            color = color.copy(alpha = 0.2f),
                            style = Fill
                        )
                    }

                    // Draw stroke
                    drawPath(
                        path = path,
                        color = color,
                        style = Stroke(
                            width = strokeWidth,
                            pathEffect = if (!state.isClosed) dashEffect else null
                        )
                    )

                    // Draw vertex markers
                    state.points.forEach { point ->
                        val p = toScreenCoords(point, pageWidth, pageHeight, canvasWidth, canvasHeight)
                        drawCircle(
                            color = Color.White,
                            radius = 6.dp.toPx(),
                            center = p
                        )
                        drawCircle(
                            color = color,
                            radius = 4.dp.toPx(),
                            center = p
                        )
                    }
                }
            }
        }
    }

    // ============ INDIVIDUAL ANNOTATION RENDERERS ============

    private fun DrawScope.drawPin(
        annotation: AnnotationDraft,
        pageWidth: Float,
        pageHeight: Float,
        canvasWidth: Float,
        canvasHeight: Float,
        color: Color,
        isSelected: Boolean
    ) {
        val center = toScreenCoords(annotation.position, pageWidth, pageHeight, canvasWidth, canvasHeight)
        val radius = 12.dp.toPx()
        val pointerLength = 8.dp.toPx()

        // Draw drop shadow
        drawCircle(
            color = Color.Black.copy(alpha = 0.3f),
            radius = radius + 2.dp.toPx(),
            center = center + Offset(2.dp.toPx(), 2.dp.toPx())
        )

        // Draw pin body (circle)
        drawCircle(
            color = color,
            radius = radius,
            center = center
        )

        // Draw pointer at bottom
        val pointerPath = Path().apply {
            moveTo(center.x - 6.dp.toPx(), center.y + radius - 2.dp.toPx())
            lineTo(center.x, center.y + radius + pointerLength)
            lineTo(center.x + 6.dp.toPx(), center.y + radius - 2.dp.toPx())
            close()
        }
        drawPath(path = pointerPath, color = color)

        // Draw white inner circle
        drawCircle(
            color = Color.White,
            radius = radius * 0.5f,
            center = center
        )

        // Draw label if present
        annotation.label?.let { label ->
            if (label.isNotEmpty()) {
                val textPaint = android.graphics.Paint().apply {
                    textSize = 11.dp.toPx()
                    this.color = android.graphics.Color.WHITE
                    textAlign = android.graphics.Paint.Align.CENTER
                    isFakeBoldText = true
                }
                drawContext.canvas.nativeCanvas.drawText(
                    if (label.length > 3) label.take(3) else label,
                    center.x,
                    center.y + 4.dp.toPx(),
                    textPaint
                )
            }
        }

        // Draw entity link indicator
        if (annotation.linkedEntity != null) {
            drawCircle(
                color = Color.White,
                radius = 5.dp.toPx(),
                center = center + Offset(radius * 0.7f, -radius * 0.7f)
            )
            drawCircle(
                color = Color(0xFF22C55E), // Green for linked
                radius = 4.dp.toPx(),
                center = center + Offset(radius * 0.7f, -radius * 0.7f)
            )
        }
    }

    private fun DrawScope.drawComment(
        annotation: AnnotationDraft,
        pageWidth: Float,
        pageHeight: Float,
        canvasWidth: Float,
        canvasHeight: Float,
        color: Color,
        isSelected: Boolean
    ) {
        val center = toScreenCoords(annotation.position, pageWidth, pageHeight, canvasWidth, canvasHeight)
        val size = 24.dp.toPx()

        // Draw speech bubble background
        val bubblePath = Path().apply {
            val rect = Rect(
                center.x - size / 2,
                center.y - size / 2,
                center.x + size / 2,
                center.y + size / 2 - 4.dp.toPx()
            )
            addRoundRect(
                androidx.compose.ui.geometry.RoundRect(
                    rect = rect,
                    radiusX = 4.dp.toPx(),
                    radiusY = 4.dp.toPx()
                )
            )
            // Add pointer
            moveTo(center.x - 4.dp.toPx(), center.y + size / 2 - 4.dp.toPx())
            lineTo(center.x, center.y + size / 2 + 2.dp.toPx())
            lineTo(center.x + 4.dp.toPx(), center.y + size / 2 - 4.dp.toPx())
            close()
        }

        drawPath(path = bubblePath, color = color)

        // Draw "..." dots
        val dotY = center.y - 2.dp.toPx()
        val dotRadius = 2.dp.toPx()
        listOf(-6f, 0f, 6f).forEach { offsetX ->
            drawCircle(
                color = Color.White,
                radius = dotRadius,
                center = Offset(center.x + offsetX.dp.toPx(), dotY)
            )
        }
    }

    private fun DrawScope.drawRectangle(
        annotation: AnnotationDraft,
        pageWidth: Float,
        pageHeight: Float,
        canvasWidth: Float,
        canvasHeight: Float,
        color: Color,
        strokeWidth: Float,
        isSelected: Boolean
    ) {
        val topLeft = toScreenCoords(annotation.position, pageWidth, pageHeight, canvasWidth, canvasHeight)
        val width = (annotation.width ?: 0f) * pageWidth
        val height = (annotation.height ?: 0f) * pageHeight

        val rect = Rect(topLeft.x, topLeft.y, topLeft.x + width, topLeft.y + height)

        // Draw fill if specified
        annotation.fillColor?.let { fill ->
            val fillColor = parseColor(fill).copy(alpha = annotation.fillOpacity ?: 0.2f)
            drawRect(
                color = fillColor,
                topLeft = rect.topLeft,
                size = rect.size,
                style = Fill
            )
        }

        // Draw stroke
        drawRect(
            color = color,
            topLeft = rect.topLeft,
            size = rect.size,
            style = Stroke(width = strokeWidth)
        )
    }

    private fun DrawScope.drawCircle(
        annotation: AnnotationDraft,
        pageWidth: Float,
        pageHeight: Float,
        canvasWidth: Float,
        canvasHeight: Float,
        color: Color,
        strokeWidth: Float,
        isSelected: Boolean
    ) {
        val topLeft = toScreenCoords(annotation.position, pageWidth, pageHeight, canvasWidth, canvasHeight)
        val width = (annotation.width ?: 0f) * pageWidth
        val height = (annotation.height ?: 0f) * pageHeight

        val rect = Rect(topLeft.x, topLeft.y, topLeft.x + width, topLeft.y + height)

        // Draw fill if specified
        annotation.fillColor?.let { fill ->
            val fillColor = parseColor(fill).copy(alpha = annotation.fillOpacity ?: 0.2f)
            drawOval(
                color = fillColor,
                topLeft = rect.topLeft,
                size = rect.size,
                style = Fill
            )
        }

        // Draw stroke
        drawOval(
            color = color,
            topLeft = rect.topLeft,
            size = rect.size,
            style = Stroke(width = strokeWidth)
        )
    }

    private fun DrawScope.drawCloud(
        annotation: AnnotationDraft,
        pageWidth: Float,
        pageHeight: Float,
        canvasWidth: Float,
        canvasHeight: Float,
        color: Color,
        strokeWidth: Float,
        isSelected: Boolean
    ) {
        val topLeft = toScreenCoords(annotation.position, pageWidth, pageHeight, canvasWidth, canvasHeight)
        val width = (annotation.width ?: 0f) * pageWidth
        val height = (annotation.height ?: 0f) * pageHeight

        val rect = Rect(topLeft.x, topLeft.y, topLeft.x + width, topLeft.y + height)
        val path = createCloudPath(rect)

        // Draw fill if specified
        annotation.fillColor?.let { fill ->
            val fillColor = parseColor(fill).copy(alpha = annotation.fillOpacity ?: 0.2f)
            drawPath(
                path = path,
                color = fillColor,
                style = Fill
            )
        }

        // Draw stroke
        drawPath(
            path = path,
            color = color,
            style = Stroke(width = strokeWidth)
        )
    }

    private fun DrawScope.drawArrow(
        annotation: AnnotationDraft,
        pageWidth: Float,
        pageHeight: Float,
        canvasWidth: Float,
        canvasHeight: Float,
        color: Color,
        strokeWidth: Float,
        isSelected: Boolean
    ) {
        val start = toScreenCoords(annotation.position, pageWidth, pageHeight, canvasWidth, canvasHeight)
        val end = annotation.endPoint?.let { toScreenCoords(it, pageWidth, pageHeight, canvasWidth, canvasHeight) } ?: return

        // Draw line
        drawLine(
            color = color,
            start = start,
            end = end,
            strokeWidth = strokeWidth,
            cap = StrokeCap.Round
        )

        // Draw arrowhead at end
        drawArrowHead(end, start, color, strokeWidth, false)
    }

    private fun DrawScope.drawLine(
        annotation: AnnotationDraft,
        pageWidth: Float,
        pageHeight: Float,
        canvasWidth: Float,
        canvasHeight: Float,
        color: Color,
        strokeWidth: Float,
        isSelected: Boolean
    ) {
        val start = toScreenCoords(annotation.position, pageWidth, pageHeight, canvasWidth, canvasHeight)
        val end = annotation.endPoint?.let { toScreenCoords(it, pageWidth, pageHeight, canvasWidth, canvasHeight) } ?: return

        drawLine(
            color = color,
            start = start,
            end = end,
            strokeWidth = strokeWidth,
            cap = StrokeCap.Round
        )
    }

    private fun DrawScope.drawCallout(
        annotation: AnnotationDraft,
        pageWidth: Float,
        pageHeight: Float,
        canvasWidth: Float,
        canvasHeight: Float,
        color: Color,
        strokeWidth: Float,
        isSelected: Boolean
    ) {
        val center = toScreenCoords(annotation.position, pageWidth, pageHeight, canvasWidth, canvasHeight)
        val radius = (annotation.bubbleRadius ?: 16f).dp.toPx()
        val number = annotation.number ?: 1

        // Draw leader line if present
        annotation.leaderEndPoint?.let { leaderEnd ->
            val endPoint = toScreenCoords(leaderEnd, pageWidth, pageHeight, canvasWidth, canvasHeight)
            drawLine(
                color = color,
                start = center,
                end = endPoint,
                strokeWidth = strokeWidth,
                cap = StrokeCap.Round
            )
        }

        // Draw circle background
        drawCircle(
            color = color,
            radius = radius,
            center = center
        )

        // Draw white border
        drawCircle(
            color = Color.White,
            radius = radius - strokeWidth,
            center = center,
            style = Stroke(width = strokeWidth)
        )

        // Draw number
        val textPaint = android.graphics.Paint().apply {
            textSize = (radius * 1.2f)
            this.color = android.graphics.Color.WHITE
            textAlign = android.graphics.Paint.Align.CENTER
            isFakeBoldText = true
        }
        drawContext.canvas.nativeCanvas.drawText(
            number.toString(),
            center.x,
            center.y + (radius * 0.4f),
            textPaint
        )
    }

    private fun DrawScope.drawMeasurement(
        annotation: AnnotationDraft,
        pageWidth: Float,
        pageHeight: Float,
        canvasWidth: Float,
        canvasHeight: Float,
        color: Color,
        strokeWidth: Float,
        isSelected: Boolean,
        currentScale: String?
    ) {
        val start = toScreenCoords(annotation.position, pageWidth, pageHeight, canvasWidth, canvasHeight)
        val end = annotation.endPoint?.let { toScreenCoords(it, pageWidth, pageHeight, canvasWidth, canvasHeight) } ?: return

        // Draw main line
        drawLine(
            color = color,
            start = start,
            end = end,
            strokeWidth = strokeWidth,
            cap = StrokeCap.Round
        )

        // Draw end markers (perpendicular lines)
        drawEndMarker(start, end, color, strokeWidth)
        drawEndMarker(end, start, color, strokeWidth)

        // Calculate and display distance if scale is available
        val displayText = if (currentScale != null) {
            // Calculate pixel distance using NORMALIZED coordinates (zoom-independent)
            // This ensures the measurement stays accurate regardless of zoom level
            val normalizedStart = annotation.position
            val normalizedEnd = annotation.endPoint ?: annotation.position

            // Convert normalized (0-1) coordinates to actual pixel distances on the PDF
            val pixelDx = (normalizedEnd.x - normalizedStart.x) * pageWidth
            val pixelDy = (normalizedEnd.y - normalizedStart.y) * pageHeight
            val pixelDistance = sqrt(pixelDx * pixelDx + pixelDy * pixelDy)

            // Parse scale to get pixels per foot
            // Scale format examples: "1/4\" = 1'-0\"" or "1:100" or "1\"=10'"
            val pixelsPerFoot = parseScaleToPixelsPerFoot(currentScale, pageWidth)

            if (pixelsPerFoot > 0) {
                val distanceFeet = pixelDistance / pixelsPerFoot
                String.format("%.1f ft", distanceFeet)
            } else {
                annotation.measurement?.displayValue
            }
        } else {
            annotation.measurement?.displayValue
        }

        // Draw measurement label
        displayText?.let { text ->
            val midPoint = Offset((start.x + end.x) / 2, (start.y + end.y) / 2)
            val angle = atan2(end.y - start.y, end.x - start.x)

            // Offset label perpendicular to line
            val offsetDist = 16.dp.toPx()
            val labelOffset = Offset(
                -sin(angle) * offsetDist,
                cos(angle) * offsetDist
            )
            val labelPos = midPoint + labelOffset

            // Draw background
            val textPaint = android.graphics.Paint().apply {
                textSize = 12.dp.toPx()
                this.color = android.graphics.Color.WHITE
                textAlign = android.graphics.Paint.Align.CENTER
            }
            val textWidth = textPaint.measureText(text)

            drawRoundRect(
                color = color,
                topLeft = Offset(labelPos.x - textWidth / 2 - 4.dp.toPx(), labelPos.y - 10.dp.toPx()),
                size = Size(textWidth + 8.dp.toPx(), 20.dp.toPx()),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(4.dp.toPx())
            )

            // Draw text
            drawContext.canvas.nativeCanvas.drawText(
                text,
                labelPos.x,
                labelPos.y + 4.dp.toPx(),
                textPaint
            )
        }
    }

    private fun DrawScope.drawArea(
        annotation: AnnotationDraft,
        pageWidth: Float,
        pageHeight: Float,
        canvasWidth: Float,
        canvasHeight: Float,
        color: Color,
        strokeWidth: Float,
        isSelected: Boolean
    ) {
        if (annotation.points.size < 3) return

        val path = Path().apply {
            val first = toScreenCoords(annotation.points.first(), pageWidth, pageHeight, canvasWidth, canvasHeight)
            moveTo(first.x, first.y)
            annotation.points.drop(1).forEach { point ->
                val p = toScreenCoords(point, pageWidth, pageHeight, canvasWidth, canvasHeight)
                lineTo(p.x, p.y)
            }
            close()
        }

        // Draw fill
        val fillColor = parseColor(annotation.fillColor ?: annotation.color)
            .copy(alpha = annotation.fillOpacity ?: 0.2f)
        drawPath(path = path, color = fillColor, style = Fill)

        // Draw stroke
        drawPath(
            path = path,
            color = color,
            style = Stroke(width = strokeWidth)
        )

        // Draw vertex markers
        annotation.points.forEach { point ->
            val p = toScreenCoords(point, pageWidth, pageHeight, canvasWidth, canvasHeight)
            drawCircle(
                color = Color.White,
                radius = 5.dp.toPx(),
                center = p
            )
            drawCircle(
                color = color,
                radius = 3.dp.toPx(),
                center = p
            )
        }

        // Draw area label at centroid
        annotation.measurement?.let { measurement ->
            val centroid = calculateCentroid(annotation.points, pageWidth, pageHeight, canvasWidth, canvasHeight)

            val textPaint = android.graphics.Paint().apply {
                textSize = 12.dp.toPx()
                this.color = android.graphics.Color.WHITE
                textAlign = android.graphics.Paint.Align.CENTER
            }
            val textWidth = textPaint.measureText(measurement.displayValue)

            drawRoundRect(
                color = color,
                topLeft = Offset(centroid.x - textWidth / 2 - 4.dp.toPx(), centroid.y - 10.dp.toPx()),
                size = Size(textWidth + 8.dp.toPx(), 20.dp.toPx()),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(4.dp.toPx())
            )

            drawContext.canvas.nativeCanvas.drawText(
                measurement.displayValue,
                centroid.x,
                centroid.y + 4.dp.toPx(),
                textPaint
            )
        }
    }

    private fun DrawScope.drawFreehand(
        annotation: AnnotationDraft,
        pageWidth: Float,
        pageHeight: Float,
        canvasWidth: Float,
        canvasHeight: Float,
        color: Color,
        strokeWidth: Float,
        isSelected: Boolean
    ) {
        if (annotation.points.size < 2) return

        val path = Path().apply {
            val first = toScreenCoords(annotation.points.first(), pageWidth, pageHeight, canvasWidth, canvasHeight)
            moveTo(first.x, first.y)

            // Use quadratic curves for smoother lines
            for (i in 1 until annotation.points.size - 1) {
                val current = toScreenCoords(annotation.points[i], pageWidth, pageHeight, canvasWidth, canvasHeight)
                val next = toScreenCoords(annotation.points[i + 1], pageWidth, pageHeight, canvasWidth, canvasHeight)
                val controlX = current.x
                val controlY = current.y
                val endX = (current.x + next.x) / 2
                val endY = (current.y + next.y) / 2
                quadraticBezierTo(controlX, controlY, endX, endY)
            }

            // Connect to last point
            val last = toScreenCoords(annotation.points.last(), pageWidth, pageHeight, canvasWidth, canvasHeight)
            lineTo(last.x, last.y)
        }

        drawPath(
            path = path,
            color = color,
            style = Stroke(
                width = strokeWidth,
                cap = StrokeCap.Round,
                join = StrokeJoin.Round
            )
        )
    }

    private fun DrawScope.drawHighlight(
        annotation: AnnotationDraft,
        pageWidth: Float,
        pageHeight: Float,
        canvasWidth: Float,
        canvasHeight: Float,
        color: Color,
        strokeWidth: Float,
        isSelected: Boolean
    ) {
        val topLeft = toScreenCoords(annotation.position, pageWidth, pageHeight, canvasWidth, canvasHeight)
        val width = (annotation.width ?: 0f) * pageWidth
        val height = (annotation.height ?: 0f) * pageHeight

        // Draw semi-transparent highlight
        drawRect(
            color = color.copy(alpha = 0.3f),
            topLeft = topLeft,
            size = Size(width, height),
            style = Fill
        )
    }

    // ============ HELPER METHODS ============

    private fun DrawScope.drawArrowHead(
        tip: Offset,
        from: Offset,
        color: Color,
        strokeWidth: Float,
        isDashed: Boolean
    ) {
        val angle = atan2(tip.y - from.y, tip.x - from.x)
        val arrowLength = 12.dp.toPx()
        val arrowAngle = PI.toFloat() / 6 // 30 degrees

        val path = Path().apply {
            moveTo(tip.x, tip.y)
            lineTo(
                tip.x - arrowLength * cos(angle - arrowAngle),
                tip.y - arrowLength * sin(angle - arrowAngle)
            )
            moveTo(tip.x, tip.y)
            lineTo(
                tip.x - arrowLength * cos(angle + arrowAngle),
                tip.y - arrowLength * sin(angle + arrowAngle)
            )
        }

        drawPath(
            path = path,
            color = color,
            style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
        )
    }

    private fun DrawScope.drawEndMarker(
        point: Offset,
        towards: Offset,
        color: Color,
        strokeWidth: Float
    ) {
        val angle = atan2(towards.y - point.y, towards.x - point.x)
        val markerLength = 8.dp.toPx()

        // Draw perpendicular line
        val perpAngle = angle + PI.toFloat() / 2
        val p1 = Offset(
            point.x + markerLength * cos(perpAngle),
            point.y + markerLength * sin(perpAngle)
        )
        val p2 = Offset(
            point.x - markerLength * cos(perpAngle),
            point.y - markerLength * sin(perpAngle)
        )

        drawLine(
            color = color,
            start = p1,
            end = p2,
            strokeWidth = strokeWidth,
            cap = StrokeCap.Round
        )
    }

    private fun DrawScope.drawPreviewMarker(
        position: Offset,
        color: Color,
        type: AnnotationType
    ) {
        val radius = 8.dp.toPx()

        // Draw crosshair
        drawLine(
            color = color,
            start = Offset(position.x - radius, position.y),
            end = Offset(position.x + radius, position.y),
            strokeWidth = 2.dp.toPx()
        )
        drawLine(
            color = color,
            start = Offset(position.x, position.y - radius),
            end = Offset(position.x, position.y + radius),
            strokeWidth = 2.dp.toPx()
        )

        // Draw circle
        drawCircle(
            color = color,
            radius = radius,
            center = position,
            style = Stroke(width = 2.dp.toPx())
        )
    }

    private fun DrawScope.drawSelectionHandles(
        annotation: AnnotationDraft,
        pageWidth: Float,
        pageHeight: Float,
        canvasWidth: Float,
        canvasHeight: Float
    ) {
        val handleRadius = 6.dp.toPx()
        val handleColor = Color(0xFF3B82F6) // Blue

        fun drawHandle(point: Offset) {
            drawCircle(
                color = Color.White,
                radius = handleRadius + 1.dp.toPx(),
                center = point
            )
            drawCircle(
                color = handleColor,
                radius = handleRadius,
                center = point
            )
        }

        when {
            annotation.isShape -> {
                val topLeft = toScreenCoords(annotation.position, pageWidth, pageHeight, canvasWidth, canvasHeight)
                val width = (annotation.width ?: 0f) * pageWidth
                val height = (annotation.height ?: 0f) * pageHeight

                // Corner handles
                drawHandle(topLeft)
                drawHandle(Offset(topLeft.x + width, topLeft.y))
                drawHandle(Offset(topLeft.x, topLeft.y + height))
                drawHandle(Offset(topLeft.x + width, topLeft.y + height))

                // Edge midpoint handles
                drawHandle(Offset(topLeft.x + width / 2, topLeft.y))
                drawHandle(Offset(topLeft.x + width / 2, topLeft.y + height))
                drawHandle(Offset(topLeft.x, topLeft.y + height / 2))
                drawHandle(Offset(topLeft.x + width, topLeft.y + height / 2))
            }
            annotation.isLine -> {
                val start = toScreenCoords(annotation.position, pageWidth, pageHeight, canvasWidth, canvasHeight)
                annotation.endPoint?.let {
                    val end = toScreenCoords(it, pageWidth, pageHeight, canvasWidth, canvasHeight)
                    drawHandle(start)
                    drawHandle(end)
                }
            }
            annotation.isPoint -> {
                val pos = toScreenCoords(annotation.position, pageWidth, pageHeight, canvasWidth, canvasHeight)
                drawHandle(pos)
            }
            annotation.isMultiPoint -> {
                annotation.points.forEach { point ->
                    val p = toScreenCoords(point, pageWidth, pageHeight, canvasWidth, canvasHeight)
                    drawHandle(p)
                }
            }
        }
    }

    /**
     * Create a cloud/revision bubble path with bumpy edges
     */
    private fun createCloudPath(rect: Rect): Path {
        val path = Path()
        val arcCount = 8
        val perimeter = 2 * (rect.width + rect.height)
        val arcLength = perimeter / arcCount

        // Simplified cloud with arcs along edges
        val centerX = rect.center.x
        val centerY = rect.center.y
        val radiusX = rect.width / 2
        val radiusY = rect.height / 2

        val bumpSize = min(rect.width, rect.height) * 0.15f
        val points = mutableListOf<PointF>()

        // Generate points around the rectangle with bumps
        for (i in 0 until arcCount * 2) {
            val angle = (2 * PI * i / (arcCount * 2)).toFloat()
            val bump = if (i % 2 == 0) 1f else 0.85f
            val x = centerX + (radiusX + bumpSize * bump) * cos(angle)
            val y = centerY + (radiusY + bumpSize * bump) * sin(angle)
            points.add(PointF(x, y))
        }

        if (points.isNotEmpty()) {
            path.moveTo(points[0].x, points[0].y)
            for (i in 1 until points.size) {
                val prev = points[i - 1]
                val curr = points[i]
                val controlX = (prev.x + curr.x) / 2
                val controlY = (prev.y + curr.y) / 2 - bumpSize * 0.5f
                path.quadraticBezierTo(controlX, controlY, curr.x, curr.y)
            }
            // Close path
            val last = points.last()
            val first = points.first()
            path.quadraticBezierTo(
                (last.x + first.x) / 2,
                (last.y + first.y) / 2 - bumpSize * 0.5f,
                first.x,
                first.y
            )
            path.close()
        }

        return path
    }

    private fun calculateCentroid(
        points: List<NormalizedPoint>,
        pageWidth: Float,
        pageHeight: Float,
        canvasWidth: Float,
        canvasHeight: Float
    ): Offset {
        if (points.isEmpty()) return Offset.Zero

        var sumX = 0f
        var sumY = 0f
        points.forEach { point ->
            val p = toScreenCoords(point, pageWidth, pageHeight, canvasWidth, canvasHeight)
            sumX += p.x
            sumY += p.y
        }
        return Offset(sumX / points.size, sumY / points.size)
    }

    // ============ COORDINATE CONVERSION ============

    /**
     * Convert normalized coordinates (0-1) to screen coordinates
     */
    fun toScreenCoords(
        point: NormalizedPoint,
        pageWidth: Float,
        pageHeight: Float,
        canvasWidth: Float = pageWidth,
        canvasHeight: Float = pageHeight
    ): Offset {
        // Calculate centering offset
        val offsetX = (canvasWidth - pageWidth) / 2
        val offsetY = (canvasHeight - pageHeight) / 2

        return Offset(
            offsetX + point.x * pageWidth,
            offsetY + point.y * pageHeight
        )
    }

    /**
     * Convert screen coordinates to normalized coordinates (0-1)
     */
    fun toNormalizedCoords(
        offset: Offset,
        pageWidth: Float,
        pageHeight: Float,
        canvasWidth: Float = pageWidth,
        canvasHeight: Float = pageHeight
    ): NormalizedPoint {
        // Calculate centering offset
        val offsetX = (canvasWidth - pageWidth) / 2
        val offsetY = (canvasHeight - pageHeight) / 2

        return NormalizedPoint(
            x = ((offset.x - offsetX) / pageWidth).coerceIn(0f, 1f),
            y = ((offset.y - offsetY) / pageHeight).coerceIn(0f, 1f)
        )
    }

    // ============ COLOR PARSING ============

    /**
     * Parse hex color string to Compose Color
     */
    fun parseColor(hexColor: String): Color {
        return try {
            val hex = hexColor.removePrefix("#")
            val colorInt = when (hex.length) {
                6 -> android.graphics.Color.parseColor("#FF$hex")
                8 -> android.graphics.Color.parseColor("#$hex")
                else -> android.graphics.Color.BLUE
            }
            Color(colorInt)
        } catch (e: Exception) {
            Color(0xFF3B82F6) // Default blue
        }
    }

    // ============ HIT TESTING ============

    /**
     * Check if a screen point is within an annotation's bounds
     */
    fun hitTest(
        annotation: AnnotationDraft,
        screenPoint: Offset,
        pageWidth: Float,
        pageHeight: Float,
        canvasWidth: Float = pageWidth,
        canvasHeight: Float = pageHeight,
        tolerance: Float = 20f
    ): Boolean {
        return when {
            annotation.isPoint -> {
                val pos = toScreenCoords(annotation.position, pageWidth, pageHeight, canvasWidth, canvasHeight)
                (screenPoint - pos).getDistance() <= tolerance
            }
            annotation.isLine -> {
                val start = toScreenCoords(annotation.position, pageWidth, pageHeight, canvasWidth, canvasHeight)
                val end = annotation.endPoint?.let { toScreenCoords(it, pageWidth, pageHeight, canvasWidth, canvasHeight) }
                    ?: return false
                pointToLineDistance(screenPoint, start, end) <= tolerance
            }
            annotation.isShape -> {
                val topLeft = toScreenCoords(annotation.position, pageWidth, pageHeight, canvasWidth, canvasHeight)
                val width = (annotation.width ?: 0f) * pageWidth
                val height = (annotation.height ?: 0f) * pageHeight
                val rect = Rect(topLeft.x, topLeft.y, topLeft.x + width, topLeft.y + height)
                rect.inflate(tolerance).contains(screenPoint)
            }
            annotation.isMultiPoint -> {
                // Check if point is near any vertex or edge
                annotation.points.any { point ->
                    val p = toScreenCoords(point, pageWidth, pageHeight, canvasWidth, canvasHeight)
                    (screenPoint - p).getDistance() <= tolerance
                }
            }
            else -> false
        }
    }

    private fun pointToLineDistance(point: Offset, lineStart: Offset, lineEnd: Offset): Float {
        val lineVec = lineEnd - lineStart
        val pointVec = point - lineStart
        val lineLenSq = lineVec.x * lineVec.x + lineVec.y * lineVec.y

        if (lineLenSq == 0f) return (point - lineStart).getDistance()

        val t = ((pointVec.x * lineVec.x + pointVec.y * lineVec.y) / lineLenSq).coerceIn(0f, 1f)
        val projection = lineStart + Offset(lineVec.x * t, lineVec.y * t)

        return (point - projection).getDistance()
    }

    private fun Rect.inflate(amount: Float): Rect {
        return Rect(
            left = left - amount,
            top = top - amount,
            right = right + amount,
            bottom = bottom + amount
        )
    }

    /**
     * Parse scale string to get the ratio for converting pixels to feet.
     * The scale string format is: "pixelDistance/realWorldDistanceInFeet"
     * For example, if calibration measured 200 pixels = 5 feet, scale = "200/5" = "40"
     *
     * Returns pixels per foot ratio.
     * Simple calculation: pixelDistance / scale = realWorldFeet
     */
    private fun parseScaleToPixelsPerFoot(scaleString: String, pageWidth: Float): Float {
        try {
            // Try to parse as direct number (pixels per foot)
            val pixelsPerFoot = scaleString.toFloatOrNull()
            if (pixelsPerFoot != null && pixelsPerFoot > 0) {
                return pixelsPerFoot
            }

            // Try format "pixels/feet" like "200/5"
            if (scaleString.contains("/") && !scaleString.contains("\"") && !scaleString.contains("'")) {
                val parts = scaleString.split("/")
                if (parts.size == 2) {
                    val pixels = parts[0].trim().toFloatOrNull()
                    val feet = parts[1].trim().toFloatOrNull()
                    if (pixels != null && feet != null && feet > 0) {
                        return pixels / feet
                    }
                }
            }

            // Parse architectural scales like "1/4\" = 1'-0\"" or "1\" = 1'-0\""
            if (scaleString.contains("=") && scaleString.contains("\"")) {
                val parts = scaleString.split("=").map { it.trim() }
                if (parts.size == 2) {
                    val paperPart = parts[0].trim()  // e.g., "1/4\"" or "1\""
                    val realPart = parts[1].trim()   // e.g., "1'-0\"" or "10'"

                    // Parse paper measurement in inches
                    val paperInches = when {
                        paperPart.contains("/") -> {
                            // Fractional inch like "1/4\""
                            val fraction = paperPart.replace("\"", "").trim()
                            val fractionParts = fraction.split("/")
                            if (fractionParts.size == 2) {
                                val num = fractionParts[0].toFloatOrNull() ?: 0f
                                val den = fractionParts[1].toFloatOrNull() ?: 1f
                                num / den
                            } else 0f
                        }
                        else -> {
                            // Whole inch like "1\"" or "3\""
                            paperPart.replace("\"", "").trim().toFloatOrNull() ?: 0f
                        }
                    }

                    // Parse real measurement in feet
                    val realFeet = when {
                        realPart.contains("'") && realPart.contains("-") -> {
                            // Format like "1'-0\"" or "10'-6\""
                            val feetPart = realPart.substringBefore("'").trim().toFloatOrNull() ?: 0f
                            val inchesPart = realPart.substringAfter("-").replace("\"", "").trim().toFloatOrNull() ?: 0f
                            feetPart + (inchesPart / 12f)
                        }
                        realPart.contains("'") -> {
                            // Format like "60'" (feet only with apostrophe)
                            realPart.replace("'", "").replace("\"", "").trim().toFloatOrNull() ?: 0f
                        }
                        else -> {
                            // Format like "60" (just the number, no apostrophe)
                            // Common in engineering drawings
                            realPart.replace("\"", "").trim().toFloatOrNull() ?: 0f
                        }
                    }

                    if (paperInches > 0 && realFeet > 0) {
                        // Architectural scales represent: X inches on paper = Y feet in real life
                        // So 1 foot in real life = (paperInches / realFeet) inches on paper
                        // Assuming standard 96 DPI: 1 inch = 96 pixels
                        // But we need to calibrate based on actual PDF width
                        // Use a standard assumption: US Letter width = 8.5 inches at 72 DPI = 612 pixels
                        val estimatedDPI = pageWidth / 8.5f // Rough estimate
                        val pixelsPerInchOnPaper = estimatedDPI
                        val inchesOnPaperPerFootReal = paperInches / realFeet
                        return inchesOnPaperPerFootReal * pixelsPerInchOnPaper
                    }
                }
            }

            // Parse metric scales like "1:100" or "1:50"
            if (scaleString.contains(":")) {
                val parts = scaleString.split(":")
                if (parts.size == 2) {
                    val paperUnits = parts[0].trim().toFloatOrNull() ?: 0f
                    val realUnits = parts[1].trim().toFloatOrNull() ?: 0f
                    if (paperUnits > 0 && realUnits > 0) {
                        // 1:100 means 1 unit on paper = 100 units in reality
                        // Convert to pixels per foot
                        // Assuming 1 meter = 3.28084 feet
                        val estimatedDPI = pageWidth / 8.5f
                        val pixelsPerUnitOnPaper = estimatedDPI / 25.4f // Convert DPI to pixels per mm
                        val unitsOnPaperPerMeterReal = paperUnits / (realUnits / 1000f) // mm on paper per meter real
                        val metersRealPerFootReal = 1f / 3.28084f
                        return unitsOnPaperPerMeterReal * metersRealPerFootReal * pixelsPerUnitOnPaper
                    }
                }
            }
        } catch (e: Exception) {
            // Parsing failed
        }

        return 0f // Invalid scale
    }
}
