import fs from 'node:fs';

const pagePath = 'src/pages/AutomationSchedulesPage.tsx';
const page = fs.readFileSync(pagePath, 'utf8');

const requiredTokens = [
  'const canResumeAutomationSchedules = capabilities.canResumeAutomationSchedules;',
  'const resumeSchedule = async (schedule: AutomationSchedule) => {',
  '`/automation-schedules/${schedule.id}/resume`',
  "method: 'POST'",
  "schedule.status === 'draft' || schedule.status === 'paused'",
  'canResumeAutomationSchedules',
  '>Activate</button>'
];

for (const token of requiredTokens) {
  if (!page.includes(token)) {
    throw new Error(`Automation resume UI governance is missing required controlled-resume token: ${token}`);
  }
}

const forbiddenTokens = [
  'resumeSchedule(schedule); // bypass permission',
  'disabled={false}',
  'automation_schedules.resume"'
];
for (const token of forbiddenTokens) {
  if (page.includes(token)) {
    throw new Error(`Automation resume UI governance found an unsafe token: ${token}`);
  }
}

console.log('Automation resume UI governance check passed: activation is permission-gated and limited to draft/paused schedules.');
