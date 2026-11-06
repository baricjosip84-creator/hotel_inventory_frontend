#!/usr/bin/env python3
"""Offline, standard-library-only Inventory Playwright source/ledger gate.

Does NOT import Playwright, TypeScript, start a browser, contact a server,
execute specs or modify original application sources.

Run:
 python PHASE1_STATIC_SOURCE_GATE.py --suite . \
   --frontend-zip '/path/to/hotel-inventory-frontend - Copy.zip' \
   --backend-zip '/path/to/hotel-inventory-backend - Copy.zip' \
   --output PHASE1_STATIC_SOURCE_GATE_B185.json
"""
from __future__ import annotations
import argparse
import collections
import csv
import fnmatch
import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path

FE_SHA='864b8dc06350473be433d19dd72a35175eef0b4ffdf9f87443e8887e68f5f112'
BE_SHA='e6bf02aa1b1eb9cb834a5010c4a38ef08f4f17d0afd57b75d40d24395d8c2ac4'
EXPECTED={'specs':152,'scenario_declarations':9900,'labelled_skips':357,'ledger_rows':10318,
          'feature_records':10610,'routes':137,'blocked':417,'partial':272,
          'needs_expectation':1,'supplemental_skip_calls':24}
DECL=re.compile(r'''\btest(?P<mode>\.(?:skip|fixme|only))?\s*\(\s*['\"](?P<id>[A-Za-z][A-Za-z0-9]*-\d{3})\b''')
IMPORT=re.compile(r'''(?:\bfrom\s*|\bimport\s*\(|\brequire\s*\()\s*['\"](?P<path>\.[^'\"]+)['\"]''')

def csv_rows(p:Path):
 with p.open('r',encoding='utf-8-sig',newline='') as stream:return list(csv.DictReader(stream))

def zip_inventory(path:Path,sha:str):
 if not path.is_file():raise ValueError(f'Missing immutable original archive: {path}')
 digest=hashlib.sha256(path.read_bytes()).hexdigest()
 if digest!=sha:raise ValueError(f'Immutable archive SHA mismatch {path.name}: {digest}')
 with zipfile.ZipFile(path) as archive:
  bad=archive.testzip()
  if bad:raise ValueError(f'Corrupt original archive: {bad}')
  names={name.split('/',1)[1] for name in archive.namelist() if '/' in name}
 return names,digest

