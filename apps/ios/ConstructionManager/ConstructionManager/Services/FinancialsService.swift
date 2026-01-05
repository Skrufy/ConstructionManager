//
//  FinancialsService.swift
//  ConstructionManager
//
//  Service for managing invoices, expenses, change orders, and budgets
//

import Foundation
import Combine

@MainActor
class FinancialsService: ObservableObject {
    static let shared = FinancialsService()

    @Published var invoices: [Invoice] = []
    @Published var expenses: [Expense] = []
    @Published var changeOrders: [ChangeOrder] = []
    @Published var budgets: [ProjectBudget] = []
    @Published var isLoading = false
    @Published var error: String?

    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Invoices

    func fetchInvoices(projectId: String? = nil, status: InvoiceStatus? = nil) async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            var endpoint = "/financials/invoices"
            var params: [String] = []

            if let projectId = projectId {
                params.append("project_id=\(projectId)")
            }
            if let status = status {
                params.append("status=\(status.rawValue)")
            }

            if !params.isEmpty {
                endpoint += "?" + params.joined(separator: "&")
            }

            invoices = try await apiClient.get(endpoint)
        } catch {
            print("Failed to fetch invoices: \(error)")
            self.error = error.localizedDescription
            invoices = Invoice.mockInvoices
        }
    }

    func approveInvoice(id: String) async -> Bool {
        do {
            let body = ["status": InvoiceStatus.approved.rawValue]
            let _: Invoice = try await apiClient.patch("/financials/invoices/\(id)", body: body)
            await fetchInvoices()
            return true
        } catch {
            print("Failed to approve invoice: \(error)")
            return false
        }
    }

    func markInvoicePaid(id: String, amount: Double) async -> Bool {
        do {
            let body = MarkInvoicePaidRequest(
                status: InvoiceStatus.paid.rawValue,
                paidAmount: amount,
                paidDate: ISO8601DateFormatter().string(from: Date())
            )
            let _: Invoice = try await apiClient.patch("/financials/invoices/\(id)", body: body)
            await fetchInvoices()
            return true
        } catch {
            print("Failed to mark invoice paid: \(error)")
            return false
        }
    }

    // MARK: - Expenses

    func fetchExpenses(projectId: String? = nil, userId: String? = nil, status: ExpenseStatus? = nil) async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            var endpoint = "/financials/expenses"
            var params: [String] = []

            if let projectId = projectId {
                params.append("project_id=\(projectId)")
            }
            if let userId = userId {
                params.append("user_id=\(userId)")
            }
            if let status = status {
                params.append("status=\(status.rawValue)")
            }

            if !params.isEmpty {
                endpoint += "?" + params.joined(separator: "&")
            }

            expenses = try await apiClient.get(endpoint)
        } catch {
            print("Failed to fetch expenses: \(error)")
            self.error = error.localizedDescription
            expenses = Expense.mockExpenses
        }
    }

    func createExpense(_ expense: Expense) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let _: Expense = try await apiClient.post("/financials/expenses", body: expense)
            await fetchExpenses()
            return true
        } catch {
            print("Failed to create expense: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }

    func approveExpense(id: String) async -> Bool {
        do {
            let body = ["status": ExpenseStatus.approved.rawValue]
            let _: Expense = try await apiClient.patch("/financials/expenses/\(id)", body: body)
            await fetchExpenses()
            return true
        } catch {
            print("Failed to approve expense: \(error)")
            return false
        }
    }

    func rejectExpense(id: String) async -> Bool {
        do {
            let body = ["status": ExpenseStatus.rejected.rawValue]
            let _: Expense = try await apiClient.patch("/financials/expenses/\(id)", body: body)
            await fetchExpenses()
            return true
        } catch {
            print("Failed to reject expense: \(error)")
            return false
        }
    }

    // MARK: - Change Orders

    func fetchChangeOrders(projectId: String? = nil, status: ChangeOrderStatus? = nil) async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            var endpoint = "/financials/change-orders"
            var params: [String] = []

            if let projectId = projectId {
                params.append("project_id=\(projectId)")
            }
            if let status = status {
                params.append("status=\(status.rawValue)")
            }

            if !params.isEmpty {
                endpoint += "?" + params.joined(separator: "&")
            }

            changeOrders = try await apiClient.get(endpoint)
        } catch {
            print("Failed to fetch change orders: \(error)")
            self.error = error.localizedDescription
            changeOrders = ChangeOrder.mockChangeOrders
        }
    }

    func createChangeOrder(_ changeOrder: ChangeOrder) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let _: ChangeOrder = try await apiClient.post("/financials/change-orders", body: changeOrder)
            await fetchChangeOrders()
            return true
        } catch {
            print("Failed to create change order: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }

    func approveChangeOrder(id: String) async -> Bool {
        do {
            let body = ["status": ChangeOrderStatus.approved.rawValue]
            let _: ChangeOrder = try await apiClient.patch("/financials/change-orders/\(id)", body: body)
            await fetchChangeOrders()
            return true
        } catch {
            print("Failed to approve change order: \(error)")
            return false
        }
    }

    // MARK: - Budgets

    func fetchBudget(projectId: String) async -> ProjectBudget? {
        do {
            let budget: ProjectBudget = try await apiClient.get("/financials/budgets/\(projectId)")
            return budget
        } catch {
            print("Failed to fetch budget: \(error)")
            // Return mock data as fallback
            return ProjectBudget.mockBudget
        }
    }

    // MARK: - Statistics

    var pendingInvoicesTotal: Double {
        invoices.filter { $0.status == .pending }.reduce(0) { $0 + $1.total }
    }

    var overdueInvoicesTotal: Double {
        invoices.filter { $0.isOverdue }.reduce(0) { $0 + $1.total }
    }

    var pendingExpensesTotal: Double {
        expenses.filter { $0.status == .pending }.reduce(0) { $0 + $1.amount }
    }

    var pendingChangeOrdersValue: Double {
        changeOrders.filter { $0.status == .submitted || $0.status == .underReview }.reduce(0) { $0 + $1.costImpact }
    }
}

// MARK: - Request Models
private struct MarkInvoicePaidRequest: Encodable {
    let status: String
    let paidAmount: Double
    let paidDate: String

    enum CodingKeys: String, CodingKey {
        case status
        case paidAmount = "paid_amount"
        case paidDate = "paid_date"
    }
}
