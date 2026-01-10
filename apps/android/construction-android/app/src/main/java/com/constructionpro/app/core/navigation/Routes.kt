package com.constructionpro.app.core.navigation

/**
 * Centralized route definitions for the app navigation.
 * Using sealed class for type-safe navigation.
 */
sealed class Route(val route: String) {
    // Main screens
    object Dashboard : Route("dashboard")
    object Login : Route("login")

    // Projects
    object Projects : Route("projects")
    data class ProjectDetail(val projectId: String) : Route("project/$projectId") {
        companion object {
            const val ROUTE = "project/{projectId}"
            const val ARG_PROJECT_ID = "projectId"
        }
    }
    data class ProjectEdit(val projectId: String) : Route("project/$projectId/edit") {
        companion object {
            const val ROUTE = "project/{projectId}/edit"
            const val ARG_PROJECT_ID = "projectId"
        }
    }

    // Daily Logs
    object DailyLogs : Route("daily-logs")
    object DailyLogCreate : Route("daily-log-create")
    data class DailyLogDetail(val logId: String) : Route("daily-log/$logId") {
        companion object {
            const val ROUTE = "daily-log/{logId}"
            const val ARG_LOG_ID = "logId"
        }
    }
    data class DailyLogEdit(val logId: String) : Route("daily-log/$logId/edit") {
        companion object {
            const val ROUTE = "daily-log/{logId}/edit"
            const val ARG_LOG_ID = "logId"
        }
    }

    // Documents
    object Documents : Route("documents")
    data class DocumentDetail(val documentId: String) : Route("document/$documentId") {
        companion object {
            const val ROUTE = "document/{documentId}"
            const val ARG_DOCUMENT_ID = "documentId"
        }
    }
    // DocumentViewer is the same route as DocumentDetail but uses view-only viewer
    data class DocumentViewer(val documentId: String) : Route("document/$documentId")

    // Drawings
    object Drawings : Route("drawings")
    data class DrawingViewer(val drawingId: String) : Route("drawing/$drawingId") {
        companion object {
            const val ROUTE = "drawing/{drawingId}"
            const val ARG_DRAWING_ID = "drawingId"
        }
    }

    // Time Tracking
    object TimeTracking : Route("time-tracking")

    // Equipment
    object Equipment : Route("equipment")
    data class EquipmentDetail(val equipmentId: String) : Route("equipment/$equipmentId") {
        companion object {
            const val ROUTE = "equipment/{equipmentId}"
            const val ARG_EQUIPMENT_ID = "equipmentId"
        }
    }

    // Safety
    object Safety : Route("safety")
    object IncidentCreate : Route("incident-create")
    data class IncidentDetail(val incidentId: String) : Route("incident/$incidentId") {
        companion object {
            const val ROUTE = "incident/{incidentId}"
            const val ARG_INCIDENT_ID = "incidentId"
        }
    }
    object InspectionCreate : Route("inspection-create")
    data class InspectionDetail(val inspectionId: String) : Route("inspection/$inspectionId") {
        companion object {
            const val ROUTE = "inspection/{inspectionId}"
            const val ARG_INSPECTION_ID = "inspectionId"
        }
    }
    object PunchListCreate : Route("punch-list-create")
    data class PunchListDetail(val punchListId: String) : Route("punch-list/$punchListId") {
        companion object {
            const val ROUTE = "punch-list/{punchListId}"
            const val ARG_PUNCH_LIST_ID = "punchListId"
        }
    }

    // Scheduling
    object Scheduling : Route("scheduling")
    object ScheduleCreate : Route("schedule-create")
    data class ScheduleDetail(val scheduleId: String) : Route("schedule/$scheduleId") {
        companion object {
            const val ROUTE = "schedule/{scheduleId}"
            const val ARG_SCHEDULE_ID = "scheduleId"
        }
    }

    // Financials
    object Financials : Route("financials")
    data class InvoiceDetail(val invoiceId: String) : Route("invoice/$invoiceId") {
        companion object {
            const val ROUTE = "invoice/{invoiceId}"
            const val ARG_INVOICE_ID = "invoiceId"
        }
    }
    data class ExpenseDetail(val expenseId: String) : Route("expense/$expenseId") {
        companion object {
            const val ROUTE = "expense/{expenseId}"
            const val ARG_EXPENSE_ID = "expenseId"
        }
    }
    data class ChangeOrderDetail(val changeOrderId: String) : Route("change-order/$changeOrderId") {
        companion object {
            const val ROUTE = "change-order/{changeOrderId}"
            const val ARG_CHANGE_ORDER_ID = "changeOrderId"
        }
    }

    // Certifications
    object Certifications : Route("certifications")
    object CertificationCreate : Route("certification-create")
    data class CertificationDetail(val certificationId: String) : Route("certification/$certificationId") {
        companion object {
            const val ROUTE = "certification/{certificationId}"
            const val ARG_CERTIFICATION_ID = "certificationId"
        }
    }

    // Subcontractors
    object Subcontractors : Route("subcontractors")
    object SubcontractorCreate : Route("subcontractor-create")
    data class SubcontractorDetail(val subcontractorId: String) : Route("subcontractor/$subcontractorId") {
        companion object {
            const val ROUTE = "subcontractor/{subcontractorId}"
            const val ARG_SUBCONTRACTOR_ID = "subcontractorId"
        }
    }

    // Warnings
    object Warnings : Route("warnings")
    object WarningCreate : Route("warning-create")
    data class WarningDetail(val warningId: String) : Route("warning/$warningId") {
        companion object {
            const val ROUTE = "warning/{warningId}"
            const val ARG_WARNING_ID = "warningId"
        }
    }

    // Clients
    object Clients : Route("clients")
    object ClientCreate : Route("client-create")
    data class ClientDetail(val clientId: String) : Route("client/$clientId") {
        companion object {
            const val ROUTE = "client/{clientId}"
            const val ARG_CLIENT_ID = "clientId"
        }
    }

    // Admin
    object Users : Route("users")
    data class UserDetail(val userId: String) : Route("user/$userId") {
        companion object {
            const val ROUTE = "user/{userId}"
            const val ARG_USER_ID = "userId"
        }
    }
    object UserManagement : Route("user-management")
    object TeamManagement : Route("team-management")
    object Invitations : Route("invitations")
    object CompanySettings : Route("company-settings")
    object AuditLogs : Route("audit-logs")

    // Other
    object Profile : Route("profile")
    object Settings : Route("settings")
    object Approvals : Route("approvals")
    object Labels : Route("labels")
    object Search : Route("search")
    object Reports : Route("reports")
    object Analytics : Route("analytics")
    object Notifications : Route("notifications")
    object Tasks : Route("tasks")
    object Rfis : Route("rfis")
    object SecureUpload : Route("secure-upload")
    object DroneFlights : Route("drone-flights")
    object SafetyMeetingCreate : Route("safety-meeting-create")
    object OfflineCache : Route("offline-cache")
    object SyncQueue : Route("sync-queue")
    data class PendingDailyLogUpdate(val actionId: String) : Route("pending-daily-log-update/$actionId") {
        companion object {
            const val ROUTE = "pending-daily-log-update/{actionId}"
            const val ARG_ACTION_ID = "actionId"
        }
    }
}
