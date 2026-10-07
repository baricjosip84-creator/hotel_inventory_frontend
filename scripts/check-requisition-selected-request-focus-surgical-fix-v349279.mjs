import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const file = fs.readFileSync(path.join(root, 'src/pages/InventoryRequisitionsPage.tsx'), 'utf8');
const checks = [
  ['useRef imported', /useRef/],
  ['selected request ref exists', /selectedRequestRef = useRef<HTMLElement \| null>/],
  ['focus effect follows selected record', /if \(!selected\?\.id \|\| selected\.id !== selectedId\) return/],
  ['post-render scheduling used', /requestAnimationFrame/],
  ['selected request scrolls into view', /selectedRequestRef\.current\?\.scrollIntoView\(\{ behavior: 'smooth', block: 'start' \}\)/],
  ['selected request receives focus', /selectedRequestRef\.current\?\.focus\(\{ preventScroll: true \}\)/],
  ['animation frame cleanup exists', /cancelAnimationFrame/],
  ['panel owns focus ref', /ref=\{selectedRequestRef\}/],
  ['panel is programmatically focusable', /tabIndex=\{-1\}/],
  ['panel has accessible label', /aria-label=\{ui\('Selected request'\)\}/],
  ['fixed-header margin exists', /scrollMarginTop: 104/],
  ['queue selection still selects exact row', /onClick=\{\(\) => setSelectedId\(item\.id\)\}/],
  ['detail query still keyed by selected id', /queryKey: \['inventory-requisition-detail', selectedId\]/],
  ['no requisition mutation added to focus effect', /useEffect\(\(\) => \{[\s\S]*?selectedRequestRef[\s\S]*?\}, \[selected\?\.id, selectedId\]\)/],
];
let pass=0;
for (const [name,re] of checks) { const ok=re.test(file); console.log(`${ok?'PASS':'FAIL'} - ${name}`); if(ok) pass++; }
console.log(`\n${pass}/${checks.length} PASS`);
if(pass!==checks.length) process.exit(1);
