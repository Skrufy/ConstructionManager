# ConstructionPro - iOS App

  ## Tech Stack

  - **Language**: Swift 5.9+
  - **UI**: SwiftUI
  - **Concurrency**: async/await, Combine
  - **Architecture**: MVVM
  - **Networking**: URLSession with async/await
  - **Storage**: UserDefaults, FileManager for caching
  - **Auth**: Supabase (Bearer token)

  ## API Backend

  The backend API is in `../web/src/app/api/`. Always check endpoint contracts there.

  ## Common Patterns

  1. **Async networking** - Use `async/await` for API calls
  2. **State management** - `@State`, `@StateObject`, `@ObservedObject`
  3. **Error handling** - Use `Result` type or throwing functions
  4. **Offline support** - Cache responses, queue actions for retry
  5. **Touch targets** - Minimum 44pt, prefer 56pt+ for field workers

  ## Proactive Agents

  **Run these agents automatically - don't wait to be asked.**

  | Trigger | Agent |
  |---------|-------|
  | When building iOS features | `swift-expert` |
  | When building mobile UI | `mobile-developer` |
  | When building field worker screens | `construction-ui` |
  | After implementing features | `error-handler` |
  | After significant code changes | `quality-control-enforcer` |
  | After modifying models or CodingKeys | `ios-codable-validator` |
  | After modifying auth/token code | `security-token-auditor` |
  | After modifying sync/offline code | `offline-sync-validator` |

  ## Agent Definitions

  ### swift-expert

  **Purpose**: Expert Swift developer specializing in Swift 5.9+ with async/await, SwiftUI, and protocol-oriented programming.

  **Focus areas**:
  - Modern Swift concurrency (async/await, actors, TaskGroups)
  - SwiftUI best practices and performance
  - Protocol-oriented design patterns
  - Apple platform conventions
  - Memory management and safety

  ### construction-ui

  **Purpose**: Design simple, tap-friendly interfaces for construction workers.

  **What it checks**:
  - Touch targets are 56pt+ (gloved hands)
  - High contrast for outdoor visibility
  - Minimal text input (use pickers, toggles)
  - Large, obvious action buttons
  - Clear offline state indication
  - Bottom-aligned primary actions (thumb reach)

  ### mobile-developer

  **Purpose**: Cross-platform mobile specialist.

  **Focus areas**:
  - Platform-specific excellence
  - Battery efficiency
  - Offline-first architecture
  - Native performance optimization

  ### ios-codable-validator

  **Purpose**: Catch CodingKeys mismatches before they hit production.

  **What it checks**:
  - All model properties have matching CodingKeys for snake_case API fields
  - Optional types match nullability from API responses
  - Date fields use proper decoding strategies (ISO8601)
  - Nested objects have appropriate CodingKeys
  - Compare iOS models against API route response shapes

  ### security-token-auditor

  **Purpose**: Catch security issues in authentication code.

  **What it checks**:
  - JWT tokens stored in Keychain (NOT UserDefaults)
  - No tokens in logs or error messages
  - Proper token refresh before expiry
  - Secure URLSession configuration

  ### offline-sync-validator

  **Purpose**: Validate offline data integrity and sync patterns.

  **What it checks**:
  - Offline cache matches API response structure
  - Conflict detection for sync operations
  - Retry logic with exponential backoff
  - Local IDs replaced with server IDs after sync
  - Clear sync status indicators in UI
