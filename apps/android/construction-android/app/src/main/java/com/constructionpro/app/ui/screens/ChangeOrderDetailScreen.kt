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

private data class ChangeOrderDetailState(
    val loading: Boolean = false,
    val changeOrder: ChangeOrder? = null,
    val error: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChangeOrderDetailScreen(
    apiService: ApiService,
    changeOrderId: String,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(ChangeOrderDetailState(loading = true)) }

    fun loadData() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val changeOrder = withContext(Dispatchers.IO) {
                    apiService.getChangeOrder(changeOrderId)
                }
                state = state.copy(loading = false, changeOrder = changeOrder)
            } catch (error: Exception) {
                state = state.copy(
                    loading = false,
                    error = error.message ?: "Failed to load change order details"
                )
            }
        }
    }

    LaunchedEffect(changeOrderId) {
        loadData()
    }

    Scaffold(
        containerColor = BackgroundLight,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.financials_change_orders),
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
            state.changeOrder?.let { changeOrder ->
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
                        ChangeOrderStatusBanner(status = changeOrder.status)
                    }

                    // Header Card
                    item {
                        ChangeOrderHeaderCard(changeOrder = changeOrder)
                    }

                    // Amount Card
                    item {
                        ChangeOrderAmountCard(
                            amount = changeOrder.amount,
                            status = changeOrder.status
                        )
                    }

                    // Details
                    item {
                        CPSectionHeader(title = "Change Order Details")
                    }

                    item {
                        ChangeOrderDetailsCard(changeOrder = changeOrder)
                    }

                    // Description
                    item {
                        CPSectionHeader(title = "Description")
                    }
                    item {
                        CPCard {
                            Text(
                                text = changeOrder.description,
                                style = MaterialTheme.typography.bodyMedium,
                                color = Gray700
                            )
                        }
                    }

                    // Reason
                    changeOrder.reason?.let { reason ->
                        if (reason.isNotBlank()) {
                            item {
                                CPSectionHeader(title = "Reason")
                            }
                            item {
                                CPCard {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        verticalAlignment = Alignment.Top
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Help,
                                            contentDescription = null,
                                            tint = Primary600,
                                            modifier = Modifier.size(20.dp)
                                        )
                                        Spacer(modifier = Modifier.width(12.dp))
                                        Text(
                                            text = reason,
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = Gray700
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // Impact
                    changeOrder.impact?.let { impact ->
                        if (impact.isNotBlank()) {
                            item {
                                CPSectionHeader(title = "Schedule/Budget Impact")
                            }
                            item {
                                ImpactCard(impact = impact)
                            }
                        }
                    }

                    // Requester Info
                    changeOrder.requestedBy?.let { requester ->
                        item {
                            CPSectionHeader(title = "Requested By")
                        }
                        item {
                            RequesterCard(requester = requester, requestedDate = changeOrder.createdAt)
                        }
                    }

                    // Approval Info
                    changeOrder.approvedBy?.let { approver ->
                        item {
                            CPSectionHeader(title = "Approval")
                        }
                        item {
                            ChangeOrderApprovalCard(
                                approver = approver,
                                approvedAt = changeOrder.approvedAt,
                                status = changeOrder.status
                            )
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
private fun ChangeOrderStatusBanner(status: String) {
    val (color, icon, message) = when (status.uppercase()) {
        "APPROVED" -> Triple(ConstructionGreen, Icons.Default.CheckCircle, "APPROVED")
        "REJECTED" -> Triple(ConstructionRed, Icons.Default.Cancel, "REJECTED")
        else -> Triple(ConstructionOrange, Icons.Default.Schedule, "PENDING APPROVAL")
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
private fun ChangeOrderHeaderCard(changeOrder: ChangeOrder) {
    CPCard {
        Column(modifier = Modifier.fillMaxWidth()) {
            Text(
                text = changeOrder.title,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                CPBadge(
                    text = changeOrder.status,
                    color = getStatusColor(changeOrder.status),
                    backgroundColor = getStatusColor(changeOrder.status).copy(alpha = 0.1f)
                )
            }

            changeOrder.project?.let { project ->
                Spacer(modifier = Modifier.height(12.dp))
                Divider(color = Gray200)
                Spacer(modifier = Modifier.height(12.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Folder,
                        contentDescription = null,
                        tint = Gray400,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = project.name,
                        style = MaterialTheme.typography.bodyMedium,
                        color = Gray700
                    )
                }
            }
        }
    }
}

@Composable
private fun ChangeOrderAmountCard(amount: Double, status: String) {
    val isPositive = amount >= 0
    val color = when {
        status.uppercase() == "REJECTED" -> ConstructionRed
        isPositive -> ConstructionRed // Cost increase
        else -> ConstructionGreen // Cost decrease (credit)
    }

    CPCard {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = if (isPositive) Icons.Default.TrendingUp else Icons.Default.TrendingDown,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = if (isPositive) "Cost Increase" else "Credit",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Gray500
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "${if (isPositive) "+" else ""}$${String.format("%,.2f", amount)}",
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold,
                color = color
            )
        }
    }
}

@Composable
private fun ChangeOrderDetailsCard(changeOrder: ChangeOrder) {
    CPCard {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            changeOrder.project?.let { project ->
                DetailRow(
                    icon = Icons.Default.Folder,
                    label = "Project",
                    value = project.name
                )
            }

            changeOrder.createdAt?.let { date ->
                DetailRow(
                    icon = Icons.Default.CalendarToday,
                    label = "Submitted",
                    value = date.take(10)
                )
            }

            changeOrder.approvedAt?.let { date ->
                DetailRow(
                    icon = Icons.Default.CheckCircle,
                    label = "Approved",
                    value = date.take(10)
                )
            }
        }
    }
}

@Composable
private fun ImpactCard(impact: String) {
    CPCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.Top
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(ConstructionOrange.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Warning,
                    contentDescription = null,
                    tint = ConstructionOrange,
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column {
                Text(
                    text = "Impact Assessment",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = impact,
                    style = MaterialTheme.typography.bodyMedium,
                    color = Gray700
                )
            }
        }
    }
}

@Composable
private fun RequesterCard(requester: UserSummary, requestedDate: String?) {
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
                Text(
                    text = requester.name?.take(2)?.uppercase() ?: "??",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = Primary700
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = requester.name ?: "Unknown",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                requestedDate?.let { date ->
                    Text(
                        text = "Requested on ${date.take(10)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = Gray500
                    )
                }
            }
        }
    }
}

@Composable
private fun ChangeOrderApprovalCard(
    approver: UserSummary,
    approvedAt: String?,
    status: String
) {
    val isApproved = status.uppercase() == "APPROVED"
    val isRejected = status.uppercase() == "REJECTED"

    CPCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(
                        when {
                            isApproved -> ConstructionGreen.copy(alpha = 0.1f)
                            isRejected -> ConstructionRed.copy(alpha = 0.1f)
                            else -> Gray100
                        }
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = if (isRejected) Icons.Default.Cancel else Icons.Default.Verified,
                    contentDescription = null,
                    tint = when {
                        isApproved -> ConstructionGreen
                        isRejected -> ConstructionRed
                        else -> Gray500
                    },
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "${if (isRejected) "Rejected" else "Approved"} by ${approver.name ?: "Unknown"}",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
                approvedAt?.let { date ->
                    Text(
                        text = "on ${date.take(10)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = Gray500
                    )
                }
            }

            CPBadge(
                text = if (isRejected) "REJECTED" else "APPROVED",
                color = if (isRejected) ConstructionRed else ConstructionGreen,
                backgroundColor = if (isRejected) ConstructionRed.copy(alpha = 0.1f) else ConstructionGreen.copy(alpha = 0.1f)
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

private fun getStatusColor(status: String): androidx.compose.ui.graphics.Color {
    return when (status.uppercase()) {
        "APPROVED" -> ConstructionGreen
        "REJECTED" -> ConstructionRed
        else -> ConstructionOrange
    }
}
