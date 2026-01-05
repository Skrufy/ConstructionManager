package com.constructionpro.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class DrawingsResponse(
  val drawings: List<DrawingSummary> = emptyList(),
  val disciplines: List<String> = emptyList(),
  val projects: List<DrawingProjectSummary> = emptyList()
)

@Serializable
data class DrawingSummary(
  val id: String,
  val title: String? = null,
  val drawingNumber: String? = null,
  val revisionNumber: String? = null,
  val subcategory: String? = null,
  val fileUrl: String? = null,
  val fileType: String? = null,
  val scale: String? = null,
  val createdAt: String? = null,
  val project: DocumentProject? = null,
  val uploadedByUser: DocumentUser? = null,
  val isVerified: Boolean? = null,
  val isLatestRevision: Boolean? = null,
  val hasOcrMetadata: Boolean? = null,
  val annotationCount: Int? = null
)

@Serializable
data class DrawingProjectSummary(
  val id: String,
  val name: String,
  val drawingCount: Int? = null
)
