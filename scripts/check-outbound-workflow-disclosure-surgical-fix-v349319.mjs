import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(project, 'src/pages/OutboundPage.css'), 'utf8');
const page = fs.readFileSync(path.join(project, 'src/pages/OutboundPage.tsx'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(project, 'package.json'), 'utf8'));
let passed = 0;
function check(name, run) { run(); console.log(`PASS: ${name}`); passed++; }
function block(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]+)\\}`, 'm'));
  assert.ok(match, `Missing CSS block: ${selector}`);
  return match[1];
}
const before = css.indexOf('.outbound-workflow-summary {');
check('Five-step disclosure retains native semantic details and summary', () => assert.match(page, /<details className="outbound-panel outbound-workflow-panel">\s*<summary className="outbound-workflow-summary">/));
check('Disclosure is collapsed by default, not forced open', () => assert.doesNotMatch(page, /<details className="outbound-panel outbound-workflow-panel"\s+open/));
check('All five existing workflow steps remain present', () => { for (const name of ['1. Draft','2. Confirm','3. Pick','4. Pack','5. Dispatch']) assert.ok(page.includes(`ui('${name}')`), name); });
check('Existing translated summary labels remain', () => { assert.ok(page.includes("ui('Outbound workflow')")); assert.ok(page.includes("ui('View the five order steps')")); });
check('Native marker intentionally hidden', () => assert.match(block('.outbound-workflow-summary::-webkit-details-marker'), /display:\s*none/));
check('Collapsed state uses visible CSS-generated chevron', () => assert.match(block('.outbound-workflow-summary::after'), /content:\s*''/));
check('Chevron draws both visible arms', () => { const rule=block('.outbound-workflow-summary::after'); assert.match(rule, /border-right:\s*2px\s+solid/); assert.match(rule, /border-bottom:\s*2px\s+solid/); });
check('Collapsed chevron points downward', () => assert.match(block('.outbound-workflow-summary::after'), /rotate\(45deg\)/));
check('Expanded chevron rotates upward', () => assert.match(block('.outbound-workflow-panel[open] .outbound-workflow-summary::after'), /rotate\(225deg\)/));
check('Expanded context remains the same native details open selector', () => assert.ok(css.includes('.outbound-workflow-panel[open] .outbound-workflow-summary { margin-bottom: 12px; }')));
check('Chevron cannot crowd its translated label', () => assert.match(block('.outbound-workflow-summary > span'), /min-width:\s*0/));
check('Translated label may wrap at narrower widths', () => assert.match(block('.outbound-workflow-summary > span'), /flex-wrap:\s*wrap/));
check('Chevron retains a minimum rendered footprint', () => assert.match(block('.outbound-workflow-summary::after'), /flex:\s*0\s+0\s+10px/));
check('Summary hit target stays at least 44px high', () => assert.match(block('.outbound-workflow-summary'), /min-height:\s*44px/));
check('Summary remains a pointer affordance', () => assert.match(block('.outbound-workflow-summary'), /cursor:\s*pointer/));
check('Hover state visually distinguishes the disclosure', () => assert.match(block('.outbound-workflow-summary:hover'), /background:/));
check('Keyboard focus has a visible outline', () => assert.match(block('.outbound-workflow-summary:focus-visible'), /outline:\s*2px\s+solid/));
check('Reduced-motion preference suppresses chevron transition', () => assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.outbound-workflow-summary::after\s*\{\s*transition:\s*none/));
check('Only one workflow chevron style exists', () => assert.equal(css.match(/\.outbound-workflow-summary::after\s*\{/g)?.length, 3)); // collapsed, expanded and reduced-motion rules
check('New focused guard is registered in package.json', () => assert.equal(packageJson.scripts['check:outbound-workflow-disclosure-v349319'], 'node scripts/check-outbound-workflow-disclosure-surgical-fix-v349319.mjs'));
check('No JS-controlled expand/collapse handler is required', () => assert.doesNotMatch(page.slice(page.indexOf('<details className="outbound-panel outbound-workflow-panel">'),page.indexOf('</details>',page.indexOf('<details className="outbound-panel outbound-workflow-panel">'))), /onClick=|onToggle=|aria-expanded=/));
console.log(`Outbound workflow disclosure surgical fix: ${passed}/${passed} PASS`);
