export type ActionFeedbackType = 'success' | 'error' | 'info';

export type ActionFeedbackDetail = {
  type: ActionFeedbackType;
  message: string;
  requestId?: string;
};

export const PLATFORM_MUTATION_FEEDBACK_EVENT = 'platform-mutation-feedback';
export const TENANT_MUTATION_FEEDBACK_EVENT = 'tenant-mutation-feedback';

function dispatchFeedback(eventName: string, detail: ActionFeedbackDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

export function showTenantActionSuccess(message: string): void {
  dispatchFeedback(TENANT_MUTATION_FEEDBACK_EVENT, { type: 'success', message });
}

export function showTenantActionError(message: string, requestId?: string): void {
  dispatchFeedback(TENANT_MUTATION_FEEDBACK_EVENT, { type: 'error', message, requestId });
}

export function showTenantActionInfo(message: string): void {
  dispatchFeedback(TENANT_MUTATION_FEEDBACK_EVENT, { type: 'info', message });
}

export function showPlatformActionSuccess(message: string): void {
  dispatchFeedback(PLATFORM_MUTATION_FEEDBACK_EVENT, { type: 'success', message });
}

export function showPlatformActionError(message: string, requestId?: string): void {
  dispatchFeedback(PLATFORM_MUTATION_FEEDBACK_EVENT, { type: 'error', message, requestId });
}

export function showPlatformActionInfo(message: string): void {
  dispatchFeedback(PLATFORM_MUTATION_FEEDBACK_EVENT, { type: 'info', message });
}
