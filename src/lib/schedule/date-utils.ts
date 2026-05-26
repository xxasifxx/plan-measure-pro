// Workday-aware date math. Calendar = set of weekday indices 0..6 (Sun..Sat).
// Default: Mon-Fri.

const DEFAULT_WORKDAYS = new Set([1, 2, 3, 4, 5]);

export function toISO(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISO(s: string): Date {
  // Parse as UTC midnight to avoid TZ drift.
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function isWorkday(d: Date, workdays = DEFAULT_WORKDAYS): boolean {
  return workdays.has(d.getUTCDay());
}

/** Add n workdays to an ISO date. If d is non-workday, snaps forward first. */
export function addWorkdays(iso: string, n: number, workdays = DEFAULT_WORKDAYS): string {
  const d = parseISO(iso);
  // Snap to next workday if needed
  while (!isWorkday(d, workdays)) d.setUTCDate(d.getUTCDate() + 1);
  let remaining = Math.round(n);
  const dir = remaining >= 0 ? 1 : -1;
  remaining = Math.abs(remaining);
  while (remaining > 0) {
    d.setUTCDate(d.getUTCDate() + dir);
    if (isWorkday(d, workdays)) remaining--;
  }
  return toISO(d);
}

/** Number of workdays between two ISO dates (inclusive of start, exclusive of end). */
export function diffWorkdays(aISO: string, bISO: string, workdays = DEFAULT_WORKDAYS): number {
  let a = parseISO(aISO);
  const b = parseISO(bISO);
  const dir = a <= b ? 1 : -1;
  let n = 0;
  while ((dir > 0 ? a < b : a > b)) {
    a.setUTCDate(a.getUTCDate() + dir);
    if (isWorkday(a, workdays)) n += dir;
  }
  return n;
}

/** Calendar-day diff (no calendar awareness). */
export function diffDays(aISO: string, bISO: string): number {
  return Math.round((parseISO(bISO).getTime() - parseISO(aISO).getTime()) / 86400000);
}

export function todayISO(): string {
  return toISO(new Date());
}

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
