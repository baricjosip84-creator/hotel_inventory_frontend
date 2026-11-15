import fs from 'node:fs';
import { test } from '../support/liveOriginalSafeTest';
import { loginAsTenant } from '../support/tenantSession';

test('Batch 233 guarded page access probe', async ({ page }) => {
  const report = 'batch-233-live-access.json';
  const initial = JSON.parse(fs.readFileSync(report, 'utf8'));
  if (initial.status !== 'AUTH_NOT_VERIFIED' || initial.blocked.length !== 500) throw new Error('B233 probe report not initialized');
  // Identical guarded worker login and token-aware recovery as already used by
  // the reviewed original scenarios, including the Batch 232 recheck.
  await loginAsTenant(page);
  const access: Record<string, string> = {};
  for (const [key, marker] of Object.entries(initial.pages as Record<string, {heading?:string;text?:string}>)) {
    try {
      await page.goto('/'+key, { timeout:25_000 });
      const locator = marker.heading ? page.getByRole('heading', {name:marker.heading, exact:true}) : page.getByText(marker.text!, {exact:true});
      await locator.first().waitFor({state:'visible',timeout:12_000});
      const actual = new URL(page.url());
      if(actual.origin !== 'https://hotel-inventory-frontend-mauve.vercel.app' || actual.pathname !== '/'+key) throw new Error('Unexpected route');
      access[key] = 'ACCESS_CONFIRMED';
    } catch {
      access[key] = 'ACCESS_UNVERIFIED';
    }
    console.log(`B233 page /${key}: ${access[key]}`);
  }
  fs.writeFileSync(report, JSON.stringify({...initial,status:'PROBED',access},null,2)+'\n');
});
