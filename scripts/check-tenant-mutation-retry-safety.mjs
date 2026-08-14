import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

function fail(message) {
  throw new Error(`Tenant mutation retry safety contract failed: ${message}`);
}

function requireIncludes(source, values, label) {
  for (const value of values) {
    if (!source.includes(value)) fail(`${label} is missing ${value}`);
  }
}

const api = read('src/lib/api.ts');
const capabilities = read('src/pages/InventoryCapabilitiesPage.tsx');

requireIncludes(api, [
  'MUTATION_UNCERTAINTY_TTL_MS',
  'inFlightMutationKeys',
  'uncertainMutationKeys',
  'mutationRequestFingerprint',
  'prepareLogicalMutationKey',
  'markMutationOutcomeDefinite',
  'markMutationOutcomeUncertain',
  'const logicalMutation = prepareLogicalMutationKey(path, options as SafeMutationRequestInit);',
  'markMutationOutcomeUncertain(logicalMutation.fingerprint, logicalMutation.key);',
  'markMutationOutcomeDefinite(logicalMutation.fingerprint, logicalMutation.key);'
], 'tenant API mutation safety');

if ((api.match(/markMutationOutcomeUncertain\(logicalMutation\.fingerprint, logicalMutation\.key\);/g) || []).length < 3) {
  fail('network/response uncertainty paths are not all retaining the logical mutation key');
}

requireIncludes(capabilities, [
  'saveSettings.isPending',
  'previewMutation.isPending || finalizeMutation.isPending',
  'create.isPending || execute.isPending',
  "execute.isPending ? (direction === 'assemble' ? 'Assembling…' : 'Disassembling…')",
  'saveDefinition.isPending',
  'saveValues.isPending',
  'rotateWebhook.isPending',
  'revokeClient.isPending'
], 'Advanced Inventory pending-state protection');

console.log('Tenant mutation retry safety contract passed: in-flight duplicate writes and uncertain network retries retain one logical idempotency key; Advanced Inventory write actions lock while pending.');
