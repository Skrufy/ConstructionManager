package com.constructionpro.app.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.constructionpro.app.R
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.local.AppDatabase
import com.constructionpro.app.data.local.toModel
import com.constructionpro.app.data.model.Client
import com.constructionpro.app.data.model.IndustryTypes
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class ClientDetailState(
    val loading: Boolean = false,
    val client: Client? = null,
    val error: String? = null,
    val offline: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientDetailScreen(
    clientId: String,
    apiService: ApiService,
    onBack: () -> Unit,
    onEdit: (String) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(ClientDetailState(loading = true)) }
    val clientDao = remember { AppDatabase.getInstance(context).clientDao() }

    fun loadClient() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val client = withContext(Dispatchers.IO) {
                    apiService.getClient(clientId)
                }
                state = state.copy(loading = false, client = client, offline = false)
            } catch (e: Exception) {
                // Try cache
                val cached = withContext(Dispatchers.IO) {
                    clientDao.getById(clientId)?.toModel()
                }
                state = state.copy(
                    loading = false,
                    client = cached,
                    offline = cached != null,
                    error = if (cached == null) (e.message ?: "Failed to load client") else null
                )
            }
        }
    }

    LaunchedEffect(clientId) {
        loadClient()
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.clients_title),
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.common_back)
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { loadClient() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                    state.client?.let {
                        IconButton(onClick = { onEdit(clientId) }) {
                            Icon(Icons.Default.Edit, contentDescription = "Edit")
                        }
                    }
                }
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when {
                state.loading -> {
                    CPLoadingIndicator(
                        message = stringResource(R.string.clients_loading),
                        modifier = Modifier.align(Alignment.Center)
                    )
                }
                state.error != null && state.client == null -> {
                    CPErrorBanner(
                        message = state.error ?: "An error occurred",
                        onRetry = { loadClient() },
                        modifier = Modifier.padding(AppSpacing.md)
                    )
                }
                state.client != null -> {
                    ClientDetailContent(
                        client = state.client!!,
                        offline = state.offline
                    )
                }
            }
        }
    }
}

