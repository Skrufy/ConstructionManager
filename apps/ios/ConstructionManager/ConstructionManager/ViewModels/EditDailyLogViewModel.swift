//
//  EditDailyLogViewModel.swift
//  ConstructionManager
//
//  ViewModel for editing existing daily logs
//

import SwiftUI
import Combine

@MainActor
class EditDailyLogViewModel: ObservableObject {
    // MARK: - Original Log Reference
    let originalLog: DailyLog

    // MARK: - Editable Fields
    @Published var selectedDate: Date
    @Published var notes: String
    @Published var weatherDelay: Bool
    @Published var weatherDelayNotes: String
    @Published var crewCount: Int
    @Published var totalHours: Double

    // MARK: - Work Entries
    @Published var workEntries: [WorkEntryForm] = []

    // MARK: - Materials
    @Published var materials: [MaterialEntryForm] = []

    // MARK: - Issues
    @Published var issues: [IssueEntryForm] = []

    // MARK: - Visitors
    @Published var visitors: [VisitorEntryForm] = []

    // MARK: - Photos (local only for now)
    @Published var newPhotos: [UIImage] = []

    // MARK: - Weather
    @Published var weather: WeatherData?
    @Published var isLoadingWeather = false

    // MARK: - Submission State
    @Published var isSaving = false
    @Published var savingMessage = "Saving changes..."
    @Published var didSaveSuccessfully = false

    // MARK: - Error Handling
    @Published var showError = false
    @Published var errorMessage = ""

    // MARK: - Dirty State Tracking
    var hasChanges: Bool {
        notes != (originalLog.notes ?? "") ||
        weatherDelay != originalLog.weatherDelay ||
        weatherDelayNotes != (originalLog.weatherDelayNotes ?? "") ||
        crewCount != originalLog.crewCount ||
        Int(totalHours) != Int(originalLog.totalHours) ||
        !workEntries.isEmpty ||
        !materials.isEmpty ||
        !issues.isEmpty ||
        !visitors.isEmpty ||
        !newPhotos.isEmpty
    }

    private let dailyLogService = DailyLogService.shared
    private let weatherService = WeatherService.shared

    // MARK: - Initialization
    init(log: DailyLog) {
        self.originalLog = log
        self.selectedDate = log.date
        self.notes = log.notes ?? ""
        self.weatherDelay = log.weatherDelay
        self.weatherDelayNotes = log.weatherDelayNotes ?? ""
        self.crewCount = log.crewCount
        self.totalHours = log.totalHours
        self.weather = log.weather

        // TODO: Fetch existing entries/materials/issues/visitors from API
        // For now, start with empty arrays - user can add new ones
        _ = Task { await fetchLogDetails() }
    }

    // MARK: - Fetch Full Log Details
    func fetchLogDetails() async {
        // In the future, this would fetch the full log with entries, materials, etc.
        // For now, we work with what we have
    }

    // MARK: - Weather
    func refreshWeather() async {
        let projectId = originalLog.projectId

        isLoadingWeather = true
        defer { isLoadingWeather = false }

        // Fetch project to get coordinates
        if let project = ProjectService.shared.projects.first(where: { $0.id == projectId }) {
            let weatherData = await weatherService.fetchWeatherForProject(project)
            await MainActor.run {
                withAnimation {
                    self.weather = weatherData
                }
            }
        }
    }

    // MARK: - Work Entries Management
    func addWorkEntry() {
        workEntries.append(WorkEntryForm())
    }

    func removeWorkEntry(at index: Int) {
        guard index >= 0 && index < workEntries.count else { return }
        workEntries.remove(at: index)
    }

    // MARK: - Materials Management
    func addMaterial() {
        materials.append(MaterialEntryForm())
    }

    func removeMaterial(at index: Int) {
        guard index >= 0 && index < materials.count else { return }
        materials.remove(at: index)
    }

    // MARK: - Issues Management
    func addIssue() {
        issues.append(IssueEntryForm())
    }

    func removeIssue(at index: Int) {
        guard index >= 0 && index < issues.count else { return }
        issues.remove(at: index)
    }

    // MARK: - Visitors Management
    func addVisitor() {
        visitors.append(VisitorEntryForm())
    }

    func removeVisitor(at index: Int) {
        guard index >= 0 && index < visitors.count else { return }
        visitors.remove(at: index)
    }

    // MARK: - Validation
    var canSave: Bool {
        // If weather delay is on, notes are required
        if weatherDelay && notes.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return false
        }

