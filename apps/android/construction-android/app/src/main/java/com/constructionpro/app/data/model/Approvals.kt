package com.constructionpro.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ApprovalsResponse(
    @SerialName("timeEntries")
    val timeEntries: List<TimeEntry> = emptyList(),
    @SerialName("dailyLogs")
    val dailyLogs: List<DailyLogSummary> = emptyList(),
    val summary: ApprovalsSummary? = null
)

@Serializable
data class ApprovalsSummary(
    val pendingTimeEntries: Int = 0,
    val pendingDailyLogs: Int = 0,
    val totalPending: Int = 0
)

@Serializable
data class ApprovalActionRequest(
    val type: String, // time-entry, daily-log
    val id: String,
    val action: String, // approve, reject
    val notes: String? = null
)

@Serializable
data class BulkApprovalRequest(
    val type: String, // time-entries, daily-logs
    val ids: List<String>,
    val action: String, // approve, reject
    val notes: String? = null
)

@Serializable
data class ApprovalActionResponse(
    val success: Boolean,
    val message: String? = null,
    val approved: Int = 0,
    val rejected: Int = 0
)
