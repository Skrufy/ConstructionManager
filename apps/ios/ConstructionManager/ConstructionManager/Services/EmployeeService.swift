//
//  EmployeeService.swift
//  ConstructionManager
//
//  Service for managing employees (workers who may or may not have user accounts)
//

import Foundation
import SwiftUI
import Combine

@MainActor
class EmployeeService: ObservableObject {
    static let shared = EmployeeService()

    @Published var employees: [Employee] = []
    @Published var isLoading = false
    @Published var error: String?

    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Computed Properties

    var activeEmployees: [Employee] {
        employees.filter { $0.isActive }
    }

    var employeesByCompany: [String: [Employee]] {
        Dictionary(grouping: activeEmployees) { $0.displayCompany }
    }

    // MARK: - API Methods

    /// Fetch all employees from the API
    func fetchEmployees(search: String? = nil, activeOnly: Bool = true) async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            var endpoint = "/employees"
            var queryParams: [String] = []

            if let search = search, !search.isEmpty {
                queryParams.append("search=\(search.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? search)")
            }

            if !activeOnly {
                queryParams.append("active=all")
            }

            if !queryParams.isEmpty {
                endpoint += "?" + queryParams.joined(separator: "&")
            }

            let fetchedEmployees: [Employee] = try await apiClient.get(endpoint)
            self.employees = fetchedEmployees
        } catch {
            self.error = error.localizedDescription
            print("[EmployeeService] Error fetching employees: \(error)")
            // Fallback to mock data in development
            self.employees = Employee.mockEmployees
        }
    }

    /// Create a new employee
    func createEmployee(
        name: String,
        email: String? = nil,
        phone: String? = nil,
        company: String? = nil,
        jobTitle: String? = nil
    ) async throws -> Employee {
        let request = CreateEmployeeRequest(
            name: name,
            email: email,
            phone: phone,
            company: company,
            jobTitle: jobTitle,
            userId: nil
        )

        let newEmployee: Employee = try await apiClient.post("/employees", body: request)
        employees.insert(newEmployee, at: 0)
        employees.sort { $0.name.lowercased() < $1.name.lowercased() }
        return newEmployee
    }

    /// Update an existing employee
    func updateEmployee(
        id: String,
        name: String? = nil,
        email: String? = nil,
        phone: String? = nil,
        company: String? = nil,
        jobTitle: String? = nil,
        isActive: Bool? = nil
    ) async throws -> Employee {
        let request = UpdateEmployeeRequest(
            name: name,
            email: email,
            phone: phone,
            company: company,
            jobTitle: jobTitle,
            isActive: isActive
        )

        let updatedEmployee: Employee = try await apiClient.patch("/employees/\(id)", body: request)

        if let index = employees.firstIndex(where: { $0.id == id }) {
            employees[index] = updatedEmployee
        }

        return updatedEmployee
    }

    /// Deactivate an employee (soft delete)
    func deactivateEmployee(id: String) async throws {
        try await apiClient.delete("/employees/\(id)")
        employees.removeAll { $0.id == id }
    }

    /// Search employees by name
    func searchEmployees(_ query: String) -> [Employee] {
        guard !query.isEmpty else { return activeEmployees }

        let lowercaseQuery = query.lowercased()
        return activeEmployees.filter { employee in
            employee.name.lowercased().contains(lowercaseQuery) ||
            (employee.company?.lowercased().contains(lowercaseQuery) ?? false) ||
            (employee.jobTitle?.lowercased().contains(lowercaseQuery) ?? false)
        }
    }

    /// Get employee by ID
    func getEmployee(id: String) -> Employee? {
        employees.first { $0.id == id }
    }
}
