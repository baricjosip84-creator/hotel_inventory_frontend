#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const pkg = JSON.parse(read('package.json'));
const checks = [];
const check = (ok, label) => {
  checks.push([!!ok, label]);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
};

for (const version of ['v349225', 'v349226', 'v349227']) {
  const rel = `scripts/check-inventory-testing-hardening-${version}.mjs`;
  check(fs.existsSync(path.join(root, rel)), `${version} guard file exists in the packaged frontend`);
  check(
    pkg.scripts[`check:inventory-testing-hardening-${version}`] === `node ${rel}`,
    `${version} package script points to the packaged guard file`
  );
}

for (const key of ['prelint', 'prebuild', 'check:ci']) {
  const chain = pkg.scripts[key] || '';
  const p225 = chain.indexOf('check:inventory-testing-hardening-v349225');
  const p226 = chain.indexOf('check:inventory-testing-hardening-v349226');
  const p227 = chain.indexOf('check:inventory-testing-hardening-v349227');
  check(p225 >= 0 && p226 > p225 && p227 > p226, `v3.49.225 -> v3.49.226 -> v3.49.227 order is intact in ${key}`);
}

const failed = checks.filter(([ok]) => !ok);
console.log(`v3.49.227 cumulative guard-packaging integrity: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
