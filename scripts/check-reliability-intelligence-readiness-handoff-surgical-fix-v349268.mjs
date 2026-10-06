import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backendCandidates = [
  process.env.BACKEND_ROOT,
  path.resolve(frontendRoot, '../hotel-inventory-backend'),
  path.resolve(frontendRoot, '../backend')
].filter(Boolean);
const backendRoot = backendCandidates.find((candidate) => fs.existsSync(candidate));
if (!backendRoot) throw new Error('Batch 023 guard requires BACKEND_ROOT or an adjacent backend checkout.');

const readFrontend = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), 'utf8');
const readBackend = (relativePath) => fs.readFileSync(path.join(backendRoot, relativePath), 'utf8');

const reliabilityPage = readFrontend('src/pages/ReliabilityCommandPage.tsx');
const reviewPage = readFrontend('src/pages/HumanInLoopAIReviewPage.tsx');
const reliabilityService = readBackend('src/services/operations/platformReliabilityService.js');
const pkg = JSON.parse(readFrontend('package.json'));

const checks = [];
const check = (condition, label) => checks.push({ condition: Boolean(condition), label });

check(reliabilityPage.includes("function reliabilitySourceHref(path: string, dimensionKey?: string | null): string"), 'Reliability Command has a dimension-aware source-link resolver');
check(reliabilityPage.includes("if (path !== '/intelligence-review') return path;"), 'non-Intelligence source links remain unchanged');
check(reliabilityPage.includes("normalizedDimensionKey === 'human_review_readiness' || normalizedDimensionKey === 'ai_governance_readiness'"), 'only the two readiness/governance dimensions receive the specialized Intelligence Review handoff');
check(reliabilityPage.includes("return '/intelligence-review?view=readiness';"), 'readiness/governance links deep-link directly to the Readiness & governance view');
check(reliabilityPage.includes("const href = reliabilitySourceHref(path, dimensionKey);"), 'ReliabilityNavLink resolves the contextual destination before navigation');
check(reliabilityPage.includes('to={href}'), 'ReliabilityNavLink uses the resolved contextual destination');
check(reliabilityPage.includes('<ReliabilityNavLink path={sourcePath} dimensionKey={dimension.key} />'), 'reliability dimension cards pass their dimension key into link resolution');
check(reliabilityPage.includes('<ReliabilityNavLink path={sourcePath} dimensionKey={risk.dimension} />'), 'risk cards preserve their originating dimension in link resolution');
check(reliabilityPage.includes('<ReliabilityNavLink path={sourcePath} dimensionKey={item.dimension} />'), 'manual review-path items preserve their originating dimension in link resolution');
check(reliabilityPage.includes('<ReliabilityNavLink path="/intelligence-review" />'), 'generic top-level Intelligence Review shortcut remains generic');

check(reviewPage.includes("const activeView: IntelligenceReviewView = searchParams.get('view') === 'readiness' ? 'readiness' : 'recommendations';"), 'Intelligence Review consumes view=readiness as durable route state');
check(reviewPage.includes("nextSearchParams.set('view', 'readiness');"), 'Intelligence Review itself uses the same canonical readiness query parameter');
check(reviewPage.includes('label={ui("Readiness & governance")}'), 'the deep-linked destination is the existing Readiness & governance view');
check(reviewPage.includes("enabled: activeView === 'readiness'"), 'business readiness data is loaded when the readiness view is selected');

check(reliabilityService.includes("human_review_readiness: '/intelligence-review'"), 'backend still identifies Intelligence Review as the Human review readiness source workflow');
check(reliabilityService.includes("ai_governance_readiness: '/intelligence-review'"), 'backend still identifies Intelligence Review as the AI governance readiness source workflow');
check(reliabilityService.includes("key: 'human_review_readiness'") && reliabilityService.includes("label: 'Human review readiness'"), 'backend Human review readiness dimension key remains stable');
check(reliabilityService.includes("key: 'ai_governance_readiness'") || reliabilityService.includes('ai_governance_readiness'), 'backend AI governance readiness dimension remains represented');

check(pkg.scripts?.['check:inventory-reliability-intelligence-readiness-handoff-surgical-fix-v349268'] === 'node scripts/check-reliability-intelligence-readiness-handoff-surgical-fix-v349268.mjs', 'Batch 023 regression guard is registered');

const failed = checks.filter((item) => !item.condition);
for (const item of checks) console.log(`${item.condition ? 'PASS' : 'FAIL'}: ${item.label}`);
if (failed.length) {
  console.error(`\nBatch 023 Reliability/Intelligence handoff guard: ${checks.length - failed.length}/${checks.length} PASS`);
  process.exit(1);
}
console.log(`\nBatch 023 Reliability/Intelligence handoff guard: ${checks.length}/${checks.length} PASS`);
