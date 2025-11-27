export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;
  const debounced = (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  return debounced as T & { cancel: () => void };
}
/**
 * Simple object path getter to replace lodash get
 */
export function get(obj: Record<string, unknown>, path: string, defaultValue?: unknown): unknown {
  if (path === ".") return obj;
  const keys = path.split(".");
  let result: unknown = obj;
  for (const key of keys) {
    if (result && typeof result === "object" && key in (result as Record<string, unknown>)) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return defaultValue;
    }
  }
  return result;
}
/**
 * Simple object path setter to replace lodash set
 */
export function set(obj: Record<string, unknown>, path: string, value: unknown): void {
  if (path === ".") {
    Object.assign(obj, value as Record<string, unknown>);
    return;
  }
  const keys = path.split(".");
  const lastKey = keys.pop()!;
  let current: Record<string, unknown> = obj;
  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[lastKey] = value;
}
