# Session Notes: Visual Clarity & Consistency Audit

**Date**: 2025-12-29
**Project**: TarkovTrackerNuxt
**Current Objective**: Refine visual clarity/consistency of Task Cards and ensure Loading Screen adheres to theme settings.

## Context

We are performing a visual audit to fix contrast issues in Light Mode and ensuring consistent theming.

## Progress So Far

### 1. Tasks Page Audit

- **Refined Task Cards**:
  - **Completed Tasks**: Updated background/border in Light Mode (`bg-success-50`, `border-success-200`) for a cleaner look.
  - **Rewards Section**: Darkened text/backgrounds in Light Mode (`TaskCardRewards.vue`) to fix readability.
  - **Suggested Keys**: Darkened header text in Light Mode (`QuestKeys.vue`).
- **Components**:
  - **GameItem.vue**: Fixed "invisible text" issue in Light Mode by changing text color from fixed white to `text-gray-900 dark:text-white`.

### 2. Loading Screen Fix

- **Theme Consistency**: Updated `app/shell/LoadingScreen.vue` to remove hardcoded dark theme.
  - Background: `bg-white dark:bg-gray-950`
  - Text: Semantic/Theme-aware colors.
- **Current Status**: The file `app/shell/LoadingScreen.vue` currently has a **FORCED DEBUG STATE** (`return true; // FORCED FOR TESTING`) in the `shouldShow` computed property to allow for visual verification.

## Remaining Work

1. **Verify Loading Screen**:
   - Confirm it looks correct in Light Mode.
   - Confirm it looks correct in Dark Mode.
2. **Cleanup**:
   - **CRITICAL**: Remove the `return true` line from `app/shell/LoadingScreen.vue`.
3. **Needed Items Page**:
   - Proceed to audit `neededitems.vue` for similar clarity/theme issues.

## Files Modified

- `app/features/tasks/TaskCard.vue`
- `app/features/tasks/TaskCardRewards.vue`
- `app/features/tasks/QuestKeys.vue`
- `app/components/ui/GameItem.vue`
- `app/shell/LoadingScreen.vue`
