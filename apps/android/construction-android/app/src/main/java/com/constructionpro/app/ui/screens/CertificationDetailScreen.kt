package com.constructionpro.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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

private data class CertificationDetailState(
    val loading: Boolean = false,
    val certification: Certification? = null,
    val error: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CertificationDetailScreen(
    apiService: ApiService,
    certificationId: String,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(CertificationDetailState(loading = true)) }

    fun loadData() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                // Get certifications and find the matching one
                val response = withContext(Dispatchers.IO) {
                    apiService.getCertifications()
                }
                val certification = response.certifications.find { it.id == certificationId }
                state = if (certification != null) {
                    state.copy(loading = false, certification = certification)
                } else {
                    state.copy(loading = false, error = "Certification not found")
                }
            } catch (error: Exception) {
                state = state.copy(
                    loading = false,
                    error = error.message ?: "Failed to load certification details"
                )
            }
        }
    }

    LaunchedEffect(certificationId) {
        loadData()
    }

    Scaffold(
        containerColor = BackgroundLight,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.certifications_title),
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = stringResource(R.string.common_back),
                            tint = Gray700
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { loadData() }) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = stringResource(R.string.common_refresh),
                            tint = Gray600
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
                CPLoadingIndicator(message = stringResource(R.string.certifications_loading))
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
            state.certification?.let { certification ->
                val isExpired = certification.expiryDate?.let { isDateExpired(it) } ?: false
                val isExpiringSoon = certification.expiryDate?.let { isDateExpiringSoon(it) } ?: false
                val daysRemaining = certification.expiryDate?.let { getDaysUntilExpiry(it) }

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
                    // Status Banner
                    item {
                        StatusBanner(
                            isExpired = isExpired,
                            isExpiringSoon = isExpiringSoon,
                            daysRemaining = daysRemaining
                        )
                    }

                    // Header Card
                    item {
                        CertificationHeaderCard(
                            certification = certification,
                            isExpired = isExpired,
                            isExpiringSoon = isExpiringSoon
                        )
                    }

                    // Certification Details
                    item {
                        CPSectionHeader(title = "Details")
                    }

                    item {
                        CertificationDetailsCard(certification = certification)
                    }

                    // Holder Information
                    item {
                        CPSectionHeader(title = "Holder Information")
                    }

                    item {
                        HolderCard(certification = certification)
                    }

                    // Validity Period
                    item {
                        CPSectionHeader(title = "Validity Period")
                    }

                    item {
                        ValidityCard(
                            certification = certification,
                            isExpired = isExpired,
                            isExpiringSoon = isExpiringSoon
                        )
                    }

                    // Notes
                    certification.notes?.let { notes ->
                        if (notes.isNotBlank()) {
                            item {
                                CPSectionHeader(title = "Notes")
                            }
                            item {
                                CPCard {
                                    Text(
                                        text = notes,
                                        style = AppTypography.body,
                                        color = Gray700
                                    )
                                }
                            }
                        }
                    }

                    // Document Link
                    certification.documentUrl?.let { url ->
                        if (url.isNotBlank()) {
                            item {
                                CPSectionHeader(title = "Document")
                            }
                            item {
                                DocumentCard(documentUrl = url)
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
private fun StatusBanner(
    isExpired: Boolean,
    isExpiringSoon: Boolean,
    daysRemaining: Long?
) {
    val (color, icon, message) = when {
        isExpired -> Triple(
            ConstructionRed,
            Icons.Default.Warning,
            "EXPIRED - Renewal Required"
        )
        isExpiringSoon -> Triple(
            ConstructionOrange,
            Icons.Default.Schedule,
            "EXPIRING SOON - ${daysRemaining ?: "?"} days remaining"
        )
        else -> Triple(
            ConstructionGreen,
            Icons.Default.CheckCircle,
            "VALID${daysRemaining?.let { " - $it days remaining" } ?: ""}"
        )
    }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(AppSpacing.radiusLarge),
        color = color.copy(alpha = 0.1f)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(AppSpacing.md),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(AppSpacing.iconXL)
            )
            Spacer(modifier = Modifier.width(AppSpacing.sm))
            Text(
                text = message,
                style = AppTypography.heading3,
                fontWeight = FontWeight.Bold,
                color = color
            )
        }
    }
}

@Composable
private fun CertificationHeaderCard(
    certification: Certification,
    isExpired: Boolean,
    isExpiringSoon: Boolean
) {
    CPCard {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(AppSpacing.iconCircleLarge + AppSpacing.xs)
                        .clip(RoundedCornerShape(AppSpacing.radiusXL))
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
                        modifier = Modifier.size(AppSpacing.xxl)
                    )
                }

                Spacer(modifier = Modifier.width(AppSpacing.md))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = certification.name,
                        style = AppTypography.heading2,
                        fontWeight = FontWeight.Bold
                    )
                    certification.issuingAuthority?.let { authority ->
                        Text(
                            text = authority,
                            style = AppTypography.bodyLarge,
                            color = Gray600
                        )
                    }
                }

                CPBadge(
                    text = certification.certType.replace("_", " "),
                    color = Primary600,
                    backgroundColor = Primary100
                )
            }

            certification.certificateNumber?.let { number ->
                Spacer(modifier = Modifier.height(AppSpacing.sm))
                Divider(color = Gray200)
                Spacer(modifier = Modifier.height(AppSpacing.sm))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Tag,
                        contentDescription = null,
                        tint = Gray400,
                        modifier = Modifier.size(AppSpacing.iconSmall)
                    )
                    Spacer(modifier = Modifier.width(AppSpacing.xs))
                    Text(
                        text = "Certificate #: $number",
                        style = AppTypography.body,
                        color = Gray700
                    )
                }
            }
        }
    }
}

