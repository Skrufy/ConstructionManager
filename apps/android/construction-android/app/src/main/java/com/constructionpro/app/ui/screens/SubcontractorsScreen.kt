package com.constructionpro.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.constructionpro.app.R
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.model.*
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import com.constructionpro.app.ui.util.responsiveValue
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class SubcontractorsState(
    val loading: Boolean = false,
    val subcontractors: List<Subcontractor> = emptyList(),
    val error: String? = null,
    val selectedTrade: String? = null,
    val selectedStatus: String? = null,
    val total: Int = 0
)

private val TRADE_FILTERS = listOf(
    "All Trades" to null,
    "Electrical" to "ELECTRICAL",
    "Plumbing" to "PLUMBING",
    "HVAC" to "HVAC",
    "Concrete" to "CONCRETE",
    "Framing" to "FRAMING",
    "Drywall" to "DRYWALL",
    "Roofing" to "ROOFING",
    "Painting" to "PAINTING"
)

private val STATUS_FILTERS = listOf(
    "All" to null,
    "Active" to "ACTIVE",
    "Inactive" to "INACTIVE",
    "Suspended" to "SUSPENDED"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubcontractorsScreen(
    apiService: ApiService,
    onBack: () -> Unit,
    onOpenSubcontractor: (String) -> Unit = {},
    onCreateSubcontractor: () -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(SubcontractorsState(loading = true)) }
    var searchQuery by remember { mutableStateOf("") }

    fun loadSubcontractors(query: String = searchQuery) {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val response = withContext(Dispatchers.IO) {
                    apiService.getSubcontractors(
                        search = query.takeIf { it.isNotBlank() },
                        trade = state.selectedTrade,
                        status = state.selectedStatus,
                        pageSize = 100
                    )
                }
                state = state.copy(
                    loading = false,
                    subcontractors = response.subcontractors,
                    total = response.total
                )
            } catch (error: Exception) {
                state = state.copy(
                    loading = false,
                    error = error.message ?: "Failed to load subcontractors"
                )
            }
        }
    }

    LaunchedEffect(state.selectedTrade, state.selectedStatus) {
        loadSubcontractors()
    }

    LaunchedEffect(searchQuery) {
        delay(300)
        loadSubcontractors(searchQuery)
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.subcontractors_title),
                subtitle = "${state.total} companies",
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = stringResource(R.string.common_back),
                            tint = AppColors.textPrimary
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { loadSubcontractors() }) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Refresh",
                            tint = AppColors.textSecondary
                        )
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onCreateSubcontractor,
                containerColor = AppColors.primary600,
                contentColor = androidx.compose.ui.graphics.Color.White
            ) {
                Icon(
                    imageVector = Icons.Default.Add,
                    contentDescription = stringResource(R.string.subcontractors_add)
                )
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(
                horizontal = responsiveValue(AppSpacing.md, AppSpacing.xl, AppSpacing.xxl),
                vertical = AppSpacing.sm
            ),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            // Search Bar
            item {
                CPSearchBar(
                    query = searchQuery,
                    onQueryChange = { searchQuery = it },
                    placeholder = stringResource(R.string.subcontractors_search),
                    modifier = Modifier.fillMaxWidth()
                )
            }

            // Status Filters
            item {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                ) {
                    items(STATUS_FILTERS) { (label, value) ->
                        FilterChip(
                            selected = state.selectedStatus == value,
                            onClick = {
                                state = state.copy(selectedStatus = value)
                            },
                            label = { Text(label) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = AppColors.primary600,
                                selectedLabelColor = androidx.compose.ui.graphics.Color.White
                            )
                        )
                    }
                }
            }

            // Trade Filters
            item {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                ) {
                    items(TRADE_FILTERS) { (label, value) ->
                        FilterChip(
                            selected = state.selectedTrade == value,
                            onClick = {
                                state = state.copy(selectedTrade = value)
                            },
                            label = { Text(label) },
                            leadingIcon = if (value != null) {
                                {
                                    Icon(
                                        imageVector = getTradeIcon(value),
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            } else null
                        )
                    }
                }
            }

            // Error Banner
            if (state.error != null) {
                item {
                    CPErrorBanner(
                        message = state.error ?: "An error occurred",
                        onRetry = { loadSubcontractors() },
                        onDismiss = { state = state.copy(error = null) }
                    )
                }
            }

            // Loading
            if (state.loading && state.subcontractors.isEmpty()) {
                item {
                    CPLoadingIndicator(message = stringResource(R.string.subcontractors_loading))
                }
            }

            // Subcontractors List
            items(state.subcontractors) { subcontractor ->
                SubcontractorCard(
                    subcontractor = subcontractor,
                    onClick = { onOpenSubcontractor(subcontractor.id) }
                )
            }

            // Empty State
            if (!state.loading && state.subcontractors.isEmpty() && state.error == null) {
                item {
                    CPEmptyState(
                        icon = Icons.Default.Business,
                        title = stringResource(R.string.subcontractors_empty_title),
                        description = stringResource(R.string.subcontractors_empty_desc)
                    )
                }
            }

            item {
                Spacer(modifier = Modifier.height(AppSpacing.md))
            }
        }
    }
}

