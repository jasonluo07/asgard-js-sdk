import { useEffect, useState } from 'react';

export function useDebounce<ValueType>(
  value: ValueType,
  delay?: number
): ValueType {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay ?? 300);

    return (): void => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
