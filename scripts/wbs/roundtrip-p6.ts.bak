#!/usr/bin/env node
// Round-trip: parse emitted PMXML → ImportedSchedule → fake DB rows → runCpm →
// buildPmxmlFromProject → re-parse. Reports import warnings, CPM coverage,
// re-export validity, and structural parity.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { register } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

// Use tsx loader for TS imports
await import('tsx/esm/api').then(api => api.register()).catch(async () => {
  register('tsx/esm', pathToFileURL('./'));
});

// Provide xmldom for parseP6Xml (Node has no DOMParser/XMLSerializer)
const { DOMParser, XMLSerializer } = await import('@xmldom/xmldom');
globalThis.DOMParser = DOMParser;
globalThis.XMLSerializer = XMLSerializer;

const aliasPath = (id) => id.replace(/^@\//, path.join(repoRoot, 'src') + '/');
// Hack: monkey-patch resolution by absolute import paths
const importTs = async (rel) => import(pathToFileURL(path.join(repoRoot, rel)).href);

const { importFromPmxml } = await importTs('src/lib/schedule/import-p6.ts');
const { runCpm } = await importTs('src/lib/schedule/cpm.ts');
const { buildPmxmlFromProject } = await importTs('src/lib/p6xml/build-from-project.ts');
const { parseP6Xml } = await importTs('src/lib/p6xml/parser.ts');

const inputPath = path.join(repoRoot, '.lovable/wbs/project.p6.xml');
const xml = fs.readFileSync(inputPath, 'utf8');
console.log(`\n=== STEP 1: import ${path.relative(repoRoot, inputPath)} (${(xml.length/1024).toFixed(0)} KB)`);

const imp = importFromPmxml(xml);
console.log('counts:', imp.counts);
console.log('warnings:', imp.warnings.length, imp.warnings.slice(0, 5));
console.log('meta:', imp.meta);

// Synthesize ext_id -> uuid so we can build ScheduleActivity[] / ActivityRelationship[]
const uuidFor = (() => {
  const m = new Map();
  let n = 0;
  return (k) => {
    if (!m.has(k)) m.set(k, `00000000-0000-0000-0000-${String(++n).padStart(12, '0')}`);
    return m.get(k);
  };
})();
const PROJ = '00000000-0000-0000-0000-aaaaaaaaaaaa';

const calendarsDb = imp.calendars.map(c => ({
  id: uuidFor(c.ext_id),
  project_id: PROJ,
  name: c.name,
  is_default: c.is_default,
  hours_per_day: c.hours_per_day,
  workweek: c.workweek,
  exceptions: c.exceptions,
}));

const activitiesDb = imp.activities.map(a => ({
  id: uuidFor(a.ext_id),
  project_id: PROJ,
  parent_wbs_id: a.parent_ext_id ? uuidFor(a.parent_ext_id) : null,
  wbs_code: a.wbs_code,
  activity_id: a.activity_id ?? null,
  name: a.name,
  activity_type: a.activity_type,
  baseline_start: a.baseline_start ?? null,
  baseline_end: a.baseline_end ?? null,
  duration_days: a.duration_days,
  percent_complete: a.percent_complete,
  actual_start: a.actual_start ?? null,
  actual_finish: a.actual_finish ?? null,
  early_start: null, early_finish: null, late_start: null, late_finish: null,
  total_float_days: null, is_critical: false,
  sort_order: a.sort_order,
  pay_item_id: null, baseline_quantity: null,
  manual_finish: a.manual_finish,
  calendar_id: a.calendar_ext_id ? uuidFor(a.calendar_ext_id) : null,
  constraint_type: a.constraint_type ?? null,
  constraint_date: a.constraint_date ?? null,
}));

const relationshipsDb = imp.relationships.map((r, i) => ({
  id: `rel-${i}`,
  project_id: PROJ,
  pred_activity_id: uuidFor(r.pred_ext_id),
  succ_activity_id: uuidFor(r.succ_ext_id),
  rel_type: r.rel_type,
  lag_days: r.lag_days,
}));

const meta = { project_id: PROJ, data_date: imp.meta.data_date, calendar: imp.meta.calendar };

console.log('\n=== STEP 2: runCpm');
const t0 = Date.now();
const cpm = runCpm(activitiesDb, relationshipsDb, meta, calendarsDb);
console.log(`cpm in ${Date.now()-t0}ms  projectStart=${cpm.projectStart} projectFinish=${cpm.projectFinish} cycles=${cpm.cycles.length}`);
console.log(`byId entries: ${cpm.byId.size} / ${activitiesDb.filter(a => a.activity_type !== 'wbs').length}`);
const critical = [...cpm.byId.values()].filter(v => v.is_critical).length;
const violated = [...cpm.byId.values()].filter(v => v.constraint_violated).length;
const withDates = [...cpm.byId.values()].filter(v => v.early_start && v.early_finish).length;
console.log(`critical=${critical}  constraint_violated=${violated}  withDates=${withDates}`);

// Apply CPM back into activities for re-export
for (const a of activitiesDb) {
  const r = cpm.byId.get(a.id);
  if (r) {
    a.early_start = r.early_start; a.early_finish = r.early_finish;
    a.late_start = r.late_start; a.late_finish = r.late_finish;
    a.total_float_days = r.total_float_days; a.is_critical = r.is_critical;
  }
}

console.log('\n=== STEP 3: buildPmxmlFromProject');
const out = await buildPmxmlFromProject(PROJ, activitiesDb, relationshipsDb, meta, calendarsDb, [], []);
const outPath = path.join(repoRoot, '.lovable/wbs/project.p6.roundtrip.xml');
fs.writeFileSync(outPath, out);
console.log(`re-exported ${(out.length/1024).toFixed(0)} KB → ${path.relative(repoRoot, outPath)}`);

console.log('\n=== STEP 4: re-parse exported XML');
try {
  const reparsed = parseP6Xml(out);
  console.log(`reparsed OK: project=${reparsed.project.id}  activities=${reparsed.activities.length}`);
  const reImp = importFromPmxml(out);
  console.log('round-trip counts:', reImp.counts);
  console.log('round-trip warnings:', reImp.warnings.length, reImp.warnings.slice(0, 3));
} catch (e) {
  console.error('reparse FAILED:', e.message);
}

console.log('\n=== PARITY');
const cmp = (label, a, b) => console.log(`  ${label.padEnd(15)} in:${String(a).padStart(6)}  out:${String(b).padStart(6)}  ${a===b?'✓':'Δ '+(b-a)}`);
const reImp2 = importFromPmxml(out);
cmp('wbs', imp.counts.wbs, reImp2.counts.wbs);
cmp('tasks', imp.counts.tasks, reImp2.counts.tasks);
cmp('milestones', imp.counts.milestones, reImp2.counts.milestones);
cmp('loe', imp.counts.loe, reImp2.counts.loe);
cmp('relationships', imp.counts.relationships, reImp2.counts.relationships);
cmp('calendars', imp.counts.calendars, reImp2.counts.calendars);
