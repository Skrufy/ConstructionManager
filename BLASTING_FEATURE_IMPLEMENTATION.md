# Blasting Documents Feature - Implementation Status

## ✅ Completed (Backend)

### 1. Database Schema Updates (`apps/web/prisma/schema.prisma`)
- ✅ Added `isBlaster` Boolean field to User model (default: false)
- ✅ Created `FileBlasterAssignment` junction table for many-to-many relationships
- ✅ Added `blasterAssignments` relation to User model
- ✅ Added `blasterAssignments` relation to File model
- ✅ Updated File category comment to include BLASTING

### 2. Database Migration (`apps/web/prisma/migrations/add_blasting_feature.sql`)
- ✅ Created migration file with:
  - ALTER TABLE to add `isBlaster` column
  - CREATE TABLE for `file_blaster_assignments`
  - Unique constraint on `(fileId, blasterId)`
  - Indexes on `fileId` and `blasterId`
  - Foreign key constraints with CASCADE delete

**TO RUN MIGRATION:**
```bash
cd apps/web
# Connect to your Supabase database and run:
psql $DATABASE_URL < prisma/migrations/add_blasting_feature.sql
# Then regenerate Prisma client:
npx prisma generate
```

### 3. API Endpoints

#### Documents API (`apps/web/src/app/api/documents/route.ts`)
- ✅ GET /api/documents
  - Accepts `blasterIds` query parameter (comma-separated)
  - Implements visibility rules:
    - ADMIN: sees all documents
    - Blasters: see all non-BLASTING docs + BLASTING docs they're assigned to
    - Others: cannot see BLASTING docs at all
  - Returns `blasters` array with assigned blaster info
  - Includes `blasterAssignments` in response

- ✅ POST /api/documents
  - Accepts `blasterIds` array in request body
  - Validates blaster IDs (must be active users with `isBlaster = true`)
  - Creates blaster assignments when document is created
  - Returns `blasters` array in response

#### Blasters List API (`apps/web/src/app/api/users/blasters/route.ts`)
- ✅ GET /api/users/blasters
  - Returns all active users where `isBlaster = true`
  - Sorted by name
  - Returns: id, name, email, phone, role

---

## 🔧 TODO: User Management API

You need to update the user update endpoint to support the `isBlaster` field.

**Location:** Find or create `/api/admin/users/[id]/route.ts` or `/api/users/[id]/route.ts`

**Changes needed:**
```typescript
// In PATCH handler
const { name, email, role, status, phone, isBlaster } = await request.json()

const updateData: any = {}
if (name !== undefined) updateData.name = name
if (email !== undefined) updateData.email = email
if (role !== undefined) updateData.role = role
if (status !== undefined) updateData.status = status
if (phone !== undefined) updateData.phone = phone
if (isBlaster !== undefined) updateData.isBlaster = isBlaster // ADD THIS

const updatedUser = await prisma.user.update({
  where: { id: params.id },
  data: updateData,
  select: {
    id: true,
    name: true,
    email: true,
    role: true,
    status: true,
    phone: true,
    isBlaster: true, // ADD THIS
    createdAt: true
  }
})
```

---

## 📱 TODO: Web Frontend (Next.js/React)

### 1. Documents Page (`apps/web/src/app/(dashboard)/documents/page.tsx`)

#### Add State:
```typescript
const [blasters, setBlasters] = useState<Array<{ id: string; name: string; email: string }>>([])
const [selectedBlasterIds, setSelectedBlasterIds] = useState<string[]>([])
```

#### Fetch Blasters:
```typescript
useEffect(() => {
  fetch('/api/users/blasters')
    .then(res => res.json())
    .then(data => setBlasters(data))
    .catch(error => console.error('Error fetching blasters:', error))
}, [])
```

#### Update Categories:
```typescript
const CATEGORIES = [
  // ... existing categories
  { value: 'BLASTING', label: 'Blasting', count: 0 }, // ADD THIS
  { value: 'OTHER', label: 'Other', count: 0 }
]
```

#### Update Fetch Parameters:
```typescript
const params = new URLSearchParams()
if (filterProject) params.set('projectId', filterProject)
if (filterCategory) params.set('category', filterCategory)
if (searchQuery) params.set('search', searchQuery)
if (selectedBlasterIds.length > 0) {
  params.set('blasterIds', selectedBlasterIds.join(','))
}
```

