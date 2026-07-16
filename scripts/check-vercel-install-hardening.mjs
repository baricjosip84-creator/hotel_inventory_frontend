#!/usr/bin/env node
/* Phase 18 Step 597 — Vercel npm install hardening guardrail */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), 'utf8');
const failures = [];

const packageJson = JSON.parse(read('package.json'));
const vercelJson = JSON.parse(read('vercel.json'));
const npmrc = existsSync(join(root, '.npmrc')) ? read('.npmrc') : '';
const packageLock = read('package-lock.json');

if (vercelJson.installCommand !== 'npm ci --no-audit --no-fund') {
  failures.push('vercel.json must pin installCommand to npm ci --no-audit --no-fund');
}

if (vercelJson.buildCommand !== 'npm run build') {
  failures.push('vercel.json must explicitly use npm run build');
}

if (packageJson.engines?.node !== '24.x') failures.push('frontend package.json must pin engines.node to 24.x');
if (packageJson.engines?.npm !== '>=10 <12') failures.push('frontend package.json must allow supported npm 10 and 11 releases');

const packageLockJson = JSON.parse(packageLock);
if (packageLockJson.packages?.['']?.engines?.node !== '24.x') failures.push('frontend package-lock.json must pin root engines.node to 24.x');
if (packageLockJson.packages?.['']?.engines?.npm !== '>=10 <12') failures.push('frontend package-lock.json must match the supported npm engine range');

if (packageJson.dependencies?.bcrypt) failures.push('frontend package.json must not depend on native bcrypt');
if (packageLock.includes('"node_modules/bcrypt"')) failures.push('frontend package-lock.json must not install native bcrypt');
if (packageLock.includes('packages.applied-caas-gateway1.internal.api.openai.org')) {
  failures.push('frontend package-lock.json must not contain internal registry URLs');
}

if (!npmrc.includes('registry=https://registry.npmjs.org/')) failures.push('frontend .npmrc must pin public npm registry');
if (!npmrc.includes('engine-strict=false')) failures.push('frontend .npmrc must disable engine strictness for hosted build stability');
if (!packageJson.scripts?.['check:vercel-install-hardening']) failures.push('package.json must expose check:vercel-install-hardening');

if (failures.length) {
  console.error('Vercel install hardening check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Vercel install hardening check passed.');
