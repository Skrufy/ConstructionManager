//
//  DrawingViewerView.swift
//  ConstructionManager
//
//  Full-screen drawing viewer with annotations and measurement tools
//

import SwiftUI
import PDFKit
import Combine

struct DrawingViewerView: View {
    @State private var currentDrawing: Drawing
    let allDrawings: [Drawing]
    @State private var currentIndex: Int
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel: DrawingViewerViewModel

    @State private var showingTools = false
    @State private var activeToolPanel: ToolPanel? = nil
    @State private var showingOCRPanel = false
    @State private var showingInfo = false
    @State private var showingCalibrationInput = false
    @State private var showingClearConfirmation = false

    enum ToolPanel { case annotate, measure }

    // Navigation helpers
    private var hasPrevious: Bool { currentIndex > 0 }
    private var hasNext: Bool { currentIndex < allDrawings.count - 1 }

    // Helper for banner background color
    private var calibrationOrTapToPlaceBackground: Color {
        if viewModel.measurementMode == .calibrate {
            return viewModel.calibrationPoints.count > 0 ? Color.orange.opacity(0.9) : AppColors.primary500.opacity(0.9)
        } else if viewModel.isWaitingForSecondTap {
            return Color.orange.opacity(0.9)
        }
        return AppColors.primary500.opacity(0.9)
    }

    /// Initialize with a single drawing (backwards compatible)
    init(drawing: Drawing) {
        self._currentDrawing = State(initialValue: drawing)
        self.allDrawings = [drawing]
        self._currentIndex = State(initialValue: 0)
        _viewModel = StateObject(wrappedValue: DrawingViewerViewModel(drawing: drawing))
    }

    /// Initialize with all drawings for prev/next navigation
    init(drawing: Drawing, allDrawings: [Drawing], currentIndex: Int) {
        self._currentDrawing = State(initialValue: drawing)
        self.allDrawings = allDrawings
        self._currentIndex = State(initialValue: currentIndex)
        _viewModel = StateObject(wrappedValue: DrawingViewerViewModel(drawing: drawing))
    }

    var body: some View {
        GeometryReader { geometry in
            let isLandscape = geometry.size.width > geometry.size.height

            ZStack {
                // PDF Viewer
                DrawingCanvasView(
                    drawing: currentDrawing,
                    viewModel: viewModel,
                    onCalibrationTap: handleCalibrationTap
                )
                .ignoresSafeArea(edges: isLandscape ? .all : .bottom)
                .id(currentDrawing.id) // Force view refresh when drawing changes

                // Calibration overlay
                if viewModel.measurementMode == .calibrate {
                    CalibrationOverlay(
                        points: viewModel.calibrationPoints,
                        onTap: handleCalibrationTap
                    )
                }

                // Measurement result display (for newly created measurements)
                if let measurementText = viewModel.measurementDisplayText,
                   (viewModel.measurementMode == .linear || viewModel.measurementMode == .area) {
                    VStack {
                        Spacer()
                        HStack {
                            Spacer()
                            Text(measurementText)
                                .font(.system(size: 18, weight: .bold, design: .monospaced))
                                .foregroundColor(.white)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                                .background(Color.blue.opacity(0.9))
                                .cornerRadius(12)
                                .shadow(radius: 4)
                            Spacer()
                        }
                        .padding(.bottom, 180)
                    }
                }

                // Selected annotation tooltip (for tapping on existing annotations)
                if let annotation = viewModel.selectedAnnotation,
                   let position = viewModel.selectedAnnotationScreenPosition {
                    // Dismiss overlay - tap anywhere to close the tooltip
                    Color.clear
                        .contentShape(Rectangle())
                        .onTapGesture {
                            viewModel.clearAnnotationSelection()
                        }
                        .ignoresSafeArea()

                    AnnotationTooltip(
                        annotation: annotation,
                        position: position,
                        onDelete: {
                            viewModel.deleteSelectedAnnotation()
                        },
                        onDismiss: { viewModel.clearAnnotationSelection() }
                    )
                }

                // UI Overlay
                VStack(spacing: 0) {
                    // Top bar
                    compactTopBar(isLandscape: isLandscape)

                    Spacer()

                    // Bottom floating controls
                    compactBottomControls(isLandscape: isLandscape)
                }
            }
            .background(Color.black)
        }
        .sheet(isPresented: $showingInfo) {
            DrawingInfoSheet(drawing: currentDrawing)
        }
        .sheet(isPresented: $showingOCRPanel) {
            OCRResultsSheet(drawing: currentDrawing, viewModel: viewModel)
        }
        .sheet(isPresented: $showingCalibrationInput) {
            CalibrationInputSheet(viewModel: viewModel, isPresented: $showingCalibrationInput)
        }
        .confirmationDialog("Clear All Annotations?", isPresented: $showingClearConfirmation, titleVisibility: .visible) {
            Button("Clear All", role: .destructive) {
                Task {
                    await viewModel.clearAllAnnotations()
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This will permanently delete all \(viewModel.annotations.count) annotations you have created on this drawing.")
        }
        .onChange(of: viewModel.calibrationPoints.count) { oldCount, count in
            print("[Calibration] Points count changed: \(oldCount) -> \(count)")
            if count >= 2 {
                print("[Calibration] Showing calibration input sheet")
                showingCalibrationInput = true
            }
        }
        .onAppear {
            // Start prefetching adjacent drawings in background
            if allDrawings.count > 1 {
                prefetchAdjacentDrawings()
            }
        }
    }

    // MARK: - Compact Top Bar
    private func compactTopBar(isLandscape: Bool) -> some View {
        HStack(spacing: 12) {
            // Close button
            Button(action: { dismiss() }) {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(width: 32, height: 32)
                    .background(Color.black.opacity(0.5))
                    .clipShape(Circle())
            }

            // Previous drawing button
            if allDrawings.count > 1 {
                Button(action: { navigateToPrevious() }) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(hasPrevious ? .white : .white.opacity(0.3))
                        .frame(width: 32, height: 32)
                        .background(Color.black.opacity(0.5))
                        .clipShape(Circle())
                }
                .disabled(!hasPrevious)
            }

            // Title (centered) with drawing counter
            Spacer()
            VStack(spacing: 2) {
                Text(currentDrawing.sheetNumber ?? currentDrawing.name)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white)
                if allDrawings.count > 1 {
                    Text("\(currentIndex + 1) of \(allDrawings.count)")
                        .font(.system(size: 10))
                        .foregroundColor(.white.opacity(0.7))
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(Color.black.opacity(0.5))
            .cornerRadius(6)
            Spacer()

            // Next drawing button
            if allDrawings.count > 1 {
                Button(action: { navigateToNext() }) {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(hasNext ? .white : .white.opacity(0.3))
                        .frame(width: 32, height: 32)
                        .background(Color.black.opacity(0.5))
                        .clipShape(Circle())
                }
                .disabled(!hasNext)
            }

            // Quick actions
            HStack(spacing: 4) {
                Button(action: { showingOCRPanel = true }) {
                    Image(systemName: "doc.text.viewfinder")
                        .font(.system(size: 14))
                }
                Button(action: { showingInfo = true }) {
                    Image(systemName: "info.circle")
                        .font(.system(size: 14))
                }
                // Clear all annotations button (only show if there are annotations)
                if !viewModel.annotations.isEmpty {
                    Button(action: { showingClearConfirmation = true }) {
                        Image(systemName: "trash")
                            .font(.system(size: 14))
                    }
                }
            }
            .foregroundColor(.white)
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
            .background(Color.black.opacity(0.5))
            .cornerRadius(16)
        }
        .padding(.horizontal, 12)
        .padding(.top, isLandscape ? 8 : 4)
    }

    // MARK: - Navigation Functions
    private func navigateToPrevious() {
        guard hasPrevious else { return }
        currentIndex -= 1
        currentDrawing = allDrawings[currentIndex]
        viewModel.loadDrawing(allDrawings[currentIndex])
        // Prefetch adjacent drawings for faster navigation
        prefetchAdjacentDrawings()
    }

    private func navigateToNext() {
        guard hasNext else { return }
        currentIndex += 1
        currentDrawing = allDrawings[currentIndex]
        viewModel.loadDrawing(allDrawings[currentIndex])
        // Prefetch adjacent drawings for faster navigation
        prefetchAdjacentDrawings()
    }

    /// Prefetch next/previous drawings in background for faster navigation
    private func prefetchAdjacentDrawings() {
        DrawingCacheManager.shared.prefetchAdjacentDrawings(
            currentIndex: currentIndex,
            allDrawings: allDrawings,
            prefetchCount: 2
        )
    }

    // MARK: - Compact Bottom Controls
    private func compactBottomControls(isLandscape: Bool) -> some View {
        VStack(spacing: 8) {
            // Draw mode indicator banner with tap-to-place instructions
            if viewModel.isDrawModeActive {
                HStack(spacing: 6) {
                    if viewModel.measurementMode == .calibrate {
                        // Calibration mode
                        let pointCount = viewModel.calibrationPoints.count
                        Image(systemName: pointCount == 0 ? "1.circle.fill" : "2.circle.fill")
                            .font(.system(size: 14))
                        Text(pointCount == 0 ? "Tap first calibration point" : "Tap second point")
                            .font(.system(size: 12, weight: .semibold))
                        Text("- Tap Cal to cancel")
                            .font(.system(size: 11))
                            .opacity(0.8)
                    } else if viewModel.isWaitingForSecondTap {
                        // Waiting for second tap
                        Image(systemName: "2.circle.fill")
                            .font(.system(size: 14))
                        Text("Tap end point")
                            .font(.system(size: 12, weight: .semibold))
                        Text("- Long press to cancel")
                            .font(.system(size: 11))
                            .opacity(0.8)
                    } else if let tool = viewModel.selectedTool, [.line, .arrow].contains(tool) {
                        // Line/arrow tool selected, waiting for first tap
                        Image(systemName: "1.circle.fill")
                            .font(.system(size: 14))
                        Text("Tap start point")
                            .font(.system(size: 12, weight: .semibold))
                    } else if viewModel.measurementMode == .linear || viewModel.measurementMode == .area {
                        // Measurement mode
                        Image(systemName: "1.circle.fill")
                            .font(.system(size: 14))
                        Text("Tap start point")
                            .font(.system(size: 12, weight: .semibold))
                    } else {
                        // General draw mode
                        Image(systemName: "hand.draw.fill")
                            .font(.system(size: 12))
                        Text("Draw Mode")
                            .font(.system(size: 12, weight: .semibold))
                        Text("- Tap Pan to pan/zoom")
                            .font(.system(size: 11))
                            .opacity(0.8)
                    }
                }
                .foregroundColor(.white)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(calibrationOrTapToPlaceBackground)
                .cornerRadius(16)
                .transition(.opacity.combined(with: .move(edge: .bottom)))
                .animation(.easeInOut(duration: 0.2), value: viewModel.isWaitingForSecondTap)
                .animation(.easeInOut(duration: 0.2), value: viewModel.calibrationPoints.count)
            }

            // Expanded tool panel
            if let panel = activeToolPanel {
                toolPanelContent(panel)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }

            // Main control bar
            HStack(spacing: 0) {
                // Status indicators
                HStack(spacing: 6) {
                    // Calibration status
                    if viewModel.calibrationScale != nil {
                        HStack(spacing: 4) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 10))
                            Text("Cal")
                                .font(.system(size: 10, weight: .medium))
                        }
                        .foregroundColor(.green)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.black.opacity(0.6))
                        .cornerRadius(10)
                    }
                }

                Spacer()

                // Tool buttons
                HStack(spacing: 2) {
                    // Draw/Navigate mode toggle
                    Button(action: {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            // When switching to Pan mode, stop all annotation activities
                            if viewModel.isDrawModeActive {
                                viewModel.cancelTapToPlace()
                                viewModel.selectedTool = nil
                                viewModel.measurementMode = .linear // Reset to default
                                activeToolPanel = nil
                            }
                            viewModel.isDrawModeActive.toggle()
                        }
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: viewModel.isDrawModeActive ? "hand.draw.fill" : "hand.point.up.left.fill")
                                .font(.system(size: 14, weight: .medium))
                            Text(viewModel.isDrawModeActive ? "Annotate" : "Pan")
                                .font(.system(size: 11, weight: .semibold))
                        }
                        .foregroundColor(viewModel.isDrawModeActive ? .white : .white.opacity(0.8))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 8)
                        .background(viewModel.isDrawModeActive ? AppColors.primary500 : Color.gray.opacity(0.5))
                        .cornerRadius(8)
                    }

                    Divider()
                        .frame(height: 24)
                        .background(Color.white.opacity(0.3))
                        .padding(.horizontal, 4)

                    compactToolButton(icon: "pencil.tip", isActive: activeToolPanel == .annotate) {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            activeToolPanel = activeToolPanel == .annotate ? nil : .annotate
                            // Auto-enable draw mode when selecting annotation tools
                            if activeToolPanel == .annotate && viewModel.selectedTool != nil {
                                viewModel.isDrawModeActive = true
                            }
                        }
                    }

                    compactToolButton(icon: "ruler", isActive: activeToolPanel == .measure) {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            activeToolPanel = activeToolPanel == .measure ? nil : .measure
                            // Auto-enable draw mode when using measurement
                            if activeToolPanel == .measure {
                                viewModel.isDrawModeActive = true
                            }
                        }
                    }

                    compactToolButton(icon: "arrow.up.left.and.down.right.magnifyingglass", isActive: false) {
                        viewModel.resetZoom()
                    }
                }
                .padding(4)
                .background(Color.black.opacity(0.7))
                .cornerRadius(12)
            }
            .padding(.horizontal, 12)
            .padding(.bottom, isLandscape ? 8 : 16)
        }
    }

    // MARK: - Compact Tool Button
    private func compactToolButton(icon: String, isActive: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(isActive ? AppColors.primary400 : .white)
                .frame(width: 40, height: 36)
                .background(isActive ? Color.white.opacity(0.15) : Color.clear)
                .cornerRadius(8)
        }
    }

    // MARK: - Tool Panel Content
    @ViewBuilder
    private func toolPanelContent(_ panel: ToolPanel) -> some View {
        HStack(spacing: 12) {
            switch panel {
            case .annotate:
                annotationTools
            case .measure:
                measurementTools
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color.black.opacity(0.8))
        .cornerRadius(12)
        .padding(.horizontal, 12)
    }

    // MARK: - Annotation Tools (Compact)
    private var annotationTools: some View {
        HStack(spacing: 8) {
            ForEach([
                ("mappin", AnnotationTool.pin),
                ("text.cursor", AnnotationTool.text),
                ("line.diagonal", AnnotationTool.line),
                ("arrow.up.right", AnnotationTool.arrow),
                ("rectangle", AnnotationTool.rectangle),
                ("circle", AnnotationTool.circle),
                ("scribble", AnnotationTool.freehand)
            ], id: \.0) { icon, tool in
                Button(action: {
                    // Reset tap-to-place state when changing tools
                    viewModel.cancelTapToPlace()

                    if viewModel.selectedTool == tool {
                        viewModel.selectedTool = nil
                    } else {
                        viewModel.selectedTool = tool
                        // Auto-enable draw mode when selecting a tool
                        viewModel.isDrawModeActive = true
                    }
                }) {
                    Image(systemName: icon)
                        .font(.system(size: 14))
                        .foregroundColor(viewModel.selectedTool == tool ? AppColors.primary400 : .white)
                        .frame(width: 36, height: 32)
                        .background(viewModel.selectedTool == tool ? Color.white.opacity(0.15) : Color.clear)
                        .cornerRadius(6)
                }
            }

            Divider().frame(height: 20).background(Color.white.opacity(0.3))

            // Color picker
            ForEach([AnnotationColor.red, .blue, .green, .yellow], id: \.self) { color in
                Button(action: { viewModel.selectedColor = color }) {
                    Circle()
                        .fill(color.color)
                        .frame(width: 20, height: 20)
                        .overlay(
                            Circle()
                                .stroke(Color.white, lineWidth: viewModel.selectedColor == color ? 2 : 0)
                        )
                }
            }
        }
    }

    // MARK: - Measurement Tools (Compact)
    private var measurementTools: some View {
        HStack(spacing: 8) {
            ForEach([
                ("ruler", MeasurementMode.linear, "Line"),
                ("rectangle.dashed", MeasurementMode.area, "Area"),
                ("angle", MeasurementMode.angle, "Angle")
            ], id: \.0) { icon, mode, label in
                Button(action: {
                    // Reset tap-to-place state when changing modes
                    viewModel.cancelTapToPlace()

                    viewModel.measurementMode = mode
                    // Auto-enable draw mode for measurement
                    if mode == .linear || mode == .area {
                        viewModel.isDrawModeActive = true
                    }
                }) {
                    VStack(spacing: 2) {
                        Image(systemName: icon)
                            .font(.system(size: 14))
                        Text(label)
                            .font(.system(size: 9))
                    }
                    .foregroundColor(viewModel.measurementMode == mode ? AppColors.primary400 : .white)
                    .frame(width: 44, height: 38)
                    .background(viewModel.measurementMode == mode ? Color.white.opacity(0.15) : Color.clear)
                    .cornerRadius(6)
                }
            }

            // Calibrate button - toggleable (press again to cancel)
            Button(action: {
                viewModel.cancelTapToPlace()

                if viewModel.measurementMode == .calibrate {
                    // Cancel calibration - go back to linear mode and nav
                    viewModel.calibrationPoints.removeAll()
                    viewModel.measurementMode = .linear
                    viewModel.isDrawModeActive = false
                } else {
                    // Enter calibration mode
                    viewModel.measurementMode = .calibrate
                    viewModel.isDrawModeActive = true
                }
            }) {
                VStack(spacing: 2) {
                    Image(systemName: "scope")
                        .font(.system(size: 14))
                    Text("Cal")
                        .font(.system(size: 9))
                }
                .foregroundColor(viewModel.measurementMode == .calibrate ? AppColors.primary400 : .white)
                .frame(width: 44, height: 38)
                .background(viewModel.measurementMode == .calibrate ? Color.white.opacity(0.15) : Color.clear)
                .cornerRadius(6)
            }

            if viewModel.calibrationScale == nil {
                Text("Not calibrated")
                    .font(.system(size: 10))
                    .foregroundColor(.orange)
                    .padding(.leading, 4)
            }
        }
    }

    // MARK: - Calibration Handler
    private func handleCalibrationTap(_ point: CGPoint) {
        guard viewModel.measurementMode == .calibrate else { return }
        viewModel.addCalibrationPoint(point)
    }

}

