import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const copilot = read('src/pages/AIOperationsCopilotPage.tsx');
const cross = read('src/pages/CrossDomainOptimizationPage.tsx');
const feed = read('src/pages/RealTimeOperationsFeedPage.tsx');
const pkg = JSON.parse(read('package.json'));
let pass = 0; let fail = 0;
const check = (ok, msg) => { if (ok) { pass += 1; console.log(`PASS: ${msg}`); } else { fail += 1; console.error(`FAIL: ${msg}`); } };

check(copilot.includes('function copilotRecord(value: unknown): Record<string, unknown>'), 'AI Copilot record adapter uses unknown instead of explicit any');
check(!copilot.includes('Record<string, any>'), 'AI Copilot no longer contains the lint-failing Record<string, any> adapter');

check(cross.includes('const selectedRunDetail = data?.run_detail?.run;'), 'Cross-Domain captures the selected run once for effect synchronization');
check(cross.includes('if (!selectedRunDetail) return;'), 'Cross-Domain effect uses the captured selected run');
check(cross.includes('}, [selectedRunDetail]);'), 'Cross-Domain effect depends on the complete selected run object');
check(!cross.includes("[data?.run_detail?.run?.id, data?.run_detail?.run?.owner_user_id, data?.run_detail?.run?.due_at, data?.run_detail?.run?.next_action]"), 'Cross-Domain no longer uses the incomplete property-only effect dependency list');

check(feed.includes('const timeline = useMemo(() => response?.timeline || [], [response?.timeline]);'), 'Operations Feed timeline fallback is memoized');
check(!feed.includes('const timeline = response?.timeline || [];'), 'Operations Feed no longer creates a fresh empty timeline array every render');
check(feed.includes('}, [previousVisitTimestamp, timeline]);'), 'Operations Feed new-item memo consumes the stable timeline');
check(feed.includes('}, [newItemIds, requestedTimelineItemId, searchText, timeWindow, timeline, ui, viewScope]);'), 'Operations Feed display memo consumes the stable timeline');

const ci = String(pkg.scripts?.['check:ci'] || '');
check(ci.startsWith('npm run check:tenant-multilingual-closure-audit && npm run check:command-pages-lint-closure-v349189 && npm run check:command-pages-final-producer-renderer-closure-v349188 && '), 'tenant multilingual closure remains first and v3.49.189 runs before older command-page closure guards');
check(String(pkg.scripts?.['check:command-pages-lint-closure-v349189'] || '').includes('check-command-pages-lint-closure-v349189.mjs'), 'v3.49.189 frontend lint-closure guard is registered');

console.log(`Command pages lint closure v3.49.189 frontend guard: ${pass}/${pass + fail} PASS`);
if (fail) process.exit(1);
