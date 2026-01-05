//
//  ChangeOrderDetailView.swift
//  ConstructionManager
//
//  Detailed change order view with cost/schedule impact, actions, and approval workflow
//

import SwiftUI

struct ChangeOrderDetailView: View {
    let changeOrder: ChangeOrder
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
        switch changeOrder.status {
        case .draft: return AppColors.gray500
        case .submitted: return AppColors.info
        case .underReview: return AppColors.warning
        case .approved: return AppColors.success
        case .rejected: return AppColors.error
        case .executed: return AppColors.success
        }
    }

    private var costImpactColor: Color {
        changeOrder.costImpact >= 0 ? AppColors.error : AppColors.success
    }

    private var scheduleImpactColor: Color {
        guard let days = changeOrder.scheduleImpact else { return AppColors.textSecondary }
        return days >= 0 ? AppColors.warning : AppColors.success
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Header with CO number and status
                    headerSection

                    // Impact summary cards
                    impactSection

                    // Timeline & Dates
                    timelineSection

                    // Reason & Description
                    detailsSection

                    // Requester & Approver info
                    peopleSection

                    // Project info
                    if changeOrder.projectName != nil {
                        projectSection
                    }

                    // Attachments
                    if let attachments = changeOrder.attachments, !attachments.isEmpty {
                        attachmentsSection(attachments)
                    }

                    // Actions
                    if canManageFinancials && canTakeAction {
                        actionsSection
                    }
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("Change Order Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.primary600)
                }
            }
            .confirmationDialog(
                "Approve Change Order",
                isPresented: $showApproveConfirm,
                titleVisibility: .visible
            ) {
                Button("Approve") {
                    Task { await approveChangeOrder() }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Are you sure you want to approve this change order? This will add \(changeOrder.formattedCostImpact) to the project budget.")
            }
            .confirmationDialog(
                "Reject Change Order",
                isPresented: $showRejectConfirm,
                titleVisibility: .visible
            ) {
                Button("Reject", role: .destructive) {
                    Task { await rejectChangeOrder() }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Are you sure you want to reject this change order? This action cannot be undone.")
            }
        }
    }

    private var canTakeAction: Bool {
        changeOrder.status == .submitted || changeOrder.status == .underReview
    }

    // MARK: - Header Section
    private var headerSection: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.md) {
                HStack {
                    Text(changeOrder.changeOrderNumber)
                        .font(AppTypography.captionMedium)
                        .foregroundColor(AppColors.primary600)
                        .padding(.horizontal, AppSpacing.sm)
                        .padding(.vertical, AppSpacing.xxs)
                        .background(AppColors.primary100)
                        .cornerRadius(AppSpacing.radiusSmall)

                    Spacer()

                    Text(changeOrder.status.displayName)
                        .font(AppTypography.captionMedium)
                        .foregroundColor(statusColor)
                        .padding(.horizontal, AppSpacing.sm)
                        .padding(.vertical, AppSpacing.xxs)
                        .background(statusColor.opacity(0.15))
                        .cornerRadius(AppSpacing.radiusSmall)
                }

                Text(changeOrder.title)
                    .font(AppTypography.heading2)
                    .foregroundColor(AppColors.textPrimary)
            }
        }
    }

    // MARK: - Impact Section
    private var impactSection: some View {
        HStack(spacing: AppSpacing.sm) {
            // Cost Impact Card
            VStack(spacing: AppSpacing.sm) {
                Image(systemName: "dollarsign.circle.fill")
                    .font(.system(size: 28))
                    .foregroundColor(costImpactColor)

                Text("Cost Impact")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textTertiary)

                Text(changeOrder.formattedCostImpact)
                    .font(AppTypography.heading3)
                    .foregroundColor(costImpactColor)
            }
            .frame(maxWidth: .infinity)
            .padding(AppSpacing.md)
            .background(AppColors.cardBackground)
            .cornerRadius(AppSpacing.radiusLarge)
            .shadow(color: Color.black.opacity(0.05), radius: 2, y: 1)

            // Schedule Impact Card
            VStack(spacing: AppSpacing.sm) {
                Image(systemName: "calendar.badge.clock")
                    .font(.system(size: 28))
                    .foregroundColor(scheduleImpactColor)

                Text("Schedule Impact")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textTertiary)

                if let scheduleImpact = changeOrder.formattedScheduleImpact {
                    Text(scheduleImpact)
                        .font(AppTypography.heading3)
                        .foregroundColor(scheduleImpactColor)
                } else {
                    Text("financials.noImpact".localized)
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textSecondary)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(AppSpacing.md)
            .background(AppColors.cardBackground)
            .cornerRadius(AppSpacing.radiusLarge)
            .shadow(color: Color.black.opacity(0.05), radius: 2, y: 1)
        }
    }

    // MARK: - Timeline Section
    private var timelineSection: some View {
        AppCard {
            VStack(spacing: AppSpacing.md) {
                // Created Date
                HStack {
                    Label {
                        Text("Created")
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                    } icon: {
                        Image(systemName: "calendar")
                            .foregroundColor(AppColors.gray400)
                    }
                    Spacer()
                    Text(formatDate(changeOrder.createdAt))
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                }

                // Last Updated
                if changeOrder.updatedAt != changeOrder.createdAt {
                    Divider()
                    HStack {
                        Label {
                            Text("Last Updated")
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textSecondary)
                        } icon: {
                            Image(systemName: "clock.arrow.circlepath")
                                .foregroundColor(AppColors.gray400)
                        }
                        Spacer()
                        Text(formatDate(changeOrder.updatedAt))
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)
                    }
                }

                // Approved Date
                if let approvedAt = changeOrder.approvedAt {
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
            }
        }
    }

    // MARK: - Details Section
    private var detailsSection: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.md) {
                // Reason
                if let reason = changeOrder.reason {
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Label {
                            Text("Reason")
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textTertiary)
                        } icon: {
                            Image(systemName: "questionmark.circle")
                                .foregroundColor(AppColors.gray400)
                        }

                        Text(reason)
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)
                    }
                }

                // Description
                if let description = changeOrder.description {
                    if changeOrder.reason != nil {
                        Divider()
                    }

                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Label {
                            Text("Description")
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textTertiary)
                        } icon: {
                            Image(systemName: "doc.text")
                                .foregroundColor(AppColors.gray400)
                        }

                        Text(description)
                            .font(AppTypography.body)
                            .foregroundColor(AppColors.textSecondary)
                    }
                }
            }
        }
    }

    // MARK: - People Section
    private var peopleSection: some View {
        AppCard {
            VStack(spacing: AppSpacing.md) {
                // Requested By
                HStack(spacing: AppSpacing.sm) {
                    ZStack {
                        Circle()
                            .fill(AppColors.purple.opacity(0.15))
                            .frame(width: 40, height: 40)
                        Image(systemName: "person.fill")
                            .font(.system(size: 16))
                            .foregroundColor(AppColors.purple)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Requested By")
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textTertiary)
                        Text(changeOrder.requestedByName ?? "Unknown")
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)
                    }

                    Spacer()
                }

                // Approved By
                if let approvedByName = changeOrder.approvedByName {
                    Divider()
                    HStack(spacing: AppSpacing.sm) {
                        ZStack {
                            Circle()
                                .fill(AppColors.success.opacity(0.15))
                                .frame(width: 40, height: 40)
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 16))
                                .foregroundColor(AppColors.success)
                        }

                        VStack(alignment: .leading, spacing: 2) {
                            Text("Approved By")
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textTertiary)
                            Text(approvedByName)
                                .font(AppTypography.bodySemibold)
                                .foregroundColor(AppColors.textPrimary)
                        }

                        Spacer()
                    }
                }
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
                    Text(changeOrder.projectName ?? "financials.noProject".localized)
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

    // MARK: - Attachments Section
    private func attachmentsSection(_ attachments: [String]) -> some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                Text("Attachments (\(attachments.count))")
                    .font(AppTypography.heading3)
                    .foregroundColor(AppColors.textPrimary)

                ForEach(attachments, id: \.self) { attachment in
                    HStack(spacing: AppSpacing.sm) {
                        Image(systemName: "paperclip")
                            .font(.system(size: 16))
                            .foregroundColor(AppColors.gray400)

                        Text(attachment)
                            .font(AppTypography.body)
                            .foregroundColor(AppColors.primary600)
                            .lineLimit(1)

                        Spacer()

                        Image(systemName: "arrow.down.circle")
                            .font(.system(size: 18))
                            .foregroundColor(AppColors.primary600)
                    }
                    .padding(AppSpacing.sm)
                    .background(AppColors.gray50)
                    .cornerRadius(AppSpacing.radiusMedium)
                }
            }
        }
    }

    // MARK: - Actions Section
    private var actionsSection: some View {
        VStack(spacing: AppSpacing.sm) {
            PrimaryButton("financials.approveChangeOrder".localized, icon: "checkmark.circle", isLoading: isProcessing) {
                showApproveConfirm = true
            }

            DestructiveButton("financials.rejectChangeOrder".localized, icon: "xmark.circle", isLoading: isProcessing) {
                showRejectConfirm = true
            }
        }
        .padding(.top, AppSpacing.md)
    }

    // MARK: - Actions
    private func approveChangeOrder() async {
        isProcessing = true
        let success = await financialsService.approveChangeOrder(id: changeOrder.id)
        isProcessing = false
        if success {
            dismiss()
        }
    }

    private func rejectChangeOrder() async {
        // TODO: Add reject method to FinancialsService
        isProcessing = true
        // For now, just dismiss
        isProcessing = false
        dismiss()
    }

    // MARK: - Helpers
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }
}

#Preview {
    ChangeOrderDetailView(changeOrder: ChangeOrder.mockChangeOrders[0])
        .environmentObject(AppState())
}
