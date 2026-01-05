package com.constructionpro.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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

private data class SubcontractorDetailState(
    val loading: Boolean = false,
    val subcontractor: Subcontractor? = null,
    val certifications: List<Certification> = emptyList(),
    val assignments: List<SubcontractorAssignment> = emptyList(),
    val error: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubcontractorDetailScreen(
    apiService: ApiService,
    subcontractorId: String,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(SubcontractorDetailState(loading = true)) }

    fun loadData() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val response = withContext(Dispatchers.IO) {
                    apiService.getSubcontractor(subcontractorId)
                }
                state = state.copy(
                    loading = false,
                    subcontractor = response.subcontractor,
                    certifications = response.certifications,
                    assignments = response.assignments
                )
            } catch (error: Exception) {
                state = state.copy(
                    loading = false,
                    error = error.message ?: "Failed to load subcontractor details"
                )
            }
        }
    }

    LaunchedEffect(subcontractorId) {
        loadData()
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = state.subcontractor?.companyName ?: "Subcontractor",
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
                    IconButton(onClick = { loadData() }) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Refresh",
                            tint = AppColors.textSecondary
                        )
                    }
                }
            )
        }
    ) { padding ->
        if (state.loading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CPLoadingIndicator(message = stringResource(R.string.subcontractors_loading))
            }
        } else if (state.error != null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(AppSpacing.md)
            ) {
                CPErrorBanner(
                    message = state.error ?: "An error occurred",
                    onRetry = { loadData() },
                    onDismiss = { state = state.copy(error = null) }
                )
            }
        } else {
            state.subcontractor?.let { subcontractor ->
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentPadding = PaddingValues(
                        horizontal = responsiveValue(AppSpacing.md, AppSpacing.xl, AppSpacing.xxl),
                        vertical = AppSpacing.md
                    ),
                    verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
                ) {
                    // Header Card
                    item {
                        SubcontractorHeaderCard(subcontractor = subcontractor)
                    }

                    // Contact Information
                    item {
                        CPSectionHeader(title = stringResource(R.string.subcontractors_contact_info))
                    }

                    item {
                        ContactInfoCard(subcontractor = subcontractor)
                    }

                    // Rating & Status
                    if (subcontractor.rating != null || subcontractor.insuranceExpiry != null) {
                        item {
                            CPSectionHeader(title = "Performance & Compliance")
                        }

                        item {
                            ComplianceCard(subcontractor = subcontractor)
                        }
                    }

                    // Certifications
                    if (state.certifications.isNotEmpty()) {
                        item {
                            CPSectionHeader(title = "Certifications (${state.certifications.size})")
                        }

                        items(state.certifications) { certification ->
                            CertificationCard(certification = certification)
                        }
                    }

                    // Active Assignments
                    val activeAssignments = state.assignments.filter { it.status == "ACTIVE" }
                    if (activeAssignments.isNotEmpty()) {
                        item {
                            CPSectionHeader(title = "Active Projects (${activeAssignments.size})")
                        }

                        items(activeAssignments) { assignment ->
                            AssignmentCard(assignment = assignment)
                        }
                    }

                    // Past Assignments
                    val pastAssignments = state.assignments.filter { it.status != "ACTIVE" }
                    if (pastAssignments.isNotEmpty()) {
                        item {
                            CPSectionHeader(title = "Past Projects (${pastAssignments.size})")
                        }

                        items(pastAssignments) { assignment ->
                            AssignmentCard(assignment = assignment)
                        }
                    }

                    // Notes
                    subcontractor.notes?.let { notes ->
                        if (notes.isNotBlank()) {
                            item {
                                CPSectionHeader(title = stringResource(R.string.subcontractors_notes))
                            }
                            item {
                                CPCard {
                                    Text(
                                        text = notes,
                                        style = AppTypography.body,
                                        color = AppColors.textPrimary
                                    )
                                }
                            }
                        }
                    }

                    item {
                        Spacer(modifier = Modifier.height(AppSpacing.md))
                    }
                }
            }
        }
    }
}