// MARK: - Annotation Tool Enum
enum AnnotationTool: String, CaseIterable {
    case pin = "Pin"
    case text = "Text"
    case line = "Line"
    case arrow = "Arrow"
    case rectangle = "Box"
    case circle = "Circle"
    case freehand = "Draw"
    case cloud = "Cloud"
    case highlight = "Highlight"

    var icon: String {
        switch self {
        case .pin: return "mappin"
        case .text: return "textformat"
        case .line: return "line.diagonal"
        case .arrow: return "arrow.up.right"
        case .rectangle: return "rectangle"
        case .circle: return "circle"
        case .freehand: return "scribble"
        case .cloud: return "bubble.left"
        case .highlight: return "highlighter"
        }
    }
}

// MARK: - Annotation Color
enum AnnotationColor: CaseIterable {
    case red, orange, yellow, green, blue, purple

    var color: Color {
        switch self {
        case .red: return .red
        case .orange: return .orange
        case .yellow: return .yellow
        case .green: return .green
        case .blue: return .blue
        case .purple: return .purple
        }
    }

    var hexString: String {
        switch self {
        case .red: return "#FF0000"
        case .orange: return "#FF9500"
        case .yellow: return "#FFCC00"
        case .green: return "#34C759"
        case .blue: return "#007AFF"
        case .purple: return "#AF52DE"
        }
    }
}

// MARK: - Measurement Mode
enum MeasurementMode {
    case linear, area, angle, calibrate
}

// MARK: - Calibration Overlay
struct CalibrationOverlay: View {
    let points: [CGPoint]
    let onTap: (CGPoint) -> Void

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Tap capture layer
                Color.clear
                    .contentShape(Rectangle())
                    .onTapGesture { location in
                        onTap(location)
                    }

                // Draw calibration points
                ForEach(Array(points.enumerated()), id: \.offset) { index, point in
                    Circle()
                        .fill(AppColors.primary500)
                        .frame(width: 16, height: 16)
                        .overlay(
                            Circle()
                                .stroke(Color.white, lineWidth: 2)
                        )
                        .position(point)

                    // Point label
                    Text("\(index + 1)")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.white)
                        .position(point)
                }

                // Draw line between points
                if points.count >= 2 {
                    Path { path in
                        path.move(to: points[0])
                        path.addLine(to: points[1])
                    }
                    .stroke(AppColors.primary500, style: StrokeStyle(lineWidth: 2, dash: [5, 5]))
                }

                // Instructions
                VStack {
                    Spacer()
                    HStack {
                        Image(systemName: "info.circle.fill")
                        Text(points.count < 2 ? "Tap point \(points.count + 1) of 2 on a known dimension" : "Enter the known distance")
                    }
                    .font(AppTypography.caption)
                    .foregroundColor(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Color.black.opacity(0.7))
                    .cornerRadius(20)
                    .padding(.bottom, 100)
                }
            }
        }
        .allowsHitTesting(points.count < 2)
    }
}

// MARK: - Calibration Input Sheet
struct CalibrationInputSheet: View {
    @ObservedObject var viewModel: DrawingViewerViewModel
    @Binding var isPresented: Bool
    @State private var distanceText = ""
    @State private var selectedUnit = "feet"
    @FocusState private var isInputFocused: Bool

    let units = ["feet", "inches", "meters"]

