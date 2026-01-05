//
//  TasksView.swift
//  ConstructionManager
//
//  Tasks and RFIs view
//

import SwiftUI

struct TasksView: View {
    @StateObject private var taskService = TaskService.shared
    @State private var selectedTab: TaskTab = .tasks
    @State private var selectedTaskStatus: TaskStatus?
    @State private var selectedRFIStatus: RFIStatus?
    @State private var showingNewTask = false
    @State private var showingNewRFI = false
    @State private var selectedTask: ProjectTask?
    @State private var selectedRFI: RFI?

    enum TaskTab: String, CaseIterable {
        case tasks
        case rfis

        var displayName: String {
            switch self {
            case .tasks: return "tasks.tab".localized
            case .rfis: return "RFIs"
            }
        }
    }

    private var filteredTasks: [ProjectTask] {
        var result = taskService.tasks
        if let status = selectedTaskStatus {
            result = result.filter { $0.status == status }
        }
        return result.sorted { ($0.dueDate ?? .distantFuture) < ($1.dueDate ?? .distantFuture) }
    }

    private var filteredRFIs: [RFI] {
        var result = taskService.rfis
        if let status = selectedRFIStatus {
            result = result.filter { $0.status == status }
        }
        return result.sorted { ($0.dueDate ?? .distantFuture) < ($1.dueDate ?? .distantFuture) }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Tab picker
            Picker("Type", selection: $selectedTab) {
                Text(String(format: "tasks.tasksCount".localized, taskService.openTasksCount))
                    .tag(TaskTab.tasks)
                Text(String(format: "tasks.rfisCount".localized, taskService.openRFIsCount))
                    .tag(TaskTab.rfis)
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, AppSpacing.md)
            .padding(.vertical, AppSpacing.sm)

            // Filters
            if selectedTab == .tasks {
                taskFilters
            } else {
                rfiFilters
            }

            // Content
            if taskService.isLoading && taskService.tasks.isEmpty && taskService.rfis.isEmpty {
                loadingView
            } else if selectedTab == .tasks {
                tasksContent
            } else {
                rfisContent
            }
        }
        .background(AppColors.background)
        .navigationTitle("tasks.title".localized)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: {
                    if selectedTab == .tasks {
                        showingNewTask = true
                    } else {
                        showingNewRFI = true
                    }
                }) {
                    Image(systemName: "plus")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(AppColors.primary600)
                }
            }
        }
        .sheet(isPresented: $showingNewTask, onDismiss: {
            Task { await taskService.fetchTasks() }
        }) {
            NewTaskView()
        }
        .sheet(isPresented: $showingNewRFI, onDismiss: {
            Task { await taskService.fetchRFIs() }
        }) {
            NewRFIView()
        }
        .sheet(item: $selectedTask) { task in
            TaskDetailView(task: task)
        }
        .sheet(item: $selectedRFI) { rfi in
            RFIDetailView(rfi: rfi)
        }
        .task {
            await taskService.fetchTasks()
            await taskService.fetchRFIs()
        }
    }

    private var taskFilters: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: AppSpacing.xs) {
                FilterChip(title: "common.all".localized, isSelected: selectedTaskStatus == nil) {
                    selectedTaskStatus = nil
                }
                ForEach(TaskStatus.allCases, id: \.self) { status in
                    FilterChip(title: status.displayName, isSelected: selectedTaskStatus == status) {
                        selectedTaskStatus = status
                    }
                }
            }
            .padding(.horizontal, AppSpacing.md)
            .padding(.bottom, AppSpacing.sm)
        }
    }

    private var rfiFilters: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: AppSpacing.xs) {
                FilterChip(title: "common.all".localized, isSelected: selectedRFIStatus == nil) {
                    selectedRFIStatus = nil
                }
                ForEach(RFIStatus.allCases, id: \.self) { status in
                    FilterChip(title: status.displayName, isSelected: selectedRFIStatus == status) {
                        selectedRFIStatus = status
                    }
                }
            }
            .padding(.horizontal, AppSpacing.md)
            .padding(.bottom, AppSpacing.sm)
        }
    }

    private var loadingView: some View {
        VStack {
            Spacer()
            ProgressView()
            Spacer()
        }
    }

    @ViewBuilder
    private var tasksContent: some View {
        if filteredTasks.isEmpty {
            emptyTasksView
        } else {
            ScrollView {
                LazyVStack(spacing: AppSpacing.sm) {
                    ForEach(filteredTasks) { task in
                        TaskCard(task: task)
                            .onTapGesture {
                                selectedTask = task
                            }
                    }
                }
                .padding(AppSpacing.md)
            }
            .refreshable {
                await taskService.fetchTasks()
            }
        }
    }

    @ViewBuilder
    private var rfisContent: some View {
        if filteredRFIs.isEmpty {
            emptyRFIsView
        } else {
            ScrollView {
                LazyVStack(spacing: AppSpacing.sm) {
                    ForEach(filteredRFIs) { rfi in
                        RFICard(rfi: rfi)
                            .onTapGesture {
                                selectedRFI = rfi
                            }
                    }
                }
                .padding(AppSpacing.md)
            }
            .refreshable {
                await taskService.fetchRFIs()
            }
        }
    }

    private var emptyTasksView: some View {
        VStack(spacing: AppSpacing.md) {
            Spacer()
            Image(systemName: "checklist")
                .font(.system(size: 48))
                .foregroundColor(AppColors.gray300)
            Text("tasks.noTasks".localized)
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)
            Text("tasks.createToTrack".localized)
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)
            PrimaryButton("tasks.create".localized, icon: "plus") {
                showingNewTask = true
            }
            .padding(.top, AppSpacing.sm)
            Spacer()
        }
        .padding(AppSpacing.xl)
    }

    private var emptyRFIsView: some View {
        VStack(spacing: AppSpacing.md) {
            Spacer()
            Image(systemName: "questionmark.circle")
                .font(.system(size: 48))
                .foregroundColor(AppColors.gray300)
            Text("tasks.noRFIs".localized)
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)
            Text("tasks.createRFIDesc".localized)
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)
            PrimaryButton("tasks.createRFI".localized, icon: "plus") {
                showingNewRFI = true
            }
            .padding(.top, AppSpacing.sm)
            Spacer()
        }
        .padding(AppSpacing.xl)
    }
}

