# Android Design System Guide

## Overview

ConstructionPro Android uses a design system that matches the iOS app for visual consistency. The system is built on three foundation layers:

1. **AppColors** - Semantic color tokens with dark mode support
2. **AppTypography** - Text styles matching iOS naming
3. **AppSpacing** - 4dp grid spacing system

## Design Tokens

### Colors (`AppColors.kt`)

```kotlin
// Primary brand colors
AppColors.primary50    // Lightest
AppColors.primary100   // Light backgrounds
AppColors.primary600   // Primary brand color
AppColors.primary900   // Darkest

// Semantic colors
AppColors.success      // Green - success states
AppColors.warning      // Yellow - warnings
AppColors.error        // Red - errors
AppColors.info         // Blue - informational

// Adaptive colors (auto dark mode)
AppColors.textPrimary      // Main text
AppColors.textSecondary    // Secondary text
AppColors.textMuted        // Muted/disabled text
AppColors.cardBackground   // Card surfaces
AppColors.background       // Screen background
AppColors.divider          // Dividers/borders

// Status colors
StatusColors.forStatus("ACTIVE")              // Get foreground color
StatusColors.backgroundForStatus("ACTIVE")    // Get background color
```

### Typography (`AppTypography.kt`)

```kotlin
// Headings
AppTypography.heading1   // 28sp Bold - Page titles
AppTypography.heading2   // 22sp Bold - Section titles
AppTypography.heading3   // 18sp SemiBold - Card titles

// Body text
AppTypography.bodyLarge  // 18sp - Large body
AppTypography.body       // 16sp - Default body
AppTypography.bodyMedium // 16sp Medium weight
AppTypography.bodySemibold // 16sp SemiBold

// Secondary/small text
AppTypography.secondary      // 14sp - Secondary info
AppTypography.secondaryMedium // 14sp Medium
AppTypography.caption        // 12sp - Small text
AppTypography.captionMedium  // 12sp Medium

// Buttons
AppTypography.button       // 16sp SemiBold
AppTypography.buttonLarge  // 18sp SemiBold
AppTypography.buttonSmall  // 14sp SemiBold

// Stats/numbers
AppTypography.statLarge   // 32sp Bold
AppTypography.statMedium  // 24sp Bold
AppTypography.statSmall   // 20sp SemiBold
```

### Spacing (`AppSpacing.kt`)

```kotlin
// Base spacing (4dp grid)
AppSpacing.xxs   // 4dp
AppSpacing.xs    // 8dp
AppSpacing.sm    // 12dp
AppSpacing.md    // 16dp
AppSpacing.lg    // 20dp
AppSpacing.xl    // 24dp
AppSpacing.xxl   // 32dp
AppSpacing.xxxl  // 48dp

// Component sizes
AppSpacing.buttonHeight       // 48dp
AppSpacing.buttonHeightLarge  // 56dp
AppSpacing.inputHeight        // 48dp
AppSpacing.minTouchTarget     // 48dp (Android minimum)
AppSpacing.touchTargetLarge   // 56dp (field worker friendly)

// Border radius
AppSpacing.radiusSmall   // 8dp
AppSpacing.radiusMedium  // 10dp
AppSpacing.radiusLarge   // 12dp
AppSpacing.cardRadius    // 12dp

// Icon sizes
AppSpacing.iconSmall   // 16dp
AppSpacing.iconMedium  // 20dp
AppSpacing.iconLarge   // 24dp

// Screen layout
AppSpacing.screenPadding    // 16dp
AppSpacing.sectionSpacing   // 24dp
AppSpacing.itemSpacing      // 12dp
```

## Core Components

### Design System Components (`DesignSystemComponents.kt`)

```kotlin
// Icon in colored circle
IconCircle(
    icon = Icons.Default.Folder,
    size = IconCircleSize.Medium,
    backgroundColor = AppColors.primary100,
    iconColor = AppColors.primary600
)

// Card container
AppCard(onClick = { }) {
    Text("Content")
}

// Stat display card
StatCard(
    label = "Active Projects",
    value = "12",
    icon = Icons.Default.Folder
)

// Compact stat card
CompactStatCard(
    label = "Logs",
    value = "45",
    icon = Icons.Default.EditNote
)

// Action card with button
ActionCard(
    title = "Add Daily Log",
    description = "Record today's progress",
    icon = Icons.Default.NoteAdd,
    actionText = "Create",
    onAction = { }
)

// Buttons
PrimaryButton(text = "Submit", onClick = { })
SecondaryButton(text = "Cancel", onClick = { })
DestructiveButton(text = "Delete", onClick = { })

// Status badge
StatusBadge(status = "ACTIVE")

// List item
ListItemCard(
    title = "Project Name",
    subtitle = "123 Main St",
    icon = Icons.Default.Folder,
    onClick = { }
)

// Section header
SectionHeader(
    title = "Recent Projects",
    action = "See All",
    onAction = { }
)

// Info row
InfoRow(label = "Status", value = "Active")

// Alerts
AlertBanner(
    message = "Connection restored",
    type = BannerType.Success
)

// Empty state
EmptyState(
    icon = Icons.Default.FolderOff,
    title = "No Projects",
    description = "Create your first project",
    actionText = "Add Project",
    onAction = { }
)

// Loading
LoadingIndicator(message = "Loading projects...")
```

