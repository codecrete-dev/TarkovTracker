# TarkovTracker System Reference

## Overview

Web app for tracking Escape from Tarkov player progress. Nuxt 3 SPA with Supabase backend, GraphQL API integration, and dual PvP/PvE game mode support.

**Stack**: Nuxt 3 + Vuetify 3 + Pinia + Apollo Client + Supabase

---

## Architecture

### Pinia Stores (3-Store Architecture)

1. **`stores/tarkov.ts`** - Game progress tracking
   - Dual mode state: `{ currentGameMode: 'pvp'|'pve', pvp: {...}, pve: {...} }`
   - Syncs to Supabase `user_progress` table
   - Uses `shared_state.ts` for core structure

2. **`stores/user.ts`** - User preferences (NOT game progress)
   - UI settings, view prefs, streamer mode
   - Syncs to Supabase `user_preferences` table

3. **`stores/progress.ts`** - Read-only computed aggregations
   - Combines self + team progress
   - Uses `useTeamStore` for dynamic teammate stores

- **Dual mode tracking**: PvP and PvE maintain separate progress
- **Constants**: `GAME_MODES.PVP` / `GAME_MODES.PVE` in `app/utils/constants.ts`
- **API mapping**: PVP → "regular", PVE → "pve" (via `API_GAME_MODES`)
- **State structure**: `{ currentGameMode, pvp: {...}, pve: {...} }`
- **Data tracked per mode**: level, faction, taskCompletions, taskObjectives, hideoutModules, hideoutParts

### Data Synchronization

**Supabase** (`app/composables/supabase/`):
- `useSupabaseSync.ts` - Debounced two-way sync (Pinia ↔ Supabase)
- `useSupabaseListener.ts` - Real-time team updates via Supabase realtime
- Tables: `user_progress`, `user_preferences`, `teams`, `team_memberships`

**Data Migration**:
- `useDataMigration.ts` - Handles legacy data structure conversions
- `migrateToGameModeStructure()` in `shared_state.ts` - Single-mode → Dual PvP/PvE

### External APIs

**GraphQL** (tarkov.dev via Apollo Client):
- Plugin: `app/plugins/apollo.ts`
- Queries: `app/composables/api/useTarkovApi.ts`
- Fetches: tasks, hideout stations, maps, traders, player levels

**Tarkov Data**:
- `app/composables/tarkovdata.ts` - Central data composable
- Uses `graphology` for task dependency graphs
- Filters via `EXCLUDED_SCAV_KARMA_TASKS` constant (excluded until Fence Rep tracking is implemented)

---

## Key Patterns

### Accessing Supabase
```typescript
const { $supabase } = useNuxtApp();
// Auth: $supabase.user.loggedIn, $supabase.user.id
// DB: $supabase.client.from('table')
```

### Game Mode Access
```typescript
const store = useTarkovStore();
const currentMode = store.currentGameMode;
const currentData = store[currentMode];
```

### Team Progress
```typescript
const progressStore = useProgressStore();
const completions = progressStore.tasksCompletions; // [taskId][teamId]
```

---

## Key Files

**State Management**:
- `app/shared_state.ts` - Core state structure
- `app/stores/tarkov.ts` - Game progress store
- `app/stores/user.ts` - User preferences
- `app/stores/progress.ts` - Computed aggregations

**Data Services**:
- `app/composables/tarkovdata.ts` - Game data initialization
- `app/composables/data/useTaskData.ts` - Task processing
- `app/composables/data/useHideoutData.ts` - Hideout management
- `app/utils/DataMigrationService.ts` - Legacy data migration

**Types**:
- `app/types/tarkov.ts` - Core domain types
- `app/utils/constants.ts` - Game mode constants

