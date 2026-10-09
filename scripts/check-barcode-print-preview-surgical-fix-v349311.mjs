import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const labels = read('src/components/enterpriseInventory/tabs/LabelsTab.tsx');
const workflow = read('src/components/enterpriseInventory/EnterpriseInventoryWorkflowMutations.ts');
const api = read('src/lib/api.ts');
const catalog = read('src/i18n/tenantUiTranslations.ts');
const checks = [];
function check(label, fn) {
  try { fn(); console.log(`PASS ${label}`); checks.push(true); }
  catch (error) { console.error(`FAIL ${label}: ${error.message}`); checks.push(false); }
}

// Execute the actual TS printing helper in an isolated fake browser. No printing or API calls.
const escapeCode = labels.slice(labels.indexOf('function escapePrintHtml('), labels.indexOf('function triggerSvgDownload('));
const printCode = labels.slice(labels.indexOf('function openPrintWindow('), labels.indexOf('function labelTraceability('));
assert.ok(escapeCode.startsWith('function escapePrintHtml(') && printCode.startsWith('function openPrintWindow('));
const compiled = ts.transpileModule(`${escapeCode}\n${printCode}\n`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
function invoke({ blocked = false, readyState = 'loading', printError = false } = {}) {
  const activity = { markup: '', opened: 0, focused: 0, attempted: 0, load: null, timers: [], events: [] };
  const popup = {
    opener: {},
    closed: false,
    document: {
      readyState,
      open() { activity.events.push('document-open'); },
      write(markup) { activity.markup = markup; activity.events.push('document-write'); },
      close() { activity.events.push('document-close'); },
    },
    addEventListener(event, callback, options) { activity.load = callback; activity.events.push(`listen-${event}-${options?.once}`); },
    setTimeout(callback, ms) { activity.timers.push({ callback, ms }); },
    focus() { activity.focused++; },
    print() { activity.attempted++; if (printError) throw Error('blocked print'); },
  };
  const context = {
    window: { open: () => { activity.opened++; return blocked ? null : popup; } },
    createBarcodeLabelSvgMarkup: () => '<svg role="img"/>',
  };
  vm.runInNewContext(`${compiled}\nthis.openPrintWindow = openPrintWindow;`, context);
  const result = context.openPrintWindow([{
    barcode_type: 'CODE128', barcode_value: 'TEST', product_name: 'Test'
  }], {}, '<Test & Label>', 'Drucken <now>', 'Print & preview');
  return { result, activity, popup };
}

check('real helper executes and opens one printable popup', () => {
  const r = invoke(); assert.equal(r.result, true); assert.equal(r.activity.opened, 1);
});
check('popup-blocked path returns false without print request', () => {
  const r = invoke({ blocked: true }); assert.equal(r.result, false); assert.equal(r.activity.timers.length, 0);
});
check('load listener registered before the document is written', () => {
  const r = invoke(); assert.ok(r.activity.events.indexOf('listen-load-true') < r.activity.events.indexOf('document-write'));
});
check('popup contains a visible manual Print button', () => {
  const r = invoke(); assert.match(r.activity.markup, /<button[^>]+onclick="window\.focus\(\);window\.print\(\)"/);
});
check('help text is shown in popup', () => {
  const r = invoke(); assert.match(r.activity.markup, /Print &amp; preview/);
});
check('popup title escapes HTML', () => {
  const r = invoke(); assert.match(r.activity.markup, /&lt;Test &amp; Label&gt;/);
});
check('print button label escapes HTML', () => {
  const r = invoke(); assert.match(r.activity.markup, /Drucken &lt;now&gt;/);
});
check('print toolbar is hidden on paper output', () => {
  const r = invoke(); assert.match(r.activity.markup, /@media print\{body\{padding:0\}\.toolbar\{display:none!important\}/);
});
check('label markup remains part of preview', () => {
  const r = invoke(); assert.match(r.activity.markup, /<svg role="img"\/>/);
});
check('pending document waits for load to trigger automatic print attempt', () => {
  const r = invoke(); assert.equal(r.activity.timers.length, 0); assert.equal(typeof r.activity.load, 'function');
  r.activity.load(); assert.equal(r.activity.timers.length, 1);
});
check('automatic request focuses popup and invokes print after load', () => {
  const r = invoke(); r.activity.load(); r.activity.timers[0].callback();
  assert.equal(r.activity.focused, 1); assert.equal(r.activity.attempted, 1);
});
check('already-complete document attempts print even if load event was missed', () => {
  const r = invoke({ readyState: 'complete' }); assert.equal(r.activity.timers.length, 1);
  r.activity.timers[0].callback(); assert.equal(r.activity.attempted, 1);
});
check('load/readyState double trigger does not duplicate print request', () => {
  const r = invoke({ readyState: 'complete' }); r.activity.load();
  assert.equal(r.activity.timers.length, 1);
});
check('browser rejection does not destroy manual preview', () => {
  const r = invoke({ printError: true }); r.activity.load(); r.activity.timers[0].callback();
  assert.equal(r.result, true); assert.equal(r.activity.attempted, 1);
  assert.match(r.activity.markup, /onclick="window\.focus\(\);window\.print\(\)"/);
});
check('print mutation is called only after a popup is opened', () => {
  assert.match(labels, /if \(!openPrintWindow\([\s\S]+?\)\) \{[\s\S]+?return;[\s\S]+?recordBarcodeLabelPrintsMutation\.mutate\(labelsToPrint\.map/);
});
check('print requests still go through the existing server mutation', () => {
  assert.match(workflow, /postEnterpriseInventoryRequest<\{ print_request_count: number; labels: BarcodeLabel\[\] \}>\(\s*"\/enterprise-inventory\/barcode-labels\/print-events"/);
});
check('mutation success no longer asserts dialog opened', () => {
  const section = workflow.slice(workflow.indexOf('const recordBarcodeLabelPrintsMutation'), workflow.indexOf('const deleteBarcodeLabelMutation'));
  assert.doesNotMatch(section, /Print dialog opened/); assert.match(section, /Print view opened for \{count\}/);
});
check('API fallback says view opened, not dialog opened', () => {
  assert.match(api, /return 'Barcode label print view opened\.';/);
  assert.doesNotMatch(api, /return 'Barcode label print dialog opened\.';/);
});
check('page does not promise confirmed physical printing', () => {
  assert.match(labels, /Print requests count previews opened, not confirmed print jobs/);
});
check('fallback copy is visible and translated', () => {
  assert.match(labels, /ui\('If no print dialog appears, select Print above\.'\)/);
});
check('all five new strings are present in translations with five locales', () => {
  const phrases = [
    'If no print dialog appears, select Print above.',
    'Print opens a preview window with a Print button. Print requests count previews opened, not confirmed print jobs.',
    'Print view opened for {count} barcode label. Use Print in that window if needed.',
    'Print view opened for {count} barcode labels. Use Print in that window if needed.',
    'Barcode label print view opened.'
  ];
  for (const phrase of phrases) {
    const pos = catalog.indexOf(JSON.stringify(phrase)); assert.ok(pos > 0, `missing ${phrase}`);
    const line = catalog.slice(catalog.lastIndexOf('\n', pos) + 1, catalog.indexOf('\n', pos));
    assert.equal((line.match(/", "/g) || []).length, 4, `missing locale in ${phrase}`);
  }
});
check('blocked-window and encoding errors remain represented in UI', () => {
  assert.match(labels, /The browser blocked the print window/);
  assert.match(labels, /Unable to prepare barcode labels for printing/);
});
check('backend source is not needed for this presentation fix', () => {
  assert.doesNotMatch(printCode, /fetch\(|postEnterpriseInventoryRequest|tenant_id|stock_movements/);
});
const passed = checks.filter(Boolean).length;
console.log(`BARCODE PRINT PREVIEW GUARD: ${passed}/${checks.length} ${passed === checks.length ? 'PASS' : 'FAIL'}`);
if (passed !== checks.length) process.exitCode = 1;
