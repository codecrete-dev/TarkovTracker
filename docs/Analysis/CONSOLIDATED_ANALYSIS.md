# Codebase Analysis - Action Items

**Updated:** 2025-11-29

---

## Critical (Fix Immediately)

### 1. CORS Wildcard Security Risk

**File:** `supabase/functions/_shared/cors.ts`  
**Issue:** `Access-Control-Allow-Origin: *` allows any origin to make authenticated requests.  
**Fix:** Whitelist specific origins (`tarkovtracker.org`, `localhost:3000` for dev).

### 2. Incomplete Team Features

**Files:** `TeamMemberCard.vue`, `TeamInvite.vue`, `MyTeam.vue`  
**Issue:** 9 TODOs - kick, leave, join functions are stubbed.  
**Fix:** Connect to existing Cloudflare Workers gateway in `workers/team-gateway/`.

### 3. Missing Account Deletion

**File:** `AccountDeletionCard.vue:275`  
**Issue:** No way to delete user data (GDPR violation).  
**Fix:** Create Supabase Edge Function to cascade delete user data.

---

## High Priority

### 4. Production Console Logging

**Files:** `useTarkov.ts` (30+), `useMetadata.ts` (10+), `usePreferences.ts` (5+)  
**Issue:** 50+ `console.log` statements leak to production.  
**Fix:** Gate with `if (import.meta.dev)` or create logger utility.

### 5. Missing Error Recovery

**File:** `useTeamStore.ts:114-120`  
**Issue:** Failed teammate store creation leaves inconsistent state, no user notification.  
**Fix:** Add try/catch with toast notification and retry logic.

### 6. Skill/Trader Requirements Always Pass

**File:** `HideoutCard.vue:306-311`  
**Issue:** `isSkillReqMet()` and `isTraderReqMet()` return `true` always.  
**Fix:** Add skill/trader tracking to `UserProgressData` interface.

---

## Medium Priority

### 7. Reactive Graph Objects in Pinia

**File:** `useMetadata.ts`  
**Issue:** Graphology instances stored reactive cause overhead.  
**Fix:** Wrap with `markRaw()`.

### 8. Breakpoints Created Per Component

**File:** `TaskCard.vue:67`  
**Issue:** 100 TaskCards = 100 breakpoint listeners.  
**Fix:** Create shared `useSharedBreakpoints()` composable.

### 9. JSON Deep Clone in Filtering

**File:** `useHideoutFiltering.ts:54`  
**Issue:** Deep clones hideout data on every computed eval.  
**Fix:** Filter without mutation instead of cloning.

### 10. Watchers Without Cleanup

**File:** `usePreferences.ts:310-386`  
**Issue:** `setTimeout` + `watch` without cleanup on HMR.  
**Fix:** Store stop handles, cleanup on unmount.

### 11. Missing TypeScript in Components

**Files:** `TeamInvite.vue`, `TeamMemberCard.vue`, `TaskCard.vue`, `hideout.vue`  
**Issue:** Missing `lang="ts"` reduces type safety.  
**Fix:** Add `<script setup lang="ts">` with proper prop types.

---

## Low Priority

### 12. Async Loading for Always-Shown Components

**File:** `TaskCard.vue`  
**Issue:** `TaskInfo` and `TaskActions` always render but use `defineAsyncComponent`.  
**Fix:** Use direct imports for always-visible components.

### 13. Magic Numbers

**Various files**  
**Issue:** Hardcoded values (15 char limit, 5 team members, 12hr cache).  
**Fix:** Move to `constants.ts`.

### 14. Commented-Out Code

**Files:** `useTarkov.ts`, `TeamInvite.vue`  
**Issue:** Dead code clutters files.  
**Fix:** Remove and rely on git history.

### 15. i18n Keys Not Typed

**All components**  
**Issue:** Translation key typos caught only at runtime.  
**Fix:** Generate types from locale files.

---

## Deferred

### Full-State Sync Performance

**File:** `useSupabaseSync.ts:97`  
**Issue:** `JSON.parse(JSON.stringify(newState))` on every change.  
**Reason Deferred:** Requires DB schema changes (`updated_at` field), dirty tracking, conflict resolution.  
**Mitigation:** 1000ms debounce in place.

---

## Quick Reference

| Priority | Count | Key Actions                                 |
| -------- | ----- | ------------------------------------------- |
| Critical | 3     | CORS fix, team features, account deletion   |
| High     | 3     | Remove logs, error handling, req validation |
| Medium   | 5     | Performance optimizations, TypeScript       |
| Low      | 4     | Code cleanup                                |
| Deferred | 1     | Dirty-field sync                            |
