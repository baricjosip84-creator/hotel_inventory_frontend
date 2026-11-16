// B234 only: historical fixture remains committed unchanged. Apply AFTER its
// checksum/contract verification, before the guarded live probe and case run.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { checkAuthRuntime } from './check-batch-234-auth-runtime.mjs';

export async function applyBatch234AuthRuntime(root) {
  const target = path.join(root, 'support/liveOriginalSafeTest.ts');
  const raw = fs.readFileSync(target, 'utf8');
  const source = raw.replace(/\r\n/g, '\n');
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), 'ea66c552262bd72b1b8c992d5869e503e4ac46c5c42b57458df72288acbff926', 'Unexpected historical auth fixture');
  let patched = source;
  function replaceOnce(before, after) {
    assert.equal(patched.split(before).length, 2, 'Missing or ambiguous auth anchor');
    patched = patched.replace(before, after);
  }
  replaceOnce('    const authenticate = async (): Promise<AuthState> => {', `    class LoginFailure extends Error {
      constructor(message: string, readonly terminal = false) { super(message); }
    }
    const authenticate = async (): Promise<AuthState> => {`);
  replaceOnce(`        await page.goto('/login');
        await page.locator('#login-email').fill(email);
        await page.locator('#login-password').fill(password);
        await page.locator('[data-auth-form="true"] button[type="submit"]').click();
        const dashboard = page.getByRole('heading', { name: 'Operations Dashboard' });`, `        // Record only the numeric status of the approved credential exchange.
        // Never log credentials, request/response bodies, URLs or tokens.
        let loginStatus: number | undefined;
        page.on('response', response => {
          const method = response.request().method().toUpperCase();
          const url = response.url();
          if (approvedLogin(method, url) && /^\\/(?:api\\/)?auth\\/login$/.test(new URL(url).pathname)) {
            loginStatus = response.status();
          }
        });
        await page.goto('/login', { timeout: 20_000 });
        await page.locator('#login-email').fill(email, { timeout: 10_000 });
        await page.locator('#login-password').fill(password, { timeout: 10_000 });
        await page.locator('[data-auth-form="true"] button[type="submit"]').click({ timeout: 15_000 });
        // A pending sign-in (cold backend or slow SPA) is not a failed token.
        // Wait for the actual fresh JWT, not merely a login response or redirect.
        const hasValidToken = async () => {
          try { return !tokenExpiresSoon(await context.storageState()); }
          catch { return false; }
        };
        try {
          await expect.poll(async () => {
            if (loginStatus !== undefined && loginStatus >= 400) return true;
            return await hasValidToken();
          }, { timeout: 45_000, intervals: [250, 500, 1000, 2000] }).toBe(true);
        } catch {
          throw new LoginFailure('Approved login produced no usable tenant JWT within 45s; login HTTP status: ' + (loginStatus ?? 'not observed'));
        }
        if (loginStatus !== undefined && loginStatus >= 400) {
          // Do not repeat rejected credentials or exceed rate limits.
          throw new LoginFailure('Approved login HTTP ' + loginStatus, loginStatus >= 400 && loginStatus < 500 && loginStatus !== 408);
        }
        if (!await hasValidToken()) throw new LoginFailure('Approved login did not establish a usable tenant JWT');
        const dashboard = page.getByRole('heading', { name: 'Operations Dashboard' });`);
  replaceOnce(`          if (tokenExpiresSoon(provisional)) throw firstDashboardError;
          await page.goto('/dashboard');`, `          if (tokenExpiresSoon(provisional)) throw firstDashboardError;
          await page.goto('/dashboard', { timeout: 20_000 });`);
  replaceOnce(`        const state = await context.storageState();
        if (tokenExpiresSoon(state))`, `        const location = new URL(page.url());
        if (location.origin !== FRONTEND_ORIGIN || location.pathname.replace(/\\/$/, '') !== '/dashboard') {
          throw new LoginFailure('Approved login did not land on the protected dashboard');
        }
        const state = await context.storageState();
        if (tokenExpiresSoon(state))`);
  replaceOnce(`        await new Promise(resolve => setTimeout(resolve, 2_000));`, `        if (firstError instanceof LoginFailure && firstError.terminal) throw firstError;
        await new Promise(resolve => setTimeout(resolve, 5_000));`);
  replaceOnce(`  }, { scope: 'worker' }],`, `  }, { scope: 'worker', timeout: 300_000 }],`);
  // Validate the exact transformed source, including network safety, before use.
  await checkAuthRuntime(patched, target);
  fs.writeFileSync(target, patched);
  console.log('PASS B234: delayed JWT bootstrap, bounded retry, terminal HTTP errors, exact protected dashboard, unchanged write guards.');
}
