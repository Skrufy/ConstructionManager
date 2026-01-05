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

private data class InvoiceDetailState(
    val loading: Boolean = false,
    val invoice: Invoice? = null,
    val error: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InvoiceDetailScreen(
    apiService: ApiService,
    invoiceId: String,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(InvoiceDetailState(loading = true)) }

    fun loadData() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val invoice = withContext(Dispatchers.IO) {
                    apiService.getInvoice(invoiceId)
                }
                state = state.copy(loading = false, invoice = invoice)
            } catch (error: Exception) {
                state = state.copy(
                    loading = false,
                    error = error.message ?: "Failed to load invoice details"
                )
            }
        }
    }

    LaunchedEffect(invoiceId) {
        loadData()
    }

    Scaffold(
        containerColor = BackgroundLight,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.financials_invoices),
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
                CPLoadingIndicator(message = stringResource(R.string.financials_loading))
            }
        } else if (state.error != null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(16.dp)
            ) {
                CPErrorBanner(
                    message = state.error ?: "An error occurred",
                    onRetry = { loadData() },
                    onDismiss = { state = state.copy(error = null) }
                )
            }
        } else {
            state.invoice?.let { invoice ->
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentPadding = PaddingValues(
                        horizontal = responsiveValue(16.dp, 24.dp, 32.dp),
                        vertical = 16.dp
                    ),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Status Banner
                    item {
                        InvoiceStatusBanner(status = invoice.status)
                    }

                    // Amount Card
                    item {
                        AmountCard(
                            amount = invoice.amount,
                            status = invoice.status
                        )
                    }

                    // Invoice Details
                    item {
                        CPSectionHeader(title = "Invoice Details")
                    }

                    item {
                        InvoiceDetailsCard(invoice = invoice)
                    }

                    // Vendor Info
                    invoice.vendorName?.let { vendor ->
                        item {
                            CPSectionHeader(title = "Vendor Information")
                        }
                        item {
                            VendorCard(vendorName = vendor)
                        }
                    }

                    // Payment Info
                    if (invoice.dueDate != null || invoice.paidDate != null) {
                        item {
                            CPSectionHeader(title = "Payment Information")
                        }
                        item {
                            PaymentInfoCard(invoice = invoice)
                        }
                    }

                    // Approval Info
                    invoice.approvedBy?.let { approver ->
                        item {
                            CPSectionHeader(title = "Approval")
                        }
                        item {
                            ApprovalCard(approver = approver)
                        }
                    }

                    // Description
                    invoice.description?.let { description ->
                        if (description.isNotBlank()) {
                            item {
                                CPSectionHeader(title = "Description")
                            }
                            item {
                                CPCard {
                                    Text(
                                        text = description,
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = Gray700
                                    )
                                }
                            }
                        }
                    }

                    // Attachment
                    invoice.attachmentUrl?.let { url ->
                        if (url.isNotBlank()) {
                            item {
                                CPSectionHeader(title = "Attachment")
                            }
                            item {
                                AttachmentCard()
                            }
                        }
                    }

                    item {
                        Spacer(modifier = Modifier.height(16.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun InvoiceStatusBanner(status: String) {
    val (color, icon, message) = when (status.uppercase()) {
        "PAID" -> Triple(ConstructionGreen, Icons.Default.CheckCircle, "PAID")
        "APPROVED" -> Triple(Primary600, Icons.Default.Verified, "APPROVED")
        "REJECTED" -> Triple(ConstructionRed, Icons.Default.Cancel, "REJECTED")
        else -> Triple(ConstructionOrange, Icons.Default.Schedule, "PENDING")
    }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = color.copy(alpha = 0.1f)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(28.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = message,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = color
            )
        }
    }
}

@Composable
private fun AmountCard(amount: Double, status: String) {
    CPCard {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Invoice Amount",
                style = MaterialTheme.typography.bodyMedium,
                color = Gray500
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "$${String.format("%,.2f", amount)}",
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold,
                color = when (status.uppercase()) {
                    "PAID" -> ConstructionGreen
                    "REJECTED" -> ConstructionRed
                    else -> Gray900
                }
            )
        }
    }
}

@Composable
private fun InvoiceDetailsCard(invoice: Invoice) {
    CPCard {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            invoice.invoiceNumber?.let { number ->
                DetailRow(
                    icon = Icons.Default.Receipt,
                    label = "Invoice Number",
                    value = number
                )
            }

            invoice.project?.let { project ->
                DetailRow(
                    icon = Icons.Default.Folder,
                    label = "Project",
                    value = project.name
                )
            }

            invoice.createdAt?.let { date ->
                DetailRow(
                    icon = Icons.Default.CalendarToday,
                    label = "Created",
                    value = date.take(10)
                )
            }
        }
    }
}

@Composable
private fun VendorCard(vendorName: String) {
    CPCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Primary100),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Store,
                    contentDescription = null,
                    tint = Primary600,
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column {
                Text(
                    text = vendorName,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "Vendor",
                    style = MaterialTheme.typography.bodySmall,
                    color = Gray500
                )
            }
        }
    }
}

@Composable
private fun PaymentInfoCard(invoice: Invoice) {
    CPCard {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            invoice.dueDate?.let { date ->
                val isOverdue = isDatePast(date) && invoice.status != "PAID"
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (isOverdue) ConstructionRed.copy(alpha = 0.1f) else Primary100),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Event,
                            contentDescription = null,
                            tint = if (isOverdue) ConstructionRed else Primary600,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Due Date",
                            style = MaterialTheme.typography.bodySmall,
                            color = Gray500
                        )
                        Text(
                            text = date.take(10),
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium,
                            color = if (isOverdue) ConstructionRed else Gray900
                        )
                    }
                    if (isOverdue) {
                        CPBadge(
                            text = "OVERDUE",
                            color = ConstructionRed,
                            backgroundColor = ConstructionRed.copy(alpha = 0.1f)
                        )
                    }
                }
            }

            invoice.paidDate?.let { date ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(ConstructionGreen.copy(alpha = 0.1f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = ConstructionGreen,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "Paid Date",
                            style = MaterialTheme.typography.bodySmall,
                            color = Gray500
                        )
                        Text(
                            text = date.take(10),
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium,
                            color = ConstructionGreen
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ApprovalCard(approver: UserSummary) {
    CPCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(ConstructionGreen.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Verified,
                    contentDescription = null,
                    tint = ConstructionGreen,
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column {
                Text(
                    text = "Approved by ${approver.name ?: "Unknown"}",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "Invoice approved",
                    style = MaterialTheme.typography.bodySmall,
                    color = Gray500
                )
            }
        }
    }
}

@Composable
private fun AttachmentCard() {
    CPCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Primary100),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.AttachFile,
                    contentDescription = null,
                    tint = Primary600,
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Invoice Document",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "Tap to view attachment",
                    style = MaterialTheme.typography.bodySmall,
                    color = Gray500
                )
            }

            Icon(
                imageVector = Icons.Default.OpenInNew,
                contentDescription = "Open",
                tint = Primary600,
                modifier = Modifier.size(24.dp)
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
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(
                text = label,
                style = MaterialTheme.typography.bodySmall,
                color = Gray500
            )
            Text(
                text = value,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                color = Gray900
            )
        }
    }
}

private fun isDatePast(dateString: String): Boolean {
    val today = java.time.LocalDate.now().toString()
    return dateString.take(10) < today
}
