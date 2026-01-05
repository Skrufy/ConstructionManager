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

private data class ExpenseDetailState(
    val loading: Boolean = false,
    val expense: Expense? = null,
    val error: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExpenseDetailScreen(
    apiService: ApiService,
    expenseId: String,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(ExpenseDetailState(loading = true)) }

    fun loadData() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val expense = withContext(Dispatchers.IO) {
                    apiService.getExpense(expenseId)
                }
                state = state.copy(loading = false, expense = expense)
            } catch (error: Exception) {
                state = state.copy(
                    loading = false,
                    error = error.message ?: "Failed to load expense details"
                )
            }
        }
    }

    LaunchedEffect(expenseId) {
        loadData()
    }

    Scaffold(
        containerColor = BackgroundLight,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.financials_expenses),
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
                            contentDescription = "Refresh",
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
                CPLoadingIndicator(message = "Loading expense details...")
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
            state.expense?.let { expense ->
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
                        ExpenseStatusBanner(status = expense.status)
                    }

                    // Amount Card
                    item {
                        ExpenseAmountCard(
                            amount = expense.amount,
                            category = expense.category,
                            status = expense.status
                        )
                    }

                    // Expense Details
                    item {
                        CPSectionHeader(title = "Expense Details")
                    }

                    item {
                        ExpenseDetailsCard(expense = expense)
                    }

                    // Submitter Info
                    expense.submittedBy?.let { submitter ->
                        item {
                            CPSectionHeader(title = "Submitted By")
                        }
                        item {
                            SubmitterCard(submitter = submitter, submittedDate = expense.createdAt)
                        }
                    }

                    // Approval Info
                    expense.approvedBy?.let { approver ->
                        item {
                            CPSectionHeader(title = "Approval")
                        }
                        item {
                            ExpenseApprovalCard(
                                approver = approver,
                                status = expense.status
                            )
                        }
                    }

                    // Description
                    item {
                        CPSectionHeader(title = "Description")
                    }
                    item {
                        CPCard {
                            Text(
                                text = expense.description,
                                style = MaterialTheme.typography.bodyMedium,
                                color = Gray700
                            )
                        }
                    }

                    // Receipt
                    expense.receiptUrl?.let { url ->
                        if (url.isNotBlank()) {
                            item {
                                CPSectionHeader(title = "Receipt")
                            }
                            item {
                                ReceiptCard()
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
private fun ExpenseStatusBanner(status: String) {
    val (color, icon, message) = when (status.uppercase()) {
        "REIMBURSED" -> Triple(ConstructionGreen, Icons.Default.CheckCircle, "REIMBURSED")
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
private fun ExpenseAmountCard(amount: Double, category: String, status: String) {
    CPCard {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            CPBadge(
                text = category.replace("_", " "),
                color = getCategoryColor(category),
                backgroundColor = getCategoryColor(category).copy(alpha = 0.1f)
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "Expense Amount",
                style = MaterialTheme.typography.bodyMedium,
                color = Gray500
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "$${String.format("%,.2f", amount)}",
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold,
                color = when (status.uppercase()) {
                    "REIMBURSED" -> ConstructionGreen
                    "REJECTED" -> ConstructionRed
                    else -> Gray900
                }
            )
        }
    }
}

@Composable
private fun ExpenseDetailsCard(expense: Expense) {
    CPCard {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            DetailRow(
                icon = Icons.Default.Category,
                label = "Category",
                value = expense.category.replace("_", " ")
            )

            expense.project?.let { project ->
                DetailRow(
                    icon = Icons.Default.Folder,
                    label = "Project",
                    value = project.name
                )
            }

            DetailRow(
                icon = Icons.Default.Event,
                label = "Expense Date",
                value = expense.expenseDate.take(10)
            )

            expense.createdAt?.let { date ->
                DetailRow(
                    icon = Icons.Default.CalendarToday,
                    label = "Submitted",
                    value = date.take(10)
                )
            }
        }
    }
}

@Composable
private fun SubmitterCard(submitter: UserSummary, submittedDate: String?) {
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
                    text = submitter.name?.take(2)?.uppercase() ?: "??",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = Primary700
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = submitter.name ?: "Unknown",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                submittedDate?.let { date ->
                    Text(
                        text = "Submitted on ${date.take(10)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = Gray500
                    )
                }
            }
        }
    }
}

@Composable
private fun ExpenseApprovalCard(approver: UserSummary, status: String) {
    val isApproved = status.uppercase() == "APPROVED" || status.uppercase() == "REIMBURSED"
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
                Text(
                    text = if (isRejected) "Expense rejected" else "Expense approved",
                    style = MaterialTheme.typography.bodySmall,
                    color = Gray500
                )
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
private fun ReceiptCard() {
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
                    imageVector = Icons.Default.Receipt,
                    contentDescription = null,
                    tint = Primary600,
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Receipt Image",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "Tap to view receipt",
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

private fun getCategoryColor(category: String): androidx.compose.ui.graphics.Color {
    return when (category.uppercase()) {
        "LABOR" -> Primary600
        "MATERIALS" -> ConstructionOrange
        "EQUIPMENT" -> ConstructionGreen
        "TRAVEL" -> androidx.compose.ui.graphics.Color(0xFF8B5CF6)
        else -> Gray600
    }
}
