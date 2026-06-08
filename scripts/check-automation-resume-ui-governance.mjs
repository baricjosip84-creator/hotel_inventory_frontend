import fs from 'node:fs';

const files = [
  'src/pages/AutomationSchedulesPage.tsx',
  'src/components/enterpriseInventory/tabs/AutomationTab.tsx',
  'src/components/enterpriseInventory/EnterpriseInventoryAutomationPanel.tsx',
  'src/components/enterpriseInventory/EnterpriseInventoryAutomationMutations.ts'
];

const sources = Object.fromEntries(files.map((file) => [file, fs.readFileSync(file, 'utf8')]));

const forbiddenTokens = [
  '`/automation-schedules/${schedule.id}/resume`',
  '`/automation-schedules/${id}/resume`',
  'resumeAutomationScheduleMutation',
  'canResumeAutomationSchedules',
  'tryResume(schedule)'
];

for (const [file, source] of Object.entries(sources)) {
  for (const token of forbiddenTokens) {
    if (source.includes(token)) {
      throw new Error(`${file} still exposes blocked automation resume behavior: ${token}`);
    }
  }
}

const requiredTokens = [
  'Resume locked',
  'Resume is intentionally blocked until the automation runner is enabled.',
  'disabledLinkButton'
];

for (const token of requiredTokens) {
  if (!sources['src/pages/AutomationSchedulesPage.tsx'].includes(token) && !sources['src/components/enterpriseInventory/tabs/AutomationTab.tsx'].includes(token)) {
    throw new Error(`Missing automation resume governance token: ${token}`);
  }
}

console.log('Automation resume UI governance check passed.');