    var body: some View {
        NavigationStack {
            VStack(spacing: AppSpacing.lg) {
                // Visual representation
                VStack(spacing: AppSpacing.sm) {
                    HStack(spacing: AppSpacing.lg) {
                        Circle()
                            .fill(AppColors.primary500)
                            .frame(width: 20, height: 20)
                        Rectangle()
                            .fill(AppColors.primary500)
                            .frame(height: 2)
                        Circle()
                            .fill(AppColors.primary500)
                            .frame(width: 20, height: 20)
                    }
                    .padding(.horizontal, 40)

                    Text("Enter the real-world distance between the two points")
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.top, AppSpacing.lg)

                // Input field
                HStack(spacing: AppSpacing.md) {
                    TextField("Distance", text: $distanceText)
                        .keyboardType(.decimalPad)
                        .textFieldStyle(.roundedBorder)
                        .frame(maxWidth: 150)
                        .focused($isInputFocused)

                    Picker("Unit", selection: $selectedUnit) {
                        ForEach(units, id: \.self) { unit in
                            Text(unit).tag(unit)
                        }
                    }
                    .pickerStyle(.segmented)
                }
                .padding(.horizontal, AppSpacing.lg)

                Spacer()

                // Buttons
                VStack(spacing: AppSpacing.md) {
                    Button(action: completeCalibration) {
                        Text("Calibrate")
                            .font(AppTypography.button)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(distanceText.isEmpty ? Color.gray : AppColors.primary500)
                            .cornerRadius(12)
                    }
                    .disabled(distanceText.isEmpty)

                    Button(action: cancel) {
                        Text("Cancel")
                            .font(AppTypography.body)
                            .foregroundColor(AppColors.textSecondary)
                    }
                }
                .padding(.horizontal, AppSpacing.lg)
                .padding(.bottom, AppSpacing.lg)
            }
            .navigationTitle("Calibrate Scale")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear {
                isInputFocused = true
            }
        }
        .presentationDetents([.medium])
    }

    private func completeCalibration() {
        // Handle locale-specific decimal separators
        let cleanedText = distanceText.replacingOccurrences(of: ",", with: ".")

        guard let distance = Double(cleanedText), distance > 0 else {
            print("[Calibration] Failed to parse distance: '\(distanceText)'")
            return
        }

        print("[Calibration] Parsed distance: \(distance) \(selectedUnit)")
        print("[Calibration] Calibration points count: \(viewModel.calibrationPoints.count)")

        // Convert to feet for internal storage
        let distanceInFeet: Double
        switch selectedUnit {
        case "inches":
            distanceInFeet = distance / 12.0
        case "meters":
            distanceInFeet = distance * 3.28084
        default:
            distanceInFeet = distance
        }

        viewModel.completeCalibration(knownDistanceFeet: distanceInFeet)

        print("[Calibration] Scale after calibration: \(viewModel.calibrationScale ?? -1)")

        isPresented = false
    }

    private func cancel() {
        viewModel.calibrationPoints.removeAll()
        viewModel.measurementMode = .linear
        isPresented = false
    }
}

// MARK: - Drawing Canvas View
struct DrawingCanvasView: View {
    let drawing: Drawing
    @ObservedObject var viewModel: DrawingViewerViewModel
    var onCalibrationTap: ((CGPoint) -> Void)?

    @State private var pdfDocument: PDFDocument?
    @State private var isLoading = true
    @State private var loadError: String?

    var body: some View {
        ZStack {
            if isLoading {
                // Loading state
                VStack(spacing: AppSpacing.md) {
                    ProgressView()
                        .scaleEffect(1.5)
                    Text("Loading PDF...")
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.white)
            } else if let error = loadError {
                // Error state
                ScrollView {
                    VStack(spacing: AppSpacing.lg) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 60))
                            .foregroundColor(AppColors.warning)

                        Text("Could not load PDF")
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        Text(error)
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)

                        // Technical details section
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Technical Details")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(AppColors.textTertiary)

                            Group {
                                Text("Drawing ID: \(drawing.id)")
                                Text("File URL: \(drawing.fileUrl)")
                            }
                            .font(.system(size: 11, design: .monospaced))
                            .foregroundColor(AppColors.textTertiary)
                        }
                        .padding()
                        .background(Color.gray.opacity(0.1))
                        .cornerRadius(8)
                        .padding(.horizontal)

                        HStack(spacing: 16) {
                            Button("Try Again") {
                                loadError = nil
                                Task { await loadPDF() }
                            }
                            .buttonStyle(.borderedProminent)

                            Button("Copy Error") {
                                UIPasteboard.general.string = "Error: \(error)\nDrawing ID: \(drawing.id)\nFile URL: \(drawing.fileUrl)"
                            }
                            .buttonStyle(.bordered)
                        }
                    }
                    .padding(.vertical, 40)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.white)
            } else if let pdfDoc = pdfDocument {
                // PDF Viewer using PDFKit - handles its own zoom/pan
                InteractivePDFView(
                    document: pdfDoc,
                    viewModel: viewModel,
                    onCalibrationTap: onCalibrationTap
                )
            } else {
                // Fallback placeholder
                VStack(spacing: AppSpacing.lg) {
                    Image(systemName: drawing.category.icon)
                        .font(.system(size: 80))
                        .foregroundColor(drawing.category.color.opacity(0.3))

                    Text(drawing.name)
                        .font(AppTypography.heading2)
                        .foregroundColor(AppColors.textSecondary)

                    Text("No PDF available")
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textTertiary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.white)
            }
        }
        .task {
            await loadPDF()
        }
    }

    private func loadPDF() async {
        isLoading = true
        defer { isLoading = false }

        let cacheManager = DrawingCacheManager.shared

        // 1. Try loading from local cache first (instant)
        if let cachedPDF = cacheManager.loadFromCache(drawingId: drawing.id) {
            await MainActor.run {
                self.pdfDocument = cachedPDF
            }
            return
        }

        // 2. Not cached - load from network
        // Always fetch a fresh signed URL from the API to avoid expired token issues
        // The stored fileUrl may contain an expired signed URL
        await loadPDFFromFileId(drawing.id)

        // 3. Cache the downloaded PDF for next time (in background)
        if pdfDocument != nil {
            Task.detached {
                try? await cacheManager.downloadDrawing(self.drawing)
            }
        }
    }

    private func loadPDFFromFileId(_ fileId: String) async {
        // The drawing.fileUrl contains the storage path (e.g., "companyId/drawings/civil/filename.pdf")
        // We need to generate a fresh signed URL directly from Supabase
        let storagePath = drawing.fileUrl

        // If it's already a full URL (unlikely but check), try to extract the path
        if storagePath.hasPrefix("http") {
            // Try to load directly (this might fail if URL is expired)
            if let url = URL(string: storagePath) {
                await loadPDFFromURL(url)
                return
            }
        }

        // Generate a fresh signed URL directly from Supabase
        await generateSupabaseSignedURL(storagePath: storagePath)
    }

    /// Generate a fresh signed URL directly from Supabase Storage API
    private func generateSupabaseSignedURL(storagePath: String) async {
        print("[PDF Load] Generating fresh signed URL from Supabase for path: \(storagePath)")

        // Supabase storage configuration
        let supabaseUrl = SupabaseConfig.url
        let bucket = "construction-files"
        let expiresIn = 3600 // 1 hour

        // Build the signed URL request
        guard let signUrl = URL(string: "\(supabaseUrl)/storage/v1/object/sign/\(bucket)/\(storagePath)") else {
            loadError = "Invalid storage path"
            print("[PDF Load Error] Could not build sign URL for path: \(storagePath)")
            return
        }

        var request = URLRequest(url: signUrl)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")

        // Add user's access token for authorization
        if let accessToken = APIClient.shared.accessToken {
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        }

        // Request body with expiration time
        let body = ["expiresIn": expiresIn]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        do {
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                loadError = "Invalid response from Supabase"
                return
            }

            print("[PDF Load] Supabase sign response status: \(httpResponse.statusCode)")

            if httpResponse.statusCode == 200 {
                // Parse the signed URL response
                if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let signedURLPath = json["signedURL"] as? String {

                    // The signedURL is a relative path, prepend the Supabase URL
                    let fullSignedURL = "\(supabaseUrl)/storage/v1\(signedURLPath)"
                    print("[PDF Load] Generated fresh signed URL: \(fullSignedURL.prefix(100))...")

                    if let url = URL(string: fullSignedURL) {
                        await loadPDFFromURL(url)
                    } else {
                        loadError = "Invalid signed URL format"
                    }
                } else {
                    let bodyText = String(data: data, encoding: .utf8) ?? "unknown"
                    loadError = "Unexpected response format: \(bodyText.prefix(100))"
                    print("[PDF Load Error] Unexpected response: \(bodyText)")
                }
            } else {
                let bodyText = String(data: data, encoding: .utf8) ?? "unknown"
                loadError = "Failed to generate signed URL (HTTP \(httpResponse.statusCode)): \(bodyText.prefix(100))"
                print("[PDF Load Error] Supabase error: \(bodyText)")
            }
        } catch {
            loadError = "Network error: \(error.localizedDescription)"
            print("[PDF Load Error] Network error generating signed URL: \(error)")
        }
    }

    private func loadPDFFromURL(_ url: URL) async {
        do {
            print("[PDF Load] Loading PDF from URL: \(url.absoluteString.prefix(100))...")

            // Create request with auth headers
            var request = URLRequest(url: url)
            request.timeoutInterval = 60  // 60 second timeout for large PDFs

            // Add auth header only for our API, not for signed Supabase URLs
            if url.host?.contains("supabase") != true {
                if let token = APIClient.shared.accessToken {
                    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                }
            }

            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                loadError = "Invalid response type (not HTTP)"
                print("[PDF Load Error] Response is not HTTPURLResponse")
                return
            }

            print("[PDF Load] HTTP Status: \(httpResponse.statusCode), Data size: \(data.count) bytes")
            print("[PDF Load] Content-Type: \(httpResponse.value(forHTTPHeaderField: "Content-Type") ?? "unknown")")

            if httpResponse.statusCode == 200 {
                // Check content type
                let contentType = httpResponse.value(forHTTPHeaderField: "Content-Type") ?? ""
                if !contentType.contains("pdf") && !contentType.contains("octet-stream") && data.count > 0 {
                    // Might be an error response in JSON
                    if let errorText = String(data: data.prefix(500), encoding: .utf8) {
                        print("[PDF Load Warning] Unexpected content type '\(contentType)': \(errorText)")
                    }
                }

                if data.count < 100 {
                    // Suspiciously small for a PDF
                    if let text = String(data: data, encoding: .utf8) {
                        loadError = "Received invalid response: \(text)"
                        print("[PDF Load Error] Response too small to be PDF: \(text)")
                        return
                    }
                }

                if let document = PDFDocument(data: data) {
                    print("[PDF Load] Successfully parsed PDF with \(document.pageCount) pages")
                    await MainActor.run {
                        self.pdfDocument = document
                    }
                } else {
                    // Check if it's actually PDF data
                    let header = String(data: data.prefix(8), encoding: .ascii) ?? ""
                    if header.hasPrefix("%PDF") {
                        loadError = "PDF file appears corrupted (could not parse)"
                    } else {
                        loadError = "Downloaded file is not a valid PDF (header: \(header.prefix(20))...)"
                    }
                    print("[PDF Load Error] Failed to parse PDF. Header bytes: \(header)")
                }
            } else if httpResponse.statusCode == 404 {
                loadError = "PDF file not found in storage (404)"
            } else if httpResponse.statusCode == 400 {
                // Parse Supabase error message
                if let errorJson = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let message = errorJson["message"] as? String ?? errorJson["error"] as? String {
                    loadError = "Storage error: \(message)"
                    print("[PDF Load Error] Supabase 400 error: \(message)")
                } else {
                    let bodyText = String(data: data.prefix(200), encoding: .utf8) ?? "unknown"
                    loadError = "Bad request (400): \(bodyText)"
                    print("[PDF Load Error] 400 error body: \(bodyText)")
                }
            } else if httpResponse.statusCode == 403 {
                loadError = "Access denied (403) - signed URL may have expired"
                print("[PDF Load Error] 403 Forbidden")
            } else {
                let bodyText = String(data: data.prefix(200), encoding: .utf8) ?? ""
                loadError = "HTTP \(httpResponse.statusCode): \(bodyText.isEmpty ? "Unknown error" : bodyText)"
                print("[PDF Load Error] HTTP \(httpResponse.statusCode): \(bodyText)")
            }
        } catch let urlError as URLError {
            print("[PDF Load Error] URLError: \(urlError)")
            switch urlError.code {
            case .timedOut:
                loadError = "Request timed out - file may be too large or connection slow"
            case .notConnectedToInternet:
                loadError = "No internet connection"
            case .networkConnectionLost:
                loadError = "Connection lost during download"
            case .cannotFindHost:
                loadError = "Cannot reach storage server"
            default:
                loadError = "Network error: \(urlError.localizedDescription)"
            }
        } catch {
            print("[PDF Load Error] Unknown error: \(error)")
            loadError = error.localizedDescription
        }
    }
}

