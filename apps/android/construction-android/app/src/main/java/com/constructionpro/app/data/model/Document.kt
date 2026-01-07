package com.constructionpro.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

@Serializable
data class DocumentsResponse(
  val documents: List<DocumentSummary> = emptyList(),
  val pagination: DocumentPagination? = null,
  val categories: Map<String, Int> = emptyMap()
)

@Serializable
data class DocumentPagination(
  val page: Int? = null,
  val limit: Int? = null,
  val total: Int? = null,
  val pages: Int? = null
)

@Serializable
data class DocumentSummary(
  val id: String,
  val name: String,
  val type: String? = null,
  val category: String? = null,
  val description: String? = null,
  val storagePath: String? = null,
  val createdAt: String? = null,
  val project: DocumentProject? = null,
  val uploader: DocumentUser? = null,
  val blasters: List<DocumentUser> = emptyList(),
  val metadata: DocumentMetadata? = null,
  val revisions: List<DocumentRevision> = emptyList(),
  @SerialName("_count") val count: DocumentCount? = null
)

@Serializable
data class DocumentProject(
  val id: String? = null,
  val name: String? = null,
  val address: String? = null
)

@Serializable
data class DocumentUser(
  val id: String? = null,
  val name: String? = null,
  val email: String? = null
)

@Serializable
data class DocumentMetadata(
  val discipline: String? = null,
  val drawingNumber: String? = null,
  val sheetTitle: String? = null,
  val revision: String? = null,
  val scale: String? = null,
  val building: String? = null,
  val floor: String? = null,
  val zone: String? = null
)

@Serializable
data class DocumentRevision(
  val id: String? = null,
  val version: Int? = null,
  val storagePath: String? = null,
  val changeNotes: String? = null,
  val uploadedBy: String? = null,
  val fileSize: Int? = null,
  val checksum: String? = null,
  val createdAt: String? = null
)

@Serializable
data class DocumentCount(
  val revisions: Int? = null,
  val annotations: Int? = null
)

@Serializable
data class DocumentDetailResponse(
  val document: DocumentDetail
)

@Serializable
data class DocumentDetail(
  val id: String,
  val name: String,
  val type: String? = null,
  val category: String? = null,
  val description: String? = null,
  val storagePath: String? = null,
  val createdAt: String? = null,
  val project: DocumentProject? = null,
  val uploader: DocumentUser? = null,
  val metadata: DocumentMetadata? = null,
  val revisions: List<DocumentRevision> = emptyList(),
  val annotations: List<DocumentAnnotation> = emptyList(),
  @SerialName("_count") val count: DocumentCount? = null
)

@Serializable
data class DocumentAnnotation(
  val id: String? = null,
  val annotationType: String? = null,
  val content: JsonElement? = null,
  val pageNumber: Int? = null,
  val createdBy: String? = null,
  val resolvedAt: String? = null,
  val resolvedBy: String? = null,
  val createdAt: String? = null
)
