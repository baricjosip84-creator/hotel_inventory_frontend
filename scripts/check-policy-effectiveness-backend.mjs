// Run only when the cross-repository CI job has checked out backend as a sibling.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const backendRoot = process.env.BACKEND_ROOT || path.resolve(import.meta.dirname, '../../backend');
const sourcePath = path.join(backendRoot, 'src/services/decisionIntelligence/adaptivePolicyEngineService.js');
assert.ok(fs.existsSync(sourcePath), `Backend source missing in cross-repo validation: ${sourcePath}`);
const backend = fs.readFileSync(sourcePath, 'utf8');
assert.match(backend, /e\.application_id, e\.measured_at/, 'Backend retains application provenance');
assert.match(backend, /post_application_monitoring/, 'Backend retains post-application phase');
assert.match(backend, /measurement\?\.application_id && hasMeasuredDelta/, 'Backend measures only applied-policy effect');
console.log('PASS 3/3 backend policy-effectiveness assertions (cross-repository checkout)');
