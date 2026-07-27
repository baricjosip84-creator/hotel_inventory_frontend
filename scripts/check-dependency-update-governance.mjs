#!/usr/bin/env node

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), 'utf8');
const failures = [];

function versionAtLeast(actual, minimum) {
  const parse = (value) => String(value || '').split('.').map((part) => Number.parseInt(part, 10));
  const left = parse(actual);
  const right = parse(minimum);
  for (let index = 0; index < 3; index += 1) {
    const a = Number.isFinite(left[index]) ? left[index] : 0;
    const b = Number.isFinite(right[index]) ? right[index] : 0;
    if (a !== b) return a > b;
  }
  return true;
}

function listSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(path);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}


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


const routerRange = packageJson.dependencies?.['react-router'] ?? '';
const lockedRouter = packageLock.packages?.['node_modules/react-router']?.version ?? '';
if (!/^\^8\./.test(routerRange)) {
  failures.push(`react-router must remain on the reviewed 8.x security line (found ${routerRange || 'missing'})`);
}
if (!versionAtLeast(lockedRouter, '8.3.0')) {
  failures.push(`package-lock.json must resolve react-router 8.3.0 or newer (found ${lockedRouter || 'missing'})`);
}
if (packageJson.dependencies?.['react-router-dom']) {
  failures.push('react-router-dom must remain removed because React Router 8 uses react-router and react-router/dom');
}
if (packageLock.packages?.['node_modules/react-router-dom']) {
  failures.push('package-lock.json must not contain the removed react-router-dom package');
}
const legacyRouterImports = listSourceFiles(join(root, 'src')).filter((file) => readFileSync(file, 'utf8').includes('react-router-dom'));
if (legacyRouterImports.length) {
  failures.push(`source files must not import the removed react-router-dom package: ${legacyRouterImports.map((file) => file.replace(`${root}/`, '')).join(', ')}`);
}
const routerSource = read('src/app/router.tsx');
if (!/import\s*\{\s*RouterProvider\s*\}\s*from\s*['\"]react-router\/dom['\"]/.test(routerSource)) {
  failures.push('src/app/router.tsx must import RouterProvider from react-router/dom for React Router 8');
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

console.log('Frontend dependency update governance check passed (Node 24, TypeScript 6, React Router 8.3+ security line, Dependabot minor/patch groups).');
