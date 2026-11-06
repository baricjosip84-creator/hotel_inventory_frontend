/** Batch 124: Step 224 synthetic GET presentation only. No incident resolution, closure acceptance or live evidence is implied. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
import {makeTriageSnapshot,TRIAGE_PERMISSIONS,type TriageKind} from './platformCommercialLaunchIncidentTriageFixture';
export const CLOSURE_PATH='/platform/commercial-launch-incident-closure';
export const CLOSURE_PERMISSIONS=[...TRIAGE_PERMISSIONS];
export const CLOSURE_FIELDS=["source_triage_record_reference", "final_severity", "customer_impact_resolution", "rollback_outcome", "customer_communication_completed_at", "prevention_action", "handoff_decision", "closure_evidence_link", "closure_owner", "reviewed_at"] as const;
export const CLOSURE_CHOICES=["accepted", "accepted_with_watchlist", "blocked", "rolled_back", "not_reviewed"] as const;
export const CLOSURE_REQUIREMENTS={
  "service_health": [
    "Confirm reliability owner reviewed the externally recorded triage and launch-window health evidence.",
    "Attach mitigation or no-action evidence for any health anomaly.",
    "Record whether service health is clear, watchlisted, or blocking launch handoff."
  ],
  "customer_feedback": [
    "Confirm customer-success owner reviewed the externally recorded triage and first customer feedback.",
    "Attach customer follow-up evidence for unresolved concerns.",
    "Record whether customer feedback is accepted, watchlisted, or blocking launch handoff."
  ],
  "support_intake": [
    "Confirm support owner reviewed the externally recorded triage, tickets, SLA exposure, and response completeness.",
    "Attach support closure or escalation evidence.",
    "Record whether support intake is clear, watchlisted, or blocking launch handoff."
  ],
  "billing_confirmation": [
    "Confirm billing owner reviewed the externally recorded triage plus subscription, entitlement, invoice, and activation evidence.",
    "Attach billing acceptance or billing hold evidence.",
    "Block paid rollout expansion when billing confirmation is unclear or disputed."
  ],
  "incident_review": [
    "Confirm incident owner reviewed the externally recorded triage, severity, customer impact, mitigation, and closure evidence.",
    "Attach root-cause, mitigation, and prevention evidence for any severe incident.",
    "Block launch handoff while severe incidents remain unresolved."
  ],
  "rollback_readiness": [
    "Confirm rollback owner reviewed the externally recorded triage, trigger state, safe rollback point, and communication owner.",
    "Attach continue, hold, or rollback decision evidence.",
    "Block launch handoff when rollback trigger is met or rollback ownership is missing."
  ],
  "adoption_signal": [
    "Confirm product/support owner reviewed the externally recorded triage plus first-login and first-workflow evidence.",
    "Attach first workflow completion or blocker evidence.",
    "Block rollout expansion when the first agreed customer workflow is blocked."
  ],
  "handoff_closure": [
    "Confirm every unresolved launch item from the externally recorded triage has a destination board and owner.",
    "Attach final launch handoff notes and next review time.",
    "Block closure when unresolved launch items have no owner or destination."
  ]
} as const;
export const CLOSURE_RULES=[
  "Use this board only after the Step 223 incident-triage prerequisites are resolved and the external triage record for each row is independently confirmed.",
  "Every closure row must have externally recorded final severity, customer-impact resolution, rollback outcome, communication completion, prevention action, handoff decision, evidence, and closure owner before incident closure can be accepted.",
  "Severe incidents, unresolved customer impact, unclear billing, rollback trigger, blocked first workflow, or unowned handoff item must prevent launch handoff closure.",
  "This endpoint is read-only and does not observe or persist external triage or closure outcomes, close incidents, resolve tickets, send communications, trigger rollback, mutate tenants, or certify launch success."
] as const;
export const CLOSURE_LIMITATIONS=[
  "Incident-closure outcomes must be recorded externally because this endpoint is read-only.",
  "This application cannot observe whether external incident-triage or incident-closure records have been completed.",
  "No incident, support ticket, billing state, tenant state, customer communication, rollback action, or launch certificate is changed by this board.",
  "No launch success, incident closure, customer acceptance, prevention completion, or rollout expansion is certified by this endpoint."
] as const;
export const CLOSURE_EVIDENCE_LINKS=[{"href": "/platform/system-health", "label": "Open system health"}, {"href": "/platform/tenant-communications", "label": "Open tenant communications"}, {"href": "/platform/support-cockpit", "label": "Open support cockpit"}, {"href": "/platform/billing-subscription-activation", "label": "Open billing activation"}, {"href": "/platform/incidents", "label": "Open incidents"}, {"href": "/platform/deployment-validation", "label": "Open deployment validation"}, {"href": "/platform/pilot-customer-readiness", "label": "Open pilot readiness"}, {"href": "/platform/commercial-launch-post-launch-observation", "label": "Open post-launch observation"}] as const;
export type ClosureKind=TriageKind|'manual';
type Status={triagePosture:string;rowStatus:string;posture:string;manual:string};
const STATUSES:Record<ClosureKind,Status>={
 blocked:{triagePosture:'commercial_launch_incident_triage_blocked',rowStatus:'blocked_until_triage_ready',posture:'commercial_launch_incident_closure_blocked',manual:'Resolve the blocked Incident Triage prerequisite before incident closure preparation proceeds.'},
 review:{triagePosture:'commercial_launch_incident_triage_waiting_for_post_launch_evidence_review',rowStatus:'waiting_for_post_launch_evidence_review',posture:'commercial_launch_incident_closure_waiting_for_post_launch_evidence_review',manual:'Resolve the upstream Post-Launch Observation evidence review before incident closure preparation proceeds.'},
 go:{triagePosture:'commercial_launch_incident_triage_waiting_for_external_go_no_go_confirmation',rowStatus:'waiting_for_external_go_no_go_confirmation',posture:'commercial_launch_incident_closure_waiting_for_external_go_no_go_confirmation',manual:'Confirm the externally recorded Go/No-Go decisions before incident closure preparation proceeds.'},
 smoke:{triagePosture:'commercial_launch_incident_triage_waiting_for_external_smoke_test_confirmation',rowStatus:'waiting_for_external_smoke_test_confirmation',posture:'commercial_launch_incident_closure_waiting_for_external_smoke_test_confirmation',manual:'Confirm the externally recorded smoke-test results before incident closure preparation proceeds.'},
 window:{triagePosture:'commercial_launch_incident_triage_waiting_for_external_launch_window_confirmation',rowStatus:'waiting_for_external_launch_window_confirmation',posture:'commercial_launch_incident_closure_waiting_for_external_launch_window_confirmation',manual:'Confirm the externally recorded launch-window decisions and production launch before incident closure preparation proceeds.'},
 external:{triagePosture:'commercial_launch_incident_triage_waiting_for_external_post_launch_observation_confirmation',rowStatus:'waiting_for_external_post_launch_observation_confirmation',posture:'commercial_launch_incident_closure_waiting_for_external_post_launch_observation_confirmation',manual:'Confirm the externally recorded post-launch observation before incident closure preparation proceeds.'},
 manual:{triagePosture:'commercial_launch_incident_triage_preparation_only',rowStatus:'external_triage_confirmation_required_before_incident_closure',posture:'commercial_launch_incident_closure_waiting_for_external_triage_confirmation',manual:'Confirm the externally recorded incident-triage record for this domain before recording incident-closure decisions.'}
};
const PERSIST={stored_in_application:false,external_records_observable:false,interpretation:'This application prepares external triage records but stores and observes no external outcomes.'};
export type ClosureSnapshot={phase:string;step:string;posture:string;generated_at:string;summary:Record<string,number>;closure_rows:Array<{
 code:string;source_triage_code:string;source_observation_code:string;domain:string;owner:string;source_triage_status:string;
 source_default_severity:string;source_triage_artifact:string;source_triage_artifact_storage:string;customer_impact_review_required:boolean;
 manual_precondition:string;required_closure_fields:string[];handoff_decision_values:string[];default_handoff_decision:string;
 closure_artifact:string;closure_artifact_storage:string;closure_requirements:string[];closure_status:string
}>;incident_triage_posture:string;incident_triage_persistence:any;post_launch_observation_posture:string;command_center_posture:string;
 smoke_test_posture:string;go_no_go_register_posture:string;closure_persistence:any;closure_rules:string[];closure_limitations:string[];next_best_step:string;validation_note:string};
export function makeClosureSnapshot(kind:ClosureKind='blocked'):ClosureSnapshot{
 const triage=makeTriageSnapshot(kind==='manual'?'external':kind);const st=STATUSES[kind];
 const closure_rows=triage.triage_rows.map(row=>({code:`${row.code}_closure`,source_triage_code:row.code,source_observation_code:row.source_observation_code,
 domain:row.domain,owner:row.owner,source_triage_status:row.triage_status,source_default_severity:row.default_severity,
 source_triage_artifact:row.triage_artifact,source_triage_artifact_storage:row.triage_artifact_storage,customer_impact_review_required:true,
 manual_precondition:st.manual,required_closure_fields:[...CLOSURE_FIELDS],handoff_decision_values:[...CLOSURE_CHOICES],
 default_handoff_decision:'not_reviewed',closure_artifact:'External commercial launch incident-closure record',closure_artifact_storage:'external_not_persisted_by_application',
 closure_requirements:[...CLOSURE_REQUIREMENTS[row.domain]],closure_status:st.rowStatus}));
 const summary={closure_rows_total:8,waiting_for_post_launch_evidence_review:kind==='review'?8:0,
 waiting_for_external_go_no_go_confirmation:kind==='go'?8:0,waiting_for_external_smoke_test_confirmation:kind==='smoke'?8:0,
 waiting_for_external_launch_window_confirmation:kind==='window'?8:0,waiting_for_external_post_launch_observation_confirmation:kind==='external'?8:0,
 waiting_for_external_triage_confirmation:kind==='manual'?8:0,blocked_until_triage_ready:kind==='blocked'?8:0,closure_records_persisted_in_application:0};
 return {phase:'Platform Commercial Launch Readiness',step:'Step 224 — Commercial Launch Incident Closure Board',posture:st.posture,generated_at:'2026-11-05T20:50:00.000Z',summary,
 closure_rows,incident_triage_posture:st.triagePosture,incident_triage_persistence:{...PERSIST},
 post_launch_observation_posture:triage.post_launch_observation_posture,command_center_posture:triage.command_center_posture,
 smoke_test_posture:triage.smoke_test_posture,go_no_go_register_posture:triage.go_no_go_register_posture,
 closure_persistence:{...PERSIST,interpretation:'This application prepares incident-closure records but stores and observes no external incident-closure outcomes. A zero persisted-closure count does not prove that no external closure records exist.'},
 closure_rules:[...CLOSURE_RULES],closure_limitations:[...CLOSURE_LIMITATIONS],next_best_step:st.manual,
 validation_note:'Read-only commercial launch incident-closure preparation surface. No external incident closure is observed or persisted.'};
}
export type ClosureOptions={permissions?:string[];kind?:ClosureKind;status?:number;expectHeading?:boolean;urlQuery?:string;
 alter?:(s:ClosureSnapshot)=>ClosureSnapshot;onCall?:(method:string,path:string,q:URLSearchParams)=>void;
 respond?:(method:string,path:string,q:URLSearchParams)=>{json:any;status?:number}|undefined};
export async function openClosure(page:Page,opts:ClosureOptions={}){
 targetBaseURL();const permissions=opts.permissions??CLOSURE_PERMISSIONS;
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),q=url.searchParams;
  opts.onCall?.(method,path,q);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic session cannot refresh'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'fixture@synthetic.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const override=opts.respond?.(method,path,q);if(override)return fulfillJson(route,override.json,override.status??200);
  if(method==='GET'&&path===CLOSURE_PATH){
   if(CLOSURE_PERMISSIONS.some(p=>!permissions.includes(p)))return fulfillJson(route,{message:'Forbidden'},403);
   if(opts.status&&opts.status>=400)return fulfillJson(route,{message:'Synthetic incident closure failure'},opts.status);
   const s=makeClosureSnapshot(opts.kind);return fulfillJson(route,opts.alter?opts.alter(s):s);
  }
  return fulfillJson(route,{message:'Synthetic route unavailable'},404);
 });
 await page.goto(CLOSURE_PATH+(opts.urlQuery?'?'+opts.urlQuery:''));
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Commercial Launch Incident Closure',exact:true})).toBeVisible();
}
