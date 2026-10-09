import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const filename = 'src/components/enterpriseInventory/tabs/AttachmentsTab.tsx';
const source = read(filename);
const catalog = read('src/i18n/tenantUiTranslations.ts');
const packageJson = JSON.parse(read('package.json'));
const checks = [];
const check = (name, condition) => {
  checks.push(Boolean(condition));
  console.log(`${condition ? 'PASS' : 'FAIL'}: ${name}`);
};

const parsed = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const jsx = [];
const tagName = (node) => node.tagName?.getText(parsed);
const visit = (node, ancestors = []) => {
  if (ts.isJsxElement(node)) {
    const name = tagName(node.openingElement);
    jsx.push({ name, node, ancestors });
    ancestors = [...ancestors, name];
  } else if (ts.isJsxSelfClosingElement(node)) {
    jsx.push({ name: tagName(node), node, ancestors });
  }
  ts.forEachChild(node, (child) => visit(child, ancestors));
};
visit(parsed);
const details = jsx.filter((node) => node.name === 'details');
const summaries = jsx.filter((node) => node.name === 'summary');
const cells = jsx.filter((node) => node.name === 'td');
const integrityCell = cells.filter((cell) => cell.node.getText(parsed).includes('item.content_sha256'));
const row = source.slice(source.indexOf('{(attachmentsQuery.data ?? []).map'), source.indexOf('                ))}', source.indexOf('{(attachmentsQuery.data ?? []).map')));

check('TSX parser produced no errors', parsed.parseDiagnostics.length === 0);
check('Ordinary table has only File, Type / size, Stored and Actions columns', source.includes("['File','Type / size','Stored','Actions']") && !source.includes("['File','Type / size','Stored','Integrity','Actions']"));
check('Exactly four attachment row cells, matching table headers', (row.match(/<td\b/g) ?? []).length === 4);
check('Technical digest appears only inside the stored-date cell', details.length === 1 && integrityCell.length === 1 && details[0].ancestors.includes('td') && integrityCell[0].node.getText(parsed).includes('formatLocalizedDateTime(item.created_at, locale)'));
check('Disclosure is initially collapsed, with no open attribute', !/\bopen(?:=|\s|>)/u.test(details[0]?.node.openingElement.getText(parsed) ?? ''));
check('Disclosure is present only when a checksum exists', /\{item\.content_sha256\s*\?\s*\(\s*<details\b/u.test(source));
check('Disclosure summary uses established translated Technical details label', summaries.length === 1 && summaries[0].node.getText(parsed).includes("ui('Technical details')"));
check('Digest is the full stored value, never a truncated preview', details[0]?.node.getText(parsed).includes('<code>{item.content_sha256}</code>') && !source.includes('item.content_sha256.slice('));
check('Long digests wrap within the table cell', details[0]?.node.getText(parsed).includes("overflowWrap: 'anywhere'"));
check('Exactly one existing DE/ES/FR/HR translation for Technical details', (catalog.match(/^\s*\["Technical details", "[^"]+", "[^"]+", "[^"]+", "[^"]+"\],?$/gmu) ?? []).length === 1);
check('Attachment upload preserves selected record and original file mutation', source.includes('createAttachmentMutation.mutate({') && source.includes('form: attachmentForm,') && source.includes('file: selectedFile,'));
check('File picker and 8MB maximum preserved', source.includes('<EnterpriseFilePicker') && source.includes('MAX_FILE_BYTES = 8 * 1024 * 1024'));
check('Download endpoint and original filename preserved', source.includes('`/enterprise-inventory/attachments/${encodeURIComponent(attachment.id)}/download`') && source.includes('attachment.original_filename'));
check('Download still respects capability and pending state', source.includes('!attachment.can_download || downloadingId') && source.includes('disabled={!item.can_download || downloadingId === item.id}'));
check('Delete preserves permission, archived-record guard and confirmation', source.includes("window.confirm(ui('Delete attachment \"{filename}\"?')") && source.includes('disabled={!canWriteAttachments || selectedRecordArchived || deleteAttachmentMutation.isPending}'));
check('Technical checksum is neither removed from the model nor sent in mutations', source.includes('item.content_sha256') && !source.includes('delete item.content_sha256'));
check('Regression command is registered', packageJson.scripts?.['check:inventory-attachment-integrity-details-v349314'] === 'node scripts/check-attachment-integrity-details-surgical-fix-v349314.mjs');

const passed = checks.filter(Boolean).length;
console.log(`Attachment integrity technical disclosure: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exitCode = 1;
