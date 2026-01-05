# ConstructionPro - Monorepo

  ## Project Structure

  ConstructionPro/
  ├── apps/
  │   ├── web/          # Next.js 14 web app + API backend
  │   ├── android/      # Kotlin/Jetpack Compose Android app
  │   └── ios/          # Swift/SwiftUI iOS app
  └── docs/             # Shared documentation

  ## Tech Stack

  | Platform | Stack |
  |----------|-------|
  | **Web + API** | Next.js 14, Prisma, PostgreSQL (Supabase), TypeScript |
  | **Android** | Kotlin, Jetpack Compose, Retrofit, Room, WorkManager |
  | **iOS** | Swift 5.9, SwiftUI, async/await, Combine |
  | **Database** | Supabase (PostgreSQL) |
  | **Auth** | Supabase Auth (JWT tokens) |
  | **Deployment** | Vercel (web), App Store (iOS), Play Store (Android) |

  ## Cross-Platform Considerations

  - All mobile apps use the same API endpoints in `apps/web/src/app/api/`
  - API changes must be reflected in both mobile apps
  - Shared models should stay consistent across platforms

  ## Proactive Agent Usage

  **Use agents automatically when the situation fits.**

  ### Web/API Agents

  | Trigger | Agent | Why |
  |---------|-------|-----|
  | After modifying API routes | `next-app-router-validator` | Catch missing force-dynamic |
  | After modifying Prisma queries | `prisma-postgres-checker` | Ensure PostgreSQL compatibility |
  | After integrating external APIs | `api-field-mapper` | Verify response shapes match |
  | After implementing features | `error-handler` | Ensure proper error handling |

  ### Android Agents

  | Trigger | Agent | Why |
  |---------|-------|-----|
  | After modifying ApiService | `retrofit-api-mapper` | Verify Android API matches backend |
  | After modifying Room/Workers | `android-offline-sync-validator` | Validate offline sync patterns |
  | When building field worker screens | `android-field-worker-ui` | Ensure 56dp+ touch targets |
  | After creating Compose screens | `android-compose-reviewer` | Catch recomposition issues |

  ### iOS Agents

  | Trigger | Agent | Why |
  |---------|-------|-----|
  | When building iOS features | `swift-expert` | SwiftUI, async/await patterns |
  | When building mobile UI | `mobile-developer` | Cross-platform mobile expertise |
  | When building field worker screens | `construction-ui` | Simple, tap-friendly interfaces |

  ### Cross-Platform Agents

  | Trigger | Agent | Why |
  |---------|-------|-----|
  | After adding new API endpoints | `cross-platform-parity` | Ensure iOS and Android implement same endpoints |
  | After modifying auth code | `security-token-auditor` | Verify secure token storage |
  | After modifying sync/offline code | `offline-sync-validator` | Ensure data integrity across platforms |

  ### Universal Agents

  | Trigger | Agent | Why |
  |---------|-------|-----|
  | Before releases | `changelog-writer` | Generate changelog from commits |
  | After adding features | `readme-updater` | Keep docs in sync |
  | When handling user input/auth | `security-auditor` | Check for vulnerabilities |
  | When app feels slow | `performance-reviewer` | Find optimization opportunities |

  ## Agent Definitions

  ### cross-platform-parity

  **Purpose**: Ensure iOS and Android implement the same API endpoints consistently.

  **What it checks**:
  - All API routes have corresponding mobile service methods
  - Request/response types match across iOS, Android, and Web
  - Missing implementations are flagged
  - Endpoint naming is consistent (camelCase vs snake_case handling)
  - Feature flags are synced across platforms

  ### security-token-auditor

  **Purpose**: Catch security issues in authentication code.

  **What it checks**:
  - iOS: Tokens stored in Keychain (NOT UserDefaults)
  - Android: Tokens in EncryptedSharedPreferences (NOT SharedPreferences)
  - No hardcoded credentials or API keys
  - Proper token refresh logic with expiry handling
  - Secure token transmission (HTTPS only)

  ### offline-sync-validator

  **Purpose**: Validate offline data integrity and sync patterns.

  **What it checks**:
  - Room/CoreData entities match API response structure
  - Conflict detection exists for sync operations
  - Exponential backoff for retry logic
  - Local IDs swapped with server IDs after sync
  - Sync status indicators in UI
