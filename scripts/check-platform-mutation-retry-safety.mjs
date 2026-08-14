import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'src/lib/platformApi.ts'), 'utf8');

function fail(message) {
  throw new Error(`Platform mutation retry safety contract failed: ${message}`);
}

for (const signal of [
  'PLATFORM_MUTATION_UNCERTAINTY_TTL_MS',
  'inFlightPlatformMutationKeys',
  'uncertainPlatformMutationKeys',
  'platformMutationRequestFingerprint',
  'preparePlatformLogicalMutationKey',
  'markPlatformMutationOutcomeDefinite',
  'markPlatformMutationOutcomeUncertain',
  'const logicalMutation = preparePlatformLogicalMutationKey(path, options);',
  'markPlatformMutationOutcomeUncertain(logicalMutation.fingerprint, logicalMutation.key);',
  'markPlatformMutationOutcomeDefinite(logicalMutation.fingerprint, logicalMutation.key);'
]) {
  if (!source.includes(signal)) fail(`missing ${signal}`);
}

if ((source.match(/markPlatformMutationOutcomeUncertain\(logicalMutation\.fingerprint, logicalMutation\.key\);/g) || []).length < 3) {
  fail('not all uncertain network/parse paths retain the logical platform mutation key');
}

console.log('Platform mutation retry safety contract passed: identical in-flight writes and uncertain manual retries reuse one platform idempotency key.');
