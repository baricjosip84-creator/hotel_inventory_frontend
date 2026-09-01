import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const fail=(m)=>{console.error(`FAIL: ${m}`);process.exitCode=1;};
const pass=(m)=>console.log(`PASS: ${m}`);
const translationSource=read('src/i18n/tenantUiTranslations.ts');
const pageSource=read('src/pages/DigitalTwinVisualizationPage.tsx');
const routerSource=read('src/app/router.tsx');
const rows=[];
for(const line of translationSource.split(/\r?\n/)){const t=line.trim();if(!t.startsWith('[')||!t.endsWith(','))continue;try{const r=JSON.parse(t.slice(0,-1));if(Array.isArray(r)&&r.length===5&&r.every((x)=>typeof x==='string'))rows.push(r);}catch{}}
const keys=rows.map((r)=>r[0]);const unique=new Set(keys);
if(keys.length!==unique.size)fail('Tenant UI translation catalog contains duplicate English keys.');else pass(`Tenant UI catalog has ${keys.length} unique five-language rows.`);
const literalPattern=/\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decode(lit){if(lit.startsWith('"'))return JSON.parse(lit);const body=lit.slice(1,-1).replace(/\\'/g,"'").replace(/\\\\/g,'\\').replace(/"/g,'\\"');return JSON.parse(`"${body}"`);}
const literals=[];for(const m of pageSource.matchAll(literalPattern)){try{literals.push(decode(m[1]));}catch{}}
const missing=[...new Set(literals.filter((k)=>!unique.has(k)))];
if(missing.length)fail(`Digital Twin ui() literals missing translations: ${missing.join(' | ')}`);else pass(`Digital Twin has ${new Set(literals).size} catalog-backed literal UI keys.`);
for(const required of [
  "import { useAppTranslation } from '../i18n/I18nContext';",
  "import { formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';",
  "path: 'digital-twin'",
  'TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ',
  'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ',
  '<DigitalTwinVisualizationPage />'
]){
  const src=required.startsWith('path:')||required.includes('TENANT_PERMISSIONS')||required.includes('DigitalTwinVisualizationPage')?routerSource:pageSource;
  if(!src.includes(required))fail(`Digital Twin multilingual/route wiring missing: ${required}`);
}
if(!process.exitCode)pass('Digital Twin keeps the shared multilingual runtime and two-permission tenant route contract.');
const rawText=pageSource.split(/\r?\n/).flatMap((line)=>[...line.matchAll(/<(?:h[1-6]|p|th|td|summary|span|option|button|label|dt|dd|OperationalWorkspaceMetaPill)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g)].map((m)=>m[1].trim()).filter(Boolean));
if(rawText.length)fail(`Raw JSX presentation remains on DigitalTwinVisualizationPage: ${rawText.join(' | ')}`);else pass('DigitalTwinVisualizationPage has zero raw direct JSX presentation text.');
const dynamic=new Set();
for(const m of pageSource.matchAll(/\blabel:\s*'([^']+)'/g))dynamic.add(m[1]);
for(const [st,en] of [
  ['const SOURCE_LABELS','const DOMAIN_LABELS'],
  ['const STATUS_LABELS','const OVERLAY_TYPE_LABELS'],
  ['const OVERLAY_TYPE_LABELS','function numberValue']
]){
  const a=pageSource.indexOf(st),b=pageSource.indexOf(en,a+1);
  if(a<0||b<=a)fail(`Unable to isolate Digital Twin label block ${st}`);
  const block=a>=0&&b>a?pageSource.slice(a,b):'';
  for(const m of block.matchAll(/:\s*'([^']+)'/g))dynamic.add(m[1]);
}
for(const m of pageSource.matchAll(/\b(?:label|copy)="([^"]+)"/g))dynamic.add(m[1]);
for(const fallback of ['Multiple areas','Recommended perspective','All urgency levels','Observed','Operational context'])dynamic.add(fallback);
const missingDynamic=[...dynamic].filter((k)=>!unique.has(k));
if(missingDynamic.length)fail(`Digital Twin dynamic display keys missing translations: ${missingDynamic.join(' | ')}`);else pass(`${dynamic.size} filter, source-link, status, overlay, summary, and perspective display keys are catalog-backed.`);
for(const required of [
  'const { locale, ui } = useAppTranslation();',
  'formatLocalizedDateTime(date, locale)',
  'formatLocalizedNumber(value, locale)',
  'formatLocalizedNumber(nodes.length, locale)',
  'formatLocalizedNumber(appliedLimit, locale)',
  "style: 'percent'",
  'formatScore(node.importance_score, locale, ui)',
  'formatPercent(edge.confidence_score, locale, ui)',
  'formatDateTime(overlay.updated_at || overlay.created_at, locale, ui)'
])if(!pageSource.includes(required))fail(`Digital Twin locale-aware presentation missing: ${required}`);
if(!process.exitCode)pass('Digital Twin counts, limits, scores, percentages, and timestamps use the tenant locale.');
for(const required of [
  'digitalTwinQuery.error.message',
  'function sourceText(',
  'DIGITAL_TWIN_SYSTEM_TEXT',
  'DIGITAL_TWIN_RISK_TYPE_TEXT',
  'guidance.visualization_guidance_key ? digitalTwinSystemText(',
  'guidance.risk_propagation_guidance_key ? digitalTwinSystemText(',
  'guidance.congestion_heatmap_guidance_key ? digitalTwinSystemText(',
  "sourceText(node.label, ui('Topology point'))",
  'nodeTypeLabel(node.node_type, ui)',
  'sourceText(edge.source_label)',
  'sourceText(edge.target_label)',
  'relationshipLabel(edge.relationship, ui)',
  'overlay.title_key ? digitalTwinRiskTitle(',
  'overlay.summary_key ? digitalTwinSystemText('
])if(!pageSource.includes(required))fail(`Digital Twin localization ownership boundary changed unexpectedly: ${required}`);
for(const forbidden of [
  'ui(node.label)',
  'ui(edge.source_label)',
  'ui(edge.target_label)',
  'ui(overlay.title)',
  'ui(overlay.summary)',
  'ui(digitalTwinQuery.error.message)',
  'function readableTitle('
])if(pageSource.includes(forbidden))fail(`Digital Twin translates or rewrites source/business text unexpectedly: ${forbidden}`);
if(!process.exitCode)pass('Source/business labels, summaries, and API errors remain verbatim while explicitly keyed system guidance/types are localized.');
for(const required of [
  "apiRequest<DigitalTwinResponse>(`/operational-action-center/digital-twin-operational-visualization-summary?${params.toString()}`)",
  "ui('Read-only operational context')",
  "ui('Not a live simulation')",
  "ui('No automatic operational change')",
  "ui('Source permissions still apply')"
])if(!pageSource.includes(required))fail(`Digital Twin read-only/governance contract missing: ${required}`);
if(/\buseMutation\b/.test(pageSource)||/method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/.test(pageSource))fail('Digital Twin page unexpectedly contains a mutation path.');else pass('Digital Twin remains a read-only operational context workspace with source workflows authoritative.');
if(!process.exitCode)pass('DigitalTwinVisualizationPage staged multilingual conversion is complete.');
