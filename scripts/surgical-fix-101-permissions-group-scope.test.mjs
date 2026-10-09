import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const editor = readFileSync(new URL('../src/components/permissions/RolePermissionEditor.tsx', import.meta.url), 'utf8');
const translations = readFileSync(new URL('../src/i18n/tenantUiTranslations.ts', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/components/permissions/RolePermissionEditor.css', import.meta.url), 'utf8');
for (const phrase of ['Group actions change all editable permissions in this group, not the role defaults.', 'Group actions change all shown editable permissions, not the role defaults.']) {
  assert(editor.includes('ui("' + phrase + '")'));
  assert(translations.includes('["' + phrase + '"'));
}
assert(editor.includes('onClick={() => setGroup(items, true)}'));
assert(editor.includes('onClick={() => setGroup(items, false)}'));
assert(css.includes('.role-permission-editor__group-action-help'));
console.log('Batch 101 permissions group scope guard PASS');
