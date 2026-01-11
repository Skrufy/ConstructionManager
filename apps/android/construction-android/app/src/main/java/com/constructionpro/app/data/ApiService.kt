package com.constructionpro.app.data

import com.constructionpro.app.data.model.*
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.DELETE
import retrofit2.http.Path
import retrofit2.http.Query
import retrofit2.http.Body
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Part

interface ApiService {
  @GET("projects")
  suspend fun getProjects(
    @Query("status") status: String? = null,
    @Query("search") search: String? = null,
    @Query("page") page: Int? = null,
    @Query("pageSize") pageSize: Int? = null
  ): ProjectsResponse

  @GET("projects/{id}")
  suspend fun getProject(@Path("id") projectId: String): ProjectDetailResponse

  @PATCH("projects/{id}")
  suspend fun updateProject(
    @Path("id") projectId: String,
    @Body update: ProjectUpdateRequest
  ): ProjectDetailResponse

  @GET("daily-logs")
  suspend fun getDailyLogs(
    @Query("projectId") projectId: String? = null,
    @Query("search") search: String? = null,
    @Query("page") page: Int? = null,
    @Query("pageSize") pageSize: Int? = null
  ): DailyLogsResponse

  @GET("daily-logs/{id}")
  suspend fun getDailyLog(@Path("id") logId: String): DailyLogDetailResponse

  @POST("daily-logs")
  suspend fun createDailyLog(@Body request: DailyLogUpsertRequest): DailyLogDetailResponse

  @PUT("daily-logs/{id}")
  suspend fun updateDailyLog(
    @Path("id") logId: String,
    @Body request: DailyLogUpsertRequest
  ): DailyLogDetailResponse

  @GET("weather")
  suspend fun getWeather(
    @Query("lat") latitude: Double,
    @Query("lng") longitude: Double
  ): WeatherData

  @GET("documents")
  suspend fun getDocuments(
    @Query("projectId") projectId: String? = null,
    @Query("category") category: String? = null,
    @Query("type") type: String? = null,
    @Query("search") search: String? = null,
    @Query("blasterIds") blasterIds: String? = null,
    @Query("page") page: Int? = null,
    @Query("limit") limit: Int? = null
  ): DocumentsResponse

  @GET("documents/{id}")
  suspend fun getDocument(@Path("id") documentId: String): DocumentDetailResponse

  @POST("files/{id}/annotations")
  suspend fun createAnnotation(
    @Path("id") fileId: String,
    @Body request: AnnotationCreateRequest
  ): AnnotationResponse

  @GET("files/{id}/annotations")
  suspend fun getAnnotations(
    @Path("id") fileId: String,
    @Query("page") page: Int? = null
  ): AnnotationsResponse

  @PATCH("files/{id}/annotations")
  suspend fun updateAnnotation(
    @Path("id") fileId: String,
    @Body request: AnnotationUpdateRequest
  ): AnnotationResponse

  @DELETE("files/{id}/annotations")
  suspend fun deleteAnnotation(
    @Path("id") fileId: String,
    @Query("annotationId") annotationId: String? = null,
    @Query("clearAll") clearAll: Boolean? = null
  )

  @GET("files/{id}/url")
  suspend fun getFileUrl(
    @Path("id") fileId: String,
    @Query("download") download: Boolean? = null,
    @Query("expiresIn") expiresIn: Int? = null
  ): FileUrlResponse

  @GET("drawings")
  suspend fun getDrawings(
    @Query("discipline") discipline: String? = null,
    @Query("projectId") projectId: String? = null,
    @Query("search") search: String? = null
  ): DrawingsResponse

  // ============ DRAWING PINS ============

  @GET("drawings/{id}/pins")
  suspend fun getPins(@Path("id") drawingId: String): PinsResponse

  @POST("drawings/{id}/pins")
  suspend fun createPin(
    @Path("id") drawingId: String,
    @Body request: PinCreateRequest
  ): PinResponse

  @PATCH("drawings/{id}/pins")
  suspend fun updatePin(
    @Path("id") drawingId: String,
    @Body request: PinUpdateRequest
  ): PinResponse

  @DELETE("drawings/{id}/pins")
  suspend fun deletePin(
    @Path("id") drawingId: String,
    @Query("pinId") pinId: String
  )

  // ============ DRAWING SCALE ============

  @GET("files/{id}/scale")
  suspend fun getScale(@Path("id") fileId: String): ScaleResponse

