import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const backend = process.env.BACKEND_ROOT || resolve(process.cwd(), '../hotel-inventory-backend');
const test = join(backend, 'scripts/check-batch160-persistence-smoke.cjs');
const source = readFileSync(test, 'utf8');
for (const evidence of ['INVENTORY_SMOKE_DISPOSABLE', '--confirm-disposable-record', '--self-test', 'CASE_24_READBACK_MISMATCH', 'CROATIA_TEXT_READBACK_MISMATCH', 'COUNTRY_RESTORE_NOT_VERIFIED', 'If-Match-Version']) {
  if (!source.includes(evidence)) throw new Error(`Missing Batch160 safeguard ${evidence}`);
}
const run = spawnSync(process.execPath, [test, '--self-test'], { encoding: 'utf8', timeout: 20000, env: { ...process.env, INVENTORY_SMOKE_API_BASE: '', INVENTORY_SMOKE_BEARER_TOKEN: '', INVENTORY_SMOKE_PRODUCT_ID: '' } });
if (run.status !== 0 || !run.stdout.includes('focused assertions PASS')) throw new Error(`Batch160 offline smoke contract failed: ${run.stderr || run.stdout}`);
console.log('PASS check-batch160-persistence-smoke-contract.mjs: executable offline probe contract and mutation safety');
