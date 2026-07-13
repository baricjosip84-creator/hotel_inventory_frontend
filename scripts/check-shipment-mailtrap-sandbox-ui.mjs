import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/pages/ShipmentsPage.tsx');
const source = fs.readFileSync(file, 'utf8');

const required = [
  'sandbox_capture?: boolean',
  'Mailtrap Sandbox captures',
  "? 'Sending...'"
];

const forbidden = [
  'gmail_compose',
  'compose_email',
  'buildGmailComposeUrl',
  'mail.google.com/mail',
  'Gmail draft prepared',
  "window.open('', '_blank')"
];

const missing = required.filter((token) => !source.includes(token));
const presentForbidden = forbidden.filter((token) => source.includes(token));

if (missing.length || presentForbidden.length) {
  console.error([
    missing.length ? `Missing: ${missing.join(', ')}` : null,
    presentForbidden.length ? `Forbidden browser-compose tokens present: ${presentForbidden.join(', ')}` : null
  ].filter(Boolean).join(' | '));
  process.exit(1);
}

console.log('Shipment Mailtrap Sandbox UI check passed');
