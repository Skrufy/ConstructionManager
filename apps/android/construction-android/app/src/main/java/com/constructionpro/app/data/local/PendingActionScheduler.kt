package com.constructionpro.app.data.local

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

object PendingActionScheduler {
  private const val UNIQUE_NAME = "sync_queue"

  // Max retries before marking action as failed
  const val MAX_RETRY_COUNT = 5

  // Initial backoff delay in seconds (will double each retry: 30s, 60s, 120s, 240s, 480s)
  private const val INITIAL_BACKOFF_SECONDS = 30L

  fun enqueue(context: Context) {
    val constraints = Constraints.Builder()
      .setRequiredNetworkType(NetworkType.CONNECTED)
      .build()

    val request = OneTimeWorkRequestBuilder<SyncQueueWorker>()
      .setConstraints(constraints)
      .setBackoffCriteria(
        BackoffPolicy.EXPONENTIAL,
        INITIAL_BACKOFF_SECONDS,
        TimeUnit.SECONDS
      )
      .build()

    WorkManager.getInstance(context).enqueueUniqueWork(
      UNIQUE_NAME,
      ExistingWorkPolicy.KEEP,
      request
    )
  }
}
