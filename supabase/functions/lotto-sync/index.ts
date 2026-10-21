// Copies PCSO's 6-number draw results into public.lotto_draws. Called by pg_cron (see the lotto migration) with the
// service role key. Body: {} for the last 7 days, { months: 24 } to backfill, or { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { fetchDraws } from './scrape.ts';

const DAY = 86_400_000;
const CHUNK_DAYS = 60;
const MAX_MONTHS = 120;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

Deno.serve(async (req) => {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  // verify_jwt lets any signed-in user through; only the service role may run a sync.
  if (req.headers.get('Authorization') !== `Bearer ${key}`) return json({ error: 'Forbidden' }, 403);

  const body = await req.json().catch(() => ({}));
  // PCSO draws on Philippine time (UTC+8).
  const today = new Date(Math.floor((Date.now() + 8 * 3_600_000) / DAY) * DAY);
  const months = Math.min(Number(body.months) || 0, MAX_MONTHS);
  const to = typeof body.to === 'string' ? day(body.to) : today;
  const from = typeof body.from === 'string' ? day(body.from)
    : months ? new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() - months, to.getUTCDate())) : new Date(to.getTime() - 6 * DAY);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return json({ error: 'Invalid range' }, 400);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, key);
  let saved = 0;
  try {
    for (let start = from; start <= to; start = new Date(start.getTime() + CHUNK_DAYS * DAY)) {
      const end = new Date(Math.min(start.getTime() + (CHUNK_DAYS - 1) * DAY, to.getTime()));
      const rows = (await fetchDraws(start, end)).map((d) => ({
        game: d.game, draw_date: d.drawDate, numbers: d.numbers, jackpot: d.jackpot, winners: d.winners,
      }));
      if (rows.length) {
        const { error } = await supabase.from('lotto_draws').upsert(rows, { onConflict: 'game,draw_date' });
        if (error) throw error;
        saved += rows.length;
      }
    }
  } catch (error) {
    console.error('lotto-sync failed', error);
    return json({ error: error instanceof Error ? error.message : 'Sync failed', saved }, 502);
  }
  return json({ saved, from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) });
});
