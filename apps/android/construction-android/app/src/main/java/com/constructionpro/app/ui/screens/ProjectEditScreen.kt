package com.constructionpro.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.constructionpro.app.R
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.ui.components.CPOptionRow
import com.constructionpro.app.data.model.ProjectDetail
import com.constructionpro.app.data.model.ProjectUpdateRequest
import com.constructionpro.app.data.model.UserSummary
import com.constructionpro.app.ui.theme.AppSpacing
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class ProjectEditState(
  val loading: Boolean = false,
  val saving: Boolean = false,
  val project: ProjectDetail? = null,
  val error: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProjectEditScreen(
  apiService: ApiService,
  projectId: String,
  onBack: () -> Unit,
  onSaved: () -> Unit
) {
  val scope = rememberCoroutineScope()
  var state by remember { mutableStateOf(ProjectEditState(loading = true)) }

  var name by remember { mutableStateOf("") }
  var address by remember { mutableStateOf("") }
  var description by remember { mutableStateOf("") }
  var status by remember { mutableStateOf("ACTIVE") }
  var visibility by remember { mutableStateOf("ALL") }
  var users by remember { mutableStateOf<List<UserSummary>>(emptyList()) }
  var userSearch by remember { mutableStateOf("") }
  var selectedUserIds by remember { mutableStateOf(setOf<String>()) }

  fun loadProject() {
    scope.launch {
      state = state.copy(loading = true, error = null)
      try {
        val response = withContext(Dispatchers.IO) { apiService.getProject(projectId) }
        state = state.copy(loading = false, project = response.project)
      } catch (error: Exception) {
        state = state.copy(loading = false, error = error.message ?: "Failed to load project")
      }
    }
  }

  fun loadUsers() {
    scope.launch {
      try {
        val response = withContext(Dispatchers.IO) { apiService.getUsers() }
        users = response
      } catch (_: Exception) {
        users = emptyList()
      }
    }
  }

  fun saveProject() {
    if (name.isBlank()) {
      state = state.copy(error = "Project name is required")
      return
    }

    scope.launch {
      state = state.copy(saving = true, error = null)
      try {
        val request = ProjectUpdateRequest(
          name = name.trim(),
          address = address.trim().ifEmpty { null },
          description = description.trim().ifEmpty { null },
          status = status,
          visibilityMode = visibility,
          assignedUserIds = selectedUserIds.toList()
        )
        withContext(Dispatchers.IO) { apiService.updateProject(projectId, request) }
        state = state.copy(saving = false)
        onSaved()
      } catch (error: Exception) {
        state = state.copy(saving = false, error = error.message ?: "Failed to update project")
      }
    }
  }

  LaunchedEffect(projectId) {
    loadProject()
    loadUsers()
  }

  LaunchedEffect(state.project) {
    val project = state.project ?: return@LaunchedEffect
    name = project.name
    address = project.address ?: ""
    description = project.description ?: ""
    status = project.status ?: "ACTIVE"
    visibility = project.visibilityMode ?: "ALL"
    selectedUserIds = project.assignments
      ?.mapNotNull { assignment -> assignment.userId ?: assignment.user?.id }
      ?.toSet()
      ?: emptySet()
  }

  Scaffold(
    topBar = {
      TopAppBar(
        title = { Text(stringResource(R.string.common_edit)) },
        navigationIcon = {
          TextButton(onClick = onBack) {
            Text(stringResource(R.string.common_back))
          }
        },
        actions = {
          Button(onClick = { saveProject() }, enabled = !state.saving) {
            Text(if (state.saving) stringResource(R.string.common_loading) else stringResource(R.string.common_save))
          }
        }
      )
    }
  ) { padding ->
    val filteredUsers = if (userSearch.isBlank()) {
      users
    } else {
      val query = userSearch.trim().lowercase()
      users.filter { user ->
        "${user.name} ${user.email}".lowercase().contains(query)
      }
    }

    LazyColumn(
      modifier = Modifier
        .padding(padding)
        .fillMaxSize(),
      contentPadding = androidx.compose.foundation.layout.PaddingValues(AppSpacing.md),
      verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
    ) {
      // Loading state
      if (state.loading) {
        item {
          Text(stringResource(R.string.projects_loading))
        }
      }

      // Error state
      if (state.error != null) {
        item {
          Text("${stringResource(R.string.common_error)}: ${state.error}")
        }
      }

      // Form fields
      item {
        OutlinedTextField(
          value = name,
          onValueChange = { name = it },
          label = { Text(stringResource(R.string.projects_name)) },
          modifier = Modifier.fillMaxWidth(),
          singleLine = true
        )
      }
      item {
        OutlinedTextField(
          value = address,
          onValueChange = { address = it },
          label = { Text(stringResource(R.string.projects_address)) },
          modifier = Modifier.fillMaxWidth(),
          singleLine = true
        )
      }
      item {
        OutlinedTextField(
          value = description,
          onValueChange = { description = it },
          label = { Text(stringResource(R.string.projects_description)) },
          modifier = Modifier.fillMaxWidth()
        )
      }

      item {
        Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)) {
          Text(stringResource(R.string.projects_status))
          CPOptionRow(
            options = listOf("ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"),
            selected = status,
            onSelected = { status = it }
          )
        }
      }

      item {
        Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)) {
          Text(stringResource(R.string.common_view))
          CPOptionRow(
            options = listOf("ALL", "ASSIGNED_ONLY"),
            selected = visibility,
            onSelected = { visibility = it }
          )
        }
      }

      item {
        Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)) {
          Text("${stringResource(R.string.common_select)} (${selectedUserIds.size})")
          OutlinedTextField(
            value = userSearch,
            onValueChange = { userSearch = it },
            label = { Text(stringResource(R.string.common_filter)) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
          )
        }
      }

      // User list
      items(filteredUsers) { user ->
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceBetween
        ) {
          Column(modifier = Modifier.weight(1f)) {
            Text(user.name)
            Text("${user.email} • ${user.role ?: "ROLE"}")
          }
          Checkbox(
            checked = selectedUserIds.contains(user.id),
            onCheckedChange = { checked ->
              selectedUserIds = if (checked) {
                selectedUserIds + user.id
              } else {
                selectedUserIds - user.id
              }
            }
          )
        }
      }

      // Bottom spacing
      item {
        Spacer(modifier = Modifier.height(AppSpacing.md))
      }
    }
  }
}