// MARK: - Interactive PDF View (UIKit wrapper with Draw/Navigate mode toggle)
struct InteractivePDFView: UIViewRepresentable {
    let document: PDFDocument
    @ObservedObject var viewModel: DrawingViewerViewModel
    var onCalibrationTap: ((CGPoint) -> Void)?

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeUIView(context: Context) -> PDFContainerView {
        let containerView = PDFContainerView(frame: .zero)
        containerView.setup(document: document, coordinator: context.coordinator)
        context.coordinator.containerView = containerView
        return containerView
    }

    func updateUIView(_ uiView: PDFContainerView, context: Context) {
        // Pass overlay reference to viewModel for drawing updates
        viewModel.drawingOverlay = uiView.drawingOverlay

        if uiView.pdfView.document !== document {
            uiView.pdfView.document = document
            DispatchQueue.main.async {
                // Reset zoom to fit
                uiView.pdfView.scaleFactor = uiView.pdfView.scaleFactorForSizeToFit
                // Go to first page and reset scroll position
                if let firstPage = document.page(at: 0) {
                    uiView.pdfView.go(to: firstPage)
                }
                // Force layout update to ensure gesture recognizers are properly configured
                uiView.pdfView.layoutDocumentView()
            }
        }

        // Handle reset zoom request - only trigger once then clear the flag
        if viewModel.shouldResetZoom {
            DispatchQueue.main.async {
                uiView.pdfView.scaleFactor = uiView.pdfView.scaleFactorForSizeToFit
                // Force layout update to ensure gesture recognizers work correctly
                uiView.pdfView.layoutDocumentView()
                // Flag is auto-cleared by resetZoom() method after 0.1s delay
            }
        }

        // Draw mode: drawing overlay captures all touches
        // Navigate mode: PDF handles all touches for pan/zoom
        // Enable drawing when:
        // 1. Draw mode is active AND (tool selected OR in measurement/calibration mode)
        // 2. Always when waiting for second tap (don't interrupt tap-to-place)
        let shouldEnableDrawing = viewModel.isWaitingForSecondTap || (
            viewModel.isDrawModeActive && (
                viewModel.selectedTool != nil ||
                viewModel.measurementMode == .calibrate ||
                viewModel.measurementMode == .linear ||
                viewModel.measurementMode == .area
            )
        )
        uiView.setDrawMode(shouldEnableDrawing)
    }

    class Coordinator: NSObject {
        var parent: InteractivePDFView
        weak var containerView: PDFContainerView?

        // Drawing state
        var drawingStartPoint: CGPoint?
        var currentPath: [CGPoint] = []

        init(_ parent: InteractivePDFView) {
            self.parent = parent
        }

        @objc func handleTap(_ gesture: UITapGestureRecognizer) {
            let location = gesture.location(in: containerView?.drawingOverlay)

            // First, check if we're tapping on an existing annotation (to select it)
            // Only check if we're not actively drawing or in calibration mode
            if !parent.viewModel.isWaitingForSecondTap && parent.viewModel.measurementMode != .calibrate {
                if let overlay = containerView?.drawingOverlay,
                   let hitAnnotation = overlay.hitTestAnnotation(at: location) {
                    // Select this annotation and show its info
                    parent.viewModel.selectAnnotation(hitAnnotation, at: location)
                    return
                } else {
                    // Clear selection if tapping elsewhere
                    parent.viewModel.clearAnnotationSelection()
                }
            }

            // Handle calibration mode
            if parent.viewModel.measurementMode == .calibrate {
                parent.onCalibrationTap?(location)
                return
            }

            // Handle measurement modes (linear, area) with tap-to-place
            let isMeasurementMode = parent.viewModel.measurementMode == .linear || parent.viewModel.measurementMode == .area
            if isMeasurementMode {
                // Use line tool for visual, but handled as measurement
                parent.viewModel.handleTapToPlace(at: location, tool: .line)
                return
            }

            // Handle annotation tools
            guard let tool = parent.viewModel.selectedTool else { return }

            // Tools that use tap-to-place for precision (two taps: start and end)
            let tapToPlaceTools: [AnnotationTool] = [.line, .arrow]
            let isTapToPlaceTool = tapToPlaceTools.contains(tool)

            if tool == .pin {
                // Pin is single-tap placement
                parent.viewModel.addAnnotationAtPoint(location, tool: tool)
            } else if isTapToPlaceTool {
                // Two-tap placement for lines and arrows
                parent.viewModel.handleTapToPlace(at: location, tool: tool)
            }
        }

        @objc func handlePan(_ gesture: UIPanGestureRecognizer) {
            guard let overlay = containerView?.drawingOverlay else { return }
            let location = gesture.location(in: overlay)

            guard let tool = parent.viewModel.selectedTool else { return }

            // Only use pan for freehand, rectangle, circle (shapes that benefit from drag)
            let dragTools: [AnnotationTool] = [.freehand, .rectangle, .circle, .text, .cloud, .highlight]
            guard dragTools.contains(tool) else { return }

            switch gesture.state {
            case .began:
                drawingStartPoint = location
                currentPath = [location]
                parent.viewModel.startDrawing(at: location)

            case .changed:
                currentPath.append(location)
                if let start = drawingStartPoint {
                    parent.viewModel.updateDrawing(from: start, to: location, path: currentPath)
                }

            case .ended, .cancelled:
                if let start = drawingStartPoint {
                    parent.viewModel.finishDrawing(from: start, to: location, path: currentPath)
                }
                drawingStartPoint = nil
                currentPath = []

            default:
                break
            }
        }

        @objc func handleLongPress(_ gesture: UILongPressGestureRecognizer) {
            // Long press cancels current tap-to-place operation
            if gesture.state == .began {
                parent.viewModel.cancelTapToPlace()
            }
        }
    }
}

// MARK: - PDF Container View with Drawing Overlay
class PDFContainerView: UIView {
    let pdfView = PDFView()
    let drawingOverlay = DrawingOverlayView()
    private weak var coordinator: InteractivePDFView.Coordinator?
    private var displayLink: CADisplayLink?

    // Canvas padding - extra space around PDF for accessing corners
    private let canvasPadding: CGFloat = 150

