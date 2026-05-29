// Git date lookup with caching. First-add and last-touch dates per path.
import { execSync } from 'node:child_process';

const cache = new Map();

export function gitDates(path) {
  if (cache.has(path)) return cache.get(path);
  let firstISO, lastISO;
  try {
    firstISO = execSync(
      `git log --diff-filter=A --follow --format=%aI -- "${path}" | tail -1`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim() || undefined;
    lastISO = execSync(
      `git log -1 --format=%aI -- "${path}"`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim() || undefined;
  } catch { /* file may not exist in git */ }
  const result = { first: firstISO, last: lastISO };
  cache.set(path, result);
  return result;
}

/** Earliest first-add across a list of paths. */
export function earliestFirst(paths) {
  const dates = paths.map(p => gitDates(p).first).filter(Boolean).sort();
  return dates[0];
}

/** Latest last-touch across a list of paths. */
export function latestLast(paths) {
  const dates = paths.map(p => gitDates(p).last).filter(Boolean).sort();
  return dates[dates.length - 1];
}
