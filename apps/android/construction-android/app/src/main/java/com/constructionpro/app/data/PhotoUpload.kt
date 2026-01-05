package com.constructionpro.app.data

import android.content.ContentResolver
import android.net.Uri
import android.provider.OpenableColumns
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody

suspend fun uploadDailyLogPhotos(
  apiService: ApiService,
  resolver: ContentResolver,
  projectId: String,
  dailyLogId: String,
  photos: List<Uri>,
  location: LocationResult?
) {
  photos.forEach { uri ->
    val name = resolveFileName(resolver, uri) ?: "daily-log-photo.jpg"
    val bytes = resolver.openInputStream(uri)?.use { it.readBytes() } ?: return@forEach
    val mediaType = (resolver.getType(uri) ?: "image/*").toMediaType()
    val fileBody = bytes.toRequestBody(mediaType)
    val filePart = MultipartBody.Part.createFormData("file", name, fileBody)

    val textType = "text/plain".toMediaType()
    val projectBody = projectId.toRequestBody(textType)
    val logBody = dailyLogId.toRequestBody(textType)
    val categoryBody = "PHOTOS".toRequestBody(textType)
    val latBody = location?.latitude?.toString()?.toRequestBody(textType)
    val lngBody = location?.longitude?.toString()?.toRequestBody(textType)

    apiService.uploadDailyLogPhoto(
      file = filePart,
      projectId = projectBody,
      dailyLogId = logBody,
      category = categoryBody,
      gpsLatitude = latBody,
      gpsLongitude = lngBody
    )
  }
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
