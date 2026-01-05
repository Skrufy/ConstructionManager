package com.constructionpro.app.features.dailylogs.data

import com.apollographql.apollo3.ApolloClient
import com.apollographql.apollo3.api.Optional
import com.apollographql.apollo3.cache.normalized.FetchPolicy
import com.apollographql.apollo3.cache.normalized.fetchPolicy
import com.constructionpro.app.data.local.DailyLogDao
import com.constructionpro.app.data.local.DailyLogEntity
import com.constructionpro.app.data.local.PendingActionDao
import com.constructionpro.app.data.local.PendingActionEntity
import com.constructionpro.app.graphql.CreateDailyLogMutation
import com.constructionpro.app.graphql.GetDailyLogQuery
import com.constructionpro.app.graphql.GetDailyLogsQuery
import com.constructionpro.app.graphql.SubmitDailyLogMutation
import com.constructionpro.app.graphql.UpdateDailyLogMutation
import com.constructionpro.app.graphql.type.CreateDailyLogInput
import com.constructionpro.app.graphql.type.DailyLogStatus
import com.constructionpro.app.graphql.type.UpdateDailyLogInput
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.time.LocalDate
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

sealed class DailyLogsResult<out T> {
    data class Success<T>(val data: T) : DailyLogsResult<T>()
    data class Error(val message: String, val isOffline: Boolean = false) : DailyLogsResult<Nothing>()
    data object Loading : DailyLogsResult<Nothing>()
}

data class DailyLogSummary(
    val id: String,
    val date: LocalDate,
    val status: String,
    val notes: String?,
    val projectId: String,
    val projectName: String,
    val submitterName: String,
    val photoCount: Int,
    val crewCount: Int,
    val entriesCount: Int,
    val isPending: Boolean = false
)

data class DailyLogDetail(
    val id: String,
    val date: LocalDate,
    val status: String,
    val notes: String?,
    val weatherDelay: Boolean,
    val weatherDelayNotes: String?,
    val gpsLatitude: Double?,
    val gpsLongitude: Double?,
    val projectId: String,
    val projectName: String,
    val projectAddress: String?,
    val submitterId: String,
    val submitterName: String,
    val submitterEmail: String?,
    val approverId: String?,
    val approverName: String?,
    val photos: List<DailyLogPhoto>,
    val entries: List<DailyLogEntry>,
    val crewMembers: List<CrewMember>,
    val materials: List<Material>,
    val issues: List<Issue>,
    val photoCount: Int,
    val crewCount: Int,
    val entriesCount: Int,
    val totalLaborHours: Double
)

data class DailyLogPhoto(
    val id: String,
    val url: String,
    val caption: String?,
    val gpsLatitude: Double?,
    val gpsLongitude: Double?
)

data class DailyLogEntry(
    val id: String,
    val activityName: String,
    val locationNames: List<String>,
    val statusName: String?,
    val percentComplete: Int?,
    val notes: String?
)

data class CrewMember(
    val id: String,
    val name: String,
    val hours: Double,
    val trade: String?
)

data class Material(
    val id: String,
    val name: String,
    val quantity: Double,
    val unit: String?,
    val notes: String?
)

data class Issue(
    val id: String,
    val description: String,
    val severity: String,
    val resolved: Boolean
)

