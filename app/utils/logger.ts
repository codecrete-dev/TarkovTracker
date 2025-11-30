export const logger = {
  debug: (...args: unknown[]) => {
    if (import.meta.dev) console.debug(...args);
  },
  info: (...args: unknown[]) => {
    if (import.meta.dev) console.info(...args);
  },
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};
