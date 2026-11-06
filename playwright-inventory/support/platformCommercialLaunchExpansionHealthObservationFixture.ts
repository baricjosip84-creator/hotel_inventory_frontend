/** Batch 127: source-grounded synthetic read-only Step 227 GET. Not a rollout or health certification. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
import {makeExpansionSnapshot,EXPANSION_PERMISSIONS,type ExpansionKind} from './platformCommercialLaunchRolloutExpansionAuthorizationFixture';
export const HEALTH_PATH='/platform/commercial-launch-expansion-health-observation';
export const HEALTH_PERMISSIONS=[...EXPANSION_PERMISSIONS];
export const HEALTH_FIELDS=["source_rollout_expansion_authorization_record_reference", "expanded_cohort_id", "authorized_scope_evidence_link", "tenant_sample_health_evidence_link", "support_volume_review_link", "customer_success_feedback_link", "billing_entitlement_review_link_when_applicable", "incident_review_link", "rollback_readiness_reconfirmation", "adoption_signal_review_link", "next_expansion_recommendation", "observation_owner", "reviewed_at"] as const;
export const HEALTH_CHOICES=["continue_limited_growth", "continue_with_watchlist", "hold_growth", "pause_or_rollback", "not_reviewed"] as const;
export const HEALTH_REQUIREMENTS={
  "service_health": [
    "Attach expanded-cohort uptime, error-rate, latency, job, and queue health evidence.",
    "Confirm alert owner review for the expanded tenant sample.",
    "Hold additional expansion when health metrics are missing, degraded, or not reviewed."
  ],
  "customer_feedback": [
    "Attach customer-success feedback for the expanded cohort.",
    "Confirm unresolved customer feedback has an owner, due date, and customer communication path.",
    "Hold additional expansion when customer sentiment or acceptance is not externally reviewed."
  ],
  "support_intake": [
    "Attach ticket volume, SLA, escalation, and support-capacity review for the expanded cohort.",
    "Confirm support runbook gaps are tracked before further expansion.",
    "Hold additional expansion when support capacity is exceeded or escalation ownership is missing."
  ],
  "billing_confirmation": [
    "Attach billing, invoice, plan, entitlement, and overdue/dispute review evidence for expanded paid tenants.",
    "Confirm billing owner acceptance before further paid rollout growth.",
    "Hold additional expansion when entitlement or billing state is unclear."
  ],
  "incident_review": [
    "Attach incident-free observation evidence or incident triage links for the expanded cohort.",
    "Confirm incident severity, customer impact, and rollback decision review.",
    "Hold additional expansion when incidents are unresolved or recurrence prevention is missing."
  ],
  "rollback_readiness": [
    "Confirm rollback trigger, rollback owner, customer communication path, and rollback readiness remain current.",
    "Attach rollback readiness acknowledgement for the expanded cohort.",
    "Hold additional expansion when rollback ownership or decision path is stale."
  ],
  "adoption_signal": [
    "Attach usage/adoption evidence for the first agreed workflows in the expanded cohort.",
    "Confirm adoption blockers have product/support/customer-success owners.",
    "Hold additional expansion when users cannot complete core launch workflows."
  ],
  "handoff_closure": [
    "Attach handoff acceptance from launch operations into steady-state owners.",
    "Confirm next observation cadence, owner, and destination board.",
    "Hold additional expansion when launch ownership is not transferred or review cadence is missing."
  ]
} as const;
export const HEALTH_RULES=[
  "Use this board only after the Step 226 rollout-expansion prerequisites are resolved and the external rollout-expansion authorization record for each row is independently confirmed.",
  "Every observation row must reference the external rollout-expansion authorization record and contain an externally recorded expanded-cohort identifier, authorized-scope evidence, health evidence, support/customer-success feedback, billing/entitlement review when applicable, incident review, rollback reconfirmation, adoption review, next-expansion recommendation, observation owner, and review timestamp.",
  "A prepared observation row, default recommendation, or zero persisted-record count is not evidence that rollout authorization or expanded-cohort observation occurred.",
  "This endpoint is read-only and does not observe or persist external rollout-expansion authorization or expansion-health outcomes, mutate tenants, enable features, change billing state, notify customers, trigger rollback, or authorize additional rollout automatically."
] as const;
export const HEALTH_LIMITATIONS=[
  "Expansion-health observation outcomes must be recorded externally because this endpoint is read-only.",
  "This application cannot observe whether external rollout-expansion authorization or expansion-health observation records have been completed.",
  "No tenant scope, feature flag, entitlement, billing state, support ticket, customer communication, rollback action, monitoring configuration, or rollout authorization is changed by this board.",
  "No launch success, customer acceptance, rollout expansion, expanded-cohort health, or additional rollout growth is certified by this endpoint."
] as const;
export const HEALTH_EVIDENCE_LINKS={
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
      "label": "Operational jobs",
      "to": "/platform/operational-jobs"
    },
    {
      "label": "Additional growth authorization",
      "to": "/platform/commercial-launch-additional-growth-authorization"
    }
  ]
} as const;
export type HealthKind=ExpansionKind|'externalAuthorization';
const stateMap={
 blocked:'blocked_until_rollout_expansion_authorization_ready',
 review:'waiting_for_post_launch_evidence_review',
 go:'waiting_for_external_go_no_go_confirmation',
 smoke:'waiting_for_external_smoke_test_confirmation',
 window:'waiting_for_external_launch_window_confirmation',
 external:'waiting_for_external_post_launch_observation_confirmation',
 manual:'waiting_for_external_triage_confirmation',
 manualClosure:'waiting_for_external_incident_closure_confirmation',
 externalPrevention:'waiting_for_external_prevention_verification_confirmation',
 externalAuthorization:'external_rollout_expansion_authorization_confirmation_required_before_expansion_health_observation'
} as const;
const preconditionMap={
 blocked:'Resolve the blocked rollout-expansion authorization prerequisite before expansion-health preparation proceeds.',
 review:'Resolve the upstream Post-Launch Observation evidence review before expansion-health preparation proceeds.',
 go:'Confirm the externally recorded Go/No-Go decisions before expansion-health preparation proceeds.',
 smoke:'Confirm the externally recorded smoke-test results before expansion-health preparation proceeds.',
 window:'Confirm the externally recorded launch-window decisions and production launch before expansion-health preparation proceeds.',
 external:'Confirm the externally recorded post-launch observation before expansion-health preparation proceeds.',
 manual:'Confirm the externally recorded incident-triage record before expansion-health preparation proceeds.',
 manualClosure:'Confirm the externally recorded incident-closure record before expansion-health preparation proceeds.',
 externalPrevention:'Confirm the externally recorded prevention-verification record before expansion-health preparation proceeds.',
 externalAuthorization:'Confirm the externally recorded rollout-expansion authorization record for this domain before recording expanded-cohort health observation.'
} as const;
const summaryKeys=[
 'observation_rows_total','waiting_for_post_launch_evidence_review','waiting_for_external_go_no_go_confirmation',
 'waiting_for_external_smoke_test_confirmation','waiting_for_external_launch_window_confirmation',
 'waiting_for_external_post_launch_observation_confirmation','waiting_for_external_triage_confirmation',
 'waiting_for_external_incident_closure_confirmation','waiting_for_external_prevention_verification_confirmation',
 'waiting_for_external_rollout_expansion_authorization_confirmation','blocked_until_rollout_expansion_authorization_ready',
 'observation_records_persisted_in_application'] as const;
const persistence={stored_in_application:false,external_records_observable:false,interpretation:'This application prepares expansion-health observation records but stores and observes no external expanded-cohort health outcomes. A zero persisted-observation count does not prove that no external expansion-health observation records exist.'};
export function makeHealthSnapshot(kind:HealthKind='blocked'){
 const authorization=makeExpansionSnapshot(kind==='externalAuthorization'?'externalPrevention':kind);
 const status=stateMap[kind];
 const authorizationPosture=kind==='externalAuthorization'?'commercial_launch_rollout_expansion_authorization_preparation_only':authorization.posture;
 const observation_rows=authorization.expansion_rows.map(row=>({
  code:`${row.code}_expanded_cohort_health_observation`,source_expansion_code:row.code,
  source_prevention_code:row.source_prevention_code,source_closure_code:row.source_closure_code,
  source_triage_code:row.source_triage_code,source_observation_code:row.source_observation_code,
  domain:row.domain,owner:row.owner,source_authorization_status:row.authorization_status,
  source_authorization_artifact:row.authorization_artifact,
  source_authorization_artifact_storage:row.authorization_artifact_storage,
  customer_impact_review_required:row.customer_impact_review_required,
  manual_precondition:preconditionMap[kind],required_observation_fields:[...HEALTH_FIELDS],
  accepted_next_expansion_recommendations:[...HEALTH_CHOICES],default_next_expansion_recommendation:'not_reviewed',
  observation_artifact:'External commercial launch expansion-health observation record',
  observation_artifact_storage:'external_not_persisted_by_application',
  observation_requirements:[...HEALTH_REQUIREMENTS[row.domain as keyof typeof HEALTH_REQUIREMENTS]],
  observation_status:status
 }));
 const summary:Record<string,number>={};
 for(const key of summaryKeys)summary[key]=key==='observation_rows_total'?observation_rows.length:key==='observation_records_persisted_in_application'?0:key==='waiting_for_external_rollout_expansion_authorization_confirmation'?(status==='external_rollout_expansion_authorization_confirmation_required_before_expansion_health_observation'?observation_rows.length:0):(status===key?observation_rows.length:0);
 const posture=status==='blocked_until_rollout_expansion_authorization_ready'?'commercial_launch_expansion_health_observation_blocked':status==='external_rollout_expansion_authorization_confirmation_required_before_expansion_health_observation'?'commercial_launch_expansion_health_observation_waiting_for_external_rollout_expansion_authorization_confirmation':`commercial_launch_expansion_health_observation_${status}`;
 return {phase:'Platform Commercial Launch Readiness',step:'Step 227 — Commercial Launch Expansion Health Observation Board',posture,
  generated_at:'2026-11-05T14:00:00.000Z',summary,observation_rows,
  rollout_expansion_authorization_posture:authorizationPosture,rollout_expansion_authorization_persistence:authorization.rollout_expansion_persistence,
  prevention_verification_posture:authorization.prevention_verification_posture,incident_closure_posture:authorization.incident_closure_posture,
  incident_triage_posture:authorization.incident_triage_posture,post_launch_observation_posture:authorization.post_launch_observation_posture,
  command_center_posture:authorization.command_center_posture,smoke_test_posture:authorization.smoke_test_posture,
  go_no_go_register_posture:authorization.go_no_go_register_posture,expansion_health_persistence:{...persistence},
  observation_rules:[...HEALTH_RULES],observation_limitations:[...HEALTH_LIMITATIONS],next_best_step:preconditionMap[kind],
  validation_note:'Read-only expansion-health preparation, no external rollout authorization or health outcome observed.'};
}
export type HealthSnapshot=ReturnType<typeof makeHealthSnapshot>;
export type HealthOptions={permissions?:string[];kind?:HealthKind;status?:number;urlQuery?:string;expectHeading?:boolean;
 alter?:(s:HealthSnapshot)=>HealthSnapshot;onCall?:(method:string,path:string,query:URLSearchParams)=>void;
 respond?:(method:string,path:string,query:URLSearchParams)=>{json:any;status?:number}|undefined};
export async function openHealth(page:Page,opts:HealthOptions={}){
 targetBaseURL();const permissions=opts.permissions??HEALTH_PERMISSIONS;
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),q=url.searchParams;
  opts.onCall?.(method,path,q);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic session cannot refresh'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'fixture@synthetic.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const override=opts.respond?.(method,path,q);if(override)return fulfillJson(route,override.json,override.status??200);
  if(method==='GET'&&path===HEALTH_PATH){
   if(HEALTH_PERMISSIONS.some(p=>!permissions.includes(p)))return fulfillJson(route,{message:'Forbidden'},403);
   if(q.size)return fulfillJson(route,{message:'Unexpected query'},400);
   if(opts.status&&opts.status>=400)return fulfillJson(route,{message:'Synthetic expansion-health observation failure'},opts.status);
   const s=makeHealthSnapshot(opts.kind);return fulfillJson(route,opts.alter?opts.alter(s):s);
  }
  return fulfillJson(route,{message:'Synthetic route unavailable'},404);
 });
 await page.goto(HEALTH_PATH+(opts.urlQuery?'?'+opts.urlQuery:''));
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Commercial Launch Expansion Health Observation',exact:true})).toBeVisible();
}
