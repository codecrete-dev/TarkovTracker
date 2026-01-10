# PR Split Plan: `feat/ui-overhaul` Branch Decomposition

This document outlines the plan to break up the large `feat/ui-overhaul` PR into smaller, focused branches that can be reviewed and merged independently.

## Background

The `feat/ui-overhaul` branch contains extensive work spanning multiple features and improvements. To facilitate review and incremental merging, this work needs to be split into the following focused PRs based on the issues created:

---

## Issue Breakdown

### 1. URL-Based Filter State Management Across Pages (#101)

**Scope:** Replace store-based filter persistence with URL query parameter–based state management for shareable, bookmarkable filtered views.

**Expected Behavior:**

- Active filter state reflected in URL query parameters (e.g., `/tasks?status=locked`)
- Filtered views shareable via URL and restored on page load
- Browser back/forward navigation correctly updates filter state
- User's last viewed filters remembered and updated during navigation

**Key Files (already implemented in branch):**

- `app/composables/usePageFilters.ts` - Core reusable composable for filter handling
- `app/composables/usePageFilterRegistry.ts` - Centralized filter registry
- `app/features/tasks/composables/useTasksFilterConfig.ts` - Tasks page filter config
- `app/features/neededitems/composables/useNeededItemsFilterConfig.ts` - Needed Items filter config
- `app/features/hideout/composables/useHideoutFilterConfig.ts` - Hideout filter config
- `app/pages/tasks.vue` - Tasks page integration
- `app/pages/neededitems.vue` - Needed Items page integration
- `app/pages/hideout.vue` - Hideout page integration
- `app/pages/index.vue` - Dashboard integration
- `app/components/FilterPill.vue` - Filter UI component

**Technical Notes:**

- Introduce reusable composables for filter handling
- Use centralized filter registry for consistent behavior
- Avoid duplicating filter logic across views
- Ensure filter syncing does not cause unnecessary re-renders

**UX Notes:**

- URL structure should remain readable and predictable
- Avoid breaking existing deep links
- Filter updates should feel instantaneous

**Dependencies:** None - can be extracted independently

---

### 2. Add Light Mode Theme Option (#102)

**Scope:** Add a first-class light mode theme option that users can toggle, with semantic theme variables.

**Expected Behavior:**

- Light mode can be enabled via settings or UI toggle
- Theme choice persists per user or per session
- All core UI components remain readable and consistent in light mode

**Key Files (already implemented in branch):**

- `app/assets/css/tailwind.css` - Theme CSS variables with `dark:` variants
- `app/layouts/default.vue` - Color mode integration
- `app/locales/en.json5` - Light mode translation strings
- `app/pages/settings.vue` - Settings page with theme toggle
- Various components using semantic theme classes

**UX Notes:**

- Prefer semantic theme variables over hardcoded colors
- Ensure sufficient contrast for text and UI elements
- Consider accessibility guidelines for light backgrounds

**Benefits:**

- Improved accessibility and comfort
- Better usability in bright environments
- Aligns with modern UI expectations

**Dependencies:** Should coordinate with #104 (PvP/PvE accent theming) - both affect theming infrastructure

---

### 3. Improve Keyboard Navigation and Focus Accessibility (#103)

**Scope:** Improve keyboard navigation and focus handling across the application for accessibility.

**Expected Behavior:**

- All interactive elements are reachable via keyboard
- Logical tab order throughout the UI
- Visible focus states on all focusable elements
- No keyboard traps

**Key Files (already implemented in branch):**

- `app/assets/css/tailwind.css` - Focus styles and utility classes
- `app/components/ui/ContextMenuItem.vue` - Context menu keyboard handling
- `app/features/drawer/DrawerLevel.vue` - Drawer navigation tabindex
- `app/features/dashboard/DashboardProgressCard.vue` - Card tabindex
- `app/features/tasks/TaskCardRewards.vue` - Task card tabindex
- `app/features/tasks/RelatedTasksRow.vue` - Related tasks tabindex
- `app/shell/LoadingScreen.vue` - Loading screen focus management