  @PATCH("files/{id}/scale")
  suspend fun updateScale(
    @Path("id") fileId: String,
    @Body request: ScaleUpdateRequest
  ): ScaleUpdateResponse

  @GET("reports")
  suspend fun getReportOverview(
    @Query("type") type: String? = null,
    @Query("projectId") projectId: String? = null,
    @Query("startDate") startDate: String? = null,
    @Query("endDate") endDate: String? = null
  ): ReportOverview

  // ============ ANALYTICS ============

  @GET("analytics")
  suspend fun getAnalyticsDashboard(
    @Query("period") period: String? = null,
    @Query("projectId") projectId: String? = null
  ): AnalyticsDashboard

  @GET("analytics/projects")
  suspend fun getProjectMetrics(
    @Query("period") period: String? = null
  ): List<ProjectMetric>

  @GET("analytics/labor")
  suspend fun getLaborMetrics(
    @Query("period") period: String? = null,
    @Query("projectId") projectId: String? = null
  ): LaborMetrics

  @GET("analytics/safety")
  suspend fun getSafetyMetrics(
    @Query("period") period: String? = null,
    @Query("projectId") projectId: String? = null
  ): SafetyMetrics

  @GET("analytics/financial")
  suspend fun getFinancialMetrics(
    @Query("period") period: String? = null,
    @Query("projectId") projectId: String? = null
  ): FinancialMetrics

  // ============ REPORTS GENERATION ============

  @GET("reports/generated")
  suspend fun getGeneratedReports(): List<GeneratedReport>

  @POST("reports/generate")
  suspend fun generateReport(@Body request: ReportRequest): GeneratedReport

  @GET("reports/generated/{id}")
  suspend fun getGeneratedReport(@Path("id") reportId: String): GeneratedReport

  @DELETE("reports/generated/{id}")
  suspend fun deleteGeneratedReport(@Path("id") reportId: String)

  @GET("reports/project/{projectId}")
  suspend fun getProjectReport(
    @Path("projectId") projectId: String,
    @Query("period") period: String? = null,
    @Query("startDate") startDate: String? = null,
    @Query("endDate") endDate: String? = null
  ): ProjectReport

  @GET("settings")
  suspend fun getSettings(): SettingsResponse

  @PUT("settings")
  suspend fun updateSettings(@Body request: UpdateSettingsRequest): UpdateSettingsResponse

  @Multipart
  @POST("upload")
  suspend fun uploadDailyLogPhoto(
    @Part file: MultipartBody.Part,
    @Part("projectId") projectId: RequestBody,
    @Part("dailyLogId") dailyLogId: RequestBody,
    @Part("category") category: RequestBody,
    @Part("gpsLatitude") gpsLatitude: RequestBody?,
    @Part("gpsLongitude") gpsLongitude: RequestBody?
  ): UploadResponse

  @Multipart
  @POST("upload")
  suspend fun uploadFile(
    @Part file: MultipartBody.Part,
    @Part("projectId") projectId: RequestBody,
    @Part("dailyLogId") dailyLogId: RequestBody?,
    @Part("category") category: RequestBody,
    @Part("gpsLatitude") gpsLatitude: RequestBody? = null,
    @Part("gpsLongitude") gpsLongitude: RequestBody? = null
  ): UploadResponse

  @Multipart
  @POST("files/upload")
  suspend fun uploadDocumentFile(
    @Part file: MultipartBody.Part,
    @Part("projectId") projectId: RequestBody?,
    @Part("name") name: RequestBody,
    @Part("type") type: RequestBody,
    @Part("category") category: RequestBody,
    @Part("blasterIds") blasterIds: RequestBody? = null
  ): FileUploadResponse

  @GET("users")
  suspend fun getUsers(
    @Query("search") search: String? = null,
    @Query("role") role: String? = null,
    @Query("status") status: String? = null
  ): List<UserSummary>

  @GET("users/blasters")
  suspend fun getBlasters(): List<UserSummary>

  @POST("users")
  suspend fun createUser(@Body request: CreateUserRequest): UserSummary

  @GET("users/me")
  suspend fun getProfile(): UserProfile

  @GET("users/me/preferences")
  suspend fun getPreferences(): PreferencesResponse

  @PATCH("users/me/preferences")
  suspend fun updatePreferences(@Body request: UpdatePreferencesRequest): PreferencesResponse

  // ============ TIME ENTRIES ============

