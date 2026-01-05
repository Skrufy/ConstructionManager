package com.constructionpro.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.constructionpro.app.R
import androidx.core.content.ContextCompat
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import android.Manifest
import android.net.Uri
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.DeviceLocationProvider
import com.constructionpro.app.data.LocationResult
import com.constructionpro.app.data.uploadDailyLogPhotos
import com.constructionpro.app.data.local.AppDatabase
import com.constructionpro.app.data.local.PendingActionEntity
import com.constructionpro.app.data.local.PendingActionScheduler
import com.constructionpro.app.data.local.PendingActionTypes
import com.constructionpro.app.data.local.PendingDailyLogUpdatePayload
import com.constructionpro.app.data.local.PendingStatus
import com.constructionpro.app.data.local.PhotoQueue
import com.constructionpro.app.data.model.DailyLogDetail
import com.constructionpro.app.data.model.DailyLogEntryRequest
import com.constructionpro.app.data.model.DailyLogIssueRequest
import com.constructionpro.app.data.model.DailyLogMaterialRequest
import com.constructionpro.app.data.model.DailyLogUpsertRequest
import com.constructionpro.app.data.model.DailyLogVisitorRequest
import com.constructionpro.app.data.model.WeatherData
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.UUID
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import retrofit2.HttpException
import java.io.IOException