    func setup(document: PDFDocument, coordinator: InteractivePDFView.Coordinator) {
        self.coordinator = coordinator

        // Setup PDF View
        pdfView.document = document
        pdfView.backgroundColor = UIColor.darkGray  // Show canvas area
        pdfView.autoScales = true
        pdfView.displayMode = .singlePage
        pdfView.displayDirection = .horizontal
        pdfView.pageShadowsEnabled = true
        pdfView.pageBreakMargins = UIEdgeInsets(top: canvasPadding, left: canvasPadding, bottom: canvasPadding, right: canvasPadding)
        pdfView.minScaleFactor = 0.25
        pdfView.maxScaleFactor = 20.0
        pdfView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(pdfView)

        // Disable directional lock on PDFView's internal scroll view
        // This allows free panning in any direction without axis locking
        disableDirectionalLockOnScrollViews(in: pdfView)

        // Setup Drawing Overlay - positioned over the PDF view
        drawingOverlay.backgroundColor = .clear
        drawingOverlay.isUserInteractionEnabled = false  // Start in navigate mode
        drawingOverlay.translatesAutoresizingMaskIntoConstraints = false
        drawingOverlay.pdfView = pdfView  // Reference for coordinate transforms
        addSubview(drawingOverlay)

        // Constraints
        NSLayoutConstraint.activate([
            pdfView.topAnchor.constraint(equalTo: topAnchor),
            pdfView.bottomAnchor.constraint(equalTo: bottomAnchor),
            pdfView.leadingAnchor.constraint(equalTo: leadingAnchor),
            pdfView.trailingAnchor.constraint(equalTo: trailingAnchor),

            drawingOverlay.topAnchor.constraint(equalTo: topAnchor),
            drawingOverlay.bottomAnchor.constraint(equalTo: bottomAnchor),
            drawingOverlay.leadingAnchor.constraint(equalTo: leadingAnchor),
            drawingOverlay.trailingAnchor.constraint(equalTo: trailingAnchor),
        ])

        // Add gestures to drawing overlay
        // Tap gesture is always active (for selection and drawing)
        let tapGesture = UITapGestureRecognizer(target: coordinator, action: #selector(InteractivePDFView.Coordinator.handleTap(_:)))
        drawingOverlay.addGestureRecognizer(tapGesture)

        // Pan gesture is controlled by draw mode (disabled in navigate mode to allow PDF pan/zoom)
        let panGesture = UIPanGestureRecognizer(target: coordinator, action: #selector(InteractivePDFView.Coordinator.handlePan(_:)))
        drawingOverlay.addGestureRecognizer(panGesture)
        setPanGesture(panGesture)  // Store reference for enable/disable control

        let longPressGesture = UILongPressGestureRecognizer(target: coordinator, action: #selector(InteractivePDFView.Coordinator.handleLongPress(_:)))
        longPressGesture.minimumPressDuration = 0.5
        drawingOverlay.addGestureRecognizer(longPressGesture)

        // Listen for PDF view changes to update annotation positions
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(pdfViewChanged),
            name: .PDFViewScaleChanged,
            object: pdfView
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(pdfViewChanged),
            name: .PDFViewPageChanged,
            object: pdfView
        )

        // Use display link to sync overlay with PDF scrolling
        displayLink = CADisplayLink(target: self, selector: #selector(updateOverlay))
        displayLink?.add(to: .main, forMode: .common)

        // Initial fit
        DispatchQueue.main.async {
            self.pdfView.scaleFactor = self.pdfView.scaleFactorForSizeToFit
        }
    }

    @objc private func pdfViewChanged() {
        drawingOverlay.setNeedsDisplay()
    }

    @objc private func updateOverlay() {
        // Continuously sync overlay with PDF view state
        drawingOverlay.setNeedsDisplay()
    }

    private var panGesture: UIPanGestureRecognizer?

    func setDrawMode(_ enabled: Bool) {
        // Set the draw mode flag on the overlay (used by hitTest to decide if captures touches)
        drawingOverlay.isDrawModeEnabled = enabled

        // Pan gestures only work in draw mode (for drawing operations)
        panGesture?.isEnabled = enabled

        // Overlay is always enabled - hitTest controls which touches it captures
        drawingOverlay.isUserInteractionEnabled = true
    }

    func setPanGesture(_ gesture: UIPanGestureRecognizer) {
        self.panGesture = gesture
    }

    /// Recursively find and disable directional lock on all scroll views
    /// PDFView uses internal UIScrollViews that have directional lock enabled by default
    private func disableDirectionalLockOnScrollViews(in view: UIView) {
        for subview in view.subviews {
            if let scrollView = subview as? UIScrollView {
                scrollView.isDirectionalLockEnabled = false
            }
            disableDirectionalLockOnScrollViews(in: subview)
        }
    }

    deinit {
        displayLink?.invalidate()
        NotificationCenter.default.removeObserver(self)
    }
}

// MARK: - Drawing Overlay View
class DrawingOverlayView: UIView {
    var currentDrawing: CurrentDrawing?
    var completedAnnotations: [RenderedAnnotation] = []

    // Reference to PDF view for coordinate transforms
    weak var pdfView: PDFView?

    // Controls whether the overlay captures touches for drawing (vs passing through to PDF)
    var isDrawModeEnabled: Bool = false

    // Override hitTest to selectively capture touches
    // In draw mode: capture all touches for drawing
    // In navigate mode: only capture touches on annotations for selection, let others pass through
    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        if isDrawModeEnabled {
            // In draw mode, capture all touches
            return super.hitTest(point, with: event)
        } else {
            // In navigate mode, only capture if touching an annotation
            if hitTestAnnotation(at: point, tolerance: 25) != nil {
                return super.hitTest(point, with: event)
            }
            // Otherwise, pass through to PDF for pan/zoom
            return nil
        }
    }

    // Store annotations in PDF page coordinates (not screen coordinates)
    struct CurrentDrawing {
        var tool: AnnotationTool
        var color: UIColor
        var startPoint: CGPoint      // Screen coordinates (for live drawing)
        var endPoint: CGPoint        // Screen coordinates
        var path: [CGPoint]          // Screen coordinates
    }

    struct RenderedAnnotation {
        var id: String = UUID().uuidString
        var tool: AnnotationTool
        var color: UIColor
        var pdfStartPoint: CGPoint   // PDF page coordinates
        var pdfEndPoint: CGPoint     // PDF page coordinates
        var pdfPath: [CGPoint]       // PDF page coordinates
        var pageIndex: Int           // Which page the annotation is on
        var isMeasurement: Bool = false
        var measurementText: String? // Stored measurement result (e.g., "12.5 ft")
    }

    override func draw(_ rect: CGRect) {
        guard let context = UIGraphicsGetCurrentContext() else { return }

        // Draw completed annotations (transform from PDF coords to screen coords)
        for annotation in completedAnnotations {
            drawAnnotationFromPDFCoords(annotation, in: context)
        }

        // Draw current annotation being created (already in screen coords)
        if let drawing = currentDrawing {
            drawAnnotationAtScreenCoords(
                tool: drawing.tool,
                color: drawing.color,
                startPoint: drawing.startPoint,
                endPoint: drawing.endPoint,
                path: drawing.path,
                in: context
            )
        }
    }

    // Convert screen point to PDF page coordinates
    func screenToPDFPoint(_ screenPoint: CGPoint) -> (point: CGPoint, pageIndex: Int)? {
        guard let pdfView = pdfView,
              let page = pdfView.page(for: screenPoint, nearest: true) else {
            return nil
        }

        let pdfPoint = pdfView.convert(screenPoint, to: page)
        let pageIndex = pdfView.document?.index(for: page) ?? 0
        return (pdfPoint, pageIndex)
    }

    // Convert PDF page coordinates to screen point
    func pdfToScreenPoint(_ pdfPoint: CGPoint, pageIndex: Int) -> CGPoint? {
        guard let pdfView = pdfView,
              let document = pdfView.document,
              pageIndex < document.pageCount,
              let page = document.page(at: pageIndex) else {
            return nil
        }

        return pdfView.convert(pdfPoint, from: page)
    }

    private func drawAnnotationFromPDFCoords(_ annotation: RenderedAnnotation, in context: CGContext) {
        // Convert PDF coordinates back to screen coordinates
        guard let startScreen = pdfToScreenPoint(annotation.pdfStartPoint, pageIndex: annotation.pageIndex),
              let endScreen = pdfToScreenPoint(annotation.pdfEndPoint, pageIndex: annotation.pageIndex) else {
            return
        }

        // Convert path points
        let screenPath = annotation.pdfPath.compactMap { pdfToScreenPoint($0, pageIndex: annotation.pageIndex) }

        // Calculate scale factor for line width based on current zoom
        let scaleFactor = pdfView?.scaleFactor ?? 1.0
        let baseLineWidth: CGFloat = 3.0
        let scaledLineWidth = baseLineWidth / CGFloat(scaleFactor)

        drawAnnotationAtScreenCoords(
            tool: annotation.tool,
            color: annotation.color,
            startPoint: startScreen,
            endPoint: endScreen,
            path: screenPath,
            in: context,
            lineWidth: max(1.0, min(scaledLineWidth, 6.0))  // Clamp line width
        )
    }

    private func drawAnnotationAtScreenCoords(tool: AnnotationTool, color: UIColor, startPoint: CGPoint, endPoint: CGPoint, path: [CGPoint], in context: CGContext, lineWidth: CGFloat = 3.0) {
        context.setStrokeColor(color.cgColor)
        context.setFillColor(color.withAlphaComponent(0.2).cgColor)
        context.setLineWidth(lineWidth)

        switch tool {
        case .pin:
            // Draw a pin marker
            let pinPath = UIBezierPath()
            let center = startPoint
            let radius: CGFloat = 10
            pinPath.addArc(withCenter: center, radius: radius, startAngle: 0, endAngle: .pi * 2, clockwise: true)
            context.addPath(pinPath.cgPath)
            context.setFillColor(color.cgColor)
            context.fillPath()
            // Add white border
            context.setStrokeColor(UIColor.white.cgColor)
            context.setLineWidth(2)
            context.addPath(pinPath.cgPath)
            context.strokePath()

        case .line:
            // Draw simple line without arrowhead
            context.move(to: startPoint)
            context.addLine(to: endPoint)
            context.strokePath()

        case .arrow:
            // Draw line with arrow
            context.move(to: startPoint)
            context.addLine(to: endPoint)
            context.strokePath()
            drawArrowHead(context: context, from: startPoint, to: endPoint, color: color, size: lineWidth * 5)

        case .rectangle:
            let rect = CGRect(
                x: min(startPoint.x, endPoint.x),
                y: min(startPoint.y, endPoint.y),
                width: abs(endPoint.x - startPoint.x),
                height: abs(endPoint.y - startPoint.y)
            )
            context.addRect(rect)
            context.drawPath(using: .fillStroke)

        case .circle:
            let center = CGPoint(
                x: (startPoint.x + endPoint.x) / 2,
                y: (startPoint.y + endPoint.y) / 2
            )
            let radius = sqrt(
                pow(endPoint.x - startPoint.x, 2) +
                pow(endPoint.y - startPoint.y, 2)
            ) / 2
            context.addArc(center: center, radius: radius, startAngle: 0, endAngle: .pi * 2, clockwise: true)
            context.drawPath(using: .fillStroke)

        case .freehand:
            guard path.count > 1 else { return }
            context.move(to: path[0])
            for point in path.dropFirst() {
                context.addLine(to: point)
            }
            context.strokePath()

        case .text, .cloud, .highlight:
            // Basic rectangle for now
            let rect = CGRect(
                x: min(startPoint.x, endPoint.x),
                y: min(startPoint.y, endPoint.y),
                width: max(abs(endPoint.x - startPoint.x), 50),
                height: max(abs(endPoint.y - startPoint.y), 30)
            )
            context.addRect(rect)
            context.drawPath(using: .stroke)
        }
    }

    private func drawArrowHead(context: CGContext, from start: CGPoint, to end: CGPoint, color: UIColor, size: CGFloat = 15) {
        let arrowLength: CGFloat = size
        let arrowAngle: CGFloat = .pi / 6

        let angle = atan2(end.y - start.y, end.x - start.x)

        let arrowPoint1 = CGPoint(
            x: end.x - arrowLength * cos(angle - arrowAngle),
            y: end.y - arrowLength * sin(angle - arrowAngle)
        )
        let arrowPoint2 = CGPoint(
            x: end.x - arrowLength * cos(angle + arrowAngle),
            y: end.y - arrowLength * sin(angle + arrowAngle)
        )

        context.setFillColor(color.cgColor)
        context.move(to: end)
        context.addLine(to: arrowPoint1)
        context.addLine(to: arrowPoint2)
        context.closePath()
        context.fillPath()
    }

    func updateCurrentDrawing(tool: AnnotationTool, color: UIColor, start: CGPoint, end: CGPoint, path: [CGPoint]) {
        currentDrawing = CurrentDrawing(tool: tool, color: color, startPoint: start, endPoint: end, path: path)
        setNeedsDisplay()
    }

    func finishCurrentDrawing() {
        guard let drawing = currentDrawing else {
            currentDrawing = nil
            return
        }

        // Convert screen coordinates to PDF coordinates for storage
        if let startPDF = screenToPDFPoint(drawing.startPoint),
           let endPDF = screenToPDFPoint(drawing.endPoint) {
            let pdfPath = drawing.path.compactMap { screenToPDFPoint($0)?.point }

            completedAnnotations.append(RenderedAnnotation(
                tool: drawing.tool,
                color: drawing.color,
                pdfStartPoint: startPDF.point,
                pdfEndPoint: endPDF.point,
                pdfPath: pdfPath,
                pageIndex: startPDF.pageIndex
            ))
        }

        currentDrawing = nil
        setNeedsDisplay()
    }

    func clearCurrentDrawing() {
        currentDrawing = nil
        setNeedsDisplay()
    }

    func clearAllAnnotations() {
        completedAnnotations.removeAll()
        currentDrawing = nil
        setNeedsDisplay()
    }

    /// Delete an annotation by ID
    func deleteAnnotation(id: String) {
        completedAnnotations.removeAll { $0.id == id }
        setNeedsDisplay()
    }

    /// Check if a screen point hits an existing annotation
    /// Returns the annotation ID if hit, nil otherwise
    func hitTestAnnotation(at screenPoint: CGPoint, tolerance: CGFloat = 20) -> RenderedAnnotation? {
        for annotation in completedAnnotations {
            guard let startScreen = pdfToScreenPoint(annotation.pdfStartPoint, pageIndex: annotation.pageIndex),
                  let endScreen = pdfToScreenPoint(annotation.pdfEndPoint, pageIndex: annotation.pageIndex) else {
                continue
            }

            // For lines/arrows, check distance to line segment
            if annotation.tool == .line || annotation.tool == .arrow {
                let distance = distanceFromPointToLineSegment(point: screenPoint, lineStart: startScreen, lineEnd: endScreen)
                if distance <= tolerance {
                    return annotation
                }
            }
            // For pins, check distance to center
            else if annotation.tool == .pin {
                let distance = sqrt(pow(screenPoint.x - startScreen.x, 2) + pow(screenPoint.y - startScreen.y, 2))
                if distance <= tolerance {
                    return annotation
                }
            }
            // For rectangles/circles, check if point is inside or near edges
            else {
                let rect = CGRect(
                    x: min(startScreen.x, endScreen.x) - tolerance,
                    y: min(startScreen.y, endScreen.y) - tolerance,
                    width: abs(endScreen.x - startScreen.x) + tolerance * 2,
                    height: abs(endScreen.y - startScreen.y) + tolerance * 2
                )
                if rect.contains(screenPoint) {
                    return annotation
                }
            }
        }
        return nil
    }

    /// Calculate distance from point to line segment
    private func distanceFromPointToLineSegment(point: CGPoint, lineStart: CGPoint, lineEnd: CGPoint) -> CGFloat {
        let lineLength = sqrt(pow(lineEnd.x - lineStart.x, 2) + pow(lineEnd.y - lineStart.y, 2))
        if lineLength == 0 {
            return sqrt(pow(point.x - lineStart.x, 2) + pow(point.y - lineStart.y, 2))
        }

        // Calculate projection of point onto line
        let t = max(0, min(1, ((point.x - lineStart.x) * (lineEnd.x - lineStart.x) + (point.y - lineStart.y) * (lineEnd.y - lineStart.y)) / pow(lineLength, 2)))

        let projectionX = lineStart.x + t * (lineEnd.x - lineStart.x)
        let projectionY = lineStart.y + t * (lineEnd.y - lineStart.y)

        return sqrt(pow(point.x - projectionX, 2) + pow(point.y - projectionY, 2))
    }

    /// Add an annotation with measurement info
    func addMeasurementAnnotation(tool: AnnotationTool, color: UIColor, pdfStart: CGPoint, pdfEnd: CGPoint, pageIndex: Int, measurementText: String) {
        let annotation = RenderedAnnotation(
            tool: tool,
            color: color,
            pdfStartPoint: pdfStart,
            pdfEndPoint: pdfEnd,
            pdfPath: [pdfStart, pdfEnd],
            pageIndex: pageIndex,
            isMeasurement: true,
            measurementText: measurementText
        )
        completedAnnotations.append(annotation)
        setNeedsDisplay()
    }
}

// MARK: - Annotation Tooltip
struct AnnotationTooltip: View {
    let annotation: DrawingOverlayView.RenderedAnnotation
    let position: CGPoint
    let onDelete: () -> Void
    let onDismiss: () -> Void

    var body: some View {
        GeometryReader { geometry in
            // Calculate position to keep tooltip on screen
            let tooltipWidth: CGFloat = 200
            let tooltipHeight: CGFloat = annotation.isMeasurement ? 100 : 80

            // Adjust position to stay within bounds
            let adjustedX = min(max(tooltipWidth / 2, position.x), geometry.size.width - tooltipWidth / 2)
            let adjustedY = max(tooltipHeight + 20, position.y - 50) // Position above the tap point

            VStack(spacing: 10) {
                if annotation.isMeasurement, let measurementText = annotation.measurementText {
                    // Measurement tooltip
                    HStack(spacing: 6) {
                        Image(systemName: "ruler.fill")
                            .font(.system(size: 14))
                            .foregroundColor(.white)
                        Text(measurementText)
                            .font(.system(size: 18, weight: .bold, design: .monospaced))
                            .foregroundColor(.white)
                    }
                } else {
                    // Regular annotation tooltip
                    HStack(spacing: 6) {
                        Image(systemName: annotation.tool.icon)
                            .font(.system(size: 14))
                            .foregroundColor(.white)
                        Text(annotation.tool.rawValue)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.white)
                    }
                }

                // Delete button
                Button(action: onDelete) {
                    HStack(spacing: 4) {
                        Image(systemName: "trash")
                            .font(.system(size: 12))
                        Text("Delete")
                            .font(.system(size: 12, weight: .medium))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.red.opacity(0.8))
                    .cornerRadius(6)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(
                annotation.isMeasurement
                    ? Color.blue.opacity(0.95)
                    : Color(annotation.color).opacity(0.95)
            )
            .cornerRadius(12)
            .shadow(color: Color.black.opacity(0.3), radius: 8, x: 0, y: 4)
            .position(x: adjustedX, y: adjustedY)
            .transition(.scale.combined(with: .opacity))
            .animation(.spring(response: 0.3, dampingFraction: 0.7), value: position)
        }
    }
}

// MARK: - Grid Overlay
struct GridOverlay: View {
    var body: some View {
        GeometryReader { geometry in
            Path { path in
                let spacing: CGFloat = 50
                // Vertical lines
                for x in stride(from: 0, to: geometry.size.width, by: spacing) {
                    path.move(to: CGPoint(x: x, y: 0))
                    path.addLine(to: CGPoint(x: x, y: geometry.size.height))
                }
                // Horizontal lines
                for y in stride(from: 0, to: geometry.size.height, by: spacing) {
                    path.move(to: CGPoint(x: 0, y: y))
                    path.addLine(to: CGPoint(x: geometry.size.width, y: y))
                }
            }
            .stroke(Color.gray.opacity(0.2), lineWidth: 0.5)
        }
    }
}

// MARK: - Annotation View
struct AnnotationView: View {
    let annotation: DrawingAnnotation

    var body: some View {
        // Simplified annotation rendering
        Circle()
            .fill(Color(hex: annotation.color).opacity(0.5))
            .frame(width: 20, height: 20)
            .position(annotation.position)
    }
}

// MARK: - Annotation Overlay
struct AnnotationOverlay: View {
    let tool: AnnotationTool
    let color: AnnotationColor
    let onComplete: (DrawingAnnotation) -> Void

    var body: some View {
        Color.clear
            .contentShape(Rectangle())
            .onTapGesture { location in
                let annotation = DrawingAnnotation(
                    id: UUID().uuidString,
                    drawingId: "",
                    type: .pin,
                    pageNumber: 1,
                    position: location,
                    size: nil,
                    color: color.hexString,
                    content: nil,
                    createdBy: "1",
                    createdAt: Date()
                )
                onComplete(annotation)
            }
    }
}

// MARK: - Drawing Info Sheet
struct DrawingInfoSheet: View {
    let drawing: Drawing
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: AppSpacing.lg) {
                    // Header
                    HStack(spacing: AppSpacing.md) {
                        ZStack {
                            RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                                .fill(drawing.category.color.opacity(0.1))
                                .frame(width: 64, height: 64)
                            Image(systemName: drawing.category.icon)
                                .font(.system(size: 28))
                                .foregroundColor(drawing.category.color)
                        }

                        VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                            if let sheetNumber = drawing.sheetNumber {
                                Text(sheetNumber)
                                    .font(AppTypography.heading3)
                                    .foregroundColor(drawing.category.color)
                            }
                            Text(drawing.name)
                                .font(AppTypography.bodySemibold)
                                .foregroundColor(AppColors.textPrimary)
                        }
                    }

                    Divider()

                    // Details
                    VStack(spacing: AppSpacing.md) {
                        DrawingInfoRow(label: "Category", value: drawing.category.rawValue)
                        DrawingInfoRow(label: "Discipline", value: drawing.discipline.rawValue)
                        DrawingInfoRow(label: "Revision", value: drawing.revision)
                        DrawingInfoRow(label: "Pages", value: "\(drawing.pageCount)")
                        DrawingInfoRow(label: "File Size", value: drawing.fileSizeFormatted)
                        DrawingInfoRow(label: "Uploaded", value: formatDate(drawing.uploadedAt))
                        DrawingInfoRow(label: "Last Modified", value: formatDate(drawing.lastModified))
                    }

                    if let description = drawing.description {
                        Divider()
                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("Description")
                                .font(AppTypography.label)
                                .foregroundColor(AppColors.textPrimary)
                            Text(description)
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textSecondary)
                        }
                    }
                }
                .padding(AppSpacing.md)
            }
            .navigationTitle("Drawing Info")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

