//
//  PrimaryButton.swift
//  ConstructionManager
//
//  Primary action button component
//

import SwiftUI

struct PrimaryButton: View {
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
                        .scaleEffect(0.9)
                } else if let icon = icon {
                    Image(systemName: icon)
                        .font(.system(size: AppSpacing.iconMedium, weight: .semibold))
                }
                Text(title)
                    .font(AppTypography.button)
            }
            .frame(maxWidth: .infinity)
            .frame(height: AppSpacing.buttonHeight)
            .foregroundColor(.white)
            .background(AppColors.primary600)
            .cornerRadius(AppSpacing.radiusLarge)
            .shadow(color: AppColors.primary600.opacity(0.3), radius: 4, x: 0, y: 2)
        }
        .disabled(isLoading)
        .opacity(isLoading ? 0.7 : 1)
        .scaleEffect(isLoading ? 0.98 : 1)
        .animation(.easeInOut(duration: 0.15), value: isLoading)
    }
}

// MARK: - Large Variant
struct PrimaryButtonLarge: View {
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
                } else if let icon = icon {
                    Image(systemName: icon)
                        .font(.system(size: AppSpacing.iconLarge, weight: .semibold))
                }
                Text(title)
                    .font(AppTypography.buttonLarge)
            }
            .frame(maxWidth: .infinity)
            .frame(height: AppSpacing.buttonHeightLarge)
            .foregroundColor(.white)
            .background(AppColors.primary600)
            .cornerRadius(AppSpacing.radiusLarge)
            .shadow(color: AppColors.primary600.opacity(0.3), radius: 6, x: 0, y: 3)
        }
        .disabled(isLoading)
        .opacity(isLoading ? 0.7 : 1)
    }
}

#Preview {
    VStack(spacing: 16) {
        PrimaryButton("Submit", icon: "checkmark") {}
        PrimaryButton("Loading...", isLoading: true) {}
        PrimaryButtonLarge("Clock In", icon: "clock.fill") {}
    }
    .padding()
}
