import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const api = read('src/lib/api.ts');
const users = read('src/pages/UsersPage.tsx');
const i18n = read('src/i18n/tenantUiTranslations.ts');
const pkg = JSON.parse(read('package.json'));

const ast = ts.createSourceFile('api.ts', api, ts.ScriptTarget.Latest, true);
const names = [
  'isProductPackageMutationPath',
  'readMutationStringField',
  'readMutationBooleanField',
  'readMutationNumberField',
  'readMutationAction',
  'barcodeLabelCreatedMessage',
  'tenantMutationActionLabel',
  'tenantMutationSuccessMessage',
];
const extracted = new Map();
for (const node of ast.statements) {
  if (ts.isFunctionDeclaration(node) && node.name && names.includes(node.name.text)) {
    extracted.set(node.name.text, node.getText(ast));
  }
}
if (extracted.size !== names.length) throw new Error(`Required API functions absent: ${names.filter(n => !extracted.has(n)).join(', ')}`);
const code = names.map(name => extracted.get(name)).join('\n') + '\nmodule.exports = { tenantMutationSuccessMessage, readMutationBooleanField };';
const transpiled = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true });
if (transpiled.diagnostics?.length) throw new Error('Isolated TS transpilation failed');
const sandbox = { module: { exports: {} } };
vm.runInNewContext(transpiled.outputText, sandbox, { timeout: 5000 });
const { tenantMutationSuccessMessage: success, readMutationBooleanField: readBoolean } = sandbox.module.exports;

const checks = [];
function check(title, condition) {
  const ok = Boolean(condition);
  checks.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${title}`);
}
const trueStatus = JSON.stringify({ is_active: true });
const falseStatus = JSON.stringify({ is_active: false });
check('Status activation displays action-specific user feedback', success('/users/abc/status', 'PATCH', trueStatus) === 'User activated successfully.');
check('Status deactivation displays action-specific user feedback', success('/users/abc/status', 'PATCH', falseStatus) === 'User deactivated successfully.');
check('Query strings do not interfere with activation label', success('/users/a1/status?mode=verified', 'PATCH', trueStatus) === 'User activated successfully.');
check('API method is case-insensitive for status writes', success('/users/a1/status', 'patch', falseStatus) === 'User deactivated successfully.');
check('Missing status payload never invents activated/deactivated outcome', success('/users/abc/status', 'PATCH') === 'User updated successfully.');
check('Malformed JSON does not announce an activation outcome', success('/users/abc/status', 'PATCH', '{not-json') === 'User updated successfully.');
check('String false is not mistaken for boolean false', success('/users/abc/status', 'PATCH', '{"is_active":"false"}') === 'User updated successfully.');
check('Boolean parser reads true', readBoolean(trueStatus, 'is_active') === true);
check('Boolean parser reads false', readBoolean(falseStatus, 'is_active') === false);
check('Boolean parser rejects numbers', readBoolean('{"is_active":0}', 'is_active') === null);
check('User PUT edit feedback says updated, not saved', success('/users/abc', 'PUT', '{}') === 'User updated successfully.');
check('User PATCH edit fallback also says updated', success('/users/abc', 'PATCH', '{}') === 'User updated successfully.');
check('User create feedback remains correct', success('/users', 'POST', '{}') === 'User created successfully.');
check('User delete feedback remains correct', success('/users/abc', 'DELETE') === 'User deleted successfully.');
check('Unrelated supplier update feedback remains unchanged', success('/suppliers/abc', 'PUT', '{}') === 'Supplier saved successfully.');
check('Unrelated supplier creation feedback remains unchanged', success('/suppliers', 'POST', '{}') === 'Supplier created successfully.');
check('Status write still PATCHes /users/{id}/status with is_active boolean', users.includes('`/users/${input.id}/status`') && users.includes("method: 'PATCH',\n    body: JSON.stringify({ is_active: input.isActive })"));
check('Edit write still uses PUT and expected_revision', users.includes('`/users/${input.id}`') && users.includes("method: 'PUT'") && users.includes('expected_revision: input.revision'));
check('Page feedback retains distinct activation/deactivation and edit messages', users.includes('ui("User activated successfully.")') && users.includes('ui("User deactivated successfully.")') && users.includes('ui("User updated successfully.")'));
check('Central API success toast still emits and translates business label', api.includes("dispatchTenantMutationFeedback({ type: 'success', message: tenantMutationSuccessMessage(path, method, requestOptions.body), translateMessage: true })"));
check('User mutation error handling remains on the page', users.includes('getMutationFieldErrors(error, ui)') && (users.includes('setPageError(error instanceof ApiError ? error.message : ui("Failed to update user."))') || (users.includes("isTenantUserEmailConflict(error, `/users/${input.id}`, 'PUT')") && users.includes('error instanceof ApiError ? error.message : ui("Failed to update user.")'))));
for (const label of ['User activated successfully.', 'User deactivated successfully.', 'User updated successfully.', 'User created successfully.', 'User deleted successfully.']) {
  const line = i18n.split('\n').find(l => l.includes(`"${label}"`));
  check(`Existing German, Spanish, French and Croatian translations: ${label}`, Boolean(line && (line.match(/"/g) || []).length >= 10));
}
check('Dedicated regression script is registered', pkg.scripts?.['check:users-lifecycle-feedback-v349316'] === 'node scripts/check-users-lifecycle-feedback-surgical-fix-v349316.mjs');
const passed = checks.filter(Boolean).length;
console.log(`Users lifecycle feedback surgical fix: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exitCode = 1;
