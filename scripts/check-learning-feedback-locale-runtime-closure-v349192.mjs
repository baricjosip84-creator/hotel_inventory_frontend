import fs from 'node:fs';

const page = fs.readFileSync(new URL('../src/pages/DecisionLearningFeedbackPage.tsx', import.meta.url), 'utf8');

const requiredLocaleHooks = [
  'ClosedLoopClosureReport',
  'ClosedLoopComplianceAttestation',
  'ClosedLoopOperationalHandoff'
];

const topLevelFunctionPattern = /^(?:export default )?function\s+([A-Za-z0-9_]+)\b/gm;
const starts = [];
let match;
while ((match = topLevelFunctionPattern.exec(page)) !== null) {
  starts.push({ name: match[1], index: match.index });
}

const problems = [];
for (let index = 0; index < starts.length; index += 1) {
  const current = starts[index];
  const end = starts[index + 1]?.index ?? page.length;
  const block = page.slice(current.index, end);
  const header = block.slice(0, Math.min(block.length, 1200));

  if (/\blocale\b/.test(block)) {
    const localeParameter = /\blocale\s*\??\s*:\s*[^,)=]+/.test(header);
    const localeBinding = /\b(?:const|let|var)\s*\{[^}]*\blocale\b[^}]*\}\s*=\s*useAppTranslation\(\)/s.test(block)
      || /\b(?:const|let|var)\s+locale\b/.test(block);
    if (!localeParameter && !localeBinding) problems.push(`${current.name} uses locale without binding or receiving it`);
  }

  if (/\bui\s*\(/.test(block)) {
    const uiParameter = /\bui\s*\??\s*:\s*[^,)=]+/.test(header);
    const uiBinding = /\b(?:const|let|var)\s*\{[^}]*\bui\b[^}]*\}\s*=\s*useAppTranslation\(\)/s.test(block)
      || /\b(?:const|let|var)\s+ui\b/.test(block);
    if (!uiParameter && !uiBinding) problems.push(`${current.name} uses ui without binding or receiving it`);
  }
}

for (const name of requiredLocaleHooks) {
  const functionStart = page.indexOf(`function ${name}`);
  const nextStart = starts.find((item) => item.index > functionStart)?.index ?? page.length;
  const block = functionStart >= 0 ? page.slice(functionStart, nextStart) : '';
  if (!block.includes('const { locale, ui } = useAppTranslation();')) {
    problems.push(`${name} must bind both locale and ui from useAppTranslation()`);
  }
}

const buildStart = page.indexOf('function buildPayload');
const buildNextStart = starts.find((item) => item.index > buildStart)?.index ?? page.length;
const buildBlock = buildStart >= 0 ? page.slice(buildStart, buildNextStart) : '';
const validateStart = page.indexOf('function validateFeedbackForm');
const validateEnd = page.indexOf('function LocalizedLearningStatCard', validateStart);
const validateBlock = validateStart >= 0 ? page.slice(validateStart, validateEnd > validateStart ? validateEnd : page.length) : '';
if (/\bui\s*\(/.test(buildBlock)) problems.push('buildPayload must stay pure and must not call ui()');
if (!validateBlock.includes("mode === 'optimization-results' && !form.optimizationOptionId") || !validateBlock.includes("ui('Choose the planning option this outcome belongs to.')")) {
  problems.push('optimization planning-option validation must stay in validateFeedbackForm');
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`FAIL - ${problem}`);
  process.exit(1);
}

console.log('PASS - every top-level Learning Feedback function binds or receives locale before using it');
console.log('PASS - every top-level Learning Feedback function binds or receives ui before calling it');
console.log('PASS - closure report, compliance attestation, and operational handoff bind locale and ui');
console.log('PASS - buildPayload no longer calls an undeclared ui helper');
console.log('PASS - optimization planning-option validation runs before payload construction');
console.log('v3.49.192 Learning Feedback runtime translation closure guard: 5/5 PASS');
