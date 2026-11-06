# LIVE VERCEL (READ-ONLY) — Batch 186

**Purpose:** Start browser validation using the user's existing Vercel deployment and existing GitHub Actions setup, WITHOUT running mutation tests on live tenant data.

**Target:** `https://hotel-inventory-frontend-mauve.vercel.app` (previously identified Vercel address; check it matches the current deployed Inventory frontend before running).

## Installation in existing GitHub Playwright repository

1. Add the entire **`playwright-inventory/`** folder from this FULL ZIP to the root of the existing private GitHub Playwright test repository (retaining its folder name).
2. Add **`.github/workflows/inventory-live-readonly.yml`** from this ZIP at that exact repository-root path. Do not delete the existing `.github/workflows/main.yml`.
3. Commit/upload these files to the branch used by GitHub Actions.
4. In GitHub open **Actions → Inventory - live Vercel read-only checks → Run workflow**.
5. Enter `READONLY` and run. Check the job log for `6 tests` and PASS/FAIL. Failure evidence uploads as an artifact.

**If the existing repo already has `playwright-inventory/` or a different root layout, merge rather than deleting previous work.** Workflow assumes `playwright-inventory/package.json` exists at repo root; adjust `defaults.run.working-directory` only if the user's repository layout is different.

## Safety boundaries

- This GitHub workflow runs **only six specially guarded public login-screen smoke tests** (`playwright-inventory/live-readonly/login.smoke.spec.ts`), not the 9,900 generated tests.
- All outgoing browser HTTP methods other than GET, HEAD, OPTIONS are blocked BEFORE they reach any server. Any attempted mutation causes a FAIL.
- No credentials, secret values or customer data are required. These checks cannot verify authenticated workflows, backend permissions, inventory writes, persistence, tenant isolation or all 9,900 tests.
- The original `playwright.config.ts`, `support/environment.ts`, all 152 existing page specs and all original 9,900 authored scenarios remain unchanged. Original production protections remain active.
- The Vercel target is an EXACT origin allowlist in `playwright.live-readonly.config.ts`, with explicit `PW_LIVE_READONLY=YES` approval. Changing the URL or selecting any other config without review is not supported.
- Later authenticated GET-only coverage and any write/delete test requires a new explicit safety review and separate approval. This package does NOT authorize full 9,900 live test execution.

### Local discovery (optional; does NOT open the website)

From `playwright-inventory/` after installing npm dependencies:

```powershell
$env:PW_LIVE_READONLY='YES'
npm run test:live-readonly:list
```

To run the six guarded tests locally, first ensure the domain above is correct, then use `npm run test:live-readonly`; the GitHub Actions workflow is the intended default.
