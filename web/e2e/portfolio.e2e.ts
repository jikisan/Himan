import { test, expect, type Page } from '@playwright/test';

// The portfolio RPC and the screenshot bucket are mocked: these tests
// exercise the public page, not the database
// (supabase/tests/career_portfolio.sql covers the RPC).
type Project = Record<string, unknown>;
const project = (over: Project): Project => ({
  description: null,
  url: null,
  tech: [],
  platform: [],
  startDate: null,
  endDate: null,
  outcome: null,
  proofMetric: null,
  proofLabel: null,
  category: null,
  featured: false,
  images: [],
  ...over,
});

const portfolio = {
  itemName: 'Web + Mobile Developer',
  summary: 'Selected summary for web and mobile applications.',
  portraitPath: 'u/portrait.png',
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
    // Native app with screenshots → the pinned proof fan.
    project({
      id: 'memberzone',
      name: 'MemberZone',
      description: 'Membership club app with booking flows.',
      tech: ['React Native'],
      platform: ['Android', 'iOS'],
      outcome: 'Built so members book without calling the front desk.',
      proofMetric: '40%',
      proofLabel: 'Test metric',
      featured: true,
      images: ['u/mz-1.png', 'u/mz-2.png', 'u/mz-3.png', 'u/mz-4.png'],
    }),
    // Web + automation builds → the scroll-driven browser tabs.
    project({
      id: 'flohmarkt',
      name: 'Flohmarkt',
      url: 'https://flohmarkt.example/',
      tech: ['React'],
      platform: ['Web'],
      category: 'Web Build / Marketplace',
      images: ['u/flohmarkt.png'],
    }),
    project({
      id: 'zipzap',
      name: 'ZipZapDone',
      url: 'https://zipzap.example/',
      tech: ['HTML'],
      platform: ['Web'],
      images: ['u/zipzap.png'],
    }),
    project({ id: 'sync', name: 'Invoice Sync', tech: ['n8n'], platform: ['Automation'], images: ['u/sync.png'] }),
    // Store app → build cards only, with a Google Play link.
    project({
      id: 'taily',
      name: 'Taily',
      url: 'https://play.google.com/store/apps/details?id=org.jikisan.taily',
      tech: ['Kotlin'],
      platform: ['Android', 'iOS'],
    }),
    // Unsafe URL and no screenshot → scrubbed, so it can't become a tab.
    project({ id: 'trap', name: 'Trap', url: 'javascript:alert("project")', platform: ['Web'] }),
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

// 1×1 transparent PNG, served for every screenshot request.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

const mockPortfolio = async (page: Page, body: unknown = portfolio) => {
  await page.route('**/rest/v1/rpc/get_career_portfolio?*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }),
  );
  await page.route('**/rest/v1/rpc/get_career_portfolio_by_slug?*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }),
  );
  await page.route('**/storage/v1/object/public/portfolio-media/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }),
  );
};

const splash = (page: Page) => page.locator('.pf .fixed.inset-0.z-50');

// Scroll so a pinned section's progress sits at `fraction` (0..1).
const scrollPinned = async (page: Page, testId: string, fraction: number) => {
  await page.getByTestId(testId).waitFor();
  await page.evaluate(
    ({ testId, fraction }) => {
      const el = document.querySelector(`[data-testid="${testId}"]`) as HTMLElement;
      const top = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top + (el.offsetHeight - window.innerHeight) * fraction);
    },
    { testId, fraction },
  );
};

