# Automated Deployment Readiness Gate

This gate validates the deployed Vercel frontend and Render backend together. Source CI proves that code installs, builds, and passes static tests; this runtime gate proves that the deployed URLs, database, CORS policy, authentication lifecycle, and browser pages actually work.

## Automatic behavior

The production gate now runs automatically in both release paths:

1. **Frontend release:** after **Frontend Validation** succeeds on `main`, the workflow waits until Vercel serves the exact triggering commit from `/deployment-version.json`, then runs the complete gate.
2. **Backend release:** after backend **Phase 16 Production Validation** succeeds on `main`, the backend workflow waits until Render reports the exact `RENDER_GIT_COMMIT` from `/health/ready`, then dispatches this frontend gate with that backend commit.

The manual **Run workflow** option remains available as a fallback. Normal production pushes no longer require a manual click.

Repository-wide lint is now clean and runs as a blocking step inside **Frontend Validation** on every push and pull request. A lint failure prevents deployment readiness from starting until the source issue is corrected.

## Canonical files

- `.github/workflows/deployment-readiness.yml`
- `playwright.deployment.config.ts`
- `tests/deployment/deployment-readiness.spec.ts`
- `vite.config.ts` (build-time deployment version plugin)
- `scripts/wait-for-production-deployment.mjs`
- `scripts/check-deployment-readiness-gate.mjs`

## GitHub Environment configuration

The automatic workflow uses the existing `production` **GitHub Environment** in the frontend repository.

Environment variables:

- `DEPLOYMENT_FRONTEND_URL` — deployed frontend origin, without `/api`.
- `DEPLOYMENT_BACKEND_URL` — deployed backend origin, without `/api`.
- `DEPLOYMENT_REQUIRE_DECISION_INTELLIGENCE` — normally `true`.
- `DEPLOYMENT_REQUIRE_PLATFORM_AUTH` — set `true` only after dedicated platform credentials exist.

Environment secrets:

- `E2E_EMAIL`
- `E2E_PASSWORD`
- `E2E_PLATFORM_EMAIL` — optional unless platform auth is required.
- `E2E_PLATFORM_PASSWORD` — optional unless platform auth is required.
- `E2E_PLATFORM_MFA_CODE` — optional.

Use dedicated non-human smoke accounts. Do not use a customer employee account.

## Backend-to-frontend trigger setup

The backend repository requires one Actions variable and one Actions secret:

- `DEPLOYMENT_BACKEND_URL` — the Render backend origin.
- `FRONTEND_READINESS_DISPATCH_TOKEN` — a fine-grained GitHub personal access token restricted to the frontend repository with **Actions: Read and write** permission.

The backend sends only the expected backend commit SHA to `deployment-readiness.yml`. Smoke-account credentials stay only in the frontend repository's `production` Environment.

## Deployment identity

Vercel exposes `VERCEL_GIT_COMMIT_SHA` during builds. The frontend writes that value to `/deployment-version.json` with `Cache-Control: no-store` so the workflow can wait for the exact commit instead of accidentally testing the previous deployment.

Render exposes `RENDER_GIT_COMMIT` at runtime. The backend includes it in `/health/live` and `/health/ready`, allowing the same exact-commit check for backend releases.

## What the gate validates

The gate performs read-only operational checks plus authentication lifecycle cleanup:

- frontend HTML, deployment identity, and security headers;
- backend liveness, database-backed readiness, and deployment identity;
- exact frontend-origin CORS preflight;
- rejection of unauthenticated protected API access;
- tenant login, session listing, dashboard read, and optional Decision Intelligence read;
- HttpOnly/Secure refresh-cookie contract and absence of refresh tokens in JSON;
- CSRF-protected refresh and logout;
- browser login and critical-page rendering;
- no backend 5xx responses, browser runtime errors, failed-fetch states, or horizontal overflow;
- optional platform login, identity read, and deployment-validation read.

It does not create products, change stock, receive shipments, alter tenant settings, or run destructive probes.

## Manual fallback

Open **Actions → Deployment Readiness Gate → Run workflow**, select `production`, leave `expected_backend_commit` blank, and run it. A successful run uploads a 30-day HTML/JSON evidence artifact.
