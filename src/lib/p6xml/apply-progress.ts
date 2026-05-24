// Apply a batch of RE-approved daily reports to a parsed PMXML.
// Operates by mutating the underlying DOM (via P6Activity._el) so that
// serializer.ts produces a file Oracle P6 will accept under "Update existing
// project". Matching is by Activity Id (stable, human-readable).
import type {
  ActivityChange, ApplyResult, ApprovedDailyReport, P6Activity, P6Status, P6Tables,
} from './types';

// ---- DOM helpers ----------------------------------------------------------

function setOrCreateChild(parent: Element, localName: string, value: string) {
  for (const c of Array.from(parent.children)) {
    if (c.localName === localName) {
      c.textContent = value;
      return;
    }
  }
  const ns = parent.namespaceURI;
  const el = ns ? parent.ownerDocument!.createElementNS(ns, localName) : parent.ownerDocument!.createElement(localName);
  el.textContent = value;
  parent.appendChild(el);
}

const isoDateTime = (ymd: string): string => `${ymd}T07:00:00`;

const fmtNum = (n: number, decimals = 2): string =>
  Number.isInteger(n) ? String(n) : n.toFixed(decimals).replace(/\.?0+$/, '');

// ---- main -----------------------------------------------------------------

export function applyDailyReportsToP6(
  tables: P6Tables,
  reports: ApprovedDailyReport[],
): ApplyResult {
  const byActivity = new Map<string, ApprovedDailyReport[]>();
  for (const r of reports) {
    if (!byActivity.has(r.activityId)) byActivity.set(r.activityId, []);
    byActivity.get(r.activityId)!.push(r);
  }
  // Stable date ordering per activity
  for (const list of byActivity.values()) list.sort((a, b) => a.date.localeCompare(b.date));

  const activitiesById = new Map(tables.activities.map(a => [a.id, a]));
  const changeLog: ActivityChange[] = [];
  let latestReportDate = tables.project.dataDate?.slice(0, 10) || '';

  for (const [activityId, list] of byActivity) {
    const act = activitiesById.get(activityId);
    if (!act) continue; // silently skip — surfaced in UI as "unmatched"

    const before: ActivityChange = {
      activityId,
      activityName: act.name || activityId,
      beforeStatus: act.status,
      beforePct: act.physicalPctComplete,
      beforeRemainHr: act.remainingDuration,
      sourceReports: list.length,
    };

    const last = list[list.length - 1];
    const first = list[0];
    if (last.date > latestReportDate) latestReportDate = last.date;

    // 1. Actual Start — earliest approved report date if not already set
    if (!act.actualStartDate) {
      const start = isoDateTime(first.date);
      setOrCreateChild(act._el!, 'ActualStartDate', start);
      act.actualStartDate = start;
      before.actualStartSet = start;
    }

    // 2. Percent + remaining
    const ratio = last.contractQty > 0 ? last.cumulativeQty / last.contractQty : 0;
    const completeFlag = last.isComplete || ratio >= 1;
    const planned = act.plannedDuration ?? 0;

    let newPct: number;
    let newRemain: number;
    let newStatus: P6Status;

    if (completeFlag) {
      newPct = 100;
      newRemain = 0;
      newStatus = 'Completed';
      const finish = isoDateTime(last.date);
      setOrCreateChild(act._el!, 'ActualFinishDate', finish);
      act.actualFinishDate = finish;
      before.actualFinishSet = finish;
    } else {
      newPct = Math.round(Math.min(99, Math.max(1, ratio * 100)) * 10) / 10;
      newRemain = Math.round(planned * (1 - newPct / 100) * 100) / 100;
      newStatus = 'In Progress';
    }

    setOrCreateChild(act._el!, 'Status', newStatus);
    setOrCreateChild(act._el!, 'PercentCompleteType', act.pctType || 'Physical');
    setOrCreateChild(act._el!, 'PhysicalPercentComplete', fmtNum(newPct, 1));
    setOrCreateChild(act._el!, 'RemainingDuration', fmtNum(newRemain, 2));

    act.status = newStatus;
    act.physicalPctComplete = newPct;
    act.remainingDuration = newRemain;

    changeLog.push({
      ...before,
      afterStatus: newStatus,
      afterPct: newPct,
      afterRemainHr: newRemain,
    });
  }

  // Bump project DataDate to the latest approved report date.
  if (latestReportDate) {
    const newDataDate = isoDateTime(latestReportDate);
    setOrCreateChild(tables.project._el, 'DataDate', newDataDate);
    tables.project.dataDate = newDataDate;
  }

  return { tables, changeLog, newDataDate: tables.project.dataDate || '' };
}