def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--suite',type=Path,default=Path('.'))
 parser.add_argument('--frontend-zip',type=Path,required=True)
 parser.add_argument('--backend-zip',type=Path,required=True)
 parser.add_argument('--output',type=Path,default=None)
 args=parser.parse_args()
 root=args.suite.resolve()
 failures=[];details={}
 def insist(ok,msg):
  if not ok:failures.append(msg)
 fe,fe_sha=zip_inventory(args.frontend_zip,FE_SHA)
 be,be_sha=zip_inventory(args.backend_zip,BE_SHA)
 specs=sorted(root.glob('tests/**/*.spec.ts'))
 insist(len(specs)==EXPECTED['specs'],f'Spec count {len(specs)} != 152')
 occurrences=collections.defaultdict(list)
 labelled=[];special_modes=[];supplemental=[]
 for spec in specs:
  rel=spec.relative_to(root).as_posix()
  contents=spec.read_text(encoding='utf8')
  for m in DECL.finditer(contents):
   line=contents.count('\n',0,m.start())+1
   occurrences[m.group('id')].append({'spec_file':rel,'line':line,'mode':m.group('mode') or 'normal'})
   if m.group('mode')=='.skip':labelled.append(m.group('id'))
   if m.group('mode') in ('.only','.fixme'):special_modes.append(f'{rel}:{line} {m.group("id")} {m.group("mode")}')
  supplemental.extend(re.findall(r'''\btest\.skip\s*\(\s*(?!['\"])''',contents))
 duplicated={k:v for k,v in occurrences.items() if len(v)!=1}
 insist(not duplicated,f'Duplicate scenario declarations: {list(duplicated)[:10]}')
 insist(not special_modes,f'Exclusive or fixme modes found: {special_modes[:10]}')
 insist(len(occurrences)==EXPECTED['scenario_declarations'],f'{len(occurrences)} unique declarations != 9900')
 insist(len(labelled)==EXPECTED['labelled_skips'],f'{len(labelled)} labelled skips != 357')
 insist(len(supplemental)==EXPECTED['supplemental_skip_calls'],f'{len(supplemental)} supplemental skip calls != 24')

 ledger=csv_rows(root/'COVERAGE_LEDGER.csv');feature=csv_rows(root/'PAGE_FUNCTION_INVENTORY.csv')
 ledger_map=collections.defaultdict(list)
 for r in ledger:ledger_map[r['scenario_id']].append(r)
 feature_map=collections.defaultdict(list)
 for r in feature:feature_map[r['stable_feature_id']].append(r)
 insist(len(ledger)==EXPECTED['ledger_rows'],f'Ledger rows {len(ledger)} != 10318')
 insist(all(len(v)==1 for v in ledger_map.values()),'Duplicate ledger IDs exist')
 insist(len(feature)==EXPECTED['feature_records'],f'Feature rows {len(feature)} != 10610')
 insist(all(len(v)==1 for v in feature_map.values()),'Duplicate stable feature IDs exist')
 types=collections.Counter(r['status'] for r in ledger)
 insist(types['GENERATED_UNRUN']==9900,'Generated ledger scenario count != 9900')
 insist(types['BLOCKED']==417,'Blocked obligations count != 417')
 insist(types['NEEDS_EXPECTATION']==1,'Unresolved expectation count != 1')
 insist(set(occurrences)=={r['scenario_id'] for r in ledger if r['status']=='GENERATED_UNRUN'},
        'Authored ID set does not exactly equal generated ledger IDs')
 linked_files=[];mismatched_files=[]
 for id,locs in occurrences.items():
  item=ledger_map.get(id,[None])[0]
  if item is None:continue
  linked_files.append(item['spec_file'])
  if item['spec_file']!=locs[0]['spec_file']:mismatched_files.append((id,item['spec_file'],locs[0]['spec_file']))
 insist(not mismatched_files,f'Mismatched spec files: {mismatched_files[:10]}')
 insist(all(r['feature_id'] in feature_map for r in ledger),'Ledger links unknown stable feature IDs')
 partial=sum(r['discovery_status']=='SOURCE_TRACED_PARTIAL' for r in feature)
 insist(partial==272,f'Partially classified features {partial} != 272')
 insist({r['scenario_id'] for r in ledger if r['status']=='NEEDS_EXPECTATION'}=={'PLCR-084'},
        'Unexpected or missing PLCR-084 contract decision')

 routes=collections.defaultdict(lambda: {'features':0,'linked_generated':0,'partial_features':0,'blocked_features':0,'pages':set()})
 active_features={r['feature_id'] for r in ledger if r['status']=='GENERATED_UNRUN'}
 blocked_features={r['feature_id'] for r in ledger if r['status']=='BLOCKED'}
 for r in feature:
  x=routes[r['route']];x['features']+=1;x['pages'].add(r['page'])
  x['linked_generated']+=r['stable_feature_id'] in active_features
  x['partial_features']+=r['discovery_status']=='SOURCE_TRACED_PARTIAL'
  x['blocked_features']+=r['stable_feature_id'] in blocked_features
 insist(len(routes)==EXPECTED['routes'],f'Route inventory {len(routes)} != 137')
 no_generated=[key for key,x in routes.items() if x['linked_generated']==0]
 insist(not no_generated,f'Routes lacking authored source scenarios: {no_generated}')

 missing_imports=[]
 for source in root.rglob('*.ts'):
  s=source.read_text(encoding='utf8')
  for m in IMPORT.finditer(s):
   target=source.parent/m.group('path')
   if not any(Path(str(target)+suffix).is_file() for suffix in ('','.ts','.tsx','.js','/index.ts','/index.js')):
    missing_imports.append(f'{source.relative_to(root)} -> {m.group("path")}')
 insist(not missing_imports,f'Unresolved suite-relative imports: {missing_imports[:10]}')

 seen_refs=set();missing_refs=[]
 for row in ledger:
  for original in row['source_refs'].split(';'):
   token=original.strip().split(':',1)[0]
   if not token or token in seen_refs:continue
   seen_refs.add(token)
   if token.startswith('frontend/'):
    dest=token[len('frontend/'):]
    matched=any(fnmatch.fnmatch(name,dest) for name in fe) if '*' in dest else dest in fe
   elif token.startswith('backend/'):
    dest=token[len('backend/'):]
    matched=any(fnmatch.fnmatch(name,dest) for name in be) if '*' in dest else dest in be
   elif token.startswith('playwright-inventory/'):
    matched=(root/token[len('playwright-inventory/'):]).is_file()
   else:
    matched=False
   if not matched:missing_refs.append(token)
 insist(not missing_refs,f'Source-reference paths absent: {missing_refs[:15]}')

 matrix=csv_rows(root/'PHASE1_BLOCKED_OBLIGATION_ACCEPTANCE_MATRIX_B161.csv')
 barrier=collections.Counter(r['proof_boundary'] for r in matrix)
 insist(len(matrix)==417 and {r['scenario_id'] for r in matrix}=={r['scenario_id'] for r in ledger if r['status']=='BLOCKED'},'Blocked obligation matrix out of sync')
 skips=csv_rows(root/'PHASE1_IN_TEST_SKIP_GUARD_RECONCILIATION_B161.csv')
 skip_types=collections.Counter(r['skip_kind'] for r in skips)
 insist(len(skips)==24,'Supplemental skip review is not 24 records')

 # Reject known positive-flow fixture IDs that cannot satisfy the original Joi validation.
 cross=(root/'tests/tenant/cross-domain-optimization/cross-domain-optimization.spec.ts').read_text()
 twin=(root/'tests/tenant/digital-twin/digital-twin.spec.ts').read_text()
 insist("owner_user_id:'pw-owner-1'" not in cross,'Cross-domain owner fixture is not a UUID')
 insist("id:'pw-option-16'" not in cross,'Cross-domain option fixture is not a UUID')
 insist("id:'pw-tradeoff-16'" not in cross,'Cross-domain tradeoff fixture is not a UUID')
 insist('pw-node-' not in twin,'Digital Twin positive-flow focus key fails /^dt_[a-f0-9]{24}$/')

 route_rows=[{'route':route,'features':x['features'],'linked_generated':x['linked_generated'],
             'blocked_features':x['blocked_features'],'partial_features':x['partial_features'],
             'pages':sorted(x['pages'])} for route,x in sorted(routes.items())]
 details.update({
  'phase':'Phase 1 source authoring freeze / static readiness; NOT browser acceptance',
  'tests_compiled':0,'tests_discovered':0,'tests_executed':0,
  'immutable_fe_sha256':fe_sha,'immutable_be_sha256':be_sha,
  'spec_files':len(specs),'authored_declarations':len(occurrences),'labelled_skip_declarations':len(labelled),
  'supplemental_skip_calls':len(supplemental),'ledger_rows':len(ledger),'ledger_statuses':dict(types),
  'feature_rows':len(feature),'partial_feature_records':partial,'unique_routes':len(routes),
  'routes_with_source_authored_scenarios':len(routes)-len(no_generated),
  'unique_source_reference_paths':len(seen_refs),'missing_source_reference_paths':missing_refs,
  'missing_local_imports':missing_imports,'blocked_proof_boundaries':dict(barrier),
  'supplemental_skip_classifications':dict(skip_types),
  'phase1_deferrals_not_closed':{'blocked_obligations':417,'partial_features':272,'labelled_skips':357,'supplemental_skips':24,'expectation_decision':'PLCR-084'},
  'route_matrix':route_rows,
  'limitations':['No TypeScript parser/compilation or Playwright test discovery',
                 'No browser, backend, database, permission or multitenant validation',
                 'Source path existence is not statement-by-statement behavioral proof',
                 '137/137 route coverage is not proof of exhaustive functionality']
 })
 details['gate']='PASS' if not failures else 'FAIL';details['errors']=failures
 rendered=json.dumps(details,indent=2,ensure_ascii=False)+'\n'
 if args.output:args.output.write_text(rendered,encoding='utf8')
 print(f"{details['gate']}: {len(specs)} specs, {len(occurrences)} scenario IDs, {len(routes)} routes, {len(missing_refs)} missing source references, {len(missing_imports)} missing imports. Exceptions: 417 blocked, 272 partial, PLCR-084.")
 if failures:print('ERRORS:\n'+'\n'.join(failures),file=sys.stderr)
 return 1 if failures else 0
if __name__=='__main__':sys.exit(main())
