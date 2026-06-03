# Phase 17 Step 577 — Frontend Performance Budget Foundation

This step adds a commercial frontend performance governance layer without changing tenant or platform routes.

## Scope

The current commercial frontend has broad route coverage and many enterprise command pages. Step 577 keeps those surfaces intact while adding explicit build-time performance controls:

- deterministic Vite vendor chunk grouping for React, router, React Query, scanner, and shared vendor code;
- a documented bundle warning budget;
- production sourcemap suppression by default;
- compressed-size reporting for release visibility;
- a guardrail script that verifies the budget controls remain wired into the frontend build.

## Operational intent

This is a foundation, not a full code-splitting rewrite. Later scalability steps can safely introduce route-level lazy loading after route coverage tests are expanded. This step first prevents ungoverned bundle growth and makes frontend release artifacts more predictable.

## Required guardrail

Run from `hotel-inventory-frontend`:

```bash
npm run check:frontend-performance-budget
```

The guardrail verifies:

- `vite.config.ts` declares `chunkSizeWarningLimit`;
- compressed-size reporting is enabled;
- sourcemaps are disabled for production builds;
- manual chunk grouping exists;
- named chunks exist for React, router, query, scanner, and shared vendor code;
- `package.json` exposes the check script.
