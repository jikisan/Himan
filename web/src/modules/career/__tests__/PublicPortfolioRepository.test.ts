import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://portfolio.example');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-key');
});

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('anonymous portfolio reads', () => {
  it('uses the public RPC and key for readable links', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('null', { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    const { PublicPortfolioRepository } = await import('../infrastructure/PublicPortfolioRepository');
    expect(await new PublicPortfolioRepository().getBySlug('junekyle', 'android-developer')).toBeNull();
    expect(fetch).toHaveBeenCalledWith('https://portfolio.example/rest/v1/rpc/get_career_portfolio_by_slug?p_handle=junekyle&p_slug=android-developer&apikey=public-key', { cache: 'no-store' });
  });

  it('reports HTTP failures instead of treating them as a disabled link', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 500 })));
    const { PublicPortfolioRepository } = await import('../infrastructure/PublicPortfolioRepository');
    await expect(new PublicPortfolioRepository().getByToken('token')).rejects.toThrow('Failed to load portfolio');
  });

  it('reuses the cold request once and fetches fresh data afterward', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('null', { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    vi.stubGlobal('__himanPortfolioRequest', {
      key: JSON.stringify(['get_career_portfolio_by_slug', { p_handle: 'june kyle', p_slug: 'android-developer' }]),
      promise: Promise.resolve(null),
    });
    const { PublicPortfolioRepository } = await import('../infrastructure/PublicPortfolioRepository');
    const repo = new PublicPortfolioRepository();
    expect(await repo.getBySlug('june kyle', 'android-developer')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    expect(await repo.getBySlug('june kyle', 'android-developer')).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('allows retry after a failed cold request', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 503 }));
    vi.stubGlobal('fetch', fetch);
    const promise = Promise.reject(new Error('Failed to load portfolio'));
    void promise.catch(() => {});
    vi.stubGlobal('__himanPortfolioRequest', {
      key: JSON.stringify(['get_career_portfolio', { p_token: 'token' }]),
      promise,
    });
    const { PublicPortfolioRepository } = await import('../infrastructure/PublicPortfolioRepository');
    const repo = new PublicPortfolioRepository();
    await expect(repo.getByToken('token')).rejects.toThrow('Failed to load portfolio');
    fetch.mockResolvedValue(new Response('null', { status: 200 }));
    expect(await repo.getByToken('token')).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('encodes media filenames while preserving folder boundaries', async () => {
    const { publicPortfolioMediaUrl } = await import('../infrastructure/PublicPortfolioRepository');
    expect(publicPortfolioMediaUrl('owner/portrait #1.png')).toBe('https://portfolio.example/storage/v1/object/public/portfolio-media/owner/portrait%20%231.png');
  });
});
