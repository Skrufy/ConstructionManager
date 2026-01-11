package com.constructionpro.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.constructionpro.app.R
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.local.AppDatabase
import com.constructionpro.app.data.local.toEntity
import com.constructionpro.app.data.local.toModel
import com.constructionpro.app.data.model.Client
import com.constructionpro.app.data.model.ClientStatus
import com.constructionpro.app.data.model.IndustryTypes
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class ClientsState(
    val loading: Boolean = false,
    val clients: List<Client> = emptyList(),
    val error: String? = null,
    val offline: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientsScreen(
    apiService: ApiService,
    onBack: () -> Unit,
    onOpenClient: (String) -> Unit,
    onCreateClient: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(ClientsState(loading = true)) }
    var searchQuery by remember { mutableStateOf("") }
    var statusFilter by remember { mutableStateOf<String?>(null) }
    val clientDao = remember { AppDatabase.getInstance(context).clientDao() }

    fun loadClients() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val clients = withContext(Dispatchers.IO) {
                    apiService.getClients(status = statusFilter)
                }
                // Cache clients
                withContext(Dispatchers.IO) {
                    clientDao.insertAll(clients.map { it.toEntity() })
                }
                state = state.copy(loading = false, clients = clients, offline = false)
            } catch (e: Exception) {
                // Load from cache
                val cached = withContext(Dispatchers.IO) {
                    if (statusFilter != null) {
                        clientDao.getByStatus(statusFilter!!)
                    } else {
                        clientDao.getAll()
                    }
                }.map { it.toModel() }
                state = state.copy(
                    loading = false,
                    clients = cached,
                    offline = cached.isNotEmpty(),
                    error = if (cached.isEmpty()) (e.message ?: "Failed to load clients") else null
                )
            }
        }
    }

    LaunchedEffect(statusFilter) {
        loadClients()
    }

    val filteredClients = if (searchQuery.isBlank()) {
        state.clients
    } else {
        val query = searchQuery.lowercase()
        state.clients.filter { client ->
            client.companyName.lowercase().contains(query) ||
            client.contactName?.lowercase()?.contains(query) == true ||
            client.email?.lowercase()?.contains(query) == true ||
            client.industry?.lowercase()?.contains(query) == true
        }
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.clients_title),
                subtitle = "${filteredClients.size} total",
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.common_back)
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { loadClients() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onCreateClient,
                containerColor = AppColors.primary600
            ) {
                Icon(Icons.Default.Add, contentDescription = stringResource(R.string.clients_add))
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(AppSpacing.md),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            // Search Bar
            item {
                CPSearchBar(
                    query = searchQuery,
                    onQueryChange = { searchQuery = it },
                    placeholder = stringResource(R.string.clients_search)
                )
            }

            // Status Filter
            item {
                ClientStatusFilterChips(
                    selected = statusFilter,
                    onSelected = { statusFilter = it }
                )
            }

            // Offline Indicator
            if (state.offline) {
                item { CPOfflineIndicator() }
            }

            // Error Banner
            if (state.error != null) {
                item {
                    CPErrorBanner(
                        message = state.error ?: "An error occurred",
                        onRetry = { loadClients() },
                        onDismiss = { state = state.copy(error = null) }
                    )
                }
            }

            // Loading State
            if (state.loading && state.clients.isEmpty()) {
                item { CPLoadingIndicator(message = stringResource(R.string.clients_loading)) }
            }

            // Empty State
            if (!state.loading && filteredClients.isEmpty() && state.error == null) {
                item {
                    CPEmptyState(
                        icon = Icons.Default.Business,
                        title = stringResource(R.string.clients_empty_title),
                        description = stringResource(R.string.clients_empty_desc)
                    )
                }
            }

            // Client Cards
            items(filteredClients) { client ->
                ClientCard(
                    client = client,
                    onClick = { onOpenClient(client.id) }
                )
            }

            // Bottom spacing for FAB
            item { Spacer(modifier = Modifier.height(AppSpacing.bottomNavHeight)) }
        }
    }
}

@Composable
private fun ClientStatusFilterChips(
    selected: String?,
    onSelected: (String?) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
    ) {
        FilterChip(
            selected = selected == null,
            onClick = { onSelected(null) },
            label = { Text("All") }
        )
        FilterChip(
            selected = selected == ClientStatus.ACTIVE,
            onClick = { onSelected(ClientStatus.ACTIVE) },
            label = { Text("Active") }
        )
        FilterChip(
            selected = selected == ClientStatus.INACTIVE,
            onClick = { onSelected(ClientStatus.INACTIVE) },
            label = { Text("Inactive") }
        )
    }
}

@Composable
private fun ClientCard(
    client: Client,
    onClick: () -> Unit
) {
    CPCard(onClick = onClick) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top
        ) {
            Row(
                modifier = Modifier.weight(1f),
                horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
            ) {
                // Client Avatar
                ClientAvatar(companyName = client.companyName)

                Column(modifier = Modifier.weight(1f)) {
                    // Company Name
                    Text(
                        text = client.companyName,
                        style = AppTypography.heading3
                    )

                    // Contact Name
                    client.contactName?.let { contact ->
                        Text(
                            text = contact,
                            style = AppTypography.body,
                            color = AppColors.textSecondary
                        )
                    }

                    Spacer(modifier = Modifier.height(AppSpacing.xxs))

                    // Industry
                    client.industry?.let { industry ->
                        Text(
                            text = IndustryTypes.displayName(industry),
                            style = AppTypography.secondary,
                            color = AppColors.textMuted
                        )
                    }

                    Spacer(modifier = Modifier.height(AppSpacing.xs))

                    // Contact Info Row
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.md)
                    ) {
                        client.email?.let { email ->
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.Email,
                                    contentDescription = null,
                                    modifier = Modifier.size(14.dp),
                                    tint = AppColors.textMuted
                                )
                                Spacer(modifier = Modifier.width(AppSpacing.xxs))
                                Text(
                                    text = email,
                                    style = AppTypography.caption,
                                    color = AppColors.textMuted,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                    }

                    // Project Count
                    client.count?.projects?.let { projectCount ->
                        if (projectCount > 0) {
                            Spacer(modifier = Modifier.height(AppSpacing.xxs))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.Folder,
                                    contentDescription = null,
                                    modifier = Modifier.size(14.dp),
                                    tint = AppColors.primary600
                                )
                                Spacer(modifier = Modifier.width(AppSpacing.xxs))
                                Text(
                                    text = "$projectCount project${if (projectCount != 1) "s" else ""}",
                                    style = AppTypography.caption,
                                    color = AppColors.primary600
                                )
                            }
                        }
                    }
                }
            }

            // Status Badge
            CPStatusBadge(status = client.status)
        }
    }
}

@Composable
private fun ClientAvatar(companyName: String) {
    val initials = companyName
        .split(" ")
        .take(2)
        .mapNotNull { it.firstOrNull()?.uppercaseChar() }
        .joinToString("")
        .ifEmpty { "?" }

    Box(
        modifier = Modifier
            .size(AppSpacing.iconCircleMedium)
            .clip(CircleShape)
            .background(AppColors.primary100),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = initials,
            style = AppTypography.heading3,
            color = AppColors.primary600
        )
    }
}
