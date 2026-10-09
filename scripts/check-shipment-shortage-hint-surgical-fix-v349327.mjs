import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const page = read('src/pages/ShipmentsPage.tsx');
const pkg = JSON.parse(read('package.json'));
const auditTarget = page.slice(page.indexOf('<label style={styles.label}>{ui(\'Discrepancy Reason\')}</label>'), page.indexOf('<label style={styles.label}>{ui(\'Receiving Note\')}</label>'));
const quantityInput = page.slice(page.indexOf("{ui('Usable Quantity Received')}"), page.indexOf("{ui('Unit of Measure')}"));
const match = page.match(/const draftLeavesShortage\s*=\s*([\s\S]*?);/);
assert.ok(match, 'Missing source predicate for shortage-only guidance');
const hasPlannedShortage = new Function('parsedReceiveQuantity','remaining','draft',`return (${match[1]});`);
const check = [
  ['positive remaining and zero actual receipt is a shortage',()=>assert.equal(hasPlannedShortage(0,35,{shortage_quantity:'0'}),true)],
  ['full receipt with no shortage has no shortage guidance',()=>assert.equal(hasPlannedShortage(35,35,{shortage_quantity:'0'}),false)],
  ['full receipt decimal quantity has no shortage guidance',()=>assert.equal(hasPlannedShortage(1.5,1.5,{shortage_quantity:'0'}),false)],
  ['partial receipt still offers shortage guidance',()=>assert.equal(hasPlannedShortage(20,35,{shortage_quantity:'0'}),true)],
  ['explicit shortage entry triggers shortage guidance',()=>assert.equal(hasPlannedShortage(35,35,{shortage_quantity:'1'}),true)],
  ['invalid receive quantity cannot bypass shortage hint',()=>assert.equal(hasPlannedShortage(NaN,35,{shortage_quantity:'0'}),true)],
  ['remaining zero with zero receipt has no shortage guidance',()=>assert.equal(hasPlannedShortage(0,0,{shortage_quantity:'0'}),false)],
  ['no shortage with blank shortage value is fine',()=>assert.equal(hasPlannedShortage(35,35,{shortage_quantity:''}),false)],
  ['receive-draft uses the live remaining count',()=>assert.match(page,/const remaining = Math\.max\(ordered - received, 0\);[\s\S]*?const draft = getReceiveDraft\(item\);/)],
  ['predicate derived from user editable usable quantity',()=>assert.match(page,/const parsedReceiveQuantity = Number\(draft\.quantity_received \|\| 0\);\s*\/\/ A planned full receipt/)],
  ['source predicate compares against remaining',()=>assert.match(match[1],/parsedReceiveQuantity < remaining/)],
  ['source predicate accounts for declared shortages',()=>assert.match(match[1],/Number\(draft\.shortage_quantity \|\| 0\) > 0/)],
  ['help only rendered when a shortage is planned',()=>assert.match(auditTarget,/canReceiveShipments && selectedShipment\.status !== 'received' && draftLeavesShortage \? \(/)],
  ['full-receipt helper no longer displays false error',()=>assert.doesNotMatch(auditTarget,/\{remaining > 0 && canReceiveShipments \? \(/)],
  ['shortage helper remains actionable for partial receipt',()=>assert.match(auditTarget,/\? ui\('Enter a discrepancy reason first\.'\)/)],
  ['shortage helper retains zero-stock explanation',()=>assert.match(auditTarget,/ui\('If no units arrived, enter the shortage reason and save it without receiving stock\.'\)/)],
  ['save-shortage action remains explicitly available',()=>assert.match(auditTarget,/onClick=\{\(\) => handleSaveShortageReason\(item\)\}/)],
  ['save action remains disabled without reason',()=>assert.match(auditTarget,/recordReceivingDiscrepancyMutation\.isPending \|\|\s*!draft\.discrepancy_reason\.trim\(\)/)],
  ['save-shortage button retains permission and lifecycle gate',()=>assert.match(auditTarget,/remaining > 0 && selectedShipment\.status !== 'received' && canReceiveShipments/)],
  ['full-receipt tooltip uses neutral existing help',()=>assert.match(auditTarget,/\? draftLeavesShortage\s*\? ui\('Enter a discrepancy reason first\.'\)\s*: ui\('Required only if this line remains short'\)/)],
  ['original receiving quantity field remains wired',()=>assert.match(quantityInput,/updateReceiveDraft\(item\.id/)],
  ['no stock API shape touched',()=>assert.match(page,/receiveShipmentMutation\.mutate\(\{/)],
  ['finalize API mutation preserved',()=>assert.match(page,/finalizeShipmentMutation\.mutate\(/)],
  ['translated shortage help reuses five-language catalog',()=>{for(const txt of ['Enter a discrepancy reason first.','Required only if this line remains short','If no units arrived, enter the shortage reason and save it without receiving stock.']) assert.match(page, new RegExp(`ui\\('${txt.replaceAll('.', '\\.')}\\'\\)`));}],
  ['package entry registered',()=>assert.equal(pkg.scripts['check:shipment-shortage-hint-v349327'],'node scripts/check-shipment-shortage-hint-surgical-fix-v349327.mjs')]
];
let pass = 0;
for (const [label, fn] of check) {
  try {fn(); pass += 1; console.log('PASS',label);} catch(e) {console.error('FAIL',label);throw e;}
}
console.log(`Shipment shortage hint: ${pass}/${check.length} PASS`);
