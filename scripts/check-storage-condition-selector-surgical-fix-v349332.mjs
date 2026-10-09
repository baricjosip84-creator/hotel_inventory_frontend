import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import ts from 'typescript';

const root=process.cwd();
const src=fs.readFileSync(path.join(root,'src/pages/StorageLocationsPage.tsx'),'utf8');
const catalog=fs.readFileSync(path.join(root,'src/i18n/tenantUiTranslations.ts'),'utf8');
let checks=0;
const verify=(name,fn)=>{fn();checks+=1;};
const includes=(text,value)=>assert.ok(text.includes(value),`missing: ${value}`);
verify('no datalist rendered',()=>assert.doesNotMatch(src,/<datalist\b/));
verify('no list attribute for condition',()=>assert.doesNotMatch(src,/list="storage-location-temperature-zone-options"/));
verify('native selector has existing control id',()=>includes(src,'<select\n              id="storage-location-temperature-zone"'));
verify('condition selector controlled',()=>includes(src,'value={conditionChoice}'));
verify('condition selector onChange handler',()=>includes(src,'onChange={(event) => handleConditionChoice(event.target.value)}'));
verify('custom option cannot collide with standard keys',()=>includes(src,"const CUSTOM_TEMPERATURE_ZONE_CHOICE = '__custom_condition__'"));
verify('blank option is translated',()=>includes(src,'<option value="">{ui("Not specified")}</option>'));
verify('recommended options are localized',()=>includes(src,'<option key={zone} value={zone}>{ui(zone)}</option>'));
verify('custom option translated',()=>includes(src,'ui("Custom storage condition…")'));
verify('custom choice state is controlled',()=>includes(src,'const [customConditionSelected, setCustomConditionSelected] = useState(false)'));
verify('stored unknown values open custom selection',()=>includes(src,'!isStandardTemperatureZone(form.temperature_zone)'));
verify('edit existing unknown value sets custom mode',()=>includes(src,'setCustomConditionSelected(Boolean(location.temperature_zone?.trim()) && !isStandardTemperatureZone(location.temperature_zone))'));
verify('form reset clears custom mode',()=>assert.equal((src.match(/setCustomConditionSelected\(false\);/g)||[]).length,4));
verify('selection handler updates mode',()=>includes(src,'setCustomConditionSelected(choice === CUSTOM_TEMPERATURE_ZONE_CHOICE)'));
verify('selection handler does not store sentinel',()=>includes(src,"updateFormField('temperature_zone', choice === CUSTOM_TEMPERATURE_ZONE_CHOICE ? '' : choice)"));
verify('custom text field only shown in custom mode',()=>includes(src,'conditionChoice === CUSTOM_TEMPERATURE_ZONE_CHOICE ? ('));
verify('custom value bound to original form field',()=>includes(src,'onChange={(event) => updateFormField(\'temperature_zone\', event.target.value)}'));
verify('custom value remains controlled',()=>includes(src,'value={form.temperature_zone}'));
verify('custom field is required only when displayed',()=>assert.match(src,/id="storage-location-custom-temperature-zone"[\s\S]*?maxLength=\{100\}\s+required/));
verify('write permissions preserved',()=>assert.match(src,/id="storage-location-temperature-zone"[\s\S]*?disabled=\{inputDisabled\}/));
verify('API create payload unchanged',()=>includes(src,'temperature_zone: input.temperature_zone.trim() || null'));
verify('API update payload unchanged',()=>assert.equal((src.match(/temperature_zone: input\.temperature_zone\.trim\(\) \|\| null/g)||[]).length,1));
verify('API update retains version guard',()=>includes(src,"'If-Match-Version': String(input.version)"));
verify('no new backend endpoint',()=>assert.doesNotMatch(src,/storage-condition-options|condition-master/));
verify('create permissions remain guarded',()=>includes(src,'if (!canManageStorageLocations) {'));
verify('recommended label set still configured',()=>includes(src,'const STANDARD_TEMPERATURE_ZONE_KEYS = new Set('));
verify('original explanatory help preserved',()=>includes(src,'Optional. Choose a recommended condition label where possible. Custom values remain allowed'));
verify('custom string maximum still 100',()=>assert.match(src,/id="storage-location-custom-temperature-zone"[\s\S]*?maxLength=\{100\}/));
for (const [k,langs] of [['Custom storage condition…',['Benutzerdefinierte','Condición de almacenamiento personalizada','Condition de stockage personnalisée','Prilagođeni uvjeti']],['Custom storage condition',['Benutzerdefinierte','Condición de almacenamiento personalizada','Condition de stockage personnalisée','Prilagođeni uvjeti']],['Enter a storage condition',['Lagerbedingung eingeben','Introduzca una condición','Saisissez une condition','Unesite uvjete']]]){
 verify('all five translations: '+k,()=>{const row=catalog.split('\n').find(l=>l.includes('["'+k+'",'));assert.ok(row,`missing ${k}`); for(const lang of langs) includes(row,lang);});
}
for (const file of ['src/pages/StorageLocationsPage.tsx','src/i18n/tenantUiTranslations.ts']){
 verify('isolated TypeScript parses '+file,()=>{const content=fs.readFileSync(path.join(root,file),'utf8');const result=ts.transpileModule(content,{fileName:file,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},reportDiagnostics:true});assert.equal(result.diagnostics?.length||0,0)});
}
verify('mutation submits same form',()=>includes(src,'updateMutation.mutate({ id: editingLocation.id, version: editingLocation.version, values: form })'));
verify('create submits same form',()=>includes(src,'createMutation.mutate(form)'));
console.log(`Storage condition selector surgical regression: ${checks}/${checks} PASS`);