// MARK: - Task Card
struct TaskCard: View {
    let task: ProjectTask

    private var statusColor: Color {
        switch task.status {
        case .todo: return AppColors.gray500
        case .inProgress: return AppColors.info
        case .blocked: return AppColors.error
        case .completed: return AppColors.success
        case .cancelled: return AppColors.gray400
        }
    }

    private var priorityColor: Color {
        switch task.priority {
        case .low: return AppColors.gray500
        case .medium: return AppColors.info
        case .high: return AppColors.warning
        case .critical: return AppColors.error
        }
    }

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                // Header
                HStack {
                    HStack(spacing: AppSpacing.xs) {
                        Image(systemName: task.priority.icon)
                            .font(.system(size: 12))
                            .foregroundColor(priorityColor)
                        Text(task.priority.displayName)
                            .font(AppTypography.caption)
                            .foregroundColor(priorityColor)
                    }
                    .padding(.horizontal, AppSpacing.xs)
                    .padding(.vertical, 2)
                    .background(priorityColor.opacity(0.15))
                    .cornerRadius(4)

                    Spacer()

                    Text(task.status.displayName)
                        .font(AppTypography.caption)
                        .foregroundColor(statusColor)
                        .padding(.horizontal, AppSpacing.xs)
                        .padding(.vertical, 2)
                        .background(statusColor.opacity(0.15))
                        .cornerRadius(4)
                }

                // Title
                Text(task.title)
                    .font(AppTypography.bodySemibold)
                    .foregroundColor(AppColors.textPrimary)
                    .lineLimit(2)

