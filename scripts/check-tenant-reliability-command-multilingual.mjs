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
  "const RELIABILITY_SYSTEM_TEXT_CONTRACT = 'platform_reliability_command_system_text_v1';",
  'response?.presentation?.system_text_contract === RELIABILITY_SYSTEM_TEXT_CONTRACT',
  'return systemOwned ? ui(normalized) : normalized;',
  'return systemOwned ? ui(formatted) : formatted;',
  'commandQuery.error.message',
  "systemText(overview.scoring_note, systemOwned, ui, 'Reliability scoring guidance is not available.')",
  "systemText(dimension.label, systemOwned, ui, 'Reliability dimension')",
  "systemText(dimension.recommendation, systemOwned, ui, 'No recommendation was reported.')",
  'formatEvidence(item, locale, ui, systemOwned)',
  "systemText(risk.label, systemOwned, ui, 'Reliability review item')",
  "systemText(risk.recommended_next_action, systemOwned, ui, 'Review the source workflow and capture the human decision there.')",
  'systemIdentifier(risk.recommended_owner, systemOwned, ui)',
  'systemIdentifier(risk.recommended_runbook, systemOwned, ui)',
  "systemText(stage.label, systemOwned, ui, 'Manual review stage')",
  "systemText(stage.description, systemOwned, ui, 'Manual review guidance')",
  "systemText(item.label, systemOwned, ui, 'Reliability review item')",
  'systemIdentifier(item.owner, systemOwned, ui)',
  'systemIdentifier(item.reviewer, systemOwned, ui)',
  'item.instructions.map((instruction) => <li key={instruction}>{systemText(formatSentence(instruction), systemOwned, ui)}</li>)'
])if(!pageSource.includes(required))fail(`Reliability Command explicit system-text boundary missing: ${required}`);
for(const forbidden of [
  'ui(commandQuery.error.message)',
  'ui(response?.presentation?.system_text_contract)',
  'ui(dimension.key)',
  'ui(risk.dimension)',
  'ui(item.dimension)'
])if(pageSource.includes(forbidden))fail(`Reliability Command translates API/technical data unexpectedly: ${forbidden}`);
if(!process.exitCode)pass('Repository-owned Reliability Command guidance is translated only under its explicit system-text contract; API errors and technical keys remain outside that boundary.');
const requiredSystemKeys=[
  'Operational surface availability',
  'Action pressure',
  'Human review readiness',
  'Event coordination visibility',
  'Workflow composer safety',
  'AI governance readiness',
  'Collaboration readiness',
  'Digital twin visibility',
  'Readiness risk triage',
  'This dimension is not assessed because this role cannot read the required source surface.',
  'Assessment availability',
  'Required source access',
  'Permitted source summaries',
  'Permission-limited source summaries',
  'Manual runbook planning',
  'Acceptance review',
  'Evidence review',
  'Signoff review',
  'Decision review',
  'Release review',
  'Monitoring review',
  'Incident handoff review',
  'Closure review',
  'Open the linked source workflow.',
  'Review the current evidence and reliability posture.',
  'Record the manual outcome in the authoritative source workflow.',
  'The score is an advisory average of permitted, assessed operational context and read-only safety checks. Permission-limited dimensions are not scored. It is not an uptime percentage, release approval, or proof that risks are closed.'
];
const missingSystemKeys=requiredSystemKeys.filter((key)=>!unique.has(key));
if(missingSystemKeys.length)fail(`Reliability Command system-owned presentation keys missing translations: ${missingSystemKeys.join(' | ')}`);else pass(`${requiredSystemKeys.length} critical backend-owned Reliability Command presentation keys are catalog-backed.`);
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
if(!pageSource.includes('Current advisory posture across the permitted, assessed operational dimensions.'))fail('Reliability Command overall posture copy must describe only permitted, assessed operational dimensions.');
if(pageSource.includes('Current advisory posture across the nine reliability dimensions.'))fail('Reliability Command must not imply the overall posture scores all nine dimensions when unassessed/meta dimensions are excluded.');
if(!process.exitCode)pass('Reliability Command overall posture copy matches the actual permitted/assessed scoring contract.');
if(/\buseMutation\b/.test(pageSource)||/method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/.test(pageSource))fail('Reliability Command page unexpectedly contains a mutation path.');else pass('Reliability Command remains a read-only manual review workspace with source workflows authoritative.');
if(!process.exitCode)pass('ReliabilityCommandPage staged multilingual conversion is complete.');
