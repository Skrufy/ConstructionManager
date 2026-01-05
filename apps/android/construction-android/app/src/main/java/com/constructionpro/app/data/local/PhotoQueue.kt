package com.constructionpro.app.data.local

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import java.io.File
import java.util.UUID

object PhotoQueue {
  fun queuePhotos(
    context: Context,
    projectId: String,
    dailyLogId: String,
    photos: List<Uri>,
    gpsLatitude: Double?,
    gpsLongitude: Double?
  ): List<PendingPhotoEntity> {
    val resolver = context.contentResolver
    val targetDir = File(context.filesDir, "offline_photos")
    if (!targetDir.exists()) {
      targetDir.mkdirs()
    }

    val entries = mutableListOf<PendingPhotoEntity>()
    photos.forEach { uri ->
      val copied = copyToLocal(resolver, targetDir, uri) ?: return@forEach
      entries.add(
        PendingPhotoEntity(
          id = UUID.randomUUID().toString(),
          projectId = projectId,
          dailyLogId = dailyLogId,
          localPath = copied.absolutePath,
          gpsLatitude = gpsLatitude,
          gpsLongitude = gpsLongitude,
          status = PendingPhotoStatus.PENDING,
          retryCount = 0,
          createdAt = System.currentTimeMillis()
        )
      )
    }

    return entries
  }

  private fun copyToLocal(
    resolver: ContentResolver,
    targetDir: File,
    uri: Uri
  ): File? {
    val name = resolveFileName(resolver, uri) ?: "photo_${System.currentTimeMillis()}.jpg"
    val safeName = name.replace(Regex("[^a-zA-Z0-9._-]"), "_")
    val uniqueName = "${System.currentTimeMillis()}_${UUID.randomUUID()}_$safeName"
    val targetFile = File(targetDir, uniqueName)
    return runCatching {
      resolver.openInputStream(uri)?.use { input ->
        targetFile.outputStream().use { output ->
          input.copyTo(output)
        }
      }
      targetFile
    }.getOrNull()
  }

  private fun resolveFileName(resolver: ContentResolver, uri: Uri): String? {
    resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
      if (cursor.moveToFirst()) {
        val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
        if (index >= 0) {
          return cursor.getString(index)
        }
      }
    }
    return null
  }
}