                // Project
                if let projectName = task.projectName {
                    HStack(spacing: AppSpacing.xs) {
                        Image(systemName: "building.2")
                            .font(.system(size: 12))
                            .foregroundColor(AppColors.textTertiary)
                        Text(projectName)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textSecondary)
                    }
                }

                // Footer
                HStack {
                    // Due date
                    if let dueDate = task.formattedDueDate {
                        HStack(spacing: AppSpacing.xs) {
                            Image(systemName: "calendar")
                                .font(.system(size: 12))
                            Text(dueDate)
                                .font(AppTypography.caption)
                        }
                        .foregroundColor(task.isOverdue ? AppColors.error : AppColors.textTertiary)
                    }

                    Spacer()

                    // Subtasks progress
                    let progress = task.subtaskProgress
                    if progress.total > 0 {
                        HStack(spacing: AppSpacing.xs) {
                            Image(systemName: "checklist")
                                .font(.system(size: 12))
                            Text("\(progress.completed)/\(progress.total)")
                                .font(AppTypography.caption)
                        }
                        .foregroundColor(AppColors.textTertiary)
                    }

                    // Assignee
                    if let assignee = task.assigneeName {
                        HStack(spacing: AppSpacing.xs) {
                            Circle()
                                .fill(AppColors.gray200)
                                .frame(width: 20, height: 20)
                                .overlay(
                                    Text(String(assignee.prefix(1)))
                                        .font(.system(size: 10, weight: .medium))
                                        .foregroundColor(AppColors.textSecondary)
                                )
                            Text(assignee.components(separatedBy: " ").first ?? assignee)
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textSecondary)
                        }
                    }
                }
            }
        }
    }
}

// MARK: - RFI Card
struct RFICard: View {
    let rfi: RFI

    private var statusColor: Color {
        switch rfi.status {
        case .draft: return AppColors.gray500
        case .submitted: return AppColors.info
        case .underReview: return AppColors.warning
        case .answered: return AppColors.success
        case .closed: return AppColors.gray400
        }
    }

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                // Header
                HStack {
                    Text(rfi.rfiNumber)
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.primary600)
                        .padding(.horizontal, AppSpacing.xs)
                        .padding(.vertical, 2)
                        .background(AppColors.primary100)
                        .cornerRadius(4)

                    Spacer()

                    Text(rfi.status.displayName)
                        .font(AppTypography.caption)
                        .foregroundColor(statusColor)
                        .padding(.horizontal, AppSpacing.xs)
                        .padding(.vertical, 2)
                        .background(statusColor.opacity(0.15))
                        .cornerRadius(4)
                }

                // Subject
                Text(rfi.subject)
                    .font(AppTypography.bodySemibold)
                    .foregroundColor(AppColors.textPrimary)
                    .lineLimit(2)

                // Question preview
                Text(rfi.question)
                    .font(AppTypography.secondary)
                    .foregroundColor(AppColors.textSecondary)
                    .lineLimit(2)

                // Footer
                HStack {
                    // Project
                    if let projectName = rfi.projectName {
                        HStack(spacing: AppSpacing.xs) {
                            Image(systemName: "building.2")
                                .font(.system(size: 12))
                            Text(projectName)
                                .font(AppTypography.caption)
                        }
                        .foregroundColor(AppColors.textTertiary)
                    }

                    Spacer()

                    // Due date
                    if let dueDate = rfi.formattedDueDate {
                        HStack(spacing: AppSpacing.xs) {
                            Image(systemName: "calendar")
                                .font(.system(size: 12))
                            Text(dueDate)
                                .font(AppTypography.caption)
                        }
                        .foregroundColor(rfi.isOverdue ? AppColors.error : AppColors.textTertiary)
                    }
                }
            }
        }
    }
}

