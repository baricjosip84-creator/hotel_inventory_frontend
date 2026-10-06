import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const operationsFeed = read('src/pages/RealTimeOperationsFeedPage.tsx');
const learningFeedback = read('src/pages/DecisionLearningFeedbackPage.tsx');
const appLayout = read('src/layouts/AppLayout.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');

const checks = [
  ['Operations Feed owns search params setter', operationsFeed.includes('const [searchParams, setSearchParams] = useSearchParams();')],
  ['Operations Feed restores search text from URL', operationsFeed.includes("const requestedSearchText = searchParams.get('search') || '';")],
  ['Operations Feed restores time from URL', operationsFeed.includes("const requestedTimeWindow = searchParams.get('time')?.trim() || '';")],
  ['Operations Feed restores view from URL', operationsFeed.includes("const requestedViewScope = searchParams.get('view')?.trim() || '';")],
  ['Operations Feed uses URL-backed update helper', operationsFeed.includes("const updateFeedControl = (key: 'event_domain' | 'urgency' | 'search' | 'time' | 'view'")],
  ['Operations Feed writes route state with replace', operationsFeed.includes("setSearchParams(next, { replace: true });")],
  ['Work area control writes URL state', operationsFeed.includes("updateFeedControl('event_domain', event.target.value)")],
  ['Urgency control writes URL state', operationsFeed.includes("updateFeedControl('urgency', event.target.value)")],
  ['Search control writes URL state', operationsFeed.includes("updateFeedControl('search', event.target.value, '')")],
  ['Time control writes URL state', operationsFeed.includes("updateFeedControl('time', event.target.value)")],
  ['View control writes URL state', operationsFeed.includes("updateFeedControl('view', event.target.value)")],
  ['Learning Feedback detail has focus target ref', learningFeedback.includes('const evidenceDetailRef = useRef<HTMLDivElement | null>(null);')],
  ['Learning Feedback edit form has focus target ref', learningFeedback.includes('const feedbackFormRef = useRef<HTMLElement | null>(null);')],
  ['Learning Feedback details scroll into view', learningFeedback.includes("evidenceDetailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });")],
  ['Learning Feedback edit form scrolls into view', learningFeedback.includes("feedbackFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });")],
  ['Learning Feedback old page-top scroll workaround removed', !learningFeedback.includes("window.scrollTo({ top: 0, behavior: 'smooth' });")],
  ['Learning Feedback source search uses business wording', learningFeedback.includes("Search recommendations, policies, forecasts, or optimization results")],
  ['Learning Feedback history search uses business wording', learningFeedback.includes("Search source name, business area, status, or result")],
  ['New source search wording is translated', translations.includes('["Search recommendations, policies, forecasts, or optimization results"')],
  ['New history search wording is translated', translations.includes('["Search source name, business area, status, or result"')],
  ['Tenant shell main content cannot shrink under footer', appLayout.includes("flex: '1 0 auto'" )],
  ['Tenant shell desktop keeps footer safety gap', appLayout.includes("padding: '20px 22px 40px'" )],
  ['Tenant shell mobile keeps footer safety gap', appLayout.includes("padding: '14px 12px 32px'" )],
  ['Built-in access role is localized for display', appLayout.includes("visibleAccessRoleLabel") && appLayout.includes("ui('Admin')") && appLayout.includes("ui('Manager')") && appLayout.includes("ui('Staff')")],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed += 1;
}

if (failed) {
  console.error(`\n${failed}/${checks.length} checks failed.`);
  process.exit(1);
}
console.log(`\nPASS ${checks.length}/${checks.length} surgical regression checks.`);
