import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const srcDir = join(root, 'src');
const chunkSize = Math.max(1, Number(process.env.TYPECHECK_CHUNK_SIZE || 8));
const childTimeoutSeconds = Math.max(
  5,
  Number(process.env.TYPECHECK_CHILD_TIMEOUT_SECONDS || 30),
);
const onlyChunk = process.env.TYPECHECK_ONLY_CHUNK
  ? Number(process.env.TYPECHECK_ONLY_CHUNK)
  : null;
const chunkFrom = process.env.TYPECHECK_CHUNK_FROM
  ? Number(process.env.TYPECHECK_CHUNK_FROM)
  : null;
const chunkTo = process.env.TYPECHECK_CHUNK_TO
  ? Number(process.env.TYPECHECK_CHUNK_TO)
  : null;
const listChunks = process.env.TYPECHECK_LIST_CHUNKS === 'true';

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      files.push(...walk(full));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    if (/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) continue;
    files.push(relative(root, full).replace(/\\/g, '/'));
  }
  return files;
}

const files = walk(srcDir).sort();
const chunks = [];
for (let index = 0; index < files.length; index += chunkSize) {
  chunks.push(files.slice(index, index + chunkSize));
}

if (listChunks) {
  console.log(`Bounded frontend typecheck has ${chunks.length} chunks for ${files.length} source files.`);
  chunks.forEach((chunk, index) => {
    console.log(
      `${index + 1}: ${chunk[0]} through ${chunk[chunk.length - 1]} (${chunk.length} files)`,
    );
  });
  process.exit(0);
}

function assertChunkNumber(name, value) {
  if (value === null) return;
  if (!Number.isInteger(value) || value < 1 || value > chunks.length + 1) {
    throw new Error(
      `${name} must be between 1 and ${chunks.length + 1}; received ${process.env[name]}.`,
    );
  }
}

assertChunkNumber('TYPECHECK_ONLY_CHUNK', onlyChunk);
assertChunkNumber('TYPECHECK_CHUNK_FROM', chunkFrom);
assertChunkNumber('TYPECHECK_CHUNK_TO', chunkTo);

if (onlyChunk !== null && (chunkFrom !== null || chunkTo !== null)) {
  throw new Error('Use either TYPECHECK_ONLY_CHUNK or TYPECHECK_CHUNK_FROM/TYPECHECK_CHUNK_TO, not both.');
}

if ((chunkFrom === null) !== (chunkTo === null)) {
  throw new Error('TYPECHECK_CHUNK_FROM and TYPECHECK_CHUNK_TO must be provided together.');
}

if (chunkFrom !== null && chunkTo !== null && chunkFrom > chunkTo) {
  throw new Error('TYPECHECK_CHUNK_FROM must be less than or equal to TYPECHECK_CHUNK_TO.');
}

const commonArgs = [
  '--ignoreConfig',
  '--noEmit',
  '--pretty',
  'false',
  '--skipLibCheck',
  '--jsx',
  'react-jsx',
  '--moduleResolution',
  'bundler',
  '--module',
  'esnext',
  '--target',
  'es2023',
  '--lib',
  'ES2023,DOM,DOM.Iterable',
  '--types',
  'vite/client',
  '--allowImportingTsExtensions',
  '--verbatimModuleSyntax',
  '--moduleDetection',
  'force',
  '--noUnusedLocals',
  '--noUnusedParameters',
  '--erasableSyntaxOnly',
  '--noFallthroughCasesInSwitch',
];

