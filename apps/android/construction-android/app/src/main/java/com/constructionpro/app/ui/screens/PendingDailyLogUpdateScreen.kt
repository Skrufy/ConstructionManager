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
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.constructionpro.app.R
import com.constructionpro.app.data.local.AppDatabase
import com.constructionpro.app.data.local.PendingActionScheduler
import com.constructionpro.app.data.local.PendingActionTypes
import com.constructionpro.app.data.local.PendingDailyLogUpdatePayload
import com.constructionpro.app.data.local.PendingStatus
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json

private data class PendingUpdateState(
  val loading: Boolean = true,
  val payload: PendingDailyLogUpdatePayload? = null,
  val lastError: String? = null,
  val error: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PendingDailyLogUpdateScreen(
  pendingActionId: String,
  onBack: () -> Unit,
  onResolved: () -> Unit
) {
  val context = LocalContext.current
  val scope = rememberCoroutineScope()
  val db = remember { AppDatabase.getInstance(context) }
  val pendingDao = remember { db.pendingActionDao() }
  val json = remember { Json { ignoreUnknownKeys = true; encodeDefaults = true } }
  var state by remember { mutableStateOf(PendingUpdateState()) }

  var notes by remember { mutableStateOf("") }
  var crewCount by remember { mutableStateOf("") }
  var totalHours by remember { mutableStateOf("") }
  var status by remember { mutableStateOf("DRAFT") }
  var weatherDelay by remember { mutableStateOf(false) }
  var weatherDelayNotes by remember { mutableStateOf("") }

  fun loadPending() {
    scope.launch {
      state = state.copy(loading = true, error = null)
      val action = withContext(Dispatchers.IO) { pendingDao.getById(pendingActionId) }
      if (action == null || action.type != PendingActionTypes.DAILY_LOG_UPDATE) {
        state = state.copy(loading = false, error = "Pending update not found.")
        return@launch
      }
      val payload = runCatching {
        json.decodeFromString(PendingDailyLogUpdatePayload.serializer(), action.payloadJson)
      }.getOrNull()
      if (payload == null) {
        state = state.copy(loading = false, error = "Failed to read pending update payload.")
        return@launch
      }
      state = state.copy(loading = false, payload = payload, lastError = action.lastError)
      notes = payload.request.notes.orEmpty()
      crewCount = payload.request.crewCount?.toString() ?: ""
      totalHours = payload.request.totalHours?.toString() ?: ""
      status = payload.request.status ?: "DRAFT"
      weatherDelay = payload.request.weatherDelay ?: false
      weatherDelayNotes = payload.request.weatherDelayNotes.orEmpty()
    }
  }

  fun saveAndRetry() {
    val payload = state.payload ?: return
    scope.launch {
      val updatedRequest = payload.request.copy(
        notes = notes.trim().ifEmpty { null },
        crewCount = crewCount.toIntOrNull(),
        totalHours = totalHours.toDoubleOrNull(),
        status = status,
        weatherDelay = weatherDelay,
        weatherDelayNotes = weatherDelayNotes.trim().ifEmpty { null }
      )
      val updatedPayload = payload.copy(request = updatedRequest)
      val action = withContext(Dispatchers.IO) { pendingDao.getById(pendingActionId) }
      if (action == null) {
        state = state.copy(error = "Pending update not found.")
        return@launch
      }
      withContext(Dispatchers.IO) {
        pendingDao.upsert(
          action.copy(
            payloadJson = json.encodeToString(updatedPayload),
            status = PendingStatus.PENDING,
            retryCount = 0,
            lastAttemptAt = null,
            lastError = null
          )
        )
      }
      PendingActionScheduler.enqueue(context)
      onResolved()
    }
  }

  LaunchedEffect(pendingActionId) {
    loadPending()
  }

  Scaffold(
    topBar = {
      TopAppBar(
        title = { Text(stringResource(R.string.nav_daily_logs)) },
        navigationIcon = {
          TextButton(onClick = onBack) {
            Text(stringResource(R.string.common_back))
          }
        },
        actions = {
          Button(onClick = { saveAndRetry() }, enabled = state.payload != null) {
            Text(stringResource(R.string.common_retry))
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
        Text(stringResource(R.string.common_loading))
      }
      state.error?.let { Text("${stringResource(R.string.common_error)}: $it") }
      state.payload?.let { payload ->
        Text("Log ID: ${payload.logId}")
        Text("Project: ${payload.request.projectId}")
        state.lastError?.let { Text("${stringResource(R.string.common_error)}: $it") }
      }

      OutlinedTextField(
        value = notes,
        onValueChange = { notes = it },
        label = { Text(stringResource(R.string.daily_logs_notes)) },
        modifier = Modifier.fillMaxWidth()
      )
      OutlinedTextField(
        value = crewCount,
        onValueChange = { crewCount = it },
        label = { Text(stringResource(R.string.daily_logs_crew_count)) },
        modifier = Modifier.fillMaxWidth(),
        singleLine = true
      )
      OutlinedTextField(
        value = totalHours,
        onValueChange = { totalHours = it },
        label = { Text(stringResource(R.string.time_tracking_total_hours)) },
        modifier = Modifier.fillMaxWidth(),
        singleLine = true
      )

      Text(stringResource(R.string.projects_status))
      Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        listOf("DRAFT", "SUBMITTED", "APPROVED", "REJECTED").forEach { option ->
          if (option == status) {
            Button(onClick = { status = option }) { Text(option) }
          } else {
            OutlinedButton(onClick = { status = option }) { Text(option) }
          }
        }
      }

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
    }
  }
}
