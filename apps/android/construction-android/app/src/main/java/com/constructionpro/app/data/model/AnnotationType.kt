package com.constructionpro.app.data.model

import kotlinx.serialization.Serializable

/**
 * All annotation types supported by the drawing viewer.
 * Matches web app's 13 annotation types from /src/types/annotations.ts
 */
enum class AnnotationType(val value: String, val shortcut: Char, val displayName: String) {
    PIN("PIN", 'P', "Pin"),
    COMMENT("COMMENT", 'C', "Comment"),
    RECTANGLE("RECTANGLE", 'R', "Rectangle"),
    CIRCLE("CIRCLE", 'O', "Circle"),
    CLOUD("CLOUD", 'K', "Cloud"),
    ARROW("ARROW", 'A', "Arrow"),
    LINE("LINE", 'L', "Line"),
    CALLOUT("CALLOUT", 'N', "Callout"),
    MEASUREMENT("MEASUREMENT", 'M', "Measurement"),
    AREA("AREA", 'E', "Area"),
    FREEHAND("FREEHAND", 'F', "Freehand"),
    MARKUP("MARKUP", 'X', "Markup"),      // Legacy
    HIGHLIGHT("HIGHLIGHT", 'H', "Highlight"); // Legacy

    companion object {
        fun fromValue(value: String): AnnotationType? =
            entries.find { it.value.equals(value, ignoreCase = true) }

        fun fromShortcut(shortcut: Char): AnnotationType? =
            entries.find { it.shortcut == shortcut.uppercaseChar() }
    }
}

/**
 * Annotation tool states for the toolbar
 */
enum class AnnotationTool {
    SELECT,      // Pointer/select mode (V key)
    PAN,         // Pan/zoom mode
    PIN,
    COMMENT,
    RECTANGLE,
    CIRCLE,
    CLOUD,
    ARROW,
    LINE,
    CALLOUT,
    MEASUREMENT,
    AREA,
    FREEHAND,
    CALIBRATE;   // Scale calibration mode

    fun toAnnotationType(): AnnotationType? = when (this) {
        PIN -> AnnotationType.PIN
        COMMENT -> AnnotationType.COMMENT
        RECTANGLE -> AnnotationType.RECTANGLE
        CIRCLE -> AnnotationType.CIRCLE
        CLOUD -> AnnotationType.CLOUD
        ARROW -> AnnotationType.ARROW
        LINE -> AnnotationType.LINE
        CALLOUT -> AnnotationType.CALLOUT
        MEASUREMENT -> AnnotationType.MEASUREMENT
        AREA -> AnnotationType.AREA
        FREEHAND -> AnnotationType.FREEHAND
        else -> null
    }
}

/**
 * Normalized point with coordinates from 0-1 relative to page dimensions
 */
@Serializable
data class NormalizedPoint(
    val x: Float,
    val y: Float
) {
    companion object {
        val ZERO = NormalizedPoint(0f, 0f)
    }
}

/**
 * Entity types that can be linked to PINs
 */
enum class LinkedEntityType(val value: String, val displayName: String) {
    COMMENT("COMMENT", "Comment"),
    ISSUE("ISSUE", "Issue"),
    RFI("RFI", "RFI"),
    PUNCH_LIST_ITEM("PUNCH_LIST_ITEM", "Punch List Item");

    companion object {
        fun fromValue(value: String): LinkedEntityType? =
            entries.find { it.value.equals(value, ignoreCase = true) }
    }
}

/**
 * Linked entity for PIN annotations
 */
@Serializable
data class LinkedEntity(
    val type: String,
    val id: String,
    val title: String? = null,
    val status: String? = null
)

/**
 * Default annotation colors matching web app
 */
object AnnotationColors {
    const val RED = "#EF4444"
    const val ORANGE = "#F97316"
    const val YELLOW = "#EAB308"
    const val GREEN = "#22C55E"
    const val CYAN = "#06B6D4"
    const val BLUE = "#3B82F6"
    const val VIOLET = "#8B5CF6"
    const val BLACK = "#000000"

