#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const checks = [];
const check = (condition, message) => {
  if (!condition) throw new Error(`FAIL - ${message}`);
  checks.push(message);
};

const capabilities = read('src/pages/InventoryCapabilitiesPage.tsx');
const audit = read('src/pages/TenantAuditPage.tsx');
const returnsTab = read('src/components/enterpriseInventory/tabs/SupplierReturnsTab.tsx');
const permissions = read('src/lib/permissions.ts');

check(capabilities.includes('canExecute={canAdjustStock && canReadLocations && canReadStock}'), 'BOM execution UI requires Stock Read in addition to adjustment/location authority');
check(audit.includes("hasPermission(TENANT_PERMISSIONS.TENANT_DIAGNOSTICS_READ)"), 'Tenant Audit UI resolves Tenant Diagnostics permission');
check(audit.includes('const showTechnicalDetails = canViewTechnicalDetails && technicalDetailsRequested;'), 'technical Audit rendering is fail-closed behind diagnostics permission');
check(audit.includes('{canViewTechnicalDetails ? ('), 'technical Audit toggle is hidden without diagnostics permission');
check(returnsTab.includes("queryKey: ['enterprise-supplier-return-eligible-lots']"), 'Supplier Return eligible-lots workflow remains present');
check(returnsTab.includes('enabled: canWrite,'), 'Supplier Return eligible-lots feed is not fetched for read-only roles');
check(/support_procurement: Object\.freeze\(\[[\s\S]*?STORAGE_LOCATIONS_READ[\s\S]*?SUPPLIER_RETURNS_READ/.test(permissions), 'support procurement fallback permissions retain Supplier Return location visibility');

console.log(`PASS - v3.49.129 frontend cross-module permission boundary remediation (${checks.length}/${checks.length})`);
for (const message of checks) console.log(`PASS - ${message}`);
