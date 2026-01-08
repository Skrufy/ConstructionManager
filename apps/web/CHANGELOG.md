# Changelog - ConstructionPro

All notable changes to the ConstructionPro project management platform are documented in this file.

## [0.4.0] - 2025-12-22

### Added

#### Google Maps Integration
- Add Google Maps API validation with real-world address verification
  - Validate API keys by making actual test requests to Google Places API
  - Fallback to OpenStreetMap (Nominatim) when Google Maps API key is not configured
  - Bias address results toward Tennessee/Nashville region for local-first results
  - Cache address autocomplete results for 5 minutes to reduce API costs
- Add Google Maps integration status endpoint (`/api/integrations/googlemaps`)
  - Real-time status indicator showing whether API key is configured
  - Integration settings available in admin integrations page

#### Mobile Experience Improvements
- Add landscape orientation support for document viewing on mobile devices
  - Better use of screen space when device is rotated
  - Responsive document viewer that adapts to orientation changes
  - Improved readability for construction documents on tablets

#### Document OCR Enhancement
- Add page-by-page OCR scanning capability
  - Process multi-page PDFs incrementally for more accurate metadata extraction
  - Extract metadata from each page independently for detailed document analysis
  - Better handling of complex documents with varying content per page

#### User Interface Enhancements
- Replace eye icons with descriptive action labels for improved clarity
  - Display "Open Drawing", "Open Specs", "Open Document" instead of generic eye icon
  - Better accessibility and guidance for field workers unfamiliar with UI conventions
  - Consistent labeling across all document and file viewing actions
- Improve mobile touch target sizes to 48px minimum
  - Field worker-friendly interface with easier tap targets
  - Meets accessibility standards (WCAG 2.1 Level AA) for touch targets
  - Better usability on construction sites with gloved hands

### Changed

#### API & Backend
- Update address autocomplete API to use Google Places API when configured
  - Smart fallback to Nominatim for open-source compatibility
  - Improved result quality and relevance for address selection
- Refactor OpenAI client initialization to lazy-load at runtime
  - Fixes build issues on Vercel when OPENAI_API_KEY is not available during build phase
  - More flexible deployment configuration with optional API keys

### Fixed

#### API & Backend
- Fix lazy-initialization of OpenAI client for Vercel builds
  - Prevent build failures when OPENAI_API_KEY environment variable is not set
  - Allow optional OpenAI features without breaking the build process

### Improved

#### Document Management
- Enhance PDF viewer with better page-by-page OCR processing
  - More granular and accurate metadata extraction from multi-page documents
  - Better error handling for corrupted or complex PDF structures

#### User Experience
- Improve mobile usability across document viewing workflows
  - Responsive design for landscape and portrait orientations
  - Larger touch targets reduce accidental misclicks on construction site

## [0.3.0] - 2025-12-21

### Added

#### Document OCR & Auto-Metadata Extraction
- Add Document OCR service using OpenAI Vision API for intelligent document analysis
  - Automatic extraction of metadata from PDFs and images using GPT-4 Vision
  - Extract drawing information: drawing number, sheet number, revision, scale, discipline
  - Extract location information: building, floor, zone, room
  - Extract dates: document date, revision date, approval date
  - Smart project matching based on extracted content with confidence scoring
- Add `/api/documents/analyze` endpoint for on-demand document analysis
  - Support for PDF, JPEG, PNG, GIF, WebP, and TIFF file formats
  - 10MB file size limit with user-friendly error messages
  - Rate limiting (10 analyses per minute) to manage API costs
  - Authentication required with admin enable/disable toggle
- Add OCR Suggestions component for document upload flow
  - Real-time analysis during upload with loading states
  - Expandable suggestions panel showing extracted metadata
  - One-click buttons to apply project match and metadata to document fields
  - Visual feedback showing applied suggestions
  - Handles OCR errors gracefully with user-friendly messages
