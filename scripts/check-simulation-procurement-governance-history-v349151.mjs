#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const checks = [];
const check = (name, condition) => checks.push({ name, condition: Boolean(condition) });

const page = read('src/pages/ProcurementRecommendationsPage.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');
const pkg = read('package.json');

check('execution history fetch accepts offset and limit', /fetchProcurementExecutionHistory\(\s*offset: number,\s*limit: number/.test(page));
check('execution history URL uses dynamic limit and offset', page.includes('/execution-history?limit=${limit}&offset=${offset}'));
check('outcomes fetch accepts offset and limit', /fetchProcurementRecommendationOutcomes\(\s*offset: number,\s*limit: number/.test(page));
check('outcomes URL uses dynamic limit and offset', page.includes('/outcomes?limit=${limit}&offset=${offset}'));
check('execution history has independent page offset state', page.includes('const [executionHistoryOffset, setExecutionHistoryOffset] = useState(0);'));
check('outcomes has independent page offset state', page.includes('const [recommendationOutcomesOffset, setRecommendationOutcomesOffset] = useState(0);'));
check('execution history query key includes offset', page.includes('"procurement-execution-history", executionHistoryOffset, governanceHistoryPageSize'));
check('outcomes query key includes offset', page.includes('"procurement-recommendation-outcomes", recommendationOutcomesOffset, governanceHistoryPageSize'));
check('execution history no longer slices visible timeline to 20', !page.includes('executionHistoryQuery.data.timeline.slice(0, 20)'));
check('execution history renders full server page', page.includes('executionHistoryQuery.data.timeline.map((event, index) => {'));
check('execution history range uses combined pagination total', page.includes('formatUiNumber(executionHistoryQuery.data.pagination.total, 0)'));
check('execution history Previous changes global offset', page.includes('setExecutionHistoryOffset(Math.max(0, executionHistoryOffset - governanceHistoryPageSize))'));
check('execution history Next changes global offset', page.includes('setExecutionHistoryOffset(executionHistoryOffset + governanceHistoryPageSize)'));
check('execution history Next follows backend has_more', page.includes('disabled={!executionHistoryQuery.data.pagination.has_more || executionHistoryQuery.isFetching}'));
check('outcomes range uses backend total', page.includes('formatUiNumber(recommendationOutcomesQuery.data.pagination.total, 0)'));
check('outcomes Previous changes offset', page.includes('setRecommendationOutcomesOffset(Math.max(0, recommendationOutcomesOffset - governanceHistoryPageSize))'));
check('outcomes Next changes offset', page.includes('setRecommendationOutcomesOffset(recommendationOutcomesOffset + governanceHistoryPageSize)'));
check('outcomes Next follows backend has_more', page.includes('disabled={!recommendationOutcomesQuery.data.pagination.has_more || recommendationOutcomesQuery.isFetching}'));
check('loaded outcomes card describes current loaded page rather than global total', page.includes('value={formatUiNumber(recommendationOutcomesQuery.data.rows.length, 0)}'));
check('shared Showing range copy is already five-language translated', translations.includes('["Showing {start}–{end} of {total}"'));
check('Previous is translated', translations.includes('["Previous"'));
check('Next is translated', translations.includes('["Next"'));
check('v151 checker is wired into frontend package scripts', pkg.includes('check:simulation-procurement-governance-history-v349151'));

let passed = 0;
for (const item of checks) {
  if (item.condition) {
    passed += 1;
    console.log(`PASS ${item.name}`);
  } else {
    console.error(`FAIL ${item.name}`);
  }
}
console.log(`v3.49.151 procurement governance history: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);
