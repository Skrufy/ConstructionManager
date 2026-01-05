package com.constructionpro.app.data.model

import kotlinx.serialization.Serializable

// ============ UPLOAD TYPE ============

object UploadType {
    const val DOCUMENT = "DOCUMENTS"
    const val DRAWING = "DRAWINGS"
    const val PHOTO = "PHOTOS"
    const val OTHER = "OTHER"

    fun displayName(type: String): String = when (type) {
        DOCUMENT -> "Document"
        DRAWING -> "Drawing"
        PHOTO -> "Photo"
        OTHER -> "Other"
        else -> type
    }

    val uploadOptions = listOf(DOCUMENT, DRAWING)
}

// ============ SIGNED URL REQUEST/RESPONSE ============

@Serializable
data class SignedUrlRequest(
    val fileName: String,
    val fileSize: Long,
    val projectId: String,
    val category: String? = null
)

@Serializable
data class SignedUrlResponse(
    val signedUrl: String,
    val token: String,
    val storagePath: String,
    val fileName: String,
    val uploadData: UploadData
)

@Serializable
data class UploadData(
    val projectId: String,
    val category: String? = null,
    val originalFileName: String,
    val storagePath: String,
    val fileSize: Long,
    val uploaderId: String
)

// ============ CONFIRM UPLOAD ============

@Serializable
data class ConfirmUploadRequest(
    val projectId: String,
    val storagePath: String,
    val originalFileName: String,
    val fileSize: Long? = null,
    val category: String? = null,
    val description: String? = null,
    val tags: List<String>? = null,
    val dailyLogId: String? = null,
    val gpsLatitude: Double? = null,
    val gpsLongitude: Double? = null
)

@Serializable
data class ConfirmUploadResponse(
    val message: String,
    val file: UploadedFile
)

// Note: UploadedFile is defined in FileUpload.kt

// ============ UPLOAD PROGRESS STATE ============

enum class UploadStep {
    IDLE,
    REQUESTING_URL,
    UPLOADING,
    CONFIRMING,
    COMPLETE,
    ERROR
}

data class UploadProgress(
    val step: UploadStep = UploadStep.IDLE,
    val progress: Float = 0f, // 0.0 to 1.0
    val bytesUploaded: Long = 0,
    val totalBytes: Long = 0,
    val errorMessage: String? = null
)