@Composable
private fun SubcontractorHeaderCard(subcontractor: Subcontractor) {
    CPCard {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(RoundedCornerShape(AppSpacing.md))
                        .background(getStatusColor(subcontractor.status).copy(alpha = 0.1f)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = subcontractor.companyName.take(2).uppercase(),
                        style = AppTypography.heading2,
                        fontWeight = FontWeight.Bold,
                        color = getStatusColor(subcontractor.status)
                    )
                }

                Spacer(modifier = Modifier.width(AppSpacing.md))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = subcontractor.companyName,
                        style = AppTypography.heading2,
                        fontWeight = FontWeight.Bold
                    )
                    subcontractor.trade?.let { trade ->
                        Text(
                            text = trade.replace("_", " "),
                            style = AppTypography.bodyLarge,
                            color = AppColors.textSecondary
                        )
                    }
                }

                CPBadge(
                    text = subcontractor.status,
                    color = getStatusColor(subcontractor.status),
                    backgroundColor = getStatusColor(subcontractor.status).copy(alpha = 0.1f)
                )
            }

            subcontractor.licenseNumber?.let { license ->
                Spacer(modifier = Modifier.height(AppSpacing.sm))
                Divider(color = AppColors.divider)
                Spacer(modifier = Modifier.height(AppSpacing.sm))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Badge,
                        contentDescription = null,
                        tint = AppColors.textMuted,
                        modifier = Modifier.size(AppSpacing.md)
                    )
                    Spacer(modifier = Modifier.width(AppSpacing.xs))
                    Text(
                        text = "License: $license",
                        style = AppTypography.body,
                        color = AppColors.textPrimary
                    )
                }
            }
        }
    }
}

@Composable
private fun ContactInfoCard(subcontractor: Subcontractor) {
    CPCard {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
        ) {
            subcontractor.contactName?.let { name ->
                ContactRow(
                    icon = Icons.Default.Person,
                    label = stringResource(R.string.subcontractors_contact),
                    value = name
                )
            }

            subcontractor.email?.let { email ->
                ContactRow(
                    icon = Icons.Default.Email,
                    label = stringResource(R.string.subcontractors_email),
                    value = email
                )
            }

            subcontractor.phone?.let { phone ->
                ContactRow(
                    icon = Icons.Default.Phone,
                    label = stringResource(R.string.subcontractors_phone),
                    value = phone
                )
            }

            subcontractor.address?.let { address ->
                ContactRow(
                    icon = Icons.Default.LocationOn,
                    label = "Address",
                    value = address
                )
            }
        }
    }
}

@Composable
private fun ContactRow(
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
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(AppSpacing.sm))
        Column {
            Text(
                text = label,
                style = AppTypography.secondary,
                color = AppColors.textSecondary
            )
            Text(
                text = value,
                style = AppTypography.body,
                fontWeight = FontWeight.Medium,
                color = AppColors.textPrimary
            )
        }
    }
}

@Composable
private fun ComplianceCard(subcontractor: Subcontractor) {
    CPCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            // Rating
            subcontractor.rating?.let { rating ->
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        imageVector = Icons.Default.Star,
                        contentDescription = null,
                        tint = getRatingColor(rating),
                        modifier = Modifier.size(28.dp)
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = String.format("%.1f", rating),
                        style = AppTypography.heading2,
                        fontWeight = FontWeight.Bold,
                        color = getRatingColor(rating)
                    )
                    Text(
                        text = "Rating",
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                }
            }

            // Insurance Status
            subcontractor.insuranceExpiry?.let { expiry ->
                val isExpired = isDateExpired(expiry)
                val isExpiringSoon = isDateExpiringSoon(expiry)
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        imageVector = if (isExpired) Icons.Default.GppBad else Icons.Default.Security,
                        contentDescription = null,
                        tint = when {
                            isExpired -> ConstructionRed
                            isExpiringSoon -> ConstructionOrange
                            else -> ConstructionGreen
                        },
                        modifier = Modifier.size(28.dp)
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = when {
                            isExpired -> "Expired"
                            isExpiringSoon -> "Expiring"
                            else -> "Valid"
                        },
                        style = AppTypography.heading3,
                        fontWeight = FontWeight.Bold,
                        color = when {
                            isExpired -> ConstructionRed
                            isExpiringSoon -> ConstructionOrange
                            else -> ConstructionGreen
                        }
                    )
                    Text(
                        text = stringResource(R.string.subcontractors_insurance),
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                }
            }

            // Certifications Count
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    imageVector = Icons.Default.Verified,
                    contentDescription = null,
                    tint = Primary600,
                    modifier = Modifier.size(28.dp)
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "${subcontractor.certifications.size}",
                    style = AppTypography.heading2,
                    fontWeight = FontWeight.Bold,
                    color = Primary600
                )
                Text(
                    text = "Certifications",
                    style = AppTypography.secondary,
                    color = AppColors.textSecondary
                )
            }
        }
    }
}

