import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const pagePath = path.join(process.cwd(), 'src/pages/HumanInLoopAIReviewPage.tsx');
const source = fs.readFileSync(pagePath, 'utf8');

function fail(message) {
  throw new Error(`Unified AI response type contract failed: ${message}`);
}

const anchorManifestMatch = source.match(/const\s+UNIFIED_AI_FRONTEND_PANEL_DOM_ANCHORS\s*=\s*\[([\s\S]*?)\]\s+as\s+const;/);
if (!anchorManifestMatch) fail('UNIFIED_AI_FRONTEND_PANEL_DOM_ANCHORS manifest is missing');

const panelAnchors = [...anchorManifestMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]);
if (!panelAnchors.length) fail('frontend panel anchor manifest is empty');

const expectedResponseKeys = panelAnchors.map((anchor) => `unified_ai_${anchor}`);

const responseTypeMatch = source.match(/type\s+IntelligenceProductionReadinessResponse\s*=\s*\{([\s\S]*?)\n\};/);
if (!responseTypeMatch) fail('IntelligenceProductionReadinessResponse type is missing');

const responseTypeBody = responseTypeMatch[1];
const typedResponseKeys = [...responseTypeBody.matchAll(/\n\s*(unified_ai_[a-z0-9_]+)\??\s*:/g)].map((match) => match[1]);

const duplicateTypedKeys = typedResponseKeys.filter((key, index) => typedResponseKeys.indexOf(key) !== index);
const missingTypedKeys = expectedResponseKeys.filter((key) => !typedResponseKeys.includes(key));
const unexpectedTypedKeys = typedResponseKeys.filter((key) => !expectedResponseKeys.includes(key));
const orderMismatches = expectedResponseKeys
  .map((key, index) => ({ index, expected: key, typed: typedResponseKeys[index] }))
  .filter((row) => row.expected !== row.typed);

const failures = [];
if (duplicateTypedKeys.length) failures.push(`duplicate typed unified AI response keys: ${[...new Set(duplicateTypedKeys)].join(', ')}`);
if (missingTypedKeys.length) failures.push(`missing typed response keys: ${missingTypedKeys.join(', ')}`);
if (unexpectedTypedKeys.length) failures.push(`unexpected typed response keys: ${unexpectedTypedKeys.join(', ')}`);
if (orderMismatches.length) {
  failures.push(`typed response-key order drift: ${orderMismatches.map((row) => `${row.index + 1}:${row.expected}->${row.typed || 'missing'}`).join(', ')}`);
}

for (const key of expectedResponseKeys) {
  const panelKey = key.replace(/^unified_ai_/, '');
  const panelAnchorPattern = new RegExp(`data-ai-contract-panel=["']${panelKey}["']`);
  if (!panelAnchorPattern.test(source)) {
    failures.push(`typed response key has no rendered panel anchor: ${key}`);
  }
}

if (failures.length) fail(failures.join('; '));

console.log(`Unified AI response type contract passed (${expectedResponseKeys.length} typed response keys).`);
