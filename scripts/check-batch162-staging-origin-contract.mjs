import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const backend = process.env.BACKEND_ROOT || resolve(process.cwd(), '../hotel-inventory-backend');
const probe = readFileSync(join(backend,'scripts/check-batch160-persistence-smoke.cjs'),'utf8');
for (const needle of ['STAGING_ORIGIN_LOCKED','STAGING_ORIGIN_MISMATCH','INVENTORY_SMOKE_STAGING_APPROVED_ORIGIN', '--confirm-staging-origin']) {
  if (!probe.includes(needle)) throw new Error(`Missing Batch162 staging guard: ${needle}`);
}
const child = spawnSync(process.execPath, [join(backend,'scripts/check-batch162-staging-origin-write-lock.cjs')], {
  encoding:'utf8', timeout:20000,
  env: {...process.env, INVENTORY_SMOKE_API_BASE:'', INVENTORY_SMOKE_BEARER_TOKEN:'', INVENTORY_SMOKE_PRODUCT_ID:''}
});
if (child.status !== 0 || !child.stdout.includes('focused assertions PASS')) {
  throw new Error(`Batch162 offline contract failed: ${child.stderr || child.stdout}`);
}
console.log('PASS check-batch162-staging-origin-contract.mjs: explicit staged write approval and wrong-target refusals');