#### Add Multi-Select Blaster Dropdown:
```typescript
{filterCategory === 'BLASTING' && (
  <div className="flex items-center gap-3">
    <Label className="text-sm font-medium flex items-center gap-2">
      <HardHat className="w-4 h-4" />
      Blasters:
    </Label>
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[300px] justify-between">
          {selectedBlasterIds.length === 0
            ? "All Blasters"
            : `${selectedBlasterIds.length} selected`}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search blasters..." />
          <CommandEmpty>No blasters found.</CommandEmpty>
          <CommandGroup>
            <CommandItem onSelect={() => setSelectedBlasterIds([])}>
              <Checkbox checked={selectedBlasterIds.length === 0} />
              <span className="ml-2">All Blasters</span>
            </CommandItem>
            {blasters.map(blaster => (
              <CommandItem
                key={blaster.id}
                onSelect={() => {
                  setSelectedBlasterIds(prev =>
                    prev.includes(blaster.id)
                      ? prev.filter(id => id !== blaster.id)
                      : [...prev, blaster.id]
                  )
                }}
              >
                <Checkbox checked={selectedBlasterIds.includes(blaster.id)} />
                <span className="ml-2">{blaster.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  </div>
)}
```

### 2. Users Admin Page (`apps/web/src/app/(dashboard)/admin/users/page.tsx`)

#### Add to User Interface:
```typescript
interface User {
  // ... existing fields
  isBlaster?: boolean
}
```

#### Add Blaster Checkbox in Edit Modal:
```typescript
<div className="space-y-2">
  <label className="text-sm font-medium text-gray-700">
    Special Certifications
  </label>
  <div className="flex items-start">
    <input
      type="checkbox"
      id="isBlaster"
      checked={editingUser?.isBlaster || false}
      onChange={(e) => setEditingUser({
        ...editingUser!,
        isBlaster: e.target.checked
      })}
      className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 mt-1"
    />
    <label htmlFor="isBlaster" className="ml-3">
      <div className="text-sm font-medium text-gray-700">
        Certified Blaster
      </div>
      <div className="text-xs text-gray-500">
        Can be assigned to blasting documents
      </div>
    </label>
  </div>
</div>
```

#### Update Save Handler:
```typescript
const response = await fetch(`/api/admin/users/${editingUser.id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: editingUser.name,
    email: editingUser.email,
    role: editingUser.role,
    status: editingUser.status,
    phone: editingUser.phone,
    isBlaster: editingUser.isBlaster // ADD THIS
  })
})
```

---

## 📱 TODO: Android App (Kotlin/Jetpack Compose)

### 1. Data Models (`apps/android/.../data/model/Document.kt`)

#### Update DocumentCategory:
```kotlin
@Serializable
enum class DocumentCategory {
    // ... existing categories
    @SerialName("BLASTING") BLASTING,
    @SerialName("OTHER") OTHER;

    fun getDisplayName(): String = when(this) {
        // ... existing cases
        BLASTING -> "Blasting"
        OTHER -> "Other"
    }
}
```

#### Update DocumentSummary:
```kotlin
@Serializable
data class DocumentSummary(
    val id: String,
    val name: String,
    // ... existing fields
    val blasters: List<DocumentUser> = emptyList(),  // ADD THIS
)

@Serializable
data class DocumentUser(
    val id: String,
    val name: String? = null,
    val email: String
)
```

#### Update User Models:
```kotlin
@Serializable
data class UserDetail(
    // ... existing fields
    val isBlaster: Boolean = false,  // ADD THIS
)

@Serializable
data class UserSummary(
    // ... existing fields
    val isBlaster: Boolean = false  // ADD THIS
)
```

### 2. API Service (`apps/android/.../data/ApiService.kt`)

```kotlin
@GET("users/blasters")
suspend fun getBlasters(): List<UserSummary>

@GET("documents")
suspend fun getDocuments(
    @Query("projectId") projectId: String? = null,
    @Query("category") category: String? = null,
    @Query("blasterIds") blasterIds: String? = null,  // ADD THIS
    @Query("search") search: String? = null,
    @Query("page") page: Int? = null,
    @Query("limit") limit: Int? = null
): DocumentsResponse