@Composable
private fun CertificationDetailsCard(certification: Certification) {
    CPCard {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
        ) {
            DetailRow(
                icon = Icons.Default.Category,
                label = stringResource(R.string.certifications_type),
                value = certification.certType.replace("_", " ")
            )

            certification.issuingAuthority?.let { authority ->
                DetailRow(
                    icon = Icons.Default.Business,
                    label = stringResource(R.string.certifications_issuing_authority),
                    value = authority
                )
            }

            certification.certificateNumber?.let { number ->
                DetailRow(
                    icon = Icons.Default.Numbers,
                    label = stringResource(R.string.certifications_certificate_number),
                    value = number
                )
            }

            DetailRow(
                icon = Icons.Default.AccountCircle,
                label = "Holder Type",
                value = certification.type.replaceFirstChar { it.uppercase() }
            )
        }
    }
}

@Composable
private fun HolderCard(certification: Certification) {
    CPCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(AppSpacing.iconCircleMedium)
                    .clip(RoundedCornerShape(AppSpacing.radiusLarge))
                    .background(Primary100),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = if (certification.type == "user") Icons.Default.Person else Icons.Default.Business,
                    contentDescription = null,
                    tint = Primary600,
                    modifier = Modifier.size(AppSpacing.iconLarge)
                )
            }

            Spacer(modifier = Modifier.width(AppSpacing.md))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = when {
                        certification.type == "user" -> certification.user?.name ?: "Unknown User"
                        else -> certification.subcontractor?.companyName ?: "Unknown Subcontractor"
                    },
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = if (certification.type == "user") "Employee" else "Subcontractor",
                    style = AppTypography.secondary,
                    color = Gray500
                )
            }

            CPBadge(
                text = certification.type.replaceFirstChar { it.uppercase() },
                color = Gray600,
                backgroundColor = Gray100
            )
        }
    }
}

