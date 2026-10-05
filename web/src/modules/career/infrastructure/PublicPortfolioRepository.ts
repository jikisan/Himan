import type { PortfolioData } from '@himan/shared/career';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
type InitialRequest = { key: string; promise: Promise<PortfolioData | null> };
const bootstrap = window as Window & { __himanPortfolioRequest?: InitialRequest };
let initialRequest = bootstrap.__himanPortfolioRequest;
delete bootstrap.__himanPortfolioRequest;

// The public RPC already whitelists the fields. Anonymous reads don't need
// sessions, token refresh, realtime or the storage upload SDK.
export class PublicPortfolioRepository {
  getByToken(token: string): Promise<PortfolioData | null> {
    return this.fetch('get_career_portfolio', { p_token: token });
  }

  getBySlug(handle: string, slug: string): Promise<PortfolioData | null> {
    return this.fetch('get_career_portfolio_by_slug', { p_handle: handle, p_slug: slug });
  }

  private async fetch(fn: string, args: Record<string, string>): Promise<PortfolioData | null> {
    const key = JSON.stringify([fn, args]);
    if (initialRequest?.key === key) {
      const promise = initialRequest.promise;
      initialRequest = undefined;
      return promise;
    }
    // Only the public anon key travels here. A simple read-only GET avoids
    // the CORS preflight; no-store keeps disabled links and edits current.
    const query = new URLSearchParams({ ...args, apikey: anonKey });
    const response = await fetch(`${url}/rest/v1/rpc/${fn}?${query}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to load portfolio');
    return response.json();
  }
}

export const publicPortfolioMediaUrl = (path: string): string =>
  `${url}/storage/v1/object/public/portfolio-media/${path.split('/').map(encodeURIComponent).join('/')}`;
