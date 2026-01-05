package com.constructionpro.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class UploadResponse(
  val message: String? = null,
  val file: UploadedFile? = null
)

@Serializable
data class UploadedFile(
  val id: String? = null,
  val name: String? = null,
  val type: String? = null,
  val project: UploadedProject? = null
)

@Serializable
data class UploadedProject(
  val id: String? = null,
  val name: String? = null
)

@Serializable
data class FileUploadResponse(
  val success: Boolean = false,
  val file: UploadedFileDetail? = null
)

@Serializable
data class UploadedFileDetail(
  val id: String,
  val name: String,
  val url: String,
  val category: String,
  val fileType: String,
  val fileSize: Long,
  val createdAt: String
)
