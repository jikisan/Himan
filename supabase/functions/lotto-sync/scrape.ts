// Reads PCSO's "Search Lotto Result" page (ASP.NET WebForms) for the five 6-number games. No Deno or Node APIs besides
// fetch, so it runs in the edge function and under Node for tests.

const PAGE = 'https://www.pcso.gov.ph/SearchLottoResult.aspx';
const FORM = 'ctl00$ctl00$cphContainer$cpContent$';

/** The game's number range; PCSO's own list ids are not needed since we always search "All Games". */
export const MAX_NUMBER = { '6/42': 42, '6/45': 45, '6/49': 49, '6/55': 55, '6/58': 58 } as const;
export type Game = keyof typeof MAX_NUMBER;

export interface Draw { game: Game; drawDate: string; numbers: number[]; jackpot: number; winners: number }

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const text = (cell: string) => cell.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

/** The 6-number draws in a results page. Rows for other games, and rows that don't look like a real draw, are skipped. */
export function parseDraws(html: string): Draw[] {
  const draws: Draw[] = [];
  for (const row of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => text(c[1]));
    if (cells.length < 5) continue;
    const game = cells[0].match(/6\/(42|45|49|55|58)\b/)?.[0] as Game | undefined;
    const date = cells[2].match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!game || !date) continue;
    const numbers = cells[1].split('-').map((n) => Number(n.trim()));
    const valid = numbers.length === 6 && new Set(numbers).size === 6 && numbers.every((n) => Number.isInteger(n) && n >= 1 && n <= MAX_NUMBER[game]);
    if (!valid) continue;
    draws.push({
      game, numbers,
      drawDate: `${date[3]}-${date[1].padStart(2, '0')}-${date[2].padStart(2, '0')}`,
      jackpot: Number(cells[3].replace(/,/g, '')) || 0,
      winners: Number(cells[4].replace(/,/g, '')) || 0,
    });
  }
  return draws;
}

const attr = (tag: string, name: string) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? '';
const decode = (v: string) => v.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** The form's hidden fields (view state and the rest), which a search must send back. */
export function hiddenFields(html: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const tag of html.match(/<input[^>]*type="hidden"[^>]*>/g) ?? []) fields[attr(tag, 'name')] = decode(attr(tag, 'value'));
  return fields;
}

/** The form body for searching all games from `from` to `to` (inclusive), dates as UTC calendar days. */
export function searchBody(html: string, from: Date, to: Date): URLSearchParams {
  return new URLSearchParams({
    ...hiddenFields(html),
    [`${FORM}ddlStartMonth`]: MONTHS[from.getUTCMonth()], [`${FORM}ddlStartDate`]: String(from.getUTCDate()), [`${FORM}ddlStartYear`]: String(from.getUTCFullYear()),
    [`${FORM}ddlEndMonth`]: MONTHS[to.getUTCMonth()], [`${FORM}ddlEndDay`]: String(to.getUTCDate()), [`${FORM}ddlEndYear`]: String(to.getUTCFullYear()),
    [`${FORM}ddlSelectGame`]: '0', [`${FORM}btnSearch`]: 'Search Lotto',
  });
}

/** Draws from `from` to `to`. Throws when PCSO answers with an error, so a block or outage is never mistaken for "no draws". */
export async function fetchDraws(from: Date, to: Date, fetcher: typeof fetch = fetch): Promise<Draw[]> {
  const page = await fetcher(PAGE);
  if (!page.ok) throw new Error(`PCSO page answered ${page.status}`);
  const html = await page.text();
  const cookie = (page.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
  const result = await fetcher(PAGE, {
    method: 'POST', body: searchBody(html, from, to),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: PAGE, ...(cookie ? { Cookie: cookie } : {}) },
  });
  if (!result.ok) throw new Error(`PCSO search answered ${result.status}`);
  const body = await result.text();
  if (!body.includes('search-lotto-result-table')) throw new Error('PCSO search page had no results table');
  return parseDraws(body);
}
