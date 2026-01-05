//
//  FinancialsView.swift
//  ConstructionManager
//
//  Financials hub - Invoices, Expenses, Change Orders, Budgets
//

import SwiftUI

struct FinancialsView: View {
    @StateObject private var financialsService = FinancialsService.shared
    @EnvironmentObject var appState: AppState
    @State private var selectedTab: FinancialsTab = .invoices
    @State private var showNewExpenseForm = false
    @State private var showBudgetOverview = false
    @State private var selectedBudget: ProjectBudget?

    private var canViewFinancials: Bool {
        appState.hasPermission(.viewFinancials)
    }

    private var canManageFinancials: Bool {
        appState.hasPermission(.manageFinancials)
    }

    enum FinancialsTab: String, CaseIterable {
        case invoices
        case expenses
        case changeOrders

        var displayName: String {
            switch self {
            case .invoices: return "financials.invoices".localized
            case .expenses: return "financials.expenses".localized
            case .changeOrders: return "financials.changeOrders".localized
            }
        }

        var icon: String {
            switch self {
            case .invoices: return "doc.text.fill"
            case .expenses: return "creditcard.fill"
            case .changeOrders: return "arrow.triangle.2.circlepath"
            }
        }
    }

    var body: some View {
        Group {
            if canViewFinancials {
                VStack(spacing: 0) {
                    // Summary cards
                    summaryCards

                    // Tab selector
                    tabSelector

                    // Content
                    TabView(selection: $selectedTab) {
                        InvoicesListView()
                            .tag(FinancialsTab.invoices)

                        ExpensesListView(showNewExpenseForm: $showNewExpenseForm)
                            .tag(FinancialsTab.expenses)

                        ChangeOrdersListView()
                            .tag(FinancialsTab.changeOrders)
                    }
                    .tabViewStyle(.page(indexDisplayMode: .never))
                }
                .task {
                    await financialsService.fetchInvoices()
                    await financialsService.fetchExpenses()
                    await financialsService.fetchChangeOrders()
                }
                .toolbar {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Menu {
                            if selectedTab == .expenses && canManageFinancials {
                                Button {
                                    showNewExpenseForm = true
                                } label: {
                                    Label("financials.newExpense".localized, systemImage: "plus.circle")
                                }
                            }

                            Button {
                                Task {
                                    if let budget = await financialsService.fetchBudget(projectId: "current") {
                                        selectedBudget = budget
                                        showBudgetOverview = true
                                    }
                                }
                            } label: {
                                Label("financials.viewBudget".localized, systemImage: "chart.pie")
                            }
                        } label: {
                            Image(systemName: "ellipsis.circle")
                                .font(.system(size: 18))
                                .foregroundColor(AppColors.primary600)
                        }
                    }
                }
            } else {
                VStack(spacing: AppSpacing.md) {
                    Spacer()
                    Image(systemName: "lock.shield")
                        .font(.system(size: 48))
                        .foregroundColor(AppColors.gray400)
                    Text("financials.accessRestricted".localized)
                        .font(AppTypography.heading3)
                        .foregroundColor(AppColors.textPrimary)
                    Text("financials.noPermission".localized)
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                        .multilineTextAlignment(.center)
                    Spacer()
                }
                .padding(AppSpacing.xl)
            }
        }
        .background(AppColors.background)
        .navigationTitle("financials.title".localized)
        .sheet(isPresented: $showNewExpenseForm) {
            ExpenseFormView()
                .environmentObject(appState)
        }
        .sheet(item: $selectedBudget) { budget in
            BudgetOverviewView(budget: budget)
        }
    }

    private var summaryCards: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: AppSpacing.sm) {
                FinancialSummaryCard(
                    title: "financials.pendingInvoices".localized,
                    amount: financialsService.pendingInvoicesTotal,
                    icon: "doc.text",
                    color: AppColors.warning
                )
                FinancialSummaryCard(
                    title: "financials.overdue".localized,
                    amount: financialsService.overdueInvoicesTotal,
                    icon: "exclamationmark.circle",
                    color: AppColors.error
                )
                FinancialSummaryCard(
                    title: "financials.pendingExpenses".localized,
                    amount: financialsService.pendingExpensesTotal,
                    icon: "creditcard",
                    color: AppColors.info
                )
                FinancialSummaryCard(
                    title: "financials.changeOrders".localized,
                    amount: financialsService.pendingChangeOrdersValue,
                    icon: "arrow.triangle.2.circlepath",
                    color: AppColors.purple
                )
            }
            .padding(.horizontal, AppSpacing.md)
            .padding(.vertical, AppSpacing.sm)
        }
    }

    private var tabSelector: some View {
        HStack(spacing: 0) {
            ForEach(FinancialsTab.allCases, id: \.self) { tab in
                Button {
                    withAnimation { selectedTab = tab }
                } label: {
                    VStack(spacing: AppSpacing.xs) {
                        Image(systemName: tab.icon)
                            .font(.system(size: 16))
                        Text(tab.displayName)
                            .font(AppTypography.caption)
                    }
                    .foregroundColor(selectedTab == tab ? AppColors.primary600 : AppColors.textSecondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, AppSpacing.sm)
                    .background(selectedTab == tab ? AppColors.primary100 : Color.clear)
                }
            }
        }
        .background(AppColors.cardBackground)
    }
}


