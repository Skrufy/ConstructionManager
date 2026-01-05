package com.constructionpro.app.data.local

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.Data
import androidx.work.OneTimeWorkRequestBuilder
import com.constructionpro.app.data.ApiClient
import com.constructionpro.app.data.AuthTokenStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import retrofit2.HttpException
import java.io.IOException

class PrefetchDrawingsWorker(
  appContext: Context,
  params: WorkerParameters
) : CoroutineWorker(appContext, params) {

  override suspend fun doWork(): Result {
    val projectId = inputData.getString(KEY_PROJECT_ID) ?: return Result.failure()
    val api = ApiClient(AuthTokenStore(applicationContext)).apiService
    val cacheDao = AppDatabase.getInstance(applicationContext).documentCacheDao()

    return try {
      val drawings = api.getDrawings(projectId = projectId).drawings
      val workManager = WorkManager.getInstance(applicationContext)
      drawings.forEach { drawing ->
        val cached = withContext(Dispatchers.IO) { cacheDao.getById(drawing.id) }
        if (cached != null) return@forEach

        val url = api.getFileUrl(drawing.id, download = true).url ?: return@forEach
        val fileName = drawing.title ?: "drawing_${drawing.id}.pdf"
        val input = Data.Builder()
          .putString(DocumentDownloadWorker.KEY_FILE_ID, drawing.id)
          .putString(DocumentDownloadWorker.KEY_FILE_NAME, fileName)
          .putString(DocumentDownloadWorker.KEY_URL, url)
          .build()
        val request = OneTimeWorkRequestBuilder<DocumentDownloadWorker>()
          .setInputData(input)
          .addTag("prefetch_$projectId")
          .build()
        workManager.enqueue(request)
      }
      Result.success()
    } catch (error: Exception) {
      if (shouldRetry(error)) Result.retry() else Result.failure()
    }
  }

  private fun shouldRetry(error: Exception): Boolean {
    return when (error) {
      is IOException -> true
      is HttpException -> error.code() >= 500
      else -> false
    }
  }

  companion object {
    const val KEY_PROJECT_ID = "projectId"
  }
}
