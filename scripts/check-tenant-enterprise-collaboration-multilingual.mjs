import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const fail=(m)=>{console.error(`FAIL: ${m}`);process.exitCode=1;};
const pass=(m)=>console.log(`PASS: ${m}`);
const translationSource=read('src/i18n/tenantUiTranslations.ts');
const pageSource=read('src/pages/EnterpriseCollaborationPage.tsx');
const routerSource=read('src/app/router.tsx');
const rows=[];
for(const line of translationSource.split(/\r?\n/)){const t=line.trim();if(!t.startsWith('[')||!t.endsWith(','))continue;try{const r=JSON.parse(t.slice(0,-1));if(Array.isArray(r)&&r.length===5&&r.every((x)=>typeof x==='string'))rows.push(r);}catch{}}
const keys=rows.map((r)=>r[0]);const unique=new Set(keys);
if(keys.length!==unique.size)fail('Tenant UI translation catalog contains duplicate English keys.');else pass(`Tenant UI catalog has ${keys.length} unique five-language rows.`);
const literalPattern=/\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decode(lit){if(lit.startsWith('"'))return JSON.parse(lit);const body=lit.slice(1,-1).replace(/\\'/g,"'").replace(/\\\\/g,'\\').replace(/"/g,'\\"');return JSON.parse(`"${body}"`);}
const literals=[];for(const m of pageSource.matchAll(literalPattern)){try{literals.push(decode(m[1]));}catch{}}
const missing=[...new Set(literals.filter((k)=>!unique.has(k)))];
if(missing.length)fail(`Enterprise Collaboration ui() literals missing translations: ${missing.join(' | ')}`);else pass(`Enterprise Collaboration has ${new Set(literals).size} catalog-backed literal UI keys.`);
for(const required of ["import { useAppTranslation } from '../i18n/I18nContext';","import { formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';","path: 'collaboration'",'TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ','<EnterpriseCollaborationPage />']){const src=required.startsWith('path:')||required.includes('OPERATIONAL_ACTION_CENTER_READ')||required.includes('EnterpriseCollaborationPage')?routerSource:pageSource;if(!src.includes(required))fail(`Enterprise Collaboration multilingual wiring missing: ${required}`);}
if(!process.exitCode)pass('Enterprise Collaboration keeps the shared multilingual runtime and OPERATIONAL_ACTION_CENTER_READ route contract.');
const rawText=pageSource.split(/\r?\n/).flatMap((line)=>[...line.matchAll(/<(?:h[1-6]|p|th|td|summary|span|option|button|label|dt|dd|OperationalWorkspaceMetaPill)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g)].map((m)=>m[1].trim()).filter(Boolean));
if(rawText.length)fail(`Raw JSX presentation remains on EnterpriseCollaborationPage: ${rawText.join(' | ')}`);else pass('EnterpriseCollaborationPage has zero raw direct JSX presentation text.');
const dynamic=new Set();
for(const m of pageSource.matchAll(/\blabel: '([^']+)'/g))dynamic.add(m[1]);
for(const [st,en] of [['const ROLE_LABELS','const CADENCE_LABELS'],['const CADENCE_LABELS','const THREAD_TYPE_LABELS'],['const THREAD_TYPE_LABELS','const DOMAIN_LABELS'],['const DOMAIN_LABELS','const TOPIC_LABELS'],['const TOPIC_LABELS','const SOURCE_LABELS'],['const SOURCE_LABELS','function numberValue']]){const a=pageSource.indexOf(st),b=pageSource.indexOf(en,a+1);if(a<0||b<=a)fail(`Unable to isolate label block ${st}`);const block=a>=0&&b>a?pageSource.slice(a,b):'';for(const m of block.matchAll(/: '([^']+)'/g))dynamic.add(m[1]);}
for(const m of pageSource.matchAll(/\b(?:label|description)="([^"]+)"/g))dynamic.add(m[1]);
const missingDynamic=[...dynamic].filter((k)=>!unique.has(k));if(missingDynamic.length)fail(`Enterprise Collaboration dynamic display keys missing translations: ${missingDynamic.join(' | ')}`);else pass(`${dynamic.size} filter, role, topic, source, summary, and cadence display keys are catalog-backed.`);
for(const required of ['const { locale, ui } = useAppTranslation();','formatLocalizedDateTime(date, locale)','formatLocalizedNumber(value, locale)','formatLocalizedNumber(threads.length, locale)','formatLocalizedNumber(appliedLimit, locale)','formatDateTime(thread.updated_at || thread.created_at, locale, ui)'])if(!pageSource.includes(required))fail(`Enterprise Collaboration locale-aware presentation missing: ${required}`);
if(!process.exitCode)pass('Recommendation counts, limits, summary metrics, and timestamps use the tenant locale.');
for(const required of ['collaborationQuery.error.message','guidance.collaboration_guidance || ui(','thread.title || ui(','thread.summary || ui(','thread.coordination_context?.recommended_next_step || ui(','guidance.escalation_thread_guidance || ui(','guidance.incident_war_room_guidance || ui(','guidance.supplier_coordination_guidance || ui('])if(!pageSource.includes(required))fail(`Enterprise Collaboration server-data boundary changed unexpectedly: ${required}`);
for(const forbidden of ['ui(thread.title)','ui(thread.summary)','ui(guidance.collaboration_guidance)','ui(thread.coordination_context?.recommended_next_step)'])if(pageSource.includes(forbidden))fail(`Enterprise Collaboration translates backend/user business text unexpectedly: ${forbidden}`);
if(!process.exitCode)pass('Backend guidance, thread titles/summaries, next steps, and API error text remain server/business data.');
for(const required of ["apiRequest<CollaborationResponse>(`/operational-action-center/enterprise-collaboration-summary?${params.toString()}`)","ui('This page turns permitted alerts, tasks, governance reviews, and operational events into suggestions about who should coordinate, what to discuss, and where the real work belongs. It does not create a chat thread, send a message, notify anyone, or record a comment.')","ui('No messages or comments are recorded')","ui('No operational data is changed')","ui('Source permissions still apply')"])if(!pageSource.includes(required))fail(`Enterprise Collaboration read-only/governance contract missing: ${required}`);
if(/\buseMutation\b/.test(pageSource)||/method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/.test(pageSource))fail('Enterprise Collaboration page unexpectedly contains a mutation path.');else pass('Enterprise Collaboration remains a read-only coordination-guidance workspace with source workflows authoritative.');
if(!process.exitCode)pass('EnterpriseCollaborationPage staged multilingual conversion is complete.');
