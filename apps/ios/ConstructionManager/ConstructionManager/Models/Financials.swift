//
//  Financials.swift
//  ConstructionManager
//
//  Financial models: Invoice, Expense, ChangeOrder, Budget
//

import Foundation

// MARK: - Invoice Status
enum InvoiceStatus: String, Codable, CaseIterable {
    case draft = "DRAFT"
    case pending = "PENDING"
    case approved = "APPROVED"
    case paid = "PAID"
    case overdue = "OVERDUE"
    case cancelled = "CANCELLED"

    var displayName: String {
        switch self {
        case .draft: return "Draft"
        case .pending: return "Pending"
        case .approved: return "Approved"
        case .paid: return "Paid"
        case .overdue: return "Overdue"
        case .cancelled: return "Cancelled"
        }
    }

    var color: String {
        switch self {
        case .draft: return "gray"
        case .pending: return "warning"
        case .approved: return "info"
        case .paid: return "success"
        case .overdue: return "error"
        case .cancelled: return "gray"
        }
    }
}

// MARK: - Invoice Line Item
struct InvoiceLineItem: Identifiable, Codable {
    let id: String
    let description: String
    let quantity: Double
    let unitPrice: Double
    let amount: Double
    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase
}

// MARK: - Invoice
struct Invoice: Identifiable, Codable {
    let id: String
    let projectId: String
    let projectName: String?
    let invoiceNumber: String
    let vendorId: String?
    let vendorName: String?
    let description: String?
    let lineItems: [InvoiceLineItem]?
    let subtotal: Double
    let tax: Double?
    let total: Double
    let status: InvoiceStatus
    let issueDate: Date
    let dueDate: Date?
    let paidDate: Date?
    let paidAmount: Double?
    let attachments: [String]?
    let notes: String?
    let approvedBy: String?
    let approvedAt: Date?
    let createdAt: Date
    let updatedAt: Date

    // Computed properties
    var isOverdue: Bool {
        guard let dueDate = dueDate, status != .paid && status != .cancelled else { return false }
        return dueDate < Date()
    }

    var remainingAmount: Double {
        total - (paidAmount ?? 0)
    }

    var formattedTotal: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        return formatter.string(from: NSNumber(value: total)) ?? "$\(total)"
    }

    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase

    // MARK: - Mock Data
    static let mockInvoices: [Invoice] = [
        Invoice(
            id: "inv-1",
            projectId: "proj-1",
            projectName: "Downtown Office Complex",
            invoiceNumber: "INV-2024-001",
            vendorId: "sub-1",
            vendorName: "ABC Electrical",
            description: "Electrical rough-in - Phase 1",
            lineItems: [
                InvoiceLineItem(id: "li-1", description: "Labor - Electrician", quantity: 80, unitPrice: 75, amount: 6000),
                InvoiceLineItem(id: "li-2", description: "Materials", quantity: 1, unitPrice: 2500, amount: 2500)
            ],
            subtotal: 8500,
            tax: 680,
            total: 9180,
            status: .pending,
            issueDate: Date(),
            dueDate: Calendar.current.date(byAdding: .day, value: 30, to: Date()),
            paidDate: nil,
            paidAmount: nil,
            attachments: nil,
            notes: nil,
            approvedBy: nil,
            approvedAt: nil,
            createdAt: Date(),
            updatedAt: Date()
        )
    ]
}

// MARK: - Expense Category
enum ExpenseCategory: String, Codable, CaseIterable {
    case materials = "MATERIALS"
    case equipment = "EQUIPMENT"
    case labor = "LABOR"
    case travel = "TRAVEL"
    case meals = "MEALS"
    case supplies = "SUPPLIES"
    case permits = "PERMITS"
    case other = "OTHER"

    var displayName: String {
        switch self {
        case .materials: return "Materials"
        case .equipment: return "Equipment"
        case .labor: return "Labor"
        case .travel: return "Travel"
        case .meals: return "Meals"
        case .supplies: return "Supplies"
        case .permits: return "Permits"
        case .other: return "Other"
        }
    }

