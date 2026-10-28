import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Runs against a local Supabase stack with every migration applied, never the hosted project:
//   RENTALS_E2E_SERVICE_KEY=<local service_role key> VITE_SUPABASE_URL=<local API url> \
//   VITE_SUPABASE_ANON_KEY=<local anon key> npx playwright test rentals
// Each run signs up its own owner, so runs and projects never share data. Skipped without the service key.
const serviceKey = process.env.RENTALS_E2E_SERVICE_KEY;
const apiUrl = process.env.VITE_SUPABASE_URL ?? '';
test.skip(!serviceKey || !/localhost|127\.0\.0\.1/.test(apiUrl), 'Needs a local Supabase stack (RENTALS_E2E_SERVICE_KEY)');

const admin = (path: string, body: unknown) => fetch(`${apiUrl}${path}`, {
  method: 'POST', body: JSON.stringify(body),
  headers: { apikey: serviceKey!, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
});

async function signUp(page: Page) {
  const email = `rentals-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  const password = crypto.randomUUID();
  await admin('/rest/v1/signup_allowlist', { email });
  const res = await admin('/auth/v1/admin/users', { email, password, email_confirm: true });
  expect(res.ok, `creating the test owner failed: ${await res.text()}`).toBe(true);
  await page.goto('/login');
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL('**/dashboard');
}

test.use({ actionTimeout: 10_000 });

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const now = new Date();
const moveIn = ymd(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 5)));

// A 1×1 PNG, enough for an ID photo upload.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

/** Draws a short stroke on the signature pad. */
async function draw(page: Page) {
  // The last pad on screen: the countersign dialog's, or the tenant's own.
  const canvas = page.locator('canvas').last();
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + box.height / 2);
  await page.mouse.down();
  for (const x of [60, 100, 140, 180]) await page.mouse.move(box.x + x, box.y + box.height / 2 + (x % 40 ? 15 : -15), { steps: 4 });
  await page.mouse.up();
}

const shot = (page: Page, info: { outputPath(name: string): string }, name: string) =>
  page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true });

test('sets up a property, adds a tenant, bills and settles them', async ({ page }, info) => {
  test.setTimeout(180_000);
  let link = '';
  let propertyPath = '';
  // Each section of the property is its own address.
  const open = (section: 'todo' | 'rooms' | 'tenants' | 'bills') => page.goto(`${propertyPath}/${section}`);
  await signUp(page);
  await page.goto('/rentals');

  await test.step('setup wizard, with errors shown on the field', async () => {
    await expect(page.getByRole('heading', { level: 1, name: 'Rentals' })).toBeVisible();
    await page.getByRole('button', { name: 'New property' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    const name = page.getByLabel(/^Property name/);
    await expect(name).toBeFocused();
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await shot(page, info, '01-setup-error');
    await name.fill('E2E Boarding House');
    await page.getByLabel(/^Rent is due every/).fill('5');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByLabel(/^Room name/).first().fill('Room A');
    await page.getByLabel(/^Usual rent/).first().fill('5000');
    await page.getByRole('button', { name: 'Add another room' }).click();
    await page.getByLabel(/^Room name/).nth(1).fill('Room B');
    await shot(page, info, '02-setup-rooms');
    await page.getByRole('button', { name: 'Next' }).click();
    await shot(page, info, '03-setup-utilities');
    await page.getByRole('button', { name: 'Finish setup' }).click();
    // Setup lands on the new property's Rooms screen.
    await expect(page.getByRole('heading', { level: 1, name: 'Rooms' })).toBeVisible();
    await expect(page).toHaveURL(/\/rentals\/[^/]+\/rooms$/);
    propertyPath = new URL(page.url()).pathname.replace(/\/rooms$/, '');
    await shot(page, info, '04-rooms');
  });

  await test.step('move-in: add tenant, pay, then the contract', async () => {
    await page.getByRole('region', { name: 'Room A' }).getByRole('button', { name: 'Add tenant' }).click();
    const flow = page.getByRole('dialog');
    await flow.getByRole('button', { name: 'Next: payment' }).click();
    await expect(flow.getByLabel(/^Full name/)).toBeFocused();
    await flow.getByLabel(/^Full name/).fill('Ana Cruz');
    await flow.getByLabel(/^Mobile number/).fill('0917 123 4567');
    // Three months back, so monthly SOAs are already due after the advance month.
    await flow.getByLabel(/^Move-in date/).fill(moveIn);
    await shot(page, info, '05-move-in-tenant');
    await flow.getByRole('button', { name: 'Next: payment' }).click();
    await expect(flow.getByRole('region', { name: 'Move-in bill' })).toBeVisible();
    await shot(page, info, '06-move-in-pay');
    await flow.getByRole('button', { name: 'Record payment and add tenant' }).click();
    await expect(flow.getByText('Tenant added')).toBeVisible();
    await flow.getByRole('button', { name: 'Next: contract' }).click();
    await shot(page, info, '07-move-in-contract');
    // The property's own details are asked once, so the contract has no blanks.
    await flow.getByRole('button', { name: 'Save and continue' }).click();
    await expect(flow.getByLabel(/^City where the contract is signed/)).toBeFocused();
    await flow.getByLabel(/^City where the contract is signed/).fill('Cebu City');
    await flow.getByLabel(/^Your full name \(lessor\)/).fill('Owen Owner');
    await flow.getByLabel(/^Your civil status/).selectOption('single');
    await flow.getByLabel(/^Your home address/).fill('Lahug, Cebu City');
    await flow.getByLabel(/^Property address/).fill('12 Gorordo Ave, Cebu City');
    await flow.getByRole('button', { name: 'Save and continue' }).click();
    const preview = flow.getByRole('region', { name: 'Preview' });
    await expect(preview).toContainText('at Cebu City, by and between: Owen Owner, of legal age, single');
    // The only blank left is the tenant's own address, which they fill in when signing.
    expect((await preview.textContent())!.match(/_{4,}/g)).toHaveLength(1);
    await expect(preview).toContainText('Ana Cruz, also of legal age, and residing at ____');
    await shot(page, info, '08-move-in-editor');
    await flow.getByRole('button', { name: 'Save draft' }).click();
    await expect(flow.getByText('Draft, not sent yet')).toBeVisible();
    await flow.getByRole('button', { name: 'Generate contract' }).click();
    await expect(flow.getByText('Waiting for the tenant to sign')).toBeVisible();
    await expect(flow.getByRole('button', { name: 'Copy link' })).toBeEnabled();
    await shot(page, info, '09-move-in-generated');
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await flow.getByRole('button', { name: 'Copy link' }).click();
    link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link).toMatch(/\/r\/[\w-]+$/);
    await flow.getByRole('button', { name: 'Close', exact: true }).last().click();
    await expect(flow).toBeHidden();
  });

  await test.step('tenant link: send details with an ID, then sign as the name in the contract', async () => {
    const tenant = await page.context().newPage();
    await tenant.goto(new URL(link).pathname);
    await expect(tenant.getByRole('button', { name: 'Send my details' })).toBeVisible();
    await tenant.getByRole('button', { name: 'Send my details' }).click();
    await expect(tenant.getByLabel(/^Mobile number/)).toBeVisible();
    await tenant.getByLabel(/^Full name/).fill('Ana Cruz');
    await tenant.getByLabel(/^Mobile number/).fill('0917 123 4567');
    await tenant.getByLabel(/^Home address/).fill('5 Pajo, Lapu-Lapu City');
    await tenant.getByLabel(/^Emergency contact name/).fill('Rosa Cruz');
    await tenant.getByLabel(/^Emergency contact number/).fill('0918 333 4444');
    await tenant.getByLabel(/^Valid ID/).setInputFiles({ name: 'id.png', mimeType: 'image/png', buffer: PNG });
    await tenant.getByRole('checkbox').check();
    await shot(tenant, info, '09a-tenant-details');
    await tenant.getByRole('button', { name: 'Send my details' }).click();
    await expect(tenant.getByText('Signing as')).toBeVisible();
    await expect(tenant.getByText('Signing as').locator('..')).toContainText('Signing as Ana Cruz');
    await expect(tenant.getByRole('article')).toContainText('residing at 5 Pajo, Lapu-Lapu City');
    await draw(tenant);
    await shot(tenant, info, '09b-tenant-sign');
    await tenant.getByRole('button', { name: 'Sign', exact: true }).click();
    await expect(tenant.getByText(/You signed|Signed/).first()).toBeVisible();
    await shot(tenant, info, '09c-tenant-signed');
    await tenant.close();
  });

  await test.step('owner accepts the details and countersigns', async () => {
    await open('tenants');
    await page.getByRole('button', { name: 'View Ana Cruz' }).click();
    const sheet = page.getByRole('dialog');
    await sheet.getByRole('region', { name: 'Details to review' }).getByRole('button', { name: 'Accept' }).click();
    await expect(sheet.getByRole('region', { name: 'Details to review' })).toBeHidden();
    await sheet.getByRole('button', { name: 'Countersign' }).click();
    const sign = page.getByRole('dialog', { name: 'Countersign the contract' });
    await draw(page);
    await shot(page, info, '09d-countersign');
    await sign.getByRole('button', { name: 'Sign and countersign' }).click();
    await expect(sign).toBeHidden();
    await expect(sheet.getByText('Signed by both')).toBeVisible();
    await shot(page, info, '09e-signed-by-both');
    await sheet.getByRole('button', { name: 'Close' }).first().click();
  });

  await test.step('bills: generate next month, view the SOA, record a payment', async () => {
    await open('bills');
    await shot(page, info, '10-bills-this-month');
    const row = page.getByRole('listitem').filter({ hasText: 'Ana Cruz' });
    await row.getByRole('button', { name: /Generate SOA/ }).click();
    await expect(row.getByText(/SOA no\./)).toBeVisible();
    await row.getByRole('button', { name: /View SOA|View Ana Cruz/ }).click();
    const sheet = page.getByRole('dialog');
    await shot(page, info, '12-bill-sheet');
    await sheet.getByRole('button', { name: 'Record payment' }).click();
    const pay = page.getByRole('dialog', { name: /Record payment/ });
    await shot(page, info, '13-record-payment');
    await pay.getByRole('button', { name: 'Save payment' }).click();
    await expect(pay).toBeHidden();
    await expect(sheet.getByText(/Paid/).first()).toBeVisible();
    await shot(page, info, '14-bill-paid');
    await sheet.getByRole('button', { name: 'Close' }).first().click();
  });

  await test.step('move out, then settle the deposit', async () => {
    await open('tenants');
    await page.getByRole('button', { name: 'View Ana Cruz' }).click();
    const sheet = page.getByRole('dialog');
    await shot(page, info, '15-tenant-sheet');
    await sheet.getByRole('button', { name: /^Move Ana Cruz out/ }).click();
    const out = page.getByRole('dialog', { name: 'Move out Ana Cruz?' });
    await out.getByRole('button', { name: 'Confirm move out' }).click();
    await expect(out).toBeHidden();
    await sheet.getByRole('button', { name: 'Settle deposit' }).click();
    const settle = page.getByRole('dialog', { name: 'Settle deposit' });
    await shot(page, info, '16-settle');
    await settle.getByRole('button', { name: 'Save settlement' }).click();
    await shot(page, info, '17-settle-confirm');
    await expect(settle.getByText('Refund ₱5,000 to Ana Cruz?')).toBeVisible();
    await settle.getByRole('button', { name: 'Yes, settle deposit' }).click();
    await expect(page.getByRole('dialog', { name: 'Deposit settled' })).toBeVisible();
    await shot(page, info, '18-settled');
  });
});
