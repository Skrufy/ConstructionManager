# ConstructionPro - Android App

  ## Tech Stack

  - **Language**: Kotlin 1.9.22
  - **UI**: Jetpack Compose with Material3
  - **Networking**: Retrofit 2.11.0 + OkHttp3 + Kotlinx Serialization
  - **Database**: Room 2.6.1
  - **Background**: WorkManager 2.9.0
  - **Navigation**: Jetpack Navigation Compose 2.7.7
  - **Preferences**: DataStore 1.1.0
  - **Auth**: Supabase (Bearer token via AuthTokenStore)

  ## API Backend

  The backend API is in `../web/src/app/api/`. Always check endpoint contracts there.

  ## Common Gotchas

  1. **State in Composables** - Use `remember { mutableStateOf() }` for UI state
  2. **API calls** - Always use `withContext(Dispatchers.IO)` for network/database
  3. **Room entities** - Must have `@PrimaryKey` and `@Entity` annotations
  4. **Nullable API fields** - Use `@SerialName` and make fields nullable when API might omit
  5. **Pending actions** - Always queue offline actions with complete payloads
  6. **Touch targets** - Minimum 48dp, prefer 56dp+ for field workers

  ## Proactive Agents

  **Run these agents automatically - don't wait to be asked.**

  | Trigger | Agent |
  |---------|-------|
  | After adding/modifying ApiService endpoints | `retrofit-api-mapper` |
  | After modifying Room entities, DAOs, Workers | `android-offline-sync-validator` |
  | When building screens for field workers | `android-field-worker-ui` |
  | After creating/modifying Compose screens | `android-compose-reviewer` |
  | After significant code changes | `quality-control-enforcer` |
  | After modifying coroutines/suspend functions | `android-coroutine-auditor` |
  | After modifying auth/token code | `security-token-auditor` |
  | After modifying sync/offline code | `offline-sync-validator` |

  ## Agent Definitions

  ### retrofit-api-mapper

  **Purpose**: Verify Android ApiService.kt endpoints match the web backend API routes.

  **What it checks**:
  - Compare Android endpoints against web API routes in `../web/src/app/api/`
  - Verify request/response model field names match exactly
  - Identify missing endpoints
  - Validate HTTP methods match
  - Check authentication requirements

  ### android-offline-sync-validator

  **Purpose**: Validate offline-first patterns, Room entities, and sync queue logic.

  **What it checks**:
  - Room entity fields match corresponding API model fields
  - PendingAction payloads contain all required data
  - Sync conflict resolution handles all edge cases
  - WorkManager constraints are appropriate
  - Cache invalidation happens after successful sync
  - Local IDs are swapped with server IDs after sync

  ### android-field-worker-ui

  **Purpose**: Ensure UI is optimized for construction site field workers.

  **What it checks**:
  - Touch targets are 56dp+ (gloved hands requirement)
  - Text contrast meets WCAG AA for outdoor visibility
  - Forms minimize typing (dropdowns over text input)
  - GPS/location capture is prominent
  - Photo capture buttons are large
  - Offline state is clearly indicated
  - Primary actions are at thumb-reach (bottom of screen)

  ### android-compose-reviewer

  **Purpose**: Catch Jetpack Compose anti-patterns and performance issues.

  **What it checks**:
  - Unstable parameters causing recomposition
  - Missing `remember` for expensive objects
  - API calls outside `LaunchedEffect`
  - Missing `contentDescription` on icons/images
  - Touch targets below 48dp

  ### android-coroutine-auditor

  **Purpose**: Catch threading issues that cause ANRs and crashes.

  **What it checks**:
  - No `runBlocking` in interceptors or callbacks (causes deadlocks)
  - Proper `Dispatchers.IO` for network/disk operations
  - Error handling in all coroutine `launch` blocks
  - No blocking calls on Main dispatcher
  - Proper scope cancellation on lifecycle events

  ### security-token-auditor

  **Purpose**: Catch security issues in authentication code.

  **What it checks**:
  - Tokens in EncryptedSharedPreferences (NOT regular SharedPreferences)
  - No tokens in logs or error messages
  - Proper token refresh before expiry
  - Secure OkHttp configuration (certificate pinning)

  ### offline-sync-validator

  **Purpose**: Validate offline data integrity and sync patterns.

  **What it checks**:
  - Room entities match API response structure
  - Conflict detection for sync operations
  - Exponential backoff for retry logic (not immediate retry)
  - Local IDs replaced with server IDs after sync
  - WorkManager constraints are appropriate
  - Clear sync status indicators in UI
