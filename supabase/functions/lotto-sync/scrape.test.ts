// Run with: node --test supabase/functions/lotto-sync/scrape.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hiddenFields, parseDraws, searchBody } from './scrape.ts';

const row = (...cells: string[]) => `<tr>${cells.map((c) => `<td valign="middle">${c}</td>`).join('')}</tr>`;
const table = (...rows: string[]) => `<table class="search-lotto-result-table"><tr><th>LOTTO GAME</th></tr>${rows.join('')}</table>`;

test('reads 6-number draws, keeping the drawn order and the PHP amounts', () => {
  const [draw] = parseDraws(table(row('Grand Lotto 6/55', '13-08-42-14-30-12', '10/21/2026', '291,393,293.85', '0')));
  assert.deepEqual(draw, { game: '6/55', numbers: [13, 8, 42, 14, 30, 12], drawDate: '2026-10-21', jackpot: 291393293.85, winners: 0 });
});

test('skips other games and rows that cannot be a real draw', () => {
  const draws = parseDraws(table(
    row('4D Lotto', '3-2-1-6', '10/21/2026', '21,714.00', '22'),
    row('Lotto 6/42', '20-26-30-42-15-07', '10/20/2026', '10,000,000.00', '0'),
    row('Megalotto 6/45', '09-43-40-03-07-46', '10/19/2026', '15,000,000.00', '0'), // 46 is out of range
    row('Megalotto 6/45', '09-43-40-03-07-07', '10/19/2026', '15,000,000.00', '0'), // repeated number
    row('Superlotto 6/49', '48-01-23-15-26', '10/20/2026', '1.00', '0'), // five numbers
  ));
  assert.deepEqual(draws.map((d) => d.game), ['6/42']);
});

test('sends the form back with the date range and all games', () => {
  const html = '<input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="a&amp;b=" /><input type="hidden" name="__EVENTVALIDATION" value="c" />';
  assert.deepEqual(hiddenFields(html), { __VIEWSTATE: 'a&b=', __EVENTVALIDATION: 'c' });
  const body = searchBody(html, new Date(Date.UTC(2026, 0, 5)), new Date(Date.UTC(2026, 9, 21)));
  assert.equal(body.get('ctl00$ctl00$cphContainer$cpContent$ddlStartMonth'), 'January');
  assert.equal(body.get('ctl00$ctl00$cphContainer$cpContent$ddlEndDay'), '21');
  assert.equal(body.get('ctl00$ctl00$cphContainer$cpContent$ddlSelectGame'), '0');
  assert.equal(body.get('__VIEWSTATE'), 'a&b=');
});
