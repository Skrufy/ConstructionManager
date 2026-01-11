# Changelog

All notable changes to ConstructionPro will be documented in this file.

## [v1.0.0] - 2026-01-10

### Added

#### iOS Features
- In-app document viewer with offline caching and prev/next navigation
- UserService for centralized user management operations
- Standardized jobsite filter styling across all views
- Drawings search filter functionality
- Redesigned permission template creation screen with cleaner UI
- Debug logging for permission template creation with better error messages

#### Android Features
- In-app document viewer with PDF, image, and video support
- Permissions management system with cross-platform improvements

#### API & Backend
- File size tracking for documents
- FileBlasterAssignment model and isBlaster field to Prisma schema
- Support for blasting documents and company-wide uploads
- GraphQL and CSV feature dependencies
- CORS middleware for same-origin requests
- Hashtag search with prefix matching and wildcard support

#### Infrastructure
- Web app integration into monorepo structure
- Vercel configuration for monorepo deployment
- Production API configuration for iOS app

### Changed

#### iOS Improvements
- Settings Users and Permissions tabs now have improved interactions
- Removed Roles & Permissions from Admin menu (consolidated into Settings)
- Updated User model to handle nested companyTemplateName from API
- Changed UserPermissions and PermissionTemplate to Decodable for better performance
- Improved search API to return iOS-compatible format

#### API Improvements
- Updated daily log API with snake_case fixes
- Simplified documents API transform for better reliability
- Enhanced null safety in documents API transform
- Added type assertions for Prisma search mode in documents API

### Fixed

#### iOS Bug Fixes
- Fixed SearchView layout overlap with navigation bar
- Fixed search UI filter indicator bugs
- Fixed permission template assignment causing blank page
- Fixed API field mapping issues for permissions
- Fixed handling of mixed types in granularPermissions field
- Fixed permission template decoding by removing conflicting CodingKeys
- Fixed localization and role selection in User Details sheet
- Fixed company settings loading and saving
- Resolved API decoding errors for documents and projects
- Fixed safe accessors for optional Document properties
- Fixed handling of optional uploadedBy and uploadedAt fields
- Fixed tags display in document detail view
- Added missing Document parameters in toDocument() functions
- Added custom decoder to Project model for handling missing API fields
- Made APIProject createdAt/updatedAt optional with custom decoder
- Fixed unwrapping of optional createdAt/updatedAt in ProjectsRepository
- Added drawingCount and crewCount to project models
- Resolved compilation errors in UserService, SafetyView, and SettingsView
- Added missing blasterAssignments support to APIDocument model
- Added missing companyTemplateName field to User initialization
- Added missing isBlaster parameter to iOS User initialization

#### API & Backend Bug Fixes
- Fixed documents API 500 error through improved error handling
- Fixed Vercel redeploy issues with debug logging
- Added CodingKeys to DocumentAPIModel for snake_case mapping
- Removed conflicting CodingKeys where decoder already handles snake_case
- Fixed cross-platform security, API, and build improvements
- Resolved dark mode UI issues and document upload errors

#### Infrastructure Fixes
- Updated Vercel configuration with Root Directory requirement
- Added missing npm dependencies for new features
- Updated web submodule with all latest fixes

### Security
- Cross-platform security improvements for token handling and data protection
- Enhanced CORS middleware configuration

---

## Statistics

**Period:** January 5-10, 2026
**Total Commits:** 64
**Files Changed:** 1,726
**Lines Added:** 823,246
**Lines Deleted:** 1,677
**Contributors:** Steven Taylor

### Breakdown by Category
- New Features: 12
- Bug Fixes: 45
- Improvements: 7

### Platform Distribution
- iOS: ~50% of changes
- API/Backend: ~30% of changes
- Android: ~15% of changes
- Infrastructure: ~5% of changes

---

## Version Recommendation

**Suggested Version: v1.0.0 (Major Release)**

This represents the initial major release of ConstructionPro with:
- Complete monorepo integration
- Full-featured iOS and Android apps
- Production-ready API backend
- Document management with in-app viewers
- Comprehensive permissions system
- Search functionality with filters
- Offline support and caching
