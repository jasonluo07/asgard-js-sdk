export function isEqual(value: unknown, other: unknown): boolean {
  if (typeof value !== 'object' && typeof other !== 'object') {
    return Object.is(value, other);
  }

  if (value === null && other === null) {
    return true;
  }

  if (typeof value !== typeof other) {
    return false;
  }

  if (value === other) {
    return true;
  }

  if (Array.isArray(value) && Array.isArray(other)) {
    if (value.length !== other.length) {
      return false;
    }

    for (let i = 0; i < value.length; i++) {
      if (!isEqual(value[i], other[i])) {
        return false;
      }
    }

    return true;
  }

  if (Array.isArray(value) || Array.isArray(other)) {
    return false;
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    typeof other === 'object' &&
    other !== null
  ) {
    const valueKeys = Object.keys(value as object);
    const otherKeys = Object.keys(other as object);

    if (valueKeys.length !== otherKeys.length) {
      return false;
    }

    for (const key of valueKeys) {
      if (!(key in (other as object))) {
        return false;
      }

      if (
        !isEqual(
          (value as Record<string, unknown>)[key],
          (other as Record<string, unknown>)[key]
        )
      ) {
        return false;
      }
    }

    return true;
  }

  return false;
}
