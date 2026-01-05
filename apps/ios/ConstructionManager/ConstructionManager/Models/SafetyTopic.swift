//
//  SafetyTopic.swift
//  ConstructionManager
//
//  Standardized safety topics for safety meetings
//

import Foundation

// MARK: - Safety Topic Category
enum SafetyTopicCategory: String, Codable, CaseIterable {
    case general = "GENERAL"
    case hazards = "HAZARDS"
    case ppe = "PPE"
    case equipment = "EQUIPMENT"
    case procedures = "PROCEDURES"
    case emergency = "EMERGENCY"

    var displayName: String {
        switch self {
        case .general: return "General"
        case .hazards: return "Hazards"
        case .ppe: return "PPE"
        case .equipment: return "Equipment"
        case .procedures: return "Procedures"
        case .emergency: return "Emergency"
        }
    }

    var icon: String {
        switch self {
        case .general: return "checkmark.shield"
        case .hazards: return "exclamationmark.triangle"
        case .ppe: return "person.badge.shield.checkmark"
        case .equipment: return "wrench.and.screwdriver"
        case .procedures: return "list.clipboard"
        case .emergency: return "cross.circle"
        }
    }
}

// MARK: - Safety Topic Model
struct SafetyTopic: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    let description: String?
    let category: String?
    let isDefault: Bool
    let isActive: Bool
    let sortOrder: Int
    let createdAt: Date

    var categoryEnum: SafetyTopicCategory? {
        guard let category = category else { return nil }
        return SafetyTopicCategory(rawValue: category)
    }

    var displayCategory: String {
        categoryEnum?.displayName ?? "General"
    }

    var categoryIcon: String {
        categoryEnum?.icon ?? "checkmark.shield"
    }

    enum CodingKeys: String, CodingKey {
        case id, name, description, category, isDefault, isActive, sortOrder, createdAt
    }

    // Hashable conformance
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: SafetyTopic, rhs: SafetyTopic) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - Create Topic Request
struct CreateSafetyTopicRequest: Encodable {
    let name: String
    let description: String?
    let category: String?
}

// MARK: - Mock Data
extension SafetyTopic {
    static let mockTopics: [SafetyTopic] = [
        // General
        SafetyTopic(id: "topic-1", name: "Toolbox Talk", description: "General safety discussion and awareness", category: "GENERAL", isDefault: true, isActive: true, sortOrder: 0, createdAt: Date()),
        SafetyTopic(id: "topic-2", name: "New Employee Orientation", description: "Site-specific safety orientation for new workers", category: "GENERAL", isDefault: true, isActive: true, sortOrder: 1, createdAt: Date()),
        SafetyTopic(id: "topic-3", name: "Housekeeping & Cleanup", description: "Site cleanliness and organization", category: "GENERAL", isDefault: true, isActive: true, sortOrder: 2, createdAt: Date()),

        // Hazards
        SafetyTopic(id: "topic-4", name: "Fall Protection", description: "Working at heights, fall arrest systems, and guardrails", category: "HAZARDS", isDefault: true, isActive: true, sortOrder: 3, createdAt: Date()),
        SafetyTopic(id: "topic-5", name: "Electrical Safety", description: "Electrical hazards and safe work practices", category: "HAZARDS", isDefault: true, isActive: true, sortOrder: 4, createdAt: Date()),
        SafetyTopic(id: "topic-6", name: "Heat Illness Prevention", description: "Recognizing and preventing heat-related illnesses", category: "HAZARDS", isDefault: true, isActive: true, sortOrder: 5, createdAt: Date()),

        // PPE
        SafetyTopic(id: "topic-7", name: "Personal Protective Equipment (PPE)", description: "Proper use and care of personal protective equipment", category: "PPE", isDefault: true, isActive: true, sortOrder: 6, createdAt: Date()),
        SafetyTopic(id: "topic-8", name: "Hard Hat Safety", description: "Proper use and inspection of hard hats", category: "PPE", isDefault: true, isActive: true, sortOrder: 7, createdAt: Date()),
        SafetyTopic(id: "topic-9", name: "Safety Glasses & Eye Protection", description: "Protecting your eyes on the jobsite", category: "PPE", isDefault: true, isActive: true, sortOrder: 8, createdAt: Date()),

        // Equipment
        SafetyTopic(id: "topic-10", name: "Ladder Safety", description: "Proper ladder selection, setup, and use", category: "EQUIPMENT", isDefault: true, isActive: true, sortOrder: 9, createdAt: Date()),
        SafetyTopic(id: "topic-11", name: "Power Tool Safety", description: "Safe use of power tools and guards", category: "EQUIPMENT", isDefault: true, isActive: true, sortOrder: 10, createdAt: Date()),
        SafetyTopic(id: "topic-12", name: "Forklift Safety", description: "Safe forklift operation and pedestrian awareness", category: "EQUIPMENT", isDefault: true, isActive: true, sortOrder: 11, createdAt: Date()),

        // Procedures
        SafetyTopic(id: "topic-13", name: "Lockout/Tagout (LOTO)", description: "Energy control procedures for servicing equipment", category: "PROCEDURES", isDefault: true, isActive: true, sortOrder: 12, createdAt: Date()),
        SafetyTopic(id: "topic-14", name: "Confined Space Entry", description: "Permit-required confined space procedures", category: "PROCEDURES", isDefault: true, isActive: true, sortOrder: 13, createdAt: Date()),
        SafetyTopic(id: "topic-15", name: "Manual Lifting Techniques", description: "Proper lifting to prevent back injuries", category: "PROCEDURES", isDefault: true, isActive: true, sortOrder: 14, createdAt: Date()),

        // Emergency
        SafetyTopic(id: "topic-16", name: "Fire Prevention & Protection", description: "Fire hazards, extinguisher use, and evacuation procedures", category: "EMERGENCY", isDefault: true, isActive: true, sortOrder: 15, createdAt: Date()),
        SafetyTopic(id: "topic-17", name: "First Aid & Emergency Response", description: "Emergency procedures and first aid basics", category: "EMERGENCY", isDefault: true, isActive: true, sortOrder: 16, createdAt: Date()),
        SafetyTopic(id: "topic-18", name: "Emergency Action Plan", description: "Site-specific emergency procedures", category: "EMERGENCY", isDefault: true, isActive: true, sortOrder: 17, createdAt: Date()),
    ]
}
