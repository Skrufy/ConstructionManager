//
//  Employee.swift
//  ConstructionManager
//
//  Employee model for workers who may or may not have user accounts
//

import Foundation

// MARK: - Employee Model
struct Employee: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    let email: String?
    let phone: String?
    let company: String?
    let jobTitle: String?
    let userId: String?
    let isActive: Bool
    let createdAt: Date
    let updatedAt: Date?

    // Optional linked user data
    let user: LinkedUser?

    // Display helpers
    var displayName: String {
        name
    }

    var displayCompany: String {
        company ?? "Internal"
    }

    var initials: String {
        let components = name.split(separator: " ")
        if components.count >= 2 {
            return String(components[0].prefix(1) + components[1].prefix(1)).uppercased()
        }
        return String(name.prefix(2)).uppercased()
    }

    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase
    // which automatically converts job_title → jobTitle, is_active → isActive, etc.

    // Hashable conformance for Set operations
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: Employee, rhs: Employee) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - Linked User (minimal user data)
struct LinkedUser: Codable, Hashable {
    let id: String
    let name: String
    let email: String
}

// MARK: - Create Employee Request
struct CreateEmployeeRequest: Encodable {
    let name: String
    let email: String?
    let phone: String?
    let company: String?
    let jobTitle: String?
    let userId: String?
}

// MARK: - Update Employee Request
struct UpdateEmployeeRequest: Encodable {
    let name: String?
    let email: String?
    let phone: String?
    let company: String?
    let jobTitle: String?
    let isActive: Bool?
}

// MARK: - Mock Data
extension Employee {
    static let mockEmployees: [Employee] = [
        Employee(
            id: "emp-1",
            name: "Mike Johnson",
            email: "mike@contractor.com",
            phone: "555-0101",
            company: "Johnson Electric",
            jobTitle: "Electrician",
            userId: nil,
            isActive: true,
            createdAt: Date(),
            updatedAt: nil,
            user: nil
        ),
        Employee(
            id: "emp-2",
            name: "Sarah Wilson",
            email: "sarah@plumbing.com",
            phone: "555-0102",
            company: "Wilson Plumbing",
            jobTitle: "Plumber",
            userId: nil,
            isActive: true,
            createdAt: Date(),
            updatedAt: nil,
            user: nil
        ),
        Employee(
            id: "emp-3",
            name: "Tom Davis",
            email: nil,
            phone: "555-0103",
            company: nil,
            jobTitle: "Laborer",
            userId: nil,
            isActive: true,
            createdAt: Date(),
            updatedAt: nil,
            user: nil
        ),
        Employee(
            id: "emp-4",
            name: "Lisa Chen",
            email: "lisa@construction.com",
            phone: "555-0104",
            company: nil,
            jobTitle: "Carpenter",
            userId: nil,
            isActive: true,
            createdAt: Date(),
            updatedAt: nil,
            user: nil
        ),
        Employee(
            id: "emp-5",
            name: "Carlos Rodriguez",
            email: nil,
            phone: "555-0105",
            company: "Rodriguez HVAC",
            jobTitle: "HVAC Tech",
            userId: nil,
            isActive: true,
            createdAt: Date(),
            updatedAt: nil,
            user: nil
        )
    ]
}
