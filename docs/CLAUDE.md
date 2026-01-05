# ConstructionPro - Claude Instructions

## Project Overview
ConstructionPro is a construction project management platform built with Next.js 14, Prisma, PostgreSQL (Supabase), and TypeScript. Deployed on Vercel.

## Proactive Agent Usage

**Use agents automatically when the situation fits - don't wait to be asked.**

### When to Use Each Agent:

| Trigger | Agent | Why |
|---------|-------|-----|
| After writing/modifying API routes | `next-app-router-validator` | Catch missing force-dynamic before deployment |
| After creating pages with interactivity | `next-app-router-validator` | Catch missing 'use client' directives |
| Before any Vercel deployment | `next-app-router-validator` | Prevent build failures |
| After modifying Prisma queries | `prisma-postgres-checker` | Ensure PostgreSQL compatibility |
| When search/filter features are touched | `prisma-postgres-checker` | Verify case-insensitive search |
| After integrating external APIs | `api-field-mapper` | Verify response shapes match interfaces |
| When data isn't displaying correctly | `api-field-mapper` | Find field name mismatches |
| After implementing new features | `error-handler` | Ensure proper error handling |
| After writing significant code | `quality-control-enforcer` | Validate implementation quality |
| When building UI components | `construction-ui` | Follow mobile-first, field-worker-friendly patterns |
| When implementing workflows | `construction-workflow` | Validate business logic and approval flows |
| Before releases | `changelog-writer` | Generate changelog from commits |
| After adding features | `readme-updater` | Keep documentation in sync |
| When handling user input/auth | `security-auditor` | Check for vulnerabilities |
| After new features | `test-scaffolder` | Generate test coverage |
| When app feels slow | `performance-reviewer` | Find optimization opportunities |
| When building iOS/macOS apps | `swift-expert` | SwiftUI, async/await, protocol-oriented design |
| When building cross-platform mobile apps | `mobile-developer` | React Native, Flutter, native performance optimization |

### Android-Specific Agents:

| Trigger | Agent | Why |
|---------|-------|-----|
| After adding/modifying ApiService endpoints | `retrofit-api-mapper` | Verify Android API matches web backend, find missing endpoints |
| After modifying Room entities, DAOs, or Workers | `android-offline-sync-validator` | Validate offline sync patterns, entity relationships, conflict resolution |
| When building screens for field workers | `android-field-worker-ui` | Ensure 56dp+ touch targets, outdoor visibility, glove-friendly UI |
| After creating/modifying Compose screens | `android-compose-reviewer` | Catch recomposition issues, accessibility problems, state management |

### Agent Usage Guidelines:

1. **Be proactive** - Run relevant agents after completing work, not just when asked
2. **Run in parallel** - When multiple agents are relevant, run them simultaneously
3. **Trust agent output** - Act on agent recommendations
4. **Combine agents** - A new API route might need both `next-app-router-validator` AND `error-handler`

## Tech Stack Quick Reference

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL via Prisma ORM (Supabase)
- **Auth**: NextAuth.js with credentials provider
- **Styling**: Tailwind CSS
- **Validation**: Zod
- **Deployment**: Vercel

## Common Gotchas (Learned from Experience)

1. **All API routes using `getServerSession`** must have `export const dynamic = 'force-dynamic'`
2. **All string searches in Prisma** must use `mode: 'insensitive'` for PostgreSQL
3. **Pages with onClick/useState** must have `'use client'` directive
4. **Zod schemas with `.refine()`** become ZodEffects and can't use `.merge()` - use base schemas
5. **API response field names** must match interface field names exactly

## Android Tech Stack

- **Language**: Kotlin 1.9.22
- **UI**: Jetpack Compose with Material3
- **Networking**: Retrofit 2.11.0 + OkHttp3 + Kotlinx Serialization
- **Database**: Room 2.6.1
- **Background**: WorkManager 2.9.0
- **Navigation**: Jetpack Navigation Compose 2.7.7
- **Preferences**: DataStore 1.1.0
- **Auth**: Supabase (Bearer token via AuthTokenStore)

## Android Common Gotchas

1. **State in Composables** - Use `remember { mutableStateOf() }` for UI state, not plain variables
2. **API calls** - Always use `withContext(Dispatchers.IO)` for network/database operations
3. **Room entities** - Must have `@PrimaryKey` and `@Entity` annotations
4. **Nullable API fields** - Use `@SerialName` and make fields nullable when API might omit them
5. **Pending actions** - Always queue offline actions with complete payloads for later sync
6. **Touch targets** - Minimum 48dp, prefer 56dp+ for field worker screens

