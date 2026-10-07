import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const backendRoot = process.env.BACKEND_ROOT || path.resolve(root, '../hotel-inventory-backend');
const read = (p) => fs.readFileSync(p, 'utf8');
const page = read(path.join(root, 'src/pages/InventoryReservationsPage.tsx'));
const service = read(path.join(backendRoot, 'src/services/inventory/inventoryReservationService.js'));
const validation = read(path.join(backendRoot, 'src/validations/inventory.validation.js'));

const allocateValidationBlock = validation.match(/const allocateInventoryReservation = \{[\s\S]*?\n\};/)?.[0] || '';

const checks = [
  ['frontend sends current reservation version for allocate', /action === 'allocate'[\s\S]*body\.expected_version = Number\(reservation\.version\)/.test(page)],
  ['frontend scopes version to selected reservation id', /reservation\.id === id/.test(page)],
  ['backend defines expectedVersion from request body', /const expectedVersion = body\.expected_version;/.test(service)],
  ['backend preserves optional optimistic version check', /expectedVersion !== undefined[\s\S]*VERSION_CONFLICT/.test(service)],
  ['allocation validation accepts expected_version', /const allocateInventoryReservation[\s\S]*expected_version: Joi\.number\(\)\.integer\(\)\.min\(1\)/.test(validation)],
  ['expected_version remains optional', /expected_version: Joi\.number\(\)\.integer\(\)\.min\(1\)/.test(allocateValidationBlock) && !/expected_version:[^\n]*required\(/.test(allocateValidationBlock)],
  ['allow_partial allocation contract remains present', /if \(action === 'allocate'\)[\s\S]*body\.allow_partial = true/.test(page)],
  ['backend any-location allocation remains present', /item\.allocation_strategy === 'specific_location' \|\| alreadyReserved > 0/.test(service)],
  ['backend free-stock allocation remains present', /free_quantity >= remainingQuantity/.test(service)],
  ['backend allocation status update remains present', /updateReservationAllocationStatus/.test(service)],
];

let failed = 0;
for (const [name, ok] of checks) {
  if (ok) console.log(`PASS ${name}`);
  else { failed += 1; console.error(`FAIL ${name}`); }
}
console.log(`${failed ? 'Reservation allocation version check failed' : 'Reservation allocation version check passed'}: ${checks.length - failed}/${checks.length}`);
if (failed) process.exit(1);
