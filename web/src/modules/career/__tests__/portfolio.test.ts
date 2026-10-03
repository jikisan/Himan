import { describe, it, expect } from 'vitest';
import {
  pickHeroProject,
  slugify,
  SLUG_PATTERN,
  portfolioPath,
  splitWordmark,
  hostOf,
  parseMetric,
  isStoreUrl,
  yearSpan,
  safeUrl,
  sanitizePortfolio,
  deviceOf,
  scrollStep,
  cvFileName,
  type PortfolioData,
  type PortfolioProject,
} from '@himan/shared/career';

const project = (over: Partial<PortfolioProject>): PortfolioProject => ({
  id: 'p',
  name: 'P',
  description: null,
  url: null,
  androidUrl: null,
  iosUrl: null,
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

describe('pickHeroProject', () => {
  it('prefers a featured project over one that only has a metric', () => {
    const metric = project({ id: 'm', proofMetric: '#1' });
    const featured = project({ id: 'f', featured: true });
    expect(pickHeroProject([metric, featured])?.id).toBe('f');
  });

  it('falls back to the first project with a metric', () => {
    expect(pickHeroProject([project({ id: 'a' }), project({ id: 'b', proofMetric: '40%' })])?.id).toBe('b');
  });

  it('returns null when nothing qualifies, so the hero section hides', () => {
    expect(pickHeroProject([project({})])).toBeNull();
  });
});

describe('splitWordmark', () => {
  it('puts the last word in the accent half', () => {
    expect(splitWordmark('June Kyle Santerna')).toEqual(['June Kyle', 'Santerna']);
  });

  it('keeps a single name whole', () => {
    expect(splitWordmark('Prince')).toEqual(['Prince', '']);
  });
});

describe('hostOf', () => {
  it('strips protocol and www', () => {
    expect(hostOf('https://www.flohmarkt.guru/events?x=1')).toBe('flohmarkt.guru');
  });

  it('returns the raw input for an invalid URL', () => {
    expect(hostOf('not a url')).toBe('not a url');
  });
});

describe('parseMetric', () => {
  it('splits prefix, number, and suffix for count-up', () => {
    expect(parseMetric('₱100M+')).toEqual({ prefix: '₱', value: 100, decimals: 0, suffix: 'M+' });
    expect(parseMetric('3.5x')).toEqual({ prefix: '', value: 3.5, decimals: 1, suffix: 'x' });
  });

  it('returns null for rank-style metrics that must not count up', () => {
    expect(parseMetric('#1')).toBeNull();
    expect(parseMetric('Top')).toBeNull();
  });
});

describe('isStoreUrl', () => {
  it('detects app-store links that refuse to render in an iframe', () => {
    expect(isStoreUrl('https://play.google.com/store/apps/details?id=x')).toBe(true);
    expect(isStoreUrl('https://apps.apple.com/app/id1')).toBe(true);
    expect(isStoreUrl('https://zipzapdone.jikisan.com/')).toBe(false);
  });
});

describe('yearSpan', () => {
  it('collapses a same-year range', () => {
    expect(yearSpan('2026-08-01', '2026-08-31')).toBe('2026');
  });

  it('shows an open range as ongoing', () => {
    expect(yearSpan('2025-12-01', null)).toBe('2025 — now');
  });

  it('returns null with no dates', () => {
    expect(yearSpan(null, null)).toBeNull();
  });
});

describe('safeUrl', () => {
  it('keeps http(s) links', () => {
    expect(safeUrl('https://flohmarkt.guru/')).toBe('https://flohmarkt.guru/');
  });

  it('drops script and data schemes, and junk', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl(' JaVaScRiPt:alert(1)')).toBeNull();
    expect(safeUrl('data:text/html,<script>1</script>')).toBeNull();
    expect(safeUrl('not a url')).toBeNull();
    expect(safeUrl(null)).toBeNull();
  });
});

describe('sanitizePortfolio', () => {
  const data: PortfolioData = {
    itemName: 'Role',
    summary: null,
    portraitPath: null,
    cvPath: null,
    profile: {
      fullName: 'A B',
      headline: null,
      bio: null,
      location: null,
      website: 'javascript:alert(1)',
      links: { github: 'https://github.com/jikisan', evil: 'javascript:alert(2)' },
      email: null,
    },
    projects: [
      project({ id: 'ok', url: 'https://ok.dev', androidUrl: 'https://play.google.com/store/apps/details?id=a' }),
      project({ id: 'bad', url: 'javascript:alert(3)', iosUrl: 'javascript:alert(4)' }),
    ],
    experiences: [],
    skills: [],
  };

  it('drops unsafe website, links, and project URLs but keeps safe ones', () => {
    const clean = sanitizePortfolio(data);
    expect(clean.profile.website).toBeNull();
    expect(clean.profile.links).toEqual({ github: 'https://github.com/jikisan' });
    expect(clean.projects.map((p) => p.url)).toEqual(['https://ok.dev/', null]);
    expect(clean.projects.map((p) => p.androidUrl)).toEqual(['https://play.google.com/store/apps/details?id=a', null]);
    expect(clean.projects.map((p) => p.iosUrl)).toEqual([null, null]);
  });

  it('leaves the input untouched', () => {
    sanitizePortfolio(data);
    expect(data.profile.website).toBe('javascript:alert(1)');
  });
});

describe('deviceOf', () => {
  it('uses phones for native-only apps', () => {
    expect(deviceOf({ platform: ['Android', 'iOS'] })).toBe('phone');
  });

  it('uses a browser for web, cross-platform, automations, or unknown', () => {
    expect(deviceOf({ platform: ['Android', 'iOS', 'Web'] })).toBe('browser');
    expect(deviceOf({ platform: ['Automation'] })).toBe('browser');
    expect(deviceOf({ platform: [] })).toBe('browser');
  });
});

describe('scrollStep', () => {
  it('splits the scroll into equal steps', () => {
    expect(scrollStep(0, 4)).toBe(0);
    expect(scrollStep(0.26, 4)).toBe(1);
    expect(scrollStep(0.74, 4)).toBe(2);
  });

  it('clamps at both ends and handles empty lists', () => {
    expect(scrollStep(1, 4)).toBe(3);
    expect(scrollStep(-0.2, 4)).toBe(0);
    expect(scrollStep(0.5, 0)).toBe(0);
  });
});

describe('slugify', () => {
  it('lowercases and hyphenates, trimming stray hyphens', () => {
    expect(slugify('  QA / Test Automation Engineer! ')).toBe('qa-test-automation-engineer');
  });

  it('caps at 40 characters without a trailing hyphen', () => {
    const slug = slugify('a'.repeat(39) + ' b');
    expect(slug).toBe('a'.repeat(39));
    expect(SLUG_PATTERN.test(slug)).toBe(true);
  });
});

describe('portfolioPath', () => {
  it('uses the readable link once handle and slug exist', () => {
    expect(portfolioPath({ shareToken: 't0k', portfolioSlug: 'android-developer' }, 'junekyle')).toBe('/p/junekyle/android-developer');
  });

  it('falls back to the token link without a handle', () => {
    expect(portfolioPath({ shareToken: 't0k', portfolioSlug: 'android-developer' }, null)).toBe('/p/t0k');
  });
});

describe('cvFileName', () => {
  it('names the PDF after the person and the career', () => {
    expect(cvFileName('June Kyle Santerna', 'Android Developer')).toBe('June_Kyle_Santerna_CV_Android_Developer.pdf');
    expect(cvFileName(null, 'iOS / Swift')).toBe('CV_iOS_Swift.pdf');
  });
});