**UX Notes:**

- Ensure focus styles meet contrast requirements
- Avoid relying on hover-only interactions
- Test common flows using keyboard only

**Benefits:**

- Better accessibility for keyboard and assistive technology users
- Improved overall UX clarity
- More robust and inclusive interface

**Dependencies:** None - can be extracted independently

---

### 4. Support PvP / PvE Accent Theming (#104)

**Scope:** Introduce accent theming that visually differentiates PvP and PvE contexts.

**Expected Behavior:**

- PvP and PvE views use distinct accent colors
- Accent choice integrates cleanly with existing themes
- Accents are applied consistently across relevant UI elements

**Key Files (already implemented in branch):**

- `app/assets/css/tailwind.css` - Accent color CSS variables
- `app/stores/useSystemStore.ts` - Game mode state (PvP/PvE)
- `app/stores/useProgress.ts` - Progress by game mode
- `app/shell/NavDrawer.vue` - Nav drawer mode indication
- `app/pages/settings.vue` - Settings page mode toggle
- `app/app.vue` - Root app mode theming
- `app/layouts/default.vue` - Layout mode integration
- Various components with mode-aware styling

**UX Notes:**

- Use semantic color tokens rather than raw color values
- Ensure accessibility for color-blind users
- Avoid overuse of accent colors

**Benefits:**

- Faster visual context recognition
- Reduced cognitive load
- Cleaner visual hierarchy

**Dependencies:** Should coordinate with #102 (Light Mode) - both affect theming infrastructure

---

### 5. Updated Tasks UI with Improved Navigation and Related Task Context (#106)

**Scope:** Update the Tasks UI to improve task discoverability, progression clarity, and navigation between task list and single-task views.

**Expected Behavior:**

- Reimagined "related tasks" section showing:
  - Prerequisite tasks
  - Next tasks in the chain
  - Failure conditions where applicable
- Streamlined task navigation with instant access to single-task view
- When viewing a task with map objectives, the map opens automatically

**Key Files (already implemented in branch):**

- `app/features/tasks/RelatedTasksRow.vue` - Related tasks display component
- `app/features/tasks/TaskCard.vue` - Main task card component
- `app/features/tasks/TaskInfo.vue` - Task information display
- `app/features/tasks/TaskLink.vue` - Task linking component
- `app/features/tasks/TaskObjective.vue` - Task objective display
- `app/features/tasks/TaskObjectiveItemGroup.vue` - Grouped objectives
- `app/features/tasks/TaskActions.vue` - Task action buttons
- `app/features/tasks/TaskCardRewards.vue` - Rewards display
- `app/features/tasks/TaskFilterBar.vue` - Filter bar component
- `app/features/tasks/TaskSettingsModal.vue` - Task settings
- `app/pages/tasks.vue` - Tasks page
- `app/pages/tasks/[id].vue` - Single task view page (if exists)

**UX Notes:**

- Related task relationships should be visually clear without overwhelming main content
- Navigation changes should avoid breaking existing deep links
- Automatic map opening should not override explicit user navigation preference

**Benefits:**

- Clearer understanding of task progression
- Faster navigation between tasks and objectives
- Reduced friction when working on map-based tasks
- Improved overall task management experience

**Dependencies:** May benefit from #103 (Keyboard Navigation) for accessibility

---

### 6. "Needed Items" UI Facelift with Clear Status Indicators (#107)

**Scope:** Refresh the "Needed Items" UI to improve scannability, visual clarity, and status awareness while keeping the layout familiar.

**Expected Behavior:**

- Game item images use a Tarkov-inspired color treatment for visual consistency
- Item requirement, craftable, and Kappa indicators consolidated into a clear, compact status bar
- Status indicators visible at a glance without opening item details
- Layout supports dense item grids without sacrificing readability

**Key Files (already implemented in branch):**

