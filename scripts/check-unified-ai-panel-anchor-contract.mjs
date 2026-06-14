import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const pagePath = path.join(process.cwd(), 'src/pages/HumanInLoopAIReviewPage.tsx');
const source = fs.readFileSync(pagePath, 'utf8');

const constantMatch = source.match(/const\s+UNIFIED_AI_FRONTEND_PANEL_DOM_ANCHORS\s*=\s*\[([\s\S]*?)\]\s+as\s+const;/);
if (!constantMatch) {
  throw new Error('UNIFIED_AI_FRONTEND_PANEL_DOM_ANCHORS manifest is missing.');
}

const declaredAnchors = [...constantMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]);
const renderedAnchors = [...source.matchAll(/data-ai-contract-panel=['"]([^'"]+)['"]/g)].map((match) => match[1]);

const duplicateDeclaredAnchors = declaredAnchors.filter((anchor, index) => declaredAnchors.indexOf(anchor) !== index);
const duplicateRenderedAnchors = renderedAnchors.filter((anchor, index) => renderedAnchors.indexOf(anchor) !== index);
const missingRenderedAnchors = declaredAnchors.filter((anchor) => !renderedAnchors.includes(anchor));
const unexpectedRenderedAnchors = renderedAnchors.filter((anchor) => !declaredAnchors.includes(anchor));
const orderMismatches = declaredAnchors
  .map((anchor, index) => ({ index, declared: anchor, rendered: renderedAnchors[index] }))
  .filter((row) => row.declared !== row.rendered);

const failures = [];
if (declaredAnchors.length === 0) failures.push('anchor manifest is empty');
if (duplicateDeclaredAnchors.length) failures.push(`duplicate declared anchors: ${[...new Set(duplicateDeclaredAnchors)].join(', ')}`);
if (duplicateRenderedAnchors.length) failures.push(`duplicate rendered anchors: ${[...new Set(duplicateRenderedAnchors)].join(', ')}`);
if (missingRenderedAnchors.length) failures.push(`declared anchors not rendered: ${missingRenderedAnchors.join(', ')}`);
if (unexpectedRenderedAnchors.length) failures.push(`rendered anchors not declared: ${unexpectedRenderedAnchors.join(', ')}`);
if (orderMismatches.length) {
  failures.push(`anchor order drift: ${orderMismatches.map((row) => `${row.index + 1}:${row.declared}->${row.rendered || 'missing'}`).join(', ')}`);
}

if (failures.length) {
  throw new Error(`Unified AI panel anchor contract failed: ${failures.join('; ')}`);
}

console.log(`Unified AI panel anchor contract passed (${declaredAnchors.length} anchors).`);
