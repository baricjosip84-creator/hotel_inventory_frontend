import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
let checks = 0;
function check(condition, explanation) {
  checks++;
  assert.ok(condition, explanation);
}
function has(source, text, label) { check(source.includes(text), `${label}: missing ${text}`); }

const tenant = load('src/pages/TenantPermissionsPage.tsx');
const editor = load('src/components/permissions/RolePermissionEditor.tsx');
const policy = load('src/lib/permissionPolicies.ts');
const events = load('src/lib/actionFeedback.ts');
const provider = load('src/app/AppProviders.tsx');

has(tenant, "import { useEffect, useMemo, useState } from 'react';", 'React hooks');
has(tenant, "import { showTenantActionError, showTenantActionSuccess } from '../lib/actionFeedback';", 'Shared action feedback');
has(tenant, 'if (successMessage) showTenantActionSuccess(successMessage);', 'Success at any scroll position');
has(tenant, 'if (errorMessage) showTenantActionError(errorMessage);', 'Failure at any scroll position');
has(tenant, '}, [successMessage]);', 'Success only on state change');
has(tenant, '}, [errorMessage]);', 'Failure only on state change');
check((tenant.match(/showTenantActionSuccess\(successMessage\)/g) || []).length === 1, 'No duplicate success emission');
check((tenant.match(/showTenantActionError\(errorMessage\)/g) || []).length === 1, 'No duplicate failure emission');
has(tenant, 'setSuccessMessage(`${roleName(updated)} ${ui("permissions saved successfully.")}`)', 'Saved role feedback');
has(tenant, 'permissions reset to defaults.', 'Role reset feedback');
has(tenant, 'custom role created successfully.', 'Custom role create feedback');
has(tenant, 'details updated successfully.', 'Custom role update feedback');
has(tenant, 'activated successfully.', 'Custom role activation feedback');
has(tenant, 'deactivated successfully.', 'Custom role deactivation feedback');
has(tenant, 'deleted successfully.', 'Custom role removal feedback');
has(tenant, 'setSuccessMessage(null);', 'Clear preceding state before action');
has(tenant, 'if (!confirmed) return;', 'Cancelled permissions write does not notify');
has(tenant, 'if (!window.confirm(', 'Cancelled lifecycle write does not notify');
has(editor, '{successMessage}', 'Inline success remains');
has(editor, '{errorMessage}', 'Inline error remains');
has(editor, 'onClick={() => void onSave()}', 'Editor action bar remains');
check((policy.match(/skipMutationFeedback: true/g) || []).length >= 8, 'Role API handlers suppress generic toast duplicates');
has(events, 'TENANT_MUTATION_FEEDBACK_EVENT', 'Existing shared event bus');
has(provider, 'function ActionFeedbackToasts()', 'Viewport-fixed shared toast consumer');
has(provider, 'window.addEventListener(TENANT_MUTATION_FEEDBACK_EVENT, handleTenantFeedback);', 'Event listener connected');
has(provider, 'window.setTimeout(', 'Automatic toast dismissal');

const req = createRequire(import.meta.url);
let ts;
ts = req('typescript');
const result = ts.transpileModule(tenant, { fileName:'TenantPermissionsPage.tsx', reportDiagnostics:true, compilerOptions:{ jsx:ts.JsxEmit.ReactJSX, module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022 } });
check((result.diagnostics || []).length === 0, 'TenantPermissionsPage TypeScript parse has zero diagnostics');
const actionJs = ts.transpileModule(events, { fileName:'actionFeedback.ts', reportDiagnostics:true, compilerOptions:{ module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022 } });
check((actionJs.diagnostics || []).length === 0, 'Shared feedback module TypeScript parse has zero diagnostics');

const emitted=[];
class FakeEvent { constructor(name, options) { this.type=name; this.detail=options.detail; } }
const module={exports:{}};
vm.runInNewContext(actionJs.outputText, {exports:module.exports,module,CustomEvent:FakeEvent,window:{dispatchEvent:(event)=>emitted.push(event)}}, {filename:'actionFeedback.js'});
module.exports.showTenantActionSuccess('Manager permissions saved successfully.');
module.exports.showTenantActionError('Custom role could not be updated.');
check(emitted.length === 2, 'Success and error emit exactly two events');
check(emitted[0].type === 'tenant-mutation-feedback', 'Success routes to tenant bus');
check(emitted[0].detail.type === 'success', 'Success toast severity');
check(emitted[0].detail.message === 'Manager permissions saved successfully.', 'Exact business success text maintained');
check(emitted[1].detail.type === 'error', 'Failure toast severity');
check(emitted[1].detail.message === 'Custom role could not be updated.', 'Exact failure details maintained');

console.log(`Batch110 permissions feedback visibility: ${checks}/${checks} PASS`);
