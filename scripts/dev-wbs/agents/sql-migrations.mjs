#!/usr/bin/env node
// L1 parser: sql-migrations
// Per migration file, extracts a coarse object-delta record so downstream
// agents can attribute capability changes to migrations.
import { walk, read, emit, SUPABASE } from "./_shared.mjs";

const files = walk(`${SUPABASE}/migrations`, { include: (r) => r.endsWith(".sql") });

const out = files.map((rel) => {
  const text = read(rel);
  const lower = text.toLowerCase();

  const findAll = (re) => {
    const m = [];
    let x;
    while ((x = re.exec(text)) !== null) m.push(x[1]);
    return [...new Set(m)];
  };

  return {
    file: rel,
    loc: text.split("\n").length,
    bytes: text.length,
    createTables: findAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z0-9_]+)/gi),
    alterTables: findAll(/alter\s+table\s+(?:public\.)?([a-z0-9_]+)/gi),
    dropTables: findAll(/drop\s+table\s+(?:if\s+exists\s+)?(?:public\.)?([a-z0-9_]+)/gi),
    createFunctions: findAll(/create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([a-z0-9_]+)/gi),
    dropFunctions: findAll(/drop\s+function\s+(?:if\s+exists\s+)?(?:public\.)?([a-z0-9_]+)/gi),
    createTriggers: findAll(/create\s+(?:or\s+replace\s+)?trigger\s+([a-z0-9_]+)/gi),
    createTypes: findAll(/create\s+type\s+(?:public\.)?([a-z0-9_]+)/gi),
    createPolicies: (text.match(/create\s+policy\s+"([^"]+)"/gi) || []).map((s) => s.match(/"([^"]+)"/)[1]),
    enableRls: findAll(/alter\s+table\s+(?:public\.)?([a-z0-9_]+)\s+enable\s+row\s+level\s+security/gi),
    grants: (text.match(/grant\s+[^;]+;/gi) || []).map((g) => g.replace(/\s+/g, " ").trim().slice(0, 200)),
    addColumns: findAll(/add\s+column\s+(?:if\s+not\s+exists\s+)?([a-z0-9_]+)/gi),
    dropColumns: findAll(/drop\s+column\s+(?:if\s+exists\s+)?([a-z0-9_]+)/gi),
    storageBuckets: findAll(/insert\s+into\s+storage\.buckets[^;]*values\s*\(\s*'([^']+)'/gi),
    hasIndex: /\bcreate\s+(?:unique\s+)?index\b/i.test(text),
    hasRealtime: /supabase_realtime/.test(lower),
  };
});

emit("sql-migrations", { migrationCount: out.length, migrations: out });
