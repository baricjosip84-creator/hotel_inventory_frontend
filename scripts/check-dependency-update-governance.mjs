#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), 'utf8');
const failures = [];

const packageJson = JSON.parse(read('package.json'));
const packageLock = JSON.parse(read('package-lock.json'));
const dependabot = read('.github/dependabot.yml');
const frontendWorkflow = read('.github/workflows/frontend-validation.yml');
const stagingWorkflow = read('.github/workflows/staging-e2e.yml');

const typescriptRange = packageJson.devDependencies?.typescript ?? '';
const typescriptEslintRange = packageJson.devDependencies?.['typescript-eslint'] ?? '';

if (!/^~6\./.test(typescriptRange)) {
  failures.push(`TypeScript must remain on the reviewed 6.x line until the lint toolchain officially supports the next major (found ${typescriptRange || 'missing'})`);
}
if (!/^\^8\./.test(typescriptEslintRange)) {
  failures.push(`typescript-eslint must remain on the reviewed 8.x line until a coordinated major upgrade is validated (found ${typescriptEslintRange || 'missing'})`);
}
if (packageJson.engines?.node !== '24.x') {
  failures.push('package.json engines.node must be 24.x for Vercel');
}
if (packageJson.engines?.npm !== '>=10 <12') {
  failures.push('package.json engines.npm must allow supported npm 10 and 11 releases');
}
if (packageLock.packages?.['']?.engines?.node !== '24.x') {
  failures.push('package-lock.json root engines.node must match package.json');
}
if (packageLock.packages?.['']?.engines?.npm !== '>=10 <12') {
  failures.push('package-lock.json root engines.npm must match package.json');
}

for (const group of ['production-dependencies', 'development-dependencies']) {
  const blockPattern = new RegExp(`${group}:\\s+[\\s\\S]*?update-types:\\s+- minor\\s+- patch`);
  if (!blockPattern.test(dependabot)) {
    failures.push(`Dependabot ${group} group must allow only minor and patch version updates`);
  }
}

for (const [name, workflow] of [
  ['frontend-validation.yml', frontendWorkflow],
  ['staging-e2e.yml', stagingWorkflow]
]) {
  if (/node-version:\s*20\b/.test(workflow)) failures.push(`${name} must not use Node.js 20`);
  if (!/node-version:\s*24\b/.test(workflow)) failures.push(`${name} must use Node.js 24`);
}

if (failures.length) {
  console.error('Frontend dependency update governance check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Frontend dependency update governance check passed (Node 24, TypeScript 6 toolchain, Dependabot minor/patch groups).');
