//
//  SecondaryButton.swift
//  ConstructionManager
//
//  Secondary action button component
//

import SwiftUI

struct SecondaryButton: View {
    let title: String
    let icon: String?
    let action: () -> Void

    init(
        _ title: String,
        icon: String? = nil,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.icon = icon
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: AppSpacing.xs) {
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.system(size: AppSpacing.iconMedium, weight: .medium))
                }
                Text(title)
                    .font(AppTypography.button)
            }
            .frame(maxWidth: .infinity)
            .frame(height: AppSpacing.buttonHeight)
            .foregroundColor(AppColors.textPrimary)
            .background(AppColors.gray100)
            .cornerRadius(AppSpacing.radiusLarge)
        }
    }
}

struct OutlineButton: View {
    let title: String
    let icon: String?
    let action: () -> Void

    init(
        _ title: String,
        icon: String? = nil,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.icon = icon
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: AppSpacing.xs) {
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.system(size: AppSpacing.iconMedium, weight: .medium))
                }
                Text(title)
                    .font(AppTypography.button)
            }
            .frame(maxWidth: .infinity)
            .frame(height: AppSpacing.buttonHeight)
            .foregroundColor(AppColors.textPrimary)
            .background(AppColors.cardBackground)
            .cornerRadius(AppSpacing.radiusLarge)
            .overlay(
                RoundedRectangle(cornerRadius: AppSpacing.radiusLarge)
                    .stroke(AppColors.gray300, lineWidth: 1.5)
            )
        }
    }
}

struct DestructiveButton: View {
    let title: String
    let icon: String?
    let isLoading: Bool
    let action: () -> Void

    init(
        _ title: String,
        icon: String? = nil,
        isLoading: Bool = false,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.icon = icon
        self.isLoading = isLoading
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: AppSpacing.xs) {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .scaleEffect(0.8)
                } else {
                    if let icon = icon {
                        Image(systemName: icon)
                            .font(.system(size: AppSpacing.iconMedium, weight: .semibold))
                    }
                    Text(title)
                        .font(AppTypography.button)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: AppSpacing.buttonHeight)
            .foregroundColor(.white)
            .background(AppColors.error)
            .cornerRadius(AppSpacing.radiusLarge)
        }
        .disabled(isLoading)
        .opacity(isLoading ? 0.7 : 1)
        .animation(.easeInOut(duration: 0.15), value: isLoading)
    }
}

#Preview {
    VStack(spacing: 16) {
        SecondaryButton("Cancel", icon: "xmark") {}
        OutlineButton("View Details", icon: "chevron.right") {}
        DestructiveButton("Delete", icon: "trash") {}
    }
    .padding()
}
