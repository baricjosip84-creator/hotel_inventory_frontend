import { apiRequest } from './api';

export type TenantSubscriptionAccessBlocker = {
  status?: number;
  code?: string;
  message?: string;
  reason?: string;
  tenant_status?: string | null;
  billing_status?: string | null;
  trial_ends_at?: string | null;
  current_period_ends_at?: string | null;
};

export type TenantPlanUsageRow = {
  resource: string;
  label: string;
  limit_key: string;
  used: number;
  limit: number | null;
  remaining: number | null;
  blocked: boolean;
  reason: string | null;
};


export type TenantFeatureEntitlementRow = {
  feature: string;
  label?: string;
  allowed: boolean;
  matched_flag?: string | null;
  required_flags?: string[];
  reason?: string | null;
};

export type TenantSubscriptionAccess = {
  tenant: {
    id: string;
    name: string;
    status: string | null;
    billing_status: string;
    plan_code: string | null;
    trial_ends_at: string | null;
    current_period_ends_at: string | null;
  };
  write_access: {
    allowed: boolean;
    blocker: TenantSubscriptionAccessBlocker | null;
  };
  plan_usage: TenantPlanUsageRow[];
  plan_limit_blocked_resources: string[];
  feature_entitlements?: TenantFeatureEntitlementRow[];
  feature_blocked_resources?: string[];
};

export async function fetchTenantSubscriptionAccess(): Promise<TenantSubscriptionAccess> {
  return apiRequest<TenantSubscriptionAccess>('/tenants/subscription-access');
}
