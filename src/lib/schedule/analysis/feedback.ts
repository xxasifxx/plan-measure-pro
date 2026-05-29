// Generate a plain-English Resident Engineer feedback memo from DCMA results.
// Rehomed onto ScheduleActivity for activity name lookups.
import type { DcmaResult } from './dcma';
import type { ScheduleActivity } from '@/lib/schedule/types';

export interface ReMemoInput {
  projectName: string;
  dataDate: string | null;     // ISO YYYY-MM-DD
  activities: ScheduleActivity[];
  results: DcmaResult[];
}

export function buildReMemo({ projectName, dataDate, activities, results }: ReMemoInput): string {
  const today = new Date().toISOString().slice(0, 10);
  const passed = results.filter(r => r.pass).length;
  const score = Math.round((passed / results.length) * 100);

  const fails = results.filter(r => !r.pass);
  const hardBlockerIds = new Set(['leads', 'negfloat', 'invaliddates', 'logic', 'hard']);
  const hardBlockers = fails.filter(r => hardBlockerIds.has(r.id));
  const softFlags = fails.filter(r => !hardBlockerIds.has(r.id));

  const recommendation = hardBlockers.length > 0
    ? 'REJECT — request resubmission with corrections noted below before acceptance.'
    : softFlags.length > 0
      ? 'ACCEPT WITH CONDITIONS — issues noted are not blockers but must be addressed in next monthly update.'
      : 'ACCEPT — schedule meets DCMA-14 thresholds and NJDOT specification 108-03.';

  const byId = new Map(activities.map(a => [a.id, a]));
  const offenderList = (r: DcmaResult, max = 3) => {
    if (r.failingActivityIds.length === 0) return '';
    const ids = r.failingActivityIds.slice(0, max);
    const codes = ids
      .map(id => byId.get(id))
      .filter(Boolean)
      .map(a => `${a!.activity_id || a!.wbs_code || a!.id.slice(0, 8)} (${a!.name})`)
      .join('; ');
    const more = r.failingActivityIds.length > max ? ` …and ${r.failingActivityIds.length - max} more` : '';
    return `\n      Examples: ${codes}${more}`;
  };

  const lines: string[] = [];
  lines.push(`MEMORANDUM`);
  lines.push(``);
  lines.push(`TO:        Resident Engineer`);
  lines.push(`FROM:      Project Controls / CPM Scheduler`);
  lines.push(`DATE:      ${today}`);
  lines.push(`SUBJECT:   Schedule Submission Review — ${projectName}`);
  lines.push(`           Data Date: ${dataDate || 'TBD'} · DCMA-14 Score: ${score}% (${passed}/${results.length})`);
  lines.push(``);
  lines.push(`RECOMMENDATION: ${recommendation}`);
  lines.push(``);
  lines.push(`SUMMARY`);
  lines.push(`-------`);
  lines.push(`The submitted schedule for ${projectName} has been audited against the DCMA`);
  lines.push(`14-Point Assessment and the NJDOT Construction Scheduling Standard Coding`);
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
    lines.push(`No DCMA-14 thresholds were exceeded. The submission is mathematically`);
    lines.push(`defensible and may proceed to the Resident Engineer's signature for acceptance.`);
    lines.push(``);
  }

  lines.push(`NEXT STEPS`);
  lines.push(`----------`);
  lines.push(`  1. Forward this memo to the schedule author with the marked-up activity list.`);
  lines.push(`  2. Re-audit the resubmission within 24 hours of receipt.`);
  lines.push(`  3. Record the outcome in the weekly L10 Scorecard (Schedule Health metric).`);
  lines.push(``);
  lines.push(`Respectfully,`);
  lines.push(``);
  lines.push(`Project Controls / CPM Scheduler`);

  return lines.join('\n');
}