@Singleton
class DailyLogsRepository @Inject constructor(
    private val apolloClient: ApolloClient,
    private val dailyLogDao: DailyLogDao,
    private val pendingActionDao: PendingActionDao
) {
    private val json = Json { ignoreUnknownKeys = true }

    fun getDailyLogs(
        projectId: String? = null,
        status: String? = null,
        startDate: LocalDate? = null,
        endDate: LocalDate? = null,
        forceRefresh: Boolean = false
    ): Flow<DailyLogsResult<List<DailyLogSummary>>> = flow {
        emit(DailyLogsResult.Loading)

        try {
            // First emit cached data
            val cached = if (projectId != null) {
                dailyLogDao.getByProject(projectId)
            } else {
                dailyLogDao.getAll()
            }

            if (cached.isNotEmpty()) {
                emit(DailyLogsResult.Success(cached.map { it.toSummary() }))
            }

            // Then fetch from network
            val fetchPolicy = if (forceRefresh) FetchPolicy.NetworkOnly else FetchPolicy.CacheFirst

            val response = apolloClient.query(
                GetDailyLogsQuery(
                    projectId = Optional.presentIfNotNull(projectId),
                    status = Optional.presentIfNotNull(status?.let { DailyLogStatus.safeValueOf(it) }),
                    startDate = Optional.presentIfNotNull(startDate?.toString()),
                    endDate = Optional.presentIfNotNull(endDate?.toString()),
                    page = Optional.present(1),
                    pageSize = Optional.present(50)
                )
            )
                .fetchPolicy(fetchPolicy)
                .execute()

            if (response.hasErrors()) {
                val errorMessage = response.errors?.firstOrNull()?.message ?: "Unknown error"
                emit(DailyLogsResult.Error(errorMessage))
                return@flow
            }

            val logs = response.data?.dailyLogs?.edges?.map { edge ->
                val node = edge.node
                DailyLogSummary(
                    id = node.id,
                    date = LocalDate.parse(node.date.toString()),
                    status = node.status.name,
                    notes = node.notes,
                    projectId = node.project.id,
                    projectName = node.project.name,
                    submitterName = node.submitter.name,
                    photoCount = node.photoCount,
                    crewCount = node.crewCount,
                    entriesCount = node.entriesCount,
                    isPending = false
                )
            } ?: emptyList()

            // Cache the results
            val entities = logs.map { log ->
                DailyLogEntity(
                    id = log.id,
                    date = log.date.toString(),
                    status = log.status,
                    notes = log.notes,
                    projectId = log.projectId,
                    projectName = log.projectName,
                    submitterName = log.submitterName,
                    crewCount = log.crewCount,
                    totalHours = 0.0,
                    pendingSync = false,
                    updatedAt = System.currentTimeMillis()
                )
            }
            dailyLogDao.insertAll(entities)

            emit(DailyLogsResult.Success(logs))

        } catch (e: Exception) {
            // Network error - return cached data with offline flag
            val cached = if (projectId != null) {
                dailyLogDao.getByProject(projectId)
            } else {
                dailyLogDao.getAll()
            }

            if (cached.isNotEmpty()) {
                emit(DailyLogsResult.Success(cached.map { it.toSummary() }))
            } else {
                emit(DailyLogsResult.Error(e.message ?: "Network error", isOffline = true))
            }
        }
    }.flowOn(Dispatchers.IO)

    suspend fun getDailyLog(id: String): DailyLogsResult<DailyLogDetail> = withContext(Dispatchers.IO) {
        try {
            val response = apolloClient.query(GetDailyLogQuery(id))
                .fetchPolicy(FetchPolicy.CacheFirst)
                .execute()

            if (response.hasErrors()) {
                val errorMessage = response.errors?.firstOrNull()?.message ?: "Unknown error"
                return@withContext DailyLogsResult.Error(errorMessage)
            }

            val log = response.data?.dailyLog ?: return@withContext DailyLogsResult.Error("Daily log not found")

            DailyLogsResult.Success(
                DailyLogDetail(
                    id = log.id,
                    date = LocalDate.parse(log.date.toString()),
                    status = log.status.name,
                    notes = log.notes,
                    weatherDelay = log.weatherDelay,
                    weatherDelayNotes = log.weatherDelayNotes,
                    gpsLatitude = log.gpsLatitude,
                    gpsLongitude = log.gpsLongitude,
                    projectId = log.project.id,
                    projectName = log.project.name,
                    projectAddress = log.project.address.formatted,
                    submitterId = log.submitter.id,
                    submitterName = log.submitter.name,
                    submitterEmail = log.submitter.email,
                    approverId = log.approver?.id,
                    approverName = log.approver?.name,
                    photos = log.photos.map { photo ->
                        DailyLogPhoto(
                            id = photo.id,
                            url = photo.url,
                            caption = photo.caption,
                            gpsLatitude = photo.gpsLatitude,
                            gpsLongitude = photo.gpsLongitude
                        )
                    },
                    entries = log.entries.map { entry ->
                        DailyLogEntry(
                            id = entry.id,
                            activityName = entry.activityLabel.name,
                            locationNames = entry.locationLabels.map { it.name },
                            statusName = entry.statusLabel?.name,
                            percentComplete = entry.percentComplete,
                            notes = entry.notes
                        )
                    },
                    crewMembers = log.crewMembers.map { crew ->
                        CrewMember(
                            id = crew.id,
                            name = crew.name,
                            hours = crew.hours,
                            trade = crew.trade
                        )
                    },
                    materials = log.materials.map { material ->
                        Material(
                            id = material.id,
                            name = material.name,
                            quantity = material.quantity,
                            unit = material.unit,
                            notes = material.notes
                        )
                    },
                    issues = log.issues.map { issue ->
                        Issue(
                            id = issue.id,
                            description = issue.description,
                            severity = issue.severity,
                            resolved = issue.resolved
                        )
                    },
                    photoCount = log.photoCount,
                    crewCount = log.crewCount,
                    entriesCount = log.entriesCount,
                    totalLaborHours = log.totalLaborHours
                )
            )
        } catch (e: Exception) {
            DailyLogsResult.Error(e.message ?: "Network error", isOffline = true)
        }
    }

    suspend fun createDailyLog(
        projectId: String,
        date: LocalDate,
        notes: String?,
        weatherDelay: Boolean = false,
        weatherDelayNotes: String? = null,
        gpsLatitude: Double? = null,
        gpsLongitude: Double? = null
    ): DailyLogsResult<String> = withContext(Dispatchers.IO) {
        try {
            val input = CreateDailyLogInput(
                projectId = projectId,
                date = date.toString(),
                notes = Optional.presentIfNotNull(notes),
                weatherDelay = Optional.presentIfNotNull(weatherDelay),
                weatherDelayNotes = Optional.presentIfNotNull(weatherDelayNotes),
                gpsLatitude = Optional.presentIfNotNull(gpsLatitude),
                gpsLongitude = Optional.presentIfNotNull(gpsLongitude)
            )

            val response = apolloClient.mutation(CreateDailyLogMutation(input)).execute()

            if (response.hasErrors()) {
                val errorMessage = response.errors?.firstOrNull()?.message ?: "Unknown error"
                return@withContext DailyLogsResult.Error(errorMessage)
            }

            val createdLog = response.data?.createDailyLog
                ?: return@withContext DailyLogsResult.Error("Failed to create daily log")

            DailyLogsResult.Success(createdLog.id)

        } catch (e: Exception) {
            // Queue for offline sync
            val localId = "local_${UUID.randomUUID()}"
            val payload = mapOf(
                "projectId" to projectId,
                "date" to date.toString(),
                "notes" to notes,
                "weatherDelay" to weatherDelay,
                "weatherDelayNotes" to weatherDelayNotes,
                "gpsLatitude" to gpsLatitude,
                "gpsLongitude" to gpsLongitude
            )

            pendingActionDao.upsert(
                PendingActionEntity(
                    id = localId,
                    type = "CREATE_DAILY_LOG",
                    resourceId = localId,
                    payloadJson = json.encodeToString(payload),
                    status = "pending",
                    createdAt = System.currentTimeMillis(),
                    retryCount = 0,
                    priority = 1
                )
            )

            // Also save locally
            dailyLogDao.insertAll(
                listOf(
                    DailyLogEntity(
                        id = localId,
                        date = date.toString(),
                        status = "DRAFT",
                        notes = notes,
                        projectId = projectId,
                        projectName = "", // Will be filled on sync
                        submitterName = "", // Will be filled on sync
                        crewCount = 0,
                        totalHours = 0.0,
                        pendingSync = true,
                        updatedAt = System.currentTimeMillis()
                    )
                )
            )

            DailyLogsResult.Success(localId)
        }
    }

    suspend fun updateDailyLog(
        id: String,
        notes: String?,
        weatherDelay: Boolean?,
        weatherDelayNotes: String?
    ): DailyLogsResult<Unit> = withContext(Dispatchers.IO) {
        try {
            val input = UpdateDailyLogInput(
                notes = Optional.presentIfNotNull(notes),
                weatherDelay = Optional.presentIfNotNull(weatherDelay),
                weatherDelayNotes = Optional.presentIfNotNull(weatherDelayNotes)
            )

            val response = apolloClient.mutation(UpdateDailyLogMutation(id, input)).execute()

            if (response.hasErrors()) {
                val errorMessage = response.errors?.firstOrNull()?.message ?: "Unknown error"
                return@withContext DailyLogsResult.Error(errorMessage)
            }

            DailyLogsResult.Success(Unit)

        } catch (e: Exception) {
            // Queue for offline sync
            val payload = mapOf(
                "id" to id,
                "notes" to notes,
                "weatherDelay" to weatherDelay,
                "weatherDelayNotes" to weatherDelayNotes
            )

            pendingActionDao.upsert(
                PendingActionEntity(
                    id = UUID.randomUUID().toString(),
                    type = "UPDATE_DAILY_LOG",
                    resourceId = id,
                    payloadJson = json.encodeToString(payload),
                    status = "pending",
                    createdAt = System.currentTimeMillis(),
                    retryCount = 0,
                    priority = 1
                )
            )

            DailyLogsResult.Success(Unit)
        }
    }

    suspend fun submitDailyLog(id: String): DailyLogsResult<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = apolloClient.mutation(SubmitDailyLogMutation(id)).execute()

            if (response.hasErrors()) {
                val errorMessage = response.errors?.firstOrNull()?.message ?: "Unknown error"
                return@withContext DailyLogsResult.Error(errorMessage)
            }

            DailyLogsResult.Success(Unit)

        } catch (e: Exception) {
            // Queue for offline sync
            pendingActionDao.upsert(
                PendingActionEntity(
                    id = UUID.randomUUID().toString(),
                    type = "SUBMIT_DAILY_LOG",
                    resourceId = id,
                    payloadJson = """{"id": "$id"}""",
                    status = "pending",
                    createdAt = System.currentTimeMillis(),
                    retryCount = 0,
                    priority = 2
                )
            )

            DailyLogsResult.Success(Unit)
        }
    }

    private fun DailyLogEntity.toSummary() = DailyLogSummary(
        id = id,
        date = LocalDate.parse(date),
        status = status ?: "DRAFT",
        notes = notes,
        projectId = projectId,
        projectName = projectName ?: "",
        submitterName = submitterName ?: "",
        photoCount = 0, // Not stored in entity
        crewCount = crewCount ?: 0,
        entriesCount = entriesCount ?: 0,
        isPending = pendingSync
    )
}
