import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const page=read('src/pages/OutboundPage.tsx');
const css=read('src/pages/OutboundPage.css');
const pkg=JSON.parse(read('package.json'));
const a=page.indexOf('<div className="outbound-return-list">{pagedReturns.map((row) => {');
const b=page.indexOf('{returnPageCount > 1 ?',a);
assert(a>=0 && b>a);
const view=page.slice(a,b);
const item=view.slice(view.indexOf('<div className="outbound-return-items">'),view.indexOf('<div className="outbound-return-action-area">'));
const actions=view.slice(view.indexOf('<div className="outbound-return-action-area">'),view.indexOf('{cancelReturnId === row.id ?'));
const checks=[
 ['row key remains stable',()=>assert.match(view,/key=\{row\.id\}/)],
 ['return card expanded state matches selected return',()=>assert.match(view,/selectedReturnId === row\.id \? ' outbound-return-card--expanded'/)],
 ['sidebar attention marker retained',()=>assert.match(view,/SidebarAttentionMarker label=\{ui\('Attention required'\)\}/)],
 ['return number and customer preserved',()=>assert.match(view,/row\.return_number\} · \{referenceLabel\(row\.customer_name\)\}/)],
 ['status badge unchanged',()=>assert.match(view,/<StatusBadge status=\{row\.status\}/)],
 ['reason remains visible',()=>assert.match(view,/<strong>\{ui\('Reason:'\)\}<\/strong><span>\{row\.reason\}<\/span>/)],
 ['reason notes conditional',()=>assert.match(view,/row\.notes \? <span className="outbound-return-reason-note">\{row\.notes\}/)],
 ['cancellation warning preserved',()=>assert.match(view,/row\.status === 'cancelled' && row\.cancellation_reason/)],
 ['items retain unique ids',()=>assert.match(item,/row\.items\.map\(\(item\) => <div key=\{item\.id\}/)],
 ['product identity retained',()=>assert.match(item,/referenceLabel\(item\.product_name\)/)],
 ['sku retained',()=>assert.match(item,/ui\('SKU:'\)\} \{referenceLabel\(item\.product_sku\)/)],
 ['quantity retains numeric formatter and unit',()=>assert.match(item,/ui\('Quantity'\)[\s\S]*?formatNumber\(item\.quantity\)\} \{referenceLabel\(item\.product_unit\)/)],
 ['condition formatter retained',()=>assert.match(item,/ui\('Condition'\)[\s\S]*?formatStatus\(item\.condition\)/)],
 ['destination stays visible',()=>assert.match(item,/ui\('Return to location'\)[\s\S]*?referenceLabel\(item\.storage_location_name\)/)],
 ['lot and batch conditional',()=>assert.match(item,/item\.lot_number \|\| item\.batch_number \? [\s\S]*?item\.lot_number \? [\s\S]*?item\.batch_number \?/)],
 ['serials and notes retained',()=>{assert.match(item,/item\.serial_numbers\?\.length/); assert.match(item,/item\.notes \?/)}],
 ['action context uses exact return reference',()=>assert.match(actions,/outbound-return-action-context[\s\S]*?\{row\.return_number\}/)],
 ['open details toggles only selected id',()=>assert.match(actions,/setSelectedReturnId\(selectedReturnId === row\.id \? '' : row\.id\)/)],
 ['detail toggle resets pagination and previews',()=>assert.match(actions,/setReturnAuditPage\(1\); setReturnDocumentPreview\(null\); setAttachmentFile\(null\)/)],
 ['receive gated on draft and permission',()=>assert.match(actions,/row\.status === 'draft' && canReturnReceive/)],
 ['receive gated by confirmation',()=>assert.match(actions,/window\.confirm\(ui\('Receive this customer return into inventory now\?'\)\)/)],
 ['receive backend path and concurrency version untouched',()=>assert.match(actions,/`\/outbound\/returns\/\$\{row\.id\}\/receive`, version: Number\(row\.version\)/)],
 ['cancel gated on draft and permission',()=>assert.match(actions,/row\.status === 'draft' && canReturnCancel/)],
 ['cancel action retains row-scoped id',()=>assert.match(actions,/setCancelReturnId\(cancelReturnId === row\.id \? '' : row\.id\)/)],
 ['cancel mutation retains reason validation/version',()=>assert.match(view,/cancelReturnReason\.trim\(\)\.length < 3[\s\S]*?`\/outbound\/returns\/\$\{row\.id\}\/cancel`, version: Number\(row\.version\)/)],
 ['details remain gated on selected return',()=>assert.match(view,/selectedReturnId === row\.id \? <div className="outbound-detail-grid"/)],
 ['expanded sections remain present',()=>{for(const name of ['Activity','Documents','Email history','Attachments'])assert.match(view,new RegExp(`ui\\('${name}'\\)`))}],
 ['card and action separation CSS',()=>{assert.match(css,/\.outbound-return-card \{[\s\S]*?border-color: #cbd5e1;/);assert.match(css,/\.outbound-return-action-area \{[\s\S]*?border: 1px solid/)}],
 ['item metrics and responsive single column',()=>{assert.match(css,/\.outbound-return-item-metrics \{[\s\S]*?grid-template-columns: repeat\(3/);assert.match(css,/@media \(max-width: 760px\) \{\s*\.outbound-return-item-metrics \{ grid-template-columns: 1fr;/)}],
 ['expanded details visual boundary only',()=>assert.match(css,/\.outbound-return-card--expanded > \.outbound-detail-grid \{[\s\S]*?border: 1px solid/)],
 ['script registered',()=>assert.equal(pkg.scripts['check:outbound-return-record-clarity-v349325'],'node scripts/check-outbound-return-record-clarity-surgical-fix-v349325.mjs')],
];
for(const [name,fn] of checks){try{fn();console.log('PASS:',name)}catch(err){console.error('FAIL:',name);throw err}}
console.log(`Outbound customer-return record clarity: ${checks.length}/${checks.length} PASS`);
