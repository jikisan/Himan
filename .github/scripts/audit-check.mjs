// Fails when `npm audit` reports a high or critical advisory that is not in
// .github/audit-baseline.json. Existing advisories are tolerated until fixed.
//
//   node .github/scripts/audit-check.mjs            check against the baseline
//   node .github/scripts/audit-check.mjs --update   rewrite the baseline from the current audit
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const BASELINE = new URL('../audit-baseline.json', import.meta.url);
const BLOCKING = new Set(['high', 'critical']);

const runAudit = () => {
  try {
    return execFileSync('npm', ['audit', '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    // npm audit exits non-zero when it finds anything; the report is still on stdout.
    if (error.stdout) return error.stdout;
    throw error;
  }
};

const report = JSON.parse(runAudit());
if (report.error) {
  console.error(`npm audit failed: ${report.error.summary ?? JSON.stringify(report.error)}`);
  process.exit(2);
}

// Each advisory appears once per affected package, so key them by GHSA id.
const found = new Map();
for (const vuln of Object.values(report.vulnerabilities ?? {})) {
  for (const via of vuln.via) {
    if (typeof via === 'string' || !BLOCKING.has(via.severity)) continue;
    const id = via.url?.split('/').pop() ?? String(via.source);
    const entry = found.get(id) ?? { id, severity: via.severity, title: via.title, packages: new Set() };
    entry.packages.add(via.name);
    found.set(id, entry);
  }
}

if (process.argv.includes('--update')) {
  const ids = [...found.keys()].sort();
  writeFileSync(BASELINE, JSON.stringify({ advisories: ids }, null, 2) + '\n');
  console.log(`Baseline written with ${ids.length} advisories.`);
  process.exit(0);
}

const known = new Set(JSON.parse(readFileSync(BASELINE, 'utf8')).advisories);
const added = [...found.values()].filter((a) => !known.has(a.id));
const fixed = [...known].filter((id) => !found.has(id));

if (fixed.length > 0) {
  console.log(`${fixed.length} baseline advisories no longer appear. Run with --update to prune them:`);
  fixed.forEach((id) => console.log(`  ${id}`));
}

if (added.length > 0) {
  console.error(`\n${added.length} new high/critical advisories not in the baseline:\n`);
  for (const a of added) {
    console.error(`  [${a.severity}] ${a.title} (${[...a.packages].join(', ')})`);
    console.error(`    https://github.com/advisories/${a.id}`);
  }
  console.error('\nUpgrade or replace the affected package. If it cannot be fixed yet, add the id to .github/audit-baseline.json.');
  process.exit(1);
}

console.log(`No new high/critical advisories (${found.size} known, all in the baseline).`);
