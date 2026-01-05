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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
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

private data class EquipmentState(
    val loading: Boolean = false,
    val equipment: List<Equipment> = emptyList(),
    val error: String? = null,
    val selectedStatus: String? = null,
    val total: Int = 0
)

private val STATUS_FILTERS = listOf(
    R.string.equipment_all to null,
    R.string.equipment_available to "AVAILABLE",
    R.string.equipment_in_use to "IN_USE",
    R.string.equipment_maintenance to "MAINTENANCE",
    R.string.equipment_out_of_service to "OUT_OF_SERVICE"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EquipmentScreen(
    apiService: ApiService,
    onBack: () -> Unit,
    onOpenEquipment: (String) -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(EquipmentState(loading = true)) }
    var searchQuery by remember { mutableStateOf("") }

    // Localized strings for use in coroutines
    val loadFailedMsg = stringResource(R.string.equipment_load_failed)

    fun loadEquipment(query: String = searchQuery, status: String? = state.selectedStatus) {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val response = withContext(Dispatchers.IO) {
                    apiService.getEquipment(
                        search = query.takeIf { it.isNotBlank() },
                        status = status,
                        pageSize = 100
                    )
                }
                state = state.copy(
                    loading = false,
                    equipment = response.equipment,
                    total = response.total
                )
            } catch (error: Exception) {
                state = state.copy(
                    loading = false,
                    error = error.message ?: loadFailedMsg
                )
            }
        }
    }

    LaunchedEffect(Unit) {
        loadEquipment()
    }

    LaunchedEffect(searchQuery) {
        delay(300)
        loadEquipment(searchQuery)
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.equipment_title),
                subtitle = stringResource(R.string.equipment_items, state.total),
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = stringResource(R.string.common_back),
                            tint = AppColors.textSecondary
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { loadEquipment() }) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = stringResource(R.string.common_refresh),
                            tint = AppColors.textSecondary
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
                    placeholder = stringResource(R.string.equipment_search),
                    modifier = Modifier.fillMaxWidth()
                )
            }

            // Status Filters
            item {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                ) {
                    items(STATUS_FILTERS) { (labelResId, value) ->
                        FilterChip(
                            selected = state.selectedStatus == value,
                            onClick = {
                                state = state.copy(selectedStatus = value)
                                loadEquipment(searchQuery, value)
                            },
                            label = { Text(stringResource(labelResId)) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = AppColors.primary600,
                                selectedLabelColor = androidx.compose.ui.graphics.Color.White
                            )
                        )
                    }
                }
            }

            // Error Banner
            if (state.error != null) {
                item {
                    CPErrorBanner(
                        message = state.error ?: stringResource(R.string.equipment_error),
                        onRetry = { loadEquipment() },
                        onDismiss = { state = state.copy(error = null) }
                    )
                }
            }

            // Loading
            if (state.loading && state.equipment.isEmpty()) {
                item {
                    CPLoadingIndicator(message = stringResource(R.string.equipment_loading))
                }
            }

            // Equipment List
            items(state.equipment) { item ->
                EquipmentCard(
                    equipment = item,
                    onClick = { onOpenEquipment(item.id) }
                )
            }

            // Empty State
            if (!state.loading && state.equipment.isEmpty() && state.error == null) {
                item {
                    CPEmptyState(
                        icon = Icons.Default.Construction,
                        title = stringResource(R.string.equipment_no_equipment),
                        description = if (searchQuery.isNotBlank() || state.selectedStatus != null)
                            stringResource(R.string.equipment_no_match)
                        else
                            stringResource(R.string.equipment_empty_desc)
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
private fun EquipmentCard(
    equipment: Equipment,
    onClick: () -> Unit
) {
    CPCard(onClick = onClick) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Equipment Icon
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(RoundedCornerShape(AppSpacing.sm))
                    .background(getEquipmentTypeColor(equipment.type).copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = getEquipmentTypeIcon(equipment.type),
                    contentDescription = null,
                    tint = getEquipmentTypeColor(equipment.type),
                    modifier = Modifier.size(28.dp)
                )
            }

            Spacer(modifier = Modifier.width(AppSpacing.md))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = equipment.name,
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                if (equipment.make != null || equipment.model != null) {
                    Text(
                        text = listOfNotNull(equipment.make, equipment.model).joinToString(" "),
                        style = AppTypography.body,
                        color = AppColors.textSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                equipment.currentProject?.let { project ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(top = AppSpacing.xxs)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Folder,
                            contentDescription = null,
                            tint = AppColors.textMuted,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.xxs))
                        Text(
                            text = project.name,
                            style = AppTypography.secondary,
                            color = AppColors.textSecondary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                // Status Badge
                CPBadge(
                    text = formatStatus(equipment.status),
                    color = getStatusColor(equipment.status),
                    backgroundColor = getStatusColor(equipment.status).copy(alpha = 0.1f)
                )

                // Hour meter if available
                equipment.hourMeterReading?.let { hours ->
                    Text(
                        text = "${hours.toInt()}h",
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary,
                        modifier = Modifier.padding(top = AppSpacing.xxs)
                    )
                }
            }

            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = AppColors.textMuted,
                modifier = Modifier.padding(start = AppSpacing.xs)
            )
        }
    }
}

private fun getEquipmentTypeIcon(type: String?): androidx.compose.ui.graphics.vector.ImageVector {
    return when (type?.uppercase()) {
        "EXCAVATOR", "BACKHOE" -> Icons.Default.Agriculture
        "TRUCK", "DUMP_TRUCK" -> Icons.Default.LocalShipping
        "CRANE" -> Icons.Default.Handyman
        "GENERATOR" -> Icons.Default.ElectricalServices
        "COMPRESSOR" -> Icons.Default.Air
        "WELDER" -> Icons.Default.Build
        "CONCRETE" -> Icons.Default.ViewInAr
        else -> Icons.Default.Construction
    }
}

private fun getEquipmentTypeColor(type: String?): androidx.compose.ui.graphics.Color {
    return when (type?.uppercase()) {
        "EXCAVATOR", "BACKHOE" -> ConstructionOrange
        "TRUCK", "DUMP_TRUCK" -> Primary600
        "CRANE" -> androidx.compose.ui.graphics.Color(0xFF7C3AED) // Purple
        "GENERATOR" -> androidx.compose.ui.graphics.Color(0xFFEAB308) // Yellow
        else -> Primary600
    }
}

private fun getStatusColor(status: String): androidx.compose.ui.graphics.Color {
    return when (status) {
        "AVAILABLE" -> ConstructionGreen
        "IN_USE" -> Primary600
        "MAINTENANCE" -> ConstructionOrange
        "OUT_OF_SERVICE" -> ConstructionRed
        else -> androidx.compose.ui.graphics.Color(0xFF6B7280) // Gray fallback
    }
}

private fun formatStatus(status: String): String {
    return status.replace("_", " ").lowercase().split(" ")
        .joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } }
}
