import { prisma } from './prisma'
import { Prisma } from '@prisma/client'

// ============================================
// Transaction Helpers
// ============================================

/**
 * Type for transaction client
 */
export type TransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

/**
 * Execute a function within a transaction with automatic retry on conflict
 */
export async function withTransaction<T>(
  fn: (tx: TransactionClient) => Promise<T>,
  options?: {
    maxRetries?: number
    timeout?: number
    isolationLevel?: Prisma.TransactionIsolationLevel
  }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3
  const timeout = options?.timeout ?? 10000

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        timeout,
        isolationLevel: options?.isolationLevel,
      })
    } catch (error) {
      lastError = error as Error

      // Check if it's a retryable error
      if (isRetryableError(error)) {
        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.min(100 * Math.pow(2, attempt), 2000)
          await sleep(delay)
          continue
        }
      }

      // Non-retryable error or max retries reached
      throw error
    }
  }

  throw lastError
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2034: Transaction conflict - can retry
    if (error.code === 'P2034') return true
    // P2028: Transaction API error - can retry
    if (error.code === 'P2028') return true
  }

  // Network errors or timeouts might be retryable
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('network')
    ) {
      return true
    }
  }

  return false
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ============================================
// Common Transaction Patterns
// ============================================

/**
 * Create with related records in a single transaction
 */
export async function createWithRelated<
  TMain,
  TRelated extends unknown[]
>(
  mainCreate: (tx: TransactionClient) => Promise<TMain>,
  relatedCreates: ((tx: TransactionClient, main: TMain) => Promise<unknown>)[]
): Promise<{ main: TMain; related: TRelated }> {
  return withTransaction(async (tx) => {
    const main = await mainCreate(tx)
    const related = await Promise.all(
      relatedCreates.map((createFn) => createFn(tx, main))
    )
    return { main, related: related as TRelated }
  })
}

/**
 * Update with cascade in a single transaction
 */
export async function updateWithCascade<T>(
  update: (tx: TransactionClient) => Promise<T>,
  cascadeUpdates: ((tx: TransactionClient, result: T) => Promise<void>)[]
): Promise<T> {
  return withTransaction(async (tx) => {
    const result = await update(tx)
    await Promise.all(cascadeUpdates.map((updateFn) => updateFn(tx, result)))
    return result
  })
}

/**
 * Delete with cleanup in a single transaction
 */
export async function deleteWithCleanup(
  deleteOps: ((tx: TransactionClient) => Promise<void>)[]
): Promise<void> {
  await withTransaction(async (tx) => {
    // Execute deletes in order (for foreign key constraints)
    for (const deleteOp of deleteOps) {
      await deleteOp(tx)
    }
  })
}

/**
 * Batch operations with chunking
 */
export async function batchOperation<T, R>(
  items: T[],
  operation: (tx: TransactionClient, item: T) => Promise<R>,
  chunkSize = 100
): Promise<R[]> {
  const results: R[] = []

  // Split into chunks
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize)

    const chunkResults = await withTransaction(async (tx) => {
      return Promise.all(chunk.map((item) => operation(tx, item)))
    })

    results.push(...chunkResults)
  }

  return results
}

// ============================================
// Specific Transaction Operations
// ============================================

/**
 * Approve time entries in a batch transaction
 */
export async function approveTimeEntriesTransaction(
  entryIds: string[],
  approverId: string
): Promise<number> {
  return withTransaction(async (tx) => {
    const result = await tx.timeEntry.updateMany({
      where: {
        id: { in: entryIds },
        status: 'PENDING',
      },
      data: {
        status: 'APPROVED',
        approvedBy: approverId,
      },
    })
    return result.count
  })
}

/**
 * Reject time entries in a batch transaction
 */