// MARK: - Financial Summary Card
struct FinancialSummaryCard: View {
    let title: String
    let amount: Double
    let icon: String
    let color: Color

    private var formattedAmount: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: amount)) ?? "$0"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.xs) {
            HStack {
                Image(systemName: icon)
                    .font(.system(size: 14))
                    .foregroundColor(color)
                Spacer()
            }
            Text(formattedAmount)
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)
            Text(title)
                .font(AppTypography.caption)
                .foregroundColor(AppColors.textSecondary)
        }
        .padding(AppSpacing.sm)
        .frame(width: 140)
        .background(AppColors.cardBackground)
        .cornerRadius(AppSpacing.radiusMedium)
        .shadow(color: Color.black.opacity(0.05), radius: 2, y: 1)
    }
}

// MARK: - Invoices List View
struct InvoicesListView: View {
    @StateObject private var financialsService = FinancialsService.shared
    @EnvironmentObject var appState: AppState
    @State private var selectedStatus: InvoiceStatus?
    @State private var selectedInvoice: Invoice?

    private var filteredInvoices: [Invoice] {
        var result = financialsService.invoices
        if let status = selectedStatus {
            result = result.filter { $0.status == status }
        }
        return result.sorted { $0.issueDate > $1.issueDate }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Filters
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: AppSpacing.xs) {
                    FilterChip(title: "common.all".localized, isSelected: selectedStatus == nil) {
                        selectedStatus = nil
                    }
                    ForEach(InvoiceStatus.allCases, id: \.self) { status in
                        FilterChip(title: status.displayName, isSelected: selectedStatus == status) {
                            selectedStatus = status
                        }
                    }
                }
                .padding(.horizontal, AppSpacing.md)
                .padding(.vertical, AppSpacing.sm)
            }

            // List
            if filteredInvoices.isEmpty {
                emptyView
            } else {
                ScrollView {
                    LazyVStack(spacing: AppSpacing.sm) {
                        ForEach(filteredInvoices) { invoice in
                            InvoiceCard(invoice: invoice)
                                .onTapGesture {
                                    selectedInvoice = invoice
                                }
                        }
                    }
                    .padding(AppSpacing.md)
                }
            }
        }
        .sheet(item: $selectedInvoice) { invoice in
            InvoiceDetailView(invoice: invoice)
                .environmentObject(appState)
        }
    }

    private var emptyView: some View {
        VStack(spacing: AppSpacing.md) {
            Spacer()
            Image(systemName: "doc.text")
                .font(.system(size: 48))
                .foregroundColor(AppColors.gray300)
            Text("financials.noInvoices".localized)
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)
            Text("financials.invoicesWillAppear".localized)
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)
            Spacer()
        }
    }
}

// MARK: - Invoice Card
struct InvoiceCard: View {
    let invoice: Invoice

