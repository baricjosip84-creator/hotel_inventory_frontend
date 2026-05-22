import type { QueryClient } from '@tanstack/react-query';
import { normalizeError } from './EnterpriseInventoryFormat';
import { invalidateEnterpriseInventoryQueries } from './EnterpriseInventoryRefresh';

type SetErrorMessage = (message: string | null) => void;

export function createEnterpriseInventoryMutationErrorHandler(
  setErrorMessage: SetErrorMessage,
  fallbackMessage: string
) {
  return (error: unknown) => setErrorMessage(normalizeError(error, fallbackMessage));
}


type SetStatusMessage = (message: string | null) => void;

export function createEnterpriseInventoryInvalidatingSuccessHandler(
  setStatusMessage: SetStatusMessage,
  queryClient: QueryClient,
  successMessage: string,
  queryKeys: string[]
) {
  return async () => {
    setStatusMessage(successMessage);
    await invalidateEnterpriseInventoryQueries(queryClient, queryKeys);
  };
}

export function createEnterpriseInventoryRefreshSuccessHandler(
  setStatusMessage: SetStatusMessage,
  queryClient: QueryClient,
  successMessage: string,
  refreshQueries: (queryClient: QueryClient) => Promise<unknown>
) {
  return async () => {
    setStatusMessage(successMessage);
    await refreshQueries(queryClient);
  };
}


export function createEnterpriseInventoryResultSuccessHandler<TResult>(
  setStatusMessage: SetStatusMessage,
  queryClient: QueryClient,
  successMessage: (result: TResult) => string,
  queryKeys: string[]
) {
  return async (result: TResult) => {
    setStatusMessage(successMessage(result));
    await invalidateEnterpriseInventoryQueries(queryClient, queryKeys);
  };
}

export function createEnterpriseInventoryVariableSuccessHandler<TVariables>(
  setStatusMessage: SetStatusMessage,
  queryClient: QueryClient,
  successMessage: (variables: TVariables) => string,
  queryKeys: string[]
) {
  return async (_result: unknown, variables: TVariables) => {
    setStatusMessage(successMessage(variables));
    await invalidateEnterpriseInventoryQueries(queryClient, queryKeys);
  };
}

export function createEnterpriseInventoryResettingSuccessHandler(
  setStatusMessage: SetStatusMessage,
  queryClient: QueryClient,
  successMessage: string,
  queryKeys: string[],
  resetFormState: () => void | Promise<void>
) {
  return async () => {
    await resetFormState();
    setStatusMessage(successMessage);
    await invalidateEnterpriseInventoryQueries(queryClient, queryKeys);
  };
}

export function createEnterpriseInventoryCustomSuccessHandler<TResult = unknown, TVariables = unknown>(
  setStatusMessage: SetStatusMessage,
  queryClient: QueryClient,
  successMessage: string,
  queryKeys: string[],
  applyState: (result: TResult, variables: TVariables) => void | Promise<void>
) {
  return async (result: TResult, variables: TVariables) => {
    await applyState(result, variables);
    setStatusMessage(successMessage);
    await invalidateEnterpriseInventoryQueries(queryClient, queryKeys);
  };
}

export function createEnterpriseInventoryBoundMutationFeedback(
  setStatusMessage: SetStatusMessage,
  setErrorMessage: SetErrorMessage,
  queryClient: QueryClient
) {
  return {
    error: (fallbackMessage: string) => createEnterpriseInventoryMutationErrorHandler(setErrorMessage, fallbackMessage),
    invalidating: (successMessage: string, queryKeys: string[]) =>
      createEnterpriseInventoryInvalidatingSuccessHandler(setStatusMessage, queryClient, successMessage, queryKeys),
    refresh: (successMessage: string, refreshQueries: (queryClient: QueryClient) => Promise<unknown>) =>
      createEnterpriseInventoryRefreshSuccessHandler(setStatusMessage, queryClient, successMessage, refreshQueries),
    result: <TResult>(successMessage: (result: TResult) => string, queryKeys: string[]) =>
      createEnterpriseInventoryResultSuccessHandler(setStatusMessage, queryClient, successMessage, queryKeys),
    variable: <TVariables>(successMessage: (variables: TVariables) => string, queryKeys: string[]) =>
      createEnterpriseInventoryVariableSuccessHandler(setStatusMessage, queryClient, successMessage, queryKeys),
    resetting: (successMessage: string, queryKeys: string[], resetFormState: () => void | Promise<void>) =>
      createEnterpriseInventoryResettingSuccessHandler(setStatusMessage, queryClient, successMessage, queryKeys, resetFormState),
    custom: <TResult = unknown, TVariables = unknown>(
      successMessage: string,
      queryKeys: string[],
      applyState: (result: TResult, variables: TVariables) => void | Promise<void>
    ) => createEnterpriseInventoryCustomSuccessHandler(setStatusMessage, queryClient, successMessage, queryKeys, applyState)
  };
}
