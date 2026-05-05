// Generate a plain-English Resident Engineer feedback memo from DCMA results.
// This is the artifact the CPM Scheduler/Estimator role actually produces every
// time a contractor submits an XER for review (NJDOT/NYSDOT cadence).
import type { DcmaResult } from './dcma';
import type { XerTables } from './types';

export function buildReMemo(tables: XerTables, results: DcmaResult[]): string {
  const proj = tables.PROJECT[0];
  const projName = proj?.proj_short_name || 'Subject Project';
  const dataDate = proj?.last_recalc_date?.slice(0, 10) || 'TBD';
  const today = new Date().toISOString().slice(0, 10);
  const passed = results.filter(r => r.pass).length;
  const score = Math.round((passed / results.length) * 100);

  const fails = results.filter(r => !r.pass);
  const hardBlockers = fails.filter(r => ['leads', 'negfloat', 'invaliddates', 'logic', 'hard'].includes(r.id));
  const softFlags = fails.filter(r => !hardBlockers.includes(r));

  const recommendation = hardBlockers.length > 0
    ? 'REJECT — request resubmission with corrections noted below before acceptance.'
    : softFlags.length > 0
      ? 'ACCEPT WITH CONDITIONS — issues noted are not blockers but must be addressed in next monthly update.'
      : 'ACCEPT — schedule meets DCMA-14 thresholds and NJDOT specification 108-03.';

  const offenderList = (r: DcmaResult, max = 3) => {
    if (r.failingTaskIds.length === 0) return '';
    const ids = r.failingTaskIds.slice(0, max);
    const codes = ids
      .map(id => tables.TASK.find(t => t.task_id === id))
      .filter(Boolean)
      .map(t => `${t!.task_code} (${t!.task_name})`)
      .join('; ');
    const more = r.failingTaskIds.length > max ? ` …and ${r.failingTaskIds.length - max} more` : '';
    return `\n      Examples: ${codes}${more}`;
  };

  const lines: string[] = [];
  lines.push(`MEMORANDUM`);
  lines.push(``);
  lines.push(`TO:        Resident Engineer`);
  lines.push(`FROM:      Project Controls / CPM Scheduler`);
  lines.push(`DATE:      ${today}`);
  lines.push(`SUBJECT:   Schedule Submission Review — ${projName}`);
  lines.push(`           Data Date: ${dataDate} · DCMA-14 Score: ${score}% (${passed}/${results.length})`);
  lines.push(``);
  lines.push(`RECOMMENDATION: ${recommendation}`);
  lines.push(``);
  lines.push(`SUMMARY`);
  lines.push(`-------`);
  lines.push(`The Contractor's submitted schedule for ${projName} has been audited against the`);
  lines.push(`DCMA 14-Point Assessment and the NJDOT Construction Scheduling Standard Coding`);
  lines.push(`& Procedures Manual. Findings are organized below by severity.`);
  lines.push(``);

  if (hardBlockers.length > 0) {
    lines.push(`HARD BLOCKERS (must be corrected before acceptance)`);
    lines.push(`---------------------------------------------------`);
    hardBlockers.forEach((r, i) => {
      lines.push(`  ${i + 1}. ${r.name} — measured ${r.metric}, target ${r.target}.`);
      lines.push(`     ${r.description}${offenderList(r)}`);
      lines.push(``);
    });
  }

  if (softFlags.length > 0) {
    lines.push(`ADVISORY FLAGS (track in next update)`);
    lines.push(`-------------------------------------`);
    softFlags.forEach((r, i) => {
      lines.push(`  ${i + 1}. ${r.name} — measured ${r.metric}, target ${r.target}.${offenderList(r)}`);
      lines.push(``);
    });
  }

  if (fails.length === 0) {
    lines.push(`No DCMA-14 thresholds were exceeded. The submission is mathematically defensible`);
    lines.push(`and may proceed to the Resident Engineer's signature for acceptance.`);
    lines.push(``);
  }

  lines.push(`NEXT STEPS`);
  lines.push(`----------`);
  lines.push(`  1. Forward this memo to the Contractor's Scheduler with the marked-up XER.`);
  lines.push(`  2. Re-audit the resubmission within 24 hours of receipt.`);
  lines.push(`  3. Record the outcome in the weekly L10 Scorecard (Schedule Health metric).`);
  lines.push(``);
  lines.push(`Respectfully,`);
  lines.push(``);
  lines.push(`Project Controls / CPM Scheduler`);
  lines.push(`MCFA Transportation & Infrastructure`);

  return lines.join('\n');
}
