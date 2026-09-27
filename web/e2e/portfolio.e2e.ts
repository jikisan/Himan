import { test, expect, type Page } from '@playwright/test';

// The portfolio RPC is mocked: these tests exercise the public page, not
// the database (supabase/tests/career_portfolio.sql covers the RPC).
const portfolio = {
  itemName: 'Web + Mobile Developer',
  profile: {
    fullName: 'June Kyle Santerna',
    headline: 'Full Stack Software Developer',
    bio: 'Builds web and mobile products end to end.',
    location: 'Cebu City, Philippines',
    website: 'javascript:alert("website")',
    links: { github: 'https://github.com/jikisan', evil: 'javascript:alert("link")' },
    email: null,
  },
  projects: [
    {
      id: 'flohmarkt',
      name: 'Flohmarkt',
      description: 'Flea-market and event discovery for web and native mobile.',
      url: 'https://flohmarkt.example/',
      tech: ['React', 'React Native', 'FastAPI'],
      platform: ['Android', 'iOS', 'Web'],
      startDate: '2025-09-01',
      endDate: null,
      outcome: 'Built so visitors find markets on a map.',
      proofMetric: '40%',
      proofLabel: 'Test metric',
      category: 'Web + Mobile / Marketplace',
      featured: true,
    },
    {
      id: 'zipzap',
      name: 'ZipZapDone',
      description: 'Offline grocery and errand tracker.',
      url: 'https://zipzap.example/',
      tech: ['HTML', 'CSS'],
      platform: ['Web'],
      startDate: '2026-06-01',
      endDate: null,
      outcome: null,
      proofMetric: null,
      proofLabel: null,
      category: null,
      featured: false,
    },
    {
      id: 'taily',
      name: 'Taily',
      description: 'Pet care for Android and iOS.',
      url: 'https://play.google.com/store/apps/details?id=org.jikisan.taily',
      tech: ['Kotlin'],
      platform: ['Android', 'iOS'],
      startDate: null,
      endDate: null,
      outcome: null,
      proofMetric: null,
      proofLabel: null,
      category: null,
      featured: false,
    },
    {
      id: 'trap',
      name: 'Trap',
      description: null,
      url: 'javascript:alert("project")',
      tech: [],
      platform: [],
      startDate: null,
      endDate: null,
      outcome: null,
      proofMetric: null,
      proofLabel: null,
      category: null,
      featured: false,
    },
  ],
  experiences: [
    {
      id: 'e1',
      company: 'OnlineJobs.PH',
      title: 'Web and Mobile Developer',
      location: null,
      startDate: '2025-07-01',
      endDate: null,
      isCurrent: true,
      summary: null,
    },
  ],
  skills: ['Kotlin', 'React', 'Supabase', 'FastAPI'],
};

const mockPortfolio = async (page: Page, body: unknown = portfolio) => {
  await page.route('**/rest/v1/rpc/get_career_portfolio', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }),
  );
  // Framed sites are stubbed so the test never depends on the internet.
  await page.route(/https:\/\/(flohmarkt|zipzap)\.example\/.*/, (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>stub site</h1>' }),
  );
};

const splash = (page: Page) => page.locator('.pf .fixed.inset-0.z-50');

test.describe('public portfolio', () => {
  test('opens without login and renders the item', async ({ page }) => {
    await mockPortfolio(page);
    await page.goto('/p/tok-render');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('June Kyle');
    await expect(page).toHaveTitle('June Kyle Santerna — Web + Mobile Developer');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
    await expect(page).toHaveURL(/\/p\/tok-render$/); // no redirect to /login
  });

  test('plays the intro once per tab', async ({ page }) => {
    await mockPortfolio(page);
    await page.goto('/p/tok-splash');
    await expect(splash(page)).toBeVisible();
    await expect(splash(page)).toBeHidden({ timeout: 5_000 });

    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(splash(page)).toHaveCount(0);
  });

  test('skips the intro under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mockPortfolio(page);
    await page.goto('/p/tok-reduced');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(splash(page)).toHaveCount(0);
  });

  test('shows the switched-off message when the link is off or rotated', async ({ page }) => {
    await mockPortfolio(page, null);
    await page.goto('/p/tok-off');

    await expect(page.getByRole('heading', { name: 'This link is off.' })).toBeVisible();
  });

  test('never renders unsafe links', async ({ page }) => {
    await mockPortfolio(page);
    await page.goto('/p/tok-links');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const hrefs = await page.locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
    expect(hrefs.filter((h) => h.toLowerCase().startsWith('javascript:'))).toEqual([]);
    expect(hrefs).toContain('https://github.com/jikisan');
  });

  test('builds grid lists every selected project with the right link label', async ({ page }) => {
    await mockPortfolio(page);
    await page.goto('/p/tok-grid');

    const work = page.locator('#work');
    await work.scrollIntoViewIfNeeded();
    for (const name of ['Flohmarkt', 'ZipZapDone', 'Taily', 'Trap']) {
      await expect(work.getByRole('heading', { name, level: 3 })).toBeVisible();
    }
    await expect(work.getByRole('link', { name: /Google Play/ })).toHaveAttribute('href', /play\.google\.com/);
  });
});

test.describe('live browser frame', () => {
  test.skip(({ isMobile }) => isMobile, 'The live frame is desktop-only; mobile shows links instead.');

  test('switches the framed site from the build list, and skips store links', async ({ page }) => {
    await mockPortfolio(page);
    await page.goto('/p/tok-live');

    const tabs = page.getByRole('tablist', { name: 'Live builds' });
    await tabs.scrollIntoViewIfNeeded();
    await expect(tabs.getByRole('tab')).toHaveText([/Flohmarkt/, /ZipZapDone/]);

    const frame = page.locator('iframe[title$="live preview"]');
    await expect(frame).toHaveAttribute('src', 'https://flohmarkt.example/');

    await tabs.getByRole('tab', { name: /ZipZapDone/ }).click();
    await expect(tabs.getByRole('tab', { name: /ZipZapDone/ })).toHaveAttribute('aria-selected', 'true');
    await expect(frame).toHaveAttribute('src', 'https://zipzap.example/');
  });
});

test.describe('layout', () => {
  test('has no horizontal scroll', async ({ page }) => {
    await mockPortfolio(page);
    await page.goto('/p/tok-layout');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
