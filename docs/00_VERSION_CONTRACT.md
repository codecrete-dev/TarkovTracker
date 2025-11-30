# Frontend Version Contract

**Last Updated**: 2025-11-25
**Status**: ENFORCED

## Game Mode Policy

**Supported Game Modes**: `'pvp'` and `'pve'` **ONLY**
**Implementation**: App supports two separate, independent game modes with separate progress tracking
**Schema Constraint**: Database CHECK constraints must use `IN ('pvp', 'pve')`

## Core Stack (Required Versions)

- **Nuxt**: ^4.2.1
- **@nuxt/ui**: ^4.2.0
- **Tailwind CSS**: ^4.1.17
- **Node**: 22.x

## Source of Truth (Documentation)

- **Nuxt UI**: Follow @nuxt/ui v4 docs only (https://ui.nuxt.com)
- **Tailwind**: Follow Tailwind v4 docs (CSS-first `@import "tailwindcss";` config)
- **Forbidden**: No use of Nuxt UI v2/v3 docs or Tailwind v2/v3 patterns

## Layout & Styling Rules

### Tailwind Usage

- **Layout** (flex/grid/spacing): Tailwind utilities inline are allowed
- **Colors/typography/semantic tokens**: MUST go through Tailwind v4 theme layer
- **NO** one-off inline color classes like `text-[#123456]` except documented exceptions

### Theme Configuration

- Colors defined in `app/assets/css/tailwind.css` using `@theme {}` block
- Use CSS custom properties: `--color-primary-500`, `--color-background`, etc.
- Reference via Tailwind classes: `bg-primary-500`, `text-background`

## Anti-Patterns (Forbidden)

- ❌ `tailwind.config.js` or `content: [...]` (v3-style config)
- ❌ `import { useUI } from '@nuxt/ui'` (older version APIs)
- ❌ Code from Nuxt UI v2/v3 examples
- ❌ Components that don't match design tokens

## Compliance Verification

```bash
# Check Tailwind v4 setup
grep -r "@import \"tailwindcss\"" app/assets/css/
# Check for forbidden v3 config (should return nothing)
find . -name "tailwind.config.js" -o -name "tailwind.config.ts"
# Check for forbidden inline hex colors (should return nothing)
grep -r "text-\[#[0-9a-fA-F]\+\]\|bg-\[#[0-9a-fA-F]\+\]" app/ --include="*.vue"
```

## Amendment Process

This contract can be amended if:

1. A technical limitation is discovered
2. Nuxt/Tailwind releases breaking changes
3. Team consensus agrees on a better approach
