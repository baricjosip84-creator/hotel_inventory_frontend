/** Batch 125: Step 225 synthetic GET presentation. No real prevention, closure, rollout approval or live evidence is asserted. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
import {makeClosureSnapshot,CLOSURE_PERMISSIONS,type ClosureKind} from './platformCommercialLaunchIncidentClosureFixture';
export const PREVENTION_PATH='/platform/commercial-launch-prevention-verification';
export const PREVENTION_PERMISSIONS=[...CLOSURE_PERMISSIONS];
export const PREVENTION_FIELDS=["source_closure_record_reference", "prevention_action_reference", "implementation_evidence_link", "effectiveness_review_result", "monitoring_reentry_window", "recurrence_watch_owner", "customer_success_acknowledgement", "rollout_expansion_decision", "verification_owner", "reviewed_at"] as const;
export const PREVENTION_CHOICES=["continue", "continue_with_watchlist", "hold", "rollback", "not_reviewed"] as const;
export const PREVENTION_REQUIREMENTS={
  "service_health": [
    "Confirm reliability owner attached prevention implementation evidence for the launch health issue.",
    "Record the post-fix monitoring window and owner before reducing watchlist status.",
    "Block rollout expansion when service-health prevention has no effectiveness review."
  ],
  "customer_feedback": [
    "Confirm customer-success owner reviewed the customer-facing prevention action.",
    "Attach follow-up evidence showing the concern was addressed or accepted as watchlisted.",
    "Block rollout expansion when customer-success acknowledgement is missing."
  ],
  "support_intake": [
    "Confirm support owner converted support findings into runbook, macro, SLA, or training prevention evidence.",
    "Attach support readiness evidence for repeat occurrences.",
    "Block rollout expansion when support recurrence handling is not documented."
  ],
  "billing_confirmation": [
    "Confirm billing owner verified entitlement, invoice, plan, and activation-prevention evidence.",
    "Attach billing dispute prevention or billing-hold acceptance evidence.",
    "Block paid rollout expansion when billing prevention evidence is unclear."
  ],
  "incident_review": [
    "Confirm incident owner attached root-cause-linked prevention evidence.",
    "Record effectiveness review, monitoring re-entry, and recurrence watch owner.",
    "Block rollout expansion while severe incident prevention is unverified."
  ],
  "rollback_readiness": [
    "Confirm rollback owner verified rollback trigger, rollback point, and communication-prevention action.",
    "Attach continue/hold/rollback prevention evidence for future launch windows.",
    "Block rollout expansion when rollback prevention ownership is missing."
  ],
  "adoption_signal": [
    "Confirm product/support owner verified the blocked workflow prevention action.",
    "Attach evidence that the first agreed workflow can be completed or remains explicitly watchlisted.",
    "Block rollout expansion when adoption prevention is unverified."
  ],
  "handoff_closure": [
    "Confirm launch owner verified all handoff prevention actions have owners and destination boards.",
    "Attach handoff recurrence-watch evidence and next review time.",
    "Block closure when unresolved launch handoff prevention has no owner."
  ]
} as const;
export const PREVENTION_RULES=[
  "Use this board only after the Step 224 Incident Closure prerequisites are resolved and the external incident-closure record for each row is independently confirmed.",
  "Every prevention row must have externally recorded source-closure reference, prevention action, implementation evidence, effectiveness review, monitoring re-entry, recurrence-watch owner, customer-success acknowledgement when applicable, rollout-expansion decision, verification owner, and review timestamp before prevention verification can be accepted.",
  "Unverified severe-incident prevention, unresolved customer impact, unclear billing prevention, rollback prevention gap, blocked first workflow, or unowned handoff prevention must prevent rollout expansion.",
  "This endpoint is read-only and does not observe or persist external incident-closure or prevention-verification outcomes, implement prevention actions, close incidents, notify customers, mutate tenant state, trigger rollback, or authorize rollout expansion."
] as const;
export const PREVENTION_LIMITATIONS=[
  "Prevention-verification outcomes must be recorded externally because this endpoint is read-only.",
  "This application cannot observe whether external incident-closure or prevention-verification records have been completed.",
  "No prevention action, incident, support ticket, billing state, tenant state, customer communication, rollback action, or rollout-scope decision is changed by this board.",
  "No launch success, incident closure, prevention completion, customer acceptance, or rollout expansion is certified by this endpoint."
] as const;
export const PREVENTION_EVIDENCE_LINKS={
  "service_health": [
    {
      "label": "System health",
      "to": "/platform/system-health"
    },
    {
      "label": "Monitoring readiness",
      "to": "/platform/production-monitoring-readiness"
    }
  ],
  "customer_feedback": [
    {
      "label": "Customer success",
      "to": "/platform/customer-success-admin"
    },
    {
      "label": "Tenant communications",
      "to": "/platform/tenant-communications"
    }
  ],
  "support_intake": [
    {
      "label": "Support cockpit",
      "to": "/platform/support-cockpit"
    },
    {
      "label": "Tenant SLA",
      "to": "/platform/tenant-sla"
    }
  ],
  "billing_confirmation": [
    {
      "label": "Billing",
      "to": "/platform/billing"
    },
    {
      "label": "Billing activation",
      "to": "/platform/billing-subscription-activation"
    },
    {
      "label": "License enforcement",
      "to": "/platform/license-plan-enforcement"
    }
  ],
  "incident_review": [
    {
      "label": "Incidents",
      "to": "/platform/incidents"
    },
    {
      "label": "Incident closure",
      "to": "/platform/commercial-launch-incident-closure"
    }
  ],
  "rollback_readiness": [
    {
      "label": "Runbooks",
      "to": "/platform/runbooks"
    },
    {
      "label": "Launch command center",
      "to": "/platform/commercial-launch-day-command-center"
    }
  ],
  "adoption_signal": [
    {
      "label": "Tenant health",
      "to": "/platform/tenant-health"
    },
    {
      "label": "Customer success",
      "to": "/platform/customer-success-admin"
    }
  ],
  "handoff_closure": [
    {
      "label": "Incident closure",
      "to": "/platform/commercial-launch-incident-closure"
    },
    {
      "label": "Rollout expansion authorization",
      "to": "/platform/commercial-launch-rollout-expansion-authorization"
    }
  ]
} as const;
export type PreventionKind=ClosureKind|'manualClosure';
const statusMap={
 blocked:'blocked_until_incident_closure_ready',
 review:'waiting_for_post_launch_evidence_review',
 go:'waiting_for_external_go_no_go_confirmation',
 smoke:'waiting_for_external_smoke_test_confirmation',
 window:'waiting_for_external_launch_window_confirmation',
 external:'waiting_for_external_post_launch_observation_confirmation',
 manual:'waiting_for_external_triage_confirmation',
 manualClosure:'external_incident_closure_confirmation_required_before_prevention_verification'
} as const;
const nextText={
 blocked:'Resolve the blocked Incident Closure prerequisite before prevention verification preparation proceeds.',
 review:'Resolve the upstream Post-Launch Observation evidence review before prevention verification preparation proceeds.',
 go:'Confirm the externally recorded Go/No-Go decisions before prevention verification preparation proceeds.',
 smoke:'Confirm the externally recorded smoke-test results before prevention verification preparation proceeds.',
 window:'Confirm the externally recorded launch-window decisions and production launch before prevention verification preparation proceeds.',
 external:'Confirm the externally recorded post-launch observation before prevention verification preparation proceeds.',
 manual:'Confirm the externally recorded incident-triage record before prevention verification preparation proceeds.',
 manualClosure:'Confirm the externally recorded incident-closure record for this domain before recording prevention-verification evidence.'
} as const;
const summaryKeys=[
 'prevention_rows_total', 'waiting_for_post_launch_evidence_review', 'waiting_for_external_go_no_go_confirmation',
 'waiting_for_external_smoke_test_confirmation','waiting_for_external_launch_window_confirmation',
 'waiting_for_external_post_launch_observation_confirmation','waiting_for_external_triage_confirmation',
 'waiting_for_external_incident_closure_confirmation','blocked_until_incident_closure_ready','prevention_records_persisted_in_application'
] as const;
const PERSISTENCE={stored_in_application:false,external_records_observable:false,
 interpretation:'This application prepares prevention-verification records but stores and observes no external prevention-verification outcomes. A zero persisted-prevention count does not prove that no external prevention-verification records exist.'};
export function makePreventionSnapshot(kind:PreventionKind='blocked'){
 const closure=makeClosureSnapshot(kind==='manualClosure'?'manual':kind);
 const status=statusMap[kind];
 const closurePosture=kind==='manualClosure'?'commercial_launch_incident_closure_preparation_only':closure.posture;
 const prevention_rows=closure.closure_rows.map(r=>({
  code:`${r.code}_prevention_verification`,source_closure_code:r.code,source_triage_code:r.source_triage_code,
  source_observation_code:r.source_observation_code,domain:r.domain,owner:r.owner,
  source_closure_status:r.closure_status,source_default_severity:r.source_default_severity,
  source_closure_artifact:r.closure_artifact,source_closure_artifact_storage:r.closure_artifact_storage,
  customer_impact_review_required:r.customer_impact_review_required,manual_precondition:nextText[kind],
  required_prevention_fields:[...PREVENTION_FIELDS],accepted_rollout_expansion_decisions:[...PREVENTION_CHOICES],
  default_rollout_expansion_decision:'not_reviewed',prevention_artifact:'External commercial launch prevention-verification record',
  prevention_artifact_storage:'external_not_persisted_by_application',
  prevention_requirements:[...PREVENTION_REQUIREMENTS[r.domain as keyof typeof PREVENTION_REQUIREMENTS]],verification_status:status
 }));
 const summary:Record<string,number>={};for(const key of summaryKeys)summary[key]=key==='prevention_rows_total'?prevention_rows.length:key==='prevention_records_persisted_in_application'?0:key==='blocked_until_incident_closure_ready'?(status==='blocked_until_incident_closure_ready'?prevention_rows.length:0):key==='waiting_for_external_incident_closure_confirmation'?(status==='external_incident_closure_confirmation_required_before_prevention_verification'?prevention_rows.length:0):(status===key?prevention_rows.length:0);
 const posture=status==='blocked_until_incident_closure_ready'?'commercial_launch_prevention_verification_blocked':status==='external_incident_closure_confirmation_required_before_prevention_verification'?'commercial_launch_prevention_verification_waiting_for_external_incident_closure_confirmation':`commercial_launch_prevention_verification_${status}`;
 return {phase:'Platform Commercial Launch Readiness',step:'Step 225 — Commercial Launch Prevention Verification Board',posture,
 generated_at:'2026-11-05T14:00:00.000Z',summary,prevention_rows,incident_closure_posture:closurePosture,
 incident_closure_persistence:closure.closure_persistence,incident_triage_posture:closure.incident_triage_posture,
 post_launch_observation_posture:closure.post_launch_observation_posture,command_center_posture:closure.command_center_posture,
 smoke_test_posture:closure.smoke_test_posture,go_no_go_register_posture:closure.go_no_go_register_posture,
 prevention_persistence:{...PERSISTENCE},prevention_rules:[...PREVENTION_RULES],prevention_limitations:[...PREVENTION_LIMITATIONS],
 next_best_step:nextText[kind],validation_note:'Read-only commercial launch prevention-verification preparation surface. No external closure or prevention outcomes are observed.'};
}
export type PreventionSnapshot=ReturnType<typeof makePreventionSnapshot>;
export type PreventionOptions={permissions?:string[];kind?:PreventionKind;status?:number;urlQuery?:string;expectHeading?:boolean;
 alter?:(s:PreventionSnapshot)=>PreventionSnapshot;onCall?:(method:string,path:string,q:URLSearchParams)=>void;
 respond?:(method:string,path:string,q:URLSearchParams)=>{json:any;status?:number}|undefined};
export async function openPrevention(page:Page,opts:PreventionOptions={}){
 targetBaseURL();const permissions=opts.permissions??PREVENTION_PERMISSIONS;
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),q=url.searchParams;
  opts.onCall?.(method,path,q);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic session cannot refresh'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'fixture@synthetic.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const override=opts.respond?.(method,path,q);if(override)return fulfillJson(route,override.json,override.status??200);
  if(method==='GET'&&path===PREVENTION_PATH){
   if(PREVENTION_PERMISSIONS.some(p=>!permissions.includes(p)))return fulfillJson(route,{message:'Forbidden'},403);
   if(q.size)return fulfillJson(route,{message:'Unexpected query'},400);
   if(opts.status&&opts.status>=400)return fulfillJson(route,{message:'Synthetic prevention verification failure'},opts.status);
   const s=makePreventionSnapshot(opts.kind);return fulfillJson(route,opts.alter?opts.alter(s):s);
  }
  return fulfillJson(route,{message:'Synthetic route unavailable'},404);
 });
 await page.goto(PREVENTION_PATH+(opts.urlQuery?'?'+opts.urlQuery:''));
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Commercial Launch Prevention Verification',exact:true})).toBeVisible();
}