- `app/features/neededitems/NeededItem.vue` - Main needed item component
- `app/features/neededitems/NeededItemSmallCard.vue` - Compact card view
- `app/features/neededitems/NeededItemGroupedCard.vue` - Grouped card view
- `app/features/neededitems/NeededItemRow.vue` - Row view
- `app/features/neededitems/ItemIndicators.vue` - Status indicator badges
- `app/features/neededitems/ItemCountControls.vue` - Count controls
- `app/features/neededitems/RequirementInfo.vue` - Requirement display
- `app/features/neededitems/NeededItemsFilterBar.vue` - Filter bar
- `app/features/neededitems/TeamNeedsDisplay.vue` - Team needs display
- `app/features/neededitems/neededitem-keys.ts` - Item key utilities
- `app/features/neededitems/neededitems-constants.ts` - Constants
- `app/pages/neededitems.vue` - Needed Items page

**UX Notes:**

- Visual treatments should enhance clarity, not distract from content
- Status colors should be semantic and consistent across the app
- Ensure sufficient contrast for accessibility, especially in light mode
- Avoid hiding critical information behind hover-only interactions

**Benefits:**

- Faster scanning of required items
- Reduced cognitive load when tracking progress
- Clearer understanding of item status and importance
- Improved visual cohesion with the rest of the UI

**Dependencies:** Should coordinate with #102 (Light Mode) for theme-aware styling

---

### 7. Reorganize Navigation Drawer and App Bar Controls (#108)

**Scope:** Reorganize the navigation drawer and app bar to more clearly separate game-related controls from application-level settings.

**Expected Behavior:**

- Game controls (game mode, faction, edition) consolidated in the navigation drawer
- Application controls (theme toggle, language picker) remain in the app bar
- Control grouping feels intentional and consistent across the app
- No existing functionality is removed or hidden

**Specific Changes (In Scope):**

1. **Move game mode toggle from AppBar to NavDrawer**
   - Remove the PvP/PvE segmented button group from `AppBar.vue`
   - Add a single-button game mode cycler to `NavDrawer.vue`
2. **Convert toggle button groups to single-button cyclers**
   - Game mode: single button that cycles PvP ↔ PvE with swapping icon
   - Faction: single button that cycles USEC ↔ BEAR (if not already)
3. **Remove icon hover effect from DrawerLevel**
   - The level/XP icon should not have a hover effect
4. **Minor layout adjustments** to accommodate the new control placement

**Out of Scope (Do NOT include):**

- Light mode styles (`dark:` prefixes, `bg-white`, etc.) → #102
- PvP/PvE accent theming (`text-pvp-*`, `text-pve-*`, logo tinting) → #104
- URL filter state management (`usePageFilterRegistry`) → #101
- Any new translation keys beyond what's needed for button labels

**Key Files:**

- `app/shell/NavDrawer.vue` - Main navigation drawer
- `app/shell/AppBar.vue` - Top app bar
- `app/features/drawer/DrawerLevel.vue` - Drawer level/XP display (remove hover effect)

**Dependencies:** None - can be extracted independently

---

### 8. Standardize Task Terminology and Expand Localization Coverage (#109)

**Scope:** Update localization files to standardize task-related terminology and add missing translations for commonly used gameplay terms.

**Expected Behavior:**

- The term "quest" is consistently replaced with "task" across all language files
- "Found in Raid" translations are added and used consistently where applicable
- No functional behavior changes, only text and localization updates
- Existing translation structure and keys remain stable where possible

**Key Files (already implemented in branch):**

- `app/locales/en.json5` - English translations (primary)
- `app/locales/de.json5` - German translations
- `app/locales/es.json5` - Spanish translations
- `app/locales/fr.json5` - French translations
- `app/locales/ru.json5` - Russian translations
- `app/locales/uk.json5` - Ukrainian translations

**Localization Notes:**

- Changes should be applied uniformly across all supported languages
- Avoid introducing duplicate or overlapping translation keys
- Ensure fallback behavior remains unchanged for missing translations

**Benefits:**

