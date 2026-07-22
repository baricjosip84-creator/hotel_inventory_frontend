import { tenantModuleRegistry } from './navigationRegistry';

export type CommercialFrontendClosureGuardrail = {
  id: string;
  label: string;
  description: string;
  evidence: string[];
};

export type CommercialFrontendClosureSummary = {
  phase: 'Phase 15';
  status: 'closed';
  title: string;
  moduleCount: number;
  commandSurfaceCount: number;
  guardrails: CommercialFrontendClosureGuardrail[];
};

export const commercialFrontendClosureGuardrails: CommercialFrontendClosureGuardrail[] = [
  {
    id: 'unified-shell',
    label: 'Unified application shell',
    description: 'Tenant routes resolve through a shared commercial shell with centralized page metadata, grouped navigation, and module context.',
    evidence: ['src/layouts/AppLayout.tsx', 'src/app/navigationRegistry.ts']
  },
  {
    id: 'module-registry',
    label: 'Navigation and module registry',
    description: 'Commercial modules are registered once with route, permission, surface, priority, search, and grouping metadata.',
    evidence: ['src/app/navigationRegistry.ts']
  },
  {
    id: 'command-surfaces',
    label: 'Commercial command surfaces',
    description: 'Action center, workspace, mobile execution, operations feed, workflow composer, intelligence review, collaboration, digital twin, and reliability command routes are present and shell-registered.',
    evidence: ['src/app/router.tsx', 'src/pages/*Command*.tsx', 'src/pages/*Workspace*.tsx']
  },
  {
    id: 'state-normalization',
    label: 'Frontend state normalization',
    description: 'Commercial command filters use route query state instead of isolated local-only filter state where introduced in Phase 15.',
    evidence: ['src/lib/useRouteQueryState.ts']
  },
  {
    id: 'tenant-permission-ux',
    label: 'Tenant and permission UX hardening',
    description: 'The shell exposes tenant context and permission-aware module visibility, while hidden modules remain outside visible navigation.',
    evidence: ['src/lib/tenantAccess.ts', 'src/layouts/AppLayout.tsx']
  },
  {
    id: 'regression-checks',
    label: 'Commercial frontend regression checks',
    description: 'Dedicated scripts protect registry, route, page, permission, and closure guardrail drift.',
    evidence: ['scripts/check-commercial-shell-regression.mjs', 'scripts/check-phase15-closure.mjs']
  }
];

export const commercialFrontendClosureSummary: CommercialFrontendClosureSummary = {
  phase: 'Phase 15',
  status: 'closed',
  title: 'Unified Commercial Frontend',
  moduleCount: tenantModuleRegistry.length,
  commandSurfaceCount: tenantModuleRegistry.filter((module) => module.commercialSurface === 'command').length,
  guardrails: commercialFrontendClosureGuardrails
};

export function getCommercialFrontendClosureSummary(): CommercialFrontendClosureSummary {
  return commercialFrontendClosureSummary;
}
