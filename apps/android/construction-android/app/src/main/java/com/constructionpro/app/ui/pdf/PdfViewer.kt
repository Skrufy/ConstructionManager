package com.constructionpro.app.ui.pdf

import android.graphics.Bitmap
import android.graphics.Paint
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import android.util.LruCache
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.Closeable
import java.io.File
import kotlin.math.hypot

enum class AnnotationTool {
  PAN,
  LINE,
  FREEHAND,
  MEASURE,
  CALIBRATE
}

data class MeasurementInfo(
  val value: Double,
  val unit: String
)

data class AnnotationDraft(
  val type: String,
  val pageNumber: Int,
  val points: List<Offset>,
  val measurement: MeasurementInfo? = null
)

data class CalibrationLine(
  val pageNumber: Int,
  val points: List<Offset>
)

data class PageCalibration(
  val unitsPerPoint: Double,
  val unitLabel: String
)

@Composable
fun PdfPageViewer(
  filePath: String,
  pageIndex: Int,
  tool: AnnotationTool,
  annotations: List<AnnotationDraft>,
  calibration: PageCalibration?,
  resetToken: Int,
  onAnnotationDraft: (AnnotationDraft) -> Unit,
  onCalibrationLine: (CalibrationLine) -> Unit,
  onMissingCalibration: () -> Unit
) {
  val renderer = rememberPdfRenderer(filePath)
  val density = LocalDensity.current
  var bitmap by remember(filePath, pageIndex) { mutableStateOf<Bitmap?>(null) }
  var renderScale by remember(filePath, pageIndex) { mutableStateOf(1f) }

  var zoom by remember { mutableStateOf(1f) }
  var offset by remember { mutableStateOf(Offset.Zero) }
  var activePoints by remember { mutableStateOf<List<Offset>>(emptyList()) }

  BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
    val targetWidthPx = with(density) { maxWidth.toPx() }.toInt().coerceAtLeast(1)

    LaunchedEffect(filePath, pageIndex, targetWidthPx) {
      val rendered = withContext(Dispatchers.IO) {
        renderer?.renderPage(pageIndex, targetWidthPx)
      }
      bitmap = rendered?.bitmap
      renderScale = rendered?.renderScale ?: 1f
    }

    LaunchedEffect(resetToken) {
      zoom = 1f
      offset = Offset.Zero
    }

    LaunchedEffect(tool) {
      activePoints = emptyList()
    }

    val toPdf: (Offset) -> Offset = { screen ->
      if (renderScale == 0f || zoom == 0f) {
        Offset.Zero
      } else {
        ((screen - offset) / zoom) / renderScale
      }
    }
    val toScreen: (Offset) -> Offset = { pdf ->
      pdf * renderScale
    }

    val drawTool = tool != AnnotationTool.PAN

    Box(
      modifier = Modifier
        .fillMaxSize()
        .pointerInput(tool, renderScale, zoom, offset) {
          if (drawTool) {
            detectDragGestures(
              onDragStart = { start ->
                activePoints = listOf(toPdf(start))
              },
              onDrag = { change, _ ->
                val next = toPdf(change.position)
                activePoints = if (tool == AnnotationTool.FREEHAND) {
                  activePoints + next
                } else {
                  listOf(activePoints.firstOrNull() ?: next, next)
                }
              },
              onDragEnd = {
                val pageNumber = pageIndex + 1
                val points = activePoints
                activePoints = emptyList()
                if (points.size < 2) return@detectDragGestures
                when (tool) {
                  AnnotationTool.CALIBRATE -> onCalibrationLine(CalibrationLine(pageNumber, points))
                  AnnotationTool.MEASURE -> {
                    if (calibration == null) {
                      onMissingCalibration()
                      return@detectDragGestures
                    }
                    val distance = distance(points.first(), points.last())
                    val value = distance * calibration.unitsPerPoint
                    onAnnotationDraft(
                      AnnotationDraft(
                        type = "MEASUREMENT",
                        pageNumber = pageNumber,
                        points = points.take(2),
                        measurement = MeasurementInfo(value, calibration.unitLabel)
                      )
                    )
                  }
                  AnnotationTool.LINE -> onAnnotationDraft(
                    AnnotationDraft(
                      type = "LINE",
                      pageNumber = pageNumber,
                      points = points.take(2)
                    )
                  )
                  AnnotationTool.FREEHAND -> onAnnotationDraft(
                    AnnotationDraft(
                      type = "FREEHAND",
                      pageNumber = pageNumber,
                      points = points
                    )
                  )
                  AnnotationTool.PAN -> Unit
                }
              }
            )
          }
        }
    ) {
      bitmap?.let { bmp ->
        Box(
          modifier = Modifier
            .fillMaxSize()
            .pointerInput(tool) {
              if (tool == AnnotationTool.PAN) {
                detectTransformGestures { _, pan, zoomChange, _ ->
                  val nextZoom = (zoom * zoomChange).coerceIn(0.5f, 5f)
                  zoom = nextZoom
                  offset += pan
                }
              }
            }
        ) {
          Box(
            modifier = Modifier.fillMaxSize()
          ) {
            Box(
              modifier = Modifier
                .fillMaxSize()
                .graphicsLayer {
                  scaleX = zoom
                  scaleY = zoom
                  translationX = offset.x
                  translationY = offset.y
                }
            ) {
              Image(
                bitmap = bmp.asImageBitmap(),
                contentDescription = null,
                modifier = Modifier.fillMaxSize()
              )
              PdfAnnotationLayer(
                annotations = annotations,
                activePoints = activePoints,
                toScreen = toScreen,
                modifier = Modifier.fillMaxSize()
              )
            }
          }
        }
      }
    }
  }
}