  @GET("time-entries")
  suspend fun getTimeEntries(
    @Query("projectId") projectId: String? = null,
    @Query("userId") userId: String? = null,
    @Query("status") status: String? = null,
    @Query("startDate") startDate: String? = null,
    @Query("endDate") endDate: String? = null,
    @Query("page") page: Int? = null,
    @Query("pageSize") pageSize: Int? = null
  ): TimeEntriesResponse

  @GET("time-entries/active")
  suspend fun getActiveTimeEntry(): ActiveTimeEntryResponse

  @POST("time-entries")
  suspend fun clockIn(@Body request: ClockInRequest): TimeEntryResponse

  @PATCH("time-entries/{id}")
  suspend fun clockOut(
    @Path("id") entryId: String,
    @Body request: ClockOutRequest
  ): TimeEntryResponse

  @DELETE("time-entries/{id}")
  suspend fun deleteTimeEntry(@Path("id") entryId: String)

  // ============ EQUIPMENT ============

  @GET("equipment")
  suspend fun getEquipment(
    @Query("status") status: String? = null,
    @Query("projectId") projectId: String? = null,
    @Query("search") search: String? = null,
    @Query("page") page: Int? = null,
    @Query("pageSize") pageSize: Int? = null
  ): EquipmentResponse

  @GET("equipment/{id}")
  suspend fun getEquipmentDetail(@Path("id") equipmentId: String): EquipmentDetailResponse

  @POST("equipment")
  suspend fun createEquipment(@Body request: CreateEquipmentRequest): Equipment

  @PATCH("equipment/{id}")
  suspend fun updateEquipment(
    @Path("id") equipmentId: String,
    @Body request: CreateEquipmentRequest
  ): Equipment

  @POST("equipment/{id}/log")
  suspend fun createEquipmentLog(
    @Path("id") equipmentId: String,
    @Body request: EquipmentLogRequest
  ): EquipmentLog

  @POST("equipment/{id}/assign")
  suspend fun assignEquipment(
    @Path("id") equipmentId: String,
    @Body request: EquipmentAssignRequest
  ): EquipmentAssignment

  // ============ SAFETY - INCIDENTS ============

  @GET("safety/incidents")
  suspend fun getIncidents(
    @Query("projectId") projectId: String? = null,
    @Query("status") status: String? = null,
    @Query("severity") severity: String? = null,
    @Query("type") type: String? = null,
    @Query("page") page: Int? = null,
    @Query("pageSize") pageSize: Int? = null
  ): IncidentsResponse

  @POST("safety/incidents")
  suspend fun createIncident(@Body request: CreateIncidentRequest): Incident

  @GET("safety/incidents/{id}")
  suspend fun getIncident(@Path("id") incidentId: String): Incident

  @PATCH("safety/incidents/{id}")
  suspend fun updateIncident(
    @Path("id") incidentId: String,
    @Body updates: Map<String, @JvmSuppressWildcards Any?>
  ): Incident

  // ============ SAFETY - INSPECTIONS ============

  @GET("safety/inspections")
  suspend fun getInspections(
    @Query("projectId") projectId: String? = null,
    @Query("status") status: String? = null,
    @Query("type") type: String? = null,
    @Query("page") page: Int? = null,
    @Query("pageSize") pageSize: Int? = null
  ): InspectionsResponse

  @POST("safety/inspections")
  suspend fun createInspection(@Body request: CreateInspectionRequest): InspectionResponse

  @GET("safety/inspections/{id}")
  suspend fun getInspection(@Path("id") inspectionId: String): Inspection

  @PATCH("safety/inspections/{id}")
  suspend fun updateInspection(
    @Path("id") inspectionId: String,
    @Body updates: Map<String, @JvmSuppressWildcards Any?>
  ): Inspection

  @GET("safety/inspections/templates")
  suspend fun getInspectionTemplates(): List<InspectionTemplate>

  // ============ SAFETY - PUNCH LISTS ============

  @GET("safety/punch-lists")
  suspend fun getPunchLists(
    @Query("projectId") projectId: String? = null,
    @Query("status") status: String? = null,
    @Query("page") page: Int? = null,
    @Query("pageSize") pageSize: Int? = null
  ): PunchListsResponse

  @POST("safety/punch-lists")
  suspend fun createPunchList(@Body request: CreatePunchListRequest): PunchListResponse

