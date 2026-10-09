import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import ts from 'typescript';

const root = process.cwd();
const users = fs.readFileSync(path.join(root, 'src/pages/UsersPage.tsx'), 'utf8');
const app = fs.readFileSync(path.join(root, 'src/app/AppProviders.tsx'), 'utf8');
const backend = fs.readFileSync(path.join(root, '../hotel-inventory-backend/src/controllers/usersController.js'), 'utf8');
const catalog = fs.readFileSync(path.join(root, 'src/i18n/tenantUiTranslations.ts'), 'utf8');
let checks = 0;
const check = (name, fn) => { fn(); checks++; console.log(`PASS ${String(checks).padStart(2,'0')}: ${name}`); };
const present = (s, q) => assert.ok(s.includes(q), `Expected ${q}`);
const handler = (name, next) => {
  const begin = users.indexOf(`const ${name} = `);
  assert.ok(begin >= 0, `missing handler ${name}`);
  const end = users.indexOf(`const ${next} = `, begin + 5);
  assert.ok(end > begin, `missing ${next} after ${name}`);
  return users.slice(begin, end);
};
const deleteBlock = handler('handleDelete','handleCancelEdit');
const statusBlock = handler('handleStatusChange','handleDelete');
const renderStart=users.indexOf('className="users-card__actions"');
assert.ok(renderStart>0);
const renderEnd=users.indexOf('</div>',renderStart);
const render = users.slice(renderStart, renderEnd);

check('global capture explicitly honors a local confirmation skip', ()=>present(app, "element.dataset.skipGlobalConfirm === 'true'"));
check('global button interception tests skip before identifying danger', ()=>assert.match(app,/isActionExplicitlySkipped\(button\)[\s\S]*?isDangerousButtonLabel\(canonicalLabel\)/));
check('no changes to global dangerous-action confirmation implementation', ()=>present(app, "originalConfirm(confirmationMessage)"));
check('three context-specific lifecycle button opt-outs only', ()=>assert.equal((users.match(/data-skip-global-confirm="true"/g)||[]).length,3));
for (const [label, pattern] of [
  ['Deactivate', /onClick=\{\(\) => handleStatusChange\(user\)\}\s+data-skip-global-confirm="true"\s+disabled=\{!canWrite \|\| statusMutation\.isPending \|\| onlyActiveAdmin\}/],
  ['Reactivate', /onClick=\{\(\) => handleStatusChange\(user\)\}\s+data-skip-global-confirm="true"\s+disabled=\{!canWrite \|\| statusMutation\.isPending\}/],
  ['Delete', /onClick=\{\(\) => handleDelete\(user\)\}\s+data-skip-global-confirm="true"\s+disabled=\{!canWrite \|\| deleteMutation\.isPending\}/]
]) check(`${label} button uses own handler, bypasses generic capture and keeps disabled rule`, ()=>assert.match(render,pattern));
check('no broad skip on the entire Users page',()=>assert.doesNotMatch(users,/data-skip-global-action-feedback/));
check('delete handler remains write-permission gated',()=>present(deleteBlock,'if (!canWrite) {'));
check('delete handler cannot delete current signed-in user',()=>present(deleteBlock,'user.id === currentUserId'));
check('delete handler refuses deletion while account active',()=>present(deleteBlock,'if (isUserActive(user))'));
check('delete confirmation is explicitly permanent and record-specific',()=>present(deleteBlock, '`${ui("Permanently delete inactive user")} "${user.name}"?'));
check('delete confirmation explains irreversibility and history constraints',()=>present(deleteBlock, 'This cannot be undone and may still be blocked when business history references this account.'));
check('delete prompt still uses the original native confirmation flow',()=>present(deleteBlock,'const confirmed = window.confirm('));
check('cancel delete leaves mutation untouched',()=>assert.match(deleteBlock,/if \(!confirmed\) \{\s+return;\s+\}[\s\S]*deleteMutation\.mutate\(user\.id\);/));
check('delete submits selected user id only after confirmation',()=>present(deleteBlock,'deleteMutation.mutate(user.id)'));
check('deactivation protects current user',()=>present(statusBlock,'You cannot deactivate your own user account.'));
check('activation and deactivation use correct descriptive prompts',()=>{present(statusBlock,'Their active sessions will be revoked');present(statusBlock,'They will be allowed to sign in again');});
check('status confirmation contains selected user name',()=>present(statusBlock,'"${user.name}"?'));
check('cancel status does not invoke mutation',()=>assert.match(statusBlock,/if \(!confirmed\) \{\s+return;\s+\}[\s\S]*statusMutation\.mutate/));
check('status payload remains unchanged',()=>present(statusBlock,'statusMutation.mutate({ id: user.id, isActive: !currentlyActive })'));
check('delete button stays restricted to inactive accounts',()=>assert.match(users,/active \? \([\s\S]*?\) : \([\s\S]*?handleDelete\(user\)/));
check('delete button keeps visible danger styling',()=>present(render,'app-button--danger users-action-button'));
check('backend delete remains tenant-scoped',()=>present(backend,'DELETE FROM users WHERE id = $1 AND tenant_id = $2 RETURNING id'));
check('backend delete rejects active account',()=>present(backend,'USER_DELETE_ACTIVE_FORBIDDEN'));
check('backend delete rejects self',()=>present(backend,'USER_DELETE_SELF_FORBIDDEN'));
check('backend delete preserves referenced history',()=>present(backend,'USER_DELETE_HISTORY_CONFLICT'));
check('backend maintains deletion audit evidence',()=>present(backend,"action: 'tenant_user.delete'"));
for (const key of ['Permanently delete inactive user','This cannot be undone and may still be blocked when business history references this account.','Deactivate user','Activate user','Their active sessions will be revoked and they will no longer be able to sign in.','They will be allowed to sign in again with their existing credentials.']){
  check(`existing tenant translation key retained: ${key.slice(0,32)}`,()=>present(catalog, `["${key}",`));
}
check('UsersPage isolated TypeScript transpilation has no syntax diagnostics',()=>{
 const diagnostics=ts.transpileModule(users,{fileName:'UsersPage.tsx',compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},reportDiagnostics:true}).diagnostics || [];
 assert.equal(diagnostics.length,0,diagnostics.map(d=>d.messageText).join('; '));
});
console.log(`BATCH095 FOCUSED: ${checks}/${checks} PASS`);
