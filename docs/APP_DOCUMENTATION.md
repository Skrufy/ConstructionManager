# ConstructionPro - Complete App Documentation

## Overview

**ConstructionPro** is a comprehensive construction project management platform designed for construction companies to manage every aspect of their projects from a single system. Built with a mobile-first approach, it provides full-featured web, iOS, and Android applications with robust offline capabilities for field workers operating in areas with limited connectivity.

---

## Platform Architecture

| Platform | Technology |
|----------|------------|
| **Web + API** | Next.js 14, Prisma, PostgreSQL (Supabase), TypeScript |
| **Android** | Kotlin, Jetpack Compose, Material Design 3 |
| **iOS** | Swift 5.9, SwiftUI |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | JWT tokens via Supabase Auth |

---

## 1. PROJECT MANAGEMENT

### Projects
The core organizational unit of ConstructionPro. Each project represents a construction job site.

**Features:**
- Create projects with name, address, description, and date range
- GPS coordinates for precise location tracking
- Status management: `ACTIVE`, `ON_HOLD`, `COMPLETED`, `ARCHIVED`
- Visibility controls: `ALL` (everyone can view) or `ASSIGNED_ONLY` (restricted to team members)
- Link projects to clients
- Track start and end dates

**How to Use:**
1. Navigate to **Projects** from the sidebar
2. Click **+ New Project** to create a new project
3. Fill in project details including address (auto-geocoded to GPS coordinates)
4. Assign team members and set visibility
5. Use status filters to organize your project list

### Team Management
Assign users to projects with role-based permissions.

**Features:**
- Project-specific role assignments
- Permission overrides at project level
- View team members across all assigned projects

**How to Use:**
1. Open a project and go to the **Team** tab
2. Click **Add Team Member**
3. Select a user and assign their project-specific role
4. Optionally customize their permissions for this project only

### Clients
Manage your client directory and link clients to projects.

**Features:**
- Client profiles with contact information
- Industry categorization: Commercial, Residential, Industrial, Government, Healthcare, Education
- Active/inactive status tracking
- View all projects for a specific client

---

## 2. TIME TRACKING & LABOR

### Clock In/Out
Mobile-first time tracking with GPS verification.

**Features:**
- One-tap clock in/out from mobile devices
- GPS coordinates captured at clock-in and clock-out
- Break time tracking
- Approval workflow: `PENDING` → `APPROVED` or `REJECTED`
- QuickBooks sync for payroll export

**How to Use (Mobile):**
1. Open the app and tap **Clock In**
2. Select your project (if not auto-detected by GPS)
3. Your location is automatically recorded
4. Tap **Clock Out** when finished
5. Add break time if applicable
6. Entry is submitted for supervisor approval

### Approvals Dashboard
Centralized approval management for supervisors.

**Features:**
- View all pending time entries
- View submitted daily logs awaiting approval
- Bulk approve/reject functionality
- Add approval notes
- Audit trail of all approvals

**How to Use:**
1. Navigate to **Approvals** in the sidebar
2. Review pending items by category (Time Entries, Daily Logs)
3. Click individual items to review details
4. Use **Approve** or **Reject** buttons
5. Add optional notes explaining decisions

### Crew Scheduling
Plan and manage crew assignments.

**Features:**
- Create schedules for specific dates/times
- Assign crew members to projects
- Track confirmation status
- Add notes per assignment

---

## 3. DAILY LOGS

### Daily Activity Logging
Document daily progress on construction sites.

**Features:**
- Structured activity entries with customizable labels
- Location hierarchy: Building → Floor → Zone/Room
- Percentage completion tracking
- Weather data capture
- Weather delay documentation
- Crew count and total hours
- Status workflow: `DRAFT` → `SUBMITTED` → `APPROVED`

**How to Use:**
1. Navigate to **Daily Logs** and click **+ New Log**
2. Select the project and date
3. Add activities using the label system:
   - Select activity type (e.g., "Framing", "Electrical Rough-In")
   - Choose location (Building A, Floor 2, Room 101)
   - Enter completion percentage
4. Document any weather delays with notes
5. Record crew count and hours worked
6. Attach photos as needed
7. Save as **Draft** or **Submit** for approval

