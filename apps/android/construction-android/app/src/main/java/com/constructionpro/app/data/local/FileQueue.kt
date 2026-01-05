package com.constructionpro.app.data.local

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import java.io.File
import java.util.UUID

object FileQueue {
  fun queueFile(
    context: Context,
    projectId: String,
    dailyLogId: String?,
    category: String,
    uri: Uri
  ): PendingFileEntity? {
    val resolver = context.contentResolver
    val targetDir = File(context.filesDir, "offline_files")
    if (!targetDir.exists()) {
      targetDir.mkdirs()
    }

    val name = resolveFileName(resolver, uri) ?: "file_${System.currentTimeMillis()}"
    val safeName = name.replace(Regex("[^a-zA-Z0-9._-]"), "_")
    val uniqueName = "${System.currentTimeMillis()}_${UUID.randomUUID()}_$safeName"
    val targetFile = File(targetDir, uniqueName)
    val copied = runCatching {
      resolver.openInputStream(uri)?.use { input ->
        targetFile.outputStream().use { output ->
          input.copyTo(output)
        }
      }
      targetFile
    }.getOrNull() ?: return null

    return PendingFileEntity(
      id = UUID.randomUUID().toString(),
      projectId = projectId,
      dailyLogId = dailyLogId,
      localPath = copied.absolutePath,
      fileName = name,
      category = category,
      status = PendingFileStatus.PENDING,
      retryCount = 0,
      createdAt = System.currentTimeMillis()
    )
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
