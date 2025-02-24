export function isObject(item: unknown): item is Record<string, unknown> {
  return item !== null && typeof item === 'object' && !Array.isArray(item);
}

export function deepMerge<T extends object, U extends object>(
  target: T,
  source: U
): T & U {
  const output = { ...target } as any;

  if (!source) return output;

  for (const [key, value] of Object.entries(source)) {
    if (!isObject(value)) {
      output[key] = value;
      continue;
    }

    output[key] = deepMerge(isObject(output[key]) ? output[key] : {}, value);
  }

  return output;
}
