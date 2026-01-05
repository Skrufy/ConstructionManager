//
//  ExpenseFormView.swift
//  ConstructionManager
//
//  Form for creating and editing expenses
//

import SwiftUI

struct ExpenseFormView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var appState: AppState
    @StateObject private var financialsService = FinancialsService.shared

    // Form fields
    @State private var description: String = ""
    @State private var amount: String = ""
    @State private var selectedCategory: ExpenseCategory = .materials
    @State private var expenseDate: Date = Date()
    @State private var notes: String = ""
    @State private var selectedProjectId: String? = nil

    // UI state
    @State private var isSubmitting = false
    @State private var showProjectPicker = false
    @State private var showError = false
    @State private var errorMessage = ""

    // Optional: Edit mode
    var existingExpense: Expense? = nil

    private var isEditing: Bool { existingExpense != nil }

    private var isFormValid: Bool {
        !description.isEmpty && !amount.isEmpty && Double(amount) != nil
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Amount Section
                    amountSection

                    // Category Section
                    categorySection

                    // Details Section
                    detailsSection

                    // Project Section
                    projectSection

                    // Notes Section
                    notesSection

                    Spacer(minLength: AppSpacing.xxl)
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle(isEditing ? "Edit Expense" : "New Expense")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(AppColors.textSecondary)
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(isEditing ? "Save" : "Submit") {
                        Task { await submitExpense() }
                    }
                    .font(AppTypography.bodySemibold)
                    .foregroundColor(isFormValid ? AppColors.primary600 : AppColors.gray400)
                    .disabled(!isFormValid || isSubmitting)
                }
            }
            .alert("Error", isPresented: $showError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(errorMessage)
            }
            .onAppear {
                if let expense = existingExpense {
                    populateForm(with: expense)
                }
            }
        }
        .interactiveDismissDisabled(hasUnsavedChanges)
    }

    private var hasUnsavedChanges: Bool {
        !description.isEmpty || !amount.isEmpty || !notes.isEmpty
    }

    // MARK: - Amount Section
    private var amountSection: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.md) {
                Text("Amount")
                    .font(AppTypography.label)
                    .foregroundColor(AppColors.textPrimary)

                HStack(alignment: .center, spacing: AppSpacing.xs) {
                    Text("$")
                        .font(.system(size: 36, weight: .bold))
                        .foregroundColor(AppColors.textSecondary)

                    TextField("0.00", text: $amount)
                        .font(.system(size: 36, weight: .bold))
                        .keyboardType(.decimalPad)
                        .foregroundColor(AppColors.textPrimary)
                        .multilineTextAlignment(.leading)
                }
                .padding(AppSpacing.md)
                .background(AppColors.gray50)
                .cornerRadius(AppSpacing.radiusLarge)
            }
        }
    }

    // MARK: - Category Section
    private var categorySection: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.md) {
                Text("Category")
                    .font(AppTypography.label)
                    .foregroundColor(AppColors.textPrimary)

                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible()),
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: AppSpacing.sm) {
                    ForEach(ExpenseCategory.allCases, id: \.self) { category in
                        CategoryButton(
                            category: category,
                            isSelected: selectedCategory == category
                        ) {
                            selectedCategory = category
                        }
                    }
                }
            }
        }
    }

    // MARK: - Details Section
    private var detailsSection: some View {
        AppCard {
            VStack(spacing: AppSpacing.md) {
                // Description
                AppTextField(
                    label: "Description",
                    placeholder: "What was this expense for?",
                    text: $description,
                    isRequired: true
                )

                // Date
                VStack(alignment: .leading, spacing: AppSpacing.xs) {
                    Text("Expense Date")
                        .font(AppTypography.label)
                        .foregroundColor(AppColors.textPrimary)

                    DatePicker(
                        "",
                        selection: $expenseDate,
                        in: ...Date(),
                        displayedComponents: .date
                    )
                    .datePickerStyle(.compact)
                    .labelsHidden()
                    .padding(AppSpacing.sm)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(AppColors.gray50)
                    .cornerRadius(AppSpacing.radiusMedium)
                }
            }
        }
    }

    // MARK: - Project Section
    private var projectSection: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.xs) {
                Text("Project (Optional)")
                    .font(AppTypography.label)
                    .foregroundColor(AppColors.textPrimary)

                Button {
                    showProjectPicker = true
                } label: {
                    HStack {
                        Image(systemName: "folder")
                            .foregroundColor(AppColors.gray400)

                        if let projectId = selectedProjectId {
                            Text("Project \(projectId)")
                                .foregroundColor(AppColors.textPrimary)
                        } else {
                            Text("Select a project")
                                .foregroundColor(AppColors.textTertiary)
                        }

                        Spacer()

                        Image(systemName: "chevron.right")
                            .font(.system(size: 14))
                            .foregroundColor(AppColors.gray400)
                    }
                    .font(AppTypography.body)
                    .padding(AppSpacing.md)
                    .background(AppColors.gray50)
                    .cornerRadius(AppSpacing.radiusMedium)
                }
            }
        }
    }

    // MARK: - Notes Section
    private var notesSection: some View {
        AppCard {
            AppTextArea(
                label: "Notes (Optional)",
                placeholder: "Add any additional details...",
                text: $notes,
                minHeight: 80
            )
        }
    }

    // MARK: - Submit Action
    private func submitExpense() async {
        guard isFormValid else { return }
        guard let amountValue = Double(amount) else {
            errorMessage = "Please enter a valid amount"
            showError = true
            return
        }

        isSubmitting = true

        let expense = Expense(
            id: existingExpense?.id ?? UUID().uuidString,
            projectId: selectedProjectId,
            projectName: nil,
            userId: appState.currentUser?.id ?? "",
            userName: appState.currentUser?.name,
            category: selectedCategory,
            description: description,
            amount: amountValue,
            date: expenseDate,
            status: .pending,
            receiptUrl: nil,
            notes: notes.isEmpty ? nil : notes,
            approvedBy: nil,
            approvedAt: nil,
            reimbursedAt: nil,
            createdAt: Date(),
            updatedAt: Date()
        )

        let success = await financialsService.createExpense(expense)

        isSubmitting = false

        if success {
            dismiss()
        } else {
            errorMessage = financialsService.error ?? "Failed to submit expense"
            showError = true
        }
    }

    private func populateForm(with expense: Expense) {
        description = expense.description
        amount = String(format: "%.2f", expense.amount)
        selectedCategory = expense.category
        expenseDate = expense.date
        notes = expense.notes ?? ""
        selectedProjectId = expense.projectId
    }
}

