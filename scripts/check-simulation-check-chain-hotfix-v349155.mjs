#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const required = [
  'check:simulation-long-lived-data-completeness-v349152',
  'check:simulation-replenishment-task-delegation-v349153',
  'check:simulation-financial-lifecycle-authority-v349154'
];
const failures=[];
let passed=0;
for (const key of required) {
  if (!pkg.scripts['check:ci'].includes(`npm run ${key}`)) failures.push(`frontend check:ci missing ${key}`);
  else { console.log(`PASS frontend check:ci includes ${key}`); passed++; }
}
if (failures.length) {
  console.error('v3.49.155 frontend check-chain hotfix failed:');
  failures.forEach((f)=>console.error(`- ${f}`));
  process.exit(1);
}
console.log(`v3.49.155 frontend check-chain hotfix: ${passed}/${passed} PASS`);
