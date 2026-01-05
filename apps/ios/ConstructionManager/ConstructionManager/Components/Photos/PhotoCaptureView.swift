//
//  PhotoCaptureView.swift
//  ConstructionManager
//
//  Photo capture and selection component
//

import SwiftUI
import PhotosUI

struct PhotoCaptureView: View {
    @Binding var selectedPhotos: [UIImage]
    let maxPhotos: Int

    @State private var showingImagePicker = false
    @State private var showingCamera = false
    @State private var photosPickerItems: [PhotosPickerItem] = []

    var canAddMore: Bool {
        selectedPhotos.count < maxPhotos
    }

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.md) {
            // Header
            HStack {
                Text("Photos")
                    .font(AppTypography.label)
                    .foregroundColor(AppColors.textPrimary)
                Spacer()
                Text("\(selectedPhotos.count) of \(maxPhotos)")
                    .font(AppTypography.secondary)
                    .foregroundColor(AppColors.textTertiary)
            }

            // Action Buttons
            if canAddMore {
                HStack(spacing: AppSpacing.sm) {
                    // Take Photo Button
                    Button(action: { showingCamera = true }) {
                        HStack(spacing: AppSpacing.xs) {
                            Image(systemName: "camera.fill")
                                .font(.system(size: 18))
                            Text("Take Photo")
                                .font(AppTypography.buttonSmall)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 48)
                        .foregroundColor(.white)
                        .background(AppColors.primary600)
                        .cornerRadius(AppSpacing.radiusLarge)
                    }

                    // Photo Library Button
                    PhotosPicker(
                        selection: $photosPickerItems,
                        maxSelectionCount: maxPhotos - selectedPhotos.count,
                        matching: .images
                    ) {
                        HStack(spacing: AppSpacing.xs) {
                            Image(systemName: "photo.on.rectangle")
                                .font(.system(size: 18))
                            Text("Library")
                                .font(AppTypography.buttonSmall)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 48)
                        .foregroundColor(AppColors.textPrimary)
                        .background(AppColors.gray100)
                        .cornerRadius(AppSpacing.radiusLarge)
                    }
                }
            }

            // Photo Grid
            if !selectedPhotos.isEmpty {
                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: AppSpacing.xs) {
                    ForEach(Array(selectedPhotos.enumerated()), id: \.offset) { index, photo in
                        PhotoThumbnail(
                            image: photo,
                            onDelete: {
                                withAnimation {
                                    deletePhoto(at: index)
                                }
                            }
                        )
                    }
                }
            } else {
                // Empty State
                VStack(spacing: AppSpacing.sm) {
                    Image(systemName: "photo.on.rectangle.angled")
                        .font(.system(size: 40))
                        .foregroundColor(AppColors.gray300)
                    Text("No photos added")
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textTertiary)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 120)
                .background(AppColors.gray50)
                .cornerRadius(AppSpacing.radiusLarge)
            }
        }
        .onChange(of: photosPickerItems) { _, newItems in
            loadPhotos(from: newItems)
        }
        .fullScreenCover(isPresented: $showingCamera) {
            CameraView(image: Binding(
                get: { nil },
                set: { newImage in
                    if let image = newImage, selectedPhotos.count < maxPhotos {
                        selectedPhotos.append(image)
                    }
                }
            ))
        }
    }

    private func loadPhotos(from items: [PhotosPickerItem]) {
        for item in items {
            item.loadTransferable(type: Data.self) { result in
                DispatchQueue.main.async {
                    if case .success(let data) = result,
                       let data = data,
                       let image = UIImage(data: data),
                       selectedPhotos.count < maxPhotos {
                        selectedPhotos.append(image)
                    }
                }
            }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            photosPickerItems.removeAll()
        }
    }

    private func deletePhoto(at index: Int) {
        guard index >= 0 && index < selectedPhotos.count else { return }
        _ = selectedPhotos.remove(at: index)
    }
}

// MARK: - Photo Thumbnail
struct PhotoThumbnail: View {
    let image: UIImage
    let onDelete: () -> Void

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Image(uiImage: image)
                .resizable()
                .scaledToFill()
                .frame(height: 100)
                .clipped()
                .cornerRadius(AppSpacing.radiusMedium)

            // Delete Button
            Button(action: onDelete) {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 22))
                    .foregroundColor(.white)
                    .shadow(color: .black.opacity(0.5), radius: 2, x: 0, y: 1)
            }
            .offset(x: 6, y: -6)
        }
    }
}

// MARK: - Camera View (UIKit Wrapper)
struct CameraView: UIViewControllerRepresentable {
    @Binding var image: UIImage?
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraView

        init(_ parent: CameraView) {
            self.parent = parent
        }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let image = info[.originalImage] as? UIImage {
                parent.image = image
            }
            parent.dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }
    }
}

#Preview {
    PhotoCaptureView(selectedPhotos: .constant([]), maxPhotos: 10)
        .padding()
}
