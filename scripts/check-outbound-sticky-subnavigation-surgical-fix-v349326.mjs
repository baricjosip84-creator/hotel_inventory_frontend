import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const css = read('src/pages/OutboundPage.css');
const page = read('src/pages/OutboundPage.tsx');
const shared = read('src/components/ui/OperationalWorkspace.tsx');
const layout = read('src/layouts/AppLayout.tsx');
const pkg = JSON.parse(read('package.json'));
const rule = css.slice(css.indexOf('/* Outbound section navigation must stay reachable'), css.indexOf('/* Keep the selected draft editor visible'));
const tabs = page.slice(page.indexOf('<OperationalWorkspaceTabs ariaLabel='), page.indexOf('</OperationalWorkspaceTabs>') + '</OperationalWorkspaceTabs>'.length);
const checks = [
  ['audit target is Outbound-only', () => assert.match(rule, /\.io-outbound-page/)],
  ['root page is a direct child under the layout main', () => assert.match(page, /return <div className="io-operational-page io-outbound-page io-workspace-page"/)],
  ['real scroll container is layout mainArea', () => assert.match(layout, /mainArea:\s*\{[\s\S]*?overflowY:\s*'auto'/)],
  ['layout main still clips horizontally elsewhere', () => assert.match(layout, /content:\s*\{[\s\S]*?overflowX:\s*'hidden'/)],
  ['override is scoped to main containing Outbound only', () => assert.match(rule, /main\[data-route-scroll-container\]:has\(> \.io-outbound-page\) \{/)],
  ['overflow-x uses clip, not hidden or scroll', () => assert.match(rule, /overflow-x: clip !important;/)],
  ['no global shared layout change', () => assert.match(rule, /the tab strip sticks to the real scrolling container/)],
  ['navigation itself is the direct page child', () => assert.match(rule, /\.io-outbound-page > \.io-workspace-tabs \{/)],
  ['sticky positioning enabled', () => assert.match(rule, /position: sticky;/)],
  ['desktop top offset set', () => assert.match(rule, /top: 12px;/)],
  ['navigation kept above in-page content', () => assert.match(rule, /z-index: 20;/)],
  ['grid sticky tab does not stretch', () => assert.match(rule, /align-self: start;/)],
  ['navigation has opaque background', () => assert.match(rule, /background: #fff;/)],
  ['navigation border and shadow distinguish controls', () => {assert.match(rule,/border-color: #cbd5e1;/); assert.match(rule,/box-shadow: 0 4px 14px/)}],
  ['horizontal destinations remain available', () => assert.match(rule, /\.io-workspace-tabs__items \{[\s\S]*?overflow-x: auto;/)],
  ['mobile viewport handled', () => assert.match(rule, /@media \(max-width: 760px\)/)],
  ['mobile top offset set', () => assert.match(rule, /top: 6px;/)],
  ['mobile hint does not cover navigation', () => assert.match(rule, /\.io-workspace-tabs__hint \{\s*display: none;/)],
  ['orders destination retained', () => assert.match(tabs, /onClick=\{\(\) => setTab\('orders'\)\}/)],
  ['customers permission guard retained', () => assert.match(tabs, /showCustomerTab \? <OperationalWorkspaceTab/)],
  ['returns permission guard retained', () => assert.match(tabs, /showReturnTab \? <OperationalWorkspaceTab/)],
  ['trace destination retained', () => assert.match(tabs, /onClick=\{\(\) => setTab\('trace'\)\}/)],
  ['tab selection uses same state transition', () => assert.match(page, /const setTab = \(tab: OutboundTab\) => \{\s*setMessage\(''\);\s*setError\(''\);\s*setActiveTab\(tab\);/)],
  ['shared tab retains keyboard button element', () => assert.match(shared, /<button\s*\{\.\.\.buttonProps\}\s*type="button"\s*role="tab"/)],
  ['shared tab retains active aria selection', () => assert.match(shared, /aria-selected=\{active\}/)],
  ['component keeps horizontal scroll behavior', () => assert.match(read('src/components/ui/OperationalWorkspace.css'), /\.io-workspace-tabs__items \{[\s\S]*?overflow-x: auto;/)],
  ['all three feature panels retained', () => {for (const part of ['orders', 'returns', 'trace']) assert.ok(page.includes(`activeTab === '${part}' ?`))}],
  ['new check registered', () => assert.equal(pkg.scripts['check:outbound-sticky-subnavigation-v349326'], 'node scripts/check-outbound-sticky-subnavigation-surgical-fix-v349326.mjs')]
];
for (const [label, test] of checks) {
  try {test(); console.log('PASS:',label)} catch (error) {console.error('FAIL:',label);throw error}
}
console.log(`Outbound sticky subnavigation: ${checks.length}/${checks.length} PASS`);
