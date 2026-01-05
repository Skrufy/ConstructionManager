package com.constructionpro.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
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
import java.text.NumberFormat
import java.util.Locale

private data class FinancialsState(
    val loading: Boolean = false,
    val overview: FinancialOverview? = null,
    val error: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FinancialsScreen(
    apiService: ApiService,
    onBack: () -> Unit,
    onOpenInvoice: (String) -> Unit = {},
    onOpenExpense: (String) -> Unit = {},
    onOpenChangeOrder: (String) -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(FinancialsState(loading = true)) }
    val pagerState = rememberPagerState(pageCount = { 4 })
    val overviewTab = stringResource(R.string.financials_overview)
    val invoicesTab = stringResource(R.string.financials_invoices)
    val expensesTab = stringResource(R.string.financials_expenses)
    val changeOrdersTab = stringResource(R.string.financials_change_orders)
    val tabs = listOf(overviewTab, invoicesTab, expensesTab, changeOrdersTab)
    val currencyFormatter = remember { NumberFormat.getCurrencyInstance(Locale.US) }

    fun loadFinancials() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val overview = withContext(Dispatchers.IO) {
                    apiService.getFinancials()
                }
                state = state.copy(
                    loading = false,
                    overview = overview
                )
            } catch (error: Exception) {
                state = state.copy(
                    loading = false,
                    error = error.message ?: "Failed to load financials"
                )
            }
        }
    }

    LaunchedEffect(Unit) {
        loadFinancials()
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.financials_title),
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
                    IconButton(onClick = { loadFinancials() }) {
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Tab Row
            TabRow(
                selectedTabIndex = pagerState.currentPage,
                containerColor = AppColors.cardBackground,
                contentColor = Primary600,
                indicator = { tabPositions ->
                    TabRowDefaults.SecondaryIndicator(
                        modifier = Modifier.tabIndicatorOffset(tabPositions[pagerState.currentPage]),
                        color = Primary600
                    )
                }
            ) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = pagerState.currentPage == index,
                        onClick = {
                            scope.launch { pagerState.animateScrollToPage(index) }
                        },
                        text = { Text(title) },
                        selectedContentColor = AppColors.primary600,
                        unselectedContentColor = AppColors.textSecondary
                    )
                }
            }

            // Error Banner
            if (state.error != null) {
                Box(modifier = Modifier.padding(AppSpacing.md)) {
                    CPErrorBanner(
                        message = state.error ?: "An error occurred",
                        onRetry = { loadFinancials() },
                        onDismiss = { state = state.copy(error = null) }
                    )
                }
            }

            // Pager Content
            HorizontalPager(
                state = pagerState,
                modifier = Modifier.fillMaxSize()
            ) { page ->
                when (page) {
                    0 -> OverviewTab(
                        overview = state.overview,
                        loading = state.loading,
                        currencyFormatter = currencyFormatter
                    )
                    1 -> InvoicesTab(
                        invoices = state.overview?.invoices ?: emptyList(),
                        loading = state.loading,
                        currencyFormatter = currencyFormatter,
                        onOpenInvoice = onOpenInvoice
                    )
                    2 -> ExpensesTab(
                        expenses = state.overview?.expenses ?: emptyList(),
                        loading = state.loading,
                        currencyFormatter = currencyFormatter,
                        onOpenExpense = onOpenExpense
                    )
                    3 -> ChangeOrdersTab(
                        changeOrders = state.overview?.changeOrders ?: emptyList(),
                        loading = state.loading,
                        currencyFormatter = currencyFormatter,
                        onOpenChangeOrder = onOpenChangeOrder
                    )
                }
            }
        }
    }
}

