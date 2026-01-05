//
//  Label.swift
//  ConstructionManager
//
//  Custom labels for categorizing activities, locations, materials, etc.
//

import Foundation
import SwiftUI

// MARK: - Label Category
enum LabelCategory: String, Codable, CaseIterable {
    case activity = "ACTIVITY"
    case location = "LOCATION"
    case status = "STATUS"
    case material = "MATERIAL"
    case issue = "ISSUE"
    case visitor = "VISITOR"
    case custom = "CUSTOM"

    var displayName: String {
        switch self {
        case .activity: return "Activity"
        case .location: return "Location"
        case .status: return "Status"
        case .material: return "Material"
        case .issue: return "Issue"
        case .visitor: return "Visitor"
        case .custom: return "Custom"
        }
    }

    var icon: String {
        switch self {
        case .activity: return "hammer.fill"
        case .location: return "mappin.and.ellipse"
        case .status: return "flag.fill"
        case .material: return "shippingbox.fill"
        case .issue: return "exclamationmark.triangle.fill"
        case .visitor: return "person.badge.clock"
        case .custom: return "tag.fill"
        }
    }
}

// MARK: - Label Scope
enum LabelScope: String, Codable, CaseIterable {
    case global = "GLOBAL"
    case project = "PROJECT"

    var displayName: String {
        switch self {
        case .global: return "Global"
        case .project: return "Project-specific"
        }
    }
}

// MARK: - Label Model
struct ProjectLabel: Identifiable, Codable {
    let id: String
    let name: String
    let category: LabelCategory
    let scope: LabelScope
    let projectId: String?
    let projectName: String?
    let color: String?
    let description: String?
    let isActive: Bool
    let usageCount: Int?
    let createdBy: String?
    let createdAt: Date
    let updatedAt: Date

    // Computed properties
    var displayColor: Color {
        guard let colorHex = color else { return AppColors.primary600 }
        return Color(hex: colorHex) ?? AppColors.primary600
    }

    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase

    // MARK: - Mock Data
    static let mockLabels: [ProjectLabel] = [
        // Activity labels
        ProjectLabel(id: "lbl-1", name: "Framing", category: .activity, scope: .global, projectId: nil, projectName: nil, color: "#3B82F6", description: nil, isActive: true, usageCount: 45, createdBy: nil, createdAt: Date(), updatedAt: Date()),
        ProjectLabel(id: "lbl-2", name: "Electrical", category: .activity, scope: .global, projectId: nil, projectName: nil, color: "#F59E0B", description: nil, isActive: true, usageCount: 38, createdBy: nil, createdAt: Date(), updatedAt: Date()),
        ProjectLabel(id: "lbl-3", name: "Plumbing", category: .activity, scope: .global, projectId: nil, projectName: nil, color: "#10B981", description: nil, isActive: true, usageCount: 32, createdBy: nil, createdAt: Date(), updatedAt: Date()),
        ProjectLabel(id: "lbl-4", name: "HVAC", category: .activity, scope: .global, projectId: nil, projectName: nil, color: "#8B5CF6", description: nil, isActive: true, usageCount: 28, createdBy: nil, createdAt: Date(), updatedAt: Date()),
        ProjectLabel(id: "lbl-5", name: "Concrete", category: .activity, scope: .global, projectId: nil, projectName: nil, color: "#6B7280", description: nil, isActive: true, usageCount: 25, createdBy: nil, createdAt: Date(), updatedAt: Date()),

        // Location labels
        ProjectLabel(id: "lbl-6", name: "Building A", category: .location, scope: .project, projectId: "proj-1", projectName: "Downtown Office", color: "#EF4444", description: nil, isActive: true, usageCount: 50, createdBy: nil, createdAt: Date(), updatedAt: Date()),
        ProjectLabel(id: "lbl-7", name: "Floor 1", category: .location, scope: .project, projectId: "proj-1", projectName: "Downtown Office", color: "#EC4899", description: nil, isActive: true, usageCount: 30, createdBy: nil, createdAt: Date(), updatedAt: Date()),
        ProjectLabel(id: "lbl-8", name: "Floor 2", category: .location, scope: .project, projectId: "proj-1", projectName: "Downtown Office", color: "#EC4899", description: nil, isActive: true, usageCount: 25, createdBy: nil, createdAt: Date(), updatedAt: Date()),

        // Issue labels
        ProjectLabel(id: "lbl-9", name: "Weather Delay", category: .issue, scope: .global, projectId: nil, projectName: nil, color: "#F59E0B", description: nil, isActive: true, usageCount: 15, createdBy: nil, createdAt: Date(), updatedAt: Date()),
        ProjectLabel(id: "lbl-10", name: "Material Shortage", category: .issue, scope: .global, projectId: nil, projectName: nil, color: "#EF4444", description: nil, isActive: true, usageCount: 12, createdBy: nil, createdAt: Date(), updatedAt: Date())
    ]
}

// Color.init(hex:) is defined in AppColors.swift