// MARK: - Drawing Info Row
struct DrawingInfoRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)
            Spacer()
            Text(value)
                .font(AppTypography.bodyMedium)
                .foregroundColor(AppColors.textPrimary)
        }
    }
}

// MARK: - OCR Results Sheet
struct OCRResultsSheet: View {
    let drawing: Drawing
    @ObservedObject var viewModel: DrawingViewerViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var isScanning = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: AppSpacing.lg) {
                    if let ocrData = drawing.ocrData {
                        // Title Block Info
                        if let titleBlock = ocrData.titleBlock {
                            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                                Text("Title Block")
                                    .font(AppTypography.heading3)
                                    .foregroundColor(AppColors.textPrimary)

                                AppCard {
                                    VStack(spacing: AppSpacing.xs) {
                                        if let projectName = titleBlock.projectName {
                                            DrawingInfoRow(label: "Project", value: projectName)
                                        }
                                        if let sheetTitle = titleBlock.sheetTitle {
                                            DrawingInfoRow(label: "Sheet Title", value: sheetTitle)
                                        }
                                        if let scale = titleBlock.scale {
                                            DrawingInfoRow(label: "Scale", value: scale)
                                        }
                                        if let date = titleBlock.date {
                                            DrawingInfoRow(label: "Date", value: date)
                                        }
                                    }
                                }
                            }
                        }

                        // Extracted Dimensions
                        if !ocrData.dimensions.isEmpty {
                            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                                Text("Dimensions Found")
                                    .font(AppTypography.heading3)
                                    .foregroundColor(AppColors.textPrimary)

                                ForEach(ocrData.dimensions) { dim in
                                    HStack {
                                        Image(systemName: "ruler")
                                            .foregroundColor(AppColors.primary600)
                                        Text("\(dim.value) \(dim.unit)")
                                            .font(AppTypography.bodyMedium)
                                    }
                                    .padding(AppSpacing.sm)
                                    .background(AppColors.primary50)
                                    .cornerRadius(AppSpacing.radiusSmall)
                                }
                            }
                        }

                        // Notes
                        if !ocrData.notes.isEmpty {
                            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                                Text("Notes")
                                    .font(AppTypography.heading3)
                                    .foregroundColor(AppColors.textPrimary)

                                ForEach(ocrData.notes, id: \.self) { note in
                                    Text("• \(note)")
                                        .font(AppTypography.secondary)
                                        .foregroundColor(AppColors.textSecondary)
                                }
                            }
                        }
                    } else {
                        // No OCR data - offer to scan
                        VStack(spacing: AppSpacing.lg) {
                            Image(systemName: "text.viewfinder")
                                .font(.system(size: 60))
                                .foregroundColor(AppColors.gray300)

                            Text("No OCR Data")
                                .font(AppTypography.heading3)
                                .foregroundColor(AppColors.textPrimary)

                            Text("Scan this drawing to extract text, dimensions, and other data.")
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textSecondary)
                                .multilineTextAlignment(.center)

                            PrimaryButton("Scan Drawing", icon: "text.viewfinder", isLoading: isScanning) {
                                isScanning = true
                                // Simulate OCR scan
                                DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                                    isScanning = false
                                    viewModel.performOCR()
                                }
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(AppSpacing.xl)
                    }
                }
                .padding(AppSpacing.md)
            }
            .navigationTitle("OCR Results")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

