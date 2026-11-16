import { request } from 'node:http';
import type { BrowserContext } from '@playwright/test';

type State = Awaited<ReturnType<BrowserContext['storageState']>>;
type Snapshot = { snapshot: State; lastLoginAt: number };
export async function exchangeB235Session(value?: Snapshot): Promise<Snapshot | null> {
  if (process.env.PW_ORIGINAL_SUITE_GROUP !== 'BULK_SAFE_16') throw Error('Wrong session group');
  const socketPath = process.env.PW_B235_SESSION_SOCKET;
  if (!socketPath) throw Error('Missing private B235 session broker');
  const body = value === undefined ? undefined : JSON.stringify(value);
  return new Promise((resolve, reject) => {
    const req = request({ socketPath, path: '/session', method: body === undefined ? 'GET' : 'PUT',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, res => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { raw += chunk; if (raw.length > 512_000) req.destroy(); });
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(Error('Private session exchange rejected'));
        try { resolve(JSON.parse(raw)); } catch { reject(Error('Invalid private session response')); }
      });
    });
    req.on('error', () => reject(Error('Private session exchange unavailable')));
    req.setTimeout(5000, () => req.destroy());
    req.end(body);
  });
}
