import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export type RouteQueryStateOptions<TValue extends string> = {
  paramName: string;
  defaultValue: TValue;
  allowedValues: readonly TValue[];
};

function normalizeRouteQueryValue<TValue extends string>(
  rawValue: string | null,
  defaultValue: TValue,
  allowedValues: readonly TValue[]
): TValue {
  if (rawValue && allowedValues.includes(rawValue as TValue)) {
    return rawValue as TValue;
  }

  return defaultValue;
}

export function useRouteQueryState<TValue extends string>({
  paramName,
  defaultValue,
  allowedValues
}: RouteQueryStateOptions<TValue>): [TValue, (nextValue: TValue) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = normalizeRouteQueryValue(searchParams.get(paramName), defaultValue, allowedValues);

  const setValue = useCallback((nextValue: TValue) => {
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);

      if (nextValue === defaultValue || nextValue === '') {
        nextParams.delete(paramName);
      } else {
        nextParams.set(paramName, nextValue);
      }

      return nextParams;
    }, { replace: true });
  }, [defaultValue, paramName, setSearchParams]);

  return [value, setValue];
}
