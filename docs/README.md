# TarkovTracker Documentation

## Core Stack

- **Nuxt**: 4.2.1
- **@nuxt/ui**: 4.2.0
- **Tailwind CSS**: 4.1.17 (CSS-first config)
- **Supabase**: Auth + Database
- **Pinia**: State management with localStorage persistence
  See `00_VERSION_CONTRACT.md` for detailed requirements.

## Project Structure

```
app/
├── app.vue          # Root wrapper (see APP_STRUCTURE.md)
├── layouts/         # Nuxt page layouts
├── shell/           # App chrome (header, nav, footer)
├── pages/           # File-based routing
├── features/        # Feature-specific components
├── components/      # Shared UI components
├── stores/          # Pinia stores
├── composables/     # Composition utilities
├── plugins/         # Nuxt plugins
├── locales/         # i18n translations
└── assets/css/      # Tailwind theme
```

See `APP_STRUCTURE.md` for detailed explanation of app.vue, layouts, and shell components.

## Development

```bash
npm run dev      # Start dev server
npm run build    # Production build
npx vitest       # Run tests
npx eslint app   # Lint code
```

## Documentation Index

| File                                | Purpose                                      |
| ----------------------------------- | -------------------------------------------- |
| `00_VERSION_CONTRACT.md`            | Stack requirements and patterns              |
| `APP_STRUCTURE.md`                  | App organization (app.vue, layouts, shell)   |
| `BACKEND_STATUS.md`                 | Backend integration status                   |
| `I18N_STATUS.md`                    | Translation system                           |
| `TEAM_SYSTEM.md`                    | Team architecture (Workers + Edge Functions) |
| `Analysis/CONSOLIDATED_ANALYSIS.md` | Verified architectural issues and priorities |

--- DO NOT TOUCH ANY OF THIS FILE CONENT BELOW HERE, IT IS MANUALLY MAINTAINED ---

# PERSONAL NOTES AND THOUGHTS, IDEAS, etc.

- Finish implementing Team System (Supabase Realtime) and Cloudflare Workers.
- Figure out the best way to handle the open source API from the original TarkovTracker project and if there is better alternatives to NodeJS / Express for that service.
- Finish fixing the Settings page UI/UX and ensure ALL settings are visible to unauthenticated users while restricting what they can and cant do.
- Improve the i18n system to allow for easier translations and community contributions.
- Explore adding a PWA mode for offline tracking and notifications.
- Consider adding a donation or sponsorship system to help fund server costs.
- Regularly review and update dependencies to ensure security and performance.
- Audit the codebase for performance bottlenecks and optimize as needed.
- Plan for future features like raid analytics, gear recommendations, and more based on user feedback.
- Keep documentation up to date with any architectural changes or new features.
- Fix the initial loading performance issues as currently while loading the app it freezes for a few seconds before becoming responsive showing a blank white screen while caching and fetching data for the first visit.
- Try to find ways to consolidate the core API data and filtering logic to prevent issues like a task being filtered out of the users view but the needed items still being dispalyed and counted.
- Look into implementing better error handling and user feedback for network issues or data sync problems.
- Find out if the data migration system is still needed or if it can be refactored / reworked to work properly without potentially corrupting user data on import from .io or .org versions.
- Explore adding more detailed logging and analytics to track user behavior and app performance.
- Finish organizing the codebase to make it easier for new contributors to understand and navigate and maintain long term.
- Remove excess comments and dead code to clean up the codebase.
- Reduce abstractions, unnecessary composables, and over-engineering to simplify the codebase.
- Refactor large files into smaller, more manageable modules.
- Standardize coding styles and conventions across the codebase.
- Improve test coverage to ensure reliability and catch regressions early.
- Set up continuous integration and deployment (CI/CD) pipelines for automated testing and deployment.
- Regularly review and update the documentation to reflect the current state of the project.
  --- DO NOT TOUCH ANY OF THIS FILE CONENT ABOVE HERE, IT IS MANUALLY MAINTAINED ---