@Composable
fun PdfThumbnailStrip(
  filePath: String,
  pageCount: Int,
  selectedPage: Int,
  onSelectPage: (Int) -> Unit
) {
  val renderer = rememberPdfRenderer(filePath)
  val density = LocalDensity.current
  val thumbWidth = 96.dp
  val targetWidthPx = with(density) { thumbWidth.toPx() }.toInt().coerceAtLeast(1)

  LazyRow(modifier = Modifier.fillMaxWidth().height(140.dp).padding(vertical = 8.dp)) {
    items((0 until pageCount).toList()) { index ->
      var thumbnail by remember(filePath, index) { mutableStateOf<Bitmap?>(null) }
      LaunchedEffect(filePath, index, targetWidthPx) {
        val rendered = withContext(Dispatchers.IO) {
          renderer?.renderPage(index, targetWidthPx)
        }
        thumbnail = rendered?.bitmap
      }
      Box(
        modifier = Modifier
          .padding(horizontal = 4.dp)
      ) {
        thumbnail?.let { bmp ->
          Image(
            bitmap = bmp.asImageBitmap(),
            contentDescription = null,
            modifier = Modifier
              .size(thumbWidth, (thumbWidth.value * 1.3f).dp)
              .graphicsLayer {
                alpha = if (index == selectedPage) 1f else 0.6f
              }
              .clickable { onSelectPage(index) }
          )
        }
      }
    }
  }
}

