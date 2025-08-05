export function isObject(item: unknown): item is Record<string, unknown> {
  return item !== null && typeof item === 'object' && !Array.isArray(item);
}

export function deepMerge<T extends Record<string, unknown>, U extends Record<string, unknown>>(
  target: T,
  source: U
): T & U {
  const output = { ...target } as T & U;

  if (!source) return output;

  for (const [key, value] of Object.entries(source)) {
    if (!isObject(value)) {
      (output as Record<string, unknown>)[key] = value;
      continue;
    }

    (output as Record<string, unknown>)[key] = deepMerge(
      isObject((output as Record<string, unknown>)[key]) ? (output as Record<string, unknown>)[key] as Record<string, unknown> : {}, 
      value as Record<string, unknown>
    );
  }

  return output;
}
