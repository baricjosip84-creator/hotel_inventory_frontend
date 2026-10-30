#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const file = readFileSync(new URL('../src/pages/InventoryCapabilitiesPage.tsx', import.meta.url),'utf8');
const ast = ts.createSourceFile('InventoryCapabilitiesPage.tsx',file,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let count=0;const check=(ok,label)=>{assert.ok(ok,label);count++;};
check(ast.parseDiagnostics.length===0,'TSX syntax parses cleanly');
for(const [name,endpoint,inline] of [
 ['create webhook',"'/inventory-capabilities/webhooks'",'Webhook created. Events will be queued automatically'],
 ['test webhook','`/inventory-capabilities/webhooks/${id}/test`','Test webhook queued. Delivery status will appear below.' ],
 ['rotate webhook','`/inventory-capabilities/webhooks/${row.id}/rotate-secret`','Webhook secret rotated. Copy the new secret now.' ]
]){
 const pos=file.indexOf(endpoint);
 check(pos!==-1,`${name}: target exists`);
 const fragment=file.slice(pos,pos+350);
 check(fragment.includes('skipMutationFeedback: true'),`${name}: generic toast suppressed`);
 check(file.includes(inline),`${name}: specific inline success remains`);
}
// Inspect the actual onError callbacks, not a single obsolete one-line formatting.
// Each webhook failure must update both the nearby error and the visible toast.
const errorCallbacks = [];
const visit = (node) => {
  if (ts.isPropertyAssignment(node) && node.name.getText(ast) === 'onError') {
    errorCallbacks.push(node.initializer.getText(ast));
  }
  ts.forEachChild(node, visit);
};
visit(ast);
for (const [fallback, label] of [
  ['Unable to queue webhook test.', 'Error feedback preserved'],
  ['Unable to rotate webhook secret.', 'Rotation error preserved'],
  ['Unable to create webhook.', 'Creation error preserved']
]) {
  const callback = errorCallbacks.find((body) => body.includes(`ui("${fallback}")`));
  check(Boolean(callback
    && /messageFrom\s*\(\s*err\s*,/.test(callback)
    && /setWebhookActionError\s*\(\s*message\s*\)/.test(callback)
    && /showTenantActionError\s*\(\s*message\s*\)/.test(callback)), label);
}
console.log(`Integration webhook action feedback: ${count}/${count} passed`);
