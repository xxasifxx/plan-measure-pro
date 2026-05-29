// Shared helpers for WBS rebuild pipeline.
import fs from 'node:fs';
import path from 'node:path';

export const ROOT = process.cwd();
export const WBS_DIR = path.join(ROOT, '.lovable/wbs');

export const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
export const writeJson = (p, obj) => {
  const full = path.join(ROOT, p);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(obj, null, 2));
};

export const slug = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

// Normalize stream variants: "12 Project Health & Controls" ≡ "12 Project Health and Controls"
export const streamKey = (s) => {
  const m = String(s || '').match(/^(\d+)\s+(.*)$/);
  if (!m) return slug(s);
  return `${m[1].padStart(2, '0')}-${slug(m[2])}`;
};

// Jaccard over arrays/sets.
export const jaccard = (a, b) => {
  const A = a instanceof Set ? a : new Set(a);
  const B = b instanceof Set ? b : new Set(b);
  if (!A.size && !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const uni = A.size + B.size - inter;
  return uni === 0 ? 0 : inter / uni;
};

export const STOPWORDS = new Set([
  'a','an','and','or','the','of','to','in','on','for','with','add','fix','update','use','make',
  'is','it','at','by','be','as','from','into','this','that','via','out','up','new','small',
  'wip','work','progress','minor','some','more','support','also','just','set','get','do',
]);

export const tokens = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));

export const daysBetween = (a, b) => {
  if (!a || !b) return null;
  return Math.round((new Date(b) - new Date(a)) / 86400000);
};

export const padId = (prefix, n, width = 4) =>
  `${prefix}${String(n).padStart(width, '0')}`;