// MARK: - New Task View
struct NewTaskView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var taskService = TaskService.shared

    @State private var selectedProject: Project?
    @State private var showingProjectPicker = false
    @State private var title = ""
    @State private var description = ""
    @State private var priority: TaskPriority = .medium
    @State private var dueDate = Calendar.current.date(byAdding: .day, value: 7, to: Date()) ?? Date()
    @State private var hasDueDate = true
    @State private var isSaving = false
    @State private var errorMessage: String?

    var isFormValid: Bool {
        selectedProject != nil && !title.isEmpty
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Project Selection
                    VStack(alignment: .leading, spacing: AppSpacing.sm) {
                        HStack {
                            Text("tasks.project".localized)
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
                                    }
                                } else {
                                    Text("tasks.selectProject".localized)
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
                        TaskProjectPickerSheet(selectedProject: $selectedProject)
                    }

                    // Title
                    AppTextField(label: "tasks.taskTitle".localized, placeholder: "tasks.taskTitlePlaceholder".localized, text: $title, isRequired: true)

                    // Description
                    AppTextArea(label: "tasks.description".localized, placeholder: "tasks.descriptionPlaceholder".localized, text: $description)

                    // Priority
                    VStack(alignment: .leading, spacing: AppSpacing.sm) {
                        Text("tasks.priority".localized)
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        HStack(spacing: AppSpacing.xs) {
                            ForEach(TaskPriority.allCases, id: \.self) { p in
                                Button(action: { priority = p }) {
                                    HStack(spacing: 4) {
                                        Image(systemName: p.icon)
                                            .font(.system(size: 12))
                                        Text(p.displayName)
                                            .font(AppTypography.secondaryMedium)
                                    }
                                    .padding(.horizontal, AppSpacing.sm)
                                    .padding(.vertical, AppSpacing.xs)
                                    .foregroundColor(priority == p ? .white : priorityColor(p))
                                    .background(priority == p ? priorityColor(p) : priorityColor(p).opacity(0.15))
                                    .cornerRadius(AppSpacing.radiusFull)
                                }
                            }
                        }
                    }

                    // Due Date
                    VStack(alignment: .leading, spacing: AppSpacing.sm) {
                        HStack {
                            Text("tasks.dueDate".localized)
                                .font(AppTypography.heading3)
                                .foregroundColor(AppColors.textPrimary)

                            Spacer()

                            Toggle("", isOn: $hasDueDate)
                                .labelsHidden()
                        }

                        if hasDueDate {
                            DatePicker("", selection: $dueDate, displayedComponents: .date)
                                .datePickerStyle(.compact)
                                .labelsHidden()
                        }
                    }

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
                    PrimaryButton("tasks.create".localized, icon: "plus", isLoading: isSaving) {
                        Task { await saveTask() }
                    }
                    .disabled(!isFormValid)
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("tasks.createTaskTitle".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("common.cancel".localized) { dismiss() }
                }
            }
        }
    }

    private func priorityColor(_ p: TaskPriority) -> Color {
        switch p {
        case .low: return AppColors.gray500
        case .medium: return AppColors.info
        case .high: return AppColors.warning
        case .critical: return AppColors.error
        }
    }

    private func saveTask() async {
        guard let project = selectedProject else { return }
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }

        let task = ProjectTask(
            id: UUID().uuidString,
            projectId: project.id,
            projectName: project.name,
            title: title.trimmingCharacters(in: .whitespaces),
            description: description.isEmpty ? nil : description,
            priority: priority,
            status: .todo,
            assigneeId: nil,
            assigneeName: nil,
            dueDate: hasDueDate ? dueDate : nil,
            completedAt: nil,
            subtasks: nil,
            tags: nil,
            createdBy: nil,
            createdAt: Date(),
            updatedAt: Date()
        )

        let success = await taskService.createTask(task)

        if success {
            dismiss()
        } else {
            errorMessage = taskService.error ?? "Failed to create task"
        }
    }
}