// MARK: - Category Button
struct CategoryButton: View {
    let category: ExpenseCategory
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: AppSpacing.xs) {
                ZStack {
                    Circle()
                        .fill(isSelected ? AppColors.primary600 : AppColors.gray100)
                        .frame(width: 48, height: 48)
                    Image(systemName: category.icon)
                        .font(.system(size: 20))
                        .foregroundColor(isSelected ? .white : AppColors.textSecondary)
                }

                Text(category.displayName)
                    .font(AppTypography.caption)
                    .foregroundColor(isSelected ? AppColors.primary600 : AppColors.textSecondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, AppSpacing.xs)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Receipt Capture Section (Future enhancement)
struct ReceiptCaptureSection: View {
    @Binding var receiptImage: UIImage?
    @State private var showImagePicker = false
    @State private var showCamera = false

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.md) {
                Text("Receipt (Optional)")
                    .font(AppTypography.label)
                    .foregroundColor(AppColors.textPrimary)

                if let image = receiptImage {
                    ZStack(alignment: .topTrailing) {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFit()
                            .frame(maxHeight: 200)
                            .cornerRadius(AppSpacing.radiusMedium)

                        Button {
                            receiptImage = nil
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .font(.system(size: 24))
                                .foregroundColor(.white)
                                .shadow(radius: 2)
                        }
                        .offset(x: -8, y: 8)
                    }
                } else {
                    HStack(spacing: AppSpacing.md) {
                        Button {
                            showCamera = true
                        } label: {
                            VStack(spacing: AppSpacing.xs) {
                                Image(systemName: "camera.fill")
                                    .font(.system(size: 24))
                                Text("Take Photo")
                                    .font(AppTypography.caption)
                            }
                            .foregroundColor(AppColors.primary600)
                            .frame(maxWidth: .infinity)
                            .padding(AppSpacing.md)
                            .background(AppColors.primary50)
                            .cornerRadius(AppSpacing.radiusMedium)
                        }

                        Button {
                            showImagePicker = true
                        } label: {
                            VStack(spacing: AppSpacing.xs) {
                                Image(systemName: "photo.on.rectangle")
                                    .font(.system(size: 24))
                                Text("Choose Photo")
                                    .font(AppTypography.caption)
                            }
                            .foregroundColor(AppColors.textSecondary)
                            .frame(maxWidth: .infinity)
                            .padding(AppSpacing.md)
                            .background(AppColors.gray100)
                            .cornerRadius(AppSpacing.radiusMedium)
                        }
                    }
                }
            }
        }
    }
}

#Preview {
    ExpenseFormView()
        .environmentObject(AppState())
}