export async function rejectTimeEntriesTransaction(
  entryIds: string[],
  approverId: string,
  reason?: string
): Promise<number> {
  return withTransaction(async (tx) => {
    const result = await tx.timeEntry.updateMany({
      where: {
        id: { in: entryIds },
        status: 'PENDING',
      },
      data: {
        status: 'REJECTED',
        approvedBy: approverId,
        notes: reason,
      },
    })
    return result.count
  })
}

/**
 * Submit daily log with entries transaction
 */
export async function submitDailyLogTransaction(
  dailyLogId: string
): Promise<void> {
  await withTransaction(async (tx) => {
    // Update daily log status
    await tx.dailyLog.update({
      where: { id: dailyLogId },
      data: {
        status: 'SUBMITTED',
      },
    })
  })
}

/**
 * Create project with initial budget transaction
 */
export async function createProjectWithBudgetTransaction(
  projectData: Prisma.ProjectCreateInput,
  budgetData: Omit<Prisma.BudgetCreateInput, 'project' | 'creator'>,
  creatorId: string
): Promise<{ project: { id: string }; budget: { id: string } | null }> {
  return withTransaction(async (tx) => {
    // Create project
    const project = await tx.project.create({
      data: projectData,
      select: { id: true },
    })

    // Create budget if provided
    let budget = null
    if (budgetData.totalBudget > 0) {
      budget = await tx.budget.create({
        data: {
          ...budgetData,
          projectId: project.id,
          createdBy: creatorId,
        },
        select: { id: true },
      })
    }

    return { project, budget }
  })
}

/**
 * Delete project with all related data transaction
 */
export async function deleteProjectTransaction(projectId: string): Promise<void> {
  await withTransaction(async (tx) => {
    // Delete in order to respect foreign keys
    // (Prisma cascades should handle most, but being explicit)

    await tx.projectAssignment.deleteMany({ where: { projectId } })
    await tx.dailyLog.deleteMany({ where: { projectId } })
    await tx.timeEntry.deleteMany({ where: { projectId } })
    await tx.file.deleteMany({ where: { projectId } })
    await tx.budget.deleteMany({ where: { projectId } })
    await tx.invoice.deleteMany({ where: { projectId } })
    await tx.expense.deleteMany({ where: { projectId } })
    await tx.changeOrder.deleteMany({ where: { projectId } })
    await tx.inspection.deleteMany({ where: { projectId } })
    await tx.punchList.deleteMany({ where: { projectId } })
    await tx.incidentReport.deleteMany({ where: { projectId } })
    await tx.safetyMeeting.deleteMany({ where: { projectId } })
    await tx.crewSchedule.deleteMany({ where: { projectId } })
    await tx.employeeWarning.deleteMany({ where: { projectId } })

    // Finally delete the project
    await tx.project.delete({ where: { id: projectId } })
  })
}

/**
 * Process invoice payment transaction
 */
export async function processInvoicePaymentTransaction(
  invoiceId: string,
  paidAmount: number,
  approverId: string
): Promise<void> {
  await withTransaction(async (tx) => {
    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        paidAmount,
        paidDate: new Date(),
        approvedBy: approverId,
      },
    })
  })
}

/**
 * Approve change order and update budget transaction
 */
export async function approveChangeOrderTransaction(
  changeOrderId: string,
  approverId: string
): Promise<void> {
  await withTransaction(async (tx) => {
    // Get change order details
    const changeOrder = await tx.changeOrder.findUnique({
      where: { id: changeOrderId },
      include: { project: { include: { budget: true } } },
    })

    if (!changeOrder) throw new Error('Change order not found')
    if (!changeOrder.project.budget) throw new Error('Project has no budget')

    // Update change order status
    await tx.changeOrder.update({
      where: { id: changeOrderId },
      data: {
        status: 'APPROVED',
        approvedBy: approverId,
        approvedDate: new Date(),
      },
    })

    // Update project budget
    await tx.budget.update({
      where: { id: changeOrder.project.budget.id },
      data: {
        totalBudget: changeOrder.project.budget.totalBudget + changeOrder.amount,
      },
    })
  })
}