// MARK: - New RFI View
struct NewRFIView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var taskService = TaskService.shared

    @State private var selectedProject: Project?
    @State private var showingProjectPicker = false
    @State private var subject = ""
    @State private var question = ""
    @State private var priority: TaskPriority = .medium
    @State private var dueDate = Calendar.current.date(byAdding: .day, value: 14, to: Date()) ?? Date()
    @State private var hasDueDate = true
    @State private var isSaving = false
    @State private var errorMessage: String?

    var isFormValid: Bool {
        selectedProject != nil && !subject.isEmpty && !question.isEmpty
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Project Selection
                    VStack(alignment: .leading, spacing: AppSpacing.sm) {
                        HStack {
                            Text("tasks.project".localized)
                                .font(AppTypography.heading3)
                                .foregroundColor(AppColors.textPrimary)
                            Text("*")
                                .foregroundColor(AppColors.error)
                        }

                        Button(action: { showingProjectPicker = true }) {
                            HStack {
                                if let project = selectedProject {
                                    Text(project.name)
                                        .font(AppTypography.body)
                                        .foregroundColor(AppColors.textPrimary)
                                } else {
                                    Text("tasks.selectProject".localized)
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
                        TaskProjectPickerSheet(selectedProject: $selectedProject)
                    }

                    // Subject
                    AppTextField(label: "tasks.subject".localized, placeholder: "tasks.subjectPlaceholder".localized, text: $subject, isRequired: true)

                    // Question
                    AppTextArea(label: "tasks.question".localized, placeholder: "tasks.questionPlaceholder".localized, text: $question, isRequired: true, minHeight: 120)

                    // Priority
                    VStack(alignment: .leading, spacing: AppSpacing.sm) {
                        Text("tasks.priority".localized)
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        HStack(spacing: AppSpacing.xs) {
                            ForEach(TaskPriority.allCases, id: \.self) { p in
                                Button(action: { priority = p }) {
                                    HStack(spacing: 4) {
                                        Image(systemName: p.icon)
                                            .font(.system(size: 12))
                                        Text(p.displayName)
                                            .font(AppTypography.secondaryMedium)
                                    }
                                    .padding(.horizontal, AppSpacing.sm)
                                    .padding(.vertical, AppSpacing.xs)
                                    .foregroundColor(priority == p ? .white : priorityColor(p))
                                    .background(priority == p ? priorityColor(p) : priorityColor(p).opacity(0.15))
                                    .cornerRadius(AppSpacing.radiusFull)
                                }
                            }
                        }
                    }

                    // Response Due Date
                    VStack(alignment: .leading, spacing: AppSpacing.sm) {
                        HStack {
                            Text("tasks.responseDue".localized)
                                .font(AppTypography.heading3)
                                .foregroundColor(AppColors.textPrimary)

                            Spacer()

                            Toggle("", isOn: $hasDueDate)
                                .labelsHidden()
                        }

                        if hasDueDate {
                            DatePicker("", selection: $dueDate, displayedComponents: .date)
                                .datePickerStyle(.compact)
                                .labelsHidden()
                        }
                    }

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
                    PrimaryButton("tasks.submitRFI".localized, icon: "paperplane.fill", isLoading: isSaving) {
                        Task { await saveRFI() }
                    }
                    .disabled(!isFormValid)
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("tasks.createRFITitle".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("common.cancel".localized) { dismiss() }
                }
            }
        }
    }

    private func priorityColor(_ p: TaskPriority) -> Color {
        switch p {
        case .low: return AppColors.gray500
        case .medium: return AppColors.info
        case .high: return AppColors.warning
        case .critical: return AppColors.error
        }
    }

    private func saveRFI() async {
        guard let project = selectedProject else { return }
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }

        let rfi = RFI(
            id: UUID().uuidString,
            projectId: project.id,
            projectName: project.name,
            rfiNumber: "RFI-\(Int.random(in: 1000...9999))",
            subject: subject.trimmingCharacters(in: .whitespaces),
            question: question.trimmingCharacters(in: .whitespaces),
            answer: nil,
            status: .submitted,
            priority: priority,
            assignedTo: nil,
            assignedToName: nil,
            dueDate: hasDueDate ? dueDate : nil,
            answeredAt: nil,
            answeredBy: nil,
            attachments: nil,
            createdBy: nil,
            createdByName: nil,
            createdAt: Date(),
            updatedAt: Date()
        )

        let success = await taskService.createRFI(rfi)

        if success {
            dismiss()
        } else {
            errorMessage = taskService.error ?? "Failed to submit RFI"
        }
    }
}

// MARK: - Task Project Picker
struct TaskProjectPickerSheet: View {
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
            .navigationTitle("tasks.selectProjectTitle".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("common.cancel".localized) { dismiss() }
                }
            }
        }
    }
}

struct TaskDetailView: View {
    let task: ProjectTask
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: AppSpacing.md) {
                    Text(task.title)
                        .font(AppTypography.heading2)
                    if let desc = task.description {
                        Text(desc)
                    }
                }
                .padding()
            }
            .navigationTitle("tasks.taskDetails".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("common.done".localized) { dismiss() }
                }
            }
        }
    }
}

struct RFIDetailView: View {
    let rfi: RFI
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: AppSpacing.md) {
                    Text(rfi.subject)
                        .font(AppTypography.heading2)
                    Text(rfi.question)
                    if let answer = rfi.answer {
                        Divider()
                        Text("tasks.answer".localized)
                            .font(AppTypography.bodySemibold)
                        Text(answer)
                    }
                }
                .padding()
            }
            .navigationTitle(rfi.rfiNumber)
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
        TasksView()
    }
}
