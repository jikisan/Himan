// Fallback source: GMA News Online republishes PCSO's daily results at /news/lotto/ (the last couple of weeks, all games).
// It has no winner counts, so these draws are saved with winners = 0 and never overwrite a row that already exists.
import { MAX_NUMBER, type Draw, type Game } from './scrape.ts';

const PAGE = 'https://www.gmanetwork.com/news/lotto/';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** The 6-number draws on GMA's results page. */
export function parseGma(html: string): Draw[] {
  const draws: Draw[] = [];
  for (const card of html.split('<div class="lotto-card">').slice(1)) {
    const date = card.match(/<p>(\w+) (\d{1,2}), (\d{4})<\/p>/);
    const month = date && MONTHS.indexOf(date[1]) + 1;
    if (!date || !month) continue;
    for (const r of card.matchAll(/data-type="[^"]*(6\/(?:42|45|49|55|58))"[\s\S]*?<p>([\d ]+)<\/p>\s*<p class="--jackpot">P ([\d,.]+)<\/p>/g)) {
      const game = r[1] as Game;
      const numbers = r[2].trim().split(/\s+/).map(Number);
      if (numbers.length !== 6 || new Set(numbers).size !== 6 || !numbers.every((n) => n >= 1 && n <= MAX_NUMBER[game])) continue;
      draws.push({
        game, numbers, winners: 0, jackpot: Number(r[3].replace(/,/g, '')) || 0,
        drawDate: `${date[3]}-${String(month).padStart(2, '0')}-${date[2].padStart(2, '0')}`,
      });
    }
  }
  return draws;
}

export async function fetchGmaDraws(fetcher: typeof fetch = fetch): Promise<Draw[]> {
  const page = await fetcher(PAGE);
  if (!page.ok) throw new Error(`GMA page answered ${page.status}`);
  const draws = parseGma(await page.text());
  if (!draws.length) throw new Error('GMA page had no 6-number draws');
  return draws;
}
