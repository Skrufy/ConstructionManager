//
//  NewDailyLogView.swift
//  ConstructionManager
//
//  Daily log creation wizard
//

import SwiftUI

struct NewDailyLogView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel: NewDailyLogViewModel

    init(preselectedProject: Project? = nil) {
        _viewModel = StateObject(wrappedValue: NewDailyLogViewModel(preselectedProject: preselectedProject))
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AppColors.background.ignoresSafeArea()

                VStack(spacing: 0) {
                    // Progress Indicator
                    progressBar

                    // Content
                    TabView(selection: $viewModel.currentStep) {
                        StepOneView(viewModel: viewModel)
                            .tag(1)

                        StepTwoView(viewModel: viewModel)
                            .tag(2)
                    }
                    .tabViewStyle(.page(indexDisplayMode: .never))
                    .animation(.easeInOut, value: viewModel.currentStep)

                    // Navigation Buttons
                    navigationButtons
                }
            }
            .navigationTitle(viewModel.currentStep == 1 ? "Select Project" : "Log Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(AppColors.textSecondary)
                }
            }
            .alert("Error", isPresented: $viewModel.showError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(viewModel.errorMessage)
            }
            .overlay {
                if viewModel.isSubmitting {
                    submittingOverlay
                }
            }
            .onChange(of: viewModel.didSubmitSuccessfully) { _, success in
                if success {
                    dismiss()
                }
            }
        }
    }

    // MARK: - Progress Bar
    private var progressBar: some View {
        HStack(spacing: AppSpacing.xs) {
            ForEach(1...2, id: \.self) { step in
                Capsule()
                    .fill(step <= viewModel.currentStep ? AppColors.primary600 : AppColors.gray200)
                    .frame(height: 4)
            }
        }
        .padding(.horizontal, AppSpacing.md)
        .padding(.vertical, AppSpacing.sm)
    }

    // MARK: - Navigation Buttons
    private var navigationButtons: some View {
        HStack(spacing: AppSpacing.sm) {
            if viewModel.currentStep > 1 {
                SecondaryButton("Back", icon: "chevron.left") {
                    withAnimation {
                        viewModel.currentStep -= 1
                    }
                }
            }

            if viewModel.currentStep < 2 {
                PrimaryButton("Continue", icon: "chevron.right") {
                    viewModel.goToNextStep()
                }
            } else {
                PrimaryButton("Submit Log", icon: "checkmark", isLoading: viewModel.isSubmitting) {
                    viewModel.submitLog()
                }
            }
        }
        .padding(AppSpacing.md)
        .background(AppColors.cardBackground)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: -2)
    }

    // MARK: - Submitting Overlay
    private var submittingOverlay: some View {
        ZStack {
            Color.black.opacity(0.4)
                .ignoresSafeArea()

            VStack(spacing: AppSpacing.md) {
                ProgressView()
                    .scaleEffect(1.5)
                    .tint(.white)
                Text(viewModel.submittingMessage)
                    .font(AppTypography.bodySemibold)
                    .foregroundColor(.white)
            }
            .padding(AppSpacing.xl)
            .background(AppColors.gray800)
            .cornerRadius(AppSpacing.radiusLarge)
        }
    }
}

