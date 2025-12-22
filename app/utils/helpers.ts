/**
 * Creates a debounced version of a function that delays execution until after
 * `wait` milliseconds have elapsed since the last call.
 *
 * Note: The debounced function does not return a value since execution is deferred.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeout: ReturnType<typeof setTimeout> | null = null;
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
  return debounced;
}
/**
 * Parse a path string into segments, handling both dot notation and bracket notation.
 * Supports: "a.b.c", "items[0].name", "items.0.name", "a[0][1].b"
 *
 * @throws Error if quoted bracket keys are detected (e.g., items["key"] or items['key'])
 * @limitation Only numeric bracket indices are supported (e.g., items[0]).
 * Quoted string keys like items["key"] or items['key'] are NOT supported.
 * Use dot notation for string keys: items.key
 */
function parsePath(path: string): string[] {
  if (!path || path === '.') return [];
  // Detect unsupported quoted bracket patterns and throw a clear error
  if (/\[(?:'[^']*'|"[^"]*")\]/.test(path)) {
    throw new Error(
      `parsePath: quoted bracket keys are not supported: "${path}". Use dot notation instead (e.g., items.key)`
    );
  }
  // Detect consecutive dots which indicate a malformed path
  if (/\.\./.test(path)) {
    throw new Error(
      `parsePath: Malformed path "${path}" contains consecutive dots. Use single dots for separation (e.g., "a.b.c").`
    );
  }
  // Replace numeric bracket notation with dot notation, then split
  // "items[0].name" -> "items.0.name" -> ["items", "0", "name"]
  const normalized = path.replace(/\[(\d+)\]/g, '.$1').replace(/^\./, '');
  return normalized.split('.').filter((segment) => segment !== '');
}
/**
 * Check if a string represents a non-negative integer (array index)
 */
function isArrayIndex(segment: string): boolean {
  return /^\d+$/.test(segment);
}
/**
 * Get a value from an object by path.
 * Supports dot notation ("a.b.c") and array index notation ("items[0].name" or "items.0.name").
 *
 * @param obj - The object to traverse
 * @param path - The path string (use '.' or '' to return the object itself)
 * @param defaultValue - Value to return if path doesn't exist
 * @returns The value at path or defaultValue
 */
export function get(obj: Record<string, unknown>, path: string, defaultValue?: unknown): unknown {
  if (path === '.' || path === '') return obj;
  const keys = parsePath(path);
  let result: unknown = obj;
  for (const key of keys) {
    if (result == null) {
      return defaultValue;
    }
    if (Array.isArray(result)) {
      if (!isArrayIndex(key)) {
        return defaultValue;
      }
      const index = parseInt(key, 10);
      if (index < 0 || index >= result.length) {
        return defaultValue;
      }
      result = result[index];
    } else if (typeof result === 'object') {
      if (!(key in (result as Record<string, unknown>))) {
        return defaultValue;
      }
      result = (result as Record<string, unknown>)[key];
    } else {
      return defaultValue;
    }
  }
  return result;
}
/**
 * Set a value on an object by path.
 * Supports dot notation ("a.b.c") and array index notation ("items[0].name" or "items.0.name").
 * Creates intermediate objects/arrays as needed (sparse arrays for large indices).
 *
 * @param obj - The object to modify
 * @param path - The path string (use '.' or '' to Object.assign value onto obj)
 * @param value - The value to set
 * @throws TypeError if path '.' is used with non-object value
 * @throws TypeError if trying to traverse through a primitive (non-object/non-array)
 */
export function set(obj: Record<string, unknown>, path: string, value: unknown): void {
  if (path === '.' || path === '') {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new TypeError(
        `set(): Cannot use Object.assign with path '${path}' when value is ${
          value === null ? 'null' : Array.isArray(value) ? 'Array' : typeof value
        }. Expected a non-null plain object.`
      );
    }
    Object.assign(obj, value);
    return;
  }
  const keys = parsePath(path);
  // Safe: keys is guaranteed non-empty because early returns cover path === '.' and path === '',
  // and parsePath's normalization + consecutive-dots check (lines 42-46) ensure any other valid
  // path produces at least one non-empty segment after splitting
  const lastKey = keys[keys.length - 1] as string;
  let current: Record<string, unknown> | unknown[] = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    // Safe assertion: loop condition guarantees i < keys.length - 1,
    // and keys array is non-empty, so keys[i] is always defined.
    // The 'as string' is to satisfy TypeScript's type system.
    const key = keys[i] as string;
    const nextKey = keys[i + 1] as string;
    const nextIsArrayIndex = isArrayIndex(nextKey);
    const traversedPath = keys.slice(0, i).join('.') || '(root)';
    if (Array.isArray(current)) {
      if (!isArrayIndex(key)) {
        throw new TypeError(
          `set(): Cannot use non-numeric key '${key}' on array at path '${traversedPath}'. Full path: '${path}'`
        );
      }
      const index = parseInt(key, 10);
      // Check if there's a primitive at this index that we can't traverse into
      if (current[index] != null && typeof current[index] !== 'object') {
        const currentPath = keys.slice(0, i + 1).join('.');
        throw new TypeError(
          `set(): Cannot create property '${nextKey}' on ${typeof current[index]} at path '${currentPath}'. Full path: '${path}'`
        );
      }
      // Validate type of existing object against next key requirement
      if (current[index] != null && typeof current[index] === 'object') {
        const isArray = Array.isArray(current[index]);
        if (nextIsArrayIndex && !isArray) {
          const currentPath = keys.slice(0, i + 1).join('.');
          throw new TypeError(
            `set(): Expected array at '${currentPath}' for index '${nextKey}' but found object. Full path: '${path}'`
          );
        }
        if (!nextIsArrayIndex && isArray) {
          const currentPath = keys.slice(0, i + 1).join('.');
          throw new TypeError(
            `set(): Expected object at '${currentPath}' for key '${nextKey}' but found array. Full path: '${path}'`
          );
        }
      }
      // Use direct assignment for sparse array (avoid O(n) fill with push loop)
      if (current[index] == null) {
        current[index] = nextIsArrayIndex ? [] : {};
      }
      current = current[index] as Record<string, unknown> | unknown[];
    } else if (typeof current === 'object' && current !== null) {
      const currentObj = current as Record<string, unknown>;
      if (key in currentObj && currentObj[key] != null && typeof currentObj[key] === 'object') {
        // Validate existing value type
        const isArray = Array.isArray(currentObj[key]);
        if (nextIsArrayIndex && !isArray) {
          const currentPath = keys.slice(0, i + 1).join('.');
          throw new TypeError(
            `set(): Expected array at '${currentPath}' for index '${nextKey}' but found object. Full path: '${path}'`
          );
        }
        if (!nextIsArrayIndex && isArray) {
          const currentPath = keys.slice(0, i + 1).join('.');
          throw new TypeError(
            `set(): Expected object at '${currentPath}' for key '${nextKey}' but found array. Full path: '${path}'`
          );
        }
      } else if (
        key in currentObj &&
        currentObj[key] != null &&
        typeof currentObj[key] !== 'object'
      ) {
        // Primitive check
        const currentPath = keys.slice(0, i + 1).join('.');
        throw new TypeError(
          `set(): Cannot create property '${nextKey}' on ${typeof currentObj[key]} at path '${currentPath}'. Full path: '${path}'`
        );
      }
      if (!(key in currentObj) || currentObj[key] == null) {
        currentObj[key] = nextIsArrayIndex ? [] : {};
      }
      current = currentObj[key] as Record<string, unknown> | unknown[];
    } else {
      throw new TypeError(
        `set(): Cannot traverse into ${current === null ? 'null' : typeof current} at path '${traversedPath}'. Full path: '${path}'`
      );
    }
  }
  // Set the final value using direct assignment (sparse array for large indices)
  if (Array.isArray(current)) {
    if (!isArrayIndex(lastKey)) {
      throw new TypeError(
        `set(): Cannot use non-numeric key '${lastKey}' on array. Full path: '${path}'`
      );
    }
    const index = parseInt(lastKey, 10);
    // Direct assignment creates sparse array - no need to fill with undefined
    current[index] = value;
  } else {
    (current as Record<string, unknown>)[lastKey] = value;
  }
}
/**
 * Simple delay utility for async operations
 * @param ms - Milliseconds to wait
 * @returns Promise that resolves after the delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Normalizes objectives to always return an array.
 * Handles cases where objectives might be an object (with numeric or string keys) or already an array.
 * Filters out any null/undefined entries.
 *
 * @param objectives - Objectives in unknown format (array, object, or other)
 * @returns Array of T, guaranteed to be an array (empty if invalid input)
 */
export function normalizeTaskObjectives<T = unknown>(objectives: unknown): T[] {
  if (Array.isArray(objectives)) {
    return objectives.filter(Boolean) as T[];
  }
  if (objectives && typeof objectives === 'object') {
    if (import.meta.env.DEV) {
      console.debug('[DEV] Normalized non-array objectives to array format');
    }
    return Object.values(objectives as Record<string, T>).filter(Boolean) as T[];
  }
  if (import.meta.env.DEV && objectives !== null && objectives !== undefined) {
    console.warn('[DEV] Task objectives in unexpected format, returning empty array', objectives);
  }
  return [];
}