- Add ability to analyze existing documents file-by-file
  - Accessible from project documents and admin documents pages
  - Helpful error handling for common issues (password-protected PDFs, corrupted files)
- Add OCR feature toggle in admin settings
  - Administrators can enable/disable OCR for entire organization
  - Configurable by admin users in admin/settings interface

#### OpenAI Integration
- Add OpenAI integration page in admin integrations section
  - Configure OpenAI API key for document analysis
  - Status indicator showing connection status
  - Helpful configuration guidance for users

#### Security & Validation Enhancements
- Add comprehensive file validation using magic bytes (file signatures)
  - Prevent spoofed files (e.g., executable disguised as PDF)
  - Support detection for 15+ file types (images, documents, CAD, videos, archives)
  - Validate file content against declared MIME type
  - Block executable files regardless of extension (MZ, ELF, Mach-O)
- Add centralized rate limiting system for all API endpoints
  - Configurable rate limits per endpoint type (standard, strict, auth, upload, reports, ocr, analytics, webhook)
  - OCR endpoints: 10 requests per minute
  - Auth endpoints: 10 attempts per 15 minutes
  - Upload endpoints: 10 uploads per minute
  - Report generation: 5 reports per minute
  - IP-based and user-ID-based rate limiting with proxy header support
  - Rate limit headers in HTTP responses (X-RateLimit-*)
  - Automatic IP blocking for suspicious activity (configurable threshold)
- Add input validation and size limits for OCR analysis
  - Maximum OCR file size of 10MB
  - Validate project access before analyzing documents
  - Respect role-based access control when matching projects

#### Enhanced File Handling
- Add comprehensive file validation utility with multiple validation layers
  - Extension validation with dangerous extension blocklist
  - Content validation using magic bytes/file signatures
  - Size validation with category-specific limits
  - Filename sanitization to prevent path traversal attacks
  - Support for 50+ file types across multiple categories

### Changed

#### API Improvements
- Update document analysis endpoint to use new rate limiting system
- Enhanced error handling with specific, user-friendly error messages for OCR service
  - Distinguishes between API configuration issues, rate limits, timeouts, network errors
  - Provides actionable guidance for users and administrators

### Fixed

None in this release.

### Security

- **File Upload Security**: Add magic byte validation to prevent file type spoofing attacks
  - Validates file content matches declared type
  - Blocks executable files (MZ, ELF, Mach-O) regardless of extension or claimed type
- **Rate Limiting**: Implement comprehensive rate limiting across all API endpoints
  - Protects against abuse and excessive API calls
  - Prevents cost overruns from repeated OCR requests
  - Configurable thresholds and time windows per endpoint type
- **IP-Based Abuse Prevention**: Add suspicious activity tracking and automatic IP blocking
  - Records suspicious activity per IP address
  - Auto-blocks IPs after reaching abuse threshold
  - Manual IP blocking/unblocking capability

### Dependencies

- Upgrade `openai` package for Vision API support
- Add `pdf-to-img` for PDF-to-image conversion (OCR preprocessing)

---

## [0.2.0] - 2025-12-21

### Added

#### Access Control & Permissions
- Add complete role-based access control system for project managers and administrators
  - Configurable roles: Field Worker, Mechanic, Viewer, Superintendent, Project Manager
  - Per-role module visibility toggles with visual override indicators
  - Per-role daily log data access settings (All, Assigned Projects, Own Only)
  - Role settings saved in admin settings interface
- Add project-level access control with visibility modes
  - ALL visibility mode: visible to all team members
  - ASSIGNED_ONLY visibility mode: only visible to assigned users and administrators
  - User assignment interface for managing project team access
  - Project creation and edit pages include access control configuration
  - Automatic filtering of projects based on user access rights

#### User Profile & Settings
- Add user profile page at `/profile` with personal settings management
  - Edit name and phone number
  - Change password with current password verification
  - Configure notification preferences (daily digest, approvals, mentions, certification expiry)
  - Theme selection (light/dark/system)
  - Field-worker-friendly interface with large touch targets
