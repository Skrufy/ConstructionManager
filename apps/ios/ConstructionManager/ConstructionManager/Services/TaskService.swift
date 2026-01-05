//
//  TaskService.swift
//  ConstructionManager
//
//  Service for managing tasks and RFIs
//

import Foundation
import Combine

@MainActor
class TaskService: ObservableObject {
    static let shared = TaskService()

    @Published var tasks: [ProjectTask] = []
    @Published var rfis: [RFI] = []
    @Published var isLoading = false
    @Published var error: String?

    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Fetch Tasks

    func fetchTasks(projectId: String? = nil, status: TaskStatus? = nil, assigneeId: String? = nil) async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            var endpoint = "/tasks"
            var params: [String] = []

            if let projectId = projectId {
                params.append("project_id=\(projectId)")
            }
            if let status = status {
                params.append("status=\(status.rawValue)")
            }
            if let assigneeId = assigneeId {
                params.append("assignee_id=\(assigneeId)")
            }

            if !params.isEmpty {
                endpoint += "?" + params.joined(separator: "&")
            }

            print("[TaskService] 📥 Fetching tasks from \(endpoint)")
            let response: TasksResponse = try await apiClient.get(endpoint)
            print("[TaskService] ✅ Fetched \(response.tasks.count) tasks from API")
            tasks = response.tasks
        } catch {
            print("[TaskService] ❌ Failed to fetch tasks: \(error)")
            self.error = error.localizedDescription
            // Don't fall back to mock data - show the real error
            // tasks = ProjectTask.mockTasks
        }
    }

    // MARK: - Create Task

    func createTask(_ task: ProjectTask) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            print("[TaskService] 📤 Creating task: \(task.title) for project: \(task.projectId)")
            let createdTask: ProjectTask = try await apiClient.post("/tasks", body: task)
            print("[TaskService] ✅ Task created with ID: \(createdTask.id)")
            await fetchTasks()
            return true
        } catch {
            print("[TaskService] ❌ Failed to create task: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }

    // MARK: - Update Task

    func updateTask(_ task: ProjectTask) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let _: ProjectTask = try await apiClient.put("/tasks/\(task.id)", body: task)
            await fetchTasks()
            return true
        } catch {
            print("Failed to update task: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }

    // MARK: - Update Task Status

    func updateTaskStatus(taskId: String, status: TaskStatus) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let body = ["status": status.rawValue]
            let _: ProjectTask = try await apiClient.patch("/tasks/\(taskId)", body: body)
            if let index = tasks.firstIndex(where: { $0.id == taskId }) {
                // Update local state
                await fetchTasks()
            }
            return true
        } catch {
            print("Failed to update task status: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }

    // MARK: - Toggle Subtask

    func toggleSubtask(taskId: String, subtaskId: String, completed: Bool) async -> Bool {
        do {
            let body = ToggleSubtaskRequest(completed: completed)
            let _: ProjectTask = try await apiClient.patch("/tasks/\(taskId)/subtasks/\(subtaskId)", body: body)
            await fetchTasks()
            return true
        } catch {
            print("Failed to toggle subtask: \(error)")
            return false
        }
    }

    // MARK: - Delete Task

    func deleteTask(id: String) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            try await apiClient.delete("/tasks/\(id)")
            tasks.removeAll { $0.id == id }
            return true
        } catch {
            print("Failed to delete task: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }

    // MARK: - RFI Methods

    func fetchRFIs(projectId: String? = nil, status: RFIStatus? = nil) async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            var endpoint = "/rfis"
            var params: [String] = []

            if let projectId = projectId {
                params.append("project_id=\(projectId)")
            }
            if let status = status {
                params.append("status=\(status.rawValue)")
            }

            if !params.isEmpty {
                endpoint += "?" + params.joined(separator: "&")
            }

            print("[TaskService] 📥 Fetching RFIs from \(endpoint)")
            let response: RFIsResponse = try await apiClient.get(endpoint)
            print("[TaskService] ✅ Fetched \(response.rfis.count) RFIs from API")
            rfis = response.rfis
        } catch {
            print("[TaskService] ❌ Failed to fetch RFIs: \(error)")
            self.error = error.localizedDescription
            // Don't fall back to mock data - show the real error
            // rfis = RFI.mockRFIs
        }
    }

    func createRFI(_ rfi: RFI) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            print("[TaskService] 📤 Creating RFI: \(rfi.subject) for project: \(rfi.projectId)")
            let createdRFI: RFI = try await apiClient.post("/rfis", body: rfi)
            print("[TaskService] ✅ RFI created with ID: \(createdRFI.id)")
            await fetchRFIs()
            return true
        } catch {
            print("[TaskService] ❌ Failed to create RFI: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }

    func answerRFI(rfiId: String, answer: String) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let body = ["answer": answer, "status": RFIStatus.answered.rawValue]
            let _: RFI = try await apiClient.patch("/rfis/\(rfiId)", body: body)
            await fetchRFIs()
            return true
        } catch {
            print("Failed to answer RFI: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }

    func closeRFI(rfiId: String) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let body = ["status": RFIStatus.closed.rawValue]
            let _: RFI = try await apiClient.patch("/rfis/\(rfiId)", body: body)
            await fetchRFIs()
            return true
        } catch {
            print("Failed to close RFI: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }

    func updateRFIStatus(rfiId: String, status: RFIStatus) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let body = ["status": status.rawValue]
            let _: RFI = try await apiClient.patch("/rfis/\(rfiId)", body: body)
            await fetchRFIs()
            return true
        } catch {
            print("Failed to update RFI status: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }

    func deleteRFI(id: String) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            try await apiClient.delete("/rfis/\(id)")
            rfis.removeAll { $0.id == id }
            return true
        } catch {
            print("Failed to delete RFI: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }

    // MARK: - Statistics

    var openTasksCount: Int {
        tasks.filter { $0.status == .todo || $0.status == .inProgress }.count
    }

    var overdueTasksCount: Int {
        tasks.filter { $0.isOverdue }.count
    }

    var openRFIsCount: Int {
        rfis.filter { $0.status != .answered && $0.status != .closed }.count
    }
}

// MARK: - Response Models
private struct TasksResponse: Decodable {
    let tasks: [ProjectTask]
    let page: Int?
    let pageSize: Int?
    let total: Int?
    let totalPages: Int?
}

private struct RFIsResponse: Decodable {
    let rfis: [RFI]
    let page: Int?
    let pageSize: Int?
    let total: Int?
    let totalPages: Int?
}

// MARK: - Request Models
private struct ToggleSubtaskRequest: Encodable {
    let completed: Bool
}