---

## Agent Definitions

### retrofit-api-mapper

**Purpose**: Verify Android ApiService.kt endpoints match the web backend API routes.

**When to use**: After adding or modifying endpoints in `ApiService.kt`

**What it checks**:
1. Compare Android endpoints against web API routes in `src/app/api/`
2. Verify request/response model field names match exactly (check `@SerialName` annotations)
3. Identify missing endpoints that exist in web but not Android
4. Validate HTTP methods (GET/POST/PUT/PATCH/DELETE) match
5. Check query parameters and path variables are correct
6. Verify authentication requirements match (Bearer token)

**Files to examine**:
- Android: `construction-android/app/src/main/java/com/constructionpro/app/data/ApiService.kt`
- Android: `construction-android/app/src/main/java/com/constructionpro/app/data/model/*.kt`
- Web: `construction-platform/src/app/api/**/route.ts`

**Output**: List of mismatches, missing endpoints, and field name discrepancies with specific line numbers.

---

### android-offline-sync-validator

**Purpose**: Validate offline-first patterns, Room entities, and sync queue logic.

**When to use**: After modifying Room entities, DAOs, PendingAction payloads, or WorkManager workers.

**What it checks**:
1. Room entity fields match corresponding API model fields
2. PendingAction payloads contain all required data for API calls
3. Sync conflict resolution handles all edge cases (server wins, client wins, merge)
4. WorkManager constraints are appropriate (network required, battery not low)
5. Cache invalidation happens after successful sync
6. Local IDs (prefix `local_`) are swapped with server IDs after sync
7. Retry logic has proper backoff and max attempts

**Files to examine**:
- `construction-android/app/src/main/java/com/constructionpro/app/data/local/*.kt`
- `construction-android/app/src/main/java/com/constructionpro/app/data/local/workers/*.kt`
- `construction-android/app/src/main/java/com/constructionpro/app/data/model/*.kt`

**Output**: List of sync issues, missing entity fields, incomplete payloads, and conflict scenarios not handled.

---

### android-field-worker-ui

**Purpose**: Ensure UI is optimized for construction site field workers.

**When to use**: When building or modifying screens used by field workers (DailyLogs, Projects, Equipment, etc.)

**What it checks**:
1. Touch targets are 56dp+ (gloved hands requirement)
2. Text contrast meets WCAG AA for outdoor visibility
3. Forms minimize typing (use dropdowns, pickers, toggles over text input)
4. GPS/location capture is prominent and easy to trigger
5. Photo capture buttons are large and obvious
6. Offline state is clearly indicated (banner, icons)
7. Loading states don't block critical actions
8. Error messages are actionable, not technical jargon
9. Primary actions are at thumb-reach (bottom of screen)
10. Confirmation dialogs have large, distinct buttons

**Design patterns to enforce**:
- Large FABs for primary actions
- Bottom sheets over dialogs for forms
- Swipe-to-refresh for lists
- Pull-up panels for details
- High contrast colors (Primary600 on white, white on Primary600)

**Output**: List of UI violations with specific composable names and recommended fixes.

---

### android-compose-reviewer

**Purpose**: Catch Jetpack Compose anti-patterns and performance issues.

**When to use**: After creating or modifying Compose screens or components.

**What it checks**:
1. **Recomposition issues**:
   - Unstable parameters (List, Map without `@Stable` or `@Immutable`)
   - Lambda allocations in composition (should use `remember`)
   - Missing `key` in `LazyColumn`/`LazyRow` items
2. **State management**:
   - Missing `remember` for expensive objects
   - State not hoisted properly (should lift to caller)
   - `mutableStateOf` without `remember`
3. **Side effects**:
   - API calls outside `LaunchedEffect`
   - Missing `DisposableEffect` for cleanup
   - Incorrect `LaunchedEffect` keys
4. **Accessibility**:
   - Missing `contentDescription` on icons/images
   - Touch targets below 48dp
   - Missing semantics for screen readers
5. **Performance**:
   - Heavy computation in composition (should use `derivedStateOf` or move outside)
   - Unnecessary recomposition scope (should use `Modifier.composed` sparingly)
6. **Navigation**:
   - Null checks on route arguments
   - Proper back stack handling

**Output**: List of issues with composable names, line numbers, and code fixes.
