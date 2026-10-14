#!/usr/bin/env node
// Fail closed only for actual hosted Vercel preview/production builds (or an
// explicitly requested deployment validation). CI/local static builds may use
// /api without claiming the resulting bundle is a deployed, working API client.
const environment = String(process.env.VERCEL_ENV || '').toLowerCase();
const requiresPublicApi = ['production', 'preview'].includes(environment)
  || process.env.INVENTORY_REQUIRE_EXTERNAL_API_URL === '1';

if (!requiresPublicApi) {
  console.log('API deployment configuration: local/CI build, hosted API check deferred.');
  process.exit(0);
}

const raw = String(process.env.VITE_API_BASE_URL || '').trim();
let url;
try { url = new URL(raw); } catch { /* handled below */ }
const valid = Boolean(
  url && url.protocol === 'https:' && url.hostname &&
  !['localhost','127.0.0.1','0.0.0.0'].includes(url.hostname.toLowerCase()) &&
  !/[<>]/.test(raw) && !url.username && !url.password && !url.search && !url.hash &&
  /\/api\/?$/.test(url.pathname)
);
if (!valid) {
  console.error('[inventory deployment] BLOCKED: VITE_API_BASE_URL is missing or invalid for a hosted build.');
  console.error('In Vercel > Project > Settings > Environment Variables set VITE_API_BASE_URL');
  console.error('to your real Render HTTPS API endpoint, for example https://YOUR-BACKEND.onrender.com/api.');
  console.error('Enable the variable for the Production/Preview environment and redeploy.');
  process.exit(1);
}
console.log(`[inventory deployment] API endpoint verified: ${url.origin}${url.pathname}`);
