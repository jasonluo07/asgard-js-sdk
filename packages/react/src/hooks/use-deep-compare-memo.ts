import { useRef } from 'react';
import { isEqual } from '../utils/is';

/**
 * useDeepCompareMemo: React hook that only recomputes the value when deps deeply change.
 * @param factory - function to create the value
 * @param deps - dependency array (deep compared)
 */
export function useDeepCompareMemo<T>(factory: () => T, deps: unknown[]): T {
  const valueRef = useRef<T>();
  const depsRef = useRef<unknown[]>();

  if (!depsRef.current || !isEqual(depsRef.current, deps)) {
    depsRef.current = deps;
    valueRef.current = factory();
  }

  return valueRef.current as T;
}