    var icon: String {
        switch self {
        case .materials: return "shippingbox.fill"
        case .equipment: return "wrench.and.screwdriver.fill"
        case .labor: return "person.2.fill"
        case .travel: return "car.fill"
        case .meals: return "fork.knife"
        case .supplies: return "bag.fill"
        case .permits: return "doc.text.fill"
        case .other: return "ellipsis.circle.fill"
        }
    }
}

// MARK: - Expense Status
enum ExpenseStatus: String, Codable, CaseIterable {
    case pending = "PENDING"
    case approved = "APPROVED"
    case rejected = "REJECTED"
    case reimbursed = "REIMBURSED"

    var displayName: String {
        switch self {
        case .pending: return "Pending"
        case .approved: return "Approved"
        case .rejected: return "Rejected"
        case .reimbursed: return "Reimbursed"
        }
    }

    var color: String {
        switch self {
        case .pending: return "warning"
        case .approved: return "info"
        case .rejected: return "error"
        case .reimbursed: return "success"
        }
    }
}

// MARK: - Expense
struct Expense: Identifiable, Codable {
    let id: String
    let projectId: String?
    let projectName: String?
    let userId: String
    let userName: String?
    let category: ExpenseCategory
    let description: String
    let amount: Double
    let date: Date
    let status: ExpenseStatus
    let receiptUrl: String?
    let notes: String?
    let approvedBy: String?
    let approvedAt: Date?
    let reimbursedAt: Date?
    let createdAt: Date
    let updatedAt: Date

    var formattedAmount: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        return formatter.string(from: NSNumber(value: amount)) ?? "$\(amount)"
    }

    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase

    // MARK: - Mock Data
    static let mockExpenses: [Expense] = [
        Expense(
            id: "exp-1",
            projectId: "proj-1",
            projectName: "Downtown Office Complex",
            userId: "user-1",
            userName: "John Smith",
            category: .materials,
            description: "Emergency lumber purchase",
            amount: 450.00,
            date: Date(),
            status: .pending,
            receiptUrl: nil,
            notes: "Needed for framing repair",
            approvedBy: nil,
            approvedAt: nil,
            reimbursedAt: nil,
            createdAt: Date(),
            updatedAt: Date()
        )
    ]
}

// MARK: - Change Order Status
enum ChangeOrderStatus: String, Codable, CaseIterable {
    case draft = "DRAFT"
    case submitted = "SUBMITTED"
    case underReview = "UNDER_REVIEW"
    case approved = "APPROVED"
    case rejected = "REJECTED"
    case executed = "EXECUTED"

    var displayName: String {
        switch self {
        case .draft: return "Draft"
        case .submitted: return "Submitted"
        case .underReview: return "Under Review"
        case .approved: return "Approved"
        case .rejected: return "Rejected"
        case .executed: return "Executed"
        }
    }

    var color: String {
        switch self {
        case .draft: return "gray"
        case .submitted: return "info"
        case .underReview: return "warning"
        case .approved: return "success"
        case .rejected: return "error"
        case .executed: return "success"
        }
    }
}

// MARK: - Change Order
struct ChangeOrder: Identifiable, Codable {
    let id: String
    let projectId: String
    let projectName: String?
    let changeOrderNumber: String
    let title: String
    let description: String?
    let reason: String?
    let costImpact: Double
    let scheduleImpact: Int? // days
    let status: ChangeOrderStatus
    let requestedBy: String?
    let requestedByName: String?
    let approvedBy: String?
    let approvedByName: String?
    let approvedAt: Date?
    let attachments: [String]?
    let createdAt: Date
    let updatedAt: Date