private data class DailyLogEditState(
  val loading: Boolean = false,
  val saving: Boolean = false,
  val log: DailyLogDetail? = null,
  val error: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DailyLogEditScreen(
  apiService: ApiService,
  logId: String,
  onBack: () -> Unit,
  onSaved: () -> Unit
) {
  val scope = rememberCoroutineScope()
  val context = LocalContext.current
  val db = remember { AppDatabase.getInstance(context) }
  val pendingDao = remember { db.pendingActionDao() }
  val dailyLogDao = remember { db.dailyLogDao() }
  val pendingPhotoDao = remember { db.pendingPhotoDao() }
  val json = remember { Json { encodeDefaults = true } }
  var state by remember { mutableStateOf(DailyLogEditState(loading = true)) }

  var notes by remember { mutableStateOf("") }
  var weatherDelay by remember { mutableStateOf(false) }
  var weatherDelayNotes by remember { mutableStateOf("") }
  var weatherData by remember { mutableStateOf<WeatherData?>(null) }
  var weatherStatus by remember { mutableStateOf("Weather not captured yet.") }
  var location by remember { mutableStateOf<LocationResult?>(null) }
  var selectedPhotos by remember { mutableStateOf<List<Uri>>(emptyList()) }
  var isUploadingPhotos by remember { mutableStateOf(false) }

  val fetchWeather = {
    scope.launch {
      try {
        val provider = DeviceLocationProvider(context)
        val currentLocation = withContext(Dispatchers.IO) { provider.getCurrentLocation() }
        if (currentLocation == null) {
          weatherStatus = "Unable to get location for weather."
          return@launch
        }
        location = currentLocation
        val response = withContext(Dispatchers.IO) {
          apiService.getWeather(currentLocation.latitude, currentLocation.longitude)
        }
        weatherData = response
        weatherStatus = "Weather captured (${response.location})"
      } catch (exception: Exception) {
        weatherStatus = exception.message ?: "Failed to fetch weather."
      }
    }
  }

  val permissionLauncher = rememberLauncherForActivityResult(
    contract = ActivityResultContracts.RequestPermission()
  ) { granted ->
    if (granted) {
      fetchWeather()
    } else {
      weatherStatus = "Location permission needed to fetch weather."
    }
  }

  val photoPicker = rememberLauncherForActivityResult(
    contract = ActivityResultContracts.GetMultipleContents()
  ) { uris ->
    if (uris.isNotEmpty()) {
      selectedPhotos = selectedPhotos + uris
    }
  }

  fun loadLog() {
    scope.launch {
      state = state.copy(loading = true, error = null)
      try {
        val response = withContext(Dispatchers.IO) { apiService.getDailyLog(logId) }
        state = state.copy(loading = false, log = response.dailyLog)
      } catch (error: Exception) {
        state = state.copy(loading = false, error = error.message ?: "Failed to load daily log")
      }
    }
  }

  fun ensureLocationPermission() {
    val granted = ContextCompat.checkSelfPermission(
      context,
      Manifest.permission.ACCESS_FINE_LOCATION
    ) == android.content.pm.PackageManager.PERMISSION_GRANTED
    if (granted) {
      fetchWeather()
    } else {
      permissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
    }
  }

  fun saveLog() {
    val log = state.log ?: return

    scope.launch {
      state = state.copy(saving = true, error = null)
      try {
        val request = buildUpdateRequest(
          log = log,
          weatherData = weatherData,
          notes = notes,
          weatherDelay = weatherDelay,
          weatherDelayNotes = weatherDelayNotes
        )
        withContext(Dispatchers.IO) { apiService.updateDailyLog(logId, request) }
        if (selectedPhotos.isNotEmpty()) {
          isUploadingPhotos = true
          try {
            uploadDailyLogPhotos(
              apiService = apiService,
              resolver = context.contentResolver,
              projectId = log.project?.id.orEmpty(),
              dailyLogId = logId,
              photos = selectedPhotos,
              location = location
            )
          } catch (uploadError: Exception) {
            val queued = PhotoQueue.queuePhotos(
              context = context,
              projectId = log.project?.id.orEmpty(),
              dailyLogId = logId,
              photos = selectedPhotos,
              gpsLatitude = location?.latitude,
              gpsLongitude = location?.longitude
            )
            withContext(Dispatchers.IO) {
              queued.forEach { pendingPhotoDao.upsert(it) }
            }
            PendingActionScheduler.enqueue(context)
          }
          isUploadingPhotos = false
        }
        state = state.copy(saving = false)
        onSaved()
      } catch (error: Exception) {
        if (shouldQueueOffline(error)) {
          val request = buildUpdateRequest(
            log = log,
            weatherData = weatherData,
            notes = notes,
            weatherDelay = weatherDelay,
            weatherDelayNotes = weatherDelayNotes
          )
          // Parse updatedAt to epoch millis for conflict detection, default to 0 if null/unparseable
          val baseVersion = log.updatedAt?.let {
            try { java.time.Instant.parse(it).toEpochMilli() } catch (_: Exception) { 0L }
          } ?: 0L
          val payload = PendingDailyLogUpdatePayload(logId = logId, request = request, baseVersion = baseVersion)
          val action = PendingActionEntity(
            id = UUID.randomUUID().toString(),
            type = PendingActionTypes.DAILY_LOG_UPDATE,
            resourceId = log.project?.id,
            payloadJson = json.encodeToString(payload),
            status = PendingStatus.PENDING,
            retryCount = 0,
            createdAt = System.currentTimeMillis()
          )
          val queuedPhotos = if (selectedPhotos.isNotEmpty()) {
            PhotoQueue.queuePhotos(
              context = context,
              projectId = log.project?.id.orEmpty(),
              dailyLogId = logId,
              photos = selectedPhotos,
              gpsLatitude = location?.latitude,
              gpsLongitude = location?.longitude
            )
          } else {
            emptyList()
          }
          withContext(Dispatchers.IO) {
            pendingDao.upsert(action)
            dailyLogDao.insertAll(
              listOf(
                com.constructionpro.app.data.local.DailyLogEntity(
                  id = logId,
                  projectId = log.project?.id.orEmpty(),
                  projectName = log.project?.name,
                  date = log.date,
                  status = "PENDING_SYNC",
                  crewCount = request.crewCount,
                  totalHours = request.totalHours,
                  submitterName = log.submitter?.name,
                  entriesCount = request.entries?.size,
                  materialsCount = request.materials?.size,
                  issuesCount = request.issues?.size,
                  notes = request.notes,
                  pendingSync = true,
                  updatedAt = System.currentTimeMillis()
                )
              )
            )
            queuedPhotos.forEach { pendingPhotoDao.upsert(it) }
          }
          PendingActionScheduler.enqueue(context)
          state = state.copy(saving = false, error = "Saved offline. Will sync when online.")
          onSaved()
        } else {
          state = state.copy(saving = false, error = error.message ?: "Failed to update daily log")
        }
      }
    }
  }

  LaunchedEffect(logId) {
    loadLog()
  }

  LaunchedEffect(state.log) {
    val log = state.log ?: return@LaunchedEffect
    weatherData = log.weatherData
    weatherStatus = if (log.weatherData != null) {
      "Weather captured (${log.weatherData.location})"
    } else {
      "Weather not captured yet."
    }
    notes = log.notes ?: ""
    weatherDelay = log.weatherDelay ?: false
    weatherDelayNotes = log.weatherDelayNotes ?: ""
  }

  Scaffold(
    topBar = {
      TopAppBar(
        title = { Text(stringResource(R.string.daily_logs_title)) },
        navigationIcon = {
          TextButton(onClick = onBack) {
            Text(stringResource(R.string.common_back))
          }
        },
        actions = {
          Button(onClick = { saveLog() }, enabled = !state.saving) {
            Text(if (state.saving) "Saving..." else stringResource(R.string.common_save))
          }
        }
      )
    }
  ) { padding ->
    Column(
      modifier = Modifier
        .padding(padding)
        .fillMaxSize()
        .padding(16.dp),
      verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
      if (state.loading) {
        Text(stringResource(R.string.daily_logs_loading))
      }

      if (state.error != null) {
        Text("Error: ${state.error}")
      }

      Text(stringResource(R.string.daily_logs_date) + ": ${state.log?.date?.substringBefore('T') ?: ""}")

      Button(onClick = { ensureLocationPermission() }) {
        Text(stringResource(R.string.daily_logs_weather))
      }
      Text(weatherStatus)
      weatherData?.let { weather ->
        Text("Temp: ${weather.temperature} ${weather.temperatureUnit} - ${weather.condition}")
        Text("Wind: ${weather.windSpeed} ${weather.windDirection}")
      }
      OutlinedTextField(
        value = notes,
        onValueChange = { notes = it },
        label = { Text(stringResource(R.string.daily_logs_notes)) },
        modifier = Modifier.fillMaxWidth()
      )

      Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Checkbox(checked = weatherDelay, onCheckedChange = { weatherDelay = it })
        Text(stringResource(R.string.daily_logs_weather_delay))
      }
      if (weatherDelay) {
        OutlinedTextField(
          value = weatherDelayNotes,
          onValueChange = { weatherDelayNotes = it },
          label = { Text(stringResource(R.string.daily_logs_delay_reason)) },
          modifier = Modifier.fillMaxWidth()
        )
      }

      Text(stringResource(R.string.daily_logs_photos) + ": ${state.log?.photos?.size ?: 0}")
      Button(onClick = { photoPicker.launch("image/*") }) {
        Text(stringResource(R.string.daily_logs_add_photo) + " (${selectedPhotos.size})")
      }

      if (isUploadingPhotos) {
        Text("Uploading photos...")
      }
    }
  }
}

