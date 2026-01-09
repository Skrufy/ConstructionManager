// Shared status color utilities for consistent styling across components
// Extracted from components to avoid defining helper functions inside React components

// Project status colors (ACTIVE, ON_HOLD, COMPLETED, ARCHIVED)
export function getProjectStatusColor(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
    case 'ON_HOLD':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
    case 'COMPLETED':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
    case 'ARCHIVED':
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
  }
}

// Daily log status colors (APPROVED, SUBMITTED, DRAFT)
export function getDailyLogStatusColor(status: string): string {
  switch (status) {
    case 'APPROVED':
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
    case 'SUBMITTED':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
    case 'DRAFT':
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
  }
}

// Equipment status colors (AVAILABLE, IN_USE, MAINTENANCE, OUT_OF_SERVICE)
export function getEquipmentStatusColor(status: string): string {
  switch (status) {
    case 'AVAILABLE':
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
    case 'IN_USE':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
    case 'MAINTENANCE':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
    case 'OUT_OF_SERVICE':
      return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
  }
}

// RFI status colors (DRAFT, SUBMITTED, UNDER_REVIEW, ANSWERED, CLOSED)
export function getRfiStatusColor(status: string): string {
  switch (status) {
    case 'DRAFT':
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400'
    case 'SUBMITTED':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
    case 'UNDER_REVIEW':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
    case 'ANSWERED':
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
    case 'CLOSED':
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400'
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400'
  }
}

// Flight/drone status colors (PROCESSED, PENDING_UPLOAD, etc.)
export function getFlightStatusColor(status: string): string {
  switch (status) {
    case 'PROCESSED':
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
    case 'PENDING_UPLOAD':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
  }
}
