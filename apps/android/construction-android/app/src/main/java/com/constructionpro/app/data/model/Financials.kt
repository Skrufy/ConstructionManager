package com.constructionpro.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class FinancialOverview(
    val totalBudget: Double = 0.0,
    val totalSpent: Double = 0.0,
    val totalInvoiced: Double = 0.0,
    val totalPaid: Double = 0.0,
    val pendingPayments: Double = 0.0,
    val budgets: List<Budget> = emptyList(),
    val invoices: List<Invoice> = emptyList(),
    val expenses: List<Expense> = emptyList(),
    val changeOrders: List<ChangeOrder> = emptyList()
)

@Serializable
data class Budget(
    val id: String,
    val projectId: String,
    val project: ProjectSummary? = null,
    val category: String, // LABOR, MATERIALS, EQUIPMENT, SUBCONTRACTOR, OTHER
    val amount: Double,
    val spent: Double = 0.0,
    val remaining: Double = 0.0,
    val notes: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null
)

@Serializable
data class Invoice(
    val id: String,
    val projectId: String,
    val project: ProjectSummary? = null,
    val invoiceNumber: String? = null,
    val vendorName: String? = null,
    val amount: Double,
    val status: String = "PENDING", // PENDING, APPROVED, PAID, REJECTED
    val dueDate: String? = null,
    val paidDate: String? = null,
    val description: String? = null,
    val attachmentUrl: String? = null,
    val approvedById: String? = null,
    val approvedBy: UserSummary? = null,
    val createdAt: String? = null
)

@Serializable
data class Expense(
    val id: String,
    val projectId: String,
    val project: ProjectSummary? = null,
    val category: String, // LABOR, MATERIALS, EQUIPMENT, TRAVEL, OTHER
    val amount: Double,
    val description: String,
    val receiptUrl: String? = null,
    val status: String = "PENDING", // PENDING, APPROVED, REJECTED, REIMBURSED
    val submittedById: String,
    val submittedBy: UserSummary? = null,
    val approvedById: String? = null,
    val approvedBy: UserSummary? = null,
    val expenseDate: String,
    val createdAt: String? = null
)

@Serializable
data class ChangeOrder(
    val id: String,
    val projectId: String,
    val project: ProjectSummary? = null,
    val title: String,
    val description: String,
    val reason: String? = null,
    val amount: Double,
    val status: String = "PENDING", // PENDING, APPROVED, REJECTED
    val impact: String? = null, // Schedule/budget impact description
    val requestedById: String,
    val requestedBy: UserSummary? = null,
    val approvedById: String? = null,
    val approvedBy: UserSummary? = null,
    val approvedAt: String? = null,
    val createdAt: String? = null
)

@Serializable
data class CreateBudgetRequest(
    val projectId: String,
    val category: String,
    val amount: Double,
    val notes: String? = null
)

@Serializable
data class CreateInvoiceRequest(
    val projectId: String,
    val invoiceNumber: String? = null,
    val vendorName: String? = null,
    val amount: Double,
    val dueDate: String? = null,
    val description: String? = null
)

@Serializable
data class CreateExpenseRequest(
    val projectId: String,
    val category: String,
    val amount: Double,
    val description: String,
    val expenseDate: String
)

@Serializable
data class CreateChangeOrderRequest(
    val projectId: String,
    val title: String,
    val description: String,
    val reason: String? = null,
    val amount: Double,
    val impact: String? = null
)
