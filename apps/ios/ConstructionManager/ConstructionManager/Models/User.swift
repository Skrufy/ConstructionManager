//
//  User.swift
//  ConstructionManager
//
//  User data model and roles
//

import Foundation
import SwiftUI

// MARK: - User Role
enum UserRole: String, Codable, CaseIterable {
    case admin = "ADMIN"
    case projectManager = "PROJECT_MANAGER"
    case developer = "DEVELOPER"
    case architect = "ARCHITECT"
    case foreman = "FOREMAN"
    case crewLeader = "CREW_LEADER"
    case officeStaff = "OFFICE"
    case fieldWorker = "FIELD_WORKER"
    case viewer = "VIEWER"

    var displayName: String {
        switch self {
        case .admin: return "Administrator"
        case .projectManager: return "Project Manager"
        case .developer: return "Developer"
        case .architect: return "Architect/Engineer"
        case .foreman: return "Foreman"
        case .crewLeader: return "Crew Leader"
        case .officeStaff: return "Office Staff"
        case .fieldWorker: return "Field Worker"
        case .viewer: return "Viewer"
        }
    }

    var description: String {
        switch self {
        case .admin: return "Full access to all features"
        case .projectManager: return "Manage projects, teams, reports"
        case .developer: return "Real estate developer/client view"
        case .architect: return "Design professional with document access"
        case .foreman: return "Site supervisor overseeing operations"
        case .crewLeader: return "Lead a specific crew or trade"
        case .officeStaff: return "Administrative and back-office tasks"
        case .fieldWorker: return "Entry-level workers on job sites"
        case .viewer: return "View-only access to projects and reports"
        }
    }

    var color: Color {
        switch self {
        case .admin: return .red
        case .projectManager: return .purple
        case .developer: return .indigo
        case .architect: return .cyan
        case .foreman: return .blue
        case .crewLeader: return .teal
        case .officeStaff: return .yellow
        case .fieldWorker: return .green
        case .viewer: return .gray
        }
    }

    var icon: String {
        switch self {
        case .admin: return "shield.fill"
        case .projectManager: return "person.crop.rectangle.fill"
        case .developer: return "building.fill"
        case .architect: return "pencil.and.ruler.fill"
        case .foreman: return "person.badge.shield.checkmark.fill"
        case .crewLeader: return "person.2.fill"
        case .officeStaff: return "desktopcomputer"
        case .fieldWorker: return "hammer.fill"
        case .viewer: return "eye.fill"
        }
    }
}

// MARK: - User Status
enum UserStatus: String, Codable {
    case active = "ACTIVE"
    case inactive = "INACTIVE"
    case pending = "PENDING"
    case suspended = "SUSPENDED"

    var displayName: String {
        switch self {
        case .active: return "Active"
        case .inactive: return "Inactive"
        case .pending: return "Pending"
        case .suspended: return "Suspended"
        }
    }
}

// MARK: - User Model
struct User: Identifiable, Decodable {
    let id: String
    let name: String
    let email: String
    let phone: String?
    let role: UserRole
    let status: UserStatus
    let isBlaster: Bool?  // Certified blaster who can be assigned to blasting documents
    let createdAt: Date
    let language: String?  // User's preferred language ("en" or "es")
    let companyTemplateName: String?  // Name of assigned company permission template

    // Custom decoder to handle both flat and nested template name formats
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        id = try container.decode(String.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        email = try container.decode(String.self, forKey: .email)
        phone = try container.decodeIfPresent(String.self, forKey: .phone)
        role = try container.decode(UserRole.self, forKey: .role)
        status = try container.decode(UserStatus.self, forKey: .status)
        isBlaster = try container.decodeIfPresent(Bool.self, forKey: .isBlaster)
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        language = try container.decodeIfPresent(String.self, forKey: .language)

        // Try flat field first, then nested structure
        if let flatName = try container.decodeIfPresent(String.self, forKey: .companyTemplateName) {
            companyTemplateName = flatName
        } else if let nested = try container.decodeIfPresent(CompanyPermissionWrapper.self, forKey: .companyPermission) {
            companyTemplateName = nested.companyTemplate?.name
        } else {
            companyTemplateName = nil
        }
    }

    // Manual init for creating User instances
    init(id: String, name: String, email: String, phone: String?, role: UserRole, status: UserStatus, isBlaster: Bool?, createdAt: Date, language: String?, companyTemplateName: String?) {
        self.id = id
        self.name = name
        self.email = email
        self.phone = phone
        self.role = role
        self.status = status
        self.isBlaster = isBlaster
        self.createdAt = createdAt
        self.language = language
        self.companyTemplateName = companyTemplateName
    }

    private enum CodingKeys: String, CodingKey {
        case id, name, email, phone, role, status, isBlaster, createdAt, language
        case companyTemplateName
        case companyPermission
    }

    // Helper structs for nested decoding
    private struct CompanyPermissionWrapper: Decodable {
        let companyTemplate: CompanyTemplateWrapper?
    }

    private struct CompanyTemplateWrapper: Decodable {
        let name: String?
    }

    var initials: String {
        let components = name.split(separator: " ")
        if components.count >= 2 {
            return String(components[0].prefix(1)) + String(components[1].prefix(1))
        }
        return String(name.prefix(2)).uppercased()
    }

    var fullName: String {
        name
    }
}

// MARK: - Mock Data
extension User {
    static let mockUsers: [User] = [
        User(id: "1", name: "Steven Taylor", email: "steven@company.com", phone: "555-0101", role: .admin, status: .active, isBlaster: false, createdAt: Date(), language: "en", companyTemplateName: nil),
        User(id: "2", name: "John Smith", email: "john@company.com", phone: "555-0102", role: .projectManager, status: .active, isBlaster: false, createdAt: Date(), language: "en", companyTemplateName: nil),
        User(id: "3", name: "Sarah Johnson", email: "sarah@company.com", phone: "555-0103", role: .foreman, status: .active, isBlaster: true, createdAt: Date(), language: "es", companyTemplateName: nil),
        User(id: "4", name: "Mike Davis", email: "mike@company.com", phone: "555-0104", role: .fieldWorker, status: .active, isBlaster: false, createdAt: Date(), language: "en", companyTemplateName: nil),
        User(id: "5", name: "Emily Brown", email: "emily@company.com", phone: "555-0105", role: .officeStaff, status: .active, isBlaster: false, createdAt: Date(), language: "en", companyTemplateName: nil)
    ]

    static let currentUser = User(
        id: "1",
        name: "Steven Taylor",
        email: "steven@company.com",
        phone: "555-0101",
        role: .admin,
        status: .active,
        isBlaster: false,
        createdAt: Date(),
        language: "en",
        companyTemplateName: nil
    )
}
