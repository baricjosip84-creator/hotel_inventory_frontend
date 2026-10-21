/** FT042: Fail quickly when a changed page is deployed without its local imports. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sources = path.join(root, 'src');
const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.scss', '.svg', '.png', '.webp', '.jpg', '.jpeg'];
const failures = [];
let inspected = 0;
let imports = 0;

function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      visit(file);
      continue;
    }
    if (!/\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) continue;
    inspected++;
    const source = fs.readFileSync(file, 'utf8');
    // Match regular, side-effect, re-export and simple dynamic relative imports.
    // Line-wise import matching avoids matching unrelated intervening statements.
    const lines = source.split(/\r?\n/);
    for (const [i, line] of lines.entries()) {
      const relativeImports = [];
      const simple = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*|\bexport\s+\*\s+from\s*)['"](\.[^'"\n]+)['"]/g;
      for (const match of line.matchAll(simple)) relativeImports.push(match[1]);
      // Multiline import clauses close with a relative `from` line.
      for (const spec of relativeImports) {
        imports++;
        const target = path.resolve(path.dirname(file), spec.split('?')[0]);
        const found = extensions.some(ext => fs.existsSync(target + ext) && fs.statSync(target + ext).isFile()) ||
          extensions.slice(1).some(ext => fs.existsSync(path.join(target, 'index' + ext)));
        if (!found) failures.push(`${path.relative(root, file)}:${i + 1} -> ${spec}`);
      }
    }
  }
}
visit(sources);
const insights = path.join(sources, 'pages', 'InsightsPage.tsx');
const helper = path.join(sources, 'lib', 'feedAnomalyDisplay.ts');
if (!fs.existsSync(helper) || !fs.readFileSync(insights, 'utf8').includes("from '../lib/feedAnomalyDisplay'")) {
  failures.push('CRITICAL: InsightsPage.tsx requires src/lib/feedAnomalyDisplay.ts');
}
if (failures.length) {
  console.error(`FT042 source integrity FAIL: ${failures.length} missing local imports:\n${failures.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`FT042 source integrity PASS: ${inspected} frontend files, ${imports} local imports, Insights dependency present.`);
}
