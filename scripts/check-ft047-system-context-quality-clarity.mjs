import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const backend = path.resolve(process.argv[2] || process.env.BACKEND_ROOT || path.join(root, '..', 'backend'));
const page = fs.readFileSync('src/pages/SystemContextPage.tsx', 'utf8');
const catalog = fs.readFileSync('src/i18n/tenantUiTranslations.ts', 'utf8');
const type = fs.readFileSync('src/types/inventory.ts', 'utf8');
const service = fs.readFileSync(path.join(backend, 'src/services/systemContextService.js'), 'utf8');
const scoring = fs.readFileSync(path.join(backend, 'src/services/systemContextQualityScoring.js'), 'utf8');
const check = (ok, name) => {if (!ok) {console.error('FAIL:',name);process.exitCode=1;} else console.log('PASS:',name);};
const rows = new Map();
for (const line of catalog.split('\n')) {
 const t=line.trim(); if (!t.startsWith('[')||!t.endsWith(',')) continue;
 try {const row=JSON.parse(t.slice(0,-1)); if (row.length===5) rows.set(row[0],row);} catch{}
}
for (const key of [
 'Planning context score','Planning context assessment','This score measures planning risk and review workload, not the accuracy of inventory records.',
 'Context score','This score is not a measure of incorrect or missing inventory data. Source age means time since observed activity, not whether all records are outdated.',
 'How the context score is calculated','Risk signal deductions','Recommendation deductions','Successful check bonus','Context score result',
 'Included in this snapshot','Source unavailable','Current-state snapshot; no single activity timestamp','Latest recorded activity: {time}',
 'A missing timestamp does not mean the inventory data is wrong. Stale labels refer to the latest recorded event, not a validation of every source record.'
]) check(rows.get(key)?.every(x=>x.length>0),'Five-language translation: '+key);
check(page.includes('data.context_quality.score_breakdown') && type.includes('score_breakdown?: {') && service.includes('score_breakdown: contextQualityCalculation.breakdown'), 'Typed server-owned calculation is presented; no duplicated frontend score algorithm');
check(scoring.includes("signal.severity === 'critical' ? 25 : signal.severity === 'warning' ? 12 : 5") && scoring.includes("item.priority === 'high' ? 12 : item.priority === 'medium' ? 7 : 3") && scoring.includes('Math.min(10, numeric(passedCheckCount) * 2)'), 'All original score weights and capped bonus preserved');
check(!page.includes("ui('Data quality')") && !page.includes("ui('Quality {quality} · Last observed {time}')"), 'No data accuracy or source accuracy false label on System Context page');
check(page.includes("freshness?.status === 'not_timestamped' ? ui('Current-state snapshot; no single activity timestamp')"), 'Current-state sources are explicitly distinguished from event timestamps');
check(page.includes("ui('Latest recorded activity: {time}')") && page.includes("ui('Included in this snapshot')"), 'Source shows included and last event rather than claiming 100% accuracy');
check(!service.includes('UPDATE tenants') && service.includes('const contextQualityCalculation = calculateContextQuality('), 'Read-only service uses the preserved score model');
if (!process.exitCode) console.log('FT047 planning context score and timestamp clarity checks passed.');
