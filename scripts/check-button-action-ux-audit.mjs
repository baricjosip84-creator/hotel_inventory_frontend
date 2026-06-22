import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const providerPath = path.join(root, 'src', 'app', 'AppProviders.tsx');
const reportPath = path.join(root, 'docs', 'button-action-ux-audit.md');

const provider = fs.readFileSync(providerPath, 'utf8');
const report = fs.readFileSync(reportPath, 'utf8');

const requiredProviderMarkers = [
  'findClickedActionElement',
  'isDangerousButtonLabel',
  'getLocalActionFeedbackMessage',
  "return 'Action started.'",
  'handleGlobalFormSubmit',
  'navigator.clipboard.writeText',
  'window.print',
  "document.addEventListener('click'",
  "document.addEventListener('submit'",
  'isActionInsideNavigation',
  'data-skip-global-action-feedback',
  'isFormSubmitAction',
  'GLOBAL_DANGEROUS_ACTION_CONFIRM_EVENT'
];

const requiredReportMarkers = [
  'Button and Action UX Audit',
  'Final completion status: complete for the current source tree',
  'Dangerous/destructive actions ask for confirmation',
  'Every non-navigation, non-benign, non-skipped action has fallback feedback',
  'Form submissions outside authentication screens show submit feedback',
  'Navigation/sidebar buttons are skipped'
];

const sourceRoot = path.join(root, 'src');
const actionFileExtensions = new Set(['.tsx', '.ts']);
const ignoredDirs = new Set(['node_modules', 'dist', 'build', '.git']);

function walk(dir, output = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        walk(path.join(dir, entry.name), output);
      }
      continue;
    }

    if (actionFileExtensions.has(path.extname(entry.name))) {
      output.push(path.join(dir, entry.name));
    }
  }

  return output;
}

const actionPatterns = [
  /<button\b/g,
  /<a\b[^>]*\bhref=/g,
  /\brole=["']button["']/g,
  /<input\b[^>]*\btype=["'](?:button|submit|reset)["']/g
];

const sourceFiles = walk(sourceRoot);
const auditedFiles = [];
let actionOccurrenceCount = 0;

for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const count = actionPatterns.reduce((sum, pattern) => {
    const matches = content.match(pattern);
    return sum + (matches ? matches.length : 0);
  }, 0);

  if (count > 0) {
    auditedFiles.push(path.relative(root, file));
    actionOccurrenceCount += count;
  }
}

const missingProvider = requiredProviderMarkers.filter((marker) => !provider.includes(marker));
const missingReport = requiredReportMarkers.filter((marker) => !report.includes(marker));

if (missingProvider.length || missingReport.length || auditedFiles.length === 0 || actionOccurrenceCount === 0) {
  console.error('Button/action UX audit contract failed.');
  if (missingProvider.length) console.error('Missing provider markers:', missingProvider.join(', '));
  if (missingReport.length) console.error('Missing report markers:', missingReport.join(', '));
  if (auditedFiles.length === 0 || actionOccurrenceCount === 0) console.error('No actionable controls were detected by static audit.');
  process.exit(1);
}

console.log(`Button/action UX audit contract passed: ${actionOccurrenceCount} actionable-control occurrences across ${auditedFiles.length} source files.`);
