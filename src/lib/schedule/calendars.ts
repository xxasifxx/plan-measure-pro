// Calendar helpers: convert ScheduleCalendar → workday set, parse P6 calendar
// definitions from XER (clndr_data blob) and PMXML (<Calendar>).
import type { CalendarException, ScheduleCalendar } from './types';

export const DEFAULT_WORKWEEK: Record<string, number> = {
  '0': 0, '1': 8, '2': 8, '3': 8, '4': 8, '5': 8, '6': 0,
};

/** Workday weekday indices (0..6) for a calendar — any day with hours>0. */
export function workdaySet(cal?: ScheduleCalendar | null): Set<number> {
  const ww = cal?.workweek ?? DEFAULT_WORKWEEK;
  const out = new Set<number>();
  for (const k of Object.keys(ww)) if (Number(ww[k]) > 0) out.add(Number(k));
  if (out.size === 0) [1, 2, 3, 4, 5].forEach(d => out.add(d));
  return out;
}

/** Exception lookup map keyed on YYYY-MM-DD. */
export function exceptionMap(cal?: ScheduleCalendar | null): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of cal?.exceptions ?? []) m.set(e.date.slice(0, 10), Number(e.hours || 0));
  return m;
}

/** Test if an ISO date is a working day under a calendar (workweek + exceptions). */
export function isWorkdayCal(iso: string, cal?: ScheduleCalendar | null): boolean {
  const ex = exceptionMap(cal);
  if (ex.has(iso)) return (ex.get(iso) ?? 0) > 0;
  const wd = new Date(iso + 'T00:00:00Z').getUTCDay();
  return workdaySet(cal).has(wd);
}

// ============ XER CALENDAR parsing ============
// clndr_data is a P6 mini-language: "(0||1()(s|...)(s|...)...|0||...)" etc.
// We only need: working days of week + holiday/exception dates.
// We use a tolerant regex-based parser that handles most real-world exports.

interface ParsedClndrData {
  workweek: Record<string, number>;
  exceptions: CalendarException[];
}

export function parseClndrData(raw?: string): ParsedClndrData {
  const workweek: Record<string, number> = { ...DEFAULT_WORKWEEK };
  const exceptions: CalendarException[] = [];
  if (!raw) return { workweek, exceptions };

  // Standard P6 weekday section: "(0||1()(0|0)..." we look for "DaysOfWeek" or "(d|N|" patterns.
  // P6 emits day blocks like "(0||1()0)" => day 1 (Sunday) non-working,
  // or "(0||2()(s|07:00|f|15:00)(s|...)) " => day 2 (Monday) with shift.
  const dayMatches = raw.matchAll(/\(0\|\|([1-7])\(\)([^()]*(?:\([^()]*\)[^()]*)*)\)/g);
  for (const m of dayMatches) {
    const dayP6 = Number(m[1]); // 1=Sunday in P6
    const body = m[2];
    const shifts = body.match(/\(s\|(\d{1,2}):(\d{2})\|f\|(\d{1,2}):(\d{2})\)/g) || [];
    let hours = 0;
    for (const sh of shifts) {
      const mm = sh.match(/\(s\|(\d{1,2}):(\d{2})\|f\|(\d{1,2}):(\d{2})\)/)!;
      const sH = +mm[1] + +mm[2] / 60;
      const fH = +mm[3] + +mm[4] / 60;
      hours += Math.max(0, fH - sH);
    }
    // P6: 1=Sun..7=Sat → our: 0=Sun..6=Sat
    workweek[String(dayP6 - 1)] = Math.round(hours * 100) / 100;
  }

  // Holiday / exception sections often look like (d|<serialdate>|<hrs>)
  // The serial date is days since 1899-12-30 (Excel-style).
  const excMatches = raw.matchAll(/\(d\|(\d+)\|(\d+(?:\.\d+)?)\)/g);
  for (const m of excMatches) {
    const serial = Number(m[1]);
    const hrs = Number(m[2]);
    const date = excelSerialToISO(serial);
    if (date) exceptions.push({ date, hours: hrs });
  }
  return { workweek, exceptions };
}

function excelSerialToISO(serial: number): string | null {
  if (!Number.isFinite(serial) || serial <= 0) return null;
  // Excel epoch 1899-12-30 (compensates for the 1900 leap-year bug).
  const ms = (serial - 25569) * 86400000;
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

// ============ PMXML <Calendar> parsing ============

export function parsePmxmlCalendar(el: Element): ParsedClndrData {
  const workweek: Record<string, number> = { ...DEFAULT_WORKWEEK };
  const exceptions: CalendarException[] = [];
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  // <StandardWorkWeek><StandardWorkHours><DayOfWeek>Monday</DayOfWeek><WorkTime>...</WorkTime>
  const sww = Array.from(el.getElementsByTagName('*')).find(n => n.localName === 'StandardWorkWeek');
  if (sww) {
    for (const swh of Array.from(sww.children)) {
      if (swh.localName !== 'StandardWorkHours') continue;
      const dayText = Array.from(swh.children).find(c => c.localName === 'DayOfWeek')?.textContent?.trim();
      const idx = dayNames.indexOf(dayText || '');
      if (idx < 0) continue;
      let hours = 0;
      for (const c of Array.from(swh.children)) {
        if (c.localName !== 'WorkTime') continue;
        const s = Array.from(c.children).find(x => x.localName === 'Start')?.textContent;
        const f = Array.from(c.children).find(x => x.localName === 'Finish')?.textContent;
        if (s && f) hours += hoursBetween(s, f);
      }
      workweek[String(idx)] = Math.round(hours * 100) / 100;
    }
  }

  // <HolidayOrExceptions><HolidayOrException><Date>...</Date><WorkTime>...</WorkTime></...>
  const hox = Array.from(el.getElementsByTagName('*')).find(n => n.localName === 'HolidayOrExceptions');
  if (hox) {
    for (const h of Array.from(hox.children)) {
      if (h.localName !== 'HolidayOrException') continue;
      const dateRaw = Array.from(h.children).find(c => c.localName === 'Date')?.textContent;
      if (!dateRaw) continue;
      let hours = 0;
      for (const c of Array.from(h.children)) {
        if (c.localName !== 'WorkTime') continue;
        const s = Array.from(c.children).find(x => x.localName === 'Start')?.textContent;
        const f = Array.from(c.children).find(x => x.localName === 'Finish')?.textContent;
        if (s && f) hours += hoursBetween(s, f);
      }
      exceptions.push({ date: dateRaw.slice(0, 10), hours });
    }
  }
  return { workweek, exceptions };
}

function hoursBetween(s: string, f: string): number {
  // Accepts "07:00" or full datetimes; we just parse HH:MM.
  const sp = s.match(/(\d{1,2}):(\d{2})/);
  const fp = f.match(/(\d{1,2}):(\d{2})/);
  if (!sp || !fp) return 0;
  const sH = +sp[1] + +sp[2] / 60;
  const fH = +fp[1] + +fp[2] / 60;
  return Math.max(0, fH - sH);
}
