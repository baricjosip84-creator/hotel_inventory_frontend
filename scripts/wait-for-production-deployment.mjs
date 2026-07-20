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
const expectedFrontendCommit = optionalCommit('EXPECTED_FRONTEND_COMMIT');
const expectedBackendCommit = optionalCommit('EXPECTED_BACKEND_COMMIT');
const attempts = Number.parseInt(process.env.DEPLOYMENT_WAIT_ATTEMPTS || '90', 10);
const delayMs = Number.parseInt(process.env.DEPLOYMENT_WAIT_DELAY_MS || '20000', 10);

if (!Number.isInteger(attempts) || attempts < 1 || attempts > 180) {
  throw new Error('DEPLOYMENT_WAIT_ATTEMPTS must be an integer between 1 and 180.');
}
if (!Number.isInteger(delayMs) || delayMs < 1000 || delayMs > 60000) {
  throw new Error('DEPLOYMENT_WAIT_DELAY_MS must be an integer between 1000 and 60000.');
}

await waitFor(
  'Frontend deployment',
  async () => {
    if (!expectedFrontendCommit) {
      const response = await fetch(frontendOrigin, { redirect: 'follow' });
      return {
        ready: response.ok,
        detail: response.ok ? `HTTP ${response.status}` : `HTTP ${response.status}`
      };
    }

    const payload = await readJson(`${frontendOrigin}/deployment-version.json`);
    const actualCommit = typeof payload?.git_commit === 'string' ? payload.git_commit.trim().toLowerCase() : '';
    return {
      ready: actualCommit === expectedFrontendCommit,
      detail: actualCommit
        ? `deployed ${actualCommit}, expected ${expectedFrontendCommit}`
        : 'deployment-version.json does not contain git_commit'
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