// MARK: - Step 1: Project Selection + Weather
struct StepOneView: View {
    @ObservedObject var viewModel: NewDailyLogViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AppSpacing.lg) {
                // Date Section
                dateSection

                // Weather Card (if project selected)
                if let weather = viewModel.weather {
                    weatherCard(weather)
                }

                // Project Selection
                projectSelectionSection
            }
            .padding(AppSpacing.md)
        }
    }

    private var dateSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.xs) {
            Text("Date")
                .font(AppTypography.label)
                .foregroundColor(AppColors.textPrimary)

            DatePicker(
                "",
                selection: $viewModel.selectedDate,
                in: ...Date(),
                displayedComponents: .date
            )
            .datePickerStyle(.compact)
            .labelsHidden()
            .padding(AppSpacing.sm)
            .background(AppColors.cardBackground)
            .cornerRadius(AppSpacing.radiusLarge)
            .overlay(
                RoundedRectangle(cornerRadius: AppSpacing.radiusLarge)
                    .stroke(AppColors.gray300, lineWidth: 1.5)
            )
        }
    }

    private func weatherCard(_ weather: WeatherData) -> some View {
        AppCard {
            VStack(spacing: AppSpacing.sm) {
                HStack {
                    Text("Current Weather")
                        .font(AppTypography.labelSmall)
                        .foregroundColor(AppColors.textSecondary)
                    Spacer()
                    if viewModel.isLoadingWeather {
                        ProgressView()
                            .scaleEffect(0.8)
                    }
                }

                HStack(spacing: AppSpacing.lg) {
                    // Temperature + Icon
                    HStack(spacing: AppSpacing.sm) {
                        Image(systemName: weather.conditionIcon)
                            .font(.system(size: 36))
                            .foregroundColor(weatherIconColor(for: weather.condition))
                        VStack(alignment: .leading, spacing: 2) {
                            Text(weather.temperatureFormatted)
                                .font(.system(size: 28, weight: .bold))
                                .foregroundColor(AppColors.textPrimary)
                            Text(weather.condition)
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textSecondary)
                        }
                    }

                    Spacer()

                    // Details
                    VStack(alignment: .trailing, spacing: AppSpacing.xs) {
                        Label("\(weather.humidity)%", systemImage: "humidity.fill")
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                        Label("\(Int(weather.windSpeed)) mph", systemImage: "wind")
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                    }
                }
            }
        }
        .transition(.opacity.combined(with: .move(edge: .top)))
    }

    private func weatherIconColor(for condition: String) -> Color {
        let conditionLower = condition.lowercased()
        if conditionLower.contains("clear") || conditionLower.contains("sunny") {
            return .orange
        } else if conditionLower.contains("rain") {
            return AppColors.primary500
        } else if conditionLower.contains("cloud") {
            return AppColors.gray400
        } else {
            return AppColors.primary500
        }
    }

    private var projectSelectionSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("Select Project")
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)

            ForEach(viewModel.projects) { project in
                let isSelected = viewModel.selectedProject?.id == project.id
                TapCard(
                    isSelected: isSelected,
                    action: {
                        viewModel.selectProject(project)
                    }
                ) {
                    HStack(spacing: AppSpacing.md) {
                        IconCircle(
                            icon: "building.2.fill",
                            size: .medium,
                            foregroundColor: isSelected ? .white : AppColors.primary600,
                            backgroundColor: isSelected ? AppColors.primary600 : AppColors.primary50
                        )

                        VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                            Text(project.name)
                                .font(AppTypography.bodySemibold)
                                .foregroundColor(isSelected ? AppColors.primary600 : AppColors.textPrimary)
                            HStack(spacing: AppSpacing.xxs) {
                                Image(systemName: "mappin")
                                    .font(.system(size: 12))
                                Text(project.address)
                                    .font(AppTypography.secondary)
                            }
                            .foregroundColor(isSelected ? AppColors.primary500 : AppColors.textSecondary)
                        }

                        Spacer()

                        if isSelected {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 24))
                                .foregroundColor(AppColors.primary600)
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Step 2: Notes, Weather Delay, Photos
struct StepTwoView: View {
    @ObservedObject var viewModel: NewDailyLogViewModel
    @FocusState private var isNotesFocused: Bool

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AppSpacing.lg) {
                // Project Summary
                if let project = viewModel.selectedProject {
                    projectSummaryCard(project)
                }

                // Weather Delay Toggle
                weatherDelaySection

                // Notes Section
                notesSection

                // Photos Section
                PhotoCaptureView(
                    selectedPhotos: $viewModel.photos,
                    maxPhotos: 10
                )
            }
            .padding(AppSpacing.md)
        }
    }

    private func projectSummaryCard(_ project: Project) -> some View {
        AppCard {
            HStack(spacing: AppSpacing.md) {
                IconCircle(
                    icon: "building.2.fill",
                    size: .medium,
                    foregroundColor: AppColors.primary600,
                    backgroundColor: AppColors.primary50
                )

                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                    Text(project.name)
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)

                    Text(viewModel.formattedDate)
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                }

                Spacer()

                if let weather = viewModel.weather {
                    VStack(alignment: .trailing, spacing: 2) {
                        Image(systemName: weather.conditionIcon)
                            .font(.system(size: 20))
                            .foregroundColor(AppColors.primary500)
                        Text(weather.temperatureFormatted)
                            .font(AppTypography.secondaryMedium)
                            .foregroundColor(AppColors.textSecondary)
                    }
                }
            }
        }
    }

    private var weatherDelaySection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("Weather Delays")
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)

            HStack(spacing: AppSpacing.sm) {
                // No Delay Button
                Button(action: { viewModel.weatherDelay = false }) {
                    HStack(spacing: AppSpacing.xs) {
                        Image(systemName: viewModel.weatherDelay ? "circle" : "checkmark.circle.fill")
                            .font(.system(size: 20))
                        Text("No delays")
                            .font(AppTypography.buttonSmall)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .foregroundColor(viewModel.weatherDelay ? AppColors.textSecondary : AppColors.success)
                    .background(viewModel.weatherDelay ? AppColors.gray100 : AppColors.successLight)
                    .cornerRadius(AppSpacing.radiusLarge)
                    .overlay(
                        RoundedRectangle(cornerRadius: AppSpacing.radiusLarge)
                            .stroke(viewModel.weatherDelay ? AppColors.gray200 : AppColors.success, lineWidth: 1.5)
                    )
                }

                // Weather Delay Button
                Button(action: { viewModel.weatherDelay = true }) {
                    HStack(spacing: AppSpacing.xs) {
                        Image(systemName: viewModel.weatherDelay ? "checkmark.circle.fill" : "circle")
                            .font(.system(size: 20))
                        Text("Weather delay")
                            .font(AppTypography.buttonSmall)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .foregroundColor(viewModel.weatherDelay ? AppColors.warning : AppColors.textSecondary)
                    .background(viewModel.weatherDelay ? AppColors.warningLight : AppColors.gray100)
                    .cornerRadius(AppSpacing.radiusLarge)
                    .overlay(
                        RoundedRectangle(cornerRadius: AppSpacing.radiusLarge)
                            .stroke(viewModel.weatherDelay ? AppColors.warning : AppColors.gray200, lineWidth: 1.5)
                    )
                }
            }

            if viewModel.weatherDelay {
                HStack(spacing: AppSpacing.xs) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 14))
                    Text("Please describe the weather delay in the notes below.")
                        .font(AppTypography.secondary)
                }
                .foregroundColor(AppColors.warning)
                .padding(AppSpacing.sm)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(AppColors.warningLight)
                .cornerRadius(AppSpacing.radiusMedium)
            }
        }
    }

    private var notesSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.xs) {
            HStack(spacing: 4) {
                Text("Notes")
                    .font(AppTypography.label)
                    .foregroundColor(AppColors.textPrimary)
                if viewModel.weatherDelay {
                    Text("*")
                        .font(AppTypography.label)
                        .foregroundColor(AppColors.error)
                    Text("(Required)")
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.error)
                } else {
                    Text("(Optional)")
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textTertiary)
                }
            }

            ZStack(alignment: .topLeading) {
                if viewModel.notes.isEmpty {
                    Text(viewModel.weatherDelay
                         ? "Describe the weather conditions and impact on work..."
                         : "Any additional notes about today's work...")
                    .font(AppTypography.body)
                    .foregroundColor(AppColors.textTertiary)
                    .padding(.horizontal, AppSpacing.md)
                    .padding(.vertical, AppSpacing.sm + 2)
                }

                TextEditor(text: $viewModel.notes)
                    .font(AppTypography.body)
                    .foregroundColor(AppColors.textPrimary)
                    .focused($isNotesFocused)
                    .scrollContentBackground(.hidden)
                    .padding(.horizontal, AppSpacing.xs)
                    .padding(.vertical, AppSpacing.xxs)
            }
            .frame(minHeight: 120)
            .background(AppColors.cardBackground)
            .cornerRadius(AppSpacing.radiusLarge)
            .overlay(
                RoundedRectangle(cornerRadius: AppSpacing.radiusLarge)
                    .stroke(
                        viewModel.weatherDelay && viewModel.notes.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                        ? AppColors.warning
                        : (isNotesFocused ? AppColors.primary600 : AppColors.gray300),
                        lineWidth: isNotesFocused ? 2 : 1.5
                    )
            )
        }
    }
}

#Preview {
    NewDailyLogView()
}
