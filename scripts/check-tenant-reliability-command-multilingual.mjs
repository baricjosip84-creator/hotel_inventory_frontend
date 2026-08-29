import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const fail=(m)=>{console.error(`FAIL: ${m}`);process.exitCode=1;};
const pass=(m)=>console.log(`PASS: ${m}`);
const translationSource=read('src/i18n/tenantUiTranslations.ts');
const pageSource=read('src/pages/ReliabilityCommandPage.tsx');
const routerSource=read('src/app/router.tsx');
const rows=[];
for(const line of translationSource.split(/\r?\n/)){const t=line.trim();if(!t.startsWith('[')||!t.endsWith(','))continue;try{const r=JSON.parse(t.slice(0,-1));if(Array.isArray(r)&&r.length===5&&r.every((x)=>typeof x==='string'))rows.push(r);}catch{}}
const keys=rows.map((r)=>r[0]);const unique=new Set(keys);
if(keys.length!==unique.size)fail('Tenant UI translation catalog contains duplicate English keys.');else pass(`Tenant UI catalog has ${keys.length} unique five-language rows.`);
const literalPattern=/\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decode(lit){if(lit.startsWith('"'))return JSON.parse(lit);const body=lit.slice(1,-1).replace(/\\'/g,"'").replace(/\\\\/g,'\\').replace(/"/g,'\\"');return JSON.parse(`"${body}"`);}
const literals=[];for(const m of pageSource.matchAll(literalPattern)){try{literals.push(decode(m[1]));}catch{}}
const missing=[...new Set(literals.filter((k)=>!unique.has(k)))];
if(missing.length)fail(`Reliability Command ui() literals missing translations: ${missing.join(' | ')}`);else pass(`Reliability Command has ${new Set(literals).size} catalog-backed literal UI keys.`);
for(const required of [
  "import { useAppTranslation } from '../i18n/I18nContext';",
  "import { formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';",
  "path: 'reliability-command'",
  'TENANT_PERMISSIONS.PLATFORM_RELIABILITY_READ',
  '<ReliabilityCommandPage />'
]){
  const src=required.startsWith('path:')||required.includes('TENANT_PERMISSIONS')||required.includes('ReliabilityCommandPage')?routerSource:pageSource;
  if(!src.includes(required))fail(`Reliability Command multilingual/route wiring missing: ${required}`);
}
if(!process.exitCode)pass('Reliability Command keeps the shared multilingual runtime and tenant reliability permission contract.');
const rawText=pageSource.split(/\r?\n/).flatMap((line)=>[...line.matchAll(/<(?:h[1-6]|p|th|td|summary|span|option|button|label|dt|dd|OperationalWorkspaceMetaPill)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g)].map((m)=>m[1].trim()).filter(Boolean));
if(rawText.length)fail(`Raw JSX presentation remains on ReliabilityCommandPage: ${rawText.join(' | ')}`);else pass('ReliabilityCommandPage has zero raw direct JSX presentation text.');
const dynamic=new Set();
for(const m of pageSource.matchAll(/\blabel:\s*'([^']+)'/g))dynamic.add(m[1]);
for(const [st,en] of [
  ['const SOURCE_LABELS','const CANONICAL_STATUS_LABELS'],
  ['const CANONICAL_STATUS_LABELS','const SAFETY_LABELS'],
  ['const SAFETY_LABELS','function formatIdentifier']
]){
  const a=pageSource.indexOf(st),b=pageSource.indexOf(en,a+1);
  if(a<0||b<=a)fail(`Unable to isolate Reliability Command label block ${st}`);
  const block=a>=0&&b>a?pageSource.slice(a,b):'';
  for(const m of block.matchAll(/:\s*'([^']+)'/g))dynamic.add(m[1]);
}
for(const m of pageSource.matchAll(/\b(?:label|copy)="([^"]+)"/g))dynamic.add(m[1]);
for(const template of ['{count} review risk · refreshed {time}','{count} review risks · refreshed {time}'])dynamic.add(template);
const missingDynamic=[...dynamic].filter((k)=>!unique.has(k));
if(missingDynamic.length)fail(`Reliability Command dynamic display keys missing translations: ${missingDynamic.join(' | ')}`);else pass(`${dynamic.size} filter, source-link, canonical status, safety, summary, and count display keys are catalog-backed.`);
for(const required of [
  'const { locale, ui } = useAppTranslation();',
  'formatLocalizedDateTime(date, locale)',
  'formatLocalizedNumber(value, locale)',
  'formatLocalizedNumber(risks.length, locale)',
  'formatNumber(overview.risk_count ?? risks.length, locale, ui)',
  'formatScore(overview.reliability_score, locale, ui)',
  'formatScore(dimension.score, locale, ui)',
  'formatScore(risk.score, locale, ui)'
])if(!pageSource.includes(required))fail(`Reliability Command locale-aware presentation missing: ${required}`);
if(!process.exitCode)pass('Reliability Command counts, limits, scores, and timestamps use the tenant locale.');
for(const required of [
  'commandQuery.error.message',
  '<span>{overview.scoring_note}</span>',
  "dimension.label || ui('Reliability dimension')",
  "dimension.recommendation || ui('No recommendation was reported.')",
  'dimension.evidence.map((item) => <li key={item}>{formatEvidence(item, ui)}</li>)',
  "risk.label || ui('Reliability review item')",
  "risk.recommended_next_action || ui('Review the source workflow and capture the human decision there.')",
  "stage.label || ui('Manual review stage')",
  '<p>{stage.description}</p>',
  "item.label || ui('Reliability review item')",
  'formatIdentifier(item.owner)',
  'formatIdentifier(item.reviewer)',
  'item.instructions.map((instruction) => <li key={instruction}>{formatSentence(instruction)}</li>)'
])if(!pageSource.includes(required))fail(`Reliability Command server-data boundary changed unexpectedly: ${required}`);
for(const forbidden of [
  'ui(commandQuery.error.message)',
  'ui(overview.scoring_note)',
  'ui(dimension.label)',
  'ui(dimension.key)',
  'ui(dimension.recommendation)',
  'ui(risk.label)',
  'ui(risk.dimension)',
  'ui(risk.recommended_owner)',
  'ui(risk.recommended_runbook)',
  'ui(risk.recommended_next_action)',
  'ui(stage.label)',
  'ui(stage.description)',
  'ui(item.label)',
  'ui(item.dimension)',
  'ui(item.owner)',
  'ui(item.reviewer)',
  'ui(instruction)'
])if(pageSource.includes(forbidden))fail(`Reliability Command translates backend/business text unexpectedly: ${forbidden}`);
if(!process.exitCode)pass('Backend dimension/risk/stage labels, recommendations, owners, runbooks, instructions, evidence, scoring note, and API errors remain server/business data.');
for(const required of [
  'canonicalStatusLabel(overview.readiness, ui)',
  'canonicalStatusLabel(dimension.readiness, ui)',
  'canonicalStatusLabel(risk.severity, ui)',
  'canonicalStatusLabel(risk.readiness, ui)',
  'canonicalStatusLabel(item.stage_status, ui)',
  'safetyLabel(key, ui)',
  "value ? ui('Yes') : ui('No')"
])if(!pageSource.includes(required))fail(`Reliability Command canonical/safety presentation missing: ${required}`);
if(!process.exitCode)pass('Known readiness, severity, review-stage, and backend safety displays are translated without translating arbitrary server text.');
for(const required of [
  'apiRequest<ReliabilityCommandResponse>(`/platform-reliability/command-board?${params.toString()}`)',
  "ui('Read-only operational reliability review')",
  "ui('Manual follow-up')",
  "ui('Source workflows authoritative')",
  "ui('No automatic remediation')",
  "ui('No approval or signoff')",
  "ui('No incident or notification')",
  "ui('No monitoring activation')"
])if(!pageSource.includes(required))fail(`Reliability Command read-only/governance contract missing: ${required}`);
if(/\buseMutation\b/.test(pageSource)||/method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/.test(pageSource))fail('Reliability Command page unexpectedly contains a mutation path.');else pass('Reliability Command remains a read-only manual review workspace with source workflows authoritative.');
if(!process.exitCode)pass('ReliabilityCommandPage staged multilingual conversion is complete.');
