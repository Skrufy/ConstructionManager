//
//  MoreView.swift
//  ConstructionManager
//
//  More/Settings menu view
//

import SwiftUI

struct MoreView: View {
    @State private var showingSettings = false
    @State private var showingSearch = false
    @EnvironmentObject var appState: AppState

    var body: some View {
        NavigationStack {
            List {
                // Search Section
                Section {
                    Button(action: { showingSearch = true }) {
                        menuRow(icon: "magnifyingglass", title: "Search", color: AppColors.primary600)
                    }
                }

                // Work Section - only show if at least one module is visible
                if appState.shouldShowModule(.tasks) || appState.shouldShowModule(.scheduling) {
                    Section("Work") {
                        if appState.shouldShowModule(.tasks) {
                            NavigationLink {
                                TasksView()
                            } label: {
                                menuRow(icon: "checklist", title: "Tasks & RFIs", color: AppColors.warning)
                            }
                        }

                        if appState.shouldShowModule(.scheduling) {
                            NavigationLink {
                                SchedulingView()
                            } label: {
                                menuRow(icon: "calendar", title: "Scheduling", color: AppColors.info)
                            }
                        }
                    }
                }

                // Project Resources Section - Only show if any are visible
                if appState.shouldShowModule(.drawings) || appState.shouldShowModule(.documents) {
                    Section("Project Resources") {
                        if appState.shouldShowModule(.drawings) {
                            NavigationLink {
                                DrawingsView()
                            } label: {
                                menuRow(icon: "doc.richtext", title: "Drawings", color: AppColors.purple)
                            }
                        }
                        if appState.shouldShowModule(.documents) {
                            NavigationLink {
                                DocumentsView()
                            } label: {
                                menuRow(icon: "folder.fill", title: "Documents", color: AppColors.info)
                            }
                        }
                    }
                }

                // Resources Section - Show if any resources are visible
                if appState.shouldShowModule(.subcontractors) || appState.shouldShowModule(.equipment) || appState.shouldShowModule(.certifications) || appState.shouldShowModule(.droneDeploy) {
                    Section("Resources") {
                        if appState.shouldShowModule(.subcontractors) {
                            NavigationLink {
                                SubcontractorsView()
                            } label: {
                                menuRow(icon: "person.2.fill", title: "Subcontractors", color: AppColors.orange)
                            }
                        }

                        if appState.shouldShowModule(.equipment) {
                            NavigationLink {
                                EquipmentView()
                            } label: {
                                menuRow(icon: "wrench.and.screwdriver.fill", title: "Equipment", color: AppColors.warning)
                            }
                        }

                        if appState.shouldShowModule(.certifications) {
                            NavigationLink {
                                CertificationsView()
                            } label: {
                                menuRow(icon: "checkmark.seal.fill", title: "Certifications", color: AppColors.success)
                            }
                        }

                        if appState.shouldShowModule(.droneDeploy) {
                            NavigationLink {
                                DroneDeployView()
                            } label: {
                                menuRow(icon: "airplane", title: "DroneDeploy", color: AppColors.purple)
                            }
                        }
                    }
                }

                // Business Section
                if appState.shouldShowModule(.clients) {
                    Section("Business") {
                        NavigationLink {
                            ClientsView()
                        } label: {
                            menuRow(icon: "building.2.fill", title: "Clients", color: AppColors.info)
                        }
                    }
                }

                // Safety Section
                if appState.shouldShowModule(.safety) {
                    Section("Safety") {
                        NavigationLink {
                            SafetyView()
                        } label: {
                            menuRow(icon: "shield.checkered", title: "Safety", color: AppColors.error)
                        }
                    }
                }

                // Finance Section - Show based on module visibility
                if appState.shouldShowModule(.financials) || appState.shouldShowModule(.reports) {
                    Section("Finance") {
                        if appState.shouldShowModule(.financials) {
                            NavigationLink {
                                FinancialsView()
                            } label: {
                                menuRow(icon: "dollarsign.circle.fill", title: "Financials", color: AppColors.success)
                            }
                        }

                        if appState.shouldShowModule(.reports) {
                            NavigationLink {
                                ReportsView()
                            } label: {
                                menuRow(icon: "chart.bar.fill", title: "Reports & Analytics", color: AppColors.purple)
                            }
                        }
                    }
                }

                // Supervision Section - Only show if any supervision features are visible
                if appState.shouldShowModule(.approvals) || appState.shouldShowModule(.warnings) {
                    Section("Supervision") {
                        if appState.shouldShowModule(.approvals) {
                            NavigationLink {
                                ApprovalsView()
                            } label: {
                                menuRow(icon: "checkmark.circle.fill", title: "Approvals", color: AppColors.success)
                            }
                        }

                        if appState.shouldShowModule(.warnings) {
                            NavigationLink {
                                WarningsView()
                            } label: {
                                menuRow(icon: "exclamationmark.triangle.fill", title: "Employee Warnings", color: AppColors.warning)
                            }
                        }
                    }
                }

                // Admin Section - Only show for admins
                if appState.isAdmin {
                    Section("Admin") {
                        NavigationLink {
                            AdminView()
                        } label: {
                            menuRow(icon: "gearshape.2.fill", title: "Admin", color: AppColors.gray500)
                        }
                    }
                }

                // Account Section
                Section("Account") {
                    Button(action: { showingSettings = true }) {
                        menuRow(icon: "gearshape.fill", title: "Settings", color: AppColors.gray500)
                    }

                    if let supportURL = URL(string: "mailto:support@constructionpm.com") {
                        Link(destination: supportURL) {
                            menuRow(icon: "questionmark.circle.fill", title: "Help & Support", color: AppColors.info)
                        }
                    }

                    Button(action: {
                        appState.signOut()
                    }) {
                        menuRow(icon: "rectangle.portrait.and.arrow.right", title: "Sign Out", color: AppColors.error)
                    }
                }
            }
            .navigationTitle("More")
            .fullScreenCover(isPresented: $showingSettings) {
                SettingsView()
                    .environmentObject(appState)
            }
            .sheet(isPresented: $showingSearch) {
                SearchView()
            }
        }
    }

    private func menuRow(icon: String, title: String, color: Color) -> some View {
        HStack(spacing: AppSpacing.sm) {
            ZStack {
                RoundedRectangle(cornerRadius: 8)
                    .fill(color.opacity(0.15))
                    .frame(width: 32, height: 32)
                Image(systemName: icon)
                    .font(.system(size: 16))
                    .foregroundColor(color)
            }
            Text(title)
                .font(AppTypography.body)
                .foregroundColor(AppColors.textPrimary)
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(AppColors.gray400)
        }
        .padding(.vertical, AppSpacing.xxs)
    }
}

#Preview {
    MoreView()
        .environmentObject(AppState())
}