    var formattedCostImpact: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        let prefix = costImpact >= 0 ? "+" : ""
        return prefix + (formatter.string(from: NSNumber(value: costImpact)) ?? "$\(costImpact)")
    }

    var formattedScheduleImpact: String? {
        guard let days = scheduleImpact else { return nil }
        let prefix = days >= 0 ? "+" : ""
        return "\(prefix)\(days) days"
    }

    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase

    // MARK: - Mock Data
    static let mockChangeOrders: [ChangeOrder] = [
        ChangeOrder(
            id: "co-1",
            projectId: "proj-1",
            projectName: "Downtown Office Complex",
            changeOrderNumber: "CO-001",
            title: "Additional electrical outlets in conference rooms",
            description: "Client requested 4 additional floor outlets in each conference room on floors 2-4",
            reason: "Client request",
            costImpact: 12500,
            scheduleImpact: 3,
            status: .approved,
            requestedBy: "user-client",
            requestedByName: "Client Representative",
            approvedBy: "user-pm",
            approvedByName: "Project Manager",
            approvedAt: Calendar.current.date(byAdding: .day, value: -5, to: Date()),
            attachments: nil,
            createdAt: Date(),
            updatedAt: Date()
        )
    ]
}

// MARK: - Budget Category
enum BudgetCategory: String, Codable, CaseIterable {
    case labor = "LABOR"
    case materials = "MATERIALS"
    case equipment = "EQUIPMENT"
    case subcontractor = "SUBCONTRACTOR"
    case overhead = "OVERHEAD"
    case contingency = "CONTINGENCY"
    case other = "OTHER"

    var displayName: String {
        switch self {
        case .labor: return "Labor"
        case .materials: return "Materials"
        case .equipment: return "Equipment"
        case .subcontractor: return "Subcontractor"
        case .overhead: return "Overhead"
        case .contingency: return "Contingency"
        case .other: return "Other"
        }
    }
}

// MARK: - Budget Line
struct BudgetLine: Identifiable, Codable {
    let id: String
    let category: BudgetCategory
    let description: String?
    let budgeted: Double
    let actual: Double
    let committed: Double

    var variance: Double {
        budgeted - actual - committed
    }

    var percentUsed: Double {
        guard budgeted > 0 else { return 0 }
        return ((actual + committed) / budgeted) * 100
    }
    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase
}

// MARK: - Project Budget
struct ProjectBudget: Identifiable, Codable {
    let id: String
    let projectId: String
    let projectName: String?
    let totalBudget: Double
    let totalActual: Double
    let totalCommitted: Double
    let lines: [BudgetLine]?
    let lastUpdated: Date

    var totalVariance: Double {
        totalBudget - totalActual - totalCommitted
    }

    var percentUsed: Double {
        guard totalBudget > 0 else { return 0 }
        return ((totalActual + totalCommitted) / totalBudget) * 100
    }

    var formattedBudget: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: totalBudget)) ?? "$\(Int(totalBudget))"
    }
    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase
}

// MARK: - Mock Budget Data
extension ProjectBudget {
    static let mockBudget = ProjectBudget(
        id: "budget-1",
        projectId: "project-1",
        projectName: "Current Project",
        totalBudget: 2500000,
        totalActual: 1850000,
        totalCommitted: 350000,
        lines: [
            BudgetLine(
                id: "line-1",
                category: .labor,
                description: "General labor and subcontractors",
                budgeted: 1000000,
                actual: 780000,
                committed: 150000
            ),
            BudgetLine(
                id: "line-2",
                category: .materials,
                description: "Construction materials and supplies",
                budgeted: 800000,
                actual: 620000,
                committed: 100000
            ),
            BudgetLine(
                id: "line-3",
                category: .equipment,
                description: "Equipment rental and purchases",
                budgeted: 400000,
                actual: 280000,
                committed: 50000
            ),
            BudgetLine(
                id: "line-4",
                category: .overhead,
                description: "Permits, inspections, and fees",
                budgeted: 150000,
                actual: 120000,
                committed: 30000
            ),
            BudgetLine(
                id: "line-5",
                category: .contingency,
                description: "Project contingency fund",
                budgeted: 150000,
                actual: 50000,
                committed: 20000
            )
        ],
        lastUpdated: Date()
    )
}
