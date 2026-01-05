//
//  SchedulingView.swift
//  ConstructionManager
//
//  Crew scheduling view
//

import SwiftUI

struct SchedulingView: View {
    @StateObject private var scheduleService = ScheduleService.shared
    @State private var selectedDate = Date()
    @State private var viewMode: ViewMode = .week
    @State private var showingNewSchedule = false
    @State private var selectedSchedule: Schedule?

    enum ViewMode: String, CaseIterable {
        case day = "Day"
        case week = "Week"

        var displayName: String {
            switch self {
            case .day: return "scheduling.viewDay".localized
            case .week: return "scheduling.viewWeek".localized
            }
        }
    }

    private var schedulesForSelectedDate: [Schedule] {
        scheduleService.schedulesForDate(selectedDate)
    }

    private var weekDates: [Date] {
        let calendar = Calendar.current
        guard let startOfWeek = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: selectedDate)) else {
            return [selectedDate]  // Fallback to just selected date
        }
        return (0..<7).compactMap { calendar.date(byAdding: .day, value: $0, to: startOfWeek) }
    }

    var body: some View {
        VStack(spacing: 0) {
            // View mode toggle
            Picker("scheduling.viewMode".localized, selection: $viewMode) {
                ForEach(ViewMode.allCases, id: \.self) { mode in
                    Text(mode.displayName).tag(mode)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, AppSpacing.md)
            .padding(.vertical, AppSpacing.sm)

            // Date navigation
            dateNavigator

            // Calendar/Week view
            if viewMode == .week {
                weekView
            }

            // Schedules list
            if scheduleService.isLoading && scheduleService.schedules.isEmpty {
                loadingView
            } else if schedulesForSelectedDate.isEmpty {
                emptyView
            } else {
                schedulesList
            }
        }
        .background(AppColors.background)
        .navigationTitle("scheduling.title".localized)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: { showingNewSchedule = true }) {
                    Image(systemName: "plus")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(AppColors.primary600)
                }
            }
        }
        .sheet(isPresented: $showingNewSchedule) {
            NewScheduleView()
        }
        .sheet(item: $selectedSchedule) { schedule in
            ScheduleDetailView(schedule: schedule)
        }
        .task {
            await scheduleService.fetchWeekSchedules()
        }
    }

    private var dateNavigator: some View {
        HStack {
            Button(action: { navigateDate(by: -1) }) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(AppColors.primary600)
            }

            Spacer()

            Text(formattedDateRange)
                .font(AppTypography.bodySemibold)
                .foregroundColor(AppColors.textPrimary)

            Spacer()

            Button(action: { navigateDate(by: 1) }) {
                Image(systemName: "chevron.right")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(AppColors.primary600)
            }
        }
        .padding(.horizontal, AppSpacing.md)
        .padding(.vertical, AppSpacing.sm)
    }

    private var weekView: some View {
        HStack(spacing: AppSpacing.xs) {
            ForEach(weekDates, id: \.self) { date in
                WeekDayCell(
                    date: date,
                    isSelected: Calendar.current.isDate(date, inSameDayAs: selectedDate),
                    hasSchedules: !scheduleService.schedulesForDate(date).isEmpty
                )
                .onTapGesture {
                    selectedDate = date
                }
            }
        }
        .padding(.horizontal, AppSpacing.md)
        .padding(.bottom, AppSpacing.sm)
    }

    private var loadingView: some View {
        VStack {
            Spacer()
            ProgressView()
            Spacer()
        }
    }

    private var emptyView: some View {
        VStack(spacing: AppSpacing.md) {
            Spacer()
            Image(systemName: "calendar.badge.plus")
                .font(.system(size: 48))
                .foregroundColor(AppColors.gray300)
            Text("scheduling.noSchedules".localized)
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)
            Text("scheduling.noCrewScheduled".localized)
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)
            PrimaryButton("scheduling.createSchedule".localized, icon: "plus") {
                showingNewSchedule = true
            }
            .padding(.top, AppSpacing.sm)
            Spacer()
        }
        .padding(AppSpacing.xl)
    }

    private var schedulesList: some View {
        ScrollView {
            LazyVStack(spacing: AppSpacing.sm) {
                ForEach(schedulesForSelectedDate) { schedule in
                    ScheduleCard(schedule: schedule)
                        .onTapGesture {
                            selectedSchedule = schedule
                        }
                }
            }
            .padding(AppSpacing.md)
        }
        .refreshable {
            await scheduleService.fetchWeekSchedules()
        }
    }

    private var formattedDateRange: String {
        let formatter = DateFormatter()
        if viewMode == .week {
            formatter.dateFormat = "MMM d"
            guard let start = weekDates.first, let end = weekDates.last else {
                return formatter.string(from: selectedDate)
            }
            return "\(formatter.string(from: start)) - \(formatter.string(from: end))"
        } else {
            formatter.dateFormat = "EEEE, MMM d, yyyy"
            return formatter.string(from: selectedDate)
        }
    }

    private func navigateDate(by amount: Int) {
        let days = viewMode == .week ? amount * 7 : amount
        if let newDate = Calendar.current.date(byAdding: .day, value: days, to: selectedDate) {
            selectedDate = newDate
        }
    }
}