    private var statusColor: Color {
        switch invoice.status {
        case .draft: return AppColors.gray500
        case .pending: return AppColors.warning
        case .approved: return AppColors.info
        case .paid: return AppColors.success
        case .overdue: return AppColors.error
        case .cancelled: return AppColors.gray400
        }
    }

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                HStack {
                    Text(invoice.invoiceNumber)
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                    Spacer()
                    Text(invoice.status.displayName)
                        .font(AppTypography.caption)
                        .foregroundColor(statusColor)
                        .padding(.horizontal, AppSpacing.xs)
                        .padding(.vertical, 2)
                        .background(statusColor.opacity(0.15))
                        .cornerRadius(4)
                }

                if let vendor = invoice.vendorName {
                    Text(vendor)
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                }

                HStack {
                    Text(invoice.formattedTotal)
                        .font(AppTypography.heading3)
                        .foregroundColor(AppColors.textPrimary)
                    Spacer()
                    if let project = invoice.projectName {
                        Text(project)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textTertiary)
                    }
                }
            }
        }
    }
}

// MARK: - Expenses List View
struct ExpensesListView: View {
    @StateObject private var financialsService = FinancialsService.shared
    @EnvironmentObject var appState: AppState
    @State private var selectedStatus: ExpenseStatus?
    @State private var selectedExpense: Expense?
    @Binding var showNewExpenseForm: Bool

    init(showNewExpenseForm: Binding<Bool> = .constant(false)) {
        _showNewExpenseForm = showNewExpenseForm
    }

    private var canManageFinancials: Bool {
        appState.hasPermission(.manageFinancials)
    }

    private var filteredExpenses: [Expense] {
        var result = financialsService.expenses
        if let status = selectedStatus {
            result = result.filter { $0.status == status }
        }
        return result.sorted { $0.date > $1.date }
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: AppSpacing.xs) {
                    FilterChip(title: "common.all".localized, isSelected: selectedStatus == nil) {
                        selectedStatus = nil
                    }
                    ForEach(ExpenseStatus.allCases, id: \.self) { status in
                        FilterChip(title: status.displayName, isSelected: selectedStatus == status) {
                            selectedStatus = status
                        }
                    }
                }
                .padding(.horizontal, AppSpacing.md)
                .padding(.vertical, AppSpacing.sm)
            }

            if filteredExpenses.isEmpty {
                VStack(spacing: AppSpacing.md) {
                    Spacer()
                    Image(systemName: "creditcard")
                        .font(.system(size: 48))
                        .foregroundColor(AppColors.gray300)
                    Text("financials.noExpenses".localized)
                        .font(AppTypography.heading3)
                        .foregroundColor(AppColors.textPrimary)

                    if canManageFinancials {
                        Button {
                            showNewExpenseForm = true
                        } label: {
                            HStack(spacing: AppSpacing.xs) {
                                Image(systemName: "plus.circle.fill")
                                Text("financials.addExpense".localized)
                            }
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.primary600)
                        }
                        .padding(.top, AppSpacing.sm)
                    }

                    Spacer()
                }
            } else {
                ScrollView {
                    LazyVStack(spacing: AppSpacing.sm) {
                        ForEach(filteredExpenses) { expense in
                            ExpenseCard(expense: expense)
                                .onTapGesture {
                                    selectedExpense = expense
                                }
                        }
                    }
                    .padding(AppSpacing.md)
                }
            }
        }
        .sheet(item: $selectedExpense) { expense in
            ExpenseDetailView(expense: expense)
                .environmentObject(appState)
        }
    }
}

// MARK: - Expense Card
struct ExpenseCard: View {
    let expense: Expense

    private var statusColor: Color {
        switch expense.status {
        case .pending: return AppColors.warning
        case .approved: return AppColors.info
        case .rejected: return AppColors.error
        case .reimbursed: return AppColors.success
        }
    }

