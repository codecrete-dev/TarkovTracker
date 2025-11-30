# App Structure Guide

This document explains the organization and separation of concerns between `app.vue`, layouts, shell components, and pages.

## Project Philosophy

**TarkovTracker prioritizes pragmatism over complexity:**

1. **Keep it flat** - Avoid deep nesting unless absolutely necessary
   - ✅ `/app/shell/AppBar.vue` (2 levels)
   - ❌ `/app/features/layout/components/AppBar.vue` (4 levels)
2. **Avoid over-abstraction** - Don't create layers "just in case"
   - ✅ Extract when you have actual duplication or complexity
   - ❌ Create wrappers and abstractions speculatively
3. **Minimize indirection** - Code should be easy to trace and find
   - ✅ Direct imports and clear paths
   - ❌ Multiple wrapper components with no clear purpose
     **Guiding question:** "Does this abstraction solve a real problem I have right now?"
     If the answer is "it might be useful someday" → **don't do it yet**.

## Overview

TarkovTracker follows a **clear hierarchy** to avoid over-abstraction while maintaining clean separation:

```
app.vue (Root wrapper)
  └─> layouts/default.vue (Page layout)
        └─> shell/* components (Header, nav, footer)
              └─> pages/* (Page content)
```

## File Responsibilities

### `app.vue` - Root Application Wrapper

**Location:** `/app/app.vue`
**Purpose:** Global app wrapper that runs once and stays mounted for the entire session.
**Should contain:**

- ✅ Global providers (`<UApp>`, error boundaries)
- ✅ App-wide initialization (via composables like `useAppInitialization`)
- ✅ Portal targets for modals/toasts (`<div id="modals">`)
- ✅ Components needed on **EVERY** page/layout
- ✅ Root-level routing components (`<NuxtLayout>`, `<NuxtPage>`)
  **Should NOT contain:**
- ❌ Layout-specific structure (headers, footers, navigation)
- ❌ Styling classes (backgrounds, text colors, spacing)
- ❌ Complex initialization logic (extract to composables)
- ❌ Business logic or state management
  **Example:**

```vue
<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <div id="modals"></div>
  </UApp>
</template>
<script setup lang="ts">
  import { useAppInitialization } from '@/composables/useAppInitialization';
  useAppInitialization();
</script>
```

**Why keep it minimal?**

- `app.vue` cannot be changed without reloading the entire app
- Complex logic here is harder to test and debug
- Layout concerns should be in layouts, not the root wrapper

---

### `layouts/default.vue` - Page Layout Structure

**Location:** `/app/layouts/default.vue`
**Purpose:** Defines the visual structure and layout for pages (header, navigation, content area, footer).
**Should contain:**

- ✅ Shell components (AppBar, NavDrawer, AppFooter)
- ✅ Layout-specific styling (backgrounds, spacing, responsive behavior)
- ✅ Layout state management (drawer open/closed, breakpoints)
- ✅ Main content slot (`<slot />`) for page content
  **Should NOT contain:**
- ❌ Global providers (those go in `app.vue`)
- ❌ Page-specific content (that goes in pages)
- ❌ Business logic (use stores/composables)
  **Example:**

```vue
<template>
  <div class="bg-background text-surface-200 flex min-h-screen flex-col">
    <NavDrawer />
    <AppBar :style="{ left: mainMarginLeft }" />
    <main :style="{ marginLeft: mainMarginLeft }">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
```

**When to create additional layouts:**

- Authentication pages (no header/footer)
- Admin dashboard (different navigation)
- Public marketing pages (different header)
  **Don't create extra layouts** unless you have genuinely different page structures.

---

### `shell/*` - App Shell Components

**Location:** `/app/shell/`
**Purpose:** Reusable structural components that form the app's "chrome" (header, navigation, footer).
**Current components:**

- `AppBar.vue` - Top header with title, game mode toggle, language selector
- `NavDrawer.vue` - Side navigation drawer with menu items
- `AppFooter.vue` - Bottom footer with links and info
  **Should contain:**
- ✅ Layout structural elements (headers, footers, navigation)
- ✅ Components used in layouts (not feature-specific)
- ✅ Responsive behavior for layout elements
  **Should NOT contain:**
- ❌ Feature-specific components (those go in `features/`)
- ❌ Form inputs or business logic components
- ❌ Page content
  **Why separate from `layouts/`?**
- Layouts compose shell components
- Shell components can be lazy-loaded for performance
- Easier to test components in isolation
- Clear separation: layouts = composition, shell = components

---

### `composables/useAppInitialization.ts` - App Initialization Logic

**Location:** `/app/composables/useAppInitialization.ts`
**Purpose:** Handles one-time app initialization when the app mounts.
**Responsibilities:**

