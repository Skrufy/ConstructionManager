//
//  AppTextField.swift
//  ConstructionManager
//
//  Styled text input field
//

import SwiftUI

struct AppTextField: View {
    let label: String
    let placeholder: String
    @Binding var text: String
    var icon: String? = nil
    var isRequired: Bool = false

    @FocusState private var isFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.xs) {
            // Label
            HStack(spacing: 4) {
                Text(label)
                    .font(AppTypography.label)
                    .foregroundColor(AppColors.textPrimary)
                if isRequired {
                    Text("*")
                        .font(AppTypography.label)
                        .foregroundColor(AppColors.error)
                }
            }

            // Input Field
            HStack(spacing: AppSpacing.sm) {
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.system(size: AppSpacing.iconMedium))
                        .foregroundColor(isFocused ? AppColors.primary600 : AppColors.gray400)
                }
                TextField(placeholder, text: $text)
                    .font(AppTypography.body)
                    .foregroundColor(AppColors.textPrimary)
                    .focused($isFocused)
            }
            .padding(.horizontal, AppSpacing.md)
            .frame(height: AppSpacing.inputHeight)
            .background(AppColors.cardBackground)
            .cornerRadius(AppSpacing.radiusLarge)
            .overlay(
                RoundedRectangle(cornerRadius: AppSpacing.radiusLarge)
                    .stroke(isFocused ? AppColors.primary600 : AppColors.gray300, lineWidth: isFocused ? 2 : 1.5)
            )
            .shadow(color: isFocused ? AppColors.primary500.opacity(0.2) : Color.clear, radius: 4, x: 0, y: 0)
        }
    }
}

// MARK: - Multiline Text Area
struct AppTextArea: View {
    let label: String
    let placeholder: String
    @Binding var text: String
    var isRequired: Bool = false
    var minHeight: CGFloat = 120

    @FocusState private var isFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.xs) {
            // Label
            HStack(spacing: 4) {
                Text(label)
                    .font(AppTypography.label)
                    .foregroundColor(AppColors.textPrimary)
                if isRequired {
                    Text("*")
                        .font(AppTypography.label)
                        .foregroundColor(AppColors.error)
                }
            }

            // Text Editor
            ZStack(alignment: .topLeading) {
                if text.isEmpty {
                    Text(placeholder)
                        .font(AppTypography.body)
                        .foregroundColor(AppColors.gray400)
                        .padding(.horizontal, AppSpacing.md)
                        .padding(.vertical, AppSpacing.sm)
                }
                TextEditor(text: $text)
                    .font(AppTypography.body)
                    .foregroundColor(AppColors.textPrimary)
                    .focused($isFocused)
                    .scrollContentBackground(.hidden)
                    .padding(.horizontal, AppSpacing.xs)
                    .padding(.vertical, AppSpacing.xxs)
            }
            .frame(minHeight: minHeight)
            .background(AppColors.cardBackground)
            .cornerRadius(AppSpacing.radiusLarge)
            .overlay(
                RoundedRectangle(cornerRadius: AppSpacing.radiusLarge)
                    .stroke(isFocused ? AppColors.primary600 : AppColors.gray300, lineWidth: isFocused ? 2 : 1.5)
            )
            .shadow(color: isFocused ? AppColors.primary500.opacity(0.2) : Color.clear, radius: 4, x: 0, y: 0)
        }
    }
}

#Preview {
    VStack(spacing: 24) {
        AppTextField(
            label: "Project Name",
            placeholder: "Enter project name",
            text: .constant(""),
            icon: "folder",
            isRequired: true
        )

        AppTextField(
            label: "Location",
            placeholder: "Enter address",
            text: .constant("123 Main Street"),
            icon: "mappin"
        )

        AppTextArea(
            label: "Notes",
            placeholder: "Enter any additional notes...",
            text: .constant("")
        )
    }
    .padding()
    .background(AppColors.background)
}
