//
//  InvoiceDetailView.swift
//  ConstructionManager
//
//  Detailed invoice view with line items, actions, and approval workflow
//

import SwiftUI

struct InvoiceDetailView: View {
    let invoice: Invoice
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var appState: AppState
    @StateObject private var financialsService = FinancialsService.shared

    @State private var showApproveConfirm = false
    @State private var showMarkPaidSheet = false
    @State private var paidAmount: String = ""
    @State private var isProcessing = false

    private var canManageFinancials: Bool {
        appState.hasPermission(.manageFinancials)
    }

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
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Header Section
                    headerSection

                    // Status & Dates Section
                    statusSection

                    // Vendor Info
                    if invoice.vendorName != nil {
                        vendorSection
                    }

                    // Line Items
                    if let lineItems = invoice.lineItems, !lineItems.isEmpty {
                        lineItemsSection(lineItems)
                    }

                    // Totals
                    totalsSection

                    // Notes
                    if let notes = invoice.notes, !notes.isEmpty {
                        notesSection(notes)
                    }

                    // Actions
                    if canManageFinancials {
                        actionsSection
                    }
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("Invoice Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.primary600)
                }
            }
            .confirmationDialog(
                "Approve Invoice",
                isPresented: $showApproveConfirm,
                titleVisibility: .visible
            ) {
                Button("Approve") {
                    Task { await approveInvoice() }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Are you sure you want to approve this invoice for \(invoice.formattedTotal)?")
            }
            .sheet(isPresented: $showMarkPaidSheet) {
                markPaidSheet
            }
        }
    }

    // MARK: - Header Section
    private var headerSection: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                HStack {
                    Text(invoice.invoiceNumber)
                        .font(AppTypography.heading2)
                        .foregroundColor(AppColors.textPrimary)

                    Spacer()

                    Text(invoice.status.displayName)
                        .font(AppTypography.captionMedium)
                        .foregroundColor(statusColor)
                        .padding(.horizontal, AppSpacing.sm)
                        .padding(.vertical, AppSpacing.xxs)
                        .background(statusColor.opacity(0.15))
                        .cornerRadius(AppSpacing.radiusSmall)
                }

                if let description = invoice.description {
                    Text(description)
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                }

                if let projectName = invoice.projectName {
                    HStack(spacing: AppSpacing.xs) {
                        Image(systemName: "folder.fill")
                            .font(.system(size: 14))
                            .foregroundColor(AppColors.primary600)
                        Text(projectName)
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                    }
                }
            }
        }
    }

    // MARK: - Status Section
    private var statusSection: some View {
        AppCard {
            VStack(spacing: AppSpacing.md) {
                // Issue Date
                HStack {
                    Label {
                        Text("Issue Date")
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                    } icon: {
                        Image(systemName: "calendar")
                            .foregroundColor(AppColors.gray400)
                    }
                    Spacer()
                    Text(formatDate(invoice.issueDate))
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                }

                Divider()

                // Due Date
                HStack {
                    Label {
                        Text("Due Date")
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                    } icon: {
                        Image(systemName: "clock")
                            .foregroundColor(invoice.isOverdue ? AppColors.error : AppColors.gray400)
                    }
                    Spacer()
                    if let dueDate = invoice.dueDate {
                        VStack(alignment: .trailing, spacing: 2) {
                            Text(formatDate(dueDate))
                                .font(AppTypography.bodySemibold)
                                .foregroundColor(invoice.isOverdue ? AppColors.error : AppColors.textPrimary)
                            if invoice.isOverdue {
                                Text("OVERDUE")
                                    .font(AppTypography.caption)
                                    .foregroundColor(AppColors.error)
                            }
                        }
                    } else {
                        Text("Not set")
                            .font(AppTypography.body)
                            .foregroundColor(AppColors.textTertiary)
                    }
                }

                // Paid Date (if paid)
                if let paidDate = invoice.paidDate {
                    Divider()
                    HStack {
                        Label {
                            Text("Paid Date")
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textSecondary)
                        } icon: {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(AppColors.success)
                        }
                        Spacer()
                        Text(formatDate(paidDate))
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.success)
                    }
                }

                // Approved By (if approved)
                if let approvedAt = invoice.approvedAt {
                    Divider()
                    HStack {
                        Label {
                            Text("Approved")
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textSecondary)
                        } icon: {
                            Image(systemName: "checkmark.seal.fill")
                                .foregroundColor(AppColors.info)
                        }
                        Spacer()
                        Text(formatDate(approvedAt))
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)
                    }
                }
            }
        }
    }

    // MARK: - Vendor Section
    private var vendorSection: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                Text("Vendor")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textTertiary)

                HStack(spacing: AppSpacing.sm) {
                    ZStack {
                        Circle()
                            .fill(AppColors.orange.opacity(0.15))
                            .frame(width: 44, height: 44)
                        Image(systemName: "building.2.fill")
                            .font(.system(size: 18))
                            .foregroundColor(AppColors.orange)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text(invoice.vendorName ?? "Unknown Vendor")
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)
                        if invoice.vendorId != nil {
                            Text("Registered Vendor")
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textTertiary)
                        }
                    }

                    Spacer()
                }
            }
        }
    }

    // MARK: - Line Items Section
    private func lineItemsSection(_ items: [InvoiceLineItem]) -> some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.md) {
                Text("Line Items")
                    .font(AppTypography.heading3)
                    .foregroundColor(AppColors.textPrimary)

                ForEach(items) { item in
                    VStack(spacing: AppSpacing.sm) {
                        HStack(alignment: .top) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(item.description)
                                    .font(AppTypography.body)
                                    .foregroundColor(AppColors.textPrimary)
                                Text("\(formatQuantity(item.quantity)) x \(formatCurrency(item.unitPrice))")
                                    .font(AppTypography.caption)
                                    .foregroundColor(AppColors.textTertiary)
                            }

                            Spacer()

                            Text(formatCurrency(item.amount))
                                .font(AppTypography.bodySemibold)
                                .foregroundColor(AppColors.textPrimary)
                        }

                        if item.id != items.last?.id {
                            Divider()
                        }
                    }
                }
            }
        }
    }

    // MARK: - Totals Section
    private var totalsSection: some View {
        AppCard {
            VStack(spacing: AppSpacing.sm) {
                HStack {
                    Text("Subtotal")
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                    Spacer()
                    Text(formatCurrency(invoice.subtotal))
                        .font(AppTypography.body)
                        .foregroundColor(AppColors.textPrimary)
                }

                if let tax = invoice.tax, tax > 0 {
                    HStack {
                        Text("Tax")
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                        Spacer()
                        Text(formatCurrency(tax))
                            .font(AppTypography.body)
                            .foregroundColor(AppColors.textPrimary)
                    }
                }

                Divider()

                HStack {
                    Text("Total")
                        .font(AppTypography.heading3)
                        .foregroundColor(AppColors.textPrimary)
                    Spacer()
                    Text(invoice.formattedTotal)
                        .font(AppTypography.heading2)
                        .foregroundColor(AppColors.primary600)
                }

                if let paidAmount = invoice.paidAmount, paidAmount > 0 && paidAmount < invoice.total {
                    Divider()
                    HStack {
                        Text("Paid Amount")
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.success)
                        Spacer()
                        Text(formatCurrency(paidAmount))
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.success)
                    }
                    HStack {
                        Text("Remaining")
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.warning)
                        Spacer()
                        Text(formatCurrency(invoice.remainingAmount))
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.warning)
                    }
                }
            }
        }
    }

    // MARK: - Notes Section
    private func notesSection(_ notes: String) -> some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                Label {
                    Text("Notes")
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textTertiary)
                } icon: {
                    Image(systemName: "note.text")
                        .foregroundColor(AppColors.gray400)
                }

                Text(notes)
                    .font(AppTypography.body)
                    .foregroundColor(AppColors.textSecondary)
            }
        }
    }

    // MARK: - Actions Section
    private var actionsSection: some View {
        VStack(spacing: AppSpacing.sm) {
            if invoice.status == .pending {
                PrimaryButton("financials.approveInvoice".localized, icon: "checkmark.circle", isLoading: isProcessing) {
                    showApproveConfirm = true
                }
            }

            if invoice.status == .approved {
                PrimaryButton("financials.markAsPaid".localized, icon: "banknote", isLoading: isProcessing) {
                    paidAmount = String(format: "%.2f", invoice.total)
                    showMarkPaidSheet = true
                }
            }

            if invoice.status == .paid && invoice.remainingAmount > 0 {
                SecondaryButton("financials.recordAdditionalPayment".localized, icon: "plus.circle") {
                    paidAmount = String(format: "%.2f", invoice.remainingAmount)
                    showMarkPaidSheet = true
                }
            }
        }
        .padding(.top, AppSpacing.md)
    }

    // MARK: - Mark Paid Sheet
    private var markPaidSheet: some View {
        NavigationStack {
            VStack(spacing: AppSpacing.lg) {
                VStack(alignment: .leading, spacing: AppSpacing.sm) {
                    Text("financials.paymentAmount".localized)
                        .font(AppTypography.label)
                        .foregroundColor(AppColors.textPrimary)

                    HStack {
                        Text("$")
                            .font(AppTypography.heading2)
                            .foregroundColor(AppColors.textSecondary)
                        TextField("0.00", text: $paidAmount)
                            .font(AppTypography.heading2)
                            .keyboardType(.decimalPad)
                            .foregroundColor(AppColors.textPrimary)
                    }
                    .padding(AppSpacing.md)
                    .background(AppColors.gray100)
                    .cornerRadius(AppSpacing.radiusLarge)
                }

                VStack(alignment: .leading, spacing: AppSpacing.xs) {
                    HStack {
                        Text("financials.invoiceTotal".localized)
                        Spacer()
                        Text(invoice.formattedTotal)
                    }
                    .font(AppTypography.secondary)
                    .foregroundColor(AppColors.textSecondary)

                    if let previouslyPaid = invoice.paidAmount, previouslyPaid > 0 {
                        HStack {
                            Text("financials.previouslyPaid".localized)
                            Spacer()
                            Text(formatCurrency(previouslyPaid))
                        }
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.success)
                    }

                    HStack {
                        Text("financials.remainingDue".localized)
                        Spacer()
                        Text(formatCurrency(invoice.remainingAmount))
                    }
                    .font(AppTypography.bodySemibold)
                    .foregroundColor(AppColors.textPrimary)
                }
                .padding(AppSpacing.md)
                .background(AppColors.gray50)
                .cornerRadius(AppSpacing.radiusMedium)

                Spacer()

                PrimaryButton("financials.recordPayment".localized, icon: "checkmark", isLoading: isProcessing) {
                    Task { await markAsPaid() }
                }
            }
            .padding(AppSpacing.lg)
            .navigationTitle("financials.recordPayment".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("common.cancel".localized) { showMarkPaidSheet = false }
                }
            }
        }
        .presentationDetents([.medium])
    }

    // MARK: - Actions
    private func approveInvoice() async {
        isProcessing = true
        let success = await financialsService.approveInvoice(id: invoice.id)
        isProcessing = false
        if success {
            dismiss()
        }
    }

    private func markAsPaid() async {
        guard let amount = Double(paidAmount), amount > 0 else { return }
        isProcessing = true
        let success = await financialsService.markInvoicePaid(id: invoice.id, amount: amount)
        isProcessing = false
        if success {
            showMarkPaidSheet = false
            dismiss()
        }
    }

    // MARK: - Helpers
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }

    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        return formatter.string(from: NSNumber(value: amount)) ?? "$\(amount)"
    }

    private func formatQuantity(_ quantity: Double) -> String {
        if quantity.truncatingRemainder(dividingBy: 1) == 0 {
            return String(format: "%.0f", quantity)
        }
        return String(format: "%.2f", quantity)
    }
}

#Preview {
    InvoiceDetailView(invoice: Invoice.mockInvoices[0])
        .environmentObject(AppState())
}
