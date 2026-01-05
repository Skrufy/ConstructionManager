//
//  SignatureCanvasView.swift
//  ConstructionManager
//
//  A canvas view for capturing signatures using pencil or finger input
//

import SwiftUI

// MARK: - Signature Canvas View
struct SignatureCanvasView: View {
    @Binding var signature: UIImage?
    @State private var lines: [[CGPoint]] = []
    @State private var currentLine: [CGPoint] = []
    @State private var canvasSize: CGSize = .zero
    @Environment(\.dismiss) private var dismiss

    let lineWidth: CGFloat = 3.0
    let strokeColor: Color = .black
    let outputSize = CGSize(width: 600, height: 200)

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Button("Cancel") {
                    dismiss()
                }
                .foregroundColor(AppColors.textSecondary)

                Spacer()

                Text("Sign Here")
                    .font(AppTypography.heading3)
                    .foregroundColor(AppColors.textPrimary)

                Spacer()

                Button("Clear") {
                    lines = []
                    currentLine = []
                }
                .foregroundColor(AppColors.error)
            }
            .padding()
            .background(AppColors.cardBackground)

            Divider()

            // Canvas Area
            GeometryReader { geometry in
                ZStack {
                    // White background
                    Color.white

                    // Signature line
                    Path { path in
                        let y = geometry.size.height * 0.7
                        path.move(to: CGPoint(x: 20, y: y))
                        path.addLine(to: CGPoint(x: geometry.size.width - 20, y: y))
                    }
                    .stroke(Color.gray.opacity(0.3), style: StrokeStyle(lineWidth: 1, dash: [5, 3]))

                    // X mark
                    Text("X")
                        .font(.system(size: 24, weight: .light))
                        .foregroundColor(.gray.opacity(0.5))
                        .position(x: 30, y: geometry.size.height * 0.7 - 20)

                    // Signature lines
                    Canvas { context, _ in
                        // Draw completed lines
                        for line in lines {
                            var path = Path()
                            guard line.count > 1 else { continue }
                            path.move(to: line[0])
                            for point in line.dropFirst() {
                                path.addLine(to: point)
                            }
                            context.stroke(path, with: .color(strokeColor), lineWidth: lineWidth)
                        }

                        // Draw current line
                        if currentLine.count > 1 {
                            var path = Path()
                            path.move(to: currentLine[0])
                            for point in currentLine.dropFirst() {
                                path.addLine(to: point)
                            }
                            context.stroke(path, with: .color(strokeColor), lineWidth: lineWidth)
                        }
                    }
                    .gesture(
                        DragGesture(minimumDistance: 0)
                            .onChanged { value in
                                currentLine.append(value.location)
                            }
                            .onEnded { _ in
                                lines.append(currentLine)
                                currentLine = []
                            }
                    )
                }
                .onAppear {
                    canvasSize = geometry.size
                }
                .onChange(of: geometry.size) { _, newSize in
                    canvasSize = newSize
                }
            }
            .frame(minHeight: 200)
            .clipShape(RoundedRectangle(cornerRadius: AppSpacing.radiusMedium))
            .overlay(
                RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                    .stroke(AppColors.gray300, lineWidth: 1)
            )
            .padding()

            // Instruction text
            Text("Use your finger or Apple Pencil to sign above")
                .font(AppTypography.caption)
                .foregroundColor(AppColors.textSecondary)
                .padding(.bottom, AppSpacing.sm)

            // Confirm Button
            PrimaryButton("Confirm Signature", icon: "checkmark") {
                signature = renderSignatureToImage()
                dismiss()
            }
            .disabled(lines.isEmpty)
            .padding(.horizontal)
            .padding(.bottom, AppSpacing.lg)
        }
        .background(AppColors.background)
    }

    // MARK: - Render Signature to UIImage
    private func renderSignatureToImage() -> UIImage? {
        guard canvasSize.width > 0 && canvasSize.height > 0 else { return nil }

        // Calculate scaling factors to map canvas coordinates to output image
        let scaleX = outputSize.width / canvasSize.width
        let scaleY = outputSize.height / canvasSize.height

        let renderer = UIGraphicsImageRenderer(size: outputSize)
        return renderer.image { context in
            // White background
            UIColor.white.setFill()
            context.fill(CGRect(origin: .zero, size: outputSize))

            // Draw lines scaled to output size
            UIColor.black.setStroke()
            for line in lines {
                guard line.count > 1 else { continue }

                let path = UIBezierPath()
                path.move(to: CGPoint(x: line[0].x * scaleX, y: line[0].y * scaleY))
                for point in line.dropFirst() {
                    path.addLine(to: CGPoint(x: point.x * scaleX, y: point.y * scaleY))
                }
                path.lineWidth = lineWidth * max(scaleX, scaleY)
                path.lineCapStyle = .round
                path.lineJoinStyle = .round
                path.stroke()
            }
        }
    }
}

// MARK: - Signature Capture Button
struct SignatureCaptureButton: View {
    @Binding var signature: UIImage?
    @State private var showingCanvas = false

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            HStack {
                Text("Leader Signature")
                    .font(AppTypography.bodySemibold)
                    .foregroundColor(AppColors.textPrimary)

                Text("Required")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.error)
            }

            Button(action: { showingCanvas = true }) {
                if let signature = signature {
                    // Show captured signature
                    Image(uiImage: signature)
                        .resizable()
                        .scaledToFit()
                        .frame(height: 80)
                        .background(Color.white)
                        .cornerRadius(AppSpacing.radiusSmall)
                        .overlay(
                            RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                                .stroke(AppColors.success, lineWidth: 2)
                        )
                        .overlay(
                            // Clear button
                            Button(action: { self.signature = nil }) {
                                Image(systemName: "xmark.circle.fill")
                                    .font(.system(size: 20))
                                    .foregroundColor(AppColors.error)
                            }
                            .padding(4),
                            alignment: .topTrailing
                        )
                } else {
                    // Show placeholder
                    HStack {
                        Image(systemName: "signature")
                            .font(.system(size: 24))
                            .foregroundColor(AppColors.textTertiary)

                        Text("Tap to sign")
                            .font(AppTypography.body)
                            .foregroundColor(AppColors.textSecondary)

                        Spacer()

                        Image(systemName: "chevron.right")
                            .font(.system(size: 14))
                            .foregroundColor(AppColors.textTertiary)
                    }
                    .padding()
                    .background(AppColors.gray100)
                    .cornerRadius(AppSpacing.radiusSmall)
                    .overlay(
                        RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                            .stroke(AppColors.gray300, lineWidth: 1)
                    )
                }
            }
            .buttonStyle(PlainButtonStyle())
        }
        .sheet(isPresented: $showingCanvas) {
            SignatureCanvasView(signature: $signature)
        }
    }
}

// MARK: - Preview
#Preview {
    SignatureCanvasView(signature: .constant(nil))
}
