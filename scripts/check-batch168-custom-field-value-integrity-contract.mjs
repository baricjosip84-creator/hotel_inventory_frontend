import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const backend = process.env.BACKEND_ROOT || resolve(process.cwd(), '../hotel-inventory-backend');
const script = join(backend, 'scripts/check-batch168-custom-field-value-integrity.cjs');
const service = join(backend, 'src/services/inventory/inventoryCapabilitiesService.js');
if (!existsSync(script) || !existsSync(service)) {
  throw new Error('Batch168 backend source and executable regression must be present for cross-repository test');
}
const code = readFileSync(service, 'utf8');
for (const expected of ['function validateCustomFieldValue(', 'function isValidCustomFieldCalendarDate(', 'async function saveCustomFieldValues(', 'JSON.stringify(value)']) {
  if (!code.includes(expected)) throw new Error(`Missing required Custom Fields contract: ${expected}`);
}
const child = spawnSync(process.execPath, [script], { encoding:'utf8', timeout: 15000 });
if (child.status !== 0 || !child.stdout.includes('51/51 PASS')) {
  throw new Error(`Batch168 real Custom Fields save contract failed: ${child.stderr || child.stdout}`);
}
console.log('PASS Batch168 cross-repository Custom Fields input integrity, Croatia JSONB write and no-write rejection contract');
