#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2] || new URL('..', import.meta.url).pathname);
const ui=fs.readFileSync(path.join(root,'src/pages/ReportsPage.tsx'),'utf8');
let checks=0;
for (const [condition,description] of [
  [/quantity_evidence_status\?: 'proven' \| 'mixed' \| 'unproven'/.test(ui),'typed evidence status'],
  [/row\.quantity_evidence_status === 'mixed'/.test(ui),'mixed unit warning'],
  [/row\.quantity_evidence_status === 'unproven'/.test(ui),'missing unit warning'],
  [/quantity === null \? ui\('Historical unit unavailable'\)/.test(ui),'null quantity is not formatted as zero'],
  [/formatUsageQuantity\(row\.total_consumed\)/.test(ui),'total consumption guarded'],
  [/formatUsageQuantity\(row\.guest_use_quantity\)/.test(ui),'guest consumption guarded'],
  [/formatUsageQuantity\(row\.internal_use_quantity\)/.test(ui),'internal consumption guarded'],
  [/formatUsageQuantity\(row\.damage_waste_quantity\)/.test(ui),'damage consumption guarded']
]) {assert.ok(condition,description);checks++;}
console.log(`Batch198 usage evidence UI: ${checks}/${checks} PASS (source check, no browser)`);
