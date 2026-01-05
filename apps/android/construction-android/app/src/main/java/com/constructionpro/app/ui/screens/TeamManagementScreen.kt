package com.constructionpro.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.constructionpro.app.R
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.model.*
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class TeamManagementState(
    val loading: Boolean = false,
    val teams: List<Team> = emptyList(),
    val error: String? = null,
    val showCreateDialog: Boolean = false,
    val selectedTeam: TeamDetail? = null,
    val showTeamDetail: Boolean = false
)

private data class TeamFormState(
    val name: String = "",
    val description: String = "",
    val saving: Boolean = false,
    val error: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeamManagementScreen(
    apiService: ApiService,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(TeamManagementState(loading = true)) }
    var formState by remember { mutableStateOf(TeamFormState()) }
    val configuration = LocalConfiguration.current
    val isNarrow = configuration.screenWidthDp < 360

    fun loadTeams() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val response = withContext(Dispatchers.IO) {
                    apiService.getTeams()
                }
                state = state.copy(loading = false, teams = response.teams)
            } catch (e: Exception) {
                state = state.copy(
                    loading = false,
                    error = e.message ?: "Failed to load teams"
                )
            }
        }
    }

    fun loadTeamDetail(teamId: String) {
        scope.launch {
            try {
                val team = withContext(Dispatchers.IO) {
                    apiService.getTeamDetail(teamId)
                }
                state = state.copy(selectedTeam = team, showTeamDetail = true)
            } catch (e: Exception) {
                state = state.copy(
                    error = e.message ?: "Failed to load team details"
                )
            }
        }
    }

    fun createTeam() {
        if (formState.name.isBlank()) {
            formState = formState.copy(error = "Please enter a team name")
            return
        }

        scope.launch {
            formState = formState.copy(saving = true, error = null)
            try {
                val request = CreateTeamRequest(
                    name = formState.name.trim(),
                    description = formState.description.ifBlank { null }
                )
                withContext(Dispatchers.IO) {
                    apiService.createTeam(request)
                }
                state = state.copy(showCreateDialog = false)
                formState = TeamFormState()
                loadTeams()
            } catch (e: Exception) {
                formState = formState.copy(
                    saving = false,
                    error = e.message ?: "Failed to create team"
                )
            }
        }
    }

    fun deleteTeam(teamId: String) {
        scope.launch {
            try {
                withContext(Dispatchers.IO) {
                    apiService.deleteTeam(teamId)
                }
                state = state.copy(showTeamDetail = false, selectedTeam = null)
                loadTeams()
            } catch (e: Exception) {
                state = state.copy(error = e.message)
            }
        }
    }

    LaunchedEffect(Unit) {
        loadTeams()
    }

    // Team Detail Sheet
    if (state.showTeamDetail && state.selectedTeam != null) {
        TeamDetailSheet(
            team = state.selectedTeam!!,
            onDismiss = { state = state.copy(showTeamDetail = false, selectedTeam = null) },
            onDelete = { deleteTeam(state.selectedTeam!!.id) }
        )
        return
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.teams_title),
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.common_back)
                        )
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { state = state.copy(showCreateDialog = true) },
                containerColor = Primary600
            ) {
                Icon(
                    imageVector = Icons.Default.Add,
                    contentDescription = stringResource(R.string.teams_add),
                    tint = Color.White
                )
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Error Banner
            state.error?.let { error ->
                CPErrorBanner(
                    message = error,
                    onRetry = { loadTeams() },
                    onDismiss = { state = state.copy(error = null) }
                )
            }

            when {
                state.loading -> {
                    CPLoadingIndicator(message = stringResource(R.string.teams_loading))
                }
                state.teams.isEmpty() -> {
                    CPEmptyState(
                        icon = Icons.Default.Groups,
                        title = stringResource(R.string.teams_empty_title),
                        description = stringResource(R.string.teams_empty_desc)
                    )
                }
                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(AppSpacing.md),
                        verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
                    ) {
                        items(state.teams, key = { it.id }) { team ->
                            TeamCard(
                                team = team,
                                onClick = { loadTeamDetail(team.id) },
                                isNarrow = isNarrow
                            )
                        }
                    }
                }
            }
        }
    }

    // Create Team Dialog
    if (state.showCreateDialog) {
        AlertDialog(
            onDismissRequest = {
                if (!formState.saving) {
                    state = state.copy(showCreateDialog = false)
                    formState = TeamFormState()
                }
            },
            title = { Text(stringResource(R.string.teams_add)) },
            text = {
                Column(
                    verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
                ) {
                    formState.error?.let { error ->
                        Text(
                            text = error,
                            color = AppColors.error,
                            style = AppTypography.secondary
                        )
                    }

                    OutlinedTextField(
                        value = formState.name,
                        onValueChange = { formState = formState.copy(name = it) },
                        label = { Text(stringResource(R.string.teams_name)) },
                        placeholder = { Text("e.g., Site A Crew") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        leadingIcon = {
                            Icon(Icons.Default.Groups, contentDescription = null)
                        },
                        enabled = !formState.saving
                    )

                    OutlinedTextField(
                        value = formState.description,
                        onValueChange = { formState = formState.copy(description = it) },
                        label = { Text("Description") },
                        placeholder = { Text("Optional team description") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2,
                        maxLines = 4,
                        enabled = !formState.saving
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = { createTeam() },
                    enabled = !formState.saving && formState.name.isNotBlank()
                ) {
                    if (formState.saving) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(AppSpacing.lg),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text("Create")
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        state = state.copy(showCreateDialog = false)
                        formState = TeamFormState()
                    },
                    enabled = !formState.saving
                ) {
                    Text(stringResource(R.string.common_cancel))
                }
            }
        )
    }
}

@Composable
private fun TeamCard(
    team: Team,
    onClick: () -> Unit,
    isNarrow: Boolean
) {
    CPCard(
        onClick = onClick
    ) {
        Column(
            verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Team Icon
                    Surface(
                        shape = RoundedCornerShape(AppSpacing.xs),
                        color = Primary100
                    ) {
                        Icon(
                            imageVector = Icons.Default.Groups,
                            contentDescription = null,
                            tint = Primary600,
                            modifier = Modifier.padding(AppSpacing.sm)
                        )
                    }

                    Column(
                        verticalArrangement = Arrangement.spacedBy(AppSpacing.xxs)
                    ) {
                        Text(
                            text = team.name,
                            style = AppTypography.heading3,
                            color = AppColors.textPrimary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )

                        team.description?.let { desc ->
                            Text(
                                text = desc,
                                style = AppTypography.secondary,
                                color = AppColors.textSecondary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }

                Icon(
                    imageVector = Icons.Default.ChevronRight,
                    contentDescription = "View details",
                    tint = AppColors.textSecondary
                )
            }

            // Stats Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(AppSpacing.md)
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.xxs),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.People,
                        contentDescription = null,
                        modifier = Modifier.size(AppSpacing.iconSmall),
                        tint = AppColors.textSecondary
                    )
                    Text(
                        text = stringResource(R.string.teams_members, team.memberCount),
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                }

                team.leaderName?.let { leader ->
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xxs),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Person,
                            contentDescription = null,
                            modifier = Modifier.size(AppSpacing.iconSmall),
                            tint = AppColors.textSecondary
                        )
                        Text(
                            text = "Lead: $leader",
                            style = AppTypography.secondary,
                            color = AppColors.textSecondary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TeamDetailSheet(
    team: TeamDetail,
    onDismiss: () -> Unit,
    onDelete: () -> Unit
) {
    var showDeleteConfirm by remember { mutableStateOf(false) }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = team.name,
                navigationIcon = {
                    IconButton(onClick = onDismiss) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.common_back)
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { showDeleteConfirm = true }) {
                        Icon(
                            imageVector = Icons.Default.Delete,
                            contentDescription = "Delete Team",
                            tint = ConstructionRed
                        )
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(AppSpacing.md),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
        ) {
            // Team Info
            item {
                CPCard {
                    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                        Text(
                            text = "Team Information",
                            style = AppTypography.heading3,
                            color = AppColors.textPrimary
                        )

                        team.description?.let { desc ->
                            Text(
                                text = desc,
                                style = AppTypography.body,
                                color = AppColors.textSecondary
                            )
                        }

                        team.leader?.let { leader ->
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                CPAvatar(name = leader.name, size = AppSpacing.xxl)
                                Column {
                                    Text(
                                        text = leader.name,
                                        style = AppTypography.bodyMedium,
                                        color = AppColors.textPrimary
                                    )
                                    Text(
                                        text = "Team Leader",
                                        style = AppTypography.secondary,
                                        color = AppColors.textSecondary
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Members Section
            item {
                CPSectionHeader(
                    title = "Members (${team.members?.size ?: 0})"
                )
            }

            if (team.members.isNullOrEmpty()) {
                item {
                    CPEmptyState(
                        icon = Icons.Default.People,
                        title = stringResource(R.string.users_empty_title),
                        description = stringResource(R.string.users_empty_desc)
                    )
                }
            } else {
                items(team.members, key = { it.id }) { member ->
                    CPCard {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            CPAvatar(name = member.name, size = AppSpacing.iconCircleSmall)
                            Column(
                                modifier = Modifier.weight(1f),
                                verticalArrangement = Arrangement.spacedBy(2.dp)
                            ) {
                                Text(
                                    text = member.name,
                                    style = AppTypography.bodyMedium,
                                    color = AppColors.textPrimary
                                )
                                Text(
                                    text = member.jobTitle ?: UserRole.displayName(member.role),
                                    style = AppTypography.secondary,
                                    color = AppColors.textSecondary
                                )
                            }
                            Surface(
                                shape = RoundedCornerShape(AppSpacing.xxs),
                                color = Primary100
                            ) {
                                Text(
                                    text = UserRole.displayName(member.role),
                                    style = AppTypography.caption,
                                    color = Primary600,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }
                }
            }

            // Projects Section
            if (!team.projects.isNullOrEmpty()) {
                item {
                    Spacer(modifier = Modifier.height(AppSpacing.xs))
                    CPSectionHeader(
                        title = "Assigned Projects (${team.projects.size})"
                    )
                }

                items(team.projects, key = { it.id }) { project ->
                    CPCard {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Folder,
                                contentDescription = null,
                                tint = Primary600
                            )
                            Column(
                                modifier = Modifier.weight(1f)
                            ) {
                                Text(
                                    text = project.name,
                                    style = AppTypography.bodyMedium,
                                    color = AppColors.textPrimary
                                )
                                project.status?.let { status ->
                                    Text(
                                        text = status,
                                        style = AppTypography.secondary,
                                        color = AppColors.textSecondary
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Delete Confirmation Dialog
    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            icon = {
                Icon(
                    imageVector = Icons.Default.Warning,
                    contentDescription = null,
                    tint = ConstructionRed
                )
            },
            title = { Text("Delete Team?") },
            text = {
                Text("Are you sure you want to delete '${team.name}'? This action cannot be undone.")
            },
            confirmButton = {
                Button(
                    onClick = {
                        showDeleteConfirm = false
                        onDelete()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = ConstructionRed)
                ) {
                    Text("Delete")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = false }) {
                    Text(stringResource(R.string.common_cancel))
                }
            }
        )
    }
}