### Labels System
Customizable labels for organizing daily log entries.

**Categories:**
- `ACTIVITY` - Work activities (Framing, Drywall, Painting)
- `LOCATION_BUILDING` - Building names
- `LOCATION_FLOOR` - Floor levels
- `LOCATION_ZONE` - Zones within floors
- `LOCATION_ROOM` - Specific rooms
- `STATUS` - Completion statuses
- `MATERIAL` - Material types
- `ISSUE` - Issue categories

**How to Use:**
1. Go to **Admin** → **Labels**
2. Create labels by category
3. Labels appear as dropdown options in daily logs
4. Mark labels as project-specific or global

---

## 4. DOCUMENT & DRAWING MANAGEMENT

### Document Management
Upload, organize, and version control all project documents.

**Features:**
- File upload with automatic versioning
- Categories: Drawings, Specifications, Contracts, Photos, Reports, Blasting, Other
- Revision history tracking
- GPS tagging for photos
- Annotation tools: Comments, Markups, Highlights, Measurements, Callouts

**How to Use:**
1. Navigate to **Documents** in a project
2. Click **Upload** and select files
3. Choose category and add metadata
4. Previous versions are preserved when uploading new revisions
5. Use the annotation toolbar to mark up documents

### Blasting Documents (Restricted)
Special handling for explosive-related documentation.

**Features:**
- Only certified blasters can view BLASTING category documents
- Assign specific blasters to each document
- Admins have full access
- Non-blasters cannot see these documents at all

**How to Use:**
1. Upload a document and select **BLASTING** category
2. A blaster selection panel appears
3. Check the blasters who should have access
4. Only those blasters (and admins) can view the document

### Drawing Viewer
Advanced PDF viewing with construction-specific tools.

**Features:**
- PDF viewing with zoom and pan
- Scale calibration for measurements
- Pin placement linked to entities (tasks, RFIs, issues)
- Drawing metadata: Number, Sheet Title, Revision, Discipline, Scale

**How to Use:**
1. Open any drawing document
2. Use the calibration tool to set the scale (measure a known dimension)
3. Drop pins to link locations to tasks or RFIs
4. Use measurement tools for takeoffs

### Document Splitting (OCR)
Automatically split multi-page PDFs and extract metadata.

**Features:**
- Upload large PDF sets (e.g., full drawing packages)
- AI-powered OCR extracts:
  - Drawing number
  - Sheet title
  - Discipline (Architectural, Structural, Mechanical, Electrical, Plumbing, Civil)
  - Scale and revision
- Confidence scoring for manual verification
- Batch processing with progress tracking

**How to Use:**
1. Upload a multi-page PDF
2. Click **Split & Process**
3. Review extracted metadata and confidence scores
4. Correct any low-confidence extractions
5. Confirm to create individual drawing records

---

## 5. SAFETY & QUALITY MANAGEMENT

### Safety Meetings (Toolbox Talks)
Conduct and document safety meetings.

**Features:**
- Select from standardized safety topics library
- Record location, date, and time
- Track attendance with signatures
- Capture conductor signature
- Attach group photo
- Document follow-up items

**How to Use:**
1. Navigate to **Safety** → **Meetings**
2. Click **+ New Meeting**
3. Select project and topic(s)
4. Add attendees (both app users and external employees)
5. Collect signatures on mobile devices
6. Take a group photo
7. Note any follow-up items
8. Submit the meeting record

### Safety Topics Library
Pre-built and custom safety topics.

**Categories:**
- PPE (Personal Protective Equipment)
- Hazards
- Procedures
- Emergency Response
- Equipment Safety
- General Safety

### Inspections
Template-based inspection checklists.

**Features:**
- Inspection types: Safety, Quality, Environmental, Pre-Work
- Reusable templates with customizable checklist items
- Status tracking: `SCHEDULED` → `PENDING` → `PASSED`/`FAILED`/`REQUIRES_FOLLOWUP`
- Photo attachments per checklist item
- Location tagging
- Inspector signature capture

**How to Use:**
1. Go to **Safety** → **Inspections**
2. Create from a template or start fresh
3. Work through checklist items, marking Pass/Fail
4. Attach photos of issues
5. Add findings and required corrections
6. Sign and submit

