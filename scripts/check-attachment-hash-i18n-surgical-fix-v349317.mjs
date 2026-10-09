import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const relative = 'src/components/enterpriseInventory/tabs/AttachmentsTab.tsx';
const source = read(relative);
const rows = read('src/i18n/tenantUiTranslations.ts');
const pkg = JSON.parse(read('package.json'));
const tests = [];
const check = (description, ok) => {
  tests.push(Boolean(ok));
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${description}`);
};
const sf = ts.createSourceFile(relative, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const expected = ['SHA-256 checksum:', 'SHA-256-Prüfsumme:', 'Suma de verificación SHA-256:', 'Somme de contrôle SHA-256 :', 'Kontrolni zbroj SHA-256:'];
const matches = [...rows.matchAll(/^\s*\[("(?:\\.|[^"\\])*"),\s*("(?:\\.|[^"\\])*"),\s*("(?:\\.|[^"\\])*"),\s*("(?:\\.|[^"\\])*"),\s*("(?:\\.|[^"\\])*")\],?\s*$/gm)];
const catalog = matches.map(m=>m.slice(1).map(JSON.parse));
const labelRows = catalog.filter(r=>r[0]===expected[0]);

check('Attachments TSX parses without error', sf.parseDiagnostics.length===0);
check('One and only one SHA-256 translation key exists', labelRows.length===1);
for (let i=0;i<5;i++) check(`Locale ${['EN','DE','ES','FR','HR'][i]} has expected localized checksum label`, labelRows.length===1 && labelRows[0][i]===expected[i]);
check('Key is rendered with shared tenant ui() translation function', source.includes("{ui('SHA-256 checksum:')} <code>{item.content_sha256}</code>"));
check('Old raw JSX checksum label is removed', !source.includes('SHA-256: <code>'));
check('Checksum remains behind translated collapsed Technical details disclosure', /\{item\.content_sha256\s*\?\s*\(\s*<details\b[\s\S]*?<summary[^>]*>\{ui\('Technical details'\)\}<\/summary>[\s\S]*?\{ui\('SHA-256 checksum:'\)\}\s*<code>\{item\.content_sha256\}<\/code>[\s\S]*?<\/details>/.test(source));
check('File table remains four-column business view', source.includes("['File','Type / size','Stored','Actions']"));
check('Full original checksum remains untruncated', source.includes('<code>{item.content_sha256}</code>') && !source.includes('item.content_sha256.slice('));
check('Existing upload, download and delete behavior is retained', source.includes('createAttachmentMutation.mutate({') && source.includes('downloadEnterpriseInventoryFile(') && source.includes('deleteAttachmentMutation.mutate(item.id)'));
check('Batch079 check command registered', pkg.scripts?.['check:inventory-attachment-hash-i18n-v349317']==='node scripts/check-attachment-hash-i18n-surgical-fix-v349317.mjs');
const passed=tests.filter(Boolean).length;
console.log(`Batch079 attachment hash multilingual correction: ${passed}/${tests.length} PASS`);
if(passed!==tests.length) process.exitCode=1;