// MARK: - Drawing Upload View
struct DrawingUploadView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var selectedCategory: DrawingCategory = .architectural
    @State private var selectedDiscipline: DrawingDiscipline = .floorPlan
    @State private var sheetNumber = ""
    @State private var revision = "A"
    @State private var description = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // File Selection
                    VStack(spacing: AppSpacing.sm) {
                        ZStack {
                            RoundedRectangle(cornerRadius: AppSpacing.radiusLarge)
                                .stroke(style: StrokeStyle(lineWidth: 2, dash: [8]))
                                .foregroundColor(AppColors.gray300)
                                .frame(height: 150)

                            VStack(spacing: AppSpacing.sm) {
                                Image(systemName: "doc.badge.plus")
                                    .font(.system(size: 40))
                                    .foregroundColor(AppColors.primary600)
                                Text("Tap to select PDF or image")
                                    .font(AppTypography.secondary)
                                    .foregroundColor(AppColors.textSecondary)
                            }
                        }
                    }

                    // Form Fields
                    VStack(spacing: AppSpacing.md) {
                        AppTextField(label: "Drawing Name", placeholder: "e.g., Floor Plan - Level 1", text: $name, isRequired: true)

                        AppTextField(label: "Sheet Number", placeholder: "e.g., A-101", text: $sheetNumber)

                        AppTextField(label: "Revision", placeholder: "e.g., A", text: $revision)

                        // Category Picker
                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("Category")
                                .font(AppTypography.label)
                            Picker("Category", selection: $selectedCategory) {
                                ForEach(DrawingCategory.allCases, id: \.self) { cat in
                                    Text(cat.rawValue).tag(cat)
                                }
                            }
                            .pickerStyle(.menu)
                        }

                        // Discipline Picker
                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("Discipline")
                                .font(AppTypography.label)
                            Picker("Discipline", selection: $selectedDiscipline) {
                                ForEach(DrawingDiscipline.allCases, id: \.self) { disc in
                                    Text(disc.rawValue).tag(disc)
                                }
                            }
                            .pickerStyle(.menu)
                        }

                        AppTextArea(label: "Description", placeholder: "Optional description...", text: $description)
                    }

                    PrimaryButton("Upload Drawing", icon: "arrow.up.circle.fill") {
                        dismiss()
                    }
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("Upload Drawing")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
}

// MARK: - ViewModel
@MainActor
class DrawingViewerViewModel: ObservableObject {
    @Published var drawing: Drawing
    @Published var annotations: [DrawingAnnotation] = []
    @Published var selectedTool: AnnotationTool?
    @Published var selectedColor: AnnotationColor = .red
    @Published var measurementMode: MeasurementMode = .linear
    @Published var ocrData: DrawingOCRData?

    // Draw/Navigate mode toggle
    // When true: single finger draws annotations
    // When false: single finger pans/zooms PDF
    @Published var isDrawModeActive = false

    // Tap-to-place state for precise line/arrow/measurement drawing
    // nil = waiting for first tap, CGPoint = first point placed, waiting for second
    @Published var tapToPlaceStartPoint: CGPoint?
    @Published var tapToPlaceTool: AnnotationTool?

    // Calibration state - uses PDF coordinates for zoom-independent accuracy
    @Published var calibrationScale: Double?  // PDF points per real-world unit (e.g., PDF points per foot)
    @Published var calibrationPoints: [CGPoint] = []  // Screen coordinates for display
    @Published var calibrationPDFPoints: [CGPoint] = []  // PDF coordinates for calculation
    @Published var calibrationKnownDistance: Double?  // Known distance in feet

    // Zoom control
    @Published var shouldResetZoom = false

    // Drawing overlay reference for live updates
    weak var drawingOverlay: DrawingOverlayView?

    // Selected annotation for displaying measurement info
    @Published var selectedAnnotation: DrawingOverlayView.RenderedAnnotation?
    @Published var selectedAnnotationScreenPosition: CGPoint?

    init(drawing: Drawing) {
        self.drawing = drawing
        self.annotations = drawing.annotations
        self.ocrData = drawing.ocrData
        // Note: OCR scale string is for display only - actual measurements require manual calibration
        // because PDF resolution varies based on how the drawing was scanned/exported
    }

    /// Load a new drawing (for prev/next navigation)
    func loadDrawing(_ newDrawing: Drawing) {
        self.drawing = newDrawing
        self.annotations = newDrawing.annotations
        self.ocrData = newDrawing.ocrData

        // Reset drawing state
        cancelTapToPlace()
        clearAnnotationSelection()
        drawingOverlay?.clearCurrentDrawing()
        drawingOverlay?.completedAnnotations.removeAll()
        currentMeasurement = nil

        // Reset zoom using the proper method that auto-clears the flag
        resetZoom()

        // Note: Calibration is intentionally preserved across drawings
        // since construction drawings in a set typically share the same scale
    }

    /// Returns the display scale string from OCR (informational only, not for calculations)
    var displayScale: String? {
        return ocrData?.titleBlock?.scale
    }

    func addCalibrationPoint(_ screenPoint: CGPoint) {
        // Store screen point for display
        calibrationPoints.append(screenPoint)

        // Convert to PDF coordinates for zoom-independent calculation
        if let overlay = drawingOverlay,
           let pdfPoint = overlay.screenToPDFPoint(screenPoint) {
            calibrationPDFPoints.append(pdfPoint.point)
            print("[Calibration] Added PDF point: \(pdfPoint.point) from screen point: \(screenPoint)")
        } else {
            // Fallback: store screen point (less accurate but functional)
            calibrationPDFPoints.append(screenPoint)
            print("[Calibration] Warning: Could not convert to PDF coordinates, using screen point")
        }

        if calibrationPoints.count >= 2 {
            // Ready for user to input known distance
        }
    }

    func completeCalibration(knownDistanceFeet: Double) {
        print("[Calibration ViewModel] completeCalibration called with \(knownDistanceFeet) feet")
        print("[Calibration ViewModel] calibrationPDFPoints.count = \(calibrationPDFPoints.count)")

        guard calibrationPDFPoints.count >= 2 else {
            print("[Calibration ViewModel] ERROR: Not enough calibration points!")
            return
        }

        // Use PDF coordinates for zoom-independent calculation
        let p1 = calibrationPDFPoints[0]
        let p2 = calibrationPDFPoints[1]
        let pdfPixelDistance = sqrt(pow(p2.x - p1.x, 2) + pow(p2.y - p1.y, 2))

        print("[Calibration ViewModel] pdfPixelDistance = \(pdfPixelDistance)")

        // Calculate PDF points per foot (zoom-independent)
        calibrationScale = pdfPixelDistance / knownDistanceFeet
        calibrationKnownDistance = knownDistanceFeet

        print("[Calibration ViewModel] calibrationScale (PDF points/foot) = \(calibrationScale ?? -1)")

        // Reset calibration points
        calibrationPoints.removeAll()
        calibrationPDFPoints.removeAll()
        measurementMode = .linear

        print("[Calibration ViewModel] Calibration complete!")
    }

    func resetCalibration() {
        calibrationPoints.removeAll()
        calibrationPDFPoints.removeAll()
        calibrationScale = nil
        calibrationKnownDistance = nil
    }

