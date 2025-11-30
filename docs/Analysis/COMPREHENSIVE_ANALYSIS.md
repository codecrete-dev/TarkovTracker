# Comprehensive Codebase Analysis

**Analysis Date:** November 29, 2025  
**Scope:** Full codebase deep-dive  
**Author:** Claude Opus 4.5 (GitHub Copilot)

---

## Executive Summary

This analysis covers the entire TarkovTrackerNuxt codebase, identifying architectural issues, performance problems, security concerns, incomplete implementations, and areas for improvement. The codebase is a Nuxt 4 SPA with Vue 3, Pinia, Supabase, and Cloudflare Workers/Pages deployment.

---

## Table of Contents

1. [Critical Issues](#1-critical-issues)
2. [High Priority Issues](#2-high-priority-issues)
3. [Medium Priority Issues](#3-medium-priority-issues)
4. [Low Priority Issues](#4-low-priority-issues)
5. [Deferred/Known Issues](#5-deferredknown-issues)
6. [Architecture Recommendations](#6-architecture-recommendations)
7. [Performance Recommendations](#7-performance-recommendations)
8. [Security Recommendations](#8-security-recommendations)
9. [Code Quality Recommendations](#9-code-quality-recommendations)
10. [TODOs and Incomplete Implementations](#10-todos-and-incomplete-implementations)

---

## 1. Critical Issues

### 1.1 Incomplete Team Feature Implementation

**Location:** Multiple files in `app/features/team/`  
**Severity:** Critical  
**Impact:** Core feature is non-functional

Multiple team-related features are stubbed out with TODO comments:

```typescript
// TeamMemberCard.vue:148-149
// TODO: Implement Cloudflare Workers integration for kicking team members
console.log('TODO: Implement Cloudflare Workers for kickTeammate function');
throw new Error('Team member kicking not yet implemented with Cloudflare Workers');
```

```typescript
// TeamInvite.vue:56
// TODO: Implement Supabase team joining logic
console.warn('Team joining not yet implemented for Supabase');
```

```typescript
// MyTeam.vue:121
// Team functions moved to Cloudflare Workers - TODO: Implement replacement
```

**Recommendation:** Complete the team management integration with the existing Cloudflare Workers gateway (`workers/team-gateway/`). The gateway already proxies to Supabase edge functions, but the frontend integration is incomplete.

---

### 1.2 CORS Wildcard in Supabase Edge Functions

**Location:** `supabase/functions/_shared/cors.ts`  
**Severity:** Critical (Security)

```typescript
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // SECURITY RISK
  ...
}
```

**Impact:** Allows any origin to make authenticated requests to edge functions, potentially exposing user data to malicious sites.

**Recommendation:** Replace wildcard with specific allowed origins:

```typescript
const ALLOWED_ORIGINS = [
  'https://tarkovtracker.org',
  'https://www.tarkovtracker.org',
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,
].filter(Boolean);
```

---

### 1.3 Missing Account Deletion Implementation

**Location:** `app/features/settings/AccountDeletionCard.vue:275`  
**Severity:** Critical (GDPR/Legal Compliance)

```typescript
// TODO: Implement Supabase account deletion (likely via RPC or Edge Function)
```

**Impact:** Users cannot delete their accounts, which may violate GDPR "Right to Erasure" requirements.

**Recommendation:** Implement a Supabase Edge Function that:

1. Deletes user from teams
2. Removes all user_progress data
3. Removes all user_preferences data
4. Removes all user_system data
5. Deletes the auth.users record

---

## 2. High Priority Issues

### 2.1 Full-State Deep Clone on Every Sync (Deferred but Important)

**Location:** `app/composables/supabase/useSupabaseSync.ts:97`

```typescript
debouncedSync(JSON.parse(JSON.stringify(newState)));
```

**Impact:** Every state change triggers a full JSON serialization of the entire user progress state. With ~250 tasks and hideout modules, this creates significant memory pressure.

**Current Mitigation:** 1000ms debounce + 250ms sync debounce (effectively 250ms minimum)

**Recommendation:** Implement dirty field tracking:

```typescript
interface DirtyState {
  fields: Set<string>;
  lastCleanState: string; // hash or minimal diff
}

// Only sync changed fields
const dirtyFields = getDirtyFields(oldState, newState);
if (dirtyFields.size > 0) {
  debouncedSync({ ...partial, _dirty: dirtyFields });
}
```

---

### 2.2 Excessive Production Logging

**Location:** Multiple files across stores and composables  
**Severity:** High (Performance/Security)

Found 50+ `console.log` statements in production code paths. Examples:

- `app/stores/useTarkov.ts`: 30+ console statements
- `app/stores/useMetadata.ts`: 10+ console statements
- `app/stores/usePreferences.ts`: 5+ console statements

**Impact:**

1. Performance overhead in production
2. Potential information disclosure (user IDs, state data)
3. Console pollution making debugging harder

**Recommendation:** Create a logging utility that respects environment:

```typescript
// utils/logger.ts
export const logger = {
  debug: (...args: unknown[]) => import.meta.dev && console.log(...args),
  info: (...args: unknown[]) => import.meta.dev && console.info(...args),
  warn: console.warn,
  error: console.error,
};
```

Replace all `console.log` with `logger.debug` or `logger.info`.

---

### 2.3 Missing Error Handling in Critical Paths

**Location:** `app/stores/useTeamStore.ts`  
**Severity:** High

```typescript
// Line 114-120
try {
  for (const teammate of newTeammatesArray) {
    if (!teammateStores.value[teammate]) {
      await createTeammateStore(teammate);
    }
  }
} catch (error) {
  console.error('Error managing teammate stores:', error);
  // No recovery mechanism - team state left inconsistent
}
```

**Impact:** If teammate store creation fails, the UI shows inconsistent data with no user notification.

**Recommendation:** Add error recovery and user notification:

```typescript
catch (error) {
  logger.error('Error managing teammate stores:', error);
  toast.add({
    title: t('team.error.loadingTeammates'),
    color: 'error'
  });
  // Retry mechanism or fallback state
}
```

---

### 2.4 Race Condition in Metadata Initialization

**Location:** `app/plugins/metadata.client.ts`

```typescript
export default defineNuxtPlugin(async () => {
  const metadataStore = useMetadataStore();
  await metadataStore.initialize();
  // ...
});
```

**Issue:** If multiple components attempt to use metadataStore before initialization completes, they receive empty data.

**Recommendation:** Add initialization guard:

```typescript
// stores/useMetadata.ts
const isInitializing = ref(false);
const initPromise = ref<Promise<void> | null>(null);

async function initialize() {
  if (initPromise.value) return initPromise.value;
  isInitializing.value = true;
  initPromise.value = (async () => {
    // ... initialization logic
  })();
  await initPromise.value;
  isInitializing.value = false;
}
```

---

### 2.5 Hideout Skill/Trader Requirements Never Validated

**Location:** `app/features/hideout/HideoutCard.vue:306-311`

```typescript
// TODO: Implement skill level tracking in user state
const isSkillReqMet = (_requirement) => true; // Always returns true

// TODO: Implement trader loyalty level and rep tracking in user state
const isTraderReqMet = (_requirement) => true; // Always returns true
```

**Impact:** Users see incorrect "prerequisites met" status for hideout upgrades, leading to confusion when in-game upgrades fail.

**Recommendation:** Add skill and trader tracking to `UserProgressData`:

```typescript
interface UserProgressData {
  // ...existing fields
  skills: Record<string, number>; // skill name -> level
  traderLoyalty: Record<string, number>; // trader id -> loyalty level
}
```

---

## 3. Medium Priority Issues

### 3.1 Inconsistent TypeScript Strictness in Vue Components

**Location:** Various `.vue` files

Many components use `<script setup>` without `lang="ts"`:

- `app/features/team/TeamInvite.vue`
- `app/features/team/TeamMemberCard.vue`
- `app/features/tasks/TaskCard.vue`
- `app/pages/hideout.vue`

**Impact:** Reduced type safety, potential runtime errors, inconsistent codebase patterns.

**Recommendation:** Add `lang="ts"` to all script blocks and define proper prop types:

```vue
<script setup lang="ts">
  import type { Task } from '@/types/tarkov';

  const props = defineProps<{
    task: Task;
    activeUserView: string;
    neededBy: string[];
  }>();
</script>
```

---

### 3.2 Prop Drilling in Task Components

**Location:** `app/features/tasks/TaskCard.vue` → `TaskInfo.vue` → `TaskActions.vue`

Props like `activeUserView`, `xs`, `lockedBefore`, `lockedBehind`, etc. are passed through multiple component layers.

**Impact:** Component coupling, harder maintenance, prop pollution.

**Recommendation:** Consider using provide/inject for deeply nested context:

```typescript
// TaskCard.vue
provide('taskContext', {
  activeUserView: computed(() => props.activeUserView),
  xs: computed(() => xs.value),
  // ...
});

// TaskInfo.vue
const { activeUserView, xs } = inject('taskContext');
```

---

### 3.3 Reactive Graph Objects Stored in Pinia

**Location:** `app/stores/useMetadata.ts`

```typescript
interface MetadataState {
  // ...
  taskGraph: AbstractGraph; // Graphology instance
  hideoutGraph: AbstractGraph; // Graphology instance
}
```

**Issue:** Graphology instances are complex objects with methods. Storing them in reactive state can cause:

1. Reactivity overhead on graph mutations
2. Serialization issues if persist is ever enabled
3. Memory leaks from Vue's reactivity proxying

**Recommendation:** Use `shallowRef` or `markRaw`:

```typescript
import { markRaw } from 'vue';

taskGraph: markRaw(createGraph()),
hideoutGraph: markRaw(createGraph()),
```

---

### 3.4 useBreakpoints Called Per Component Instance

**Location:** `app/features/tasks/TaskCard.vue:67`

```typescript
const breakpoints = useBreakpoints({
  mobile: 0,
  sm: 600,
});
const xs = breakpoints.smaller('sm');
```

**Issue:** If 100 TaskCards render, 100 breakpoint listeners are created.

**Recommendation:** Create a shared composable or use Nuxt's built-in viewport composable:

```typescript
// composables/useSharedBreakpoints.ts
const breakpoints = useBreakpoints({ mobile: 0, sm: 600 });
const xs = breakpoints.smaller('sm');

export function useSharedBreakpoints() {
  return { xs };
}
```

---

### 3.5 JSON Deep Clone for Filtering (Performance)

**Location:** `app/composables/useHideoutFiltering.ts:54`

```typescript
const hideoutStationList = JSON.parse(JSON.stringify(hideoutStations.value));
```

**Issue:** Deep cloning entire hideout station data on every computed evaluation.

**Recommendation:** Filter in place without mutation or use shallow clone:

```typescript
const visibleStations = computed(() => {
  if (isStoreLoading.value) return [];
  return hideoutStations.value.filter((station) => {
    // filter logic without modifying original
  });
});
```

---

### 3.6 Watchers Without Cleanup in Preferences Store

**Location:** `app/stores/usePreferences.ts:310-386`

```typescript
if (import.meta.client) {
  setTimeout(() => {
    // ... sets up watchers
    watch(
      () => $supabase.user.loggedIn,
      async (newValue: boolean) => {
        // ...
      },
      { immediate: true }
    );
  }, 100);
}
```

**Issues:**

1. `setTimeout` without cleanup on HMR
2. `watch` return (stop function) is ignored
3. If user logs out and back in, duplicate watchers may exist

**Recommendation:** Use plugin lifecycle:

```typescript
export default defineNuxtPlugin({
  setup(nuxtApp) {
    const stopWatcher = watch(...);
    nuxtApp.hook('app:beforeUnmount', stopWatcher);
  }
});
```

---

### 3.7 IndexedDB Operations Not Wrapped in Try-Catch

**Location:** `app/utils/tarkovCache.ts`

While the main functions have try-catch, the inner Promise operations don't handle IDB transaction errors properly:

```typescript
request.onerror = () => {
  console.error('[TarkovCache] Failed to get cached data:', request.error);
  resolve(null); // Silently fails
};
```

**Recommendation:** Propagate errors to callers and add retry logic:

```typescript
const MAX_RETRIES = 3;

async function getCachedDataWithRetry<T>(...args): Promise<T | null> {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      return await getCachedData<T>(...args);
    } catch (e) {
      if (i === MAX_RETRIES - 1) throw e;
      await new Promise((r) => setTimeout(r, 100 * (i + 1)));
    }
  }
  return null;
}
```

---

## 4. Low Priority Issues

### 4.1 Commented-Out Code

**Location:** Various files

Multiple files contain commented-out code that should be removed:

- `app/stores/useTarkov.ts:251-269` (debug logging)
- `app/stores/useTarkov.ts:319-323` (store definition logging)
- `app/features/team/TeamInvite.vue:41-44` (old Firebase imports)

**Recommendation:** Remove commented code and rely on git history.

---

### 4.2 Magic Numbers and Hardcoded Values

**Location:** Various

Examples:

- `app/features/team/MyTeam.vue:145`: Display name max length 15
- `app/stores/useTarkov.ts:247`: State timestamp
- `app/utils/tarkovCache.ts:16`: Cache TTL 12 hours
- `supabase/functions/team-create/index.ts:11`: MAX_TEAM_MEMBERS = 5

**Recommendation:** Move to `constants.ts`:

```typescript
export const LIMITS = {
  DISPLAY_NAME_MAX_LENGTH: 15,
  TEAM_MAX_MEMBERS: 5,
  CACHE_TTL_HOURS: 12,
} as const;
```

---

### 4.3 Inconsistent Error Message Patterns

**Location:** Various stores and composables

Some errors use template literals, some use concatenation, some are static:

```typescript
// Pattern 1
console.error('Error resetting online profile:', error);

// Pattern 2
console.error(`[TarkovStore] Error resetting PvP data:`, error);

// Pattern 3
throw new Error('Team member kicking not yet implemented with Cloudflare Workers');
```

**Recommendation:** Standardize error messages with a prefix system:

```typescript
const createError = (module: string, action: string, error?: unknown) =>
  `[${module}] ${action}${error ? `: ${error}` : ''}`;
```

---

### 4.4 Potential Memory Leak in Teammate Stores

**Location:** `app/stores/useTeamStore.ts:162-170`

```typescript
const cleanup = () => {
  Object.values(teammateUnsubscribes.value).forEach((unsubscribe) => {
    if (unsubscribe) unsubscribe();
  });
  teammateUnsubscribes.value = {};
  teammateStores.value = {};
};
```

**Issue:** `cleanup` is defined but may not be called on all relevant lifecycle events (logout, navigation away, HMR).

**Recommendation:** Register cleanup with Nuxt hooks:

```typescript
onNuxtReady(() => {
  // ... setup
  useNuxtApp().hook('app:error', cleanup);
  useNuxtApp().hook('page:finish', () => {
    // Check if still on team page, else cleanup
  });
});
```

---

### 4.5 Async Component Loading for Small Components

**Location:** `app/features/tasks/TaskCard.vue`

```typescript
const TaskInfo = defineAsyncComponent(() => import('./TaskInfo.vue'));
const QuestKeys = defineAsyncComponent(() => import('./QuestKeys.vue'));
const QuestObjectives = defineAsyncComponent(() => import('./QuestObjectives.vue'));
const TaskActions = defineAsyncComponent(() => import('./TaskActions.vue'));
```

**Issue:** For components that are always shown (TaskInfo, TaskActions), async loading adds unnecessary HTTP requests and delay.

**Recommendation:** Only use `defineAsyncComponent` for conditionally rendered or large components:

```typescript
import TaskInfo from './TaskInfo.vue';
import TaskActions from './TaskActions.vue';
const QuestKeys = defineAsyncComponent(() => import('./QuestKeys.vue')); // Conditional
```

---

### 4.6 i18n Message Keys Not Typed

**Location:** All components using `$t()` or `t()`

i18n keys are plain strings without type checking:

```typescript
t('page.team.card.manageteam.membercard.kick_error');
```

**Issue:** Typos in translation keys aren't caught until runtime.

**Recommendation:** Generate types from locale files:

```typescript
// types/i18n.d.ts (auto-generated)
type MessageKeys =
  | 'page.team.card.manageteam.membercard.kick_error'
  | 'page.team.card.manageteam.membercard.owner';
// ...

declare module 'vue-i18n' {
  export interface DefineLocaleMessage {
    [key: MessageKeys]: string;
  }
}
```

---

## 5. Deferred/Known Issues

### 5.1 Full-State Sync (Previously Identified)

**Status:** Deferred  
**Reason:** Requires DB schema changes (`updated_at` field), dirty tracking, and conflict resolution.

---

## 6. Architecture Recommendations

### 6.1 Consider Feature Slicing for Stores

Current structure has global stores that mix concerns. Consider feature-based store organization:

```
stores/
  progress/
    useProgressStore.ts      # Orchestration
    useTaskProgress.ts       # Task-specific
    useHideoutProgress.ts    # Hideout-specific
  team/
    useTeamStore.ts
    useTeammateStores.ts
  metadata/
    useMetadataStore.ts
```

### 6.2 Introduce a Service Layer

Business logic is scattered across stores, composables, and components. Consider:

```
services/
  progressService.ts    # Progress CRUD operations
  syncService.ts        # Supabase sync orchestration
  teamService.ts        # Team management
```

### 6.3 Consider Pinia Colada for Data Fetching

The current caching solution in `tarkovCache.ts` is custom. Consider using [Pinia Colada](https://pinia-colada.esm.dev/) for:

- Automatic cache invalidation
- Background refetching
- Optimistic updates
- Better TypeScript integration

---

## 7. Performance Recommendations

### 7.1 Virtual Scrolling for Task Lists

**Location:** `app/pages/tasks.vue`

With 250+ tasks, rendering all TaskCards causes:

- Long initial render time
- Memory bloat
- Janky scrolling on lower-end devices

**Recommendation:** Use virtual scrolling:

```vue
<template>
  <VirtualList :items="visibleTasks" :size="150">
    <template #default="{ item }">
      <TaskCard :task="item" />
    </template>
  </VirtualList>
</template>
```

### 7.2 Memoize Expensive Computed Properties

**Location:** `app/stores/useProgress.ts`

The `unlockedTasks` computed iterates all tasks × all team members on every state change.

**Recommendation:** Add memoization:

```typescript
import { computed } from 'vue';
import { useMemoize } from '@vueuse/core';

const calculateUnlockedTasks = useMemoize(
  (tasks, teamData) => {
    // expensive calculation
  },
  {
    getKey: (tasks, teamData) => `${tasks.length}-${JSON.stringify(Object.keys(teamData))}`,
  }
);
```

### 7.3 Lazy Load Heavy Libraries

D3 and Graphology are bundled in `vendor-d3` and `vendor-graphology` chunks but loaded immediately.

**Recommendation:** Lazy load on first use:

```typescript
const loadGraphology = () => import('graphology');

export async function createGraph() {
  const { default: Graph } = await loadGraphology();
  return new Graph();
}
```

---

## 8. Security Recommendations

### 8.1 Rate Limiting on Frontend Actions

**Current:** Only Cloudflare Workers have rate limiting.

**Recommendation:** Add client-side rate limiting for sensitive actions:

```typescript
const rateLimiter = useRateLimit({
  'task:complete': { limit: 60, window: 60000 },
  'hideout:upgrade': { limit: 30, window: 60000 },
});

const markTaskComplete = async (taskId: string) => {
  if (!rateLimiter.check('task:complete')) {
    toast.add({ title: 'Too many requests', color: 'warning' });
    return;
  }
  // ...
};
```

### 8.2 Sanitize User Display Names

**Location:** `app/features/team/MyTeam.vue:142`

Display names are stored and displayed without sanitization:

```typescript
const trimmedName = displayName.value.trim().substring(0, 15);
tarkovStore.setDisplayName(trimmedName);
```

**Recommendation:** Add XSS sanitization:

```typescript
import DOMPurify from 'dompurify';

const sanitizedName = DOMPurify.sanitize(trimmedName, { ALLOWED_TAGS: [] });
```

### 8.3 Validate Team Join Codes Client-Side

**Location:** Team join flow

Join codes should be validated for format before sending to server:

```typescript
const isValidJoinCode = (code: string) => /^[A-Za-z0-9]{4,255}$/.test(code);
```

---

## 9. Code Quality Recommendations

### 9.1 Add JSDoc to Public APIs

Many exported functions lack documentation:

```typescript
// Current
export function useGraphBuilder() { ... }

// Recommended
/**
 * Composable for building task and hideout dependency graphs.
 * Used by MetadataStore to process raw API data into navigable graphs.
 *
 * @returns Object containing graph building functions
 */
export function useGraphBuilder() { ... }
```

### 9.2 Standardize Event Naming

Current events mix naming conventions:

- `@on-task-action`
- `@complete`
- `@uncomplete`

**Recommendation:** Use Vue's recommended past-tense naming:

- `@task-completed`
- `@task-uncompleted`
- `@task-unlocked`

### 9.3 Extract UI Patterns to Composables

Several components repeat the same patterns:

- Loading state management
- Toast notifications
- Error handling

**Recommendation:** Create reusable composables:

```typescript
export function useAsyncAction<T>(
  action: () => Promise<T>,
  options: {
    loadingRef?: Ref<boolean>;
    successMessage?: string;
    errorMessage?: string;
  }
) { ... }
```

---

## 10. TODOs and Incomplete Implementations

### Found TODOs

| Location                  | Line | Description                                |
| ------------------------- | ---- | ------------------------------------------ |
| `AccountDeletionCard.vue` | 275  | Implement Supabase account deletion        |
| `TeamInvite.vue`          | 36   | Cloudflare functions replacement           |
| `TeamInvite.vue`          | 56   | Supabase team joining logic                |
| `MyTeam.vue`              | 121  | Team functions moved to Cloudflare Workers |
| `TeamMemberCard.vue`      | 94   | Team member management replacement         |
| `TeamMemberCard.vue`      | 148  | Cloudflare Workers for kicking             |
| `AppBar.vue`              | 116  | Data error handling                        |
| `HideoutCard.vue`         | 306  | Skill level tracking                       |
| `HideoutCard.vue`         | 311  | Trader loyalty tracking                    |

### Missing Features

1. **Scav Karma Tracking** - Noted in `EXCLUDED_SCAV_KARMA_TASKS`
2. **Skill Level Tracking** - No UI or state for character skills
3. **Trader Reputation Tracking** - No UI or state for rep values
4. **Task Search** - No full-text search for tasks
5. **Offline Support** - No service worker or offline-first capability
6. **Push Notifications** - No notification system for team activity

---

## Summary Statistics

| Category               | Count |
| ---------------------- | ----- |
| Critical Issues        | 3     |
| High Priority Issues   | 5     |
| Medium Priority Issues | 7     |
| Low Priority Issues    | 6     |
| TODOs Found            | 9     |
| Console Statements     | 50+   |

---

## Next Steps Priority

1. **Immediate (This Sprint)**
   - Fix CORS wildcard in edge functions
   - Complete team feature integration
   - Gate console.log statements with dev check

2. **Short Term (Next 2 Sprints)**
   - Implement account deletion
   - Add skill/trader tracking
   - Add TypeScript to remaining components

3. **Medium Term (Next Quarter)**
   - Virtual scrolling for task lists
   - Implement dirty-field sync
   - Refactor stores into feature slices

4. **Long Term (Backlog)**
   - Offline support
   - Push notifications
   - Scav karma tracking

---

_This analysis was generated by comprehensive code review. Some issues may have been addressed since the last file reads. Always verify against the current codebase before implementing fixes._
