import process from 'node:process';

function fail(message) {
  console.error(`[vercel-api-base-url] ${message}`);
  process.exit(1);
}

function isVercelBuild() {
  return process.env.VERCEL === '1' || process.env.VERCEL === 'true';
}

function isProbablyProductionBuild() {
  const env = String(process.env.VERCEL_ENV || process.env.NODE_ENV || '').toLowerCase();
  return env === 'production' || env === 'preview' || isVercelBuild();
}

const rawApiBaseUrl = String(process.env.VITE_API_BASE_URL || '').trim();

if (!isProbablyProductionBuild()) {
  console.log('[vercel-api-base-url] OK - non-managed local build may use the Vite /api proxy fallback.');
  process.exit(0);
}

if (!rawApiBaseUrl) {
  fail('VITE_API_BASE_URL is missing. Set it in Vercel to your backend API URL, for example https://<render-backend-host>/api. Without it, login requests cannot reach the backend from the deployed frontend.');
}

if (!/^https:\/\//i.test(rawApiBaseUrl)) {
  fail(`VITE_API_BASE_URL must be an https:// URL in deployed builds. Current value: ${rawApiBaseUrl}`);
}

if (!/\/api\/?$/i.test(rawApiBaseUrl)) {
  fail(`VITE_API_BASE_URL must point to the backend /api base path. Current value: ${rawApiBaseUrl}`);
}

console.log(`[vercel-api-base-url] OK - deployed frontend will call ${rawApiBaseUrl.replace(/\/$/, '')}.`);