- More consistent terminology throughout the UI
- Improved clarity for users across different languages
- Easier future maintenance of localization files
- Reduced risk of terminology drift over time

**Dependencies:** Should be one of the first or last PRs - first to establish terminology foundation, or last to avoid conflicts with text changes in other PRs

---

## Suggested Order of PRs

Based on likely dependencies, a recommended order for creating PRs:

1. ~~**#109** - Localization~~ ✅ Complete
2. ~~**#108** - Navigation Drawer/App Bar~~ ✅ Complete
3. **#102** - Light Mode Theme (foundation for theming)
4. **#104** - PvP/PvE Accent Theming (builds on theme infrastructure)
5. **#103** - Keyboard Navigation/Accessibility
6. **#106** - Tasks UI Improvements
7. **#107** - Needed Items UI Facelift
8. **#101** - URL-Based Filter State (can be relatively independent)

> [!NOTE]
> This order may need adjustment based on the actual file changes and interdependencies discovered during detailed analysis of each issue.

---

## Strategy for Branch Creation

> [!IMPORTANT]
> **The `feat/ui-overhaul` branch will be preserved intact.** All new branches should be created fresh from the **latest `main` commit** and changes applied surgically from `feat/ui-overhaul`.

### Guiding Principles

> [!CAUTION]
> **Never do wholesale file checkouts.** Running `git checkout feat/ui-overhaul -- path/to/file.vue` brings in ALL changes to that file, including unrelated theming, styling, or other feature work. This is the #1 cause of scope creep.

1.  **The app's base theme is Dark Mode.** Do not introduce `dark:` prefixes for default styles; assume the default _is_ the dark theme. Light mode styles belong exclusively to #102.
2.  **PvP/PvE accent colors belong to #104.** Do not introduce `text-pvp-*`, `text-pve-*`, or accent color variables unless working on that specific issue.
3.  **URL filter state belongs to #101.** Do not introduce `usePageFilters`, `usePageFilterRegistry`, or URL query parameter logic unless working on that specific issue.

### Approach

For each issue:

1.  **Create a fresh branch from `main`**

    ```bash
    git checkout main && git pull origin main
    git checkout -b feat/issue-XXX-descriptive-name
    ```

2.  **Analyze the diff for scope**

    ```bash
    git diff main..feat/ui-overhaul -- path/to/file.vue
    ```

    - Review the diff carefully. Identify which hunks (blocks of changes) are **in scope** for this issue and which are **out of scope**.
    - Create a mental or written list of the specific changes to apply.

3.  **Apply changes surgically**
    - **Do NOT** run `git checkout feat/ui-overhaul -- file` for complex files.
    - **DO** manually edit the `main` version of the file, copying only the in-scope lines/blocks from `feat/ui-overhaul`.
    - For simple, self-contained files (e.g., a new component that only exists for this issue), a full checkout is acceptable.

4.  **Verify isolation**
    - After applying changes, run `git diff` on the modified files.
    - Ask: "Does every line in this diff relate to the issue I'm working on?"
    - If unrelated changes snuck in (e.g., theme classes, accent colors), remove them.

5.  **Build and test**
    - Run `npm run build` to catch import errors or missing dependencies.
    - Visually inspect the app to ensure nothing appears broken (wrong colors, missing hover effects, etc.).

6.  **Commit with a meaningful message**
    - Describe the actual change, not the extraction process.
    - Good: `feat(nav): convert game mode toggle to single-button cycler`
    - Bad: `chore: extract #108 changes from ui-overhaul`

7.  **Return to main and update this document**
    ```bash
    git checkout main
    ```

    - Mark the completed issue as done in the "Suggested Order of PRs" section above.
    - Amend the last commit on `main` to include the updated plan doc:
      ```bash
      git add PR_SPLIT_PLAN.md
      git commit --amend --no-edit
      ```

---

## Notes

- Each PR should be self-contained and pass all tests independently
- Coordinate with maintainers on merge order to minimize conflicts
- Update this document as issue details are added