// MARK: - Week Day Cell
struct WeekDayCell: View {
    let date: Date
    let isSelected: Bool
    let hasSchedules: Bool

    private var dayFormatter: DateFormatter {
        let f = DateFormatter()
        f.dateFormat = "EEE"
        return f
    }

    private var dateFormatter: DateFormatter {
        let f = DateFormatter()
        f.dateFormat = "d"
        return f
    }

    private var isToday: Bool {
        Calendar.current.isDateInToday(date)
    }

    var body: some View {
        VStack(spacing: AppSpacing.xxs) {
            Text(dayFormatter.string(from: date))
                .font(AppTypography.caption)
                .foregroundColor(isSelected ? AppColors.primary600 : AppColors.textTertiary)

            ZStack {
                Circle()
                    .fill(isSelected ? AppColors.primary600 : (isToday ? AppColors.primary100 : Color.clear))
                    .frame(width: 36, height: 36)

                Text(dateFormatter.string(from: date))
                    .font(AppTypography.bodySemibold)
                    .foregroundColor(isSelected ? .white : (isToday ? AppColors.primary600 : AppColors.textPrimary))
            }

            if hasSchedules {
                Circle()
                    .fill(AppColors.primary600)
                    .frame(width: 6, height: 6)
            } else {
                Circle()
                    .fill(Color.clear)
                    .frame(width: 6, height: 6)
            }
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Schedule Card
struct ScheduleCard: View {
    let schedule: Schedule

    private var statusColor: Color {
        switch schedule.status {
        case .draft: return AppColors.gray500
        case .published: return AppColors.info
        case .confirmed: return AppColors.success
        case .cancelled: return AppColors.error
        }
    }

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                // Header
                HStack {
                    Text(schedule.projectName ?? "scheduling.project".localized)
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                    Spacer()
                    Text(schedule.status.displayName)
                        .font(AppTypography.caption)
                        .foregroundColor(statusColor)
                        .padding(.horizontal, AppSpacing.xs)
                        .padding(.vertical, 2)
                        .background(statusColor.opacity(0.15))
                        .cornerRadius(4)
                }

                // Time
                if let timeRange = schedule.formattedTimeRange {
                    HStack(spacing: AppSpacing.xs) {
                        Image(systemName: "clock")
                            .font(.system(size: 12))
                            .foregroundColor(AppColors.textTertiary)
                        Text(timeRange)
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                    }
                }

                // Crew count
                HStack(spacing: AppSpacing.xs) {
                    Image(systemName: "person.2")
                        .font(.system(size: 12))
                        .foregroundColor(AppColors.textTertiary)
                    Text(String(format: "scheduling.confirmedCount".localized, schedule.confirmedCount, schedule.crewCount))
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                }

                // Notes
                if let notes = schedule.notes, !notes.isEmpty {
                    Text(notes)
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textTertiary)
                        .lineLimit(2)
                }

                // Crew avatars placeholder
                if let assignments = schedule.crewAssignments, !assignments.isEmpty {
                    HStack(spacing: -8) {
                        ForEach(assignments.prefix(5)) { assignment in
                            ZStack {
                                Circle()
                                    .fill(AppColors.gray200)
                                    .frame(width: 28, height: 28)
                                Text(String(assignment.userName?.prefix(1) ?? "?"))
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(AppColors.textSecondary)
                            }
                            .overlay(
                                Circle()
                                    .stroke(AppColors.cardBackground, lineWidth: 2)
                            )
                        }
                        if assignments.count > 5 {
                            ZStack {
                                Circle()
                                    .fill(AppColors.gray300)
                                    .frame(width: 28, height: 28)
                                Text("+\(assignments.count - 5)")
                                    .font(.system(size: 10, weight: .medium))
                                    .foregroundColor(AppColors.textPrimary)
                            }
                            .overlay(
                                Circle()
                                    .stroke(AppColors.cardBackground, lineWidth: 2)
                            )
                        }
                    }
                }
            }
        }
    }
}

