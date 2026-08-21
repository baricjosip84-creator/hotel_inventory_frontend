import fs from 'node:fs';

const page = fs.readFileSync(new URL('../src/pages/PlatformProvisioningPage.tsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/pages/PlatformProvisioningPage.css', import.meta.url), 'utf8');
const router = fs.readFileSync(new URL('../src/app/router.tsx', import.meta.url), 'utf8');
const layout = fs.readFileSync(new URL('../src/layouts/PlatformLayout.tsx', import.meta.url), 'utf8');
const lifecycle = fs.readFileSync(new URL('../src/pages/PlatformTenantLifecyclePage.tsx', import.meta.url), 'utf8');
const hardening = fs.readFileSync(new URL('../src/pages/PlatformTenantProvisioningHardeningPage.tsx', import.meta.url), 'utf8');

const checks = [
  ['Operational Workspace hero/stats', page.includes('OperationalWorkspaceHero') && page.includes('OperationalWorkspaceStats') && page.includes('OperationalSectionHeader')],
  ['Platform red identity', css.includes('#d14343') && css.includes('#b93636')],
  ['preset read boundary', page.includes('PLATFORM_PROVISIONING_PRESETS_READ') && page.includes('Preset read boundary enforced')],
  ['URL-backed tenant/preset selection', page.includes('useSearchParams') && page.includes("'tenant_id' | 'preset'") && page.includes("next.set('preset'" )],
  ['stale snapshot preservation', page.includes('Showing the last successful snapshot.') && page.includes('Boolean(previewQuery.data)')],
  ['atomic creation truth', page.includes('commit in one database transaction') && page.includes('Any failure rolls the whole creation back')],
  ['storage-only truth boundary', page.includes('Storage-only application') && page.includes('preset/version/provisioned-at metadata will not be rewritten')],
  ['lifecycle block visible', page.includes('Offboarding and archived tenants cannot be provisioned') && page.includes('preview.lifecycle_blocked')],
  ['no-op apply disabled', page.includes('Select at least one provisioning change') && page.includes('noApplyChanges')],
  ['preview recheck truth', page.includes('backend locks and re-reads') && page.includes('Preview rechecks') === false],
  ['external outcome truth boundary', page.includes('does not prove customer onboarding') && page.includes('physical location existence')],
  ['permission-aware supporting links', page.includes('canReadAudit ? <Link') && page.includes('canReadPresetManagement ? <Link')],
  ['router requires tenant + preset reads', router.includes("path: 'provisioning'") && router.includes('requiredPermissions={[PLATFORM_PERMISSIONS.TENANTS_READ, PLATFORM_PERMISSIONS.PLATFORM_PROVISIONING_PRESETS_READ]}')],
  ['sidebar requires tenant + preset reads', layout.includes('to="/platform/provisioning"') && layout.includes('PLATFORM_PERMISSIONS.TENANTS_READ) && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_PROVISIONING_PRESETS_READ')],
  ['lifecycle supporting link permission-aware', lifecycle.includes('PLATFORM_PROVISIONING_PRESETS_READ') && lifecycle.includes('<Link to="/platform/provisioning">Provisioning</Link>')],
  ['hardening supporting link permission-aware', hardening.includes('canReadProvisioningPresets') && hardening.includes('Open provisioning')]
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('Platform Provisioning page hardening check failed:');
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}
console.log(`Platform Provisioning page hardening: PASS (${checks.length}/${checks.length})`);