- Add password change functionality with secure bcrypt verification

#### DroneDeploy Integration
- Add DroneDeploy sync backend for automatic document import from drone surveys
  - Sync service to fetch plans and exports from DroneDeploy API
  - Auto-matching of DroneDeploy plans to local projects by name and GPS coordinates
  - Project-plan mapping management interface
  - Manual and automatic sync options
  - Daily cron job (6 AM) for automatic export synchronization
  - Track document source (UPLOAD, DRONEDEPLOY, etc.)
  - Full sync API with multiple action handlers:
    - Get sync configuration status
    - View all project-plan mappings
    - Fetch plans from DroneDeploy
    - Find auto-match suggestions
    - Run full sync or sync specific mappings
    - Create and auto-create project mappings
    - Import individual exports as project files
    - Toggle sync enabled/disabled per mapping

#### Integrations & APIs
- Add manual sync buttons to integrations page for DroneDeploy and Samsara
- Add API health monitoring with cron-based status checks
  - Monitor QuickBooks, DroneDeploy, Samsara, and OpenWeather integrations
  - Automatic health check notifications

#### Document Management
- Add project-level documents page (`/projects/[id]/documents`)
  - View and upload documents specific to individual projects
  - Filter documents by project
  - Track uploader information for each file
- Add auto-delete documents feature for administrators
  - Configurable number of years before automatic deletion (default: 2 years)
  - Warning UI with increment controls
  - Automatic cleanup of old company documents

#### Database Improvements
- Add Notification model for in-app notification system
- Add 16+ compound database indexes for frequently queried data
  - Improves performance on common search and filter operations
- Convert 20+ JSON String fields to native JSONB type
  - Better performance and PostgreSQL-native data handling
  - Proper type safety for structured data
- Add Prisma error handling utility for consistent database error management

#### UI/UX Enhancements
- Add NotificationBell component with real-time polling
  - View in-app notifications and mark as read
  - Real-time updates of system notifications
- Create reusable Toggle component for settings
  - Construction-worker-friendly sizing and large touch targets
- Refresh settings page with gradient header matching app design system
  - Improved visual hierarchy and consistency
  - Better accessibility and visibility of toggles

### Changed

#### Project Management
- Update project filtering to respect user access control
  - Non-admin users only see projects where they have visibility access
  - Admin users see all projects

#### Daily Logs
- Update daily log wizard with crew selection dropdown (replaces crew count input)
  - Better crew member tracking and accountability
- Add completion percentage sliders per activity in daily log wizard
  - Granular tracking of activity progress

#### Settings Page
- Replace inline toggles with reusable Toggle component
  - Consistent styling and behavior across settings
- Update to use primary colors and design system classes
  - Better visual consistency with app design

#### API & Backend
- Update API endpoints to properly handle Json field writes
  - Pass objects directly instead of using JSON.stringify()
  - Consistent pattern across all API routes
- Update database schema to accommodate new access control features
  - Add roleModuleOverrides field for per-role visibility
  - Add roleDataAccess field for per-role data access settings
  - Keep legacy Field Worker fields for backwards compatibility
- Refactor daily logs API to check role-specific data access settings
  - Respects per-role data visibility when fetching logs

### Improved

#### Performance
- Add case-insensitive search for PostgreSQL database
  - Uses mode: 'insensitive' in Prisma queries
  - Consistent search behavior across the application
  - Refactored search route to use database-level filtering instead of client-side

#### Type Safety
- Improve TypeScript type handling for Json fields in Prisma
  - Proper casting through unknown for array and object types
  - Consistent type narrowing patterns across codebase
- Better type annotations for role-based access control throughout application
- Fix session user role type narrowing in analytics and integrations pages

#### User Interface
- Enhance input and textarea styling for better visibility
  - Darker borders (gray-400) for better contrast
  - Add shadow and hover states for improved feedback
  - Implement construction-worker-friendly styling
