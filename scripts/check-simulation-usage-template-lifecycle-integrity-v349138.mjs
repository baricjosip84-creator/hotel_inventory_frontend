#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const checks = [];
const check = (condition, message) => {
  if (!condition) throw new Error(`FAIL - ${message}`);
  checks.push(message);
};

const panel = read('src/pages/inventoryUsage/InventoryUsageTemplatesPanel.tsx');
const page = read('src/pages/InventoryUsagePage.tsx');
const dashboard = read('src/pages/inventoryUsage/InventoryUsageDashboard.tsx');
const api = read('src/pages/inventoryUsage/inventoryUsageApi.ts');
const types = read('src/pages/inventoryUsage/inventoryUsageTypes.ts');
const translations = read('src/i18n/tenantUiTranslations.ts');

// F-0021 — active templates can be edited in place with optimistic concurrency.
check(types.includes('export type InventoryUsageTemplateUpdateDraft = InventoryUsageTemplateDraft & {'), 'frontend defines a versioned template update draft');
check(types.includes('expected_version: number;'), 'template update draft carries expected_version');
check(api.includes('export async function updateInventoryUsageTemplate'), 'frontend API exposes template update');
check(api.includes("method: 'PUT'"), 'template update uses PUT');
check(page.includes('const updateTemplateMutation = useMutation({'), 'Inventory Usage page owns template update mutation state');
check(page.includes('updateTemplateMutation.mutateAsync'), 'template updates use awaitable mutation semantics');
check(dashboard.includes('onUpdateTemplate'), 'dashboard passes template editing through to the template panel');
check(panel.includes("ui('Edit reusable template')"), 'template builder exposes edit mode');
check(panel.includes("ui('Edit')"), 'saved template cards expose an Edit action');
check(panel.includes('setEditingTemplateVersion(Number(template.version || 0) || null);'), 'edit mode snapshots the loaded template version');
check(panel.includes('expected_version: editingTemplateVersion'), 'template save submits the captured expected version');
check(panel.includes("ui('Cancel edit')"), 'edit mode can be cancelled without archiving or recreating the template');

// F-0022 — failed saves preserve all entered work.
const handleStart = panel.indexOf('const handleCreate = async () => {');
const handleEnd = panel.indexOf('const saving =', handleStart);
const handleBlock = panel.slice(handleStart, handleEnd);
check(handleStart >= 0 && handleEnd > handleStart, 'template save handler is asynchronous');
check(handleBlock.includes('await onCreateTemplate(draft);'), 'create save waits for server confirmation');
check(handleBlock.includes('await onUpdateTemplate(editingTemplateId'), 'edit save waits for server confirmation');
check(handleBlock.includes('resetForm();'), 'builder resets after a confirmed save');
check(handleBlock.indexOf('resetForm();') > handleBlock.indexOf('await onCreateTemplate(draft);'), 'create builder is not cleared before server success');
check(handleBlock.includes('catch {') && handleBlock.includes('Keep every builder field intact'), 'failed create/update explicitly preserves builder state');
check(!panel.includes('onCreateTemplate({') || !panel.includes('onCreateTemplate({\n'), 'legacy fire-and-forget create submission is removed');

// Multilingual strings for the new lifecycle UI are present.
for (const key of [
  'Edit reusable template',
  'Update usage template',
  'Template update failed: ',
  'Refresh the template before editing it again.'
]) {
  check(translations.includes(`["${key}"`), `translation catalog includes ${key}`);
}

console.log(`PASS - v3.49.138 usage template lifecycle integrity frontend (${checks.length}/${checks.length})`);
for (const message of checks) console.log(`PASS - ${message}`);