  @GET("safety/punch-lists/{id}")
  suspend fun getPunchList(@Path("id") punchListId: String): PunchList

  @PATCH("safety/punch-lists/{id}/items/{itemId}")
  suspend fun updatePunchListItem(
    @Path("id") punchListId: String,
    @Path("itemId") itemId: String,
    @Body request: UpdatePunchListItemRequest
  ): PunchListItem

  // ============ SAFETY - MEETINGS ============

  @GET("safety/meetings")
  suspend fun getSafetyMeetings(
    @Query("projectId") projectId: String? = null,
    @Query("page") page: Int? = null,
    @Query("pageSize") pageSize: Int? = null
  ): SafetyMeetingsResponse

  @POST("safety/meetings")
  suspend fun createSafetyMeeting(@Body request: CreateSafetyMeetingRequest): SafetyMeetingResponse

  // ============ SAFETY - TOPICS ============

  @GET("safety/topics")
  suspend fun getSafetyTopics(
    @Query("category") category: String? = null,
    @Query("includeInactive") includeInactive: Boolean? = null
  ): List<SafetyTopic>

  @POST("safety/topics")
  suspend fun createSafetyTopic(@Body request: CreateSafetyTopicRequest): SafetyTopic

  // ============ EMPLOYEES ============

  @GET("employees")
  suspend fun getEmployees(
    @Query("search") search: String? = null,
    @Query("active") active: String? = null,
    @Query("company") company: String? = null
  ): List<Employee>

  @POST("employees")
  suspend fun createEmployee(@Body request: CreateEmployeeRequest): Employee

  @GET("employees/{id}")
  suspend fun getEmployee(@Path("id") employeeId: String): Employee

  @PATCH("employees/{id}")
  suspend fun updateEmployee(
    @Path("id") employeeId: String,
    @Body request: Map<String, @JvmSuppressWildcards Any?>
  ): Employee

  // ============ SCHEDULING ============

  @GET("scheduling")
  suspend fun getSchedules(
    @Query("projectId") projectId: String? = null,
    @Query("startDate") startDate: String? = null,
    @Query("endDate") endDate: String? = null,
    @Query("userId") userId: String? = null,
    @Query("page") page: Int? = null,
    @Query("pageSize") pageSize: Int? = null
  ): SchedulesResponse

  @POST("scheduling")
  suspend fun createSchedule(@Body request: CreateScheduleRequest): ScheduleResponse

  @PUT("scheduling/{id}")
  suspend fun updateSchedule(
    @Path("id") scheduleId: String,
    @Body request: UpdateScheduleRequest
  ): ScheduleResponse

  @GET("scheduling/{id}")
  suspend fun getSchedule(@Path("id") scheduleId: String): CrewSchedule

  @DELETE("scheduling/{id}")
  suspend fun deleteSchedule(@Path("id") scheduleId: String)

  // ============ FINANCIALS ============

  @GET("financials")
  suspend fun getFinancials(
    @Query("type") type: String? = null, // overview, invoices, expenses, change-orders
    @Query("projectId") projectId: String? = null,
    @Query("status") status: String? = null
  ): FinancialOverview

  @POST("financials")
  suspend fun createFinancialRecord(
    @Query("type") type: String, // invoice, expense, change-order, budget
    @Body request: Map<String, @JvmSuppressWildcards Any?>
  ): Map<String, Any?>

  @GET("financials/invoices/{id}")
  suspend fun getInvoice(@Path("id") invoiceId: String): Invoice

  @GET("financials/expenses/{id}")
  suspend fun getExpense(@Path("id") expenseId: String): Expense

  @GET("financials/change-orders/{id}")
  suspend fun getChangeOrder(@Path("id") changeOrderId: String): ChangeOrder

  // ============ APPROVALS ============

  @GET("approvals")
  suspend fun getApprovals(
    @Query("type") type: String? = null, // time-entries, daily-logs, all
    @Query("projectId") projectId: String? = null
  ): ApprovalsResponse

  @POST("approvals")
  suspend fun processApproval(@Body request: ApprovalActionRequest): ApprovalActionResponse

  @PUT("approvals")
  suspend fun bulkApproval(@Body request: BulkApprovalRequest): ApprovalActionResponse

  // ============ CERTIFICATIONS ============

  @GET("certifications")
  suspend fun getCertifications(
    @Query("type") type: String? = null, // user, subcontractor, all
    @Query("userId") userId: String? = null,
    @Query("status") status: String? = null,
    @Query("alertsOnly") alertsOnly: Boolean? = null
  ): CertificationsResponse

