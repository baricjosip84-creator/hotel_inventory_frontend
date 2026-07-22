# Phase 15 — Unified Commercial Frontend Closure

Phase 15 closes the commercial frontend foundation by moving tenant operational navigation, command surfaces, permission visibility, and regression checks into explicit frontend guardrails.

## Closure scope

The phase preserves existing backend contracts and existing tenant routes while adding frontend product cohesion around:

- unified tenant application shell metadata
- centralized navigation and module registry
- commercial command/action surfaces
- role-aware workspace, mobile execution, real-time operations, workflow composer, Intelligence Review, collaboration, digital twin, and reliability command UI foundations
- route-query state normalization for command filters
- tenant/permission visibility signals in the shell
- regression and closure scripts that protect route, registry, page, permission, and shell drift

## Guardrail commands

From `hotel-inventory-frontend`:

```bash
npm run check:commercial-shell
npm run check:phase15-closure
npm run build
```

These guardrails are intentionally frontend-scoped. Backend validation remains separate with the backend `npm run check` command.
