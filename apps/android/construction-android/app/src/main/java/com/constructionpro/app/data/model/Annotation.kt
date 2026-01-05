package com.constructionpro.app.data.model

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

// ============ ANNOTATION API MODELS ============

@Serializable
data class AnnotationCreateRequest(
    val annotationType: String,
    val content: JsonElement,
    val pageNumber: Int? = null
)

@Serializable
data class AnnotationUpdateRequest(
    val annotationId: String,
    val resolved: Boolean? = null,
    val content: JsonElement? = null
)

@Serializable
data class AnnotationResponse(
    val annotation: DocumentAnnotation? = null
)

@Serializable
data class AnnotationsResponse(
    val annotations: List<DocumentAnnotation> = emptyList()
)

// ============ PIN API MODELS ============

@Serializable
data class PinCreateRequest(
    val pageNumber: Int,
    val position: NormalizedPointJson,
    val label: String? = null,
    val color: String? = null,
    val linkedEntity: LinkedEntityRequest? = null,
    val comment: String? = null
)

@Serializable
data class NormalizedPointJson(
    val x: Float,
    val y: Float
)

@Serializable
data class LinkedEntityRequest(
    val type: String,
    val id: String,
    val title: String? = null,
    val status: String? = null
)

@Serializable
data class PinUpdateRequest(
    val pinId: String,
    val resolve: Boolean? = null,
    val label: String? = null,
    val color: String? = null,
    val linkedEntity: LinkedEntityRequest? = null
)

@Serializable
data class PinsResponse(
    val pins: List<DocumentAnnotation> = emptyList()
)

@Serializable
data class PinResponse(
    val id: String? = null,
    val fileId: String? = null,
    val pageNumber: Int? = null,
    val createdBy: String? = null,
    val createdAt: String? = null,
    val resolvedAt: String? = null,
    val resolvedBy: String? = null,
    val type: String? = null,
    val position: NormalizedPointJson? = null,
    val color: String? = null,
    val label: String? = null,
    val linkedEntity: LinkedEntityJson? = null,
    val text: String? = null
)

@Serializable
data class LinkedEntityJson(
    val type: String? = null,
    val id: String? = null,
    val title: String? = null,
    val status: String? = null
)

// ============ SCALE API MODELS ============

@Serializable
data class ScaleResponse(
    val scale: String? = null
)

@Serializable
data class ScaleUpdateRequest(
    val scale: String
)

@Serializable
data class ScaleUpdateResponse(
    val success: Boolean = false,
    val scale: String? = null,
    val message: String? = null
)

// ============ ENTITY SEARCH MODELS (for PIN linking) ============

@Serializable
data class EntitySearchResult(
    val id: String,
    val type: String,
    val title: String,
    val status: String? = null,
    val projectId: String? = null,
    val projectName: String? = null
)

// ============ ANNOTATION CONTENT STRUCTURES ============
// These match the web app's content JSON structures

@Serializable
data class PinContentJson(
    val type: String = "PIN",
    val position: NormalizedPointJson,
    val color: String,
    val label: String? = null,
    val linkedEntity: LinkedEntityJson? = null,
    val text: String? = null
)

@Serializable
data class CommentContentJson(
    val type: String = "COMMENT",
    val position: NormalizedPointJson,
    val color: String,
    val text: String
)

@Serializable
data class ShapeContentJson(
    val type: String,
    val position: NormalizedPointJson,
    val width: Float,
    val height: Float,
    val color: String,
    val strokeWidth: Float = 2f,
    val fillColor: String? = null,
    val fillOpacity: Float? = null,
    val rotation: Float? = null
)

@Serializable
data class LineContentJson(
    val type: String,
    val position: NormalizedPointJson,
    val endPoint: NormalizedPointJson,
    val color: String,
    val strokeWidth: Float = 2f
)

@Serializable
data class ArrowContentJson(
    val type: String = "ARROW",
    val position: NormalizedPointJson,
    val endPoint: NormalizedPointJson,
    val color: String,
    val strokeWidth: Float = 2f
)

@Serializable
data class CalloutContentJson(
    val type: String = "CALLOUT",
    val position: NormalizedPointJson,
    val color: String,
    val number: Int,
    val text: String? = null,
    val leaderEndPoint: NormalizedPointJson? = null,
    val bubbleRadius: Float? = null
)

@Serializable
data class MeasurementContentJson(
    val type: String = "MEASUREMENT",
    val position: NormalizedPointJson,
    val endPoint: NormalizedPointJson,
    val color: String,
    val strokeWidth: Float = 2f,
    val displayValue: String,
    val rawPixelDistance: Float,
    val scale: String? = null
)

@Serializable
data class AreaContentJson(
    val type: String = "AREA",
    val position: NormalizedPointJson,  // First point / centroid
    val points: List<NormalizedPointJson>,
    val color: String,
    val strokeWidth: Float = 2f,
    val fillOpacity: Float = 0.2f,
    val displayArea: String,
    val rawPixelArea: Float,
    val scale: String? = null
)

@Serializable
data class FreehandContentJson(
    val type: String = "FREEHAND",
    val position: NormalizedPointJson,  // First point
    val path: List<NormalizedPointJson>,
    val color: String,
    val strokeWidth: Float = 2f
)

@Serializable
data class CloudContentJson(
    val type: String = "CLOUD",
    val position: NormalizedPointJson,
    val width: Float,
    val height: Float,
    val color: String,
    val strokeWidth: Float = 2f,
    val fillColor: String? = null,
    val fillOpacity: Float? = null
)
