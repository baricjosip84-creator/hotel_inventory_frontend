import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/InventoryRequisitionsPage.tsx'), 'utf8');
const api = fs.readFileSync(path.join(root, 'src/lib/api.ts'), 'utf8');
const translations = fs.readFileSync(path.join(root, 'src/i18n/tenantUiTranslations.ts'), 'utf8');
const backendRoot = process.env.BACKEND_ROOT || '';
const reservationServicePath = backendRoot ? path.join(backendRoot, 'src/services/inventory/inventoryReservationService.js') : '';
const reservationService = reservationServicePath && fs.existsSync(reservationServicePath)
  ? fs.readFileSync(reservationServicePath, 'utf8')
  : '';

const frontendSource = `${page}\n${api}\n${translations}`;
const checks = [
  ['linked reservation query is tied to selected requisition', frontendSource, /queryKey: \['inventory-requisition-linked-reservation', selectedId\]/],
  ['persistent query reads requisition-owned reservations', frontendSource, /source_type=requisition&source_id=\$\{encodeURIComponent\(selectedId \|\| ''\)\}/],
  ['closed reservations are excluded from active linkage', frontendSource, /\['fulfilled', 'released', 'expired', 'cancelled'\]/],
  ['linked reservation creation has onSuccess reconciliation', frontendSource, /createLinkedReservationMutation = useMutation\([\s\S]*?onSuccess: async \(_reservation, variables\)/],
  ['requisition queries refresh after reservation creation', frontendSource, /onSuccess: async \(_reservation, variables\)[\s\S]*?invalidateRequisitions\(\)/],
  ['selected linked reservation query refreshes after create', frontendSource, /invalidateQueries\(\{ queryKey: \['inventory-requisition-linked-reservation', variables\.id\] \}\)/],
  ['reservation queue refreshes after create', frontendSource, /invalidateQueries\(\{ queryKey: \['inventory-reservations'\] \}\)/],
  ['reservation summary refreshes after create', frontendSource, /invalidateQueries\(\{ queryKey: \['inventory-reservations-summary'\] \}\)/],
  ['mutation result is scoped to the requisition that created it', frontendSource, /createLinkedReservationMutation\.variables\?\.id === selected\?\.id/],
  ['duplicate create action is hidden once open linkage exists', frontendSource, /&& !linkedReservation/],
  ['read-capable users wait for linkage check before create', frontendSource, /&& !\(capabilities\.canViewInventoryReservations && linkedReservationQuery\.isFetching\)/],
  ['persistent linked reservation number and status are shown', frontendSource, /<strong>\{ui\('Linked reservation'\)\}<\/strong> \{linkedReservation\.reservation_number\} · \{ui\('Status'\)\}: \{humanizeCode\(linkedReservation\.status\)\}/],
  ['exact linked reservation deep-link is available', frontendSource, /\/inventory-reservations\?reservationId=\$\{encodeURIComponent\(linkedReservation\.id\)\}/],
  ['linked reservation open control is permission-gated', frontendSource, /capabilities\.canViewInventoryReservations[\s\S]*?ui\('Open linked reservation'\)/],
  ['shared API feedback is action-specific', frontendSource, /Linked reservation created successfully\./],
  ['five-language catalog includes action-specific success feedback', frontendSource, /\["Linked reservation created successfully\.",\s*"[^"]+",\s*"[^"]+",\s*"[^"]+",\s*"[^"]+"\]/],
  ['five-language catalog includes deep-link label', frontendSource, /\["Open linked reservation",\s*"[^"]+",\s*"[^"]+",\s*"[^"]+",\s*"[^"]+"\]/],
  ['backend any-location linkage remains allowed when requisition has no source', reservationService, /allocation_strategy: requisition\.source_storage_location_id \? 'specific_location' : 'any_location'/],
  ['backend duplicate-open-reservation guard remains intact', reservationService, /REQUISITION_RESERVATION_ALREADY_EXISTS/],
  ['backend linked reservation endpoint still returns the created reservation', reservationService, /return linkedReservation;/],
];
let pass = 0;
for (const [name, source, assertion] of checks) {
  const ok = Boolean(source) && assertion.test(source);
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}`);
  if (ok) pass += 1;
}
console.log(`\n${pass}/${checks.length} PASS`);
if (pass !== checks.length) process.exit(1);