@Composable
private fun OverviewTab(
    overview: FinancialOverview?,
    loading: Boolean,
    currencyFormatter: NumberFormat
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(
            horizontal = responsiveValue(AppSpacing.md, AppSpacing.xl, AppSpacing.xxl),
            vertical = AppSpacing.md
        ),
        verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
    ) {
        if (loading && overview == null) {
            item { CPLoadingIndicator(message = stringResource(R.string.financials_loading)) }
            return@LazyColumn
        }

        overview?.let { data ->
            // Summary Cards
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
                ) {
                    SummaryCard(
                        title = stringResource(R.string.financials_total_budget),
                        value = currencyFormatter.format(data.totalBudget),
                        icon = Icons.Default.AccountBalance,
                        color = Primary600,
                        modifier = Modifier.weight(1f)
                    )
                    SummaryCard(
                        title = stringResource(R.string.financials_total_spent),
                        value = currencyFormatter.format(data.totalSpent),
                        icon = Icons.Default.TrendingDown,
                        color = ConstructionOrange,
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
                ) {
                    SummaryCard(
                        title = "Revenue",
                        value = currencyFormatter.format(data.totalInvoiced),
                        icon = Icons.Default.TrendingUp,
                        color = ConstructionGreen,
                        modifier = Modifier.weight(1f)
                    )
                    SummaryCard(
                        title = "Pending",
                        value = currencyFormatter.format(data.pendingPayments),
                        icon = Icons.Default.HourglassEmpty,
                        color = AppColors.textSecondary,
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            // Budget Progress
            if (data.budgets.isNotEmpty()) {
                item {
                    Text(
                        text = stringResource(R.string.financials_budgets),
                        style = AppTypography.heading3,
                        modifier = Modifier.padding(top = AppSpacing.xs)
                    )
                }

                items(data.budgets.take(5)) { budget ->
                    BudgetProgressCard(budget = budget, currencyFormatter = currencyFormatter)
                }
            }
        }
    }
}

@Composable
private fun SummaryCard(
    title: String,
    value: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    color: androidx.compose.ui.graphics.Color,
    modifier: Modifier = Modifier
) {
    CPCard(modifier = modifier) {
        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(AppSpacing.xs))
                Text(
                    text = title,
                    style = AppTypography.secondary,
                    color = AppColors.textSecondary
                )
            }
            Text(
                text = value,
                style = AppTypography.heading2,
                color = color,
                modifier = Modifier.padding(top = AppSpacing.xxs)
            )
        }
    }
}

@Composable
private fun BudgetProgressCard(
    budget: Budget,
    currencyFormatter: NumberFormat
) {
    val progress = if (budget.amount > 0) {
        (budget.spent / budget.amount).toFloat().coerceIn(0f, 1f)
    } else 0f
    val isOverBudget = budget.spent > budget.amount

    CPCard {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = budget.project?.name ?: "Project Budget",
                        style = AppTypography.bodySemibold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = budget.category ?: "General",
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = currencyFormatter.format(budget.spent),
                        style = AppTypography.bodySemibold,
                        color = if (isOverBudget) ConstructionRed else AppColors.textPrimary
                    )
                    Text(
                        text = "of ${currencyFormatter.format(budget.amount)}",
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                }
            }

            Spacer(modifier = Modifier.height(AppSpacing.xs))

            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(RoundedCornerShape(4.dp)),
                color = when {
                    isOverBudget -> ConstructionRed
                    progress > 0.8f -> ConstructionOrange
                    else -> ConstructionGreen
                },
                trackColor = AppColors.divider
            )

            Text(
                text = "${(progress * 100).toInt()}% used",
                style = AppTypography.caption,
                color = AppColors.textSecondary,
                modifier = Modifier.padding(top = AppSpacing.xxs)
            )
        }
    }
}

@Composable
private fun InvoicesTab(
    invoices: List<Invoice>,
    loading: Boolean,
    currencyFormatter: NumberFormat,
    onOpenInvoice: (String) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(
            horizontal = responsiveValue(AppSpacing.md, AppSpacing.xl, AppSpacing.xxl),
            vertical = AppSpacing.md
        ),
        verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
    ) {
        if (loading && invoices.isEmpty()) {
            item { CPLoadingIndicator(message = stringResource(R.string.financials_loading)) }
            return@LazyColumn
        }

        items(invoices) { invoice ->
            InvoiceCard(
                invoice = invoice,
                currencyFormatter = currencyFormatter,
                onClick = { onOpenInvoice(invoice.id) }
            )
        }

        if (!loading && invoices.isEmpty()) {
            item {
                CPEmptyState(
                    icon = Icons.Default.Receipt,
                    title = stringResource(R.string.financials_empty_title),
                    description = stringResource(R.string.financials_empty_desc)
                )
            }
        }
    }
}

