import fs from 'node:fs';
import assert from 'node:assert/strict';
import manifest from '../original-suite-approved.json' with { type: 'json' };

// Called *after* Playwright's real --list discovery and *before* any live browser run.
// Fails closed if the runner selects fewer, extra, or duplicated original IDs.
const groupName = process.env.PW_ORIGINAL_SUITE_GROUP || '';
assert(Object.prototype.hasOwnProperty.call(manifest.approved_groups, groupName), 'Unknown original-suite group');
const group = manifest.approved_groups[groupName];
const entries = Array.isArray(group.entries) ? group.entries : [{file:group.file,ids:group.ids}];
const expectedIds = entries.flatMap(entry => entry.ids);
const expectedFiles = new Set(entries.map(entry => entry.file)).size;
const text = fs.readFileSync('original-selected.txt','utf8').replace(/\x1b\[[0-9;]*m/g,'');
const total = text.match(/Total:\s+(\d+)\s+tests?\s+in\s+(\d+)\s+files?/);
assert(total, 'Playwright selected-test discovery summary missing');
assert.equal(Number(total[1]),expectedIds.length,'Wrong count of selected original tests');
assert.equal(Number(total[2]),expectedFiles,'Wrong count of selected original spec files');
const actualIds = [];
for(const line of text.split('\n')) {
 if (!line.includes('›')) continue;
 const match = line.match(/\b([A-Z0-9]+-\d{3})\b/);
 if(match) actualIds.push(match[1]);
}
assert.equal(actualIds.length, expectedIds.length,'Incorrect number of original test ID titles');
assert.equal(new Set(actualIds).size,actualIds.length,'Duplicate Playwright test ID in selected run');
assert.deepEqual([...actualIds].sort(),[...expectedIds].sort(),'Unexpected original IDs selected');
console.log(`PASS: Real Playwright discovery selected exactly ${actualIds.length} original IDs from ${expectedFiles} files for ${groupName}.`);
