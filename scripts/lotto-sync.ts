// Copies PCSO's 6-number draw results into public.lotto_draws. Run by .github/workflows/lotto-sync.yml, or by hand:
//   node scripts/lotto-sync.ts                 last 7 days
//   node scripts/lotto-sync.ts --months 24     backfill
//   node scripts/lotto-sync.ts --from 2026-10-01 --to 2026-10-21
//   node scripts/lotto-sync.ts --dry-run       read PCSO and report, write nothing (needs no secrets)
// Writing needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
import { parseArgs } from 'node:util';
import { fetchDraws } from '../supabase/functions/lotto-sync/scrape.ts';

const DAY = 86_400_000;
const CHUNK_DAYS = 60;
const { values } = parseArgs({ options: { months: { type: 'string' }, from: { type: 'string' }, to: { type: 'string' }, 'dry-run': { type: 'boolean' } } });
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

// PCSO draws on Philippine time (UTC+8).
const today = new Date(Math.floor((Date.now() + 8 * 3_600_000) / DAY) * DAY);
const to = values.to ? day(values.to) : today;
const months = Math.min(Number(values.months) || 0, 120);
const from = values.from ? day(values.from)
  : months ? new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() - months, to.getUTCDate())) : new Date(to.getTime() - 6 * DAY);
if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) throw new Error('Invalid date range');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!values['dry-run'] && (!url || !key)) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or pass --dry-run');

async function save(rows: object[]) {
  const response = await fetch(`${url}/rest/v1/lotto_draws?on_conflict=game,draw_date`, {
    method: 'POST', body: JSON.stringify(rows),
    headers: { apikey: key!, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
  });
  if (!response.ok) throw new Error(`Saving draws answered ${response.status}: ${await response.text()}`);
}

let total = 0;
const perGame: Record<string, number> = {};
for (let start = from; start <= to; start = new Date(start.getTime() + CHUNK_DAYS * DAY)) {
  const end = new Date(Math.min(start.getTime() + (CHUNK_DAYS - 1) * DAY, to.getTime()));
  const draws = await fetchDraws(start, end);
  for (const d of draws) perGame[d.game] = (perGame[d.game] ?? 0) + 1;
  if (draws.length && !values['dry-run']) {
    await save(draws.map((d) => ({ game: d.game, draw_date: d.drawDate, numbers: d.numbers, jackpot: d.jackpot, winners: d.winners })));
  }
  total += draws.length;
  console.log(`${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}: ${draws.length} draws`);
}
console.log(`${values['dry-run'] ? 'Read' : 'Saved'} ${total} draws`, perGame);
// PCSO draws every day, so a recent range with no draws means the page changed or answered oddly: fail so the workflow turns red.
if (total === 0 && to.getTime() - from.getTime() <= 7 * DAY) throw new Error('No draws found in the last 7 days; check PCSO');
