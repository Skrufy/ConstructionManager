//
//  FilterChip.swift
//  ConstructionManager
//
//  Reusable filter chip component for category/status filtering
//

import SwiftUI

struct FilterChip: View {
    let title: String
    let isSelected: Bool
    var color: Color = AppColors.primary600
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(AppTypography.captionMedium)
                .padding(.horizontal, AppSpacing.sm)
                .padding(.vertical, AppSpacing.xs)
                .foregroundColor(isSelected ? .white : (color == AppColors.primary600 ? AppColors.textSecondary : color))
                .background(isSelected ? color : (color == AppColors.primary600 ? AppColors.gray100 : color.opacity(0.1)))
                .cornerRadius(AppSpacing.radiusFull)
        }
    }
}

#Preview {
    HStack {
        FilterChip(title: "All", isSelected: true) {}
        FilterChip(title: "Active", isSelected: false) {}
        FilterChip(title: "Pending", isSelected: false) {}
    }
    .padding()
}
