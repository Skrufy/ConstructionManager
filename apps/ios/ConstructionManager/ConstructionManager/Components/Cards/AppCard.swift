//
//  AppCard.swift
//  ConstructionManager
//
//  Reusable card component
//

import SwiftUI

struct AppCard<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(AppSpacing.cardPadding)
        .background(AppColors.cardBackground)
        .cornerRadius(AppSpacing.radiusLarge)
        .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
    }
}

// MARK: - Tappable Card
struct TapCard<Content: View>: View {
    let isSelected: Bool
    let action: () -> Void
    let content: Content

    init(
        isSelected: Bool = false,
        action: @escaping () -> Void,
        @ViewBuilder content: () -> Content
    ) {
        self.isSelected = isSelected
        self.action = action
        self.content = content()
    }

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 0) {
                content
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(AppSpacing.cardPadding)
            .background(isSelected ? AppColors.primary50 : AppColors.cardBackground)
            .cornerRadius(AppSpacing.radiusLarge)
            .overlay(
                RoundedRectangle(cornerRadius: AppSpacing.radiusLarge)
                    .stroke(isSelected ? AppColors.primary600 : AppColors.gray200, lineWidth: isSelected ? 2 : 1)
            )
        }
        .buttonStyle(ScaleButtonStyle())
    }
}

// MARK: - Scale Button Style
struct ScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}

// MARK: - Action Card (Dashboard quick actions)
struct ActionCard: View {
    let title: String
    let subtitle: String
    let icon: String
    let iconColor: Color
    let iconBackground: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: AppSpacing.sm) {
                // Icon Circle
                ZStack {
                    Circle()
                        .fill(iconBackground)
                        .frame(width: 44, height: 44)
                    Image(systemName: icon)
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundColor(iconColor)
                }
                .flexibleFrame(false)

                // Text
                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                    Text(title)
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                        .lineLimit(1)
                    Text(subtitle)
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                }

                Spacer(minLength: 4)

                // Chevron
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(AppColors.gray400)
            }
            .padding(AppSpacing.cardPadding)
            .background(AppColors.cardBackground)
            .cornerRadius(AppSpacing.radiusLarge)
            .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
        }
        .buttonStyle(ScaleButtonStyle())
    }
}

extension View {
    /// Prevents the view from expanding to fill available space
    @ViewBuilder
    func flexibleFrame(_ flexible: Bool) -> some View {
        if flexible {
            self.frame(maxWidth: .infinity)
        } else {
            self.fixedSize()
        }
    }
}

#Preview {
    ScrollView {
        VStack(spacing: 16) {
            AppCard {
                Text("Simple Card")
                    .font(AppTypography.heading3)
                Text("Card content goes here")
                    .font(AppTypography.secondary)
                    .foregroundColor(AppColors.textSecondary)
            }

            TapCard(isSelected: false, action: {}) {
                Text("Tap to select")
            }

            TapCard(isSelected: true, action: {}) {
                Text("Selected card")
            }

            ActionCard(
                title: "New Daily Log",
                subtitle: "Record today's progress",
                icon: "doc.text.fill",
                iconColor: AppColors.primary600,
                iconBackground: AppColors.primary50,
                action: {}
            )
        }
        .padding()
    }
    .background(AppColors.background)
}
