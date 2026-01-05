package com.constructionpro.app.features.projects.data

import com.apollographql.apollo3.ApolloClient
import com.apollographql.apollo3.api.Optional
import com.apollographql.apollo3.cache.normalized.FetchPolicy
import com.apollographql.apollo3.cache.normalized.fetchPolicy
import com.constructionpro.app.data.local.ProjectDao
import com.constructionpro.app.data.local.ProjectEntity
import com.constructionpro.app.graphql.GetProjectQuery
import com.constructionpro.app.graphql.GetProjectsQuery
import com.constructionpro.app.graphql.type.ProjectStatus
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.withContext
import java.time.LocalDate
import javax.inject.Inject
import javax.inject.Singleton

sealed class ProjectsResult<out T> {
    data class Success<T>(val data: T) : ProjectsResult<T>()
    data class Error(val message: String, val isOffline: Boolean = false) : ProjectsResult<Nothing>()
    data object Loading : ProjectsResult<Nothing>()
}

data class ProjectSummary(
    val id: String,
    val name: String,
    val description: String?,
    val status: String,
    val startDate: LocalDate?,
    val endDate: LocalDate?,
    val address: ProjectAddress,
    val dailyLogCount: Int,
    val documentCount: Int,
    val openIncidentCount: Int
)

data class ProjectDetail(
    val id: String,
    val name: String,
    val description: String?,
    val status: String,
    val startDate: LocalDate?,
    val endDate: LocalDate?,
    val address: ProjectAddress,
    val client: ClientInfo?,
    val team: List<TeamMember>,
    val dailyLogCount: Int,
    val documentCount: Int,
    val openIncidentCount: Int
)

data class ProjectAddress(
    val street: String?,
    val city: String?,
    val state: String?,
    val zipCode: String?,
    val country: String?,
    val latitude: Double?,
    val longitude: Double?,
    val formatted: String
)

data class ClientInfo(
    val id: String,
    val companyName: String,
    val contactName: String?,
    val email: String?,
    val phone: String?
)

data class TeamMember(
    val id: String,
    val name: String,
    val email: String?,
    val role: String,
    val avatarUrl: String?
)

@Singleton
class ProjectsRepository @Inject constructor(
    private val apolloClient: ApolloClient,
    private val projectDao: ProjectDao
) {

    fun getProjects(
        status: String? = null,
        search: String? = null,
        forceRefresh: Boolean = false
    ): Flow<ProjectsResult<List<ProjectSummary>>> = flow {
        emit(ProjectsResult.Loading)

        try {
            // First emit cached data
            val cached = if (search != null) {
                projectDao.search("%$search%")
            } else {
                projectDao.getAll()
            }

            if (cached.isNotEmpty()) {
                emit(ProjectsResult.Success(cached.map { it.toSummary() }))
            }

            // Then fetch from network
            val fetchPolicy = if (forceRefresh) FetchPolicy.NetworkOnly else FetchPolicy.CacheFirst

            val response = apolloClient.query(
                GetProjectsQuery(
                    status = Optional.presentIfNotNull(status?.let { ProjectStatus.safeValueOf(it) }),
                    search = Optional.presentIfNotNull(search),
                    page = Optional.present(1),
                    pageSize = Optional.present(50)
                )
            )
                .fetchPolicy(fetchPolicy)
                .execute()

            if (response.hasErrors()) {
                val errorMessage = response.errors?.firstOrNull()?.message ?: "Unknown error"
                emit(ProjectsResult.Error(errorMessage))
                return@flow
            }

            val projects = response.data?.projects?.edges?.map { edge ->
                val node = edge.node
                ProjectSummary(
                    id = node.id,
                    name = node.name,
                    description = node.description,
                    status = node.status.name,
                    startDate = node.startDate?.toString()?.let { LocalDate.parse(it) },
                    endDate = node.endDate?.toString()?.let { LocalDate.parse(it) },
                    address = ProjectAddress(
                        street = node.address.street,
                        city = node.address.city,
                        state = node.address.state,
                        zipCode = node.address.zipCode,
                        country = null,
                        latitude = node.address.latitude,
                        longitude = node.address.longitude,
                        formatted = node.address.formatted
                    ),
                    dailyLogCount = node.dailyLogCount,
                    documentCount = node.documentCount,
                    openIncidentCount = node.openIncidentCount
                )
            } ?: emptyList()

            // Cache the results
            val entities = projects.map { project ->
                ProjectEntity(
                    id = project.id,
                    name = project.name,
                    status = project.status,
                    address = project.address.formatted,
                    updatedAt = System.currentTimeMillis()
                )
            }
            projectDao.insertAll(entities)

            emit(ProjectsResult.Success(projects))

        } catch (e: Exception) {
            // Network error - return cached data with offline flag
            val cached = if (search != null) {
                projectDao.search("%$search%")
            } else {
                projectDao.getAll()
            }

            if (cached.isNotEmpty()) {
                emit(ProjectsResult.Success(cached.map { it.toSummary() }))
            } else {
                emit(ProjectsResult.Error(e.message ?: "Network error", isOffline = true))
            }
        }
    }.flowOn(Dispatchers.IO)

    suspend fun getProject(id: String): ProjectsResult<ProjectDetail> = withContext(Dispatchers.IO) {
        try {
            val response = apolloClient.query(GetProjectQuery(id))
                .fetchPolicy(FetchPolicy.CacheFirst)
                .execute()

            if (response.hasErrors()) {
                val errorMessage = response.errors?.firstOrNull()?.message ?: "Unknown error"
                return@withContext ProjectsResult.Error(errorMessage)
            }

            val project = response.data?.project
                ?: return@withContext ProjectsResult.Error("Project not found")

            ProjectsResult.Success(
                ProjectDetail(
                    id = project.id,
                    name = project.name,
                    description = project.description,
                    status = project.status.name,
                    startDate = project.startDate?.toString()?.let { LocalDate.parse(it) },
                    endDate = project.endDate?.toString()?.let { LocalDate.parse(it) },
                    address = ProjectAddress(
                        street = project.address.street,
                        city = project.address.city,
                        state = project.address.state,
                        zipCode = project.address.zipCode,
                        country = project.address.country,
                        latitude = project.address.latitude,
                        longitude = project.address.longitude,
                        formatted = project.address.formatted
                    ),
                    client = project.client?.let { client ->
                        ClientInfo(
                            id = client.id,
                            companyName = client.companyName,
                            contactName = client.contactName,
                            email = client.email,
                            phone = client.phone
                        )
                    },
                    team = project.team.map { member ->
                        TeamMember(
                            id = member.id,
                            name = member.name,
                            email = member.email,
                            role = member.role.name,
                            avatarUrl = member.avatarUrl
                        )
                    },
                    dailyLogCount = project.dailyLogCount,
                    documentCount = project.documentCount,
                    openIncidentCount = project.openIncidentCount
                )
            )
        } catch (e: Exception) {
            ProjectsResult.Error(e.message ?: "Network error", isOffline = true)
        }
    }

    private fun ProjectEntity.toSummary() = ProjectSummary(
        id = id,
        name = name,
        description = null,
        status = status ?: "ACTIVE",
        startDate = null,
        endDate = null,
        address = ProjectAddress(
            street = null,
            city = null,
            state = null,
            zipCode = null,
            country = null,
            latitude = null,
            longitude = null,
            formatted = address ?: ""
        ),
        dailyLogCount = 0,
        documentCount = 0,
        openIncidentCount = 0
    )
}