@Composable
private fun ClientDetailContent(
    client: Client,
    offline: Boolean
) {
    val context = LocalContext.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(AppSpacing.md),
        verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
    ) {
        if (offline) {
            CPOfflineIndicator()
        }

        // Header Card
        CPCard {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Large Avatar
                ClientAvatarLarge(companyName = client.companyName)

                Spacer(modifier = Modifier.height(AppSpacing.md))

                // Company Name
                Text(
                    text = client.companyName,
                    style = AppTypography.heading2
                )

                // Contact Name
                client.contactName?.let { contact ->
                    Text(
                        text = contact,
                        style = AppTypography.heading3,
                        color = AppColors.textSecondary
                    )
                }

                Spacer(modifier = Modifier.height(AppSpacing.xs))

                // Status Badge
                CPStatusBadge(status = client.status)

                // Industry
                client.industry?.let { industry ->
                    Spacer(modifier = Modifier.height(AppSpacing.xs))
                    Text(
                        text = IndustryTypes.displayName(industry),
                        style = AppTypography.body,
                        color = AppColors.textMuted
                    )
                }
            }
        }

        // Quick Actions
        CPCard {
            Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)) {
                Text(
                    text = "Quick Actions",
                    style = AppTypography.heading3
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                ) {
                    // Call Button
                    client.phone?.let { phone ->
                        OutlinedButton(
                            onClick = {
                                val intent = Intent(Intent.ACTION_DIAL).apply {
                                    data = Uri.parse("tel:$phone")
                                }
                                context.startActivity(intent)
                            },
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.Phone, contentDescription = null)
                            Spacer(modifier = Modifier.width(AppSpacing.xs))
                            Text("Call")
                        }
                    }

                    // Email Button
                    client.email?.let { email ->
                        OutlinedButton(
                            onClick = {
                                val intent = Intent(Intent.ACTION_SENDTO).apply {
                                    data = Uri.parse("mailto:$email")
                                }
                                context.startActivity(intent)
                            },
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.Email, contentDescription = null)
                            Spacer(modifier = Modifier.width(AppSpacing.xs))
                            Text("Email")
                        }
                    }
                }

                // Website Button
                client.website?.let { website ->
                    OutlinedButton(
                        onClick = {
                            val url = if (website.startsWith("http")) website else "https://$website"
                            val intent = Intent(Intent.ACTION_VIEW).apply {
                                data = Uri.parse(url)
                            }
                            context.startActivity(intent)
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Language, contentDescription = null)
                        Spacer(modifier = Modifier.width(AppSpacing.xs))
                        Text("Visit Website")
                    }
                }
            }
        }

        // Contact Information
        CPCard {
            Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                Text(
                    text = stringResource(R.string.clients_contact_info),
                    style = AppTypography.heading3
                )

                client.email?.let { email ->
                    DetailRow(
                        icon = Icons.Default.Email,
                        label = stringResource(R.string.clients_email),
                        value = email
                    )
                }

                client.phone?.let { phone ->
                    DetailRow(
                        icon = Icons.Default.Phone,
                        label = stringResource(R.string.clients_phone),
                        value = phone
                    )
                }

                client.website?.let { website ->
                    DetailRow(
                        icon = Icons.Default.Language,
                        label = "Website",
                        value = website
                    )
                }
            }
        }

        // Address
        if (client.address != null || client.city != null) {
            CPCard {
                Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                    Text(
                        text = stringResource(R.string.clients_address),
                        style = AppTypography.heading3
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
                    ) {
                        Icon(
                            imageVector = Icons.Default.LocationOn,
                            contentDescription = null,
                            tint = AppColors.textMuted,
                            modifier = Modifier.size(AppSpacing.iconMedium)
                        )
                        Column {
                            client.address?.let { address ->
                                Text(
                                    text = address,
                                    style = AppTypography.body
                                )
                            }
                            val cityStateZip = listOfNotNull(
                                client.city,
                                client.state,
                                client.zip
                            ).joinToString(", ")
                            if (cityStateZip.isNotBlank()) {
                                Text(
                                    text = cityStateZip,
                                    style = AppTypography.body
                                )
                            }
                        }
                    }

                    // Open in Maps
                    val fullAddress = listOfNotNull(
                        client.address,
                        client.city,
                        client.state,
                        client.zip
                    ).joinToString(", ")
                    if (fullAddress.isNotBlank()) {
                        OutlinedButton(
                            onClick = {
                                val intent = Intent(Intent.ACTION_VIEW).apply {
                                    data = Uri.parse("geo:0,0?q=${Uri.encode(fullAddress)}")
                                }
                                context.startActivity(intent)
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.Map, contentDescription = null)
                            Spacer(modifier = Modifier.width(AppSpacing.xs))
                            Text("Open in Maps")
                        }
                    }
                }
            }
        }

        // Notes
        client.notes?.let { notes ->
            if (notes.isNotBlank()) {
                CPCard {
                    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)) {
                        Text(
                            text = stringResource(R.string.clients_notes),
                            style = AppTypography.heading3
                        )
                        Text(
                            text = notes,
                            style = AppTypography.bodyLarge,
                            color = AppColors.textSecondary
                        )
                    }
                }
            }
        }

        // Project Count
        client.count?.projects?.let { projectCount ->
            if (projectCount > 0) {
                CPCard {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Folder,
                                contentDescription = null,
                                tint = AppColors.primary600,
                                modifier = Modifier.size(AppSpacing.iconLarge)
                            )
                            Spacer(modifier = Modifier.width(AppSpacing.sm))
                            Column {
                                Text(
                                    text = stringResource(R.string.clients_projects),
                                    style = AppTypography.heading3
                                )
                                Text(
                                    text = "$projectCount project${if (projectCount != 1) "s" else ""} associated",
                                    style = AppTypography.secondary,
                                    color = AppColors.textMuted
                                )
                            }
                        }
                        Icon(
                            imageVector = Icons.Default.ChevronRight,
                            contentDescription = null,
                            tint = AppColors.textMuted
                        )
                    }
                }
            }
        }

        // Bottom spacing
        Spacer(modifier = Modifier.height(AppSpacing.xxl))
    }
}

@Composable
private fun DetailRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = AppColors.textMuted,
            modifier = Modifier.size(AppSpacing.iconMedium)
        )
        Spacer(modifier = Modifier.width(AppSpacing.sm))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = label,
                style = AppTypography.caption,
                color = AppColors.textMuted
            )
            Text(
                text = value,
                style = AppTypography.body
            )
        }
    }
}

@Composable
private fun ClientAvatarLarge(companyName: String) {
    val initials = companyName
        .split(" ")
        .take(2)
        .mapNotNull { it.firstOrNull()?.uppercaseChar() }
        .joinToString("")
        .ifEmpty { "?" }

    Box(
        modifier = Modifier
            .size(80.dp)
            .clip(CircleShape)
            .background(AppColors.primary100),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = initials,
            style = AppTypography.heading1,
            color = AppColors.primary600
        )
    }
}