    func resetZoom() {
        shouldResetZoom = true
        // Reset flag after a brief delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            self.shouldResetZoom = false
        }
    }

    func addAnnotation(_ annotation: DrawingAnnotation) {
        annotations.append(annotation)
    }

    // MARK: - Tap-to-Place Methods (for precise line/arrow drawing)

    func handleTapToPlace(at point: CGPoint, tool: AnnotationTool) {
        // Clear any annotation selection when starting a new measurement/annotation
        clearAnnotationSelection()

        if let startPoint = tapToPlaceStartPoint {
            // Second tap - complete the annotation
            finishTapToPlace(from: startPoint, to: point, tool: tapToPlaceTool ?? tool)
        } else {
            // First tap - set start point
            tapToPlaceStartPoint = point
            tapToPlaceTool = tool

            // Show start point marker
            if let overlay = drawingOverlay {
                let uiColor = UIColor(selectedColor.color)
                overlay.updateCurrentDrawing(tool: .pin, color: uiColor, start: point, end: point, path: [point])
            }
        }
    }

    func finishTapToPlace(from start: CGPoint, to end: CGPoint, tool: AnnotationTool) {
        guard let overlay = drawingOverlay else { return }

        let uiColor = UIColor(selectedColor.color)

        // Check if this is a measurement
        let isMeasurement = measurementMode == .linear || measurementMode == .area

        if isMeasurement {
            // Convert screen points to PDF coordinates for zoom-independent measurement
            guard let pdfStartData = overlay.screenToPDFPoint(start),
                  let pdfEndData = overlay.screenToPDFPoint(end) else {
                // Fallback if conversion fails
                tapToPlaceStartPoint = nil
                tapToPlaceTool = nil
                return
            }

            let pdfStart = pdfStartData.point
            let pdfEnd = pdfEndData.point
            let pageIndex = pdfStartData.pageIndex

            // Calculate measurement using PDF coordinates (zoom-independent)
            let pdfPixelDistance = sqrt(pow(pdfEnd.x - pdfStart.x, 2) + pow(pdfEnd.y - pdfStart.y, 2))
            var result = MeasurementResult(startPoint: start, endPoint: end, pixelDistance: pdfPixelDistance)

            var measurementText: String = String(format: "%.0f px", pdfPixelDistance)

            if let scale = calibrationScale, scale > 0 {
                result.realDistance = pdfPixelDistance / scale

                if measurementMode == .area {
                    let width = abs(pdfEnd.x - pdfStart.x) / scale
                    let height = abs(pdfEnd.y - pdfStart.y) / scale
                    result.area = width * height
                    measurementText = String(format: "%.1f sq ft", result.area!)
                } else {
                    if result.realDistance! >= 1 {
                        measurementText = String(format: "%.1f ft", result.realDistance!)
                    } else {
                        measurementText = String(format: "%.1f in", result.realDistance! * 12)
                    }
                }
            }

            currentMeasurement = result

            // Add measurement annotation with stored text (so it can be selected later)
            overlay.addMeasurementAnnotation(
                tool: .arrow,
                color: .systemBlue,
                pdfStart: pdfStart,
                pdfEnd: pdfEnd,
                pageIndex: pageIndex,
                measurementText: measurementText
            )
        } else {
            // Handle as annotation
            overlay.updateCurrentDrawing(tool: tool, color: uiColor, start: start, end: end, path: [start, end])
            overlay.finishCurrentDrawing()

            // Add to data model
            let annotation = DrawingAnnotation(
                id: UUID().uuidString,
                drawingId: drawing.id,
                type: annotationType(from: tool),
                pageNumber: 1,
                position: start,
                size: CGSize(width: abs(end.x - start.x), height: abs(end.y - start.y)),
                color: selectedColor.hexString,
                content: nil,
                createdBy: "current_user",
                createdAt: Date()
            )
            annotations.append(annotation)
        }

        // Reset tap-to-place state
        tapToPlaceStartPoint = nil
        tapToPlaceTool = nil
    }

    func cancelTapToPlace() {
        tapToPlaceStartPoint = nil
        tapToPlaceTool = nil
        drawingOverlay?.clearCurrentDrawing()
    }

    /// Check if we're in tap-to-place mode (waiting for second tap)
    var isWaitingForSecondTap: Bool {
        return tapToPlaceStartPoint != nil
    }

    // MARK: - Annotation Selection

    func selectAnnotation(_ annotation: DrawingOverlayView.RenderedAnnotation, at screenPosition: CGPoint) {
        selectedAnnotation = annotation
        // Position the tooltip near the midpoint of the annotation
        if let overlay = drawingOverlay,
           let startScreen = overlay.pdfToScreenPoint(annotation.pdfStartPoint, pageIndex: annotation.pageIndex),
           let endScreen = overlay.pdfToScreenPoint(annotation.pdfEndPoint, pageIndex: annotation.pageIndex) {
            let midpoint = CGPoint(
                x: (startScreen.x + endScreen.x) / 2,
                y: (startScreen.y + endScreen.y) / 2
            )
            selectedAnnotationScreenPosition = midpoint
        } else {
            selectedAnnotationScreenPosition = screenPosition
        }
    }

    func clearAnnotationSelection() {
        selectedAnnotation = nil
        selectedAnnotationScreenPosition = nil
    }

    func deleteSelectedAnnotation() {
        guard let annotation = selectedAnnotation else { return }
        drawingOverlay?.deleteAnnotation(id: annotation.id)
        clearAnnotationSelection()
    }

    /// Clear all annotations for this drawing (calls API and clears local state)
    func clearAllAnnotations() async {
        do {
            // Call API to clear all annotations for this drawing
            try await APIClient.shared.delete("/documents/\(drawing.id)/annotations?clearAll=true")

            // Clear local state
            await MainActor.run {
                annotations.removeAll()
                drawingOverlay?.clearAllAnnotations()
                clearAnnotationSelection()
            }
        } catch {
            print("Failed to clear annotations: \(error)")
        }
    }

    // MARK: - Drawing Methods

    func addAnnotationAtPoint(_ point: CGPoint, tool: AnnotationTool) {
        guard let overlay = drawingOverlay else { return }

        let uiColor = UIColor(selectedColor.color)
        overlay.updateCurrentDrawing(tool: tool, color: uiColor, start: point, end: point, path: [point])
        overlay.finishCurrentDrawing()

        // Also add to data model
        let annotation = DrawingAnnotation(
            id: UUID().uuidString,
            drawingId: drawing.id,
            type: .pin,
            pageNumber: 1,
            position: point,
            size: nil,
            color: selectedColor.hexString,
            content: nil,
            createdBy: "current_user",
            createdAt: Date()
        )
        annotations.append(annotation)
    }

    func startDrawing(at point: CGPoint) {
        guard let tool = selectedTool, let overlay = drawingOverlay else { return }
        let uiColor = UIColor(selectedColor.color)
        overlay.updateCurrentDrawing(tool: tool, color: uiColor, start: point, end: point, path: [point])
    }

    func updateDrawing(from start: CGPoint, to end: CGPoint, path: [CGPoint]) {
        guard let tool = selectedTool, let overlay = drawingOverlay else { return }
        let uiColor = UIColor(selectedColor.color)
        overlay.updateCurrentDrawing(tool: tool, color: uiColor, start: start, end: end, path: path)
    }

    func finishDrawing(from start: CGPoint, to end: CGPoint, path: [CGPoint]) {
        guard let tool = selectedTool, let overlay = drawingOverlay else { return }

        overlay.finishCurrentDrawing()

        // Also add to data model
        let annotation = DrawingAnnotation(
            id: UUID().uuidString,
            drawingId: drawing.id,
            type: annotationType(from: tool),
            pageNumber: 1,
            position: start,
            size: CGSize(width: abs(end.x - start.x), height: abs(end.y - start.y)),
            color: selectedColor.hexString,
            content: nil,
            createdBy: "current_user",
            createdAt: Date()
        )
        annotations.append(annotation)
    }

    private func annotationType(from tool: AnnotationTool) -> DrawingAnnotation.AnnotationType {
        switch tool {
        case .pin: return .pin
        case .text: return .text
        case .line: return .line
        case .arrow: return .arrow
        case .rectangle: return .rectangle
        case .circle: return .circle
        case .freehand: return .freehand
        case .cloud: return .cloudBubble
        case .highlight: return .highlight
        }
    }

    // MARK: - Measurement Methods

    @Published var currentMeasurement: MeasurementResult?

    struct MeasurementResult {
        var startPoint: CGPoint
        var endPoint: CGPoint
        var pixelDistance: Double
        var realDistance: Double?  // in feet, if calibrated
        var area: Double?  // in sq ft, if calibrated and area mode
    }

    func startMeasurement(at point: CGPoint) {
        guard let overlay = drawingOverlay else { return }

        // Use a measurement line style (dashed blue)
        let measureColor = UIColor.systemBlue
        if measurementMode == .linear {
            overlay.updateCurrentDrawing(tool: .arrow, color: measureColor, start: point, end: point, path: [point])
        } else if measurementMode == .area {
            overlay.updateCurrentDrawing(tool: .rectangle, color: measureColor, start: point, end: point, path: [point])
        }
    }

    func updateMeasurement(from start: CGPoint, to end: CGPoint, path: [CGPoint]) {
        guard let overlay = drawingOverlay else { return }

        let measureColor = UIColor.systemBlue
        if measurementMode == .linear {
            overlay.updateCurrentDrawing(tool: .arrow, color: measureColor, start: start, end: end, path: path)
        } else if measurementMode == .area {
            overlay.updateCurrentDrawing(tool: .rectangle, color: measureColor, start: start, end: end, path: path)
        }

        // Calculate and update measurement
        let pixelDistance = sqrt(pow(end.x - start.x, 2) + pow(end.y - start.y, 2))
        var result = MeasurementResult(startPoint: start, endPoint: end, pixelDistance: pixelDistance)

        if let scale = calibrationScale, scale > 0 {
            result.realDistance = pixelDistance / scale

            if measurementMode == .area {
                let width = abs(end.x - start.x) / scale
                let height = abs(end.y - start.y) / scale
                result.area = width * height
            }
        }

        currentMeasurement = result
    }

    func finishMeasurement(from start: CGPoint, to end: CGPoint, path: [CGPoint]) {
        guard let overlay = drawingOverlay else { return }

        overlay.finishCurrentDrawing()

        // Keep the measurement result for display
        let pixelDistance = sqrt(pow(end.x - start.x, 2) + pow(end.y - start.y, 2))
        var result = MeasurementResult(startPoint: start, endPoint: end, pixelDistance: pixelDistance)

        if let scale = calibrationScale, scale > 0 {
            result.realDistance = pixelDistance / scale

            if measurementMode == .area {
                let width = abs(end.x - start.x) / scale
                let height = abs(end.y - start.y) / scale
                result.area = width * height
            }
        }

        currentMeasurement = result
    }

    var measurementDisplayText: String? {
        guard let measurement = currentMeasurement else { return nil }

        if let area = measurement.area {
            return String(format: "%.1f sq ft", area)
        } else if let distance = measurement.realDistance {
            if distance >= 1 {
                return String(format: "%.1f ft", distance)
            } else {
                return String(format: "%.1f in", distance * 12)
            }
        } else {
            return String(format: "%.0f px", measurement.pixelDistance)
        }
    }

    func performOCR() {
        // Simulate OCR results
        ocrData = DrawingOCRData(
            extractedAt: Date(),
            titleBlock: DrawingOCRData.TitleBlockData(
                projectName: "Downtown Office Building",
                projectNumber: "2024-001",
                sheetTitle: "First Floor Plan",
                sheetNumber: drawing.sheetNumber,
                revision: drawing.revision,
                date: "12/23/2025",
                scale: "1/4\" = 1'-0\"",
                drawnBy: "JDS",
                checkedBy: "MRT"
            ),
            extractedText: "Floor plan showing offices, conference rooms, and common areas.",
            dimensions: [
                DrawingOCRData.ExtractedDimension(id: "1", value: "42'-6\"", unit: "", location: nil),
                DrawingOCRData.ExtractedDimension(id: "2", value: "28'-0\"", unit: "", location: nil),
                DrawingOCRData.ExtractedDimension(id: "3", value: "12'-4\"", unit: "", location: nil)
            ],
            notes: [
                "All dimensions to face of stud unless noted otherwise",
                "Verify all dimensions in field prior to construction",
                "See structural drawings for beam locations"
            ],
            materials: ["Gypsum board", "Steel stud framing", "Acoustic ceiling tile"],
            references: ["S-101", "M-101", "E-101"]
        )
    }
}

// MARK: - View Extension for Toolbar Button Style
extension Image {
    func toolbarButtonStyle(isActive: Bool = false) -> some View {
        self
            .font(.system(size: 20))
            .foregroundColor(isActive ? AppColors.primary400 : .white)
            .frame(width: 44, height: 44)
            .background(isActive ? Color.white.opacity(0.2) : Color.clear)
            .cornerRadius(8)
    }
}

#Preview {
    DrawingViewerView(drawing: Drawing.mockDrawings[0])
}
