# ConstructionPro

A comprehensive, cross-platform construction project management system built for ground work, site preparation, and general construction contractors.

## What Is This?

ConstructionPro is a **full-stack construction management platform** that helps contractors manage their entire operation from a single system. It covers everything from daily field reporting to financial tracking, equipment management, and safety compliance.

The platform runs on three platforms:
- **Web Application** - Full-featured dashboard for office staff and project managers
- **Android App** - Field-ready mobile app with offline support
- **iOS App** - Native iPhone/iPad app with offline support

## Key Features

### Daily Operations
- **Daily Logs** - Structured daily site reports with weather, crew counts, activities, materials, and issues
- **Time Tracking** - GPS-tagged clock in/out with approval workflows
- **Crew Scheduling** - Team assignments and availability management

### Project Management
- **Projects** - Job site tracking with GPS coordinates, client assignment, and visibility controls
- **Team Assignments** - Role-based project access with permission overrides
- **Subcontractor Directory** - Vendor management with trade categories and ratings

### Equipment & Assets
- **Equipment Inventory** - Track all equipment with status (Available, In Use, Maintenance)
- **GPS Tracking** - Real-time equipment location via Samsara integration
- **Usage Logging** - Daily hours, fuel consumption, and maintenance records

### Documents & Drawings
- **File Management** - Upload, organize, and version control project documents
- **Drawing Viewer** - Interactive viewer with annotations and measurements
- **OCR Extraction** - Automatic drawing metadata detection (drawing #, revision, scale)
- **PDF Splitting** - Break apart multi-page plans into individual sheets

### Quality & Safety
- **Inspections** - Customizable checklists for safety and quality inspections
- **Punch Lists** - Construction punch lists with assignment and verification
- **Incident Reports** - Safety incident tracking with investigation workflows
- **Safety Meetings** - Meeting records with attendee signatures
- **Employee Warnings** - Discipline tracking with severity levels

### Financial Management
- **Budgets** - Project budgets with labor/materials/equipment breakdown
- **Invoices** - Vendor invoice tracking with approval workflows
- **Change Orders** - Project change order management with impact tracking
- **Expenses** - Employee expense submissions with reimbursement workflow

### Integrations
- **QuickBooks Online** - Sync timesheets for payroll processing
- **DroneDeploy** - Import orthomosaics, 3D models, and thermal maps
- **Samsara** - GPS fleet tracking for equipment location
- **OpenWeather** - Weather data for daily logs
- **OpenAI Vision** - OCR extraction from construction drawings

## How It's Built

### Architecture

```
ConstructionPro/
├── apps/
│   ├── web/          # Next.js 14 web app + REST API backend
│   ├── android/      # Kotlin/Jetpack Compose Android app
│   └── ios/          # Swift/SwiftUI iOS app
└── docs/             # Shared documentation
```

The project follows a **monorepo structure** where mobile apps consume the same REST API endpoints from the web application.

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Web Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript 5.3 |
| **Database** | PostgreSQL (Supabase) |
| **ORM** | Prisma 5.7 |
| **Authentication** | Supabase Auth (JWT) |
| **Styling** | Tailwind CSS 3.3 |
| **Validation** | Zod 3.22 |
| **Deployment** | Vercel |

**Android Stack:**
- Kotlin 1.9.22 with Jetpack Compose
- Retrofit 2.11 + OkHttp3 for networking
- Room 2.6 for local database
- WorkManager 2.9 for background sync
- Material3 design system

**iOS Stack:**
- Swift 5.9+ with SwiftUI
- async/await concurrency
- MVVM architecture
- URLSession for networking

### Offline-First Mobile

Both mobile apps implement sophisticated offline capabilities:

1. **Local Database** - All data cached locally (Room on Android, Core Data on iOS)
2. **Pending Actions Queue** - Failed API calls queued for retry
3. **Background Sync** - WorkManager (Android) / BGTaskScheduler (iOS) for sync
4. **Conflict Resolution** - Server-wins strategy for data conflicts
5. **Local IDs** - Prefixed with `local_` until server sync completes

### Role-Based Access Control

Nine hierarchical roles with granular permissions:

| Role | Level | Access |
|------|-------|--------|
| ADMIN | 8 | Full system access |
| PROJECT_MANAGER | 7 | Project creation, team management |
| DEVELOPER | 6 | Technical access |
| ARCHITECT | 5 | Design and specification access |
| FOREMAN | 4 | Daily log approval, crew management |
| CREW_LEADER | 3 | Team oversight |
| OFFICE | 3 | Administrative functions |
| FIELD_WORKER | 2 | Basic field operations |
| VIEWER | 1 | Read-only access |

Each role has configurable module visibility overrides stored in CompanySettings.

### Approval Workflows

Multiple approval workflows ensure proper oversight:

- **Daily Logs**: DRAFT → SUBMITTED → APPROVED
- **Time Entries**: PENDING → APPROVED/REJECTED
- **Invoices**: PENDING → APPROVED → PAID
- **Change Orders**: PENDING → APPROVED/REJECTED
- **Expenses**: PENDING → APPROVED → REIMBURSED

## Codebase Statistics

| Metric | Count |
|--------|-------|
| **Total Lines of Code** | ~151,600 |
| **TypeScript/TSX Files** | 218 |
| **TypeScript Lines** | 64,283 |
| **Kotlin Files** | 122 |
| **Kotlin Lines** | 47,446 |
| **Swift Files** | 106 |
| **Swift Lines** | 39,891 |
| **Prisma Models** | 54 |
| **Prisma Schema Lines** | 1,312 |
| **API Endpoint Directories** | 94 |
| **Android Screens** | 56 |
| **iOS Views** | 33 |

## Database Schema

The Prisma schema defines 54 models organized into functional domains:

**Core Entities:**
- User, Project, ProjectAssignment, Client, Subcontractor

**Daily Operations:**
- DailyLog, DailyLogEntry, DailyLogMaterial, DailyLogIssue, DailyLogVisitor

**Time & Equipment:**
- TimeEntry, Equipment, EquipmentAssignment, EquipmentLog

**Quality & Safety:**
- InspectionTemplate, Inspection, PunchList, PunchListItem
- IncidentReport, SafetyMeeting, EmployeeWarning

**Financial:**
- Budget, Invoice, ChangeOrder, Expense

**Documents:**
- File, DocumentRevision, DocumentAnnotation, DocumentSplitDraft, DocumentMetadata

**Integrations:**
- DroneFlight, DroneDeploySync, DroneDeployExport

**System:**
- CompanySettings, UserPreferences, AuditLog, Notification, DeviceToken

## API Endpoints

The REST API provides 94+ endpoint directories covering:

- `/api/auth/*` - Authentication (login, register)
- `/api/projects/*` - Project CRUD, team management
- `/api/daily-logs/*` - Daily log creation and approval
- `/api/time-entries/*` - Time tracking and approval
- `/api/files/*` - Document upload, download, annotations
- `/api/equipment/*` - Equipment inventory and logging
- `/api/safety/*` - Inspections, punch lists, incidents
- `/api/financials/*` - Budgets, invoices, expenses
- `/api/integrations/*` - QuickBooks, DroneDeploy, Samsara
- `/api/settings/*` - Company configuration
- `/api/users/*` - User management

## Key Dependencies

**Web:**
- `next` 14.2.35 - React framework
- `@prisma/client` 5.7.0 - Database ORM
- `@supabase/supabase-js` 2.89.0 - Auth and storage
- `zod` 3.22.4 - Runtime validation
- `swr` 2.3.8 - Data fetching
- `pdfjs-dist` 3.11.174 - PDF rendering
- `openai` 6.15.0 - OCR extraction

**Android:**
- `retrofit` 2.11.0 - HTTP client
- `room` 2.6.1 - Local database
- `workmanager` 2.9.0 - Background processing
- `compose-bom` 2024.02.00 - Jetpack Compose

## Development

### Prerequisites
- Node.js 18+
- PostgreSQL (or Supabase account)
- Android Studio (for Android development)
- Xcode (for iOS development)

### Web Setup
```bash
cd apps/web
npm install
cp .env.example .env.local  # Configure environment
npm run db:push             # Push schema to database
npm run dev                 # Start development server
```

### Android Setup
```bash
cd apps/android/construction-android
./gradlew assembleDebug
```

### iOS Setup
```bash
cd apps/ios/ConstructionManager
open ConstructionManager.xcodeproj
```

## Deployment

- **Web**: Deployed on Vercel with automatic builds
- **Android**: Published to Google Play Store
- **iOS**: Published to Apple App Store

## License

Proprietary - All rights reserved
