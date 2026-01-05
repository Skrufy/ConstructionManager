//
//  ForgotPasswordView.swift
//  ConstructionManager
//
//  Forgot password flow - request password reset email
//

import SwiftUI

struct ForgotPasswordView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var authService = AuthService.shared

    @State private var email: String
    @State private var isLoading = false
    @State private var showSuccess = false
    @State private var showError = false
    @State private var errorMessage = ""

    init(prefilledEmail: String = "") {
        _email = State(initialValue: prefilledEmail)
    }

    var isValidEmail: Bool {
        let emailRegex = #"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"#
        return email.range(of: emailRegex, options: .regularExpression) != nil
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AppColors.background
                    .ignoresSafeArea()

                if showSuccess {
                    successView
                } else {
                    formView
                }
            }
            .navigationTitle("auth.resetPassword".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("common.cancel".localized) {
                        dismiss()
                    }
                }
            }
            .alert("common.error".localized, isPresented: $showError) {
                Button("common.ok".localized, role: .cancel) {}
            } message: {
                Text(errorMessage)
            }
        }
    }

    private var formView: some View {
        ScrollView {
            VStack(spacing: AppSpacing.xl) {
                // Icon
                Image(systemName: "envelope.badge.fill")
                    .font(.system(size: 60))
                    .foregroundColor(AppColors.primary600)
                    .padding(.top, AppSpacing.xl)

                // Description
                VStack(spacing: AppSpacing.sm) {
                    Text("auth.forgotPasswordTitle".localized)
                        .font(AppTypography.heading2)
                        .foregroundColor(AppColors.textPrimary)
                        .multilineTextAlignment(.center)

                    Text("auth.forgotPasswordDesc".localized)
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, AppSpacing.md)
                }

                // Email Field
                VStack(alignment: .leading, spacing: AppSpacing.sm) {
                    Text("auth.email".localized)
                        .font(AppTypography.label)
                        .foregroundColor(AppColors.textPrimary)

                    HStack {
                        Image(systemName: "envelope.fill")
                            .foregroundColor(AppColors.textTertiary)
                            .frame(width: 24)

                        TextField("auth.enterEmail".localized, text: $email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                            .autocorrectionDisabled()
                    }
                    .padding()
                    .frame(minHeight: 56)
                    .background(AppColors.gray100)
                    .cornerRadius(AppSpacing.radiusMedium)
                }
                .padding(.horizontal, AppSpacing.lg)

                // Submit Button
                Button(action: requestReset) {
                    HStack {
                        if isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Text("auth.sendResetLink".localized)
                                .font(AppTypography.button)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: AppSpacing.buttonHeight)
                    .background(isValidEmail ? AppColors.primary600 : AppColors.gray300)
                    .foregroundColor(.white)
                    .cornerRadius(AppSpacing.radiusLarge)
                }
                .disabled(!isValidEmail || isLoading)
                .padding(.horizontal, AppSpacing.lg)

                Spacer()
            }
        }
    }

    private var successView: some View {
        VStack(spacing: AppSpacing.xl) {
            Spacer()

            // Success Icon
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 80))
                .foregroundColor(AppColors.success)

            // Success Message
            VStack(spacing: AppSpacing.sm) {
                Text("auth.resetEmailSent".localized)
                    .font(AppTypography.heading2)
                    .foregroundColor(AppColors.textPrimary)
                    .multilineTextAlignment(.center)

                Text("auth.resetEmailSentDesc".localized)
                    .font(AppTypography.secondary)
                    .foregroundColor(AppColors.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, AppSpacing.lg)
            }

            // Email Display
            Text(email)
                .font(AppTypography.bodySemibold)
                .foregroundColor(AppColors.primary600)
                .padding()
                .background(AppColors.primary100)
                .cornerRadius(AppSpacing.radiusMedium)

            Spacer()

            // Done Button
            Button(action: { dismiss() }) {
                Text("common.done".localized)
                    .font(AppTypography.button)
                    .frame(maxWidth: .infinity)
                    .frame(height: AppSpacing.buttonHeight)
                    .background(AppColors.primary600)
                    .foregroundColor(.white)
                    .cornerRadius(AppSpacing.radiusLarge)
            }
            .padding(.horizontal, AppSpacing.lg)
            .padding(.bottom, AppSpacing.xl)
        }
    }

    private func requestReset() {
        isLoading = true
        Task {
            let success = await authService.resetPassword(email: email.trimmingCharacters(in: .whitespaces))
            isLoading = false

            if success {
                withAnimation {
                    showSuccess = true
                }
            } else {
                errorMessage = authService.error ?? "auth.resetPasswordFailed".localized
                showError = true
            }
        }
    }
}

#Preview {
    ForgotPasswordView(prefilledEmail: "test@example.com")
}
