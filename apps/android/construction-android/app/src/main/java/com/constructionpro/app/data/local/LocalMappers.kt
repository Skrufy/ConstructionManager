package com.constructionpro.app.data.local

import com.constructionpro.app.data.model.Client
import com.constructionpro.app.data.model.ClientProjectCount
import com.constructionpro.app.data.model.ClientSummary
import com.constructionpro.app.data.model.DailyLogCount
import com.constructionpro.app.data.model.DailyLogProject
import com.constructionpro.app.data.model.DailyLogSummary
import com.constructionpro.app.data.model.DailyLogUser
import com.constructionpro.app.data.model.DocumentCount
import com.constructionpro.app.data.model.DocumentMetadata
import com.constructionpro.app.data.model.DocumentProject
import com.constructionpro.app.data.model.DocumentSummary
import com.constructionpro.app.data.model.DrawingSummary
import com.constructionpro.app.data.model.Label
import com.constructionpro.app.data.model.LabelProject
import com.constructionpro.app.data.model.ProjectCount
import com.constructionpro.app.data.model.ProjectSummary
import com.constructionpro.app.data.model.Warning
import com.constructionpro.app.data.model.WarningEmployee
import com.constructionpro.app.data.model.WarningIssuer
import com.constructionpro.app.data.model.WarningProject

fun ProjectSummary.toEntity(): ProjectEntity {
  return ProjectEntity(
    id = id,
    name = name,
    status = status,
    address = address,
    clientName = client?.companyName,
    updatedAt = System.currentTimeMillis()
  )
}

fun ProjectEntity.toSummary(): ProjectSummary {
  return ProjectSummary(
    id = id,
    name = name,
    status = status,
    address = address,
    client = clientName?.let { ClientSummary(companyName = it) },
    rawCount = ProjectCount()
  )
}

fun DailyLogSummary.toEntity(projectIdOverride: String? = null): DailyLogEntity {
  return DailyLogEntity(
    id = id,
    projectId = projectId ?: project?.id ?: projectIdOverride.orEmpty(),
    projectName = projectName ?: project?.name,
    date = date,
    status = status,
    crewCount = crewCount,
    totalHours = totalHours,
    submitterName = submitterName ?: submitter?.name,
    entriesCount = entriesCount ?: count?.entries,
    materialsCount = materialsCount ?: count?.materials,
    issuesCount = issuesCount ?: count?.issues,
    notes = notes,
    weatherDelay = weatherDelay,
    weatherDelayNotes = weatherDelayNotes,
    updatedAt = System.currentTimeMillis()
  )
}

fun DailyLogEntity.toSummary(): DailyLogSummary {
  return DailyLogSummary(
    id = id,
    date = date,
    status = status,
    crewCount = crewCount,
    totalHours = totalHours,
    notes = notes,
    weatherDelay = weatherDelay,
    weatherDelayNotes = weatherDelayNotes,
    // Use flat fields for compatibility with API format
    projectId = projectId,
    projectName = projectName,
    submitterName = submitterName,
    entriesCount = entriesCount,
    materialsCount = materialsCount,
    issuesCount = issuesCount,
    // Also set nested objects for backward compatibility
    project = DailyLogProject(id = projectId, name = projectName),
    submitter = submitterName?.let { DailyLogUser(name = it) },
    count = DailyLogCount(entries = entriesCount, materials = materialsCount, issues = issuesCount)
  )
}

fun DocumentSummary.toEntity(): DocumentEntity {
  return DocumentEntity(
    id = id,
    projectId = project?.id,
    projectName = project?.name,
    name = name,
    type = type,
    category = category,
    drawingNumber = metadata?.drawingNumber,
    sheetTitle = metadata?.sheetTitle,
    revisionCount = count?.revisions,
    annotationCount = count?.annotations,
    createdAt = createdAt,
    updatedAt = System.currentTimeMillis()
  )
}

