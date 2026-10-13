import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const backend = process.env.BACKEND_ROOT || resolve(process.cwd(), '../hotel-inventory-backend');
const probe = join(backend, 'scripts/check-batch160-persistence-smoke.cjs');
const guard = join(backend, 'scripts/check-batch161-exact-case-persistence-smoke.cjs');
const probeSource = readFileSync(probe, 'utf8');
const guardSource = readFileSync(guard, 'utf8');
for (const evidence of [
  "const testCode = 'CASE'", 'CASE_FIXTURE_NOT_EMPTY', 'CASE_IS_PRODUCT_BASE_UNIT',
  'COUNTRY_TEXT_DEFINITION_REQUIRED', 'UOM_SAVE_RECEIPT_INCOMPLETE_MANUAL_CHECK',
  'UOM_WRITE_OUTCOME_UNCERTAIN_MANUAL_CHECK', 'COUNTRY_WRITE_OUTCOME_UNCERTAIN_MANUAL_CHECK',
  'UOM_CLEANUP_FAILED_MANUAL_CHECK', 'COUNTRY_RESTORE_FAILED_MANUAL_CHECK',
  'If-Match-Version', '--confirm-disposable-record'
]) {
  if (!probeSource.includes(evidence)) throw new Error(`Missing Batch161 persistence guard: ${evidence}`);
}
for (const expected of ['mismatchCase', 'mismatchCountry', 'failAfterUomPost', 'existingCase', 'failFirstCountryGet']) {
  if (!guardSource.includes(expected)) throw new Error(`Missing Batch161 negative control: ${expected}`);
}
const result = spawnSync(process.execPath, [guard], { encoding: 'utf8', timeout: 20000,
  env: { ...process.env, INVENTORY_SMOKE_API_BASE: '', INVENTORY_SMOKE_BEARER_TOKEN: '', INVENTORY_SMOKE_PRODUCT_ID: '' }
});
if (result.status !== 0 || !result.stdout.includes('focused assertions PASS')) {
  throw new Error(`Batch161 executable offline contract failed: ${result.stderr || result.stdout}`);
}
console.log('PASS check-batch161-exact-case-persistence-smoke-contract.mjs: exact CASE fixture, no overwrite and cleanup/restore negative controls');
