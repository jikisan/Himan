import { test, expect } from '@playwright/test';
import { loadEnv } from 'vite';

const { VITE_SUPABASE_URL: supabaseUrl } = loadEnv('development', process.cwd(), 'VITE_');
const owner = '00000000-0000-0000-0000-00000000f001';
const pdfContent = 'BT /F1 18 Tf 50 180 Td (Sample document) Tj ET\n';
const pdfObjects = [
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 250] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  `<< /Length ${pdfContent.length} >>\nstream\n${pdfContent}endstream`,
];
let samplePdf = '%PDF-1.4\n';
const pdfOffsets = pdfObjects.map((object, index) => {
  const offset = samplePdf.length;
  samplePdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  return offset;
});
const xrefOffset = samplePdf.length;
samplePdf += `xref\n0 6\n0000000000 65535 f \n${pdfOffsets.map((offset) => `${offset.toString().padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

test('saves, reveals, copies, and previews government IDs', async ({ page, context }, testInfo) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  // Isolated session and API fixtures: this test never writes live government data.
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = {
    access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: owner, exp: expiresAt, role: 'authenticated' })}.test`,
    refresh_token: 'test-only', token_type: 'bearer', expires_in: 3600, expires_at: expiresAt,
    user: { id: owner, aud: 'authenticated', email: 'government-fixture@example.test',
      app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
  };
  await page.addInitScript(({ key, session }) => {
    localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem('himan-ui-theme', 'dark');
  }, { key: `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`, session });
  let saved: Record<string, unknown> | undefined;
  const documents = [
    { id: 'image-doc', record_id: 'national-record', user_id: owner, name: 'ID front.png', mime_type: 'image/png',
      size: 4096, storage_path: `${owner}/national-record/image-doc`, ready: true },
    { id: 'pdf-doc', record_id: 'national-record', user_id: owner, name: 'ID copy.pdf', mime_type: 'application/pdf',
      size: 2048, storage_path: `${owner}/national-record/pdf-doc`, ready: true },
  ];
  const samples = ['Pag-IBIG', 'TIN', 'National ID', 'UMID'].map((agency, index) => ({
    id: agency === 'National ID' ? 'national-record' : `sample-${index}`, user_id: owner,
    agency, label: agency, registered_name: 'Test Person', number: '1234-5678-9012-3456',
    issue_date: null, expiry_date: null, notes: '', deleting: false,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    documents: agency === 'National ID' ? documents : [],
  }));
  const signedRequests: number[] = [];
  await page.route(`${supabaseUrl}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    const isRecord = path === '/rest/v1/government_records';
    if (path.startsWith('/storage/v1/object/sign/') && route.request().method() === 'POST') {
      signedRequests.push(route.request().postDataJSON().expiresIn);
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ signedURL: `${path.replace('/storage/v1', '')}?token=fixture-only` }) });
      return;
    }
    if (path.startsWith('/storage/v1/object/sign/') && route.request().method() === 'GET') {
      if (path.endsWith('image-doc')) {
        await route.fulfill({ path: 'public/assets/government/pag-ibig.png', contentType: 'image/png' });
      } else {
        await route.fulfill({ body: samplePdf, contentType: 'application/pdf' });
      }
      return;
    }
    if (isRecord && route.request().method() === 'POST') {
      saved = { ...route.request().postDataJSON(), id: '00000000-0000-0000-0000-00000000f101',
        deleting: false, documents: [], created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' };
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(saved) });
    } else {
      if (path === '/rest/v1/government_documents') {
        const id = new URL(route.request().url()).searchParams.get('id')?.replace('eq.', '');
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify(documents.find((document) => document.id === id)) });
      } else {
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify(isRecord && saved ? [saved, ...samples] : []) });
      }
    }
  });

  await page.goto('/government');
  await page.getByRole('button', { name: 'Add record', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const name = dialog.getByLabel('Registered name');
  const hitTarget = await name.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)?.id;
  });
  expect(hitTarget).toBe('gov-name');
  await name.click();
  await expect(name).toBeFocused();
  await name.fill('Test Person');
  await dialog.getByLabel('ID / member number').fill('001-234-56789');
  await expect(dialog.locator('input[type="date"], textarea')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Save record' }).click();
  await expect.poll(() => saved?.number).toBe('001-234-56789');
  expect(saved?.label).toBe('PhilHealth');
  expect(saved?.issue_date).toBeNull();
  expect(saved?.expiry_date).toBeNull();
  expect(saved?.notes).toBe('');
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText('001-234-56789', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Reveal PhilHealth number' }).click();
  await expect(page.getByText('001-234-56789', { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Number copied', { exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'Hide PhilHealth number' }).click();
  await expect(page.getByText('001-234-56789', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Copy PhilHealth number' }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('001-234-56789');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Pag-IBIG', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Details', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Copy PhilHealth number' })).toHaveText('');
  await expect(page.locator('img[src="/assets/government/pag-ibig.png"]')).toBeVisible();
  await expect(page.getByRole('img', { name: 'ID front.png' })).toBeVisible();
  await expect.poll(() => page.getByRole('img', { name: 'ID front.png' }).evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath('government-cards-dark.png'), fullPage: true });
  await page.getByRole('button', { name: 'Preview ID front.png' }).click();
  await expect(dialog.getByRole('img', { name: 'ID front.png' })).toBeVisible();
  await expect(dialog.getByTitle('PDF preview: ID copy.pdf')).toBeVisible();
  await dialog.getByTitle('PDF preview: ID copy.pdf').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('government-pdf-preview.png') });
  await dialog.getByRole('button', { name: 'Copy number', exact: true }).scrollIntoViewIfNeeded();
  await expect(dialog.getByRole('button', { name: 'Copy number', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Copy number', exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('1234-5678-9012-3456');
  await expect(dialog.getByRole('button', { name: 'Edit details' })).toBeVisible();
  expect(signedRequests.length).toBeGreaterThan(0);
  expect(signedRequests.every((expiry) => expiry === 60)).toBe(true);
  await dialog.getByRole('button', { name: 'Reveal number' }).click();
  await expect(dialog.getByText('1234-5678-9012-3456', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Hide number' }).click();
  await page.screenshot({ path: testInfo.outputPath('government-dialog-dark.png') });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await expect(dialog).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(dialog.getByRole('button', { name: 'Copy number', exact: true })).toHaveText('');
  await expect(dialog.getByRole('button', { name: 'Reveal number' })).toHaveText('');
  await page.screenshot({ path: testInfo.outputPath('government-dialog-light.png') });
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('government-cards-light.png'), fullPage: true });
  await page.getByRole('button', { name: 'View PhilHealth details' }).click();
  await expect(dialog.locator('details')).not.toHaveAttribute('open');
  await dialog.locator('summary').click();
  await expect(dialog.getByLabel('Attach existing files')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await page.getByRole('button', { name: 'View PhilHealth details' }).click();
  await expect(dialog.getByRole('button', { name: 'Copy number', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 812, height: 375 });
  await expect(dialog.getByRole('button', { name: 'Edit details' })).toBeVisible();
  await expect.poll(async () => (await dialog.boundingBox())?.height).toBeLessThanOrEqual(375);
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
});
