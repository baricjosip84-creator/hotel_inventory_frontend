/** Batch 130: source-grounded synthetic response model, not evidence of operational closure. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
import {makeObservationSnapshot,OBS_PERMISSIONS} from './platformCommercialLaunchAdditionalGrowthObservationFixture';
export const SST_PATH='/platform/commercial-launch-steady-state-transition';
export const SST_PERMISSIONS=[...OBS_PERMISSIONS];
export const SST_REQUIREMENTS=[
  {
    "code": "steady_state_growth_exit_review",
    "domain": "growth_exit",
    "owner": "product_owner",
    "fields": [
      "additional_growth_observation_summary",
      "scope_drift_review",
      "continue_hold_rollback_decision",
      "remaining_growth_blockers"
    ],
    "controls": [
      "Additional-growth observation is summarized before steady-state handover.",
      "Tenant-scope drift and excluded tenant posture are reviewed externally.",
      "Continue, hold, or rollback decision is recorded by the accountable owner.",
      "Open growth blockers remain visible until closed or waived externally."
    ]
  },
  {
    "code": "steady_state_operating_cadence_review",
    "domain": "operating_cadence",
    "owner": "platform_operations_owner",
    "fields": [
      "monitoring_cadence",
      "health_review_frequency",
      "backup_restore_drill_frequency",
      "deployment_smoke_test_frequency"
    ],
    "controls": [
      "Steady-state monitoring cadence is defined outside this endpoint.",
      "Health, backup/restore, and deployment validation review frequencies are documented.",
      "Operational ownership is assigned before launch work is considered closed.",
      "Cadence gaps block steady-state transition readiness."
    ]
  },
  {
    "code": "steady_state_support_handover_review",
    "domain": "support_handover",
    "owner": "support_lead",
    "fields": [
      "support_queue_owner",
      "sla_review",
      "escalation_path_review",
      "known_issue_handover"
    ],
    "controls": [
      "Support ownership is reconfirmed for post-launch steady state.",
      "SLA and escalation paths are reviewed after additional-growth observation.",
      "Known issues and customer-impacting risks are handed over to support.",
      "Support gaps block steady-state launch transition."
    ]
  },
  {
    "code": "steady_state_customer_success_handover_review",
    "domain": "customer_success_handover",
    "owner": "customer_success_lead",
    "fields": [
      "customer_feedback_summary",
      "adoption_risk_review",
      "training_gap_review",
      "success_metric_cadence"
    ],
    "controls": [
      "Customer feedback and adoption risks are summarized for steady-state customer success.",
      "Training gaps and enablement follow-ups are assigned externally.",
      "Success metric cadence is defined before launch closure.",
      "Customer-success blockers prevent steady-state transition."
    ]
  },
  {
    "code": "steady_state_billing_entitlement_review",
    "domain": "billing_entitlements",
    "owner": "billing_owner",
    "fields": [
      "active_plan_review",
      "entitlement_reconciliation",
      "overdue_policy_review",
      "billing_exception_review"
    ],
    "controls": [
      "Billing plan, license limits, and entitlement posture are reconciled after growth.",
      "Billing exceptions and overdue policies are reviewed externally.",
      "Commercial entitlement mismatches are tracked before steady-state handover.",
      "Billing blockers prevent launch closure."
    ]
  },
  {
    "code": "steady_state_monitoring_ownership_review",
    "domain": "monitoring_ownership",
    "owner": "platform_operations_owner",
    "fields": [
      "alert_owner",
      "dependency_owner",
      "incident_owner",
      "status_communication_owner"
    ],
    "controls": [
      "Alert, dependency, incident, and status-communication owners are recorded externally.",
      "Monitoring ownership is durable beyond launch-day command center coverage.",
      "Escalation coverage is verified for steady-state operations.",
      "Unowned monitoring surfaces block launch closure."
    ]
  },
  {
    "code": "steady_state_incident_prevention_review",
    "domain": "incident_prevention",
    "owner": "incident_manager",
    "fields": [
      "closed_incident_review",
      "prevention_action_status",
      "recurrence_monitoring_rule",
      "rollback_trigger_refresh"
    ],
    "controls": [
      "Incident closure and prevention-verification evidence are reviewed before steady state.",
      "Recurrence monitoring and rollback triggers are refreshed externally.",
      "Open prevention actions remain blockers until accepted or waived externally.",
      "Incident prevention gaps block transition readiness."
    ]
  },
  {
    "code": "steady_state_executive_acceptance_review",
    "domain": "executive_acceptance",
    "owner": "executive_sponsor",
    "fields": [
      "launch_acceptance_packet_reference",
      "growth_observation_acceptance",
      "steady_state_owner_acceptance",
      "closure_decision"
    ],
    "controls": [
      "Executive or delegated sponsor accepts the launch-to-steady-state transition externally.",
      "Launch acceptance, go/no-go, smoke-test, launch-day, incident, and growth evidence remain linked.",
      "Steady-state owners accept ongoing responsibility before closure.",
      "No automatic commercial success claim is made by this board."
    ]
  }
] as const;
export const SST_RULES=[
  "Steady-state transition must not be considered ready from this board until the external additional-growth observation record is independently confirmed.",
  "Any blocked additional-growth observation, authorization, expansion-health, incident, post-launch, launch-day, smoke-test, or go/no-go posture blocks this board.",
  "This endpoint only describes manual steady-state transition requirements and never changes production operations automatically."
] as const;
export const SST_LIMITATIONS=[
  "Read-only launch-to-steady-state transition surface.",
  "Does not close launch, change billing, alter tenant access, send communications, or create operational records.",
  "Manual acceptance must be recorded in the operational systems of record outside this endpoint.",
  "A waiting-for-manual-review Additional Growth Observation board is not proof that the external observation record exists; external confirmation remains required before steady-state transition."
] as const;
export const SST_SOURCE_LINKS=[
  [
    "Additional growth observation",
    "/platform/commercial-launch-additional-growth-observation"
  ],
  [
    "Additional growth authorization",
    "/platform/commercial-launch-additional-growth-authorization"
  ],
  [
    "Expansion health observation",
    "/platform/commercial-launch-expansion-health-observation"
  ],
  [
    "Rollout expansion authorization",
    "/platform/commercial-launch-rollout-expansion-authorization"
  ],
  [
    "Prevention verification",
    "/platform/commercial-launch-prevention-verification"
  ],
  [
    "Incident closure",
    "/platform/commercial-launch-incident-closure"
  ],
  [
    "Incident triage",
    "/platform/commercial-launch-incident-triage"
  ],
  [
    "Post-launch observation",
    "/platform/commercial-launch-post-launch-observation"
  ],
  [
    "Launch command center",
    "/platform/commercial-launch-day-command-center"
  ],
  [
    "Launch smoke test",
    "/platform/commercial-launch-smoke-test-checklist"
  ],
  [
    "Launch Go/No-Go",
    "/platform/commercial-launch-go-no-go-register"
  ]
] as const;
export const SST_SUPPORT_LINKS=[
  [
    "Additional Growth Observation",
    "/platform/commercial-launch-additional-growth-observation"
  ],
  [
    "Additional Growth Authorization",
    "/platform/commercial-launch-additional-growth-authorization"
  ],
  [
    "Expansion Health",
    "/platform/commercial-launch-expansion-health-observation"
  ],
  [
    "Support Cockpit",
    "/platform/support-operations-cockpit"
  ],
  [
    "Billing",
    "/platform/billing"
  ],
  [
    "Runbooks",
    "/platform/runbooks"
  ]
] as const;
export const SST_DOMAIN_LINKS={
  "growth_exit": [
    {
      "label": "Expansion Health",
      "to": "/platform/commercial-launch-expansion-health-observation",
      "permission": false
    },
    {
      "label": "Launch Acceptance",
      "to": "/platform/commercial-launch-acceptance",
      "permission": false
    }
  ],
  "operating_cadence": [
    {
      "label": "Production Monitoring",
      "to": "/platform/production-monitoring-readiness",
      "permission": false
    },
    {
      "label": "Operational Jobs",
      "to": "/platform/operational-jobs",
      "permission": true
    },
    {
      "label": "Backup Restore",
      "to": "/platform/backup-restore-validation",
      "permission": false
    },
    {
      "label": "Deployment Validation",
      "to": "/platform/deployment-validation",
      "permission": false
    }
  ],
  "support_handover": [
    {
      "label": "Support Cockpit",
      "to": "/platform/support-operations-cockpit",
      "permission": false
    },
    {
      "label": "Incidents",
      "to": "/platform/incidents",
      "permission": false
    }
  ],
  "customer_success_handover": [
    {
      "label": "Customer Success",
      "to": "/platform/customer-success-admin",
      "permission": false
    },
    {
      "label": "Announcements",
      "to": "/platform/announcements",
      "permission": true
    }
  ],
  "billing_entitlements": [
    {
      "label": "Billing",
      "to": "/platform/billing",
      "permission": false
    },
    {
      "label": "Tenants",
      "to": "/platform/tenants",
      "permission": false
    }
  ],
  "monitoring_ownership": [
    {
      "label": "System Health",
      "to": "/platform/system-health",
      "permission": false
    },
    {
      "label": "Production Monitoring",
      "to": "/platform/production-monitoring-readiness",
      "permission": false
    },
    {
      "label": "Dependencies",
      "to": "/platform/service-dependencies",
      "permission": false
    }
  ],
  "incident_prevention": [
    {
      "label": "Incident Closure",
      "to": "/platform/commercial-launch-incident-closure",
      "permission": false
    },
    {
      "label": "Prevention Verification",
      "to": "/platform/commercial-launch-prevention-verification",
      "permission": false
    },
    {
      "label": "Runbooks",
      "to": "/platform/runbooks",
      "permission": false
    }
  ],
  "executive_acceptance": [
    {
      "label": "Go/No-Go Register",
      "to": "/platform/commercial-launch-go-no-go-register",
      "permission": false
    },
    {
      "label": "Launch Certificate",
      "to": "/platform/commercial-launch-certificate",
      "permission": false
    },
    {
      "label": "Launch Acceptance",
      "to": "/platform/commercial-launch-acceptance",
      "permission": false
    }
  ]
} as const;
const external={stored_in_application:false,external_records_observable:false,interpretation:'This application prepares steady-state transition requirements but stores and observes no external transition acceptance outcomes. A zero persisted-transition count does not prove that no external transition records exist.'};
export function makeTransitionSnapshot(kind:'blocked'|'waiting'='blocked'){
 const observation=makeObservationSnapshot(kind);
 // Waiting is a synthetic front-end rendering state; it is NOT proof that the source service can reach it with real data.
 const posture=kind==='blocked'?'commercial_launch_steady_state_transition_blocked':'commercial_launch_steady_state_transition_waiting_for_manual_review';
 const status=kind==='blocked'?'blocked_until_additional_growth_observation_ready':'waiting_for_manual_steady_state_transition_acceptance';
 const transition_rows=SST_REQUIREMENTS.map(q=>({code:q.code,domain:q.domain,owner:q.owner,
   source_observation_rows:observation.observation_rows.map(r=>r.code),source_authorization_rows:observation.observation_rows[0]?.source_authorization_rows||[],
   source_observation_posture:observation.posture,required_transition_evidence:[...q.fields],transition_controls:[...q.controls],transition_status:status,
   accepted_external_evidence:[],rejected_external_evidence:[],release_condition:'manual_steady_state_transition_acceptance_required_before_launch_closure'}));
 return {phase:'Platform Commercial Launch Readiness',step:'Step 230 — Commercial Launch Steady-State Transition Board',posture,generated_at:'2026-11-05T14:00:00.000Z',
  summary:{transition_rows_total:8,blocked_until_additional_growth_observation_ready:kind==='blocked'?8:0,waiting_for_manual_steady_state_transition_acceptance:kind==='waiting'?8:0,transition_records_persisted_in_application:0},transition_rows,
  additional_growth_observation_posture:observation.posture,additional_growth_observation_persistence:observation.additional_growth_observation_persistence,
  additional_growth_authorization_posture:observation.additional_growth_authorization_posture,additional_growth_authorization_persistence:observation.additional_growth_authorization_persistence,
  expansion_health_observation_posture:observation.expansion_health_observation_posture,expansion_health_observation_persistence:observation.expansion_health_observation_persistence,
  rollout_expansion_authorization_posture:observation.rollout_expansion_authorization_posture,prevention_verification_posture:observation.prevention_verification_posture,
  incident_closure_posture:observation.incident_closure_posture,incident_triage_posture:observation.incident_triage_posture,
  post_launch_observation_posture:observation.post_launch_observation_posture,command_center_posture:observation.command_center_posture,
  smoke_test_posture:observation.smoke_test_posture,go_no_go_register_posture:observation.go_no_go_register_posture,
  steady_state_transition_persistence:{...external},transition_rules:[...SST_RULES],transition_limitations:[...SST_LIMITATIONS],
  next_best_step:kind==='blocked'?'Resolve or independently confirm the external Additional Growth Observation prerequisite before steady-state transition review starts.':'Record external steady-state transition evidence before operational launch closure.',
  validation_note:'Read-only commercial launch steady-state transition board. No actual external acceptance or closeout performed.'};
}
export type TransitionSnapshot=ReturnType<typeof makeTransitionSnapshot>;
export type TransitionOptions={permissions?:string[];kind?:'blocked'|'waiting';status?:number;urlQuery?:string;expectHeading?:boolean;
 alter?:(s:TransitionSnapshot)=>TransitionSnapshot;onCall?:(method:string,path:string,query:URLSearchParams)=>void;
 respond?:(method:string,path:string,query:URLSearchParams)=>{json:any;status?:number}|undefined};
export async function openTransition(page:Page,opts:TransitionOptions={}){
 targetBaseURL();const permissions=opts.permissions??SST_PERMISSIONS;
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),q=url.searchParams;
  opts.onCall?.(method,path,q);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic session cannot refresh'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'fixture@synthetic.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const override=opts.respond?.(method,path,q);if(override)return fulfillJson(route,override.json,override.status??200);
  if(method==='GET'&&path===SST_PATH){
   if(SST_PERMISSIONS.some(p=>!permissions.includes(p)))return fulfillJson(route,{message:'Forbidden'},403);
   if(q.size)return fulfillJson(route,{message:'Unexpected query'},400);
   if(opts.status&&opts.status>=400)return fulfillJson(route,{message:'Synthetic transition request failure'},opts.status);
   const s=makeTransitionSnapshot(opts.kind);return fulfillJson(route,opts.alter?opts.alter(s):s);
  }
  return fulfillJson(route,{message:'Synthetic route unavailable'},404);
 });
 await page.goto(SST_PATH+(opts.urlQuery?'?'+opts.urlQuery:''));
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Commercial Launch Steady-State Transition',exact:true})).toBeVisible();
}
