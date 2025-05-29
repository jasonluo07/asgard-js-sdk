export function extractRefs(obj: unknown): unknown[] {
  const refs: unknown[] = [];

  function traverse(o: unknown): void {
    if (o && typeof o === 'object') {
      if (Array.isArray(o)) {
        for (const item of o) traverse(item);
      } else {
        for (const key of Object.keys(o))
          traverse((o as Record<string, unknown>)[key]);
      }
    } else {
      refs.push(o);
    }
  }

  traverse(obj);

  return refs;
}