test.describe('public portfolio', () => {
  test('opens without login and renders the item', async ({ page }) => {
    await mockPortfolio(page);
    await page.goto('/p/tok-render');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('June Kyle');
    await expect(page).toHaveTitle('June Kyle Santerna — Web + Mobile Developer');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', portfolio.summary);
    await expect(page).toHaveURL(/\/p\/tok-render$/); // no redirect to /login
  });

  test('opens a readable link without loading the authenticated app', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(new URL(request.url()).pathname));
    await mockPortfolio(page);
    await page.goto('/p/junekyle/android-developer');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('June Kyle');
    expect(requests.some((url) => url === '/src/App.tsx' || /\/assets\/App-.*\.js$/.test(url))).toBe(false);
    expect(requests.filter((url) => url.endsWith('/get_career_portfolio_by_slug'))).toHaveLength(1);
  });

  test('loads the storage client on demand for an offered CV', async ({ page }) => {
    await mockPortfolio(page, { ...portfolio, cvPath: 'owner/cv.pdf' });
    await page.route('**/storage/v1/object/sign/career/**', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({ contentType: 'application/json', body: JSON.stringify({ signedURL: '/object/sign/career/owner/cv.pdf?token=download' }) })
        : route.fulfill({ contentType: 'text/html', body: '<p>CV download</p>' }),
    );
    await page.goto('/p/tok-cv');
    await page.getByRole('button', { name: 'Download CV' }).click();
    await expect(page).toHaveURL(/\/storage\/v1\/object\/sign\/career\/owner\/cv\.pdf\?token=download/);
  });

  test('plays the intro once per tab', async ({ page }) => {
    await mockPortfolio(page);
    let release = () => {};
    const response = new Promise<void>((resolve) => { release = resolve; });
    await page.route('**/rest/v1/rpc/get_career_portfolio?*', async (route) => {
      await response;
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(portfolio) });
    });
    await page.goto('/p/tok-splash', { waitUntil: 'domcontentloaded' });
    await expect(splash(page)).toBeVisible();
    release();
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
    await expect(page.locator('a[href="https://github.com/jikisan"]')).toBeAttached();

    const hrefs = await page.locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
    expect(hrefs.filter((h) => h.toLowerCase().startsWith('javascript:'))).toEqual([]);
    expect(hrefs).toContain('https://github.com/jikisan');
  });

  test('build grid lists every selected project with the right link label', async ({ page }) => {
    await mockPortfolio(page);
    await page.goto('/p/tok-grid');

    const work = page.locator('#work');
    await work.scrollIntoViewIfNeeded();
    for (const name of ['MemberZone', 'Flohmarkt', 'ZipZapDone', 'Invoice Sync', 'Taily', 'Trap']) {
      await expect(work.getByRole('heading', { name, level: 3 })).toBeVisible();
    }
    await expect(work.getByRole('link', { name: /Google Play/ })).toHaveAttribute('href', /play\.google\.com/);
  });
});

test.describe('proof section', () => {
  test('fans the screenshots out from a stack as you scroll', async ({ page }) => {
    await mockPortfolio(page);
    await page.goto('/p/tok-proof');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const phones = page.getByTestId('proof-scroll').getByRole('img', { name: 'MemberZone screenshot' });
    await expect(phones).toHaveCount(4);

    const spread = async () => {
      const xs = await phones.evaluateAll((imgs) => imgs.map((img) => img.getBoundingClientRect().x));
      return Math.max(...xs) - Math.min(...xs);
    };

    await scrollPinned(page, 'proof-scroll', 0);
    await page.waitForTimeout(300);
    const stacked = await spread();

    await scrollPinned(page, 'proof-scroll', 0.8);
    await expect.poll(spread).toBeGreaterThan(stacked + 100);
    await expect(page.getByText('Proof, not promises', { exact: true })).toBeVisible();
  });
});

test.describe('web builds browser', () => {
  const address = (page: Page) => page.getByTestId('browser-address');

  test('switches tabs as you scroll, in order, skipping native and unsafe builds', async ({ page }) => {
    await mockPortfolio(page);
    await page.goto('/p/tok-tabs');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const thumbs = page.getByRole('button', { name: /^Show / });
    await expect(thumbs).toHaveText(['', '', '']);
    await expect(thumbs.nth(0)).toHaveAccessibleName('Show Flohmarkt');
    await expect(thumbs.nth(2)).toHaveAccessibleName('Show Invoice Sync');

    await scrollPinned(page, 'browser-tabs', 0.1);
    await expect(address(page)).toHaveText('flohmarkt.example/');

    await scrollPinned(page, 'browser-tabs', 0.5);
    await expect(address(page)).toHaveText('zipzap.example/');

    await scrollPinned(page, 'browser-tabs', 0.95);
    await expect(address(page)).toHaveText('invoice-sync.build');
    await expect(page.getByRole('button', { name: 'Show Invoice Sync' })).toHaveAttribute('aria-current', 'true');
  });

  test('a thumbnail jumps straight to its tab', async ({ page }) => {
    await mockPortfolio(page);
    await page.goto('/p/tok-thumbs');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await scrollPinned(page, 'browser-tabs', 0.1);
    await page.getByRole('button', { name: 'Show ZipZapDone' }).click();
    await expect(address(page)).toHaveText('zipzap.example/');
    await expect(page.getByRole('link', { name: 'Open ZipZapDone live' })).toHaveAttribute('href', 'https://zipzap.example/');
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