// MARK: - New Schedule View
struct NewScheduleView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var scheduleService = ScheduleService.shared

    @State private var selectedProject: Project?
    @State private var showingProjectPicker = false
    @State private var scheduleDate = Date()
    @State private var startTime = Calendar.current.date(bySettingHour: 7, minute: 0, second: 0, of: Date()) ?? Date()
    @State private var endTime = Calendar.current.date(bySettingHour: 16, minute: 0, second: 0, of: Date()) ?? Date()
    @State private var notes = ""
    @State private var status: ScheduleStatus = .draft
    @State private var isSaving = false
    @State private var errorMessage: String?

    var isFormValid: Bool {
        selectedProject != nil
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Project Selection
                    VStack(alignment: .leading, spacing: AppSpacing.sm) {
                        HStack {
                            Text("scheduling.project".localized)
                                .font(AppTypography.heading3)
                                .foregroundColor(AppColors.textPrimary)
                            Text("*")
                                .foregroundColor(AppColors.error)
                        }

                        Button(action: { showingProjectPicker = true }) {
                            HStack {
                                if let project = selectedProject {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(project.name)
                                            .font(AppTypography.body)
                                            .foregroundColor(AppColors.textPrimary)
                                        if !project.address.isEmpty {
                                            Text(project.address)
                                                .font(AppTypography.caption)
                                                .foregroundColor(AppColors.textSecondary)
                                        }
                                    }
                                } else {
                                    Text("scheduling.selectProject".localized)
                                        .font(AppTypography.body)
                                        .foregroundColor(AppColors.textSecondary)
                                }
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 14))
                                    .foregroundColor(AppColors.textTertiary)
                            }
                            .padding()
                            .background(AppColors.gray100)
                            .cornerRadius(AppSpacing.radiusSmall)
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                    .sheet(isPresented: $showingProjectPicker) {
                        ScheduleProjectPickerSheet(selectedProject: $selectedProject)
                    }

                    // Date
                    VStack(alignment: .leading, spacing: AppSpacing.sm) {
                        Text("scheduling.date".localized)
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        DatePicker("", selection: $scheduleDate, displayedComponents: .date)
                            .datePickerStyle(.graphical)
                            .padding()
                            .background(AppColors.cardBackground)
                            .cornerRadius(AppSpacing.radiusMedium)
                    }

                    // Time Range
                    VStack(alignment: .leading, spacing: AppSpacing.sm) {
                        Text("scheduling.workHours".localized)
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        HStack(spacing: AppSpacing.md) {
                            VStack(alignment: .leading, spacing: AppSpacing.xs) {
                                Text("scheduling.start".localized)
                                    .font(AppTypography.label)
                                    .foregroundColor(AppColors.textSecondary)
                                DatePicker("", selection: $startTime, displayedComponents: .hourAndMinute)
                                    .datePickerStyle(.compact)
                                    .labelsHidden()
                            }

                            VStack(alignment: .leading, spacing: AppSpacing.xs) {
                                Text("scheduling.end".localized)
                                    .font(AppTypography.label)
                                    .foregroundColor(AppColors.textSecondary)
                                DatePicker("", selection: $endTime, displayedComponents: .hourAndMinute)
                                    .datePickerStyle(.compact)
                                    .labelsHidden()
                            }
                        }
                    }

                    // Status
                    VStack(alignment: .leading, spacing: AppSpacing.sm) {
                        Text("scheduling.status".localized)
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        HStack(spacing: AppSpacing.xs) {
                            ForEach([ScheduleStatus.draft, .published], id: \.self) { s in
                                Button(action: { status = s }) {
                                    Text(s.displayName)
                                        .font(AppTypography.secondaryMedium)
                                        .padding(.horizontal, AppSpacing.md)
                                        .padding(.vertical, AppSpacing.sm)
                                        .foregroundColor(status == s ? .white : statusColor(s))
                                        .background(status == s ? statusColor(s) : statusColor(s).opacity(0.15))
                                        .cornerRadius(AppSpacing.radiusFull)
                                }
                            }
                        }
                    }

                    // Notes
                    AppTextArea(label: "scheduling.notes".localized, placeholder: "scheduling.notesPlaceholder".localized, text: $notes)

                    // Error message
                    if let error = errorMessage {
                        Text(error)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.error)
                            .padding(AppSpacing.sm)
                            .frame(maxWidth: .infinity)
                            .background(AppColors.error.opacity(0.1))
                            .cornerRadius(AppSpacing.radiusSmall)
                    }

                    // Submit
                    PrimaryButton("scheduling.createSchedule".localized, icon: "calendar.badge.plus", isLoading: isSaving) {
                        Task { await saveSchedule() }
                    }
                    .disabled(!isFormValid)
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("scheduling.createSchedule".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("common.cancel".localized) { dismiss() }
                }
            }
        }
    }

    private func statusColor(_ s: ScheduleStatus) -> Color {
        switch s {
        case .draft: return AppColors.gray500
        case .published: return AppColors.info
        case .confirmed: return AppColors.success
        case .cancelled: return AppColors.error
        }
    }

    private func saveSchedule() async {
        guard let project = selectedProject else { return }
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }

        let schedule = Schedule(
            id: UUID().uuidString,
            projectId: project.id,
            projectName: project.name,
            date: scheduleDate,
            startTime: startTime,
            endTime: endTime,
            status: status,
            notes: notes.isEmpty ? nil : notes,
            crewAssignments: nil,
            createdBy: nil,
            createdAt: Date(),
            updatedAt: Date()
        )

        let success = await scheduleService.createSchedule(schedule)

        if success {
            dismiss()
        } else {
            errorMessage = scheduleService.error ?? "Failed to create schedule"
        }
    }
}