- Improve notification bell accessibility
  - Better z-index handling
  - Enhanced aria attributes for screen readers
  - Visible focus ring for keyboard navigation
- Add text-secondary and text-tertiary utility classes
  - Improved color consistency and accessibility
- Darken text-outdoor-muted to gray-600 for WCAG compliance

#### Documentation
- Update CLAUDE.md with Json field handling patterns
  - Clarify reading pattern (no JSON.parse, cast through unknown)
  - Clarify writing pattern (pass objects directly, no JSON.stringify)
  - Add JSONB gotcha documentation

### Fixed

#### Security
- Upgrade Next.js from 14.2.21 to 14.2.35 (Critical Security Update)
  - Fixes CVE-2025-55182: Remote Code Execution in React Server Components
  - CVSS Score: 10.0 (Critical)
  - Actively being exploited in the wild
  - Also update eslint-config-next to 14.2.35

#### Settings & Navigation
- Fix Settings page 404 error: header link now points to correct `/admin/settings` route
- Fix Weather API status display to dynamically show configured/not configured state
  - Show green checkmark and "Connected" when API key is set
  - Show yellow alert and "Not Configured" when missing

#### Type Safety & Compatibility
- Fix TypeScript errors throughout codebase
  - Remove manual updatedAt assignments (Prisma auto-manages)
  - Fix nullable latitude/longitude type checks
  - Proper type narrowing for specialized access arrays
  - Fix itemId type in sync closures
  - Fix generic type indexing in offline utilities
  - Fix Set iteration target compatibility
  - Fix always-truthy expression checks in financials
  - Add explicit type annotations for formData state
  - Use proper RoleDataAccess type in settings page
- Fix Zod schema merging for dateRange fields
  - Split dateRangeSchema into dateRangeBaseSchema to enable merge compatibility
  - Fix all dateRangeSchema merges to use base schema

#### Prisma & Database
- Fix all Prisma Json field reads and writes
  - Remove incorrect JSON.parse() calls (fields already parsed by Prisma)
  - Remove JSON.stringify() calls (pass objects directly)
  - Apply consistent pattern across 20+ API routes and components
  - Files affected: daily-logs, documents, safety forms, subcontractors, reports, integrations, audit logs, and more

#### API Routes
- Add force-dynamic export to all API routes using getServerSession
  - Required for proper session handling in Next.js App Router
- Add force-dynamic to geocode API route
- Add postinstall script to ensure Prisma generates on Vercel deployment

#### Data Mapping
- Fix weather data mapping to match OpenWeather API response format
  - API returns temperature/condition fields, interface expects temp/conditions
- Fix ProjectFile interface to match Prisma File model
  - Use type field instead of fileType
  - Remove incorrect size field
- Fix metadata type casting for Prisma Json fields
- Fix user selector to handle API response format (array vs wrapped object)
- Fix case-insensitive label lookups in daily logs POST handler

#### UI Components
- Add 'use client' directive to offline page with onClick handlers

### Deprecated

None in this release.

### Removed

None in this release.

### Security

- **Critical**: Upgrade Next.js to 14.2.35 to fix CVE-2025-55182 (React2Shell)
  - Remote Code Execution vulnerability in React Server Components
  - CVSS Score: 10.0 (Actively exploited)
  - Upgrade both next and eslint-config-next packages

### Dependencies

- Upgrade `next` from 14.2.21 to 14.2.35 (security fix)
- Upgrade `eslint-config-next` from 14.2.21 to 14.2.35 (security fix)

---

## Version History

- **0.4.0** (2025-12-22) - Google Maps integration, mobile experience improvements, and UI enhancements
- **0.3.0** (2025-12-21) - Document OCR and OpenAI Vision API integration
- **0.2.0** (2025-12-21) - Major feature release with access control and integrations
- **0.1.0** (Initial Release) - Foundation of ConstructionPro platform
