//
//  ExpenseDetailView.swift
//  ConstructionManager
//
//  Detailed expense view with receipt, actions, and approval workflow
//

import SwiftUI

struct ExpenseDetailView: View {
    let expense: Expense
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var appState: AppState
    @StateObject private var financialsService = FinancialsService.shared

    @State private var showApproveConfirm = false
    @State private var showRejectConfirm = false
    @State private var isProcessing = false

    private var canManageFinancials: Bool {
        appState.hasPermission(.manageFinancials)
    }

    private var statusColor: Color {
        switch expense.status {
        case .pending: return AppColors.warning
        case .approved: return AppColors.info
        case .rejected: return AppColors.error
        case .reimbursed: return AppColors.success
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Header with amount
                    headerSection

                    // Status & dates
                    statusSection

                    // Category & description
                    detailsSection

                    // Submitter info
                    submitterSection

                    // Project info
                    if expense.projectName != nil {
                        projectSection
                    }

                    // Receipt
                    if expense.receiptUrl != nil {
                        receiptSection
                    }

                    // Notes
                    if let notes = expense.notes, !notes.isEmpty {
                        notesSection(notes)
                    }

                    // Actions
                    if canManageFinancials && expense.status == .pending {
                        actionsSection
                    }
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("Expense Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.primary600)
                }
            }
            .confirmationDialog(
                "Approve Expense",
                isPresented: $showApproveConfirm,
                titleVisibility: .visible
            ) {
                Button("Approve") {
                    Task { await approveExpense() }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Are you sure you want to approve this expense for \(expense.formattedAmount)?")
            }
            .confirmationDialog(
                "Reject Expense",
                isPresented: $showRejectConfirm,
                titleVisibility: .visible
            ) {
                Button("Reject", role: .destructive) {
                    Task { await rejectExpense() }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Are you sure you want to reject this expense? This action cannot be undone.")
            }
        }
    }

    // MARK: - Header Section
    private var headerSection: some View {
        AppCard {
            VStack(spacing: AppSpacing.md) {
                // Amount
                Text(expense.formattedAmount)
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(AppColors.textPrimary)

                // Status badge
                Text(expense.status.displayName)
                    .font(AppTypography.captionMedium)
                    .foregroundColor(statusColor)
                    .padding(.horizontal, AppSpacing.sm)
                    .padding(.vertical, AppSpacing.xxs)
                    .background(statusColor.opacity(0.15))
                    .cornerRadius(AppSpacing.radiusSmall)
            }
            .frame(maxWidth: .infinity)
        }
    }

    // MARK: - Status Section
    private var statusSection: some View {
        AppCard {
            VStack(spacing: AppSpacing.md) {
                // Expense Date
                HStack {
                    Label {
                        Text("Expense Date")
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                    } icon: {
                        Image(systemName: "calendar")
                            .foregroundColor(AppColors.gray400)
                    }
                    Spacer()
                    Text(formatDate(expense.date))
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                }

                Divider()

                // Submitted Date
                HStack {
                    Label {
                        Text("Submitted")
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                    } icon: {
                        Image(systemName: "paperplane")
                            .foregroundColor(AppColors.gray400)
                    }
                    Spacer()
                    Text(formatDate(expense.createdAt))
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                }

                // Approved info
                if let approvedAt = expense.approvedAt {
                    Divider()
                    HStack {
                        Label {
                            Text("Approved")
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textSecondary)
                        } icon: {
                            Image(systemName: "checkmark.seal.fill")
                                .foregroundColor(AppColors.success)
                        }
                        Spacer()
                        Text(formatDate(approvedAt))
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.success)
                    }
                }

                // Reimbursed info
                if let reimbursedAt = expense.reimbursedAt {
                    Divider()
                    HStack {
                        Label {
                            Text("Reimbursed")
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textSecondary)
                        } icon: {
                            Image(systemName: "banknote.fill")
                                .foregroundColor(AppColors.success)
                        }
                        Spacer()
                        Text(formatDate(reimbursedAt))
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.success)
                    }
                }
            }
        }
    }

    // MARK: - Details Section
    private var detailsSection: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.md) {
                // Category
                HStack(spacing: AppSpacing.sm) {
                    ZStack {
                        Circle()
                            .fill(AppColors.gray100)
                            .frame(width: 44, height: 44)
                        Image(systemName: expense.category.icon)
                            .font(.system(size: 18))
                            .foregroundColor(AppColors.textSecondary)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Category")
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textTertiary)
                        Text(expense.category.displayName)
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)
                    }
                }

                Divider()

                // Description
                VStack(alignment: .leading, spacing: AppSpacing.xs) {
                    Text("Description")
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textTertiary)
                    Text(expense.description)
                        .font(AppTypography.body)
                        .foregroundColor(AppColors.textPrimary)
                }
            }
        }
    }

    // MARK: - Submitter Section
    private var submitterSection: some View {
        AppCard {
            HStack(spacing: AppSpacing.sm) {
                ZStack {
                    Circle()
                        .fill(AppColors.purple.opacity(0.15))
                        .frame(width: 44, height: 44)
                    Image(systemName: "person.fill")
                        .font(.system(size: 18))
                        .foregroundColor(AppColors.purple)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text("Submitted By")
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textTertiary)
                    Text(expense.userName ?? "Unknown User")
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                }

                Spacer()
            }
        }
    }

    // MARK: - Project Section
    private var projectSection: some View {
        AppCard {
            HStack(spacing: AppSpacing.sm) {
                ZStack {
                    Circle()
                        .fill(AppColors.primary100)
                        .frame(width: 44, height: 44)
                    Image(systemName: "folder.fill")
                        .font(.system(size: 18))
                        .foregroundColor(AppColors.primary600)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text("Project")
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textTertiary)
                    Text(expense.projectName ?? "financials.noProject".localized)
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundColor(AppColors.gray400)
            }
        }
    }

    // MARK: - Receipt Section
    private var receiptSection: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                Text("Receipt")
                    .font(AppTypography.heading3)
                    .foregroundColor(AppColors.textPrimary)

                HStack(spacing: AppSpacing.sm) {
                    ZStack {
                        RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                            .fill(AppColors.gray100)
                            .frame(width: 80, height: 80)
                        Image(systemName: "doc.text.fill")
                            .font(.system(size: 32))
                            .foregroundColor(AppColors.gray400)
                    }

                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Receipt Attached")
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)
                        Text("Tap to view full receipt")
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textSecondary)

                        Button {
                            // TODO: Open receipt viewer
                        } label: {
                            HStack(spacing: AppSpacing.xxs) {
                                Image(systemName: "eye")
                                Text("View Receipt")
                            }
                            .font(AppTypography.captionMedium)
                            .foregroundColor(AppColors.primary600)
                        }
                    }

                    Spacer()
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
            PrimaryButton("financials.approveExpense".localized, icon: "checkmark.circle", isLoading: isProcessing) {
                showApproveConfirm = true
            }

            DestructiveButton("financials.rejectExpense".localized, icon: "xmark.circle", isLoading: isProcessing) {
                showRejectConfirm = true
            }
        }
        .padding(.top, AppSpacing.md)
    }

    // MARK: - Actions
    private func approveExpense() async {
        isProcessing = true
        let success = await financialsService.approveExpense(id: expense.id)
        isProcessing = false
        if success {
            dismiss()
        }
    }

    private func rejectExpense() async {
        isProcessing = true
        let success = await financialsService.rejectExpense(id: expense.id)
        isProcessing = false
        if success {
            dismiss()
        }
    }

    // MARK: - Helpers
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }
}

#Preview {
    ExpenseDetailView(expense: Expense.mockExpenses[0])
        .environmentObject(AppState())
}
