import fs from 'node:fs';

const routerSource = fs.readFileSync('src/app/router.tsx', 'utf8');

const sessionRoutePattern = /path:\s*'sessions'[\s\S]{0,220}<ProtectedRoute>[\s\S]{0,120}<SessionsPage\s*\/>[\s\S]{0,120}<\/ProtectedRoute>/;

if (!sessionRoutePattern.test(routerSource)) {
  throw new Error('Tenant sessions route must be explicitly wrapped in ProtectedRoute so direct /sessions navigation has an explicit authenticated route boundary.');
}

if (/path:\s*'sessions',\s*\n\s*element:\s*<SessionsPage\s*\/>/.test(routerSource)) {
  throw new Error('Tenant sessions route still renders SessionsPage as a bare route element.');
}

console.log('check:tenant-session-route-auth-governance passed');
