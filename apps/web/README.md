# ConstructionPro

A modern, field-worker-friendly construction project management platform built with Next.js 14, PostgreSQL, and Prisma. Designed for ground work and site preparation contractors to streamline project execution, daily reporting, time tracking, safety compliance, and financial management.

**Status**: Active Development | **License**: Proprietary | **Deployed on**: Vercel

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
  - [Database Setup](#database-setup)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [User Roles & Permissions](#user-roles--permissions)
- [Module Visibility](#module-visibility)
- [Key Features](#key-features)
  - [Project Management](#project-management)
  - [Daily Logs](#daily-logs)
  - [Time Tracking](#time-tracking)
  - [Equipment Management](#equipment-management)
  - [Quality & Safety](#quality--safety)
  - [Financial Tracking](#financial-tracking)
  - [Integrations](#integrations)
- [Development](#development)
  - [Code Organization](#code-organization)
  - [Database Schema](#database-schema)
  - [Authentication](#authentication)
  - [Authorization](#authorization)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Support](#support)

---

## Features

### Core Modules

- **Project Management** - Create and manage construction projects with GPS coordinates, status tracking, and team assignments
- **Daily Logs** - Structured daily reporting with activity tracking, materials, issues, and visitor logs
- **Time Tracking** - Clock in/out with GPS tagging, time entry approval workflows
- **Equipment Management** - Track equipment inventory, assignments, maintenance status, and GPS location
- **Document Management** - Upload, version, annotate, and organize project documents and photos
- **Quality & Safety** - Safety inspections, incident reporting, punch lists, and safety meetings
- **Financial Tracking** - Budgets, invoices, change orders, and expense management
- **Crew Scheduling** - Schedule crew assignments and track availability
- **Certifications** - Track employee licenses and certifications with expiry alerts
- **Reports & Analytics** - Custom reports, saved report templates, and project analytics
- **Integrations** - QuickBooks, DroneDeploy, Samsara, and OpenWeather API support

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Framework** | Next.js | 14.2.35 |
| **Runtime** | Node.js + React | 18.2.0 |
| **Language** | TypeScript | 5.3.0 |
| **Database** | PostgreSQL via Supabase | Latest |
| **ORM** | Prisma | 5.7.0 |
| **Authentication** | Supabase Auth | Latest |
| **Styling** | Tailwind CSS | 3.3.6 |
| **UI Icons** | Lucide React | 0.294.0 |
| **Validation** | Zod | 3.22.4 |
| **Date Handling** | date-fns | 3.0.0 |
| **Password Hashing** | bcryptjs | 2.4.3 |
| **Utilities** | clsx, tailwind-merge | Latest |
| **Deployment** | Vercel | - |

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL database (Supabase recommended for development)
- Git

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/your-org/construction-platform.git
cd construction-platform
```

2. **Install dependencies**

```bash
npm install
```

This will automatically run `prisma generate` as a postinstall hook.

3. **Set up Supabase** (required)

   Create a project at [supabase.com](https://supabase.com):
   - Create new project (PostgreSQL database is created automatically)
   - Go to Project Settings > API to get your credentials
   - Copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL`
   - Copy `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

4. **Create environment file**

```bash
cp .env.example .env.local
```

5. **Configure your environment variables** (see [Environment Setup](#environment-setup) below)

6. **Push database schema**

```bash
npm run db:push
```

7. **Create test users** (optional but recommended)

```bash
npx tsx scripts/seed-test-users.ts
```

This creates test users with different roles (Admin, Project Manager, Superintendent, Field Workers, etc.) - all using the password `TestPass123!`

8. **Start development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser and log in with a test user.

---

## Environment Setup

Create a `.env.local` file in the project root with the following variables:

### Database Configuration

```env
# PostgreSQL database connection string (from Supabase)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# Direct URL for Prisma migrations (required, bypasses connection pooling)
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
```

Get these values from your Supabase project: Settings > Database > Connection String

### Authentication (Supabase Auth)

```env
# Supabase Project Configuration (required - PUBLIC KEYS)
# Get these from: Supabase Dashboard > Project Settings > API
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY=""  # Use 'anon' key for browser client

# Supabase Admin Configuration (required for server-side operations)
# KEEP THESE SECRET - never expose to browser
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY=""  # Use 'service_role' key

# Site URL (for password reset redirects)
NEXT_PUBLIC_SITE_URL="http://localhost:3000"  # Use https:// in production

# Encryption key (for sensitive data like OAuth tokens)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=""
```

**About Supabase Keys:**
- **NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY**: Public keys safe to expose in browser
- **SUPABASE_SERVICE_ROLE_KEY**: Secret key - only for server-side operations, never expose to client

### Optional Integrations

```env
# OpenWeather API - for weather data in daily logs
OPENWEATHER_API_KEY=""

# QuickBooks Integration
QUICKBOOKS_CLIENT_ID=""
QUICKBOOKS_CLIENT_SECRET=""
QUICKBOOKS_REDIRECT_URI="http://localhost:3000/api/integrations/quickbooks/callback"
QUICKBOOKS_ENVIRONMENT="sandbox"  # 'sandbox' or 'production'

# Samsara Fleet Management
SAMSARA_API_KEY=""

# DroneDeploy Imagery
DRONEDEPLOY_API_KEY=""
```

---

## Database Setup

### Supabase (Recommended for Development)

1. Create a project at [supabase.com](https://supabase.com)
2. Copy the PostgreSQL connection string from Project Settings
3. Add to `.env.local` as `DATABASE_URL`

### Local PostgreSQL

```bash
# Install PostgreSQL
brew install postgresql  # macOS
# or
choco install postgresql  # Windows

# Start PostgreSQL service
brew services start postgresql

# Create database
createdb construction_platform

# Get connection string
DATABASE_URL="postgresql://postgres:password@localhost:5432/construction_platform?schema=public"
```

### Push Schema to Database

```bash
npm run db:push
```

### Reset Database (Development Only)

```bash
npm run db:push -- --force-reset
```

---

## User Management

### Setting Up Test Users (Development)

For quick development, create test users with different roles:

```bash
npx tsx scripts/seed-test-users.ts
```

This creates 7 test users (Admin, Project Manager, Superintendent, Field Workers, Office, Viewer) with password: **TestPass123!**

View the script output for all test user credentials.

### Migrating Existing Users to Supabase Auth

If you have existing users from a previous authentication system:

**Step 1: Run migration script**
```bash
npx tsx scripts/migrate-users-to-supabase.ts
```

This:
- Creates Supabase Auth accounts for each existing user
- Links them in Prisma via `supabaseId`
- Marks users as requiring password reset
- Shows migration summary

**Step 2: Send password reset emails**
```bash
npx tsx scripts/migrate-users-to-supabase.ts --send-reset-emails
```

This emails all migrated users instructions to set their new password.

**Note**: Migrated users must reset their password before they can log in.

---

## Authentication & OAuth Setup

### Email/Password Authentication

Out of the box - users can register and log in with email and password via Supabase Auth.

### Google Sign-In (OAuth)

To enable Google Sign-In:

1. **Create OAuth credentials in Google Cloud Console**
   - Go to [console.cloud.google.com](https://console.cloud.google.com)
   - Create new project: "ConstructionPro"
   - Enable Google+ API
   - Create OAuth 2.0 credential (Web application type)
   - Add redirect URIs:
     - Development: `https://<your-project>.supabase.co/auth/v1/callback`
     - Production: `https://<your-project>.supabase.co/auth/v1/callback`

2. **Configure in Supabase**
   - Go to Supabase Dashboard > Authentication > Providers
   - Enable "Google"
   - Enter Client ID and Client Secret from Google Cloud Console
   - Save

3. **Login button (frontend)**
   - Users can now see "Sign in with Google" button
   - Supabase automatically handles the OAuth flow

### Mobile App Authentication (iOS/Android)

For native mobile apps using Bearer tokens:

1. **Authenticate in mobile app**
   ```typescript
   // Example - Supabase Flutter SDK
   final response = await Supabase.instance.client.auth.signInWithPassword(
     email: email,
     password: password,
   );
   final session = response.session;
   final accessToken = session?.accessToken;
   ```

2. **Send with API requests**
   ```bash
   curl -X GET https://constructionpro.vercel.app/api/projects \
     -H "Authorization: Bearer $ACCESS_TOKEN" \
     -H "Content-Type: application/json"
   ```

3. **Server validates token**
   - API routes use `getAuthUser()` helper
   - Checks Authorization header for Bearer token
   - Validates with Supabase admin client
   - Returns 401 if invalid

See `src/lib/api-auth.ts` for implementation details.

---

## Available Scripts

### Core Development

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start development server on http://localhost:3000 |
| `npm run build` | Build for production (runs Prisma generate first) |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint to check code quality |
| `npm run db:push` | Push Prisma schema changes to database |
| `npm run db:studio` | Open Prisma Studio to browse/edit database |
| `npm run db:generate` | Generate Prisma Client from schema |
| `npm run db:seed` | Seed database with demo data |

### User Management

| Script | Purpose |
|--------|---------|
| `npx tsx scripts/seed-test-users.ts` | Create test users in Supabase Auth and Prisma (recommended for development) |
| `npx tsx scripts/migrate-users-to-supabase.ts` | Migrate existing users from previous authentication system to Supabase Auth |
| `npx tsx scripts/migrate-users-to-supabase.ts --send-reset-emails` | Send password reset emails to all migrated users |

### PowerShell Utilities (Windows)

```bash
.\run-dev.ps1          # Start dev server
.\regenerate.ps1       # Regenerate Prisma client
.\run-seed.ps1        # Seed database
.\update-db.ps1       # Push schema changes
.\clean-install.ps1   # Full clean reinstall
```

---

## Project Structure

```
construction-platform/
├── src/
│   ├── app/
│   │   ├── (auth)/                 # Authentication routes
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/            # Protected dashboard routes
│   │   │   ├── admin/              # Admin settings & user management
│   │   │   ├── projects/           # Project management
│   │   │   ├── daily-logs/         # Daily logs & reporting
│   │   │   ├── time-entries/       # Time tracking
│   │   │   ├── equipment/          # Equipment management
│   │   │   ├── documents/          # Document management
│   │   │   ├── safety/             # Quality & safety module
│   │   │   ├── financials/         # Budget & invoice management
│   │   │   ├── scheduling/         # Crew scheduling
│   │   │   ├── certifications/     # License & certification tracking
│   │   │   ├── reports/            # Custom reports
│   │   │   ├── analytics/          # Project analytics
│   │   │   ├── approvals/          # Approval workflows
│   │   │   └── profile/            # User profile
│   │   ├── api/                    # API routes
│   │   │   ├── auth/               # Authentication endpoints
│   │   │   ├── projects/           # Project CRUD
│   │   │   ├── daily-logs/         # Daily log endpoints
│   │   │   ├── time-entries/       # Time entry endpoints
│   │   │   ├── equipment/          # Equipment endpoints
│   │   │   ├── documents/          # Document endpoints
│   │   │   ├── safety/             # Safety module endpoints
│   │   │   ├── financials/         # Financial endpoints
│   │   │   ├── integrations/       # External API integrations
│   │   │   └── ...
│   │   ├── layout.tsx              # Root layout
│   │   └── page.tsx                # Home page
│   ├── components/                 # Reusable React components
│   │   ├── ui/                     # Base UI components
│   │   ├── layout/                 # Layout components (sidebar, header)
│   │   ├── forms/                  # Form components
│   │   ├── providers/              # React context providers (auth, etc.)
│   │   └── ...
│   ├── hooks/                      # Custom React hooks
│   ├── lib/                        # Utility functions & helpers
│   │   ├── auth-helpers.ts         # Supabase Auth user utilities
│   │   ├── api-auth.ts             # API authentication helpers
│   │   ├── supabase-auth.ts        # Supabase client initialization
│   │   ├── db.ts                   # Database utilities
│   │   ├── validation.ts           # Zod validation schemas
│   │   └── ...
│   ├── types/                      # TypeScript type definitions
│   ├── middleware.ts               # Supabase Auth middleware
│
├── prisma/
│   ├── schema.prisma               # Database schema definition
│   ├── seed.ts                     # Database seeding script
│   └── migrations/                 # Database migration history
│
├── scripts/
│   ├── seed-test-users.ts          # Create test users for development
│   └── migrate-users-to-supabase.ts # Migrate users from previous auth system
│
├── public/
│   ├── uploads/                    # User-uploaded files
│   └── sw.js                       # Service worker for PWA
│
├── .env.example                    # Environment variables template
├── .env.local                      # Local environment variables (git-ignored)
├── next.config.js                  # Next.js configuration
├── prisma.config.ts                # Prisma ORM configuration
├── tsconfig.json                   # TypeScript configuration
├── tailwind.config.ts              # Tailwind CSS configuration
├── package.json                    # Project dependencies
└── README.md                       # This file
```

---

## API Documentation

All API routes are protected with Supabase Auth. Requests must include valid authentication credentials.

### Base URL
- **Development**: `http://localhost:3000/api`
- **Production**: `https://constructionpro.vercel.app/api`

### Authentication

API requests require authentication via one of these methods:

**1. Web App (Cookie-based)** - Automatic session management
```bash
curl -X GET http://localhost:3000/api/projects \
  -H "Content-Type: application/json"
```

**2. Mobile App (Bearer token)** - Include Supabase access token
```bash
curl -X GET http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <supabase_access_token>"
```

Unauthenticated requests will receive a 401 response. Requests from unauthorized roles will receive a 403 response.

### Core Endpoints

#### Projects

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/projects` | List all accessible projects | Required |
| POST | `/projects` | Create new project | Required |
| GET | `/projects/[id]` | Get project details | Required |
| PUT | `/projects/[id]` | Update project | Required |
| DELETE | `/projects/[id]` | Delete project | Required |

#### Daily Logs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/daily-logs` | List daily logs | Required |
| POST | `/daily-logs` | Create daily log | Required |
| GET | `/daily-logs/[id]` | Get log details | Required |
| PUT | `/daily-logs/[id]` | Update log | Required |
| DELETE | `/daily-logs/[id]` | Delete log | Required |

#### Time Entries

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/time-entries` | List time entries | Required |
| POST | `/time-entries` | Create time entry (clock in) | Required |
| GET | `/time-entries/[id]` | Get entry details | Required |
| PUT | `/time-entries/[id]` | Update entry (clock out) | Required |
| DELETE | `/time-entries/[id]` | Delete entry | Required |

#### Equipment

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/equipment` | List equipment | Required |
| POST | `/equipment` | Create equipment | Required |
| GET | `/equipment/[id]` | Get equipment details | Required |
| PUT | `/equipment/[id]` | Update equipment | Required |
| DELETE | `/equipment/[id]` | Delete equipment | Required |
| GET | `/equipment/[id]/service-logs` | Get equipment service history | Required |
| POST | `/equipment/[id]/service-logs` | Create service log entry | Required |
| GET | `/equipment/[id]/service-logs/[logId]` | Get service log details | Required |
| PUT | `/equipment/[id]/service-logs/[logId]` | Update service log | Required |
| DELETE | `/equipment/[id]/service-logs/[logId]` | Delete service log | Required |

#### Documents

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/documents` | List documents | Required |
| POST | `/documents` | Upload document | Required |
| GET | `/documents/[id]` | Get document details | Required |
| PUT | `/documents/[id]` | Update document | Required |
| DELETE | `/documents/[id]` | Delete document | Required |
| POST | `/documents/[id]/annotations` | Add annotation | Required |
| GET | `/documents/[id]/revisions` | Get revision history | Required |
| POST | `/documents/[id]/revisions/upload` | Upload new revision | Required |
| GET | `/documents/[id]/metadata` | Get document metadata | Required |
| POST | `/documents/[id]/split` | Split multi-page document | Required |
| POST | `/documents/split/start` | Start document split process | Required |
| GET | `/documents/split/drafts` | Get split drafts | Required |
| GET | `/documents/split/[draftId]` | Get split draft details | Required |
| POST | `/documents/split/[draftId]/confirm` | Confirm document split | Required |
| POST | `/documents/split/[draftId]/check-revisions` | Check for revision conflicts | Required |
| POST | `/documents/analyze` | Analyze document with AI | Required |
| POST | `/documents/ocr/start` | Start OCR processing | Required |
| GET | `/documents/ocr/jobs` | List OCR jobs | Required |
| GET | `/documents/ocr/[jobId]` | Get OCR job status | Required |

#### Safety

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/safety/inspections` | List inspections | Required |
| POST | `/safety/inspections` | Create inspection | Required |
| GET | `/safety/inspections/[id]` | Get inspection details | Required |
| PUT | `/safety/inspections/[id]` | Update inspection | Required |
| GET | `/safety/inspection-templates` | List inspection templates | Required |
| POST | `/safety/inspection-templates` | Create inspection template | Required |
| GET | `/safety/incidents` | List incidents | Required |
| POST | `/safety/incidents` | Report incident | Required |
| GET | `/safety/incidents/[id]` | Get incident details | Required |
| PUT | `/safety/incidents/[id]` | Update incident | Required |
| GET | `/safety/meetings` | List safety meetings | Required |
| POST | `/safety/meetings` | Log safety meeting | Required |
| GET | `/safety/meetings/[id]` | Get meeting details | Required |
| PUT | `/safety/meetings/[id]` | Update meeting | Required |
| GET | `/safety/topics` | List safety topics | Required |
| POST | `/safety/topics` | Create safety topic | Required |
| GET | `/safety/punch-lists` | List punch lists | Required |
| POST | `/safety/punch-lists` | Create punch list | Required |
| GET | `/safety/punch-lists/[id]` | Get punch list details | Required |
| PUT | `/safety/punch-lists/[id]` | Update punch list | Required |

#### Financials

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/financials` | Get financial summary | Required |
| POST | `/financials/invoices` | Create invoice | Required |
| POST | `/financials/expenses` | Log expense | Required |
| POST | `/financials/change-orders` | Create change order | Required |

#### Users

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/users` | List users | Required |
| POST | `/users` | Create user (admin) | Required |
| GET | `/users/me` | Get current user | Required |
| PUT | `/users/[id]` | Update user | Required |
| DELETE | `/users/[id]` | Delete user (admin) | Required |
| POST | `/users/me/password` | Change password | Required |
| GET | `/users/me/preferences` | Get user preferences | Required |
| PUT | `/users/me/preferences` | Update user preferences | Required |
| GET | `/users/blasters` | List certified blasters | Required |

#### Employees

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/employees` | List employees | Required |
| POST | `/employees` | Create employee | Required |
| POST | `/employees/bulk` | Bulk import employees (CSV) | Required |
| GET | `/employees/[id]` | Get employee details | Required |
| PUT | `/employees/[id]` | Update employee | Required |
| DELETE | `/employees/[id]` | Delete employee | Required |

#### Tasks

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/tasks` | List tasks | Required |
| POST | `/tasks` | Create task | Required |
| GET | `/tasks/[id]` | Get task details | Required |
| PUT | `/tasks/[id]` | Update task | Required |
| DELETE | `/tasks/[id]` | Delete task | Required |
| POST | `/tasks/[id]/subtasks` | Create subtask | Required |
| GET | `/tasks/[id]/subtasks` | List subtasks | Required |
| PUT | `/tasks/[id]/subtasks/[subtaskId]` | Update subtask | Required |
| DELETE | `/tasks/[id]/subtasks/[subtaskId]` | Delete subtask | Required |

#### RFIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/rfis` | List RFIs | Required |
| POST | `/rfis` | Create RFI | Required |
| GET | `/rfis/[id]` | Get RFI details | Required |
| PUT | `/rfis/[id]` | Update RFI | Required |
| DELETE | `/rfis/[id]` | Delete RFI | Required |

#### Materials

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/materials` | List materials catalog | Required |
| POST | `/materials` | Add material to catalog | Required |
| GET | `/materials/[id]` | Get material details | Required |
| PUT | `/materials/[id]` | Update material | Required |
| DELETE | `/materials/[id]` | Delete material | Required |
| GET | `/materials/orders` | List material orders | Required |
| POST | `/materials/orders` | Create material order | Required |
| GET | `/materials/orders/[orderId]` | Get order details | Required |
| PUT | `/materials/orders/[orderId]` | Update order | Required |
| POST | `/materials/usage` | Log material usage | Required |

#### Permissions

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/permissions` | List permission templates | Required |
| POST | `/permissions` | Create permission template | Required |
| GET | `/permissions/[id]` | Get template details | Required |
| PUT | `/permissions/[id]` | Update template | Required |
| DELETE | `/permissions/[id]` | Delete template | Required |
| POST | `/permissions/assign` | Assign template to user | Required |
| POST | `/permissions/project-assign` | Assign project permissions | Required |
| GET | `/permissions/user/[userId]` | Get user permissions | Required |
| POST | `/permissions/check` | Check specific permission | Required |
| POST | `/permissions/overrides` | Create permission override | Required |

#### Labels

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/labels` | List project labels | Required |
| POST | `/labels` | Create label | Required |
| PUT | `/labels/[id]` | Update label | Required |
| DELETE | `/labels/[id]` | Delete label | Required |

#### Drawings

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/drawings` | List drawings | Required |
| GET | `/drawings/[id]/scale` | Get drawing scale info | Required |
| POST | `/drawings/[id]/pins` | Add drawing pin/marker | Required |

#### Admin

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/audit-logs` | Get audit logs | Admin |
| GET | `/admin/invitations` | List user invitations | Admin |
| POST | `/admin/invitations` | Send user invitation | Admin |
| GET | `/admin/invitations/[id]` | Get invitation | Admin |
| PUT | `/admin/invitations/[id]` | Update invitation | Admin |
| DELETE | `/admin/invitations/[id]` | Cancel invitation | Admin |
| POST | `/admin/invitations/[id]/resend` | Resend invitation email | Admin |

#### Search

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/search` | Global search across entities | Required |

#### Notifications

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/notifications` | List notifications | Required |
| POST | `/notifications/register-device` | Register device for push notifications | Required |
| POST | `/notifications/test` | Send test notification | Required |

#### Storage

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/storage/upload` | Upload to Supabase Storage | Required |
| GET | `/storage/health` | Check storage health | Required |
| POST | `/storage/branding` | Upload brand assets | Required |

#### Utility Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/health` | API health check | Public |
| GET | `/version` | API version information | Public |
| GET | `/geocode` | Geocode address to coordinates | Required |
| POST | `/addresses` | Save frequently used address | Required |
| POST | `/branding` | Update company branding | Required |

#### GraphQL

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/graphql` | GraphQL API endpoint | Required |

#### Cron Jobs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/cron/dronedeploy-sync` | Sync DroneDeploy data | System |
| GET | `/cron/api-health` | Health check monitoring | System |

### Response Format

All successful responses return JSON with the following structure:

```json
{
  "success": true,
  "data": { /* ... */ }
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": { /* ... */ }
}
```

### Status Codes

- **200**: Success
- **201**: Created
- **204**: No Content
- **400**: Bad Request (validation error)
- **401**: Unauthorized (not authenticated)
- **403**: Forbidden (no permission)
- **404**: Not Found
- **500**: Server Error

---

## User Roles & Permissions

ConstructionPro uses a role-based access control (RBAC) system with 7 user roles:

| Role | Level | Permissions | Access |
|------|-------|-------------|--------|
| **ADMIN** | 6 | Full system access | All features |
| **PROJECT_MANAGER** | 5 | Project oversight, financials, approvals | Projects, Financials, Reports, Analytics |
| **SUPERINTENDENT** | 4 | Field supervision, approvals | Projects, Daily Logs, Equipment, Safety, Reports |
| **FIELD_WORKER** | 2 | Daily operations, time tracking | Projects, Daily Logs, Time Tracking, Scheduling |
| **MECHANIC** | 2* | Equipment-focused access | Equipment, Projects (assigned only) |
| **OFFICE** | 3 | Administrative support | Projects, Documents, Admin |
| **VIEWER** | 1 | Read-only access | Dashboard view only |

*MECHANIC has specialized equipment access regardless of role level.

### Role-Based Features

#### ADMIN
- User management and role assignment
- Company settings configuration
- Module enable/disable
- All audit logs
- All project access

#### PROJECT_MANAGER
- Create and manage projects
- View all financials and budgets
- Approve change orders and expenses
- Generate reports
- View project analytics

#### SUPERINTENDENT
- Approve daily logs and time entries
- Access all project data
- Create safety inspections
- Issue employee warnings
- View equipment status

#### FIELD_WORKER
- Submit daily logs
- Clock in/out for time tracking
- View assigned projects
- Upload documents
- Report safety incidents

#### MECHANIC
- Full equipment management access
- Equipment status updates
- Equipment assignment tracking
- Cannot modify non-equipment features

#### OFFICE
- Document management
- Project support
- File organization
- Read-only financials view

#### VIEWER
- Dashboard view only
- No edit capabilities
- Read-only access to assigned projects

---

## Module Visibility

Administrators can enable/disable modules globally and configure role-based access overrides:

| Module | Default Visible To | Admin Controlled |
|--------|------------------|------------------|
| **Projects** | FIELD_WORKER+ | Yes |
| **Daily Logs** | FIELD_WORKER+ | Yes |
| **Time Tracking** | FIELD_WORKER+ | Yes |
| **Scheduling** | FIELD_WORKER+ | Yes |
| **Equipment** | SUPERINTENDENT+ (MECHANIC always) | Yes |
| **Documents** | FIELD_WORKER+ | Yes |
| **Quality & Safety** | FIELD_WORKER+ | Yes |
| **Financials** | PROJECT_MANAGER+ | Yes |
| **Reports** | SUPERINTENDENT+ | Yes |
| **Analytics** | PROJECT_MANAGER+ | Yes |
| **Subcontractors** | SUPERINTENDENT+ | Yes |
| **Certifications** | SUPERINTENDENT+ | Yes |
| **DroneDeploy** | PROJECT_MANAGER+ | Yes |

---

## Key Features

### Project Management

- Create projects with name, address, GPS coordinates, start/end dates
- Project status tracking: ACTIVE, ON_HOLD, COMPLETED, ARCHIVED
- Visibility modes: ALL (everyone can view) or ASSIGNED_ONLY (only assigned users)
- Team member assignments with role overrides
- Project statistics dashboard
- Project search and filtering

### Daily Logs

Field workers submit structured daily reports including:

- **Work Activities** - Select from tap-based activity labels (default 10 types)
- **Location Tracking** - Multi-level location selection:
  - Building
  - Floor
  - Zone
  - Room
- **Work Status** - Percentage complete and status indicators
- **Materials** - Track materials used with quantities and units
- **Issues/Delays** - Log delays with hours impact and descriptions
- **Visitors** - Track inspectors, owners, architects with visit details
- **Weather** - Auto-populated from OpenWeather API
- **Crew Metrics** - Crew count and total hours

**Workflow**: DRAFT → SUBMITTED → APPROVED

Superintendents can approve, request changes, or reject daily logs. SUPERINTENDENT+ roles can view all daily logs; lower roles can only see:
- Logs they personally submitted
- Logs from projects they are assigned to

### Time Tracking

- **Clock In/Out** - Start and stop work with GPS location capture
- **Project Selection** - Assign time to specific projects
- **Approval Workflow** - TIME_PENDING → TIME_APPROVED or TIME_REJECTED
- **Weekly Summary** - View total hours and time by project
- **GPS Tagging** - Capture clock in/out locations for compliance
- **QuickBooks Sync** - Automatic sync of approved time entries (optional)
- **Geofencing Ready** - Infrastructure for geofence-based clock ins

### Equipment Management

- Track equipment inventory with type and status
- Status options: AVAILABLE, IN_USE, MAINTENANCE, OUT_OF_SERVICE
- Assignment tracking with start/end dates
- GPS location tracking (ready for Samsara integration)
- Equipment logs with hours used and fuel tracking
- Maintenance scheduling and alerts
- Equipment statistics dashboard

### Quality & Safety

#### Inspections
- Customizable inspection templates by category (SAFETY, QUALITY, ENVIRONMENTAL, PRE_WORK)
- Checklist-based inspections with pass/fail tracking
- Photo attachment support
- Inspector signatures
- Overall status tracking: PENDING, PASSED, FAILED, REQUIRES_FOLLOWUP

#### Incident Reporting
- Quick incident reporting with type and severity
- Witness tracking
- Photo documentation
- Investigation notes
- Corrective actions tracking
- Status: REPORTED → UNDER_INVESTIGATION → CLOSED

#### Punch Lists
- Create punch lists for projects
- Assign items with priority levels (LOW, MEDIUM, HIGH, CRITICAL)
- Trade-specific assignments
- Completion verification with photos
- Status tracking: OPEN → IN_PROGRESS → COMPLETED → VERIFIED

#### Safety Meetings
- Log safety meetings with attendance tracking
- Signature sheet capture
- Topic-based meeting categorization
- Follow-up items tracking
- Duration recording

#### Employee Warnings
- Issue verbal, written, or final warnings
- Severity levels: VERBAL, WRITTEN, FINAL
- Incident documentation with witnesses
- Corrective actions required
- Acknowledgment tracking
- Appeal workflow

### Financial Tracking

#### Budgets
- Create project budgets with category breakdown:
  - Labor, Materials, Equipment, Subcontractor, Overhead, Contingency
- Budget vs. actual tracking
- Budget utilization reports

#### Invoices
- Create and manage invoices from vendors/subcontractors
- Category tracking (LABOR, MATERIALS, EQUIPMENT, SUBCONTRACTOR, OVERHEAD, OTHER)
- Status workflow: PENDING → APPROVED → PAID or DISPUTED/VOID
- Tax tracking
- Approval workflows

#### Change Orders
- Request and track change orders
- Reason categorization (CLIENT_REQUEST, DESIGN_CHANGE, UNFORESEEN_CONDITIONS, ERROR_CORRECTION, SCOPE_CHANGE)
- Impact on schedule (days) and budget
- Approval workflow
- Attachment support

#### Expenses
- Log project expenses by category
- Payment method tracking (CASH, CHECK, CREDIT_CARD, COMPANY_CARD)
- Receipt attachment
- Billable flag for client invoicing
- Status workflow: PENDING → APPROVED → REIMBURSED or REJECTED

### Crew Scheduling

- Create crew schedules with date, start time, and end time
- Assign crew members to scheduled dates
- Confirmation tracking
- Notes and role-specific assignments
- Schedule status: SCHEDULED, CONFIRMED, CANCELLED

### Certifications & Licenses

- Track employee certifications and licenses
- Automatic expiry alerts (configurable, default 30 days)
- Certification types: LICENSE, CERTIFICATION, TRAINING, OSHA, SAFETY, EQUIPMENT, OTHER
- Document attachment support
- Status tracking: VALID, EXPIRED, EXPIRING_SOON, PENDING_RENEWAL
- Subcontractor certification tracking with similar structure

### Integrations

#### QuickBooks
- OAuth 2.0 integration
- Sync time entries as TimeActivity records
- Sync invoices and expenses
- Configurable sync frequency
- Error tracking and retry logic

#### DroneDeploy
- Sync drone flight plans with projects
- Import orthomosaics and 3D models
- Automatic export downloading
- Asset management and versioning
- Annotation syncing (optional)

#### Samsara
- Equipment GPS location tracking
- Fleet telematics integration
- Live vehicle status updates

#### OpenWeather
- Auto-populate weather data in daily logs
- Current conditions and forecast
- Wind, temperature, and precipitation tracking

### Document Management

- Upload photos, documents, and videos
- Version history with change tracking
- Revision comments and annotations
- Document annotations (comments, markup, highlights, measurements)
- GPS tagging for photos
- Category organization (DRAWINGS, SPECIFICATIONS, CONTRACTS, PHOTOS, REPORTS, OTHER)
- Source tracking (UPLOAD, DRONEDEPLOY, SAMSARA, QUICKBOOKS)
- Full-text search support

### Reports & Analytics

#### Pre-built Reports
- Labor hours by employee
- Equipment utilization
- Safety metrics and trends
- Financial summary
- Project progress and milestones

#### Custom Reports
- Save report configurations
- Column selection
- Grouping and sorting
- Chart visualization (BAR, LINE, PIE, TABLE)
- Export capabilities (PDF, CSV, Excel)
- Public/private sharing

#### Generated Reports
- Save generated report outputs
- Report history tracking
- Re-run saved reports
- Access previously generated data

#### Analytics Dashboard
- Project KPIs and metrics
- Daily log submission rates
- Time entry trends
- Equipment utilization charts
- Safety incident dashboard
- Financial performance overview

---

## Development

### Code Organization

**Components** (`src/components/`)
- Modular, reusable React components
- File-based organization by feature
- Props-based configuration
- TypeScript interfaces for all props

**Pages** (`src/app/`)
- Next.js App Router structure
- Group-based organization `(auth)`, `(dashboard)`, etc.
- Protected routes via middleware

**API Routes** (`src/app/api/`)
- Feature-based organization
- Consistent error handling
- Role-based authorization checks
- Request validation with Zod

**Types** (`src/types/`)
- Shared TypeScript definitions
- API request/response types
- Database entity types

**Libraries** (`src/lib/`)
- Utility functions
- Validation schemas (Zod)
- Database helpers
- Authentication utilities

### Database Schema

The schema is organized into logical sections:

1. **Core Models** - User, Project, ProjectAssignment
2. **Daily Logs** - DailyLog, DailyLogEntry, DailyLogMaterial, DailyLogIssue, DailyLogVisitor
3. **Time Tracking** - TimeEntry
4. **Equipment** - Equipment, EquipmentAssignment, EquipmentLog
5. **Documents** - File, DocumentRevision, DocumentAnnotation
6. **Discipline** - EmployeeWarning
7. **Quality & Safety** - InspectionTemplate, Inspection, InspectionPhoto, PunchList, PunchListItem, IncidentReport, SafetyMeeting
8. **Financial** - Budget, Invoice, ChangeOrder, Expense
9. **Crew Management** - Subcontractor, SubcontractorAssignment, SubcontractorCertification, CrewSchedule, CrewAssignment, UserCertification
10. **Reports** - SavedReport
11. **Drone Integration** - DroneFlight, DroneMap, DroneDeploySync, DroneDeployExport
12. **Settings** - CompanySettings, UserPreferences, SavedAddress
13. **Auditing** - AuditLog, Notification
14. **Security** - OAuthState, IntegrationCredential

**Key Relationships**:
- Users have many ProjectAssignments, TimeEntries, DailyLogs
- Projects have many ProjectAssignments, DailyLogs, TimeEntries, Files
- Comprehensive audit trails via AuditLog model
- Role-based data access via middleware and API checks

### Authentication

ConstructionPro uses **Supabase Auth** with support for multiple authentication methods:

**Authentication Methods**:
- Email/Password authentication (standard credentials)
- OAuth 2.0 (Google Sign-In)
- Bearer token authentication (for iOS/mobile apps)

**How It Works**:
- Supabase Auth manages user credentials securely
- Prisma database stores user roles, status, and application-specific fields
- Users exist in both Supabase Auth (for login) and Prisma (for app data)
- User data is linked via `supabaseId` field

**Key Files**:
- `src/lib/supabase-auth.ts` - Supabase client initialization
- `src/lib/auth-helpers.ts` - User authentication and data sync utilities
- `src/lib/api-auth.ts` - API route authentication helpers
- `src/components/providers/auth-provider.tsx` - Auth context provider

**Web App Login Flow**:
1. User submits email and password (or uses OAuth)
2. Supabase Auth validates credentials
3. Session stored in HTTP-only cookies (automatic refresh)
4. Redirect to dashboard
5. Session automatically refreshed on page load

**Mobile App Login Flow**:
1. App authenticates via Supabase Auth SDK
2. Access token returned to mobile app
3. Bearer token sent with API requests: `Authorization: Bearer <token>`
4. Server validates token with Supabase admin client

**Protected Routes**:
- API routes use `requireApiAuth()` or `requireApiAuthWithRoles()` helpers
- Web routes protected via middleware checking session cookies
- Mobile requests validated via Bearer token
- Unauthenticated/unauthorized requests return 401 or 403

### Authorization

Role-based access control throughout the app:

**API Level** (`src/lib/auth.ts`):
```typescript
// Check if user has required role
if (!allowRoles.includes(user.role)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

**UI Level** (`src/components/layout/Sidebar.tsx`):
```typescript
// Show menu items only for authorized roles
const visibleItems = navigationItems.filter(item =>
  !item.requiredRole || currentRole >= item.requiredRole
)
```

**Data Access Level** (`src/app/api/daily-logs/route.ts`):
```typescript
// Lower roles can only see their own logs or assigned project logs
const whereClause = isSuperintendent ? {} : {
  OR: [
    { submittedBy: user.id },
    { project: { assignments: { some: { userId: user.id } } } }
  ]
}
```

---

## Deployment

### Vercel (Recommended)

1. **Connect Repository**
   - Push code to GitHub
   - Import project in Vercel dashboard

2. **Set Environment Variables**
   - Add all `.env.local` variables in Vercel Project Settings
   - Ensure `DIRECT_URL` is set for database migrations

3. **Configure Build Settings**
   - Framework: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`

4. **Deploy**
   ```bash
   git push origin main
   # Vercel automatically builds and deploys
   ```

5. **Post-Deployment**
   - Run database migrations: `npm run db:push`
   - Verify API endpoints are accessible
   - Test authentication flow

### Environment Variables for Production

```env
# Production Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://your-production-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[your-production-anon-key]"
SUPABASE_URL="https://your-production-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="[your-production-service-role-key]"
NEXT_PUBLIC_SITE_URL="https://constructionpro.yourdomain.com"

# Production database (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# Generate secure secrets
ENCRYPTION_KEY="[secure-random-key]"

# Production API keys
OPENWEATHER_API_KEY="[your-key]"
QUICKBOOKS_ENVIRONMENT="production"
# ... other integrations
```

**Important**:
- Use production Supabase credentials for production environment
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret - never expose to client
- Enable Supabase Auth email confirmation in production
- Configure custom SMTP or use Supabase's email service

### Database Migrations

Vercel automatically runs builds, but migrations must be manual:

```bash
# During deployment
npm run db:push

# Or with Prisma migration system
npx prisma migrate deploy
```

---

## Contributing

### Development Workflow

1. **Create feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Install dependencies and setup**
   ```bash
   npm install
   npm run db:push
   ```

3. **Start dev server**
   ```bash
   npm run dev
   ```

4. **Make changes** following the code structure guidelines above

5. **Test changes locally**
   ```bash
   npm run lint
   # Manual testing in browser
   ```

6. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: add my feature"
   git push origin feature/my-feature
   ```

7. **Create Pull Request** with description of changes

### Code Style

- Use TypeScript for all new code
- Follow existing component structure
- Format with Prettier (auto on save if configured)
- Use Tailwind CSS for styling
- Keep components focused and reusable
- Add JSDoc comments for complex functions

### Testing

- Manual testing in development environment
- Test all user roles with different permissions
- Test edge cases (no data, large datasets, etc.)
- Verify API responses match interfaces

---

## Support

### Documentation

- **Development Guide**: See `DEVELOPMENT.md`
- **Status & Roadmap**: See `DEVELOPMENT_STATUS.md`
- **Claude Instructions**: See `CLAUDE.md` (internal development guidelines)

### Common Issues

#### Database Connection Error
```
Error: connect ECONNREFUSED
```
- Verify DATABASE_URL is correct
- Check PostgreSQL is running
- Confirm network access to database

#### Prisma Generate Fails
```bash
npm run db:generate
npx prisma generate
```

#### Port 3000 Already in Use
```bash
# Kill process on port 3000 (macOS/Linux)
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

#### Authentication Issues
- Clear browser cookies and session storage
- Verify Supabase credentials are set (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
- Check Supabase project is active and not paused
- Verify user exists in both Supabase Auth and Prisma database with matching supabaseId
- For Bearer token issues, ensure token is valid and not expired

### Getting Help

1. Check `DEVELOPMENT.md` for detailed development setup
2. Review existing API route examples
3. Check Prisma documentation: https://www.prisma.io/docs/
4. Supabase documentation: https://supabase.com/docs

---

## License

This project is proprietary and confidential. Unauthorized copying or distribution is prohibited.

---

## Version

**Current**: 0.1.0 (Beta)
**Last Updated**: December 2024
