# Dark Mode Restoration Plan

## Goal

Identify and revert unintended changes to the default dark theme that occurred during the recent light mode implementation. Ensure a consistent, semantic theming system that preserves the original dark mode aesthetic while supporting light mode.

## Thorough Audit Strategy (Revised)

The user has confirmed that `main` is the absolute source of truth and visual drift involves text, icons, and backgrounds.

1.  **Revert Previous "Fix"**:
    - Undo changes to `tailwind.css` made in the previous step. The OKLCH values in `main` were correct and should not have been removed.

2.  **Component-Level Deep Dive**:
    - For each affected component (`ExperienceCard.vue`, `DisplayNameCard.vue`, `GenericCard.vue`, and other recently modified files):
      - **Diff against Main**: Run `git show main:app/features/.../Component.vue` and compare with the current file.
      - **Map Class Changes**: Identify every instance where a raw Tailwind class (e.g., `text-surface-200`, `bg-surface-800/30`, `border-surface-700`) was replaced by a Semantic Class (e.g., `text-content-primary`, `bg-surface-elevated`, `border-base`).
    - **Verify Equivalence**:
      - Check the definition of the _new_ Semantic Class in `tailwind.css`.
      - Compare the Semantic Class's `dark` value against the _original_ raw class's value.
      - _Example Calculation_:
        - **Original**: `border-surface-700` -> `hsl(240 5.1% 19.4%)`
        - **New**: `border-base` -> `white/10` (approx `#1a1a1a`)
        - **Result**: **DRIFT**. The border is darker/different.

3.  **Fix Strategy**:
    - **Do not** redefine global Semantic Classes (`border-base`) if they are used correctly elsewhere _unless_ `main` defines them differently.
    - **Instead**, fix the **Component Usage**:
      - Update the component to use precise `dark:` overrides that match the `main` branch values.
      - _Pattern_: `<div class="bg-white dark:bg-surface-800/30 ...">` (Retains light mode, restores exact dark mode).
      - _Pattern_: `<span class="text-gray-900 dark:text-surface-200 ...">` (Retains light mode text, restores exact dark mode text).

4.  **Navigation & Text Audit (New High Priority)**:
    - **Problem**: Visual inspection shows Navigation Drawer text and icons are significantly dimmer/different in the current branch compared to `main`.
    - **Hypothesis**: The new Semantic Classes (e.g., `.text-content-secondary`) defined with `@apply` might be bypassing the specific CSS overrides (`.dark .text-gray-400 { color: rgba(...) }`) that exist in `main`. Tailwind's `@apply` reads values from the config, ignoring custom CSS rules.
    - **Action**:
      - Diff `app/shell/NavDrawer.vue` and `app/shell/AppBar.vue` against `git show main:...`.
      - Identify unchanged lines that now look different (indicating Global CSS drift) vs changed lines (indicating Component Class drift).
      - **Fix**: Ensure `tailwind.css` Semantic Classes explicitly define the correct Dark Mode color.
        - _Example Fix_: Update `.text-content-secondary` to use `dark:text-white/60` (or whatever the precise legacy value is) instead of just `dark:text-gray-400` if the override isn't catching it.

5.  **Scope of Audit**:
    - Priority: `ExperienceCard.vue`, `DisplayNameCard.vue` (Explicitly mentioned/viewed).
    - Secondary: `GenericCard.vue`.
    - Check `tailwind.css` for any changes to _existing_ tokens (like `text-gray-400`) that might have drifted.

## Proposed Changes

### 1. Restore Dark Mode Fidelity

- Update `tailwind.css`: Ensure `:root.dark` variables exactly match the original `:root` variables from `main`.
- Fix `bg-surface-*` and global utilities: If `main` used specific hexes (like `#121214`), ensure the `dark:` variant in the new branch uses that exact token/hex, effectively "resetting" the dark mode to the known good state.

### 2. Implementation Details

- If `main` had `bg-gray-900` globally, and the new branch has `bg-white dark:bg-surface-950`, verify `surface-950` resolves to the original `gray-900` color. If not, adjust the token definition.

## Fix Strategy

1.  **Global Theme Repair**:
    - Ensure all `.text-content-*` and `.bg-surface-*` utilities in `tailwind.css` map **exactly** to the visual result of the `main` branch.
    - If `main` relies on a CSS rule `.dark .text-gray-400 { opacity: 0.6 }`, then `.text-content-secondary` (which replaces `text-gray-400`) MUST include that same opacity/color value directly in its definition, as it cannot rely on the selector cascade.

2.  **Component Restoration**:
    - For `ExperienceCard`, `DisplayNameCard`, `NavDrawer`, etc.:
      - If the component was refactored to use semantic classes, verify those classes appear identical to the original raw classes.
      - If not, override the specific element with the correct `dark:` utility (e.g., `dark:text-white/60`) to force compliance.

## Verification

- **Browser Inspection**:
  - Inspect `computedStyle` of text elements and backgrounds in the corrected components.
  - Compare against the known values from `main` (e.g., `surface-200`, `surface-800/30`).
