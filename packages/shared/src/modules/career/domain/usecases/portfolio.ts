import type { PortfolioData, PortfolioProject } from '../types/index.js';

// The hero proof card needs a claim worth leading with: an explicitly
// featured project first, else the first one carrying a metric. No
// candidate means the section hides rather than inventing proof.
export function pickHeroProject(projects: PortfolioProject[]): PortfolioProject | null {
  return projects.find((p) => p.featured) ?? projects.find((p) => p.proofMetric?.trim()) ?? null;
}

// Wordmark halves: everything but the last word, then the last word in
// the accent colour.
export function splitWordmark(fullName: string): [string, string] {
  const words = fullName.trim().split(/\s+/);
  if (words.length < 2) return [words[0] ?? '', ''];
  return [words.slice(0, -1).join(' '), words[words.length - 1]];
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export interface ParsedMetric {
  prefix: string;
  value: number;
  decimals: number;
  suffix: string;
}

// Only a leading quantity counts up (₱100M+, 40%, 3.5x). A rank (#1) or a
// word stays static — animating "#1" from "#0" reads as a glitch.
export function parseMetric(metric: string): ParsedMetric | null {
  const match = metric.trim().match(/^([^\d#]*)(\d[\d,]*(?:\.\d+)?)(.*)$/);
  if (!match) return null;
  const digits = match[2].replace(/,/g, '');
  return {
    prefix: match[1],
    value: Number(digits),
    decimals: digits.includes('.') ? digits.split('.')[1].length : 0,
    suffix: match[3],
  };
}

// Store listings send X-Frame-Options, so they get a link card instead of
// a live browser preview.
export function isStoreUrl(url: string): boolean {
  const host = hostOf(url);
  return host === 'play.google.com' || host === 'apps.apple.com';
}

export function yearSpan(start: string | null, end: string | null): string | null {
  const from = start?.slice(0, 4);
  const to = end?.slice(0, 4);
  if (!from && !to) return null;
  if (from && !to) return `${from} — now`;
  if (!from || from === to) return to ?? null;
  return `${from} — ${to}`;
}

// The portfolio is public, so every stored URL is treated as untrusted:
// only absolute http(s) links render. A javascript: or data: URL saved in
// a project or profile link would otherwise run on this origin.
export function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch {
    return null;
  }
}

// Every URL on the public page comes from stored profile data, so the page
// scrubs it once at the boundary: anything not http(s) is dropped before
// any component can put it in an href or an iframe.
export function sanitizePortfolio(data: PortfolioData): PortfolioData {
  return {
    ...data,
    profile: {
      ...data.profile,
      website: safeUrl(data.profile.website),
      links: Object.fromEntries(
        Object.entries(data.profile.links).flatMap(([key, url]) => {
          const safe = safeUrl(url);
          return safe ? [[key, safe]] : [];
        }),
      ),
    },
    projects: data.projects.map((p) => ({ ...p, url: safeUrl(p.url), androidUrl: safeUrl(p.androidUrl), iosUrl: safeUrl(p.iosUrl) })),
  };
}


// Which frame a build's screenshots sit in: phones for native-only apps,
// a browser window for anything on the web (sites, dashboards, automations).
// Same rules as the portfolio_slugify SQL function and the slug/handle
// CHECK constraints, so the editor can validate before saving.
export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40).replace(/^-+|-+$/g, '');
}

export const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

// Readable /p/{handle}/{slug} once both exist, else the token link.
export function portfolioPath(item: { shareToken: string; portfolioSlug: string | null }, handle: string | null): string {
  return handle && item.portfolioSlug ? `/p/${handle}/${item.portfolioSlug}` : `/p/${item.shareToken}`;
}

// {fullName}_CV_{item}.pdf, e.g. June_Kyle_Santerna_CV_Android.pdf.
export function cvFileName(fullName: string | null | undefined, itemName: string | null | undefined): string {
  const part = (s: string) => s.trim().replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '');
  return `${[part(fullName ?? ''), 'CV', part(itemName ?? '')].filter(Boolean).join('_')}.pdf`;
}

export function deviceOf(project: Pick<PortfolioProject, 'platform'>): 'phone' | 'browser' {
  const platforms = project.platform.map((p) => p.toLowerCase());
  const native = platforms.some((p) => p === 'android' || p === 'ios');
  return native && !platforms.includes('web') ? 'phone' : 'browser';
}

// Scroll-driven tabs: progress 0..1 through the pinned section picks one of
// `count` steps, each getting an equal share of the scroll.
export function scrollStep(progress: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(count - 1, Math.max(0, Math.floor(progress * count)));
}
