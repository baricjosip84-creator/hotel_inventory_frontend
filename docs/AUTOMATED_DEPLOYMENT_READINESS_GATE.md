# Automated Deployment Readiness Gate

This gate validates the deployed Vercel frontend and Render backend together. It is intentionally separate from source CI: static checks can prove that code builds, but they cannot prove that the deployed URLs, database, CORS policy, refresh cookies, CSRF lifecycle, or browser pages are working.

## Canonical files

- `.github/workflows/deployment-readiness.yml`
- `playwright.deployment.config.ts`
- `tests/deployment/deployment-readiness.spec.ts`
- `scripts/check-deployment-readiness-gate.mjs`

The GitHub workflow is manual-only and uses a selected **GitHub Environment**. This prevents a normal source push from repeatedly logging in to production or staging.

## GitHub Environment configuration

Create a `staging` Environment first. Add a separate `production` Environment only after the staging run passes.

Environment variables:

- `DEPLOYMENT_FRONTEND_URL` — deployed frontend origin, without `/api`.
- `DEPLOYMENT_BACKEND_URL` — deployed backend origin, without `/api`.
- `DEPLOYMENT_REQUIRE_DECISION_INTELLIGENCE` — normally `true`; verifies the three corrected Decision Intelligence pages and their summary API.
- `DEPLOYMENT_REQUIRE_PLATFORM_AUTH` — set `true` only after a dedicated platform smoke account is configured.

Environment secrets:

- `E2E_EMAIL`
- `E2E_PASSWORD`
- `E2E_PLATFORM_EMAIL` — optional unless platform auth is required.
- `E2E_PLATFORM_PASSWORD` — optional unless platform auth is required.
- `E2E_PLATFORM_MFA_CODE` — optional, used only when the dedicated platform smoke account requires MFA.

Use dedicated non-human smoke accounts. Give the tenant smoke account only the permissions needed for dashboard and Decision Intelligence read checks. Do not use a customer employee account.

## What the gate validates

The gate performs read-only operational checks plus authentication lifecycle cleanup:

- frontend HTML and security headers;
- backend liveness and database-backed readiness;
- exact frontend-origin CORS preflight;
- rejection of unauthenticated protected API access;
- tenant login, session listing, dashboard read, and optional Decision Intelligence read;
- HttpOnly/Secure refresh-cookie contract and absence of refresh tokens in JSON;
- CSRF-protected refresh and logout;
- browser login and critical-page rendering;
- no backend 5xx responses, browser runtime errors, failed-fetch states, or horizontal overflow on the corrected Decision Intelligence pages;
- optional platform login, identity read, and deployment-validation read.

It does not create products, change stock, receive shipments, alter tenant settings, or run destructive cross-tenant probes. Those mutation and isolation guarantees remain covered by the source regression suites and controlled staging workflow fixtures.

## Running the gate

In GitHub, open **Actions → Deployment Readiness Gate → Run workflow**, select the configured Environment, and run it. A successful run uploads a 30-day evidence artifact containing the HTML report and JSON result.

A failed run is a release blocker. Fix the deployed configuration or code, redeploy, and run the gate again. Do not bypass a readiness failure by changing expected status codes or disabling a required check.

## Local command

The same gate can run from a trusted shell:

```bash
DEPLOYMENT_FRONTEND_URL=https://app.example.com \
DEPLOYMENT_BACKEND_URL=https://api.example.com \
E2E_EMAIL=smoke@example.com \
E2E_PASSWORD='use-a-secret-store' \
npm run test:deployment-readiness
```

Local HTTP is rejected by default. `ALLOW_HTTP_DEPLOYMENT_SMOKE=true` exists only for reviewed local or isolated staging exceptions.
