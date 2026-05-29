import fs from 'node:fs';
import path from 'node:path';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
(globalThis as any).DOMParser = DOMParser;
(globalThis as any).XMLSerializer = XMLSerializer;

import { importFromPmxml } from '/dev-server/src/lib/schedule/import-p6';
import { runCpm } from '/dev-server/src/lib/schedule/cpm';
import { buildPmxmlFromProject } from '/dev-server/src/lib/p6xml/build-from-project';
import { parseP6Xml } from '/dev-server/src/lib/p6xml/parser';

const root = '/dev-server';
const xml = fs.readFileSync(path.join(root, '.lovable/wbs/project.p6.xml'), 'utf8');
console.log(`\n=== STEP 1: import (${(xml.length/1024).toFixed(0)} KB)`);
const imp = importFromPmxml(xml);
console.log('counts:', imp.counts);
console.log('warnings:', imp.warnings.length);
if (imp.warnings.length) console.log('  first 5:', imp.warnings.slice(0,5));
console.log('meta:', imp.meta);

const uuids = new Map<string,string>(); let n=0;
const uuidFor=(k:string)=>{ if(!uuids.has(k)) uuids.set(k,`00000000-0000-0000-0000-${String(++n).padStart(12,'0')}`); return uuids.get(k)!; };
const PROJ='00000000-0000-0000-0000-aaaaaaaaaaaa';

const calendarsDb = imp.calendars.map(c=>({ id:uuidFor(c.ext_id), project_id:PROJ, name:c.name, is_default:c.is_default, hours_per_day:c.hours_per_day, workweek:c.workweek, exceptions:c.exceptions }));
const activitiesDb: any[] = imp.activities.map(a=>({
  id:uuidFor(a.ext_id), project_id:PROJ,
  parent_wbs_id:a.parent_ext_id?uuidFor(a.parent_ext_id):null,
  wbs_code:a.wbs_code, activity_id:a.activity_id??null, name:a.name,
  activity_type:a.activity_type,
  baseline_start:a.baseline_start??null, baseline_end:a.baseline_end??null,
  duration_days:a.duration_days, percent_complete:a.percent_complete,
  actual_start:a.actual_start??null, actual_finish:a.actual_finish??null,
  early_start:null, early_finish:null, late_start:null, late_finish:null,
  total_float_days:null, is_critical:false, sort_order:a.sort_order,
  pay_item_id:null, baseline_quantity:null, manual_finish:a.manual_finish,
  calendar_id:a.calendar_ext_id?uuidFor(a.calendar_ext_id):null,
  constraint_type:a.constraint_type??null, constraint_date:a.constraint_date??null,
}));
const relationshipsDb: any[] = imp.relationships.map((r,i)=>({
  id:`rel-${i}`, project_id:PROJ,
  pred_activity_id:uuidFor(r.pred_ext_id), succ_activity_id:uuidFor(r.succ_ext_id),
  rel_type:r.rel_type, lag_days:r.lag_days,
}));
const meta = { project_id:PROJ, data_date:imp.meta.data_date, calendar:imp.meta.calendar };

console.log('\n=== STEP 2: runCpm');
const t0=Date.now();
const cpm = runCpm(activitiesDb, relationshipsDb, meta, calendarsDb);
console.log(`cpm in ${Date.now()-t0}ms  start=${cpm.projectStart} finish=${cpm.projectFinish} cycles=${cpm.cycles.length}`);
const leaves = activitiesDb.filter(a=>a.activity_type!=='wbs');
console.log(`byId entries: ${cpm.byId.size} / ${leaves.length} leaves`);
const critical=[...cpm.byId.values()].filter(v=>v.is_critical).length;
const violated=[...cpm.byId.values()].filter(v=>(v as any).constraint_violated).length;
const withDates=[...cpm.byId.values()].filter(v=>v.early_start&&v.early_finish).length;
console.log(`critical=${critical}  constraint_violated=${violated}  withEarlyDates=${withDates}`);
// missing
const missing = leaves.filter(a=>!cpm.byId.has(a.id));
console.log(`activities missing CPM result: ${missing.length}`);
if (missing.length) console.log('  sample missing types:', [...new Set(missing.slice(0,20).map(a=>a.activity_type))]);

for (const a of activitiesDb) {
  const r=cpm.byId.get(a.id);
  if (r) { Object.assign(a,r); }
}

console.log('\n=== STEP 3: buildPmxmlFromProject');
const out = await buildPmxmlFromProject(PROJ, activitiesDb, relationshipsDb, meta, calendarsDb, [], []);
fs.writeFileSync(path.join(root,'.lovable/wbs/project.p6.roundtrip.xml'), out);
console.log(`re-exported ${(out.length/1024).toFixed(0)} KB → .lovable/wbs/project.p6.roundtrip.xml`);

console.log('\n=== STEP 4: re-parse exported XML');
try {
  const re = parseP6Xml(out);
  console.log(`reparsed OK: project=${re.project.id}  activities=${re.activities.length}`);
} catch(e:any) { console.error('reparse FAILED:', e.message); }

const reImp = importFromPmxml(out);
console.log('round-trip counts:', reImp.counts);
console.log('round-trip warnings:', reImp.warnings.length);
if (reImp.warnings.length) console.log('  first 5:', reImp.warnings.slice(0,5));

console.log('\n=== PARITY (in → out)');
const cmp=(l:string,a:number,b:number)=>console.log(`  ${l.padEnd(15)} in:${String(a).padStart(6)}  out:${String(b).padStart(6)}  ${a===b?'OK':'DELTA '+(b-a)}`);
cmp('wbs',imp.counts.wbs,reImp.counts.wbs);
cmp('tasks',imp.counts.tasks,reImp.counts.tasks);
cmp('milestones',imp.counts.milestones,reImp.counts.milestones);
cmp('loe',imp.counts.loe,reImp.counts.loe);
cmp('relationships',imp.counts.relationships,reImp.counts.relationships);
cmp('calendars',imp.counts.calendars,reImp.counts.calendars);
