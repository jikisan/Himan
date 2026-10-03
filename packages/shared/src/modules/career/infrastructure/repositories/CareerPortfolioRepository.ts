import { getSupabase } from '../../../../config/index.js';
import { getLogger } from '../../../../services/index.js';
import type { PortfolioData } from '../../domain/types/index.js';

// Anonymous read path: the RPC is SECURITY DEFINER and already returns
// camelCase, whitelisted fields, so there is nothing to map.
export class CareerPortfolioRepository {
  getByToken(token: string): Promise<PortfolioData | null> {
    return this.fetch('get_career_portfolio', { p_token: token });
  }

  getBySlug(handle: string, slug: string): Promise<PortfolioData | null> {
    return this.fetch('get_career_portfolio_by_slug', { p_handle: handle, p_slug: slug });
  }

  private async fetch(fn: string, args: Record<string, string>): Promise<PortfolioData | null> {
    try {
      const { data, error } = await getSupabase().rpc(fn, args);

      if (error) throw error;

      return (data as PortfolioData | null) ?? null;
    } catch (error) {
      getLogger().error('Error fetching career portfolio', error);
      throw new Error('Failed to load portfolio');
    }
  }
}
