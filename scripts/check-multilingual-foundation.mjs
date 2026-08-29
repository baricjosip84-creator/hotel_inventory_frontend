import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const fail = (message) => { console.error(`MULTILINGUAL FOUNDATION FAIL: ${message}`); process.exitCode = 1; };
const assert = (condition, message) => { if (!condition) fail(message); };

const config = read('src/i18n/config.ts');
const messages = read('src/i18n/messages.ts');
const navigation = read('src/i18n/navigationTranslations.ts');
const provider = read('src/i18n/I18nProvider.tsx');
const selector = read('src/components/i18n/LanguageSelector.tsx');
const main = read('src/main.tsx');
const tenantLayout = read('src/layouts/AppLayout.tsx');
const platformLayout = read('src/layouts/PlatformLayout.tsx');
const tenantLogin = read('src/pages/LoginPage.tsx');
const platformLogin = read('src/pages/PlatformLoginPage.tsx');
const tenantSettings = read('src/pages/TenantSettingsPage.tsx');

const expectedLocales = ['en-GB', 'de-DE', 'es-ES', 'fr-FR', 'hr-HR'];
for (const locale of expectedLocales) assert(config.includes(`'${locale}'`), `missing supported locale ${locale}`);
assert(config.includes("DEFAULT_LOCALE: AppLocale = 'en-GB'"), 'English must remain the hard fallback locale');
assert(config.includes("LOCALE_STORAGE_KEY = 'inventory_locale'"), 'browser locale preference storage key missing');

function catalogKeys(source, variable) {
  const match = source.match(new RegExp(`const ${variable}: [^=]+ = \\{([\\s\\S]*?)\\n\\};`));
  assert(Boolean(match), `catalog ${variable} is missing`);
  if (!match) return [];
  return [...match[1].matchAll(/^\s*['"]([^'"]+)['"]\s*:/gm)].map((entry) => entry[1]);
}

for (const [label, source] of [['message', messages], ['navigation', navigation]]) {
  const catalogs = Object.fromEntries(['enGB', 'deDE', 'esES', 'frFR', 'hrHR'].map((variable) => [variable, catalogKeys(source, variable)]));
  const canonical = new Set(catalogs.enGB);
  assert(canonical.size > 0, `${label} English catalog is empty`);
  for (const [variable, keys] of Object.entries(catalogs)) {
    const set = new Set(keys);
    const missing = [...canonical].filter((key) => !set.has(key));
    const extra = [...set].filter((key) => !canonical.has(key));
    assert(keys.length === set.size, `${label} ${variable} catalog has duplicate keys`);
    assert(missing.length === 0, `${label} ${variable} catalog missing keys: ${missing.join(', ')}`);
    assert(extra.length === 0, `${label} ${variable} catalog has non-canonical keys: ${extra.join(', ')}`);
  }
}

assert(provider.includes('MESSAGE_CATALOGS[DEFAULT_LOCALE][key]'), 'message English fallback is missing');
assert(provider.includes('NAVIGATION_TRANSLATIONS[DEFAULT_LOCALE][englishLabel]'), 'navigation English fallback is missing');
assert(main.includes('<I18nProvider>') && main.includes('</I18nProvider>'), 'application root is not wrapped in I18nProvider');
assert(selector.includes("scope?: 'local' | 'tenant' | 'platform'"), 'language selector does not support all application scopes');
assert(selector.includes("'/auth/preferences/locale'"), 'tenant locale preference persistence is missing');
assert(selector.includes("'/platform/auth/preferences/locale'"), 'Platform locale preference persistence is missing');
assert(tenantLayout.includes("apiRequest<{ effective_locale?: string | null }>('/auth/preferences/locale')"), 'tenant shell does not load effective locale');
assert(platformLayout.includes('fetchCurrentPlatformIdentity()'), 'Platform shell does not load the current Platform locale');
assert(tenantLayout.includes('nav(section.label)') && tenantLayout.includes('nav(item.label)'), 'tenant navigation is not localized');
assert((platformLayout.match(/\{nav\('/g) || []).length >= 80, 'Platform navigation is not comprehensively localized');
assert(tenantLogin.includes('<LanguageSelector scope="local"') && tenantLogin.includes("t('tenantLogin."), 'tenant login is not localized');
assert(platformLogin.includes('<LanguageSelector scope="local"') && platformLogin.includes("t('platformLogin."), 'Platform login is not localized');
assert(tenantSettings.includes('default_locale') && tenantSettings.includes('LOCALE_OPTIONS'), 'tenant default-locale control is missing');

if (!process.exitCode) {
  console.log('Multilingual foundation checker PASS: 5 locales, complete shell catalogs, fallback, selectors, persistence wiring, and tenant default locale verified.');
}