### Punch Lists
Track items requiring correction before project completion.

**Features:**
- Priority levels: Low, Medium, High, Critical
- Status: `OPEN` → `IN_PROGRESS` → `COMPLETED` → `VERIFIED`
- Assign to specific trades
- Location tagging
- Due date management
- Photo documentation
- Verification by inspector

**How to Use:**
1. Create a punch list for a project
2. Add items with descriptions and photos
3. Assign priority and trade responsible
4. Set due dates
5. Track progress as items are completed
6. Verify completions before closing

### Incident Reports
Document safety incidents and near-misses.

**Features:**
- Incident types: Injury, Near-Miss, Property Damage, Environmental, Other
- Severity levels: Minor, Moderate, Serious, Critical
- Witness tracking
- Injured party documentation
- Root cause analysis
- Corrective action tracking
- Investigation workflow

**How to Use:**
1. Navigate to **Safety** → **Incidents**
2. Click **Report Incident**
3. Select type and severity
4. Document what happened, when, and where
5. List witnesses and injured parties
6. Attach photos
7. Complete root cause analysis
8. Document corrective actions

### Employee Warnings
Track disciplinary actions.

**Warning Types:**
- Tardiness
- Safety Violation
- Insubordination
- Poor Work Quality
- No-Show
- Dress Code
- Equipment Misuse
- Unprofessional Conduct

**Severity Levels:**
- Verbal Warning
- Written Warning
- Final Warning

---

## 6. FINANCIAL MANAGEMENT

### Budgets
Track project finances.

**Features:**
- Budget categories: Labor, Materials, Equipment, Subcontractor, Overhead, Contingency
- Total budget allocation
- Spending vs. budget tracking
- Project-level financial overview

### Invoices
Manage vendor and subcontractor invoices.

**Features:**
- Invoice creation with line items
- Categories: Labor, Materials, Equipment, Subcontractor, Overhead, Other
- Status workflow: `PENDING` → `APPROVED` → `PAID` (or `DISPUTED`/`VOID`)
- Tax tracking
- Attachment support
- Approval workflow

**How to Use:**
1. Go to **Financials** → **Invoices**
2. Create new invoice or upload received invoice
3. Enter vendor, amount, category, and due date
4. Attach supporting documents
5. Submit for approval
6. Track payment status

### Change Orders
Document scope changes and their impact.

**Features:**
- Reasons: Client Request, Design Change, Unforeseen Conditions, Error Correction, Scope Change
- Cost and schedule impact tracking
- Approval workflow
- Attachment support

### Expenses
Track project-related expenses.

**Categories:** Labor, Materials, Equipment, Fuel, Supplies, Meals, Travel, Other

**Features:**
- Receipt attachment (photo capture on mobile)
- Billable flag
- Status: `PENDING` → `APPROVED` → `REIMBURSED`
- Submitter and approver tracking

### QuickBooks Integration
Sync with QuickBooks for accounting.

**Features:**
- OAuth-based secure connection
- Timesheet export to QuickBooks
- Employee sync
- Payroll integration
- Sync status tracking

---

## 7. EQUIPMENT MANAGEMENT

### Equipment Inventory
Track all company equipment.

**Features:**
- Equipment catalog with type classification
- Status: `AVAILABLE`, `IN_USE`, `MAINTENANCE`, `OUT_OF_SERVICE`
- GPS location tracking
- Samsara fleet integration
- Assignment history

### Equipment Assignments
Track equipment deployment to projects.

**Features:**
- Assign equipment to projects
- Date range tracking
- View equipment location across all projects

### Equipment Logs
Daily usage tracking.

**Features:**
- Hours/miles logging
- Fuel usage tracking
- GPS data capture
- Notes per entry

### Service/Maintenance
Track equipment maintenance.

**Service Types:**
- Oil Change
- Filter Replacement
- Inspection
- Repair
- Tire/Brake/Hydraulic/Electrical Service
- Scheduled Maintenance

**Features:**
- Cost tracking
- Parts documentation
- Technician assignment
- Meter readings
- Next service scheduling

---

## 8. MATERIALS MANAGEMENT

### Material Inventory
Track construction materials.

