import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const worker = fs.readFileSync(new URL('../public/service-worker.js', import.meta.url), 'utf8');
const registrations = new Map();
const cacheEntries = new Map();
let networkCount = 0;
let online = true;
let oldCacheDeleted = false;
const origin = 'https://inventory.example.test';
const oldName = 'inventory-operations-shell-v1';
const currentName = 'inventory-operations-shell-v4';
const keyOf = (request) => typeof request === 'string' ? request : request.url;
const responseOf = (value) => ({
  ok: true,
  type: 'basic',
  body: value,
  clone() { return responseOf(value); },
});
const cache = (name) => ({
  async addAll(paths) { for (const path of paths) cacheEntries.get(name).set(path, responseOf('initial')); },
  async put(key, value) { cacheEntries.get(name).set(keyOf(key), value); },
});
cacheEntries.set(oldName, new Map([['/index.html', responseOf('OLD HTML')]]));
const caches = {
  async open(name) { if (!cacheEntries.has(name)) cacheEntries.set(name, new Map()); return cache(name); },
  async keys() { return [...cacheEntries.keys()]; },
  async delete(name) { if (name === oldName) oldCacheDeleted = true; return cacheEntries.delete(name); },
  async match(key) {
    for (const entries of cacheEntries.values()) {
      const match = entries.get(keyOf(key));
      if (match) return match;
    }
    return undefined;
  },
};
const context = vm.createContext({
  caches,
  self: {
    location: { origin },
    clients: { claim() {} },
    skipWaiting() {},
    addEventListener(kind, handler) { registrations.set(kind, handler); },
  },
  URL,
  Response: { error() { return { ok: false, body: 'offline' }; } },
  fetch: async (request) => {
    networkCount++;
    if (!online) throw new Error('offline');
    return responseOf(`NETWORK ${networkCount}: ${keyOf(request)}`);
  },
});
vm.runInContext(worker, context, { filename: 'service-worker.js' });
const flush = async (event) => {
  await Promise.all(event.later);
};
const execute = async (kind, request) => {
  const event = {
    request,
    later: [],
    waitUntil(promise) { this.later.push(Promise.resolve(promise)); },
    respondWith(promise) { this.response = Promise.resolve(promise); },
  };
  registrations.get(kind)(event);
  if (event.response) {
    const result = await event.response;
    await flush(event);
    return result;
  }
  await flush(event);
  return undefined;
};
const req = (path, mode = 'same-origin', method = 'GET') => ({ url: origin + path, mode, method });

await execute('install');
await execute('activate');
assert.equal(oldCacheDeleted, true, 'old cache removed on update');
assert.equal(cacheEntries.has(currentName), true);
console.log('PASS 1: old application cache cleared on worker activation');

let one = await execute('fetch', req('/dashboard', 'navigate'));
let two = await execute('fetch', req('/dashboard', 'navigate'));
assert.notEqual(one.body, two.body, 'online navigation should revalidate');
console.log('PASS 2: navigation is network-first');

one = await execute('fetch', req('/index.html'));
two = await execute('fetch', req('/index.html'));
assert.notEqual(one.body, two.body, 'index.html cannot stay cache-first');
console.log('PASS 3: direct shell requests are network-first');

one = await execute('fetch', req('/assets/app-fingerprint.js'));
two = await execute('fetch', req('/assets/app-fingerprint.js'));
assert.notEqual(one.body, two.body, 'online fingerprinted assets must revalidate before offline cache');
console.log('PASS 4: fingerprinted assets are network-first with offline fallback');

const beforeIdentity = networkCount;
assert.equal(await execute('fetch', req('/deployment-version.json')), undefined);
assert.equal(await execute('fetch', req('/service-worker.js')), undefined);
assert.equal(networkCount, beforeIdentity);
console.log('PASS 5: build identity and worker script bypass worker caching');

const beforeApi = networkCount;
assert.equal(await execute('fetch', req('/api/dashboard/recent-activity')), undefined);
assert.equal(await execute('fetch', req('/dashboard', 'same-origin', 'POST')), undefined);
assert.equal(networkCount, beforeApi);
console.log('PASS 6: API and mutations are never cached or intercepted');

online = false;
assert.equal((await execute('fetch', req('/dashboard', 'navigate'))).body.startsWith('NETWORK'), true);
assert.equal((await execute('fetch', req('/index.html'))).body.startsWith('NETWORK'), true);
console.log('PASS 7: offline navigation and shell fallback retained');

const offlineMissing = await execute('fetch', req('/no-such-file'));
assert.equal(offlineMissing.ok, false);
console.log('PASS 8: missing offline files fail without fabricating data');
const main = fs.readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
assert.match(main, /serviceWorker\.register\('\/service-worker\.js',\s*\{\s*updateViaCache:\s*'none'\s*\}\)/);
console.log('PASS 9: registration always checks the actual worker script');

const vercel = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const workerHeaders = vercel.headers.find((row) => row.source === '/service-worker.js');
assert(workerHeaders?.headers.some((header) => header.key.toLowerCase() === 'cache-control' && header.value.includes('no-store')));
console.log('PASS 10: Vercel explicitly avoids caching the worker script');
console.log('FT113 cache update verification: 10/10 PASS');