function formatSeconds(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

function runTsc(label, args, coveredFiles) {
  const startedAt = Date.now();
  console.log(`Running ${label}...`);
  const result = spawnSync(
    process.execPath,
    ['node_modules/typescript/bin/tsc', ...args],
    {
      cwd: root,
      env: process.env,
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
      timeout: childTimeoutSeconds * 1000,
    },
  );
  const duration = Date.now() - startedAt;
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) {
    if (result.error.code === 'ETIMEDOUT') {
      throw new Error(
        `TypeScript check timed out for ${label} after ${childTimeoutSeconds.toFixed(0)}s. ` +
          `Covered files: ${coveredFiles.join(', ')}`,
      );
    }
    throw result.error;
  }
  if (result.signal === 'SIGTERM') {
    throw new Error(
      `TypeScript check was terminated for ${label} after ${childTimeoutSeconds.toFixed(0)}s. ` +
        `Covered files: ${coveredFiles.join(', ')}`,
    );
  }
  if (result.status !== 0) {
    throw new Error(
      `TypeScript check failed for ${label} after ${formatSeconds(duration)} ` +
        `(status ${result.status ?? 'n/a'}, signal ${result.signal ?? 'n/a'}).`,
    );
  }
  console.log(`Finished ${label} in ${formatSeconds(duration)}.`);
}

function runSourceChunk(chunkIndex) {
  const chunk = chunks[chunkIndex - 1];
  runTsc(
    `src chunk ${chunkIndex}/${chunks.length} (${chunk[0]} through ${chunk[chunk.length - 1]})`,
    [...commonArgs, ...chunk],
    chunk,
  );
}


function runChunkSubprocess(chunkIndex) {
  const startedAt = Date.now();
  const label = chunkIndex <= chunks.length ? `src chunk ${chunkIndex}/${chunks.length}` : 'vite config';
  console.log(`Starting isolated ${label}...`);
  const result = spawnSync(
    process.execPath,
    ['scripts/typecheck-full-bounded.mjs'],
    {
      cwd: root,
      env: {
        ...process.env,
        TYPECHECK_ONLY_CHUNK: String(chunkIndex),
        TYPECHECK_CHUNK_FROM: '',
        TYPECHECK_CHUNK_TO: '',
      },
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
      timeout: childTimeoutSeconds * 1000 + 5000,
    },
  );
  const duration = Date.now() - startedAt;
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) {
    if (result.error.code === 'ETIMEDOUT') {
      throw new Error(`Isolated ${label} timed out after ${formatSeconds(duration)}.`);
    }
    throw result.error;
  }
  if (result.signal === 'SIGTERM') {
    throw new Error(`Isolated ${label} was terminated after ${formatSeconds(duration)}.`);
  }
  if (result.status !== 0) {
    throw new Error(`Isolated ${label} failed after ${formatSeconds(duration)} with status ${result.status ?? 'n/a'}.`);
  }
  console.log(`Finished isolated ${label} in ${formatSeconds(duration)}.`);
}

function runViteConfig() {
  runTsc(
    'vite config',
    [
      '--ignoreConfig',
      '--noEmit',
      '--pretty',
      'false',
      '--skipLibCheck',
      '--moduleResolution',
      'bundler',
      '--module',
      'esnext',
      '--target',
      'es2023',
      '--lib',
      'ES2023',
      '--types',
      'node',
      '--allowImportingTsExtensions',
      '--verbatimModuleSyntax',
      '--moduleDetection',
      'force',
      '--noUnusedLocals',
      '--noUnusedParameters',
      '--erasableSyntaxOnly',
      '--noFallthroughCasesInSwitch',
      'vite.config.ts',
    ],
    ['vite.config.ts'],
  );
}

if (onlyChunk !== null) {
  if (onlyChunk <= chunks.length) {
    runSourceChunk(onlyChunk);
    console.log(`Bounded frontend TypeScript chunk ${onlyChunk}/${chunks.length} passed.`);
  } else {
    runViteConfig();
    console.log('Bounded frontend TypeScript vite config chunk passed.');
  }
  process.exit(0);
}

if (chunkFrom !== null && chunkTo !== null) {
  for (let index = chunkFrom; index <= chunkTo; index += 1) {
    runChunkSubprocess(index);
  }
  console.log(`Bounded frontend TypeScript chunks ${chunkFrom}-${chunkTo}/${chunks.length + 1} passed.`);
  process.exit(0);
}

for (let index = 1; index <= chunks.length + 1; index += 1) {
  runChunkSubprocess(index);
}

console.log(
  `Bounded full frontend TypeScript check passed for ${files.length} source files plus vite.config.ts.`,
);