  @POST("certifications")
  suspend fun createCertification(@Body request: CreateCertificationRequest): Certification

  @PUT("certifications/{id}")
  suspend fun updateCertification(
    @Path("id") certificationId: String,
    @Body request: UpdateCertificationRequest
  ): Certification

  @DELETE("certifications/{id}")
  suspend fun deleteCertification(@Path("id") certificationId: String)

  // ============ SUBCONTRACTORS ============

  @GET("subcontractors")
  suspend fun getSubcontractors(
    @Query("status") status: String? = null,
    @Query("trade") trade: String? = null,
    @Query("search") search: String? = null,
    @Query("page") page: Int? = null,
    @Query("pageSize") pageSize: Int? = null
  ): SubcontractorsResponse

  @GET("subcontractors/{id}")
  suspend fun getSubcontractor(@Path("id") subcontractorId: String): SubcontractorDetailResponse

  @POST("subcontractors")
  suspend fun createSubcontractor(@Body request: CreateSubcontractorRequest): Subcontractor

  @PUT("subcontractors/{id}")
  suspend fun updateSubcontractor(
    @Path("id") subcontractorId: String,
    @Body request: UpdateSubcontractorRequest
  ): Subcontractor

  @DELETE("subcontractors/{id}")
  suspend fun deleteSubcontractor(@Path("id") subcontractorId: String)

  @POST("subcontractors/{id}/assign")
  suspend fun assignSubcontractor(
    @Path("id") subcontractorId: String,
    @Body request: SubcontractorAssignRequest
  ): SubcontractorAssignment

  // ============ WARNINGS ============

  @GET("warnings")
  suspend fun getWarnings(
    @Query("employeeId") employeeId: String? = null,
    @Query("projectId") projectId: String? = null,
    @Query("status") status: String? = null
  ): List<Warning>

  @POST("warnings")
  suspend fun createWarning(@Body request: WarningCreateRequest): WarningCreateResponse

  @GET("warnings/{id}")
  suspend fun getWarning(@Path("id") warningId: String): Warning

  @PATCH("warnings/{id}")
  suspend fun updateWarning(
    @Path("id") warningId: String,
    @Body request: WarningUpdateRequest
  ): Warning

  @POST("warnings/{id}/acknowledge")
  suspend fun acknowledgeWarning(@Path("id") warningId: String): Warning

  // ============ CLIENTS ============

  @GET("clients")
  suspend fun getClients(
    @Query("status") status: String? = null,
    @Query("industry") industry: String? = null,
    @Query("search") search: String? = null
  ): List<Client>

  @POST("clients")
  suspend fun createClient(@Body request: ClientCreateRequest): Client

  @GET("clients/{id}")
  suspend fun getClient(@Path("id") clientId: String): Client

  @PATCH("clients/{id}")
  suspend fun updateClient(
    @Path("id") clientId: String,
    @Body request: ClientUpdateRequest
  ): Client

  @DELETE("clients/{id}")
  suspend fun deleteClient(@Path("id") clientId: String)

  // ============ LABELS ============

  @GET("labels")
  suspend fun getLabels(
    @Query("category") category: String? = null,
    @Query("projectId") projectId: String? = null,
    @Query("activeOnly") activeOnly: Boolean? = true
  ): List<Label>

  @POST("labels")
  suspend fun createLabel(@Body request: LabelCreateRequest): Label

  @PATCH("labels/{id}")
  suspend fun updateLabel(
    @Path("id") labelId: String,
    @Body request: LabelUpdateRequest
  ): Label

  @DELETE("labels/{id}")
  suspend fun deleteLabel(@Path("id") labelId: String)

  // ============ SEARCH ============

  @GET("search")
  suspend fun search(
    @Query("q") query: String,
    @Query("category") category: String? = null,
    @Query("project_id") projectId: String? = null
  ): SearchResponse

  // ============ ADMIN - USER MANAGEMENT ============

  @GET("users")
  suspend fun getAdminUsers(
    @Query("search") search: String? = null,
    @Query("role") role: String? = null,
    @Query("status") status: String? = null
  ): List<UserDetail>

  @GET("users/{id}")
  suspend fun getAdminUserDetail(@Path("id") userId: String): UserDetail

