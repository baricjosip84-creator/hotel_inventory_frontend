import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
// Historical source SHA checks remain strict. Exactly four source files can
// carry the new reviewed Batch 229 recheck SHA instead of their prior SHA.
// check-batch-229-recheck-contract independently pins all original test bodies.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pinned=JSON.parse(fs.readFileSync(path.join(root,'batch-229-recheck-source-sha256.json'),'utf8'));
const second=JSON.parse(fs.readFileSync(path.join(root,'batch-229-recheck2-source-sha256.json'),'utf8'));
const fourth=JSON.parse(fs.readFileSync(path.join(root,'batch-229-recheck4-product-source-sha256.json'),'utf8'));
export function assertHistoricalSourceCompatible(filename, actual, historical, message='Historical source drift') {
  if(actual===historical) return;
  const relative=filename.replace(/^tests\//,'').replaceAll('\\','/');
  const reviewed=pinned[relative];
  assert(reviewed, `${message}: unreviewed file ${relative}`);
  const revision4=fourth[relative];
  if(revision4 && actual===revision4.new_sha256) {
    const accepted=[reviewed.before_sha256,reviewed.after_sha256,second[relative]?.second_recheck_sha256];
    assert(accepted.includes(historical),`${message}: unreviewed prior hash ${relative}`);
    assert.equal(revision4.previous_sha256,second[relative]?.second_recheck_sha256,`${message}: missing audited predecessor ${relative}`);
    return;
  }
  const revision2=second[relative];
  if(revision2 && revision2.prior_recheck_sha256===reviewed.after_sha256 && actual===revision2.second_recheck_sha256) {
    assert([reviewed.before_sha256,reviewed.after_sha256].includes(historical), `${message}: unknown historical baseline ${relative}`);
    return;
  }
  assert.equal(historical,reviewed.before_sha256,`${message}: prior hash not the reviewed baseline ${relative}`);
  assert.equal(actual,reviewed.after_sha256,`${message}: edited file is not the exact approved repair ${relative}`);
}