@Serializable
data class UpdateUserRequest(
    // ... existing fields
    val isBlaster: Boolean? = null  // ADD THIS
)
```

### 3. Documents Screen (`apps/android/.../ui/screens/DocumentsScreen.kt`)

See the detailed implementation in the Android section above (add blaster dropdown, multi-select, etc.)

---

## 📱 TODO: iOS App (Swift/SwiftUI)

### 1. Data Models (`apps/ios/.../Models/Document.swift`)

#### Update DocumentCategory:
```swift
enum DocumentCategory: String, Codable, CaseIterable {
    // ... existing cases
    case blasting = "BLASTING"
    case other = "OTHER"

    var displayName: String {
        // ... existing cases
        case .blasting: return "Blasting"
        case .other: return "Other"
    }

    var icon: String {
        // ... existing cases
        case .blasting: return "hammer.fill"
        case .other: return "doc"
    }
}
```

#### Update Document struct:
```swift
struct Document: Identifiable, Codable {
    // ... existing fields
    let blasters: [DocumentUser]?  // ADD THIS
}

struct DocumentUser: Codable, Identifiable {
    let id: String
    let name: String?
    let email: String
}
```

#### Update User model:
```swift
struct User: Identifiable, Codable {
    // ... existing fields
    let isBlaster: Bool  // ADD THIS
}
```

### 2. Services

See the detailed implementation in the iOS section above (DocumentService, AdminService updates)

### 3. Views

See the detailed implementation in the iOS section above (DocumentsView with multi-select, UserDetailView with toggle)

---

## 🧪 Testing Checklist

### Backend:
- [ ] Run migration successfully
- [ ] `/api/users/blasters` returns only active blasters
- [ ] `/api/documents` filters by `blasterIds` correctly
- [ ] `/api/documents` includes `blasters` array
- [ ] Visibility rules work: ADMIN sees all, blasters see their assignments, others don't see BLASTING docs
- [ ] Creating documents with `blasterIds` creates assignments

### Web:
- [ ] Blaster checkbox appears in user edit
- [ ] Checkbox value persists after save
- [ ] BLASTING category appears in filters
- [ ] Blaster dropdown appears when BLASTING selected
- [ ] Multi-select works correctly
- [ ] Filtering by blasters works

### Android:
- [ ] BLASTING category appears
- [ ] Blaster dropdown populates
- [ ] Multi-select works
- [ ] User management shows checkbox
- [ ] Checkbox persists

### iOS:
- [ ] BLASTING category appears
- [ ] Blaster picker populates
- [ ] Multi-select works
- [ ] User management shows toggle
- [ ] Toggle persists

---

## Next Steps

1. **Run the database migration** (see commands above)
2. **Find and update the user update API** to support `isBlaster`
3. **Update Web UI** (documents page and users page)
4. **Update Android** (models, API, UI)
5. **Update iOS** (models, services, views)
6. **Test thoroughly** across all platforms

## Questions Answered

✅ **Document Upload**: Manual selection of blasters (multi-select)
✅ **Auto-assignment**: No auto-assignment (manual only for now)
✅ **Visibility**: Only ADMIN + assigned blasters see BLASTING documents
✅ **Multiple Blasters**: Yes, many-to-many relationship supported
✅ **Bulk Assign**: Not needed for now
✅ **Role Restriction**: Only ADMIN role sees BLASTING docs (plus assigned blasters)

## File Paths Reference

| Component | Path |
|-----------|------|
| Prisma Schema | `apps/web/prisma/schema.prisma` |
| Migration SQL | `apps/web/prisma/migrations/add_blasting_feature.sql` |
| Documents API | `apps/web/src/app/api/documents/route.ts` |
| Blasters API | `apps/web/src/app/api/users/blasters/route.ts` |
| Web Documents Page | `apps/web/src/app/(dashboard)/documents/page.tsx` |
| Web Users Page | `apps/web/src/app/(dashboard)/admin/users/page.tsx` |
| Android Document Model | `apps/android/.../data/model/Document.kt` |
| Android API Service | `apps/android/.../data/ApiService.kt` |
| Android Documents Screen | `apps/android/.../ui/screens/DocumentsScreen.kt` |
| iOS Document Model | `apps/ios/.../Models/Document.swift` |
| iOS Document Service | `apps/ios/.../Services/DocumentService.swift` |
| iOS Documents View | `apps/ios/.../Views/Documents/DocumentsView.swift` |