  @PUT("users/{id}")
  suspend fun updateUser(
    @Path("id") userId: String,
    @Body request: UpdateUserRequest
  ): UserDetail

  @DELETE("users/{id}")
  suspend fun deleteUser(@Path("id") userId: String)

  @POST("users/bulk")
  suspend fun bulkUserAction(@Body request: BulkUserAction)

  @POST("users/{id}/reset-password")
  suspend fun resetUserPassword(@Path("id") userId: String)

  // ============ ADMIN - INVITATIONS ============

  @GET("admin/invitations")
  suspend fun getInvitations(
    @Query("status") status: String? = null
  ): InvitationListResponse

  @POST("admin/invitations")
  suspend fun inviteUser(@Body request: InviteUserRequest): UserInvitation

  @DELETE("admin/invitations/{id}")
  suspend fun cancelInvitation(@Path("id") invitationId: String)

  @POST("admin/invitations/{id}/resend")
  suspend fun resendInvitation(@Path("id") invitationId: String): UserInvitation

  // ============ ADMIN - TEAMS ============

  @GET("admin/teams")
  suspend fun getTeams(): TeamListResponse

  @POST("admin/teams")
  suspend fun createTeam(@Body request: CreateTeamRequest): Team

  @GET("admin/teams/{id}")
  suspend fun getTeamDetail(@Path("id") teamId: String): TeamDetail

  @PUT("admin/teams/{id}")
  suspend fun updateTeam(
    @Path("id") teamId: String,
    @Body request: UpdateTeamRequest
  ): Team

  @DELETE("admin/teams/{id}")
  suspend fun deleteTeam(@Path("id") teamId: String)

  @POST("admin/teams/{id}/members")
  suspend fun updateTeamMembers(
    @Path("id") teamId: String,
    @Body request: TeamMemberAction
  ): TeamDetail

  // ============ ADMIN - AUDIT LOGS ============

  @GET("admin/audit-logs")
  suspend fun getAuditLogs(
    @Query("userId") userId: String? = null,
    @Query("resourceType") resourceType: String? = null,
    @Query("action") action: String? = null,
    @Query("startDate") startDate: String? = null,
    @Query("endDate") endDate: String? = null,
    @Query("page") page: Int? = null,
    @Query("limit") limit: Int? = null
  ): AuditLogListResponse

  // ============ ADMIN - COMPANY PROFILE ============

  @GET("admin/company")
  suspend fun getCompanyProfile(): CompanyProfile

  @PUT("admin/company")
  suspend fun updateCompanyProfile(@Body request: UpdateCompanyProfileRequest): CompanyProfile

  // ============ ADMIN - PERMISSIONS ============

  @GET("admin/permissions")
  suspend fun getPermissions(): List<Permission>

  @GET("admin/roles/{role}/permissions")
  suspend fun getRolePermissions(@Path("role") role: String): RolePermissions

  @PUT("admin/roles/{role}/permissions")
  suspend fun updateRolePermissions(
    @Path("role") role: String,
    @Body permissions: List<String>
  ): RolePermissions

  // ============ PERMISSION TEMPLATES ============

  @GET("permissions")
  suspend fun getPermissionTemplates(
    @Query("scope") scope: String? = null
  ): PermissionTemplatesResponse

  @GET("permissions/{id}")
  suspend fun getPermissionTemplate(@Path("id") templateId: String): PermissionTemplate

  @POST("permissions")
  suspend fun createPermissionTemplate(@Body request: Map<String, @JvmSuppressWildcards Any?>): PermissionTemplate

  @PUT("permissions/{id}")
  suspend fun updatePermissionTemplate(
    @Path("id") templateId: String,
    @Body request: Map<String, @JvmSuppressWildcards Any?>
  ): PermissionTemplate

  @DELETE("permissions/{id}")
  suspend fun deletePermissionTemplate(@Path("id") templateId: String)

  @POST("permissions/assign")
  suspend fun assignCompanyTemplate(@Body request: AssignCompanyTemplateRequest): UserPermissionAssignment

  @POST("permissions/project-assign")
  suspend fun assignProjectTemplate(@Body request: AssignProjectTemplateRequest): ProjectPermissionAssignment

  @GET("permissions/user/{userId}")
  suspend fun getUserPermissions(@Path("userId") userId: String): UserPermissionsResponse

  // ============ NOTIFICATIONS ============