private fun shouldQueueOffline(error: Exception): Boolean {
  return when (error) {
    is IOException -> true
    is HttpException -> error.code() >= 500
    else -> false
  }
}

private fun buildUpdateRequest(
  log: DailyLogDetail,
  weatherData: WeatherData?,
  notes: String,
  weatherDelay: Boolean,
  weatherDelayNotes: String
): DailyLogUpsertRequest {
  val entries = log.entries.mapNotNull { entry ->
    val activity = entry.activityLabel?.name ?: return@mapNotNull null
    DailyLogEntryRequest(
      activity = activity,
      status = entry.statusLabel?.name,
      percentComplete = entry.percentComplete,
      notes = entry.notes
    )
  }

  val materials = log.materials.mapNotNull { material ->
    val label = material.materialLabel?.name ?: return@mapNotNull null
    DailyLogMaterialRequest(
      material = label,
      quantity = material.quantity ?: 0.0,
      unit = material.unit,
      notes = material.notes
    )
  }

  val issues = log.issues.mapNotNull { issue ->
    val label = issue.issueLabel?.name ?: return@mapNotNull null
    DailyLogIssueRequest(
      issueType = label,
      delayHours = issue.delayHours,
      description = issue.description
    )
  }

  val visitors = log.visitors.mapNotNull { visitor ->
    val label = visitor.visitorLabel?.name ?: return@mapNotNull null
    DailyLogVisitorRequest(
      visitorType = label,
      time = visitor.visitTime?.let { extractTime(it) },
      result = visitor.result,
      notes = visitor.notes
    )
  }

  return DailyLogUpsertRequest(
    projectId = log.project?.id ?: "",
    date = log.date.substringBefore('T'),
    notes = notes.trim().ifEmpty { null },
    status = log.status ?: "DRAFT",
    crewCount = log.crewCount,
    totalHours = log.totalHours,
    weatherData = weatherData,
    weatherDelay = weatherDelay,
    weatherDelayNotes = weatherDelayNotes.trim().ifEmpty { null },
    entries = entries,
    materials = materials,
    issues = issues,
    visitors = visitors
  )
}

private fun extractTime(value: String): String {
  val timePart = value.substringAfter('T', value)
  val trimmed = timePart.substringBefore('.').substringBefore('Z')
  return if (trimmed.count { it == ':' } >= 2) {
    trimmed.substringBeforeLast(':')
  } else {
    trimmed
  }
}

