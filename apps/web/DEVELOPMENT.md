# Construction Platform - Development Documentation

## Company Scope of Work

This construction management platform is designed for **ground work and site preparation contractors** with a focus on:

### Primary Services
- **Grading** - Land leveling, slope work, and surface preparation
- **Excavating** - Foundation digging, trenching, and earthmoving
- **Blasting** - Rock removal and controlled demolition
- **Site Preparation** - Clearing, grubbing, and rough grading
- **Earthmoving** - Cut and fill operations, material hauling

### Related Ground Work Services
- Demolition and debris removal
- Storm drainage installation
- Erosion control measures
- Utility trenching
- Compaction and soil stabilization
- Retention pond construction
- Road and pad construction

## User Roles

The platform uses a hierarchical role system with specialized roles:

| Role | Level | Description |
|------|-------|-------------|
| `ADMIN` | 6 | Full system access, company settings, user management |
| `PROJECT_MANAGER` | 5 | Project oversight, financial access, approvals |
| `SUPERINTENDENT` | 4 | Field supervision, report access, log approvals |
| `MECHANIC` | 2* | Equipment access (specialized), same base level as field worker |
| `FIELD_WORKER` | 2 | Daily operations, time tracking, daily logs |
| `OFFICE` | 3 | Administrative support, document management |
| `VIEWER` | 1 | Read-only dashboard access |

*Note: MECHANIC role has specialized access to equipment management regardless of role level.

### Specialized Role Access

Some roles have access to specific modules regardless of their hierarchy level:

- **MECHANIC**: Always has access to `/equipment` and equipment management features

## Module Visibility

Modules can be enabled/disabled by administrators in company settings:

| Module | Default Role Access | Admin Controlled |
|--------|---------------------|------------------|
| Projects | FIELD_WORKER+ | Yes |
| Daily Logs | FIELD_WORKER+ | Yes |
| Time Tracking | FIELD_WORKER+ | Yes |
| Scheduling | FIELD_WORKER+ | Yes |
| Equipment | SUPERINTENDENT+ (MECHANIC always) | Yes |
| Documents | FIELD_WORKER+ | Yes |
| Quality & Safety | FIELD_WORKER+ | Yes |
| Financials | PROJECT_MANAGER+ | Yes |
| Reports | SUPERINTENDENT+ | Yes |
| Analytics | PROJECT_MANAGER+ | Yes |
| Subcontractors | SUPERINTENDENT+ | Yes |
| Certifications | SUPERINTENDENT+ | Yes |

## API Authorization

All API endpoints enforce role-based access control:

1. **Authentication Required**: All endpoints require valid session
2. **Ownership Checks**: Users can only access their own data unless elevated role
3. **Role Hierarchy**: Higher roles can access lower role resources
4. **Specialized Access**: Mechanics bypass normal role checks for equipment

### Daily Logs Access Control

**History Visibility (Role-Based)**:
- **SUPERINTENDENT+**: Can view ALL daily logs across all projects
- **Lower Roles (FIELD_WORKER, MECHANIC, OFFICE, VIEWER)**: Can only view:
  - Logs they personally submitted
  - Logs from projects they are assigned to

**Individual Log Authorization**:
- **View**: Owner, project-assigned users, or SUPERINTENDENT+
- **Edit**: Owner or SUPERINTENDENT+
- **Approve/Reject**: SUPERINTENDENT+ only
- **Delete Draft**: Owner only
- **Delete Any**: PROJECT_MANAGER+ only

This prevents lower-level workers from seeing sensitive log data from projects they're not involved in.

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: SQLite (development) / PostgreSQL (production)
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **UI Components**: Custom components with Lucide icons

## Key Features

### Address Library
- Saved addresses for quick entry
- Integrates with OpenStreetMap Nominatim for geocoding
- GPS coordinates auto-captured when selecting addresses
- Usage tracking for frequently used addresses

### Role-Based Navigation
- Sidebar items filtered by user role
- Module visibility controlled by admin settings
- Specialized roles see their relevant sections

### Equipment Management
- Restricted to SUPERINTENDENT+ by default
- MECHANIC role always has access
- Admin can control visibility via module settings