@Composable
private fun PdfAnnotationLayer(
  annotations: List<AnnotationDraft>,
  activePoints: List<Offset>,
  toScreen: (Offset) -> Offset,
  modifier: Modifier = Modifier
) {
  val textPaint = remember {
    Paint().apply {
      color = android.graphics.Color.BLACK
      textSize = 32f
      isAntiAlias = true
    }
  }

  androidx.compose.foundation.Canvas(modifier = modifier) {
    annotations.forEach { annotation ->
      val points = annotation.points.map(toScreen)
      when (annotation.type) {
        "FREEHAND" -> {
          if (points.size > 1) {
            val path = Path().apply {
              moveTo(points.first().x, points.first().y)
              points.drop(1).forEach { lineTo(it.x, it.y) }
            }
            drawPath(path, color = Color.Red, style = Stroke(width = 3f))
          }
        }
        "LINE", "MEASUREMENT" -> {
          if (points.size >= 2) {
            drawLine(
              color = if (annotation.type == "MEASUREMENT") Color.Blue else Color.Green,
              start = points.first(),
              end = points.last(),
              strokeWidth = 3f
            )
            annotation.measurement?.let { measurement ->
              val mid = Offset(
                (points.first().x + points.last().x) / 2f,
                (points.first().y + points.last().y) / 2f
              )
              drawIntoCanvas { canvas ->
                canvas.nativeCanvas.drawText(
                  "${measurement.value.format(2)} ${measurement.unit}",
                  mid.x + 8f,
                  mid.y - 8f,
                  textPaint
                )
              }
            }
          }
        }
      }
    }

    if (activePoints.size >= 2) {
      val points = activePoints.map(toScreen)
      drawLine(
        color = Color.Magenta,
        start = points.first(),
        end = points.last(),
        strokeWidth = 2f
      )
    }
  }
}

private data class RenderedPage(
  val bitmap: Bitmap,
  val renderScale: Float,
  val pageWidth: Int,
  val pageHeight: Int
)

private class PdfDocumentRenderer(filePath: String) : Closeable {
  private val fileDescriptor = ParcelFileDescriptor.open(File(filePath), ParcelFileDescriptor.MODE_READ_ONLY)
  private val renderer = PdfRenderer(fileDescriptor)

  fun renderPage(pageIndex: Int, targetWidthPx: Int): RenderedPage {
    val cacheKey = "${fileDescriptor.statSize}|$pageIndex|$targetWidthPx"
    val cached = PdfBitmapCache.get(cacheKey)
    if (cached != null) {
      val page = renderer.openPage(pageIndex)
      val scale = targetWidthPx.toFloat() / page.width.toFloat()
      val width = page.width
      val height = page.height
      page.close()
      return RenderedPage(
        bitmap = cached,
        renderScale = scale,
        pageWidth = width,
        pageHeight = height
      )
    }

    val page = renderer.openPage(pageIndex)
    val scale = targetWidthPx.toFloat() / page.width.toFloat()
    val targetHeight = (page.height * scale).toInt().coerceAtLeast(1)
    val bitmap = Bitmap.createBitmap(targetWidthPx, targetHeight, Bitmap.Config.ARGB_8888)
    page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
    page.close()
    PdfBitmapCache.put(cacheKey, bitmap)
    return RenderedPage(
      bitmap = bitmap,
      renderScale = scale,
      pageWidth = page.width,
      pageHeight = page.height
    )
  }

  val pageCount: Int
    get() = renderer.pageCount

  override fun close() {
    renderer.close()
    fileDescriptor.close()
  }
}

private object PdfBitmapCache {
  private const val MAX_BYTES = 64 * 1024 * 1024
  private val cache = object : LruCache<String, Bitmap>(MAX_BYTES) {
    override fun sizeOf(key: String, value: Bitmap): Int {
      return value.byteCount
    }
  }

  fun get(key: String): Bitmap? = cache.get(key)

  fun put(key: String, bitmap: Bitmap) {
    cache.put(key, bitmap)
  }
}

@Composable
private fun rememberPdfRenderer(filePath: String): PdfDocumentRenderer? {
  val renderer = remember(filePath) {
    if (filePath.isBlank()) null else PdfDocumentRenderer(filePath)
  }
  DisposableEffect(renderer) {
    onDispose {
      renderer?.close()
    }
  }
  return renderer
}

private fun distance(a: Offset, b: Offset): Double {
  return hypot((b.x - a.x).toDouble(), (b.y - a.y).toDouble())
}

private fun Double.format(decimals: Int): String {
  return "%.${decimals}f".format(this)
}