    var body: some View {
        AppCard {
            HStack(spacing: AppSpacing.sm) {
                ZStack {
                    Circle()
                        .fill(AppColors.gray100)
                        .frame(width: 40, height: 40)
                    Image(systemName: expense.category.icon)
                        .font(.system(size: 16))
                        .foregroundColor(AppColors.textSecondary)
                }

                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                    Text(expense.description)
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                        .lineLimit(1)
                    Text(expense.category.displayName)
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textSecondary)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: AppSpacing.xxs) {
                    Text(expense.formattedAmount)
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                    Text(expense.status.displayName)
                        .font(AppTypography.caption)
                        .foregroundColor(statusColor)
                }
            }
        }
    }
}

// MARK: - Change Orders List View
struct ChangeOrdersListView: View {
    @StateObject private var financialsService = FinancialsService.shared
    @EnvironmentObject var appState: AppState
    @State private var selectedStatus: ChangeOrderStatus?
    @State private var selectedChangeOrder: ChangeOrder?

    private var filteredChangeOrders: [ChangeOrder] {
        var result = financialsService.changeOrders
        if let status = selectedStatus {
            result = result.filter { $0.status == status }
        }
        return result.sorted { $0.createdAt > $1.createdAt }
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: AppSpacing.xs) {
                    FilterChip(title: "common.all".localized, isSelected: selectedStatus == nil) {
                        selectedStatus = nil
                    }
                    ForEach(ChangeOrderStatus.allCases, id: \.self) { status in
                        FilterChip(title: status.displayName, isSelected: selectedStatus == status) {
                            selectedStatus = status
                        }
                    }
                }
                .padding(.horizontal, AppSpacing.md)
                .padding(.vertical, AppSpacing.sm)
            }

            if filteredChangeOrders.isEmpty {
                VStack(spacing: AppSpacing.md) {
                    Spacer()
                    Image(systemName: "arrow.triangle.2.circlepath")
                        .font(.system(size: 48))
                        .foregroundColor(AppColors.gray300)
                    Text("financials.noChangeOrders".localized)
                        .font(AppTypography.heading3)
                        .foregroundColor(AppColors.textPrimary)
                    Text("financials.changeOrdersWillAppear".localized)
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                    Spacer()
                }
            } else {
                ScrollView {
                    LazyVStack(spacing: AppSpacing.sm) {
                        ForEach(filteredChangeOrders) { co in
                            ChangeOrderCard(changeOrder: co)
                                .onTapGesture {
                                    selectedChangeOrder = co
                                }
                        }
                    }
                    .padding(AppSpacing.md)
                }
            }
        }
        .sheet(item: $selectedChangeOrder) { changeOrder in
            ChangeOrderDetailView(changeOrder: changeOrder)
                .environmentObject(appState)
        }
    }
}

// MARK: - Change Order Card
struct ChangeOrderCard: View {
    let changeOrder: ChangeOrder

    private var statusColor: Color {
        switch changeOrder.status {
        case .draft: return AppColors.gray500
        case .submitted: return AppColors.info
        case .underReview: return AppColors.warning
        case .approved: return AppColors.success
        case .rejected: return AppColors.error
        case .executed: return AppColors.success
        }
    }

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                HStack {
                    Text(changeOrder.changeOrderNumber)
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.primary600)
                        .padding(.horizontal, AppSpacing.xs)
                        .padding(.vertical, 2)
                        .background(AppColors.primary100)
                        .cornerRadius(4)
                    Spacer()
                    Text(changeOrder.status.displayName)
                        .font(AppTypography.caption)
                        .foregroundColor(statusColor)
                        .padding(.horizontal, AppSpacing.xs)
                        .padding(.vertical, 2)
                        .background(statusColor.opacity(0.15))
                        .cornerRadius(4)
                }

                Text(changeOrder.title)
                    .font(AppTypography.bodySemibold)
                    .foregroundColor(AppColors.textPrimary)
                    .lineLimit(2)

                HStack {
                    Text(changeOrder.formattedCostImpact)
                        .font(AppTypography.heading3)
                        .foregroundColor(changeOrder.costImpact >= 0 ? AppColors.error : AppColors.success)

                    if let scheduleImpact = changeOrder.formattedScheduleImpact {
                        Text(scheduleImpact)
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                    }

                    Spacer()
                }
            }
        }
    }
}

#Preview {
    NavigationStack {
        FinancialsView()
            .environmentObject(AppState())
    }
}
