import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const api = fs.readFileSync(path.join(root, 'src/lib/api.ts'), 'utf8');
const page = fs.readFileSync(path.join(root, 'src/pages/InventoryCapabilitiesPage.tsx'), 'utf8');
const translations = fs.readFileSync(path.join(root, 'src/i18n/tenantUiTranslations.ts'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const backendRoot = process.env.BACKEND_ROOT;
let passed = 0;
const check = (condition, message) => {
  if (!condition) throw new Error(`FAIL: ${message}`);
  passed += 1;
  console.log(`PASS ${message}`);
};

check(api.includes("normalizedPathOnly === '/inventory-capabilities/webhooks'"), 'webhook create route has explicit feedback mapping');
check(api.includes("return 'Webhook created successfully.';"), 'webhook creation feedback is action-specific');
check(api.includes("/^\\/inventory-capabilities\\/webhooks\\/[^/]+\\/test$/"), 'webhook test route has explicit feedback mapping');
check(api.includes("return 'Webhook test queued successfully.';"), 'webhook test feedback is action-specific');
check(api.includes("return 'Webhook signing secret rotated successfully.';"), 'existing webhook secret-rotation feedback remains intact');
check(page.includes('Test webhook queued. Delivery status will appear below.'), 'page-owned delivery-status guidance remains intact');
check(page.includes('/inventory-capabilities/webhooks/${id}/test'), 'existing webhook test endpoint remains unchanged');
check(page.includes('delivery_id: string; queued: boolean'), 'webhook test still returns queued-delivery contract');
check(translations.includes('["Webhook created successfully."'), 'webhook-created message is in tenant translation catalog');
check(translations.includes('["Webhook test queued successfully."'), 'webhook-test message is in tenant translation catalog');
check((translations.match(/\["Webhook created successfully\."/g) || []).length === 1, 'webhook-created translation key is unique');
check((translations.match(/\["Webhook test queued successfully\."/g) || []).length === 1, 'webhook-test translation key is unique');
check(pkg.scripts?.['check:inventory-webhook-action-feedback-surgical-fix-v349274'] === 'node scripts/check-webhook-action-feedback-surgical-fix-v349274.mjs', 'Batch 032 guard is registered');
if (backendRoot) {
  const service = fs.readFileSync(path.join(backendRoot, 'src/services/integrations/tenantWebhookDeliveryService.js'), 'utf8');
  const job = fs.readFileSync(path.join(backendRoot, 'src/jobs/tenantWebhookDeliveryJob.js'), 'utf8');
  const workflow = fs.readFileSync(path.join(backendRoot, '.github/workflows/scheduled-background-jobs.yml'), 'utf8');
  check(service.includes("event_type: 'webhook.test'"), 'backend webhook test payload remains unchanged');
  check(service.includes("'webhook.test','pending'"), 'backend webhook test still queues a pending delivery');
  check(job.includes('processPendingDeliveries'), 'tenant webhook delivery job remains wired to processor');
  check(workflow.includes("RUN_SCHEDULED_JOBS: 'true'"), 'hourly GitHub scheduler explicitly enables one-shot jobs');
  check(workflow.includes("cron: '17 * * * *'"), 'hourly scheduled background job cadence remains configured');
}
console.log(`Webhook action feedback surgical fix: ${passed}/${backendRoot ? 18 : 13} PASS`);
