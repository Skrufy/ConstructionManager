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
  @SerialName("storage_path") val storagePath: String? = null,
  @SerialName("created_at") val createdAt: String? = null,
  val project: DocumentProject? = null,
  val uploader: DocumentUser? = null,
  @SerialName("blaster_assignments") val blasters: List<BlasterAssignment> = emptyList(),
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
data class BlasterAssignment(
  val id: String,
  val blaster: DocumentUser
)

@Serializable
data class DocumentMetadata(
  val discipline: String? = null,
  @SerialName("drawing_number") val drawingNumber: String? = null,
  @SerialName("sheet_title") val sheetTitle: String? = null,
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
  @SerialName("storage_path") val storagePath: String? = null,
  @SerialName("change_notes") val changeNotes: String? = null,
  @SerialName("uploaded_by") val uploadedBy: String? = null,
  @SerialName("file_size") val fileSize: Int? = null,
  val checksum: String? = null,
  @SerialName("created_at") val createdAt: String? = null
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
  @SerialName("storage_path") val storagePath: String? = null,
  @SerialName("created_at") val createdAt: String? = null,
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
  @SerialName("annotation_type") val annotationType: String? = null,
  val content: JsonElement? = null,
  @SerialName("page_number") val pageNumber: Int? = null,
  @SerialName("created_by") val createdBy: String? = null,
  @SerialName("resolved_at") val resolvedAt: String? = null,
  @SerialName("resolved_by") val resolvedBy: String? = null,
  @SerialName("created_at") val createdAt: String? = null
)
