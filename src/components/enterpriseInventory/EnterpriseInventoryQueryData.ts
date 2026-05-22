import { useMemo } from 'react';

type OptionalArray<T> = T[] | null | undefined;
type RowsPayload<T> = { rows?: OptionalArray<T> } | null | undefined;
type ActionsOrRowsPayload<T> = { actions?: OptionalArray<T>; rows?: OptionalArray<T> } | null | undefined;
type SnapshotRowsPayload<T> = { rows?: OptionalArray<T>; snapshots?: OptionalArray<T> } | null | undefined;

export function useStableArray<T>(data: OptionalArray<T>): T[] {
  return useMemo(() => data ?? [], [data]);
}

export function useStableRows<T>(data: RowsPayload<T>): T[] {
  return useMemo(() => data?.rows ?? [], [data]);
}

export function useStableActionsOrRows<T>(data: ActionsOrRowsPayload<T>): T[] {
  return useMemo(() => data?.actions ?? data?.rows ?? [], [data]);
}

export function useStableSnapshotRows<T>(data: SnapshotRowsPayload<T>): T[] {
  return useMemo(() => data?.rows ?? data?.snapshots ?? [], [data]);
}

export function useStableFieldArray<T, K extends string>(
  data: ({ [P in K]?: OptionalArray<T> } & object) | null | undefined,
  field: K
): T[] {
  return useMemo(() => data?.[field] ?? [], [data, field]);
}