### Form Components (`FormComponents.kt`)

```kotlin
// Text input
AppTextField(
    value = text,
    onValueChange = { text = it },
    label = "Project Name",
    placeholder = "Enter name",
    isError = hasError,
    errorMessage = "Name is required"
)

// Password input
PasswordTextField(
    value = password,
    onValueChange = { password = it },
    label = "Password"
)

// Search bar
SearchField(
    query = searchQuery,
    onQueryChange = { searchQuery = it },
    placeholder = "Search projects..."
)

// Multiline text
TextArea(
    value = notes,
    onValueChange = { notes = it },
    label = "Notes",
    minLines = 3,
    maxCharacters = 500
)

// Selection chips
ChipRow(
    options = listOf("ALL", "ACTIVE", "COMPLETED"),
    selected = selectedStatus,
    onSelected = { selectedStatus = it }
)

// Dropdown
DropdownSelector(
    value = selectedProject,
    options = projectNames,
    onOptionSelected = { selectedProject = it },
    label = "Project"
)

// Checkbox
CheckboxRow(
    text = "Enable notifications",
    checked = notificationsEnabled,
    onCheckedChange = { notificationsEnabled = it }
)

// Switch
SwitchRow(
    text = "Dark Mode",
    checked = darkModeEnabled,
    onCheckedChange = { darkModeEnabled = it }
)

// Date picker button
DatePickerButton(
    value = selectedDate,
    onClick = { showDatePicker = true },
    label = "Start Date"
)
```

## Migration Guide

### Migrating from MaterialTheme to AppColors

```kotlin
// Before
Text(
    text = "Title",
    color = MaterialTheme.colorScheme.onSurface
)

// After
Text(
    text = "Title",
    color = AppColors.textPrimary
)
```

### Migrating from MaterialTheme.typography to AppTypography

```kotlin
// Before
Text(
    text = "Title",
    style = MaterialTheme.typography.titleMedium,
    fontWeight = FontWeight.SemiBold
)

// After
Text(
    text = "Title",
    style = AppTypography.heading3
)
```

### Migrating hardcoded dp to AppSpacing

```kotlin
// Before
Modifier.padding(16.dp)
Spacer(modifier = Modifier.height(24.dp))

// After
Modifier.padding(AppSpacing.md)
Spacer(modifier = Modifier.height(AppSpacing.xl))
```

### Migrating CPButton to PrimaryButton

```kotlin
// Before
CPButton(
    text = "Submit",
    onClick = { },
    style = CPButtonStyle.Primary,
    size = CPButtonSize.Medium
)

// After
PrimaryButton(
    text = "Submit",
    onClick = { },
    size = ButtonSize.Medium
)
```

## Best Practices

### 1. Touch Targets
Always use 48dp minimum, prefer 56dp for field workers:
```kotlin
Modifier.defaultMinSize(minHeight = AppSpacing.minTouchTarget)
// Or for field worker screens:
Modifier.defaultMinSize(minHeight = AppSpacing.touchTargetLarge)
```

### 2. Dark Mode Support
Use adaptive colors that auto-switch:
```kotlin
// Good - adapts to theme
AppColors.textPrimary
AppColors.cardBackground

// Avoid - hardcoded light mode colors
Color(0xFF111827)
```

### 3. Consistent Spacing
Use the 4dp grid:
```kotlin
// Good - consistent
Modifier.padding(AppSpacing.md)

// Avoid - arbitrary values
Modifier.padding(17.dp)
```

### 4. Typography Hierarchy
Match text styles to their purpose:
```kotlin
AppTypography.heading1    // Page titles only
AppTypography.heading2    // Section titles
AppTypography.heading3    // Card/item titles
AppTypography.body        // Regular content
AppTypography.secondary   // Supporting text
AppTypography.caption     // Small labels
```

### 5. Status Colors
Use StatusColors for consistent status styling:
```kotlin
val color = StatusColors.forStatus(project.status)
val bgColor = StatusColors.backgroundForStatus(project.status)
```

## File Locations

```
app/src/main/java/com/constructionpro/app/ui/
├── theme/
│   ├── AppColors.kt         # Semantic colors
│   ├── AppTypography.kt     # Text styles
│   ├── AppSpacing.kt        # Spacing/sizing
│   ├── Color.kt             # Raw color values
│   └── Theme.kt             # Material theme
└── components/
    ├── Components.kt              # Original components (CPButton, etc.)
    ├── DesignSystemComponents.kt  # New design system components
    └── FormComponents.kt          # Form/input components
```