@Composable
private fun CertificationCard(certification: Certification) {
    val isExpired = certification.expiryDate?.let { isDateExpired(it) } ?: false
    val isExpiringSoon = certification.expiryDate?.let { isDateExpiringSoon(it) } ?: false

    CPCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(AppSpacing.radiusMedium))
                    .background(
                        when {
                            isExpired -> ConstructionRed.copy(alpha = 0.1f)
                            isExpiringSoon -> ConstructionOrange.copy(alpha = 0.1f)
                            else -> ConstructionGreen.copy(alpha = 0.1f)
                        }
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = getCertTypeIcon(certification.certType),
                    contentDescription = null,
                    tint = when {
                        isExpired -> ConstructionRed
                        isExpiringSoon -> ConstructionOrange
                        else -> ConstructionGreen
                    },
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.width(AppSpacing.sm))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = certification.name,
                    style = AppTypography.bodySemibold,
                    fontWeight = FontWeight.SemiBold
                )
                certification.issuingAuthority?.let { authority ->
                    Text(
                        text = authority,
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                }
                certification.expiryDate?.let { expiry ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(top = 4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CalendarToday,
                            contentDescription = null,
                            tint = AppColors.textMuted,
                            modifier = Modifier.size(AppSpacing.sm)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Expires: ${expiry.take(10)}",
                            style = AppTypography.secondary,
                            color = when {
                                isExpired -> ConstructionRed
                                isExpiringSoon -> ConstructionOrange
                                else -> AppColors.textSecondary
                            }
                        )
                    }
                }
            }

            CPBadge(
                text = certification.certType,
                color = AppColors.textSecondary,
                backgroundColor = AppColors.gray100
            )
        }
    }
}

@Composable
private fun AssignmentCard(assignment: SubcontractorAssignment) {
    CPCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(AppSpacing.minTouchTarget)
                    .clip(RoundedCornerShape(AppSpacing.sm))
                    .background(Primary100),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Folder,
                    contentDescription = null,
                    tint = Primary600,
                    modifier = Modifier.size(AppSpacing.xl)
                )
            }

            Spacer(modifier = Modifier.width(AppSpacing.sm))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = assignment.project?.name ?: "Unknown Project",
                    style = AppTypography.bodySemibold,
                    fontWeight = FontWeight.SemiBold
                )
                assignment.role?.let { role ->
                    Text(
                        text = role,
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                }
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(top = 4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.DateRange,
                        contentDescription = null,
                        tint = AppColors.textMuted,
                        modifier = Modifier.size(AppSpacing.sm)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "${assignment.startDate?.take(10) ?: "?"} - ${assignment.endDate?.take(10) ?: "Present"}",
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                }
                assignment.contractAmount?.let { amount ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(top = 2.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.AttachMoney,
                            contentDescription = null,
                            tint = AppColors.textMuted,
                            modifier = Modifier.size(AppSpacing.sm)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "$${String.format("%,.2f", amount)}",
                            style = AppTypography.secondary,
                            fontWeight = FontWeight.Medium,
                            color = Primary700
                        )
                    }
                }
            }

            CPBadge(
                text = assignment.status,
                color = if (assignment.status == "ACTIVE") ConstructionGreen else AppColors.textSecondary,
                backgroundColor = if (assignment.status == "ACTIVE") ConstructionGreen.copy(alpha = 0.1f) else AppColors.gray100
            )
        }
    }
}

// Helper functions
private fun getStatusColor(status: String): androidx.compose.ui.graphics.Color {
    return when (status.uppercase()) {
        "ACTIVE" -> ConstructionGreen
        "INACTIVE" -> Gray500
        "SUSPENDED" -> ConstructionRed
        else -> Gray500
    }
}

private fun getRatingColor(rating: Double): androidx.compose.ui.graphics.Color {
    return when {
        rating >= 4.5 -> ConstructionGreen
        rating >= 3.5 -> Primary600
        rating >= 2.5 -> ConstructionOrange
        else -> ConstructionRed
    }
}

private fun getCertTypeIcon(certType: String): androidx.compose.ui.graphics.vector.ImageVector {
    return when (certType.uppercase()) {
        "LICENSE" -> Icons.Default.Badge
        "TRAINING" -> Icons.Default.School
        "OSHA" -> Icons.Default.Security
        "EQUIPMENT" -> Icons.Default.Construction
        "INSURANCE" -> Icons.Default.Shield
        "BOND" -> Icons.Default.Gavel
        else -> Icons.Default.Verified
    }
}

private fun isDateExpired(dateString: String): Boolean {
    // Simple check - in production would use proper date parsing
    val today = java.time.LocalDate.now().toString()
    return dateString.take(10) < today
}

private fun isDateExpiringSoon(dateString: String): Boolean {
    // Check if within 30 days of expiry
    val today = java.time.LocalDate.now()
    val expiryDate = try {
        java.time.LocalDate.parse(dateString.take(10))
    } catch (e: Exception) {
        return false
    }
    val daysUntilExpiry = java.time.temporal.ChronoUnit.DAYS.between(today, expiryDate)
    return daysUntilExpiry in 1..30
}