  @GET("notifications")
  suspend fun getNotifications(
    @Query("unreadOnly") unreadOnly: Boolean? = null,
    @Query("type") type: String? = null,
    @Query("limit") limit: Int? = null
  ): NotificationListResponse

  @GET("notifications/unread-count")
  suspend fun getUnreadNotificationCount(): Int

  @POST("notifications/mark-read")
  suspend fun markNotificationsRead(@Body request: MarkNotificationsRequest)

  @POST("notifications/mark-all-read")
  suspend fun markAllNotificationsRead()

  @DELETE("notifications/{id}")
  suspend fun deleteNotification(@Path("id") notificationId: String)

  @GET("notifications/preferences")
  suspend fun getNotificationPreferences(): NotificationPreferences

  @PUT("notifications/preferences")
  suspend fun updateNotificationPreferences(@Body preferences: NotificationPreferences): NotificationPreferences

  // ============ ACTIVITY FEED ============

  @GET("activity")
  suspend fun getActivityFeed(
    @Query("projectId") projectId: String? = null,
    @Query("resourceType") resourceType: String? = null,
    @Query("userId") userId: String? = null,
    @Query("limit") limit: Int? = null,
    @Query("cursor") cursor: String? = null
  ): ActivityFeedResponse

  @GET("projects/{projectId}/activity")
  suspend fun getProjectActivity(
    @Path("projectId") projectId: String,
    @Query("limit") limit: Int? = null,
    @Query("cursor") cursor: String? = null
  ): ActivityFeedResponse

  // ============ TASKS ============

  @GET("tasks")
  suspend fun getTasks(
    @Query("projectId") projectId: String? = null,
    @Query("assigneeId") assigneeId: String? = null,
    @Query("status") status: String? = null,
    @Query("priority") priority: String? = null,
    @Query("dueDate") dueDate: String? = null,
    @Query("search") search: String? = null
  ): TaskListResponse

  @GET("tasks/my")
  suspend fun getMyTasks(
    @Query("status") status: String? = null,
    @Query("includeCompleted") includeCompleted: Boolean? = false
  ): TaskListResponse

  @GET("tasks/{id}")
  suspend fun getTask(@Path("id") taskId: String): Task

  @POST("tasks")
  suspend fun createTask(@Body request: CreateTaskRequest): Task

  @PUT("tasks/{id}")
  suspend fun updateTask(
    @Path("id") taskId: String,
    @Body request: UpdateTaskRequest
  ): Task

  @DELETE("tasks/{id}")
  suspend fun deleteTask(@Path("id") taskId: String)

  @POST("tasks/{id}/complete")
  suspend fun completeTask(@Path("id") taskId: String): Task

  @GET("tasks/{id}/subtasks")
  suspend fun getSubtasks(@Path("id") taskId: String): List<Subtask>

  @POST("tasks/{id}/subtasks")
  suspend fun addSubtask(
    @Path("id") taskId: String,
    @Body title: String
  ): Subtask

  @PUT("tasks/{taskId}/subtasks/{subtaskId}")
  suspend fun updateSubtask(
    @Path("taskId") taskId: String,
    @Path("subtaskId") subtaskId: String,
    @Body isCompleted: Boolean
  ): Subtask

  // ============ RFIs ============

  @GET("rfis")
  suspend fun getRfis(
    @Query("projectId") projectId: String? = null,
    @Query("status") status: String? = null,
    @Query("priority") priority: String? = null,
    @Query("assignedToId") assignedToId: String? = null,
    @Query("search") search: String? = null
  ): RfiListResponse

  @GET("rfis/{id}")
  suspend fun getRfi(@Path("id") rfiId: String): RfiDetailResponse

  @POST("rfis")
  suspend fun createRfi(@Body request: CreateRfiRequest): Rfi

  @PUT("rfis/{id}")
  suspend fun updateRfi(
    @Path("id") rfiId: String,
    @Body request: UpdateRfiRequest
  ): Rfi

  @DELETE("rfis/{id}")
  suspend fun deleteRfi(@Path("id") rfiId: String)

  @POST("rfis/{id}/responses")
  suspend fun addRfiResponse(
    @Path("id") rfiId: String,
    @Body request: AddRfiResponseRequest
  ): RfiResponse

  @POST("rfis/{id}/close")
  suspend fun closeRfi(@Path("id") rfiId: String): Rfi

  // ============ COMMENTS ============

  @GET("comments")
  suspend fun getComments(
    @Query("resourceType") resourceType: String,
    @Query("resourceId") resourceId: String
  ): CommentListResponse

