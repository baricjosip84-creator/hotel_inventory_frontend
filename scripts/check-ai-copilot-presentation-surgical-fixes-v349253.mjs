import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/AIOperationsCopilotPage.tsx'), 'utf8');
const translations = fs.readFileSync(path.join(root, 'src/i18n/tenantUiTranslations.ts'), 'utf8');
const checks = [
  ['mode visible directly below hero', "ui('Current mode:')"],
  ['tenant quota window explicit', "ui('Tenant usage this hour:')"],
  ['evidence confidence label', "ui('Evidence confidence')"],
  ['confidence meaning explained', "Evidence confidence describes the evidence available to this run; it is not AI model confidence."],
  ['saved snapshot warning', "Values reflect the evidence captured for this run and are not live operational values."],
  ['technical details collapsed', "ui('Technical / audit details')"],
  ['sub-ms latency presentation', "selectedRun.latency_ms < 1 ? ui('<1 ms')"],
  ['raw evidence ids removed from business card', "copilotEvidenceKindLabel(item.kind, ui)}{capabilities.canViewTenantDiagnostics && item.id"],
];
let passed = 0;
for (const [name, needle] of checks) {
  const inverted = name === 'raw evidence ids removed from business card';
  const ok = inverted ? !page.includes(needle) : page.includes(needle);
  if (!ok) {
    console.error(`FAIL ${name}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS ${name}`);
    passed += 1;
  }
}
for (const key of ['Tenant usage this hour:', 'Evidence confidence', 'Saved result snapshot', 'Technical / audit details']) {
  const ok = translations.includes(`["${key}"`);
  if (!ok) {
    console.error(`FAIL translation row ${key}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS translation row ${key}`);
    passed += 1;
  }
}
if (!process.exitCode) console.log(`PASS ${passed}/${checks.length + 4}`);
