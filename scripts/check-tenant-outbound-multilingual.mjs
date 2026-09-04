import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const fail=(m)=>{console.error(`FAIL: ${m}`);process.exitCode=1;};
const pass=(m)=>console.log(`PASS: ${m}`);
const translationSource=read('src/i18n/tenantUiTranslations.ts');
const pageSource=read('src/pages/OutboundPage.tsx');
const routerSource=read('src/app/router.tsx');
const rows=[];
for(const line of translationSource.split(/\r?\n/)){const t=line.trim();if(!t.startsWith('[')||!t.endsWith(','))continue;try{const r=JSON.parse(t.slice(0,-1));if(Array.isArray(r)&&r.length===5&&r.every((x)=>typeof x==='string'&&x.length>0))rows.push(r);}catch{}}
const keys=rows.map((r)=>r[0]);const unique=new Set(keys);
if(keys.length!==unique.size)fail('Tenant UI translation catalog contains duplicate English keys.');else pass(`Tenant UI catalog has ${keys.length} unique five-language rows.`);
const literalPattern=/\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decode(lit){if(lit.startsWith('"'))return JSON.parse(lit);const body=lit.slice(1,-1).replace(/\\'/g,"'").replace(/\\\\/g,'\\').replace(/"/g,'\\"');return JSON.parse(`"${body}"`);}
const literals=[];for(const m of pageSource.matchAll(literalPattern)){try{literals.push(decode(m[1]));}catch{}}
const missing=[...new Set(literals.filter((k)=>!unique.has(k)))];
if(missing.length)fail(`Outbound ui() literals missing translations: ${missing.join(' | ')}`);else pass(`Outbound has ${new Set(literals).size} catalog-backed literal UI keys.`);
const errorMapStart=pageSource.indexOf('const OUTBOUND_MUTATION_ERROR_MESSAGES');
const errorMapEnd=pageSource.indexOf('const mutationErrorMessage',errorMapStart+1);
if(errorMapStart<0||errorMapEnd<=errorMapStart)fail('Outbound deterministic mutation-error map is missing.');
else {
  const errorMapSource=pageSource.slice(errorMapStart,errorMapEnd);
  const entries=[...errorMapSource.matchAll(/^\s{2}([A-Z0-9_]+): '([^']+)'/gm)];
  const missingErrorTranslations=[...new Set(entries.map((m)=>m[2]).filter((key)=>!unique.has(key)))];
  if(entries.length<65)fail(`Outbound deterministic mutation-error coverage unexpectedly shrank to ${entries.length} code mappings.`);
  if(missingErrorTranslations.length)fail(`Outbound deterministic mutation-error messages missing translations: ${missingErrorTranslations.join(' | ')}`);
  for(const code of ['CUSTOMER_NAME_CONFLICT','CUSTOMER_ARCHIVE_ACTIVE_OUTBOUND_ORDER','OUTBOUND_REFERENCE_ARCHIVED','OUTBOUND_DISPATCH_REFERENCE_ARCHIVED','CUSTOMER_RETURN_DISPATCH_CHANGED','CUSTOMER_RETURN_ALLOCATION_CLAIM_CHANGED','CUSTOMER_RETURN_LOCATION_HIERARCHY_PARENT','CUSTOMER_RETURN_AVAILABLE_LOCATION_NOT_PICKABLE','OUTBOUND_DOCUMENT_STATE_INVALID','OUTBOUND_DOCUMENT_INTERNAL_ONLY','OUTBOUND_CUSTOMER_EMAIL_REQUIRED']) {
    if(!entries.some((m)=>m[1]===code)) fail(`Outbound deterministic mutation-error mapping missing code: ${code}`);
  }
  if(!process.exitCode)pass(`${entries.length} deterministic Outbound mutation-error codes are catalog-backed.`);
}
for(const required of [
  "import { useAppTranslation } from '../i18n/I18nContext';",
  "import { formatLocalizedDate, formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';",
  "path: 'outbound'",
  'TENANT_PERMISSIONS.OUTBOUND_ORDERS_READ',
  '<OutboundPage />'
]){
  const src=required.startsWith('path:')||required.includes('OUTBOUND_ORDERS_READ')||required.includes('OutboundPage')?routerSource:pageSource;
  if(!src.includes(required))fail(`Outbound multilingual/route wiring missing: ${required}`);
}
if(!process.exitCode)pass('Outbound keeps the shared multilingual runtime and tenant outbound read-route contract.');
const rawText=pageSource.split(/\r?\n/).flatMap((line)=>[...line.matchAll(/<(?:h[1-6]|p|th|td|summary|span|option|button|label|dt|dd|strong|OperationalWorkspaceMetaPill)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g)].map((m)=>m[1].trim()).filter(Boolean));
if(rawText.length)fail(`Raw JSX presentation remains on OutboundPage: ${rawText.join(' | ')}`);else pass('OutboundPage has zero raw direct JSX presentation text.');
const dynamic=new Set();
const a=pageSource.indexOf('const CANONICAL_DISPLAY_LABELS');
const b=pageSource.indexOf('const queryErrorMessage',a+1);
if(a<0||b<=a)fail('Unable to isolate Outbound canonical display-label block.');
else for(const m of pageSource.slice(a,b).matchAll(/:\s*'([^']+)'/g))dynamic.add(m[1]);
const missingDynamic=[...dynamic].filter((k)=>!unique.has(k));
if(missingDynamic.length)fail(`Outbound canonical display keys missing translations: ${missingDynamic.join(' | ')}`);else pass(`${dynamic.size} canonical order, return, condition, and customer-status display labels are catalog-backed.`);
for(const required of [
  'const { locale, ui } = useAppTranslation();',
  'formatLocalizedNumber(toNumber(value), locale',
  'formatLocalizedDate(parsed, locale)',
  'formatLocalizedDateTime(parsed, locale)',
  "ui('Not recorded')",
  "ui('No lot label')",
  "ui('Untracked stock')"
])if(!pageSource.includes(required))fail(`Outbound locale-aware presentation missing: ${required}`);
if(!process.exitCode)pass('Outbound quantities, dates, lots/batches/expiry, pagination counts, and workflow metrics use the tenant locale.');
for(const required of [
  'if (error instanceof ApiError || error instanceof Error) return error.message;',
  '{customer.name}',
  'referenceLabel(order.customer_name)',
  'referenceLabel(item.product_name)',
  'referenceLabel(item.storage_location_name)',
  '{order.notes}',
  '{row.reason}',
  '{row.notes}',
  'referenceLabel(row.customer_name)',
  'referenceLabel(row.product_name)',
  'referenceLabel(row.storage_location_name)',
  'row.serial_numbers.join',
  'selected.returnable_serial_numbers',
  'item.serial_numbers.join',
])if(!pageSource.includes(required))fail(`Outbound business/server-data boundary changed unexpectedly: ${required}`);
for(const forbidden of [
  'ui(error.message)',
  'ui(customer.name)',
  'ui(order.customer_name)',
  'ui(item.product_name)',
  'ui(item.storage_location_name)',
  'ui(order.notes)',
  'ui(row.reason)',
  'ui(row.notes)',
  'ui(row.customer_name)',
  'ui(row.product_name)',
  'ui(row.storage_location_name)',
  'ui(serial)'
])if(pageSource.includes(forbidden))fail(`Outbound translates business/server data unexpectedly: ${forbidden}`);
if(!process.exitCode)pass('Customer/product/location/order/lot/serial/reason/note data and API error messages remain business/server data.');
for(const required of [
  'TENANT_PERMISSIONS.CUSTOMERS_READ',
  'TENANT_PERMISSIONS.CUSTOMERS_WRITE',
  'TENANT_PERMISSIONS.PRODUCTS_READ',
  'TENANT_PERMISSIONS.STORAGE_LOCATIONS_READ',
  'TENANT_PERMISSIONS.STOCK_READ',
  'TENANT_PERMISSIONS.OUTBOUND_ORDERS_CREATE',
  'TENANT_PERMISSIONS.OUTBOUND_ORDERS_UPDATE',
  'TENANT_PERMISSIONS.OUTBOUND_ORDERS_DISPATCH',
  'TENANT_PERMISSIONS.OUTBOUND_ORDERS_CANCEL',
  'TENANT_PERMISSIONS.CUSTOMER_RETURNS_READ',
  'TENANT_PERMISSIONS.CUSTOMER_RETURNS_CREATE',
  'TENANT_PERMISSIONS.CUSTOMER_RETURNS_RECEIVE',
  'TENANT_PERMISSIONS.CUSTOMER_RETURNS_CANCEL'
])if(!pageSource.includes(required))fail(`Outbound permission contract missing: ${required}`);
for(const required of [
  "apiRequest<Customer[]>('/outbound/customers?include_archived=false')",
  "apiRequest<PageResponse<Customer>>(`/outbound/customers?include_archived=${includeArchivedCustomers ? 'true' : 'false'}&page=${customerPage}&page_size=${CUSTOMER_PAGE_SIZE}&search=${encodeURIComponent(customerSearch.trim())}`)",
  "apiRequest<PageResponse<Order>>(`/outbound/orders?page=${orderPage}&page_size=${ORDER_PAGE_SIZE}&status=${encodeURIComponent(orderStatus)}&search=${encodeURIComponent(orderSearch.trim())}`)",
  "apiRequest<OutboundSummary>('/outbound/summary')",
  "apiRequest<PageResponse<TraceRow>>(`/outbound/trace?page=${tracePage}&page_size=${TRACE_PAGE_SIZE}&search=${encodeURIComponent(traceSearch.trim())}`)",
  "apiRequest<PageResponse<TraceRow>>(`/outbound/returnable-dispatches?page=${returnOptionPage}&page_size=${RETURNABLE_PAGE_SIZE}&search=${encodeURIComponent(returnOptionSearch.trim())}&order_id=${encodeURIComponent(returnSelectedOrderId)}`)",
  "apiRequest<PageResponse<CustomerReturn>>(`/outbound/returns?page=${returnPage}&page_size=${RETURN_PAGE_SIZE}&status=${encodeURIComponent(returnStatus)}&search=${encodeURIComponent(returnSearch.trim())}`)",
  "apiRequest<OrderOptionsResponse>('/outbound/order-options')",
  '`/outbound/orders/${pickOrderId}/pick-options`',
  "path: '/outbound/customers'",
  '`/outbound/customers/${editingCustomer.id}`',
  '`/outbound/customers/${customer.id}/archive`',
  "path: '/outbound/orders'",
  '`/outbound/orders/${editingOrder.id}`',
  '`/outbound/orders/${order.id}/confirm`',
  '`/outbound/orders/${order.id}/start-picking`',
  '`/outbound/orders/${pickOptions.data.order.id}/pick`',
  '`/outbound/orders/${order.id}/mark-packed`',
  '`/outbound/orders/${order.id}/reset-picks`',
  '`/outbound/orders/${order.id}/dispatch`',
  '`/outbound/orders/${order.id}/cancel`',
  "path: '/outbound/returns'",
  '`/outbound/returns/${row.id}/receive`',
  '`/outbound/returns/${row.id}/cancel`',
  "headers: version === undefined ? undefined : { 'If-Match-Version': String(version) }"
])if(!pageSource.includes(required))fail(`Outbound mutation/read contract missing: ${required}`);
for(const required of [
  '<option value="open">',
  "ui('Confirmed through partially dispatched')",
  "condition: 'available'",
  "<option value=\"partially_dispatched\">",
  "<option value=\"available\">",
  "<option value=\"hold\">",
  "<option value=\"quarantine\">",
  "<option value=\"damaged\">",
  "<option value=\"rejected\">",
  'condition: line.condition',
  'body: { reason: cancelOrderReason.trim() }',
  'body: { reason: cancelReturnReason.trim() }'
])if(!pageSource.includes(required))fail(`Outbound canonical payload/status value changed or missing: ${required}`);
for(const required of [
  "`/outbound/orders/${selectedOrderId}/activity?audit_page=${orderAuditPage}&audit_page_size=${AUDIT_PAGE_SIZE}`",
  "`/outbound/returns/${selectedReturnId}/activity?audit_page=${returnAuditPage}&audit_page_size=${AUDIT_PAGE_SIZE}`",
  "`/outbound/orders/${selectedOrderId}/documents`",
  "`/outbound/orders/${selectedOrderId}/communications`",
  "entity_type=outbound_order",
  "entity_type=customer_return",
  "ui('Full audit history')",
  "orderActivity.data.audit.items",
  "returnActivity.data.audit.items",
  "const AUDIT_PAGE_SIZE = 25",
  "ui('Preview & Send Email')",
  "ui('Customer reference / PO number')",
  "ui('Delivery address')",
  "apiRequest<Array<Location & { is_pickable?: boolean; location_type?: string | null }>>('/outbound/return-locations')",
  '<details className="outbound-panel outbound-workflow-panel">'
])if(!pageSource.includes(required))fail(`Outbound operational-workflow closure missing: ${required}`);
if(!process.exitCode)pass('Outbound exposes readable activity/audit history, customer documents/email history, attachments, delivery details, governed return destinations, and a compact workflow guide.');
for(const required of [
  "apiRequest<OrderOptionsResponse>('/outbound/order-options')",
  "Choose product with available stock",
  "Choose location with available stock",
  "No available stock",
  "Available at this location:",
  "Requested quantity is greater than the stock currently available at this location.",
  "const orderLinesStockValid = orderForm.items.length > 0 && orderForm.items.every((line) => orderAvailabilityForLine(line).valid);",
  "product_id: event.target.value, storage_location_id: '', uom_code: ''",
  "availableOrderProducts.map((product)",
  "locationChoices.map((location)",
  "!orderLinesStockValid"
])if(!pageSource.includes(required))fail(`Outbound stock-aware order creation UX missing: ${required}`);
if(!process.exitCode)pass('Outbound order creation is stock-aware: zero-stock products are excluded, locations are product-specific, and impossible quantities block draft save.');
if(!process.exitCode)pass('Outbound customer/order/pick/pack/dispatch/cancel/return endpoints, permissions, version headers, and canonical payload values remain governed.');
for(const required of [
  "window.confirm(ui('Clear the current picked quantities and pick again?'))",
  "window.confirm(ui('Dispatch all currently packed stock? Inventory will be reduced for the packed quantities now.'))",
  "window.confirm(ui('Receive this customer return into inventory now?'))",
  "ui('Return cancellation reason')",
  "cancelOrderReason.trim().length < 3",
  "cancelReturnReason.trim().length < 3",
  "ui('Choose a customer and complete at least one order line.')",
  "ui('Enter a picked quantity greater than zero.')",
  "ui('Customer return created and is waiting to be received.')"
])if(!pageSource.includes(required))fail(`Outbound localized mutation feedback/confirmation missing: ${required}`);
if(pageSource.includes('window.prompt('))fail('Outbound must not use browser prompt dialogs for cancellation reasons.');
if(!process.exitCode)pass('Outbound frontend validations, confirmations, stock-aware draft rules, inline cancellation forms, and success feedback are multilingual.');
if(pageSource.includes('/outbound/returnable-dispatches?page=') && pageSource.includes('RETURNABLE_PAGE_SIZE') && pageSource.includes('returnSelectedOrderId')) pass('Return creation uses a paged server-side eligible-dispatch search and narrows multi-line returns to one order.'); else fail('Return creation must use the paged server-side eligible-dispatch contract.');
if(!process.exitCode)pass('OutboundPage multilingual conversion is complete.');