**Categories:** Lumber, Concrete, Steel, Electrical, Plumbing, HVAC, Roofing, Drywall, Paint, Flooring, Hardware, Safety, Other

**Features:**
- SKU tracking
- Unit types (each, linear ft, sq ft, cubic yard)
- Cost per unit
- Supplier information
- Storage location
- Status: `IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`, `ON_ORDER`, `DELIVERED`
- Minimum quantity alerts

### Material Orders
Place and track orders.

**Features:**
- Supplier selection
- Quantity and cost tracking
- Expected delivery dates
- Order status tracking

### Material Usage
Log material consumption.

**Features:**
- Link usage to daily logs
- Track who used what materials
- Project-level usage reporting

---

## 9. TASKS & RFIs

### Project Tasks
Track work items and to-dos.

**Features:**
- Priority: Low, Medium, High, Critical
- Status: `TODO`, `IN_PROGRESS`, `BLOCKED`, `COMPLETED`, `CANCELLED`
- Assignee tracking
- Due dates
- Subtasks
- Tags/categories

**How to Use:**
1. Open a project and go to **Tasks**
2. Click **+ New Task**
3. Enter title, description, priority
4. Assign to a team member
5. Set due date
6. Add subtasks if needed
7. Track progress through status updates

### RFIs (Requests for Information)
Formal questions requiring answers.

**Features:**
- Auto-numbered (RFI-0001, RFI-0002, etc.)
- Status: `DRAFT` → `SUBMITTED` → `UNDER_REVIEW` → `ANSWERED` → `CLOSED`
- Question and answer fields
- Priority levels
- Assignment to specific users
- Due date tracking
- File attachments

**How to Use:**
1. Navigate to **RFIs**
2. Click **+ New RFI**
3. Select project and enter your question
4. Set priority and due date
5. Assign to the person who should answer
6. Submit the RFI
7. Track status until answered

---

## 10. CERTIFICATIONS & QUALIFICATIONS

### User Certifications
Track employee credentials.

**Types:** License, Certification, Training, OSHA, Safety, Equipment, Other

**Features:**
- Issue and expiry dates
- Certification numbers
- Document attachments
- Status: `VALID`, `EXPIRED`, `EXPIRING_SOON`, `PENDING_RENEWAL`
- Automatic expiry alerts (30, 60, 90 days)

**How to Use:**
1. Go to a user's profile or **Certifications** section
2. Click **Add Certification**
3. Enter type, number, issue date, expiry date
4. Upload supporting document
5. System automatically tracks expiry and sends alerts

### Subcontractor Certifications
Track subcontractor compliance.

**Features:**
- License verification
- Insurance expiry tracking
- Safety certifications
- OSHA compliance
- Bond documentation

---

## 11. SUBCONTRACTOR MANAGEMENT

### Subcontractor Directory
Manage your subcontractor network.

**Features:**
- Company profiles with contacts
- Trade/specialty tracking
- License and insurance tracking
- Performance ratings (1-5 stars)
- Status: `ACTIVE`, `INACTIVE`, `PREFERRED`, `BLACKLISTED`
- Historical notes

### Subcontractor Assignments
Track subcontractor work on projects.

**Features:**
- Assign subs to projects
- Contract amount tracking
- Status: `ACTIVE`, `COMPLETED`, `TERMINATED`

---

## 12. INTEGRATIONS

### DroneDeploy
Aerial mapping and progress tracking.

**Features:**
- Log drone flights with metadata
- Track: Pilot, drone model, duration, area, image count
- Store orthomosaic maps
- Export types: Orthomosaic, 3D Model, Elevation, Thermal, Plant Health, Point Cloud
- Automatic progress tracking from baseline flights
- Comparison tools (side-by-side, overlay)

**How to Use:**
1. Navigate to **DroneDeploy** for a project
2. Click **+ New Flight**
3. Enter flight details
4. Upload or sync maps from DroneDeploy
5. Use comparison tools to track progress over time

### Other Integrations
- **Google Maps** - Address geocoding and GPS tracking
- **OpenWeather** - Weather data capture for daily logs
- **Samsara** - Fleet GPS tracking for equipment
- **OpenAI** - Document OCR and metadata extraction

---

## 13. USER ROLES & PERMISSIONS

### Pre-defined Roles