- Locale setup from user preferences
- Supabase sync initialization for authenticated users
- Legacy data migration
  **Why extract from `app.vue`?**
- ✅ Keeps `app.vue` clean and focused
- ✅ Logic is testable in isolation
- ✅ Self-documenting with JSDoc comments
- ✅ Reusable if needed elsewhere

---

## Decision Tree: Where Does This Code Go?

### "Where should I put this component?"

```
Is it used on EVERY page regardless of layout?
├─ Yes → app.vue (rare - think global error boundaries, providers)
└─ No → Is it structural (header, footer, nav)?
    ├─ Yes → shell/ (AppBar, NavDrawer, AppFooter)
    └─ No → Is it feature-specific (tasks, team, hideout)?
        ├─ Yes → features/{domain}/
        └─ No → components/ (generic, reusable)
```

### "Where should I put this initialization logic?"

```
Does it run once when the app starts?
├─ Yes → Is it more than 5-10 lines?
│   ├─ Yes → Create composable, import in app.vue
│   └─ No → Can live in app.vue script
└─ No → Does it run per route/page?
    ├─ Yes → Page component or route middleware
    └─ No → Store or composable
```

### "Should I create a new layout?"

```
Do I need a COMPLETELY different page structure?
├─ Yes (e.g., auth page with no header/nav) → Create new layout
└─ No (just different content/styling) → Use pages and components
```

---

## Anti-Patterns to Avoid

### ❌ Over-abstraction

**Bad:**

```
app.vue → StandardLayout.vue → LayoutWrapper.vue → ActualLayout.vue
```

**Good:**

```
app.vue → layouts/default.vue → shell components
```

## **Why?** Unnecessary layers make code harder to follow with no benefit.

### ❌ Duplicate styling

**Bad:**

```vue
<!-- app.vue -->
<div class="bg-background text-surface-200 flex min-h-screen">
<!-- layouts/default.vue -->
<div class="bg-background text-surface-200 flex min-h-screen">
```

**Good:**

```vue
<!-- app.vue -->
<UApp>
  <NuxtLayout><NuxtPage /></NuxtLayout>
</UApp>
<!-- layouts/default.vue -->
<div class="bg-background text-surface-200 flex min-h-screen">
```

## **Why?** Styling belongs in layouts, not the root wrapper.

### ❌ Complex logic in app.vue

**Bad:**

```vue
<script setup lang="ts">
  onMounted(async () => {
    // 50 lines of initialization logic
  });
</script>
```

**Good:**

```vue
<script setup lang="ts">
  import { useAppInitialization } from '@/composables/useAppInitialization';
  useAppInitialization();
</script>
```

## **Why?** Keeps app.vue clean, logic testable.

### ❌ Shell components in wrong folder

**Bad:**

```
features/layout/AppBar.vue  ❌ (layout is not a "feature")
components/AppBar.vue       ❌ (not generic enough)
```

**Good:**

```
shell/AppBar.vue            ✅ (app structural component)
```

## **Why?** Clear semantic separation improves discoverability.

## Current Structure

```tree
app/
├── app.vue                          # Root wrapper (minimal)
├── layouts/
│   └── default.vue                  # Main page layout (uses shell components)
├── shell/
│   ├── AppBar.vue                   # Top header
│   ├── NavDrawer.vue                # Side navigation
│   └── AppFooter.vue                # Bottom footer
├── pages/
│   ├── index.vue                    # Dashboard
│   ├── tasks.vue                    # Tasks page
│   └── ...                          # Other pages
├── features/                        # Feature-specific components
│   ├── tasks/                       # Task-related components
│   ├── team/                        # Team-related components
│   └── ...
├── components/                      # Generic reusable components
└── composables/
    ├── useAppInitialization.ts      # App startup logic
    └── ...
```

---

## Best Practices Summary

1. **Keep `app.vue` minimal** - Only global providers and initialization
2. **Use layouts for structure** - Headers, footers, navigation composition
3. **Shell components for chrome** - Reusable structural elements
4. **Extract complex logic** - Use composables for initialization/setup
5. **Avoid over-abstraction** - Don't create layers without clear benefit
6. **Semantic organization** - Files should live where developers expect them

---

## When to Refactor

Consider refactoring when:

- ✅ You have 3+ similar layouts → Extract common shell components
- ✅ `app.vue` exceeds 20 lines → Extract logic to composables
- ✅ Components are hard to find → Review folder organization
- ❌ "Just in case" → Don't abstract until you need it
  **Remember:** Premature abstraction is worse than a bit of duplication. Refactor when the pain is real, not hypothetical.
