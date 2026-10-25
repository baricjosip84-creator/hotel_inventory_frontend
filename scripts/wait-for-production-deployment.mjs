import fs from 'node:fs';
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function requiredOrigin(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:') throw new Error(`${name} must use HTTPS.`);
  if (parsed.pathname !== '/' && parsed.pathname !== '') {
    throw new Error(`${name} must be an origin without a path.`);
  }
  parsed.pathname = '';
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString().replace(/\/$/, '');
}

function optionalCommit(name) {
  const value = process.env[name]?.trim().toLowerCase() || '';
  if (value && !/^[0-9a-f]{40}$/.test(value)) {
    throw new Error(`${name} must be a full 40-character Git commit SHA when provided.`);
  }
  return value;
}


function resolveExpectedFrontendCommit() {
  const explicitCommit = optionalCommit('EXPECTED_FRONTEND_COMMIT');
  if (explicitCommit) return explicitCommit;

  const eventPath = process.env.GITHUB_EVENT_PATH?.trim();
  if (eventPath) {
    try {
      const eventPayload = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
      const workflowRunCommit = typeof eventPayload?.workflow_run?.head_sha === 'string'
        ? eventPayload.workflow_run.head_sha.trim().toLowerCase()
        : '';
      if (workflowRunCommit) {
        if (!/^[0-9a-f]{40}$/.test(workflowRunCommit)) {
          throw new Error('workflow_run.head_sha must be a full 40-character Git commit SHA when provided.');
        }
        return workflowRunCommit;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Unable to resolve frontend commit from GITHUB_EVENT_PATH: ${message}`);
    }
  }

  return optionalCommit('GITHUB_SHA');
}

async function readJson(url) {
  const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}`, {
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache'
    },
    redirect: 'follow'
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function waitFor(name, check, attempts, delayMs) {
  let lastMessage = 'No response received';
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const result = await check();
      if (result.ready) {
        console.log(`${name} is ready${result.detail ? `: ${result.detail}` : ''}.`);
        return;
      }
      lastMessage = result.detail || 'Deployment is not ready yet';
    } catch (error) {
      lastMessage = error instanceof Error ? error.message : String(error);
    }

    console.log(`${name} not ready (${attempt}/${attempts}): ${lastMessage}`);
    if (attempt < attempts) await sleep(delayMs);
  }

  throw new Error(`${name} did not become ready: ${lastMessage}`);
}

const frontendOrigin = requiredOrigin('DEPLOYMENT_FRONTEND_URL');
const backendOrigin = requiredOrigin('DEPLOYMENT_BACKEND_URL');
const expectedFrontendCommit = resolveExpectedFrontendCommit();
const expectedBackendCommit = optionalCommit('EXPECTED_BACKEND_COMMIT');
const attempts = Number.parseInt(process.env.DEPLOYMENT_WAIT_ATTEMPTS || '90', 10);
const delayMs = Number.parseInt(process.env.DEPLOYMENT_WAIT_DELAY_MS || '20000', 10);

if (!Number.isInteger(attempts) || attempts < 1 || attempts > 180) {
  throw new Error('DEPLOYMENT_WAIT_ATTEMPTS must be an integer between 1 and 180.');
}
if (!Number.isInteger(delayMs) || delayMs < 1000 || delayMs > 60000) {
  throw new Error('DEPLOYMENT_WAIT_DELAY_MS must be an integer between 1000 and 60000.');
}

// FT178: readiness requires release identity AND the HTML actually served at
// /products to reference the exact same compiled entrypoint recorded by Vite.
// A successful HTTP 200, or a correct manifest next to stale HTML, is not
// evidence that the fixed Products bundle was deployed.
const expectedRelease = JSON.parse(fs.readFileSync(new URL('../public/deployment-version.json', import.meta.url), 'utf8'));
await waitFor(
  'Frontend deployment',
  async () => {
    const payload = await readJson(`${frontendOrigin}/deployment-version.json`);
    const actualCommit = typeof payload?.git_commit === 'string' ? payload.git_commit.trim().toLowerCase() : '';
    const identityOk = payload?.frontend === expectedRelease.frontend
      && payload?.audit_round === expectedRelease.audit_round
      && payload?.backend === expectedRelease.backend;
    const commitOk = !expectedFrontendCommit || actualCommit === expectedFrontendCommit;
    const assets = Array.isArray(payload?.entrypoint_assets) ? payload.entrypoint_assets : [];
    if (!identityOk || !commitOk || assets.length === 0) {
      return {
        ready: false,
        detail: `identity ${payload?.frontend || 'missing'}/${payload?.audit_round || 'missing'}, expected ${expectedRelease.frontend}/${expectedRelease.audit_round}; commit ${actualCommit || 'missing'}${expectedFrontendCommit ? `, expected ${expectedFrontendCommit}` : ''}; assets ${assets.length}`
      };
    }
    const response = await fetch(`${frontendOrigin}/products?ft178_build_check=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-cache', Accept: 'text/html' }, redirect: 'follow'
    });
    const html = response.ok ? await response.text() : '';
    const matching = response.ok && assets.some(asset => html.includes(`/${asset}`));
    return {
      ready: Boolean(matching),
      detail: matching
        ? `${payload.frontend}, entrypoint ${assets.join(', ')}, commit ${actualCommit || 'not supplied'}`
        : `Products HTML did not reference expected built entrypoint(s) ${assets.join(', ')} (HTTP ${response.status})`
    };
  },
  attempts,
  delayMs
);

await waitFor(
  'Backend deployment',
  async () => {
    const payload = await readJson(`${backendOrigin}/health/ready`);
    const actualCommit = typeof payload?.deployment?.git_commit === 'string'
      ? payload.deployment.git_commit.trim().toLowerCase()
      : '';
    const readinessOk = payload?.status === 'ready' && payload?.checks?.database === 'ok';
    const commitOk = !expectedBackendCommit || actualCommit === expectedBackendCommit;
    return {
      ready: readinessOk && commitOk,
      detail: expectedBackendCommit
        ? `status ${payload?.status || 'unknown'}, deployed ${actualCommit || 'unknown'}, expected ${expectedBackendCommit}`
        : `status ${payload?.status || 'unknown'}`
    };
  },
  attempts,
  delayMs
);
