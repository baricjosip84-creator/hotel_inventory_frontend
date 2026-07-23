import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const pages = [
  'src/pages/DecisionLearningFeedbackPage.tsx',
  'src/pages/ProbabilisticForecastingPage.tsx',
  'src/pages/CrossDomainOptimizationPage.tsx'
];
const stylePath = 'src/pages/decisionIntelligencePages.css';
const allowedClasses = new Set([
  'decision-intelligence-page',
  'button', 'button--secondary',
  'card', 'card--danger', 'card__header', 'card__label', 'card__subtext', 'card__value',
  'data-table', 'eyebrow', 'form-label', 'input', 'page-header', 'page-subtitle',
  'learning-feedback-advanced', 'learning-feedback-advanced__body', 'learning-feedback-read-only',
  'learning-feedback-view-switch', 'learning-feedback-view-switch__button',
  'stat-card', 'stat-card__label', 'stat-card__value', 'table', 'table-wrap',
  'bg-amber-50', 'bg-red-50', 'bg-red-700', 'bg-slate-100', 'bg-slate-200', 'bg-slate-50', 'bg-slate-900', 'bg-white',
  'border', 'border-amber-200', 'border-red-200', 'border-slate-100', 'border-slate-200', 'border-slate-300',
  'disabled:bg-red-300', 'disabled:bg-slate-400', 'disabled:cursor-not-allowed',
  'flex', 'flex-col', 'focus:border-slate-500', 'focus:outline-none', 'focus:ring-2', 'focus:ring-slate-200',
  'font-bold', 'font-medium', 'font-semibold', 'gap-2', 'gap-3', 'gap-4', 'grid', 'hover:bg-slate-50',
  'items-start', 'justify-between',
  'lg:flex-row', 'lg:grid-cols-2', 'lg:grid-cols-3', 'lg:items-start', 'lg:justify-between',
  'max-w-4xl',
  'md:flex-row', 'md:grid-cols-2', 'md:grid-cols-3', 'md:grid-cols-4', 'md:items-start', 'md:justify-between',
  'mt-1', 'mt-2', 'mt-3', 'mt-4', 'mt-5',
  'p-3', 'p-4', 'p-5', 'p-6', 'px-2', 'px-3', 'px-4', 'py-1', 'py-2', 'py-3',
  'rounded-full', 'rounded-lg', 'rounded-xl', 'shadow-sm',
  'space-y-1', 'space-y-3', 'space-y-6',
  'text-2xl', 'text-3xl', 'text-amber-800', 'text-lg', 'text-red-700', 'text-right',
  'text-slate-500', 'text-slate-600', 'text-slate-700', 'text-slate-800', 'text-slate-900', 'text-slate-950',
  'text-sm', 'text-white', 'text-xl', 'text-xs', 'tracking-wide', 'uppercase', 'w-full',
  'xl:grid-cols-3', 'xl:grid-cols-4'
]);

const fail = (message) => {
  console.error(`Decision Intelligence layout check failed: ${message}`);
  process.exit(1);
};

const styles = fs.readFileSync(path.join(root, stylePath), 'utf8');
if (!styles.includes('.decision-intelligence-page')) {
  fail(`${stylePath} must define the scoped page root.`);
}
if (!styles.includes('@media (min-width: 768px)') || !styles.includes('@media (max-width: 767px)')) {
  fail(`${stylePath} must preserve desktop and mobile responsive rules.`);
}

for (const relativePath of pages) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  if (!source.includes("import './decisionIntelligencePages.css';")) {
    fail(`${relativePath} must import the shared Decision Intelligence styles.`);
  }
  if (!source.includes('className="decision-intelligence-page"')) {
    fail(`${relativePath} must use the scoped Decision Intelligence page root.`);
  }
  if (source.includes('className="page-shell"')) {
    fail(`${relativePath} must not reuse the application shell class inside AppLayout.`);
  }

  const classValues = [...source.matchAll(/className="([^"]+)"/g)].map((match) => match[1]);
  const unsupported = [...new Set(classValues.flatMap((value) => value.split(/\s+/)).filter((token) => token && !allowedClasses.has(token)))];
  if (unsupported.length) {
    fail(`${relativePath} contains unstyled class tokens: ${unsupported.join(', ')}`);
  }
}

console.log('Decision Intelligence layout static check passed');
