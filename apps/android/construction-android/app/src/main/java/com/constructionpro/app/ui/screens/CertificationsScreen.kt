package com.constructionpro.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
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
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

private data class CertificationsState(
    val loading: Boolean = false,
    val certifications: CertificationsResponse? = null,
    val error: String? = null,
    val selectedType: String? = null, // user, subcontractor, all
    val alertsOnly: Boolean = false
)

private val TYPE_FILTERS = listOf(
    "All" to null,
    "Users" to "user",
    "Subcontractors" to "subcontractor"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CertificationsScreen(
    apiService: ApiService,
    onBack: () -> Unit,
    onOpenCertification: (String) -> Unit = {},
    onCreateCertification: () -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(CertificationsState(loading = true)) }

    fun loadCertifications() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val response = withContext(Dispatchers.IO) {
                    apiService.getCertifications(
                        type = state.selectedType,
                        alertsOnly = state.alertsOnly.takeIf { it }
                    )
                }
                state = state.copy(
                    loading = false,
                    certifications = response
                )
            } catch (error: Exception) {
                state = state.copy(
                    loading = false,
                    error = error.message ?: "Failed to load certifications"
                )
            }
        }
    }

    LaunchedEffect(state.selectedType, state.alertsOnly) {
        loadCertifications()
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.certifications_title),
                subtitle = state.certifications?.let {
                    "${it.total} certifications"
                },
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
                    IconButton(onClick = { loadCertifications() }) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = stringResource(R.string.common_refresh),
                            tint = AppColors.textSecondary
                        )
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onCreateCertification,
                containerColor = AppColors.primary600
            ) {
                Icon(Icons.Default.Add, contentDescription = stringResource(R.string.certifications_add))
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
            // Alert Summary
            state.certifications?.let { response ->
                val expiringCount = response.certifications.count { cert ->
                    isExpiringSoon(cert.expiryDate)
                }
                val expiredCount = response.certifications.count { cert ->
                    isExpired(cert.expiryDate)
                }

                if (expiringCount > 0 || expiredCount > 0) {
                    item {
                        AlertSummaryCard(
                            expiringCount = expiringCount,
                            expiredCount = expiredCount,
                            alertsOnly = state.alertsOnly,
                            onToggleAlerts = {
                                state = state.copy(alertsOnly = !state.alertsOnly)
                            }
                        )
                    }
                }
            }

            // Type Filters
            item {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                ) {
                    items(TYPE_FILTERS) { (label, value) ->
                        FilterChip(
                            selected = state.selectedType == value,
                            onClick = {
                                state = state.copy(selectedType = value)
                            },
                            label = { Text(label) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Primary600,
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
                        message = state.error ?: "An error occurred",
                        onRetry = { loadCertifications() },
                        onDismiss = { state = state.copy(error = null) }
                    )
                }
            }

            // Loading
            if (state.loading && state.certifications == null) {
                item {
                    CPLoadingIndicator(message = stringResource(R.string.certifications_loading))
                }
            }

            // Certifications List
            state.certifications?.certifications?.let { certs ->
                // Group by status for better organization
                val expired = certs.filter { isExpired(it.expiryDate) }
                val expiring = certs.filter { isExpiringSoon(it.expiryDate) && !isExpired(it.expiryDate) }
                val valid = certs.filter { !isExpiringSoon(it.expiryDate) && !isExpired(it.expiryDate) }

                if (expired.isNotEmpty()) {
                    item {
                        Text(
                            text = "Expired (${expired.size})",
                            style = AppTypography.bodySemibold,
                            fontWeight = FontWeight.SemiBold,
                            color = ConstructionRed,
                            modifier = Modifier.padding(top = AppSpacing.xs)
                        )
                    }
                    items(expired) { cert ->
                        CertificationCard(
                            certification = cert,
                            onClick = { onOpenCertification(cert.id) }
                        )
                    }
                }

                if (expiring.isNotEmpty()) {
                    item {
                        Text(
                            text = "Expiring Soon (${expiring.size})",
                            style = AppTypography.bodySemibold,
                            fontWeight = FontWeight.SemiBold,
                            color = ConstructionOrange,
                            modifier = Modifier.padding(top = AppSpacing.xs)
                        )
                    }
                    items(expiring) { cert ->
                        CertificationCard(
                            certification = cert,
                            onClick = { onOpenCertification(cert.id) }
                        )
                    }
                }

                if (valid.isNotEmpty()) {
                    item {
                        Text(
                            text = "Valid (${valid.size})",
                            style = AppTypography.bodySemibold,
                            fontWeight = FontWeight.SemiBold,
                            color = ConstructionGreen,
                            modifier = Modifier.padding(top = AppSpacing.xs)
                        )
                    }
                    items(valid) { cert ->
                        CertificationCard(
                            certification = cert,
                            onClick = { onOpenCertification(cert.id) }
                        )
                    }
                }
            }

            // Empty State
            if (!state.loading && state.certifications?.certifications?.isEmpty() == true) {
                item {
                    CPEmptyState(
                        icon = Icons.Default.VerifiedUser,
                        title = stringResource(R.string.certifications_empty_title),
                        description = stringResource(R.string.certifications_empty_desc)
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
private fun AlertSummaryCard(
    expiringCount: Int,
    expiredCount: Int,
    alertsOnly: Boolean,
    onToggleAlerts: () -> Unit
) {
    CPCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(AppSpacing.iconCircleMedium)
                    .clip(RoundedCornerShape(AppSpacing.radiusLarge))
                    .background(ConstructionOrange.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Warning,
                    contentDescription = null,
                    tint = ConstructionOrange,
                    modifier = Modifier.size(AppSpacing.iconLarge)
                )
            }

            Spacer(modifier = Modifier.width(AppSpacing.md))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Attention Required",
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold
                )
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
                ) {
                    if (expiredCount > 0) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Error,
                                contentDescription = null,
                                tint = ConstructionRed,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(AppSpacing.xxs))
                            Text(
                                text = "$expiredCount expired",
                                style = AppTypography.secondary,
                                color = ConstructionRed
                            )
                        }
                    }
                    if (expiringCount > 0) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Schedule,
                                contentDescription = null,
                                tint = ConstructionOrange,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(AppSpacing.xxs))
                            Text(
                                text = "$expiringCount expiring",
                                style = AppTypography.secondary,
                                color = ConstructionOrange
                            )
                        }
                    }
                }
            }

            FilterChip(
                selected = alertsOnly,
                onClick = onToggleAlerts,
                label = { Text(if (alertsOnly) "All" else "Alerts") },
                leadingIcon = {
                    Icon(
                        imageVector = if (alertsOnly) Icons.Default.FilterList else Icons.Default.FilterAlt,
                        contentDescription = null,
                        modifier = Modifier.size(AppSpacing.iconSmall)
                    )
                }
            )
        }
    }
}

