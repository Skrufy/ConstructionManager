//
//  NewDailyLogViewModel.swift
//  ConstructionManager
//
//  ViewModel for Daily Log creation wizard
//

import SwiftUI
import Combine

@MainActor
class NewDailyLogViewModel: ObservableObject {
    // MARK: - Step Management
    @Published var currentStep = 1
    let totalSteps = 2

    // MARK: - Step 1: Project Selection
    @Published var projects: [Project] = []
    @Published var isLoadingProjects = false
    @Published var selectedProject: Project?
    @Published var selectedDate = Date()

    private let projectService = ProjectService.shared

    init(preselectedProject: Project? = nil) {
        if let project = preselectedProject {
            self.selectedProject = project
            // Skip to step 2 if project is preselected
            self.currentStep = 2
            // Fetch weather for the project location
            Task { @MainActor in
                self.fetchWeather(for: project)
            }
        }
        // Fetch projects from API
        Task { @MainActor in
            await self.fetchProjects()
        }
    }

    func fetchProjects() async {
        isLoadingProjects = true
        await projectService.fetchProjects()
        projects = projectService.projects
        isLoadingProjects = false
    }

    // MARK: - Weather
    @Published var weather: WeatherData?
    @Published var isLoadingWeather = false

    // MARK: - Step 2: Details
    @Published var weatherDelay = false
    @Published var notes = ""
    @Published var photos: [UIImage] = []

    // MARK: - Submission
    @Published var isSubmitting = false
    @Published var submittingMessage = "Saving log..."
    @Published var didSubmitSuccessfully = false

    // MARK: - Error Handling
    @Published var showError = false
    @Published var errorMessage = ""

    private let weatherService = WeatherService.shared
    private let dailyLogService = DailyLogService.shared

    // MARK: - Computed Properties
    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMMM d, yyyy"
        return formatter.string(from: selectedDate)
    }

    var canProceedFromStep1: Bool {
        selectedProject != nil
    }

    var canSubmit: Bool {
        guard selectedProject != nil else { return false }
        if weatherDelay && notes.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return false
        }
        return true
    }

    // MARK: - Actions
    func selectProject(_ project: Project) {
        selectedProject = project
        fetchWeather(for: project)
    }

    func fetchWeather(for project: Project) {
        isLoadingWeather = true

        Task {
            let weatherData = await weatherService.fetchWeatherForProject(project)
            await MainActor.run {
                withAnimation {
                    self.weather = weatherData
                    self.isLoadingWeather = false
                }
            }
        }
    }

    func goToNextStep() {
        // Validate current step
        switch currentStep {
        case 1:
            guard canProceedFromStep1 else {
                showError(message: "Please select a project")
                return
            }
        default:
            break
        }

        withAnimation {
            currentStep = min(currentStep + 1, totalSteps)
        }
    }

    func goToPreviousStep() {
        withAnimation {
            currentStep = max(currentStep - 1, 1)
        }
    }

    func submitLog() {
        // Validate
        guard let project = selectedProject else {
            showError(message: "Please select a project")
            return
        }

        if weatherDelay && notes.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            showError(message: "Notes are required when reporting a weather delay")
            return
        }

        isSubmitting = true
        submittingMessage = "Saving log..."

        Task {
            do {
                // Create the daily log via API
                let newLog = try await dailyLogService.createDailyLog(
                    projectId: project.id,
                    date: selectedDate,
                    notes: notes.isEmpty ? nil : notes,
                    weatherDelay: weatherDelay,
                    weatherDelayNotes: weatherDelay ? notes : nil,
                    crewCount: 0,
                    totalHours: 0,
                    status: "SUBMITTED"
                )

                print("Created daily log: \(newLog.id)")

                // TODO: Upload photos if any
                if !photos.isEmpty {
                    await MainActor.run {
                        submittingMessage = "Uploading photos..."
                    }
                    // Photo upload would go here
                }

                await MainActor.run {
                    isSubmitting = false
                    didSubmitSuccessfully = true
                }
            } catch {
                await MainActor.run {
                    isSubmitting = false
                    showError(message: "Failed to save log: \(error.localizedDescription)")
                }
            }
        }
    }

    private func showError(message: String) {
        errorMessage = message
        showError = true
    }
}
