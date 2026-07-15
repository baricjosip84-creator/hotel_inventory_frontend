import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'coverage', 'test-results', 'playwright-report', '.cache', 'tmp', 'temp']);
const ignoredExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.zip', '.gz', '.tgz', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.mov']);
const forbiddenFrontendKeys = /\b(?:JWT_SECRET|JWT_REFRESH_SECRET|DB_PASSWORD|DATABASE_URL|OPENAI_API_KEY|SENDGRID_API_KEY|MAILTRAP_API_TOKEN|SMTP_PASSWORD|AWS_SECRET_ACCESS_KEY|STRIPE_SECRET_KEY|SENTRY_AUTH_TOKEN|SESSION_SECRET|ENCRYPTION_KEY)\b/;
const tokenRules = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['OpenAI-style secret', /\bsk-[A-Za-z0-9_-]{20,}\b/],
  ['GitHub token', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b/],
  ['AWS access key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['SendGrid key', /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/]
];

function trackedFiles() {
  const result = spawnSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0 || !result.stdout) return null;
  return result.stdout.split('\0').filter(Boolean);
}
function walk(directory, prefix = '') {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolute, relative));
    else if (entry.isFile()) files.push(relative);
  }
  return files;
}
function lineNumber(source, index) { return source.slice(0, index).split('\n').length; }

const files = trackedFiles() || walk(root);
const findings = [];
for (const relative of files) {
  const normalized = relative.replace(/\\/g, '/');
  if (normalized === '.env' || /^\.env\.(?!example$|production$|[^/]+\.example$)/.test(normalized)) {
    findings.push(`${normalized}: prohibited environment file is part of the source set`);
    continue;
  }
  if (ignoredExtensions.has(path.extname(normalized).toLowerCase())) continue;
  let source;
  try {
    const buffer = fs.readFileSync(path.join(root, relative));
    if (buffer.includes(0)) continue;
    source = buffer.toString('utf8');
  } catch { continue; }

  for (const [label, pattern] of tokenRules) {
    const match = source.match(pattern);
    if (match) findings.push(`${normalized}:${lineNumber(source, match.index || 0)}: ${label}`);
  }
  if ((normalized.startsWith('src/') || normalized.startsWith('public/') || normalized.startsWith('.env')) && forbiddenFrontendKeys.test(source)) {
    findings.push(`${normalized}: server-only secret/configuration key is present in frontend-delivered source`);
  }
}
if (findings.length) {
  console.error('Committed frontend secret scan failed. Values are intentionally not printed:');
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}
console.log(`Committed frontend secret scan passed (${files.length} source files inspected).`);
