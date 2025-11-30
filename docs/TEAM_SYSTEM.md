# Team System Architecture

## Overview

Team features use a two-tier architecture:

1. **Cloudflare Worker** (`workers/team-gateway/`) - Rate limiting and abuse prevention
2. **Supabase Edge Functions** - Business logic and database mutations

## Components

### Cloudflare Worker (`team-gateway`)

- Proxies to Supabase Edge Functions: `team-create`, `team-join`, `team-leave`, `team-kick`
- KV-backed rate limits per IP+user
- KV namespace ID: `f3f56d4879694eee9b9de1e43db252d6`

### Supabase Edge Functions

Located in `supabase/functions/`:

- `team-create` - Team creation with validation
- `team-join` - Password validation, capacity checks
- `team-leave` - Cooldown enforcement
- `team-kick` - Owner-only member removal

## Rate Limits

| Action | Limit            |
| ------ | ---------------- |
| create | 10/hour/ip+user  |
| join   | 30/10min/ip+user |
| leave  | 30/hour/ip+user  |
| kick   | 20/hour/ip+user  |

## Deployment

### Worker

```sh
cd workers/team-gateway
npx wrangler deploy
```

Required secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `ALLOWED_ORIGIN`

### Edge Functions

```sh
supabase functions deploy
```

## Client Configuration

Set `NUXT_PUBLIC_TEAM_GATEWAY_URL` to the Worker URL. Falls back to direct Supabase if unset.