fun DocumentEntity.toSummary(): DocumentSummary {
  return DocumentSummary(
    id = id,
    name = name,
    type = type,
    category = category,
    createdAt = createdAt,
    project = DocumentProject(id = projectId, name = projectName),
    metadata = DocumentMetadata(
      drawingNumber = drawingNumber,
      sheetTitle = sheetTitle
    ),
    count = DocumentCount(revisions = revisionCount, annotations = annotationCount)
  )
}

fun DrawingSummary.toEntity(): DrawingEntity {
  return DrawingEntity(
    id = id,
    projectId = project?.id,
    projectName = project?.name,
    title = title,
    drawingNumber = drawingNumber,
    scale = scale,
    fileUrl = fileUrl,
    annotationCount = annotationCount,
    createdAt = createdAt,
    updatedAt = System.currentTimeMillis()
  )
}

fun DrawingEntity.toSummary(): DrawingSummary {
  return DrawingSummary(
    id = id,
    title = title,
    drawingNumber = drawingNumber,
    scale = scale,
    fileUrl = fileUrl,
    annotationCount = annotationCount,
    createdAt = createdAt,
    project = DocumentProject(id = projectId, name = projectName)
  )
}

// ============ WARNING MAPPERS ============

fun Warning.toEntity(): WarningEntity {
  return WarningEntity(
    id = id,
    employeeId = employeeId,
    employeeName = employee?.name,
    issuedById = issuedById,
    issuedByName = issuedBy?.name,
    projectId = projectId,
    projectName = project?.name,
    warningType = warningType,
    severity = severity,
    description = description,
    incidentDate = incidentDate,
    witnessNames = witnessNames,
    actionRequired = actionRequired,
    acknowledged = acknowledged,
    acknowledgedAt = acknowledgedAt,
    status = status,
    createdAt = createdAt,
    updatedAt = System.currentTimeMillis()
  )
}

fun WarningEntity.toModel(): Warning {
  return Warning(
    id = id,
    employeeId = employeeId,
    issuedById = issuedById,
    projectId = projectId,
    warningType = warningType,
    severity = severity,
    description = description,
    incidentDate = incidentDate,
    witnessNames = witnessNames,
    actionRequired = actionRequired,
    acknowledged = acknowledged,
    acknowledgedAt = acknowledgedAt,
    status = status,
    createdAt = createdAt,
    employee = WarningEmployee(id = employeeId, name = employeeName),
    issuedBy = WarningIssuer(id = issuedById, name = issuedByName),
    project = projectId?.let { WarningProject(id = it, name = projectName) }
  )
}

// ============ CLIENT MAPPERS ============

fun Client.toEntity(): ClientEntity {
  return ClientEntity(
    id = id,
    companyName = companyName,
    contactName = contactName,
    email = email,
    phone = phone,
    address = address,
    city = city,
    state = state,
    zip = zip,
    status = status,
    notes = notes,
    website = website,
    industry = industry,
    projectCount = count?.projects ?: 0,
    updatedAt = System.currentTimeMillis()
  )
}

fun ClientEntity.toModel(): Client {
  return Client(
    id = id,
    companyName = companyName,
    contactName = contactName,
    email = email,
    phone = phone,
    address = address,
    city = city,
    state = state,
    zip = zip,
    status = status,
    notes = notes,
    website = website,
    industry = industry,
    count = ClientProjectCount(projects = projectCount)
  )
}

// ============ LABEL MAPPERS ============

fun Label.toEntity(): LabelEntity {
  return LabelEntity(
    id = id,
    category = category,
    name = name,
    projectId = projectId,
    projectName = project?.name,
    isActive = isActive,
    sortOrder = sortOrder,
    updatedAt = System.currentTimeMillis()
  )
}

fun LabelEntity.toModel(): Label {
  return Label(
    id = id,
    category = category,
    name = name,
    projectId = projectId,
    isActive = isActive,
    sortOrder = sortOrder,
    project = projectId?.let { LabelProject(id = it, name = projectName) }
  )
}