@Composable
private fun CertificationCard(
    certification: Certification,
    onClick: () -> Unit
) {
    val expired = isExpired(certification.expiryDate)
    val expiring = isExpiringSoon(certification.expiryDate)
    val daysUntilExpiry = getDaysUntilExpiry(certification.expiryDate)

    CPCard(onClick = onClick) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Status Icon
            Box(
                modifier = Modifier
                    .size(AppSpacing.iconCircleMedium)
                    .clip(RoundedCornerShape(AppSpacing.radiusLarge))
                    .background(
                        when {
                            expired -> ConstructionRed.copy(alpha = 0.1f)
                            expiring -> ConstructionOrange.copy(alpha = 0.1f)
                            else -> ConstructionGreen.copy(alpha = 0.1f)
                        }
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = when {
                        expired -> Icons.Default.ErrorOutline
                        expiring -> Icons.Default.Schedule
                        else -> Icons.Default.VerifiedUser
                    },
                    contentDescription = null,
                    tint = when {
                        expired -> ConstructionRed
                        expiring -> ConstructionOrange
                        else -> ConstructionGreen
                    },
                    modifier = Modifier.size(AppSpacing.iconLarge)
                )
            }

            Spacer(modifier = Modifier.width(AppSpacing.md))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = certification.name,
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                // Holder info
                val holderName = certification.user?.name ?: certification.subcontractor?.companyName
                holderName?.let {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(top = 2.dp)
                    ) {
                        Icon(
                            imageVector = if (certification.user != null) Icons.Default.Person else Icons.Default.Business,
                            contentDescription = null,
                            tint = AppColors.textMuted,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.xxs))
                        Text(
                            text = it,
                            style = AppTypography.body,
                            color = AppColors.textSecondary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                // Certification number
                certification.certificateNumber?.let { number ->
                    Text(
                        text = "# $number",
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                // Status Badge
                CPBadge(
                    text = stringResource(when {
                        expired -> R.string.certifications_expired
                        expiring -> R.string.certifications_expiring_soon
                        else -> R.string.certifications_valid
                    }),
                    color = when {
                        expired -> ConstructionRed
                        expiring -> ConstructionOrange
                        else -> ConstructionGreen
                    },
                    backgroundColor = when {
                        expired -> ConstructionRed.copy(alpha = 0.1f)
                        expiring -> ConstructionOrange.copy(alpha = 0.1f)
                        else -> ConstructionGreen.copy(alpha = 0.1f)
                    }
                )

                // Days until/since expiry
                certification.expiryDate?.let {
                    Text(
                        text = when {
                            expired && daysUntilExpiry != null -> "${-(daysUntilExpiry)} days ago"
                            daysUntilExpiry != null -> "$daysUntilExpiry days left"
                            else -> it.take(10)
                        },
                        style = AppTypography.secondary,
                        color = when {
                            expired -> ConstructionRed
                            expiring -> ConstructionOrange
                            else -> Gray500
                        },
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

// Helper functions
private fun isExpired(expiryDate: String?): Boolean {
    if (expiryDate == null) return false
    return try {
        val date = LocalDate.parse(expiryDate.take(10))
        date.isBefore(LocalDate.now())
    } catch (_: Exception) {
        false
    }
}

private fun isExpiringSoon(expiryDate: String?, daysThreshold: Long = 30): Boolean {
    if (expiryDate == null) return false
    return try {
        val date = LocalDate.parse(expiryDate.take(10))
        val now = LocalDate.now()
        date.isAfter(now) && ChronoUnit.DAYS.between(now, date) <= daysThreshold
    } catch (_: Exception) {
        false
    }
}

private fun getDaysUntilExpiry(expiryDate: String?): Long? {
    if (expiryDate == null) return null
    return try {
        val date = LocalDate.parse(expiryDate.take(10))
        ChronoUnit.DAYS.between(LocalDate.now(), date)
    } catch (_: Exception) {
        null
    }
}
