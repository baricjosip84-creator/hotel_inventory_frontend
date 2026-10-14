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
check(file.includes('onError: (err) => setWebhookActionError(messageFrom(err, ui("Unable to queue webhook test."), ui))'),'Error feedback preserved');
check(file.includes('onError: (err) => setWebhookActionError(messageFrom(err, ui("Unable to rotate webhook secret."), ui))'),'Rotation error preserved');
check(file.includes('onError: (err) => setWebhookActionError(messageFrom(err, ui("Unable to create webhook."), ui))'),'Creation error preserved');
console.log(`Integration webhook action feedback: ${count}/${count} passed`);
