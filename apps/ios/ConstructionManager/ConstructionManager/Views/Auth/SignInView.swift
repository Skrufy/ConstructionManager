//
//  SignInView.swift
//  ConstructionManager
//
//  Sign in screen with email/password and biometrics support
//

import SwiftUI

struct SignInView: View {
    @EnvironmentObject var appState: AppState
    @State private var email = ""
    @State private var password = ""
    @State private var showingError = false
    @State private var errorMessage = ""
    @State private var rememberMe = true
    @State private var showingForgotPassword = false
    @FocusState private var focusedField: Field?

    private enum Field {
        case email, password
    }

    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [AppColors.primary600, AppColors.primary800],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(spacing: AppSpacing.xl) {
                    Spacer()
                        .frame(height: 60)

                    // Logo & Title
                    VStack(spacing: AppSpacing.md) {
                        Image(systemName: "building.2.crop.circle.fill")
                            .font(.system(size: 80))
                            .foregroundColor(.white)

                        VStack(spacing: 2) {
                            Text("Duggin")
                                .font(.system(size: 32, weight: .bold))
                                .foregroundColor(.white)
                            Text("Construction")
                                .font(.system(size: 22, weight: .semibold))
                                .foregroundColor(.white.opacity(0.9))
                        }

                        Text("auth.signInTitle".localized)
                            .font(AppTypography.secondary)
                            .foregroundColor(.white.opacity(0.8))
                    }

                    Spacer()
                        .frame(height: 20)

                    // Sign In Form
                    VStack(spacing: AppSpacing.lg) {
                        // Email Field
                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("auth.email".localized)
                                .font(AppTypography.label)
                                .foregroundColor(.white.opacity(0.9))

                            HStack {
                                Image(systemName: "envelope.fill")
                                    .foregroundColor(.white.opacity(0.6))
                                    .frame(width: 24)
                                TextField("auth.enterEmail".localized, text: $email)
                                    .textContentType(.emailAddress)
                                    .keyboardType(.emailAddress)
                                    .autocapitalization(.none)
                                    .foregroundColor(.white)
                                    .tint(.white)
                                    .submitLabel(.next)
                                    .focused($focusedField, equals: .email)
                                    .onSubmit { focusedField = .password }
                            }
                            .padding()
                            .frame(minHeight: 56)
                            .background(.white.opacity(0.15))
                            .cornerRadius(AppSpacing.radiusMedium)
                            .overlay(
                                RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                                    .stroke(focusedField == .email ? .white : .white.opacity(0.3), lineWidth: focusedField == .email ? 2 : 1)
                            )
                            .contentShape(Rectangle())
                            .onTapGesture { focusedField = .email }
                        }

                        // Password Field
                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("auth.password".localized)
                                .font(AppTypography.label)
                                .foregroundColor(.white.opacity(0.9))

                            HStack {
                                Image(systemName: "lock.fill")
                                    .foregroundColor(.white.opacity(0.6))
                                    .frame(width: 24)
                                SecureField("auth.enterPassword".localized, text: $password)
                                    .textContentType(.password)
                                    .foregroundColor(.white)
                                    .tint(.white)
                                    .submitLabel(.go)
                                    .focused($focusedField, equals: .password)
                                    .onSubmit {
                                        if !email.isEmpty && !password.isEmpty {
                                            signIn()
                                        }
                                    }
                            }
                            .padding()
                            .frame(minHeight: 56)
                            .background(.white.opacity(0.15))
                            .cornerRadius(AppSpacing.radiusMedium)
                            .overlay(
                                RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                                    .stroke(focusedField == .password ? .white : .white.opacity(0.3), lineWidth: focusedField == .password ? 2 : 1)
                            )
                            .contentShape(Rectangle())
                            .onTapGesture { focusedField = .password }
                        }

                        // Remember Me & Forgot Password
                        HStack {
                            Button(action: { rememberMe.toggle() }) {
                                HStack(spacing: AppSpacing.xs) {
                                    Image(systemName: rememberMe ? "checkmark.square.fill" : "square")
                                        .foregroundColor(.white)
                                    Text("auth.rememberMe".localized)
                                        .font(AppTypography.secondary)
                                        .foregroundColor(.white.opacity(0.9))
                                }
                            }

                            Spacer()

                            Button("auth.forgotPassword".localized) {
                                showingForgotPassword = true
                            }
                            .font(AppTypography.secondary)
                            .foregroundColor(.white.opacity(0.9))
                        }

                        // Sign In Button
                        Button(action: signIn) {
                            HStack {
                                if appState.isLoading {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: AppColors.primary600))
                                } else {
                                    Text("auth.signIn".localized)
                                        .font(AppTypography.button)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: AppSpacing.buttonHeight)
                            .background(.white)
                            .foregroundColor(AppColors.primary600)
                            .cornerRadius(AppSpacing.radiusLarge)
                        }
                        .disabled(appState.isLoading || email.isEmpty || password.isEmpty)
                        .opacity(email.isEmpty || password.isEmpty ? 0.7 : 1)

                        // Biometric Sign In
                        if appState.biometricsAvailable {
                            Button(action: signInWithBiometrics) {
                                HStack(spacing: AppSpacing.sm) {
                                    Image(systemName: appState.biometricType == "Face ID" ? "faceid" : "touchid")
                                        .font(.system(size: 20))
                                    Text("auth.signInWith".localized(with: appState.biometricType))
                                        .font(AppTypography.button)
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: AppSpacing.buttonHeight)
                                .background(.white.opacity(0.15))
                                .foregroundColor(.white)
                                .cornerRadius(AppSpacing.radiusLarge)
                                .overlay(
                                    RoundedRectangle(cornerRadius: AppSpacing.radiusLarge)
                                        .stroke(.white.opacity(0.3), lineWidth: 1)
                                )
                            }
                        }

                        // Development Skip Button
                        #if DEBUG
                        Button(action: skipSignIn) {
                            Text("Skip Sign In (Dev Mode)")
                                .font(AppTypography.caption)
                                .foregroundColor(.white.opacity(0.6))
                                .underline()
                        }
                        .padding(.top, AppSpacing.sm)
                        #endif
                    }
                    .padding(.horizontal, AppSpacing.lg)

                    Spacer()
                }
            }
        }
        .alert("auth.signInError".localized, isPresented: $showingError) {
            Button("common.ok".localized, role: .cancel) {}
        } message: {
            Text(errorMessage)
        }
        .sheet(isPresented: $showingForgotPassword) {
            ForgotPasswordView(prefilledEmail: email)
        }
        .onAppear {
            // Show session expired message if user was redirected
            if let authError = appState.authError, !authError.isEmpty {
                errorMessage = authError
                showingError = true
                // Clear the error so it doesn't show again
                appState.authError = nil
            }
        }
    }

    private func signIn() {
        Task {
            let success = await appState.signIn(email: email, password: password)
            if !success {
                errorMessage = appState.authError ?? "auth.invalidCredentials".localized
                showingError = true
            }
        }
    }

    private func signInWithBiometrics() {
        Task {
            let success = await appState.signInWithBiometrics()
            if !success {
                errorMessage = "auth.biometricFailed".localized
                showingError = true
            }
        }
    }

    private func skipSignIn() {
        appState.authState = .signedIn
        appState.currentUser = User.currentUser
    }
}

#Preview {
    SignInView()
        .environmentObject(AppState())
}
