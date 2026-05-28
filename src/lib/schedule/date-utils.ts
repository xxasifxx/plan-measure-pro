// Workday-aware date math. A workday is any weekday in `workdays` AND not in
// the optional non-working exceptions set; working exceptions add otherwise-off
// days back in.

const DEFAULT_WORKDAYS = new Set([1, 2, 3, 4, 5]);

export interface WorkCalendar {
  workdays?: Set<number>;
  exceptions?: Map<string, number>; // YYYY-MM-DD → hours (0 = non-working override)
}

function asCal(input?: Set<number> | WorkCalendar): WorkCalendar {
  if (!input) return { workdays: DEFAULT_WORKDAYS };
  if (input instanceof Set) return { workdays: input };
  return input;
}

export function toISO(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function isWorkday(d: Date, input?: Set<number> | WorkCalendar): boolean {
  const cal = asCal(input);
  const iso = toISO(d);
  const ex = cal.exceptions?.get(iso);
  if (ex !== undefined) return ex > 0;
  return (cal.workdays ?? DEFAULT_WORKDAYS).has(d.getUTCDay());
}

export function addWorkdays(iso: string, n: number, input?: Set<number> | WorkCalendar): string {
  const cal = asCal(input);
  // L-3: guard against malformed calendars that have no working days.
  if ((cal.workdays ?? DEFAULT_WORKDAYS).size === 0) {
    throw new Error('addWorkdays: calendar has no working days');
  }
  const d = parseISO(iso);
  while (!isWorkday(d, cal)) d.setUTCDate(d.getUTCDate() + 1);
  // M-1: preserve fractional lags conservatively (P6 rounds up partial days).
  // For 0 < |n| < 1 this means at least one workday is consumed.
  let remaining = n >= 0 ? Math.ceil(n) : -Math.ceil(-n);
  const dir = remaining >= 0 ? 1 : -1;
  remaining = Math.abs(remaining);
  let guard = 0;
  while (remaining > 0) {
    d.setUTCDate(d.getUTCDate() + dir);
    if (isWorkday(d, cal)) remaining--;
    if (++guard > 365 * 50) break;
  }
  return toISO(d);
}

export function diffWorkdays(aISO: string, bISO: string, input?: Set<number> | WorkCalendar): number {
  const cal = asCal(input);
  let a = parseISO(aISO);
  const b = parseISO(bISO);
  const dir = a <= b ? 1 : -1;
  let n = 0;
  let guard = 0;
  while ((dir > 0 ? a < b : a > b)) {
    a.setUTCDate(a.getUTCDate() + dir);
    if (isWorkday(a, cal)) n += dir;
    if (++guard > 365 * 50) break;
  }
  return n;
}

export function diffDays(aISO: string, bISO: string): number {
  return Math.round((parseISO(bISO).getTime() - parseISO(aISO).getTime()) / 86400000);
}

export function todayISO(): string { return toISO(new Date()); }

export function maxISO(a?: string | null, b?: string | null): string | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return a > b ? a : b;
}
export function minISO(a?: string | null, b?: string | null): string | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return a < b ? a : b;
}
