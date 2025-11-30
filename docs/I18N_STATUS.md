# i18n Status

## Locale Files

All 6 locales in `app/locales/`:

- `en.json5` - English (primary)
- `de.json5` - German
- `es.json5` - Spanish
- `fr.json5` - French
- `ru.json5` - Russian
- `uk.json5` - Ukrainian

## Configuration

Warnings are suppressed in production (`app/plugins/i18n.client.ts`). Missing keys render as raw strings.

## Debugging Missing Keys

Temporarily enable warnings in `app/plugins/i18n.client.ts`:

```typescript
silentTranslationWarn: false,
missingWarn: true,
```
