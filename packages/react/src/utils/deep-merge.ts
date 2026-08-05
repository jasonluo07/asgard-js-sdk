export function isObject(item: unknown): item is Record<string, unknown> {
  return item !== null && typeof item === 'object' && !Array.isArray(item);
}

export function deepMerge<T extends Record<string, unknown>, U extends Record<string, unknown>>(
  target: T,
  source: U,
): T & U {
  const output = { ...target } as T & U;

  if (!source) return output;

  for (const [key, value] of Object.entries(source)) {
    // `undefined` means "this layer has no opinion", not "clear the layer below". Without this guard
    // `Object.entries` still yields keys whose value is `undefined`, and the assignment below wipes the
    // target — which is how the theme system's default layer became unreachable for six colour fields
    // (asgard-sdk-pm#52): the annotations pass builds `{ botMessage: { color: annotations?.…?.color } }`
    // unconditionally, so a provider shipping no annotations overwrote every default with `undefined`.
    if (value === undefined) continue;

    if (!isObject(value)) {
      (output as Record<string, unknown>)[key] = value;
      continue;
    }

    (output as Record<string, unknown>)[key] = deepMerge(
      isObject((output as Record<string, unknown>)[key])
        ? ((output as Record<string, unknown>)[key] as Record<string, unknown>)
        : {},
      value as Record<string, unknown>,
    );
  }

  return output;
}
