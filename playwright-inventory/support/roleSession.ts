import { expect, type Page } from '@playwright/test';
import { selectEnglishUI } from './tenantSession';
import { targetBaseURL } from './environment';

/** Role fixtures require separate accounts in the SAME isolated disposable tenant. */
export async function loginAsDisposableRole(page: Page, role: 'PW_GOVERNOR' | 'PW_RESTRICTED' | 'PW_DIAGNOSTICS' | 'PW_FORECAST_READER' | 'PW_FORECAST_GOVERNOR' | 'PW_CROSS_READER' | 'PW_CROSS_GOVERNOR' | 'PW_CROSS_GOVERNOR_NO_SOURCE_READ' | 'PW_CROSS_GOVERNOR_SOURCE_READ_ONLY' | 'PW_COL_NO_INTELLIGENCE' | 'PW_COL_NO_READ' | 'PW_DT_NO_PRODUCTS' | 'PW_DT_NO_INTELLIGENCE' | 'PW_DT_NO_ACTION' | 'PW_RC_ALL_SOURCE_READ' | 'PW_RC_NO_INTELLIGENCE' | 'PW_RC_NO_ACTION' | 'PW_RC_NO_READ' | 'PW_STOCK_READ_ONLY' | 'PW_STOCK_ADJUSTER' | 'PW_STOCK_NO_READ' | 'PW_OUT_NO_STOCK' | 'PW_OUT_NO_ATTACHMENTS' | 'PW_OUT_NO_CUSTOMER_RETURN' | 'PW_USAGE_READ_ONLY' | 'PW_REQ_READ_ONLY' | 'PW_REQ_NO_APPROVE' | 'PW_REQ_NO_FULFILL' | 'PW_RSV_READ_ONLY' | 'PW_RSV_NO_ALLOCATE' | 'PW_RSV_CANCEL_OWN' | 'PW_RSV_CANCEL_ANY' | 'PW_SMV_LINKS_GRANTED' | 'PW_SMV_NO_SHIPMENTS' | 'PW_SMV_NO_TRANSFERS' | 'PW_TRANSFER_READ_ONLY' | 'PW_PO_READ_ONLY' | 'PW_RPL_READ_ONLY' | 'PW_RPL_GOVERN_NO_PO' | 'PW_SHP_OPERATIONS' | 'PW_SHP_RECEIVE_ONLY' | 'PW_SHP_NO_ITEMS' | 'PW_SCAN_NO_RECEIVE' | 'PW_REPORTS_NO_INSIGHTS' | 'PW_USERS_READ_ONLY' | 'PW_ADMIN_DIAG_ONLY' | 'PW_ADMIN_MANAGE_ALERTS' | 'PW_ADMIN_OVERRIDE' | 'PW_ADMIN_NO_STATUS' | 'PW_ADMIN_NO_DIAGNOSTICS' | 'PW_AUDIT_NO_READ' | 'PW_AUDIT_NO_DIAGNOSTICS' | 'PW_AUDIT_TECHNICAL' | 'PW_TSET_READ_ONLY' | 'PW_TSET_NO_READ' | 'PW_INS_NO_PRODUCTS' | 'PW_SC_GOVERNOR' | 'PW_SC_VIEW_ONLY' | 'PW_SC_NO_REVIEW' | 'PW_SC_NO_DIAGNOSTICS' | 'PW_SC_NO_ALERTS' | 'PW_SC_NO_READ' | 'PW_ERQ_VIEW_ONLY' | 'PW_ERQ_NO_INTELLIGENCE' | 'PW_ERQ_NO_PRODUCTS' | 'PW_ERQ_NO_VIEW' | 'PW_ET_ASSIGNEE' | 'PW_ET_READ_ONLY' | 'PW_AS_VIEW_ONLY' | 'PW_EI_NO_TASK' | 'PW_EI_NO_RECONCILE' | 'PW_EI_NO_DISPATCH' | 'PW_EI_NO_APPROVAL' | 'PW_EI_CATALOG_READ_ONLY' | 'PW_EI_INVOICE_NO_MATCH' | 'PW_EI_INVOICE_NO_PAY' | 'PW_EI_LABEL_READ_ONLY' | 'PW_EI_NOTIFY_READ_ONLY' | 'PW_STORAGE_READ_ONLY' | 'PW_STORAGE_NO_STOCK' | 'PW_ICAP_INTEGRATIONS_VIEW_ONLY' | 'PW_ICAP_NO_INTEGRATIONS' | 'PW_ICAP_NO_STOCK' | 'PW_ICAP_SCOPE_LIMITED' | 'PW_ICAP_CUSTOM_PRODUCT_ONLY' | 'PW_ICAP_MOBILE_NO_SHIPMENTS' | 'PW_ICAP_NO_ADJUST' | 'PW_ICAP_PRODUCTS_NO_SUPPLIERS' | 'PW_ICAP_MOBILE_NO_ACTION'): Promise<void> {
  targetBaseURL();
  if (process.env.PW_TEST_ENVIRONMENT !== 'disposable') {
    throw new Error('Role tests require PW_TEST_ENVIRONMENT=disposable');
  }
  const email = process.env[`${role}_EMAIL`];
  const password = process.env[`${role}_PASSWORD`];
  if (!email || !password) throw new Error(`Supply isolated disposable ${role}_EMAIL and ${role}_PASSWORD`);
  await selectEnglishUI(page);
  await page.goto('/login');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.locator('[data-auth-form="true"] button[type="submit"]').click();
  await expect(page.getByRole('heading', { name: 'Operations Dashboard' })).toBeVisible();
}
