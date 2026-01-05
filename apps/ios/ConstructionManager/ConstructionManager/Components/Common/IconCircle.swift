//
//  IconCircle.swift
//  ConstructionManager
//
//  Circular icon container component
//

import SwiftUI

enum IconCircleSize {
    case small
    case medium
    case large

    var dimension: CGFloat {
        switch self {
        case .small: return AppSpacing.iconCircleSmall
        case .medium: return AppSpacing.iconCircleMedium
        case .large: return AppSpacing.iconCircleLarge
        }
    }

    var iconSize: CGFloat {
        switch self {
        case .small: return AppSpacing.iconSmall
        case .medium: return AppSpacing.iconMedium
        case .large: return AppSpacing.iconLarge
        }
    }
}

struct IconCircle: View {
    let icon: String
    let size: IconCircleSize
    let foregroundColor: Color
    let backgroundColor: Color

    init(
        icon: String,
        size: IconCircleSize = .medium,
        foregroundColor: Color = AppColors.primary600,
        backgroundColor: Color = AppColors.primary50
    ) {
        self.icon = icon
        self.size = size
        self.foregroundColor = foregroundColor
        self.backgroundColor = backgroundColor
    }

    var body: some View {
        ZStack {
            Circle()
                .fill(backgroundColor)
                .frame(width: size.dimension, height: size.dimension)
            Image(systemName: icon)
                .font(.system(size: size.iconSize, weight: .semibold))
                .foregroundColor(foregroundColor)
        }
    }
}

#Preview {
    HStack(spacing: 16) {
        IconCircle(icon: "clock.fill", size: .small)
        IconCircle(icon: "doc.text.fill", size: .medium, foregroundColor: AppColors.success, backgroundColor: AppColors.successLight)
        IconCircle(icon: "folder.fill", size: .large, foregroundColor: AppColors.orange, backgroundColor: AppColors.orangeLight)
    }
    .padding()
}
