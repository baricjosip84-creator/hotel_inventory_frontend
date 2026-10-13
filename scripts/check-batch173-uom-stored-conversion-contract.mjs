import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const backend=path.resolve(here,'../../hotel-inventory-backend');
const service=readFileSync(path.join(backend,'src/services/inventory/inventoryCapabilitiesService.js'),'utf8');
const test=readFileSync(path.join(backend,'scripts/check-batch173-uom-stored-conversion-guard.cjs'),'utf8');
let assertions=0;
for(const excerpt of [
  'validStoredUnit',"'UOM_CONVERSION_DATA_INVALID'",'Number.isFinite(unit.factor)',
  'Number.isInteger(unit.scale)','unit.scale >= 0','unit.scale <= 8',
  'row.factor_to_base == null ? NaN','row.rounding_scale == null ? NaN',
  'UOM_CONVERSION_NOT_FOUND','UOM_CONVERSION_RESULT_INVALID',
]){assert(service.includes(excerpt),excerpt);assertions++;}
for(const excerpt of ['CASE','24','rounding_scale','badFactor','badScale','null']) {
  assert(test.includes(excerpt),excerpt);assertions++;
}
console.log(`Batch173 frontend/backend source contract: ${assertions}/${assertions} PASS`);