    val ALL = listOf(RED, ORANGE, YELLOW, GREEN, CYAN, BLUE, VIOLET, BLACK)
    val DEFAULT = BLUE
}

/**
 * Measurement information for MEASUREMENT and AREA annotations
 */
@Serializable
data class MeasurementInfo(
    val displayValue: String,       // e.g., "24'-6\"" or "450 sq ft"
    val rawPixelDistance: Float? = null,
    val rawPixelArea: Float? = null,
    val scale: String? = null       // e.g., "1/4\" = 1'-0\""
)

/**
 * Comprehensive annotation draft for creating/editing
 * Contains all possible fields for any annotation type
 */
data class AnnotationDraft(
    val id: String? = null,
    val type: AnnotationType,
    val pageNumber: Int,
    val position: NormalizedPoint,
    val endPoint: NormalizedPoint? = null,      // For LINE, ARROW, MEASUREMENT
    val width: Float? = null,                   // For RECTANGLE, CIRCLE
    val height: Float? = null,                  // For RECTANGLE, CIRCLE
    val rotation: Float? = null,                // For shapes
    val points: List<NormalizedPoint> = emptyList(), // For FREEHAND, AREA
    val color: String = AnnotationColors.DEFAULT,
    val strokeWidth: Float = 2f,
    val fillColor: String? = null,
    val fillOpacity: Float? = null,
    val label: String? = null,                  // For PIN, CALLOUT
    val text: String? = null,                   // For COMMENT
    val number: Int? = null,                    // For CALLOUT
    val leaderEndPoint: NormalizedPoint? = null, // For CALLOUT
    val bubbleRadius: Float? = null,            // For CALLOUT
    val measurement: MeasurementInfo? = null,   // For MEASUREMENT, AREA
    val linkedEntity: LinkedEntity? = null,     // For PIN
    val createdAt: String? = null,
    val createdBy: String? = null,
    val createdByName: String? = null,
    val resolvedAt: String? = null,
    val resolvedBy: String? = null,
    val isPending: Boolean = false              // Local-only: awaiting sync
) {
    /**
     * Check if this is a shape annotation (has width/height)
     */
    val isShape: Boolean
        get() = type in listOf(AnnotationType.RECTANGLE, AnnotationType.CIRCLE, AnnotationType.CLOUD)

    /**
     * Check if this is a line-based annotation
     */
    val isLine: Boolean
        get() = type in listOf(AnnotationType.LINE, AnnotationType.ARROW, AnnotationType.MEASUREMENT)

    /**
     * Check if this is a point annotation (single click)
     */
    val isPoint: Boolean
        get() = type in listOf(AnnotationType.PIN, AnnotationType.COMMENT, AnnotationType.CALLOUT)

    /**
     * Check if this is a multi-point annotation
     */
    val isMultiPoint: Boolean
        get() = type in listOf(AnnotationType.FREEHAND, AnnotationType.AREA)
}

/**
 * Active drawing state for preview while user is drawing
 */
sealed class DrawingState {
    data class Point(
        val position: NormalizedPoint,
        val type: AnnotationType,
        val color: String
    ) : DrawingState()

    data class Line(
        val start: NormalizedPoint,
        val end: NormalizedPoint,
        val type: AnnotationType,
        val color: String
    ) : DrawingState()

    data class Shape(
        val start: NormalizedPoint,
        val end: NormalizedPoint,
        val type: AnnotationType,
        val color: String
    ) : DrawingState()

    data class Path(
        val points: List<NormalizedPoint>,
        val type: AnnotationType,
        val color: String
    ) : DrawingState()

    data class Polygon(
        val points: List<NormalizedPoint>,
        val type: AnnotationType,
        val color: String,
        val isClosed: Boolean = false
    ) : DrawingState()
}
