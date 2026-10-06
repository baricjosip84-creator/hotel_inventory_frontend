import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const page = read('src/pages/ProbabilisticForecastingPage.tsx');
const css = read('src/pages/ProbabilisticForecastingPage.css');
const translations = read('src/i18n/tenantUiTranslations.ts');

const checks = [
  ['PF-UX-002 missing risk explanations get an explicit safe fallback', page.includes('function riskExplanation(') && page.includes('No explanation was stored for this high-risk estimate.') && page.includes('<td>{riskExplanation(risk, ui)}</td>')],
  ['PF-UX-003 lifecycle review sections are collapsed by default', page.includes('<details className="card forecast-lifecycle">') && page.includes('Open review details') && !page.includes('<section className="card forecast-lifecycle">')],
  ['PF-UX-003 business review summary is shown before detailed lifecycle checks', page.includes("ui('Forecast review summary')") && page.includes('Each lifecycle section is collapsed by default')],
  ['PF-UX-004 capture-rate absence explains insufficient evidence', page.includes("missingLabel: 'Insufficient validated outcomes'") && page.includes('missingLabel={metric.missingLabel}')],
  ['PF-UX-004 actual-outcome unknown fields say not yet assessed', page.includes('formatAssessmentBoolean(observation.interval_captured_actual, ui)') && page.includes('formatAssessmentPercentage(observation.calibration_score, locale, ui)')],
  ['PF-UX-005 uncertainty range uses named Lower / Expected / Upper columns', page.includes("headers={['Model', 'Lower', 'Expected', 'Upper', 'Unit'") && page.includes("intervalValue(interval, 'lower')") && page.includes("intervalValue(interval, 'expected')") && page.includes("intervalValue(interval, 'upper')")],
  ['PF-UX-006 General method has a human-readable explanation', page.includes("ui('General forecast method')") && page.includes("ui('Default forecast method; no specialized uncertainty method is recorded for this model.')")],
  ['Collapsed lifecycle summary has accessible focus styling', css.includes('.forecast-lifecycle__summary:focus-visible') && css.includes('details.forecast-lifecycle[open]')],
  ['New forecasting clarity strings are translated', translations.includes('["Forecast review summary"') && translations.includes('["Insufficient validated outcomes"') && translations.includes('["General forecast method"') && translations.includes('["Open review details"')]
];

let failed = 0;
for (const [label, ok] of checks) {
  if (ok) console.log(`PASS: ${label}`);
  else { console.error(`FAIL: ${label}`); failed += 1; }
}
if (failed) {
  console.error(`\n${failed}/${checks.length} checks failed.`);
  process.exit(1);
}
console.log(`\nPASS: ${checks.length}/${checks.length} probabilistic forecasting clarity checks.`);