        // Validate work entries have required fields
        for entry in workEntries {
            if entry.activity.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                return false
            }
        }

        // Validate materials have required fields
        for material in materials {
            if material.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                return false
            }
        }

        // Validate issues have required fields
        for issue in issues {
            if issue.issueType.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                return false
            }
        }

        // Validate visitors have required fields
        for visitor in visitors {
            if visitor.visitorType.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                return false
            }
        }

        return true
    }

    // MARK: - Save Changes
    func saveChanges() async {
        guard canSave else {
            showError(message: "Please fill in all required fields")
            return
        }

        isSaving = true
        savingMessage = "Saving changes..."

        do {
            // Convert form data to API request format
            let entryRequests: [DailyLogEntryRequest] = workEntries.map { entry in
                DailyLogEntryRequest(
                    activity: entry.activity,
                    status: entry.status.isEmpty ? nil : entry.status,
                    locationBuilding: entry.locationBuilding.isEmpty ? nil : entry.locationBuilding,
                    locationFloor: entry.locationFloor.isEmpty ? nil : entry.locationFloor,
                    locationZone: entry.locationZone.isEmpty ? nil : entry.locationZone,
                    percentComplete: entry.percentComplete > 0 ? entry.percentComplete : nil,
                    notes: entry.notes.isEmpty ? nil : entry.notes
                )
            }

            let materialRequests: [DailyLogMaterialRequest] = materials.map { material in
                DailyLogMaterialRequest(
                    material: material.name,
                    quantity: material.quantity,
                    unit: material.unit.isEmpty ? "units" : material.unit,
                    notes: material.notes.isEmpty ? nil : material.notes
                )
            }

            let issueRequests: [DailyLogIssueRequest] = issues.map { issue in
                DailyLogIssueRequest(
                    issueType: issue.issueType,
                    delayHours: issue.delayHours,
                    description: issue.description.isEmpty ? nil : issue.description
                )
            }

            let visitorRequests: [DailyLogVisitorRequest] = visitors.map { visitor in
                DailyLogVisitorRequest(
                    visitorType: visitor.visitorType,
                    time: visitor.time.isEmpty ? nil : visitor.time,
                    result: visitor.result.isEmpty ? nil : visitor.result,
                    notes: visitor.notes.isEmpty ? nil : visitor.notes
                )
            }

            // Call the API to update the log
            _ = try await dailyLogService.updateDailyLogFull(
                id: originalLog.id,
                projectId: originalLog.projectId,
                date: selectedDate,
                notes: notes.isEmpty ? nil : notes,
                weatherDelay: weatherDelay,
                weatherDelayNotes: weatherDelay ? (weatherDelayNotes.isEmpty ? notes : weatherDelayNotes) : nil,
                crewCount: crewCount,
                totalHours: totalHours,
                entries: entryRequests.isEmpty ? nil : entryRequests,
                materials: materialRequests.isEmpty ? nil : materialRequests,
                issues: issueRequests.isEmpty ? nil : issueRequests,
                visitors: visitorRequests.isEmpty ? nil : visitorRequests,
                weatherData: weather
            )

            // Upload new photos if any
            if !newPhotos.isEmpty {
                savingMessage = "Uploading photos..."
                // Photo upload would go here in the future
            }

            isSaving = false
            didSaveSuccessfully = true
        } catch {
            isSaving = false
            showError(message: "Failed to save: \(error.localizedDescription)")
        }
    }

    // MARK: - Error Display
    private func showError(message: String) {
        errorMessage = message
        showError = true
    }
}

// MARK: - Form Models

struct WorkEntryForm: Identifiable {
    let id = UUID()
    var activity: String = ""
    var status: String = ""
    var locationBuilding: String = ""
    var locationFloor: String = ""
    var locationZone: String = ""
    var percentComplete: Int = 0
    var notes: String = ""
}

struct MaterialEntryForm: Identifiable {
    let id = UUID()
    var name: String = ""
    var quantity: Double = 0
    var unit: String = ""
    var notes: String = ""
}

struct IssueEntryForm: Identifiable {
    let id = UUID()
    var issueType: String = ""
    var delayHours: Double = 0
    var description: String = ""
}

struct VisitorEntryForm: Identifiable {
    let id = UUID()
    var visitorType: String = ""
    var time: String = ""
    var result: String = ""
    var notes: String = ""
}