// MARK: - Schedule Project Picker
struct ScheduleProjectPickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var selectedProject: Project?

    var body: some View {
        NavigationStack {
            List {
                ForEach(ProjectService.shared.projects) { project in
                    Button(action: {
                        selectedProject = project
                        dismiss()
                    }) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(project.name)
                                    .font(AppTypography.body)
                                    .foregroundColor(AppColors.textPrimary)
                                if !project.address.isEmpty {
                                    Text(project.address)
                                        .font(AppTypography.caption)
                                        .foregroundColor(AppColors.textSecondary)
                                }
                            }
                            Spacer()
                            if selectedProject?.id == project.id {
                                Image(systemName: "checkmark")
                                    .foregroundColor(AppColors.primary600)
                            }
                        }
                    }
                }
            }
            .navigationTitle("scheduling.selectProjectTitle".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("common.cancel".localized) { dismiss() }
                }
            }
        }
    }
}

// MARK: - Schedule Detail View (Placeholder)
struct ScheduleDetailView: View {
    let schedule: Schedule
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: AppSpacing.md) {
                    Text(schedule.projectName ?? "scheduling.schedule".localized)
                        .font(AppTypography.heading2)
                    Text(schedule.formattedDate)
                        .font(AppTypography.secondary)
                    if let notes = schedule.notes {
                        Text(notes)
                    }
                }
                .padding()
            }
            .navigationTitle("scheduling.details".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("common.done".localized) { dismiss() }
                }
            }
        }
    }
}

#Preview {
    NavigationStack {
        SchedulingView()
    }
}
