import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backendCandidates = [
  process.env.BACKEND_ROOT,
  path.resolve(frontendRoot, '../hotel-inventory-backend'),
  path.resolve(frontendRoot, '../backend')
].filter(Boolean);
const backendRoot = backendCandidates.find((candidate) => fs.existsSync(candidate));
if (!backendRoot) throw new Error('Batch 022 guard requires BACKEND_ROOT or an adjacent backend checkout.');

const readFrontend = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), 'utf8');
const readBackend = (relativePath) => fs.readFileSync(path.join(backendRoot, relativePath), 'utf8');

const page = readFrontend('src/pages/DigitalTwinVisualizationPage.tsx');
const css = readFrontend('src/pages/DigitalTwinVisualizationPage.css');
const oldGuard = readFrontend('scripts/check-digital-twin-operational-completion-v349175.mjs');
const pkg = JSON.parse(readFrontend('package.json'));
const service = readBackend('src/services/operations/operationalActionCenterService.js');
const validation = readBackend('src/validations/operationalActionCenter.validation.js');

const checks = [];
const check = (condition, label) => checks.push({ condition: Boolean(condition), label });

check(page.includes('public_node_key?: string;'), 'frontend type accepts diagnostics-node public_node_key');
check(page.includes('source_public_node_key?: string | null;') && page.includes('target_public_node_key?: string | null;'), 'frontend edge/overlay types accept diagnostics public endpoint keys');
check(page.includes('node.node_key || node.public_node_key || null'), 'node focus helper accepts both ordinary and diagnostics response shapes');
check(page.includes('edge.source_node_key || edge.source_public_node_key || null'), 'edge source helper accepts both response shapes');
check(page.includes('edge.target_node_key || edge.target_public_node_key || null'), 'edge target helper accepts both response shapes');
check(page.includes('overlay.target_node_key || overlay.target_public_node_key || overlay.source_node_key || overlay.source_public_node_key || null'), 'overlay focus helper accepts both response shapes');
check(page.includes('const nodeFocusKey = digitalTwinNodeFocusKey(node);'), 'topology card resolves one safe focus key before rendering actions');
check(page.includes('focusNodeKey === nodeFocusKey'), 'selected-card state uses the normalized focus key');
check(page.includes('setFocusNodeKey(nodeFocusKey)') && page.includes("ui('Show connections')"), 'Show connections now submits the normalized focus key');
check(page.includes('disabled={!nodeFocusKey}'), 'Show connections is disabled rather than silently no-op when no safe key exists');
check(page.includes('digitalTwinEdgeSourceFocusKey(edge)') && page.includes('digitalTwinEdgeTargetFocusKey(edge)'), 'dependency review buttons use normalized focus keys');
check(page.includes('digitalTwinOverlayFocusKey(overlay)'), 'overlay connected-context button uses the normalized focus key');
check(page.includes('const focusPanelRef = useRef<HTMLElement | null>(null);'), 'connected-context panel has an explicit focus target');
check(page.includes("panel.scrollIntoView({ behavior: 'smooth', block: 'start' });") && page.includes('panel.focus({ preventScroll: true });'), 'successful focus changes bring connected context into view and focus it');
check(page.includes('ref={focusPanelRef} tabIndex={-1}'), 'connected-context panel is programmatically focusable');
check(css.includes('scroll-margin-top: 96px') && css.includes('.digital-twin-focus-panel:focus'), 'connected-context focus accounts for shell offset and remains visibly focused');

check(service.includes('if (summary.access?.can_view_diagnostics) return summary;'), 'backend diagnostics-capable readers still receive the intentional full response');
check(service.includes('node_key: node.public_node_key || `topology_point_${index + 1}`'), 'ordinary public response still maps public_node_key to node_key');
check(service.includes('source_node_key: edge.source_public_node_key || null') && service.includes('target_node_key: edge.target_public_node_key || null'), 'ordinary public edge response still maps public keys to source/target node keys');
check(validation.includes("focus_node_key: Joi.string().trim().pattern(/^dt_[a-f0-9]{24}$/).allow('').default('')"), 'backend focus-node validation remains restricted to safe public dt_ keys');
check(oldGuard.includes('node.node_key || node.public_node_key'), 'historical Digital Twin guard now protects dual-shape focus behavior');
check(pkg.scripts?.['check:inventory-digital-twin-focus-surgical-fix-v349267'] === 'node scripts/check-digital-twin-focus-surgical-fix-v349267.mjs', 'Batch 022 regression guard is registered');

const failed = checks.filter((item) => !item.condition);
for (const item of checks) console.log(`${item.condition ? 'PASS' : 'FAIL'}: ${item.label}`);
if (failed.length) {
  console.error(`\nBatch 022 Digital Twin focus guard: ${checks.length - failed.length}/${checks.length} PASS`);
  process.exit(1);
}
console.log(`\nBatch 022 Digital Twin focus guard: ${checks.length}/${checks.length} PASS`);