@Composable
private fun ValidityCard(
    certification: Certification,
    isExpired: Boolean,
    isExpiringSoon: Boolean
) {
    CPCard {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
        ) {
            // Issue Date
            certification.issueDate?.let { date ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(AppSpacing.iconCircleSmall)
                            .clip(RoundedCornerShape(AppSpacing.radiusMedium))
                            .background(ConstructionGreen.copy(alpha = 0.1f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.CalendarToday,
                            contentDescription = null,
                            tint = ConstructionGreen,
                            modifier = Modifier.size(AppSpacing.iconMedium)
                        )
                    }
                    Spacer(modifier = Modifier.width(AppSpacing.sm))
                    Column {
                        Text(
                            text = stringResource(R.string.certifications_issue_date),
                            style = AppTypography.secondary,
                            color = Gray500
                        )
                        Text(
                            text = date.take(10),
                            style = AppTypography.body,
                            fontWeight = FontWeight.Medium,
                            color = Gray900
                        )
                    }
                }
            }

            // Expiry Date
            certification.expiryDate?.let { date ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(AppSpacing.iconCircleSmall)
                            .clip(RoundedCornerShape(AppSpacing.radiusMedium))
                            .background(
                                when {
                                    isExpired -> ConstructionRed.copy(alpha = 0.1f)
                                    isExpiringSoon -> ConstructionOrange.copy(alpha = 0.1f)
                                    else -> Primary100
                                }
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Event,
                            contentDescription = null,
                            tint = when {
                                isExpired -> ConstructionRed
                                isExpiringSoon -> ConstructionOrange
                                else -> Primary600
                            },
                            modifier = Modifier.size(AppSpacing.iconMedium)
                        )
                    }
                    Spacer(modifier = Modifier.width(AppSpacing.sm))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = stringResource(R.string.certifications_expiry_date),
                            style = AppTypography.secondary,
                            color = Gray500
                        )
                        Text(
                            text = date.take(10),
                            style = AppTypography.body,
                            fontWeight = FontWeight.Medium,
                            color = when {
                                isExpired -> ConstructionRed
                                isExpiringSoon -> ConstructionOrange
                                else -> Gray900
                            }
                        )
                    }
                    CPBadge(
                        text = stringResource(when {
                            isExpired -> R.string.certifications_expired
                            isExpiringSoon -> R.string.certifications_expiring_soon
                            else -> R.string.certifications_valid
                        }),
                        color = when {
                            isExpired -> ConstructionRed
                            isExpiringSoon -> ConstructionOrange
                            else -> ConstructionGreen
                        },
                        backgroundColor = when {
                            isExpired -> ConstructionRed.copy(alpha = 0.1f)
                            isExpiringSoon -> ConstructionOrange.copy(alpha = 0.1f)
                            else -> ConstructionGreen.copy(alpha = 0.1f)
                        }
                    )
                }
            }

            // Progress bar showing time remaining
            certification.expiryDate?.let { expiryDate ->
                certification.issueDate?.let { issueDate ->
                    val progress = calculateValidityProgress(issueDate, expiryDate)
                    Column {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "Validity Progress",
                                style = AppTypography.secondary,
                                color = Gray500
                            )
                            Text(
                                text = "${(progress * 100).toInt()}% elapsed",
                                style = AppTypography.secondary,
                                color = Gray500
                            )
                        }
                        Spacer(modifier = Modifier.height(AppSpacing.xs))
                        LinearProgressIndicator(
                            progress = { progress.coerceIn(0f, 1f) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(AppSpacing.xs)
                                .clip(RoundedCornerShape(AppSpacing.xxs)),
                            color = when {
                                isExpired -> ConstructionRed
                                isExpiringSoon -> ConstructionOrange
                                else -> Primary600
                            },
                            trackColor = Gray200
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun DocumentCard(documentUrl: String) {
    CPCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(AppSpacing.iconCircleMedium)
                    .clip(RoundedCornerShape(AppSpacing.radiusLarge))
                    .background(Primary100),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Description,
                    contentDescription = null,
                    tint = Primary600,
                    modifier = Modifier.size(AppSpacing.iconLarge)
                )
            }

            Spacer(modifier = Modifier.width(AppSpacing.md))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Certificate Document",
                    style = AppTypography.bodySemibold,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "Tap to view attached document",
                    style = AppTypography.secondary,
                    color = Gray500
                )
            }

            Icon(
                imageVector = Icons.Default.OpenInNew,
                contentDescription = "Open document",
                tint = Primary600,
                modifier = Modifier.size(AppSpacing.iconLarge)
            )
        }
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
            tint = Gray400,
            modifier = Modifier.size(AppSpacing.iconMedium)
        )
        Spacer(modifier = Modifier.width(AppSpacing.sm))
        Column {
            Text(
                text = label,
                style = AppTypography.secondary,
                color = Gray500
            )
            Text(
                text = value,
                style = AppTypography.body,
                fontWeight = FontWeight.Medium,
                color = Gray900
            )
        }
    }
}

// Helper functions
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
    val today = java.time.LocalDate.now().toString()
    return dateString.take(10) < today
}

private fun isDateExpiringSoon(dateString: String): Boolean {
    val today = java.time.LocalDate.now()
    val expiryDate = try {
        java.time.LocalDate.parse(dateString.take(10))
    } catch (e: Exception) {
        return false
    }
    val daysUntilExpiry = java.time.temporal.ChronoUnit.DAYS.between(today, expiryDate)
    return daysUntilExpiry in 1..30
}

private fun getDaysUntilExpiry(dateString: String): Long? {
    val today = java.time.LocalDate.now()
    val expiryDate = try {
        java.time.LocalDate.parse(dateString.take(10))
    } catch (e: Exception) {
        return null
    }
    return java.time.temporal.ChronoUnit.DAYS.between(today, expiryDate)
}

private fun calculateValidityProgress(issueDate: String, expiryDate: String): Float {
    val today = java.time.LocalDate.now()
    val issue = try {
        java.time.LocalDate.parse(issueDate.take(10))
    } catch (e: Exception) {
        return 0f
    }
    val expiry = try {
        java.time.LocalDate.parse(expiryDate.take(10))
    } catch (e: Exception) {
        return 0f
    }
    val totalDays = java.time.temporal.ChronoUnit.DAYS.between(issue, expiry).toFloat()
    val elapsedDays = java.time.temporal.ChronoUnit.DAYS.between(issue, today).toFloat()
    return if (totalDays > 0) elapsedDays / totalDays else 0f
}