@Composable
private fun InvoiceCard(
    invoice: Invoice,
    currencyFormatter: NumberFormat,
    onClick: () -> Unit
) {
    CPCard(onClick = onClick) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(getInvoiceStatusColor(invoice.status).copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Receipt,
                    contentDescription = null,
                    tint = getInvoiceStatusColor(invoice.status),
                    modifier = Modifier.size(AppSpacing.xl)
                )
            }

            Spacer(modifier = Modifier.width(AppSpacing.md))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = invoice.invoiceNumber ?: "Invoice",
                    style = AppTypography.heading3
                )
                invoice.project?.name?.let { project ->
                    Text(
                        text = project,
                        style = AppTypography.body,
                        color = AppColors.textSecondary
                    )
                }
                invoice.dueDate?.let { dueDate ->
                    Text(
                        text = "Due: ${dueDate.take(10)}",
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = currencyFormatter.format(invoice.amount),
                    style = AppTypography.heading3,
                    color = Primary700
                )
                CPBadge(
                    text = invoice.status.replace("_", " "),
                    color = getInvoiceStatusColor(invoice.status),
                    backgroundColor = getInvoiceStatusColor(invoice.status).copy(alpha = 0.1f)
                )
            }
        }
    }
}

@Composable
private fun ExpensesTab(
    expenses: List<Expense>,
    loading: Boolean,
    currencyFormatter: NumberFormat,
    onOpenExpense: (String) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(
            horizontal = responsiveValue(AppSpacing.md, AppSpacing.xl, AppSpacing.xxl),
            vertical = AppSpacing.md
        ),
        verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
    ) {
        if (loading && expenses.isEmpty()) {
            item { CPLoadingIndicator(message = stringResource(R.string.financials_loading)) }
            return@LazyColumn
        }

        items(expenses) { expense ->
            ExpenseCard(
                expense = expense,
                currencyFormatter = currencyFormatter,
                onClick = { onOpenExpense(expense.id) }
            )
        }

        if (!loading && expenses.isEmpty()) {
            item {
                CPEmptyState(
                    icon = Icons.Default.CreditCard,
                    title = stringResource(R.string.financials_empty_title),
                    description = stringResource(R.string.financials_empty_desc)
                )
            }
        }
    }
}

@Composable
private fun ExpenseCard(
    expense: Expense,
    currencyFormatter: NumberFormat,
    onClick: () -> Unit
) {
    CPCard(onClick = onClick) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(getExpenseCategoryColor(expense.category).copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = getExpenseCategoryIcon(expense.category),
                    contentDescription = null,
                    tint = getExpenseCategoryColor(expense.category),
                    modifier = Modifier.size(AppSpacing.xl)
                )
            }

            Spacer(modifier = Modifier.width(AppSpacing.md))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = expense.description ?: "Expense",
                    style = AppTypography.heading3,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                expense.category?.let { category ->
                    CPBadge(
                        text = category.replace("_", " "),
                        color = AppColors.textSecondary,
                        backgroundColor = AppColors.gray100
                    )
                }
                Text(
                    text = expense.expenseDate.take(10),
                    style = AppTypography.secondary,
                    color = AppColors.textSecondary
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = currencyFormatter.format(expense.amount),
                    style = AppTypography.heading3,
                    color = ConstructionRed
                )
                CPBadge(
                    text = expense.status,
                    color = getExpenseStatusColor(expense.status),
                    backgroundColor = getExpenseStatusColor(expense.status).copy(alpha = 0.1f)
                )
            }
        }
    }
}

@Composable
private fun ChangeOrdersTab(
    changeOrders: List<ChangeOrder>,
    loading: Boolean,
    currencyFormatter: NumberFormat,
    onOpenChangeOrder: (String) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(
            horizontal = responsiveValue(AppSpacing.md, AppSpacing.xl, AppSpacing.xxl),
            vertical = AppSpacing.md
        ),
        verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
    ) {
        if (loading && changeOrders.isEmpty()) {
            item { CPLoadingIndicator(message = stringResource(R.string.financials_loading)) }
            return@LazyColumn
        }

        items(changeOrders) { changeOrder ->
            ChangeOrderCard(
                changeOrder = changeOrder,
                currencyFormatter = currencyFormatter,
                onClick = { onOpenChangeOrder(changeOrder.id) }
            )
        }

        if (!loading && changeOrders.isEmpty()) {
            item {
                CPEmptyState(
                    icon = Icons.Default.SwapHoriz,
                    title = stringResource(R.string.financials_empty_title),
                    description = stringResource(R.string.financials_empty_desc)
                )
            }
        }
    }
}

