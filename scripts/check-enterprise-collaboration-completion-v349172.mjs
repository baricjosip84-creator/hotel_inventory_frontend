import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(); const read=(f)=>fs.readFileSync(path.join(root,f),'utf8');
const collaboration=read('src/pages/EnterpriseCollaborationPage.tsx');
const feed=read('src/pages/RealTimeOperationsFeedPage.tsx');
const adaptive=read('src/pages/AdaptivePolicyEnginePage.tsx');
const adaptiveCss=read('src/pages/AdaptivePolicyEnginePage.css');
let checked=0,failed=0;
const need=(src,text,label)=>{checked++; if(!src.includes(text)){failed++; console.error(`FAIL: ${label}`);} else console.log(`PASS: ${label}`);};
const forbid=(src,pattern,label)=>{checked++; if(pattern.test(src)){failed++; console.error(`FAIL: ${label}`);} else console.log(`PASS: ${label}`);};

need(collaboration, "(sourcePath === '/probabilistic-forecasting' || sourcePath === '/adaptive-policy-engine') && sourceActionId", 'Collaboration retains exact source-action navigation for Adaptive Policy.');
need(feed, "params.set('timeline_item_id', focusedTimelineItemId)", 'Operations Feed sends the exact timeline selector to the backend.');
need(feed, "focusedTimelineItemId ? '1' : '75'", 'Exact Operations Feed focus no longer depends on a 200-item scan.');
forbid(feed, /focusedTimelineItemId \? '200'/, 'Operations Feed no longer uses bounded 200-item pseudo-exact navigation.');
need(feed, "searchParams.get('timeline_item_id')", 'Operations Feed reads the exact timeline selector.');
need(feed, 'item.timeline_item_id !== requestedTimelineItemId', 'Operations Feed displays only the requested exact item in focus mode.');

need(adaptive, "searchParams.get('source_action_id')", 'Adaptive Policy reads exact source-action navigation.');
need(adaptive, "requestedSourceActionId.startsWith('adaptive_policy_recommendation:')", 'Adaptive Policy recognizes only its canonical recommendation focus.');
need(adaptive, "params.set('source_action_id', requestedSourceActionId)", 'Adaptive Policy sends exact focus to its backend source.');
need(adaptive, 'adaptive-policy-recommendation-${recommendation.id}', 'Adaptive Policy gives the exact recommendation a stable DOM target.');
need(adaptive, "'adaptive-policy-table-row--focused'", 'Adaptive Policy visibly focuses the requested recommendation.');
need(adaptive, 'scrollIntoView', 'Adaptive Policy scrolls the exact recommendation into view.');
need(adaptiveCss, '.adaptive-policy-table-row--focused', 'Adaptive Policy exact focus has a visible style.');

need(collaboration, "ui('Current owner or assignee')", 'Collaboration still presents real known ownership through its shared owner field.');
forbid(collaboration, /\buseMutation\b/, 'Collaboration remains read-only after completion fixes.');
forbid(collaboration, /method:\s*['\"](?:POST|PUT|PATCH|DELETE)['\"]/, 'Collaboration still has no write HTTP methods.');

if(failed){console.error(`Enterprise Collaboration v3.49.172 frontend completion guard: ${checked-failed}/${checked} PASS, ${failed} FAIL.`); process.exit(1);}
console.log(`Enterprise Collaboration v3.49.172 frontend completion guard: ${checked}/${checked} PASS.`);
