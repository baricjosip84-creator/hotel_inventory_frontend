import type { QueryClient } from '@tanstack/react-query';

const invalidateAll = (queryClient: QueryClient, queryKeys: string[][]) => Promise.all(
  queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey }))
);

export const invalidateEnterpriseInventoryQueries = (queryClient: QueryClient, queryKeys: string[]) => invalidateAll(
  queryClient,
  queryKeys.map((queryKey) => [queryKey])
);

export const refreshAutomationQueries = (queryClient: QueryClient) => invalidateAll(queryClient, [
  ['enterprise-automation-schedules'],
  ['enterprise-automation-runner-readiness'],
  ['enterprise-automation-runner-status'],
  ['enterprise-automation-run-events']
]);

export const refreshExecutionQueries = (queryClient: QueryClient) => invalidateAll(queryClient, [
  ['enterprise-system-status'],
  ['enterprise-execution-adapters'],
  ['enterprise-execution-hardening'],
  ['enterprise-execution-requests']
]);

export const refreshSystemContextQueries = (queryClient: QueryClient) => invalidateAll(queryClient, [
  ['enterprise-system-context'],
  ['enterprise-system-execution-gate'],
  ['enterprise-system-context-snapshots'],
  ['enterprise-system-context-snapshot-comparison'],
  ['enterprise-system-context-forecast-risk']
]);