@Composable
private fun ChangeOrderCard(
    changeOrder: ChangeOrder,
    currencyFormatter: NumberFormat,
    onClick: () -> Unit
) {
    val isAddition = changeOrder.amount >= 0

    CPCard(onClick = onClick) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(
                        (if (isAddition) ConstructionGreen else ConstructionRed).copy(alpha = 0.1f)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = if (isAddition) Icons.Default.Add else Icons.Default.Remove,
                    contentDescription = null,
                    tint = if (isAddition) ConstructionGreen else ConstructionRed,
                    modifier = Modifier.size(AppSpacing.xl)
                )
            }

            Spacer(modifier = Modifier.width(AppSpacing.md))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = changeOrder.title,
                    style = AppTypography.heading3,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                changeOrder.project?.name?.let { project ->
                    Text(
                        text = project,
                        style = AppTypography.body,
                        color = AppColors.textSecondary
                    )
                }
                changeOrder.reason?.let { reason ->
                    Text(
                        text = reason,
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "${if (isAddition) "+" else ""}${currencyFormatter.format(changeOrder.amount)}",
                    style = AppTypography.heading3,
                    color = if (isAddition) ConstructionGreen else ConstructionRed
                )
                CPBadge(
                    text = changeOrder.status.replace("_", " "),
                    color = getChangeOrderStatusColor(changeOrder.status),
                    backgroundColor = getChangeOrderStatusColor(changeOrder.status).copy(alpha = 0.1f)
                )
            }
        }
    }
}

// Helper functions
private fun getInvoiceStatusColor(status: String): androidx.compose.ui.graphics.Color {
    return when (status.uppercase()) {
        "PAID" -> ConstructionGreen
        "SENT", "PENDING" -> Primary600
        "OVERDUE" -> ConstructionRed
        "DRAFT" -> androidx.compose.ui.graphics.Color(0xFF6B7280) // Gray
        else -> androidx.compose.ui.graphics.Color(0xFF6B7280) // Gray fallback
    }
}

private fun getExpenseStatusColor(status: String): androidx.compose.ui.graphics.Color {
    return when (status.uppercase()) {
        "APPROVED" -> ConstructionGreen
        "PENDING" -> ConstructionOrange
        "REJECTED" -> ConstructionRed
        else -> androidx.compose.ui.graphics.Color(0xFF6B7280) // Gray fallback
    }
}

private fun getExpenseCategoryIcon(category: String?): androidx.compose.ui.graphics.vector.ImageVector {
    return when (category?.uppercase()) {
        "MATERIALS" -> Icons.Default.Inventory2
        "LABOR" -> Icons.Default.Engineering
        "EQUIPMENT" -> Icons.Default.Construction
        "TRAVEL" -> Icons.Default.DirectionsCar
        "SUPPLIES" -> Icons.Default.ShoppingCart
        else -> Icons.Default.CreditCard
    }
}

private fun getExpenseCategoryColor(category: String?): androidx.compose.ui.graphics.Color {
    return when (category?.uppercase()) {
        "MATERIALS" -> Primary600
        "LABOR" -> ConstructionOrange
        "EQUIPMENT" -> androidx.compose.ui.graphics.Color(0xFF7C3AED)
        "TRAVEL" -> ConstructionGreen
        else -> androidx.compose.ui.graphics.Color(0xFF6B7280) // Gray fallback
    }
}

private fun getChangeOrderStatusColor(status: String): androidx.compose.ui.graphics.Color {
    return when (status.uppercase()) {
        "APPROVED" -> ConstructionGreen
        "PENDING", "SUBMITTED" -> ConstructionOrange
        "REJECTED" -> ConstructionRed
        else -> androidx.compose.ui.graphics.Color(0xFF6B7280) // Gray fallback
    }
}
