# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TarkovTracker is a Nuxt 3-based web application for tracking progress in Escape from Tarkov. It supports both PvP and PvE game modes, team collaboration, and synchronizes user progress through Supabase.

## Key Commands

### Development
```bash
npm run dev              # Start development server on http://localhost:3000
npm run build            # Build for production
npm run preview          # Preview production build locally
npm install              # Install dependencies (runs postinstall: nuxt prepare)
```

### Code Quality
```bash
npx eslint .             # Run ESLint on the codebase
npx vitest               # Run tests (if configured)
```

## Architecture

### Application Structure

**SPA Mode**: This is a client-side only application (`ssr: false` in nuxt.config.ts). It uses Cloudflare Pages for deployment.

**Source Directory**: All application code lives in the `app/` directory (configured via `srcDir: "app"`)

### State Management Architecture

The application uses a **three-store Pinia architecture**:

1. **`stores/tarkov.ts`** (Main Store): Tracks game progress (tasks, hideout, levels, etc.) for both PvP and PvE modes
   - Uses `shared_state.ts` for core state structure and actions
   - Implements game mode switching with `switchGameMode(mode)`
   - Auto-migrates legacy data structures via `migrateDataIfNeeded()`
   - Syncs to Supabase `user_progress` table when authenticated

2. **`stores/user.ts`** (User Preferences): UI preferences, view settings, tip visibility, streamer mode
   - Syncs to Supabase `user_preferences` table when authenticated
   - Does NOT store game progress data

3. **`stores/progress.ts`** (Computed Aggregations): Read-only store that aggregates data from tarkov store + team stores
   - Computes task completions across team members
   - Provides unified interface for accessing self + teammate progress
   - Uses `useTeamStore` to manage teammate stores dynamically

### Game Mode System

The app supports **dual game modes** (PvP and PvE) with separate progress tracking:

- State structure: `{ currentGameMode: 'pvp' | 'pve', pvp: {...}, pve: {...} }`
- Constants defined in `app/utils/constants.ts`: `GAME_MODES.PVP` and `GAME_MODES.PVE`
- API game mode mapping: PVP → "regular", PVE → "pve" (via `API_GAME_MODES`)
- Each mode tracks: level, faction, taskCompletions, taskObjectives, hideoutModules, hideoutParts
- Users can switch modes via `GameModeSelector.vue` component

### Data Synchronization

**Supabase Integration** (`app/composables/supabase/`):
- `useSupabaseSync.ts`: Debounced two-way sync between Pinia stores and Supabase tables
- `useSupabaseListener.ts`: Real-time listeners for team updates via Supabase realtime
- Auth handled in `app/plugins/supabase.client.ts` with OAuth (Discord, Twitch)
- Main tables: `user_progress`, `user_preferences`, `teams`, `team_memberships`

**Migration System**:
- `useDataMigration.ts`: Handles legacy data structure migrations
- `migrateToGameModeStructure()` in `shared_state.ts`: Converts old single-mode state to dual PvP/PvE structure

### External Data Sources

**GraphQL API** (tarkov.dev):
- Apollo Client configured in `app/plugins/apollo.ts`
- Queries defined in `app/composables/api/useTarkovApi.ts`
- Fetches: tasks, hideout stations, maps, traders, player levels
- Data processing in `app/composables/data/` (useTaskData, useHideoutData, useMapData)

**Tarkov Data System**:
- `app/composables/tarkovdata.ts`: Central composable that initializes and exports all game data
- Uses graph structures (via `graphology`) for task dependencies
- Filters Scav Karma tasks via `EXCLUDED_SCAV_KARMA_TASKS` constant (tasks excluded until Fence Rep system is implemented)
- Exports: tasks, objectives, hideoutStations, maps, traders, etc.

### Component Organization

**Auto-imported components** from two locations:
- `app/components/`: General components
- `app/features/`: Feature-specific components (organized by domain: tasks, hideout, team, settings, etc.)

Components are auto-imported without path prefix (`pathPrefix: false`), so `features/tasks/TaskCard.vue` is used as `<TaskCard />`.

### Plugin System

Plugins in `app/plugins/` initialize core functionality:
- `apollo.ts`: GraphQL client for tarkov.dev API
- `supabase.client.ts`: Auth and database client
- `vuetify.client.ts`: Material Design component library
- `store-initializer.ts`: Initializes Pinia stores and data migration
- `pinia.client.ts`: Pinia instance creation

### TypeScript Configuration

Aliases configured in both `nuxt.config.ts` and tsconfig:
- `@/` and `~/` both resolve to `app/` directory
- Use these aliases consistently for imports

## Important Patterns

### Accessing Supabase
```typescript
const { $supabase } = useNuxtApp();
// Check auth: $supabase.user.loggedIn
// Get user ID: $supabase.user.id
// Database: $supabase.client.from('table')
```

### Accessing Apollo Client
```typescript
const { $apollo } = useNuxtApp();
// Or use composables from @vue/apollo-composable
```

### Game Mode Data Access
```typescript
const store = useTarkovStore();
const currentMode = store.currentGameMode; // 'pvp' or 'pve'
const currentData = store[currentMode]; // Access mode-specific data
```

### Working with Progress Store
```typescript
const progressStore = useProgressStore();
// Access team-wide completions
const completions = progressStore.tasksCompletions;
// completions[taskId][teamId] = boolean
```

## Data Flow

1. **Initial Load**:
   - `app.vue` calls `useTarkovData()` to fetch game data from tarkov.dev API
   - `store-initializer.ts` runs during plugin setup to hydrate stores from Supabase
   - Auth state is initialized via `supabase.client.ts` plugin

2. **User Interactions**:
   - UI components update Pinia stores
   - `useSupabaseSync` watches for store changes (debounced)
   - Changes are automatically persisted to Supabase if authenticated

3. **Team Collaboration**:
   - `useSupabaseListener` listens for team member changes
   - Creates dynamic Pinia stores for each teammate
   - `progressStore` aggregates data across all team stores

## Testing

The project includes `@nuxt/test-utils` and `vitest` but test configuration may need verification. Check for `vitest.config.ts` or test files in `app/composables/__tests__/`.

## Deployment

Configured for Cloudflare Pages (`nitro.preset: "cloudflare-pages"`). The build creates static assets in `dist/` directory.

## Environment Variables

Required for Supabase integration:
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key

These are accessed via `import.meta.env` in client-side code.
