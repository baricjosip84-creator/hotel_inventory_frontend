import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const platformApiPath = path.join(root, 'src/lib/platformApi.ts');
const source = fs.readFileSync(platformApiPath, 'utf8');

const requiredSnippets = [
  'const WRITE_METHODS = new Set',
  'export type SafePlatformMutationRequestInit',
  'function withPlatformMutationSafetyHeaders',
  "headers.set('If-Match-Version', String(version));",
  "headers.set('Idempotency-Key', idempotencyKey || createIdempotencyKey());",
  'export async function platformApiMutationRequest',
  "'platformApiMutationRequest requires POST, PUT, PATCH, or DELETE.'",
  'const requestOptions = withPlatformMutationSafetyHeaders(path, options);',
  'response = await performRequest(path, requestOptions);'
];

const missing = requiredSnippets.filter((snippet) => !source.includes(snippet));

if (missing.length > 0) {
  console.error('Platform API mutation safety check failed. Missing snippets:');
  for (const snippet of missing) {
    console.error(`- ${snippet}`);
  }
  process.exit(1);
}

if (source.includes('options: RequestInit = {}): Promise<T>')) {
  console.error('Platform API request still exposes raw RequestInit instead of SafePlatformMutationRequestInit.');
  process.exit(1);
}

console.log('Platform API mutation safety check passed.');