| Role | Description |
|------|-------------|
| **ADMIN** | Full system access, manage users and settings |
| **PROJECT_MANAGER** | Manage projects, approve time and logs |
| **SUPERINTENDENT** | Site supervision, daily operations |
| **FOREMAN** | Crew leadership, field management |
| **CREW_LEADER** | Crew coordination |
| **FIELD_WORKER** | On-site data entry |
| **OFFICE** | Administrative functions |
| **VIEWER** | Read-only access |

### Permission System
Procore-style granular permissions.

**Access Levels:**
- `none` - No access
- `read_only` - View only
- `standard` - View and create/edit own
- `admin` - Full access including others' data

**Permission Areas:**
- Daily Logs
- Time Tracking
- Documents
- Drawings
- Tasks
- RFIs
- Safety
- Financials
- Equipment
- Materials
- Reports

### Data Access Settings
Control what data users can see:
- `ALL` - See all company data
- `ASSIGNED_PROJECTS` - Only see assigned projects
- `OWN_ONLY` - Only see own submissions

---

## 14. NOTIFICATIONS

### Notification Types
- API connection status
- System alerts
- Certification expiring
- Approval needed
- Mentions

### Delivery Methods
- In-app notifications
- Push notifications (iOS/Android)
- Email digests (configurable frequency)

### Preferences
Users can configure:
- Email notification types
- Push notification types
- Digest frequency (daily, weekly)

---

## 15. REPORTING & ANALYTICS

### Custom Reports
Build and save custom reports.

**Report Types:** Labor, Equipment, Safety, Financial, Project, Custom

**Features:**
- Dynamic filtering
- Column selection
- Grouping and sorting
- Chart types: Bar, Line, Pie, Table
- Save as templates
- Export to PDF, CSV, XLSX

### Dashboard Analytics
- Project status overview
- Labor hours summary
- Safety metrics
- Financial summaries
- Equipment utilization

---

## 16. SETTINGS

### Company Settings
- Company branding (logo, favicon)
- Timezone and locale
- Date/currency format
- Module toggles (enable/disable features)
- Role-based module visibility
- Feature flags (GPS requirement, photo requirement, auto-approve)

### User Preferences
- Theme: Light, Dark, System
- Default project
- Items per page
- View type preference (list, grid, calendar)
- Mobile module visibility

---

## 17. OFFLINE CAPABILITIES

### Mobile Offline Features
Both iOS and Android apps support full offline operation.

**What Works Offline:**
- View previously downloaded data (projects, logs, documents)
- Create new entries (queued for sync)
- Edit cached data
- Clock in/out
- Take photos

**Sync Behavior:**
- Background sync when connectivity restored
- Conflict detection and resolution
- Exponential backoff for retries
- Clear sync status indicators
- Manual sync trigger option

**How to Use:**
- Data automatically caches as you browse
- Work normally when offline - changes queue automatically
- Look for sync indicator showing pending items
- Connect to network to sync
- Conflicts prompt for resolution

---

## 18. MOBILE APP SPECIFICS

### iOS App
- Native SwiftUI interface
- Secure token storage in Keychain
- Camera integration for photos
- GPS location services
- Push notifications via APNs
- Offline data sync

### Android App
- Material Design 3 with Jetpack Compose
- Secure token storage in EncryptedSharedPreferences
- Large touch targets (56dp+) for field workers with gloves
- PDF annotation tools
- Drawing scale calibration
- Background sync with WorkManager
- Push notifications via FCM

---

## Quick Start Guide

### For Administrators
1. Set up company settings and branding
2. Configure modules (enable features you need)
3. Create permission templates
4. Invite users and assign roles
5. Create initial projects

### For Project Managers
1. Create projects with addresses and teams
2. Configure project-specific permissions
3. Set up labels for daily logs
4. Assign subcontractors and equipment
5. Monitor approvals dashboard

### For Field Workers
1. Download mobile app (iOS or Android)
2. Log in with credentials
3. Clock in at job site
4. Log daily activities
5. Take photos and document progress
6. Submit daily logs for approval
7. Clock out when finished

---

## Support

For questions or issues:
- Contact your company administrator
- Review in-app help documentation
- Check the notification center for system alerts

---

*Last Updated: January 2026*