  @POST("comments")
  suspend fun addComment(@Body request: AddCommentRequest): Comment

  @PUT("comments/{id}")
  suspend fun updateComment(
    @Path("id") commentId: String,
    @Body content: String
  ): Comment

  @DELETE("comments/{id}")
  suspend fun deleteComment(@Path("id") commentId: String)

  // ============ SECURE UPLOAD (SIGNED URL) ============

  @POST("upload/signed-url")
  suspend fun getSignedUploadUrl(@Body request: SignedUrlRequest): SignedUrlResponse

  @POST("upload/confirm")
  suspend fun confirmUpload(@Body request: ConfirmUploadRequest): ConfirmUploadResponse

  // ============ DRONEDEPLOY ============

  @GET("integrations/dronedeploy/status")
  suspend fun getDroneDeployStatus(): DroneDeployConnectionStatus

  @GET("integrations/dronedeploy/flights")
  suspend fun getDroneFlights(
    @Query("projectId") projectId: String? = null,
    @Query("status") status: String? = null,
    @Query("page") page: Int? = null,
    @Query("pageSize") pageSize: Int? = null
  ): DroneFlightsResponse

  @GET("integrations/dronedeploy/flights/{id}")
  suspend fun getDroneFlight(@Path("id") flightId: String): DroneFlightDetailResponse

  @POST("integrations/dronedeploy/flights")
  suspend fun createDroneFlight(@Body request: CreateDroneFlightRequest): DroneFlight

  @PATCH("integrations/dronedeploy/flights/{id}")
  suspend fun updateDroneFlight(
    @Path("id") flightId: String,
    @Body request: UpdateDroneFlightRequest
  ): DroneFlight

  @DELETE("integrations/dronedeploy/flights/{id}")
  suspend fun deleteDroneFlight(@Path("id") flightId: String)

  @POST("integrations/dronedeploy/sync")
  suspend fun syncDroneDeployFlights(): DroneFlightsResponse

  // ============ MATERIALS ============

  @GET("materials")
  suspend fun getMaterials(
    @Query("projectId") projectId: String? = null,
    @Query("category") category: String? = null,
    @Query("status") status: String? = null,
    @Query("search") search: String? = null,
    @Query("lowStockOnly") lowStockOnly: Boolean? = null,
    @Query("page") page: Int? = null,
    @Query("pageSize") pageSize: Int? = null
  ): MaterialsResponse

  @GET("materials/{id}")
  suspend fun getMaterial(@Path("id") materialId: String): Material

  @POST("materials")
  suspend fun createMaterial(@Body request: CreateMaterialRequest): Material

  @PATCH("materials/{id}")
  suspend fun updateMaterial(
    @Path("id") materialId: String,
    @Body request: UpdateMaterialRequest
  ): Material

  @DELETE("materials/{id}")
  suspend fun deleteMaterial(@Path("id") materialId: String)

  // ============ MATERIAL ORDERS ============

  @GET("materials/orders")
  suspend fun getMaterialOrders(
    @Query("materialId") materialId: String? = null,
    @Query("projectId") projectId: String? = null,
    @Query("status") status: String? = null,
    @Query("page") page: Int? = null,
    @Query("pageSize") pageSize: Int? = null
  ): MaterialOrdersResponse

  @GET("materials/orders/{id}")
  suspend fun getMaterialOrder(@Path("id") orderId: String): MaterialOrder

  @POST("materials/orders")
  suspend fun createMaterialOrder(@Body request: CreateMaterialOrderRequest): MaterialOrder

  @PATCH("materials/orders/{id}")
  suspend fun updateMaterialOrder(
    @Path("id") orderId: String,
    @Body request: UpdateMaterialOrderRequest
  ): MaterialOrder

  @DELETE("materials/orders/{id}")
  suspend fun deleteMaterialOrder(@Path("id") orderId: String)

  // ============ MATERIAL USAGE ============

  @GET("materials/usage")
  suspend fun getMaterialUsage(
    @Query("materialId") materialId: String? = null,
    @Query("projectId") projectId: String? = null,
    @Query("page") page: Int? = null,
    @Query("pageSize") pageSize: Int? = null
  ): MaterialUsageResponse

  @POST("materials/usage")
  suspend fun recordMaterialUsage(@Body request: RecordMaterialUsageRequest): MaterialUsage
}
