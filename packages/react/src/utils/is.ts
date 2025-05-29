/**
 * Performs a deep equality check between two values (primitive, array, plain object).
 * - Functions are compared by reference.
 * - No circular reference support.
 * - Returns true if deeply equal, false otherwise.
 */
export function isEqual(a: unknown, b: unknown): boolean {
  // Check for strict equality first (handles primitives and reference equality)
  if (a === b) {
    return true;
  }

  // Handle null cases
  if (a === null || b === null) {
    return a === b;
  }

  // Compare types
  if (typeof a !== typeof b) {
    return false;
  }

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      if (!isEqual(a[i], b[i])) {
        return false;
      }
    }

    return true;
  }

  // If one is array and the other is not
  if (Array.isArray(a) || Array.isArray(b)) {
    return false;
  }

  // Handle objects (but not functions)
  if (typeof a === 'object' && typeof b === 'object') {
    const aKeys = Object.keys(a as object);
    const bKeys = Object.keys(b as object);
    if (aKeys.length !== bKeys.length) {
      return false;
    }

    for (const key of aKeys) {
      // Use Object.prototype.hasOwnProperty.call to be safe
      if (!Object.prototype.hasOwnProperty.call(b, key)) {
        return false;
      }

      if (
        !isEqual(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key]
        )
      ) {
        return false;
      }
    }

    return true;
  }

  // Fallback for functions, symbols, etc. (compare by reference)
  return false;
}