@Composable
private fun SubcontractorCard(
    subcontractor: Subcontractor,
    onClick: () -> Unit
) {
    CPCard(onClick = onClick) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Company Avatar
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(getTradeColor(subcontractor.trade).copy(alpha = 0.1f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = getTradeIcon(subcontractor.trade),
                        contentDescription = null,
                        tint = getTradeColor(subcontractor.trade),
                        modifier = Modifier.size(28.dp)
                    )
                }

                Spacer(modifier = Modifier.width(AppSpacing.md))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = subcontractor.companyName,
                        style = AppTypography.heading3,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    subcontractor.contactName?.let { contact ->
                        Text(
                            text = contact,
                            style = AppTypography.body,
                            color = AppColors.textSecondary
                        )
                    }

                    subcontractor.trade?.let { trade ->
                        CPBadge(
                            text = trade.replace("_", " "),
                            color = getTradeColor(trade),
                            backgroundColor = getTradeColor(trade).copy(alpha = 0.1f)
                        )
                    }
                }

                Column(horizontalAlignment = Alignment.End) {
                    // Status
                    CPBadge(
                        text = subcontractor.status,
                        color = getStatusColor(subcontractor.status),
                        backgroundColor = getStatusColor(subcontractor.status).copy(alpha = 0.1f)
                    )

                    // Rating
                    subcontractor.rating?.let { rating ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(top = AppSpacing.xxs)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Star,
                                contentDescription = null,
                                tint = androidx.compose.ui.graphics.Color(0xFFEAB308),
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(AppSpacing.xxs))
                            Text(
                                text = String.format("%.1f", rating),
                                style = AppTypography.secondaryMedium,
                                color = AppColors.textPrimary
                            )
                        }
                    }
                }

                Icon(
                    imageVector = Icons.Default.ChevronRight,
                    contentDescription = null,
                    tint = AppColors.textSecondary,
                    modifier = Modifier.padding(start = AppSpacing.xs)
                )
            }

            // Contact Info
            if (subcontractor.phone != null || subcontractor.email != null) {
                Spacer(modifier = Modifier.height(AppSpacing.sm))
                HorizontalDivider(color = AppColors.divider)
                Spacer(modifier = Modifier.height(AppSpacing.sm))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.md)
                ) {
                    subcontractor.phone?.let { phone ->
                        ContactChip(
                            icon = Icons.Default.Phone,
                            text = phone
                        )
                    }
                    subcontractor.email?.let { email ->
                        ContactChip(
                            icon = Icons.Default.Email,
                            text = email,
                            modifier = Modifier.weight(1f, fill = false)
                        )
                    }
                }
            }

            // Active Projects
            if (subcontractor.projects.isNotEmpty()) {
                Spacer(modifier = Modifier.height(AppSpacing.xs))
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Folder,
                        contentDescription = null,
                        tint = AppColors.textSecondary,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(AppSpacing.xxs))
                    Text(
                        text = "${subcontractor.projects.size} active project${if (subcontractor.projects.size != 1) "s" else ""}",
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                }
            }

            // Insurance Warning
            subcontractor.insuranceExpiry?.let { expiry ->
                val isExpiringSoon = isInsuranceExpiringSoon(expiry)
                val isExpired = isInsuranceExpired(expiry)

                if (isExpiringSoon || isExpired) {
                    Spacer(modifier = Modifier.height(AppSpacing.xs))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(AppSpacing.xs))
                            .background(
                                if (isExpired) ConstructionRed.copy(alpha = 0.1f)
                                else ConstructionOrange.copy(alpha = 0.1f)
                            )
                            .padding(AppSpacing.xs)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Warning,
                            contentDescription = null,
                            tint = if (isExpired) ConstructionRed else ConstructionOrange,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.xs))
                        Text(
                            text = if (isExpired) "Insurance expired" else "Insurance expiring soon",
                            style = AppTypography.secondaryMedium,
                            color = if (isExpired) ConstructionRed else ConstructionOrange
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ContactChip(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    text: String,
    modifier: Modifier = Modifier
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .clip(RoundedCornerShape(AppSpacing.xs))
            .background(AppColors.gray100)
            .padding(horizontal = AppSpacing.xs, vertical = AppSpacing.xxs)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = AppColors.textSecondary,
            modifier = Modifier.size(14.dp)
        )
        Spacer(modifier = Modifier.width(AppSpacing.xxs))
        Text(
            text = text,
            style = AppTypography.secondary,
            color = AppColors.textPrimary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

// Helper functions
private fun getTradeIcon(trade: String?): androidx.compose.ui.graphics.vector.ImageVector {
    return when (trade?.uppercase()) {
        "ELECTRICAL" -> Icons.Default.ElectricalServices
        "PLUMBING" -> Icons.Default.Plumbing
        "HVAC" -> Icons.Default.AcUnit
        "CONCRETE" -> Icons.Default.ViewInAr
        "FRAMING" -> Icons.Default.GridView
        "DRYWALL" -> Icons.Default.Layers
        "ROOFING" -> Icons.Default.Roofing
        "PAINTING" -> Icons.Default.FormatPaint
        else -> Icons.Default.Build
    }
}

private fun getTradeColor(trade: String?): androidx.compose.ui.graphics.Color {
    return when (trade?.uppercase()) {
        "ELECTRICAL" -> androidx.compose.ui.graphics.Color(0xFFEAB308) // Yellow
        "PLUMBING" -> Primary600 // Blue
        "HVAC" -> androidx.compose.ui.graphics.Color(0xFF06B6D4) // Cyan
        "CONCRETE" -> Gray600
        "FRAMING" -> ConstructionOrange
        "DRYWALL" -> androidx.compose.ui.graphics.Color(0xFF8B5CF6) // Purple
        "ROOFING" -> ConstructionRed
        "PAINTING" -> ConstructionGreen
        else -> Gray500
    }
}

private fun getStatusColor(status: String): androidx.compose.ui.graphics.Color {
    return when (status.uppercase()) {
        "ACTIVE" -> ConstructionGreen
        "INACTIVE" -> Gray500
        "SUSPENDED" -> ConstructionRed
        else -> Gray500
    }
}

private fun isInsuranceExpiringSoon(expiryDate: String, daysThreshold: Long = 30): Boolean {
    return try {
        val date = java.time.LocalDate.parse(expiryDate.take(10))
        val now = java.time.LocalDate.now()
        date.isAfter(now) && java.time.temporal.ChronoUnit.DAYS.between(now, date) <= daysThreshold
    } catch (_: Exception) {
        false
    }
}

private fun isInsuranceExpired(expiryDate: String): Boolean {
    return try {
        val date = java.time.LocalDate.parse(expiryDate.take(10))
        date.isBefore(java.time.LocalDate.now())
    } catch (_: Exception) {
        false
    }
}
