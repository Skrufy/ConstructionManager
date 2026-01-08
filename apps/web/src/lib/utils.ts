import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} ${formatTime(date)}`
}

export function calculateHours(start: Date, end: Date): number {
  const diff = end.getTime() - start.getTime()
  return Math.round((diff / (1000 * 60 * 60)) * 100) / 100
}

export const ROLES = {
  ADMIN: 'ADMIN',
  PROJECT_MANAGER: 'PROJECT_MANAGER',
  SUPERINTENDENT: 'SUPERINTENDENT',
  FIELD_WORKER: 'FIELD_WORKER',
  OFFICE: 'OFFICE',
  VIEWER: 'VIEWER',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Owner / Admin',
  PROJECT_MANAGER: 'Project Manager',
  SUPERINTENDENT: 'Superintendent / Foreman',
  FIELD_WORKER: 'Field Worker / Crew',
  OFFICE: 'Office / Accounting',
  VIEWER: 'Read-Only Viewer',
}

export const PROJECT_STATUS = {
  ACTIVE: 'ACTIVE',
  ON_HOLD: 'ON_HOLD',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED',
} as const

export const LABEL_CATEGORIES = {
  ACTIVITY: 'ACTIVITY',
  LOCATION_BUILDING: 'LOCATION_BUILDING',
  LOCATION_FLOOR: 'LOCATION_FLOOR',
  LOCATION_ZONE: 'LOCATION_ZONE',
  LOCATION_ROOM: 'LOCATION_ROOM',
  STATUS: 'STATUS',
  MATERIAL: 'MATERIAL',
  ISSUE: 'ISSUE',
  VISITOR: 'VISITOR',
} as const

export const DEFAULT_LABELS = {
  ACTIVITY: [
    'Framing', 'Electrical Rough-In', 'Drywall Hang', 'Concrete Pour',
    'Plumbing', 'HVAC', 'Painting', 'Flooring', 'Cleanup', 'Punch List',
  ],
  LOCATION_BUILDING: [
    'Building A', 'Building B', 'Main Building', 'Garage', 'Outbuilding',
  ],
  LOCATION_FLOOR: [
    'Basement', 'Ground/Slab', 'Floor 1', 'Floor 2', 'Floor 3', 'Roof',
  ],
  LOCATION_ZONE: [
    'North Wing', 'South Wing', 'East Side', 'West Side', 'Interior', 'Exterior',
  ],
  LOCATION_ROOM: [
    'Kitchen', 'Bathroom', 'Bedroom', 'Mechanical Room', 'Hallway', 'Common Area',
  ],
  STATUS: [
    'Started', 'In Progress', 'Continued', 'Completed', 'On Hold', 'Rework',
  ],
  MATERIAL: [
    'Concrete', 'Rebar', 'Lumber', 'Drywall', 'Pipe/Fittings', 'Wire/Cable',
    'Paint', 'Flooring', 'Fixtures',
  ],
  ISSUE: [
    'Weather', 'Waiting on Trade', 'Material Delay', 'Equipment Down',
    'Short Crew', 'Failed Inspection', 'Design Conflict',
  ],
  VISITOR: [
    'Owner', 'Architect', 'Inspector - Building', 'Inspector - Electrical',
    'Inspector - Plumbing', 'Inspector - Fire', 'OSHA', 'Engineer',
  ],
}
