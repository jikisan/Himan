import { getSupabase } from '../../../../config/index.js';
import { getLogger } from '../../../../services/index.js';
import type { PortfolioData } from '../../domain/types/index.js';

// Anonymous read path: the RPC is SECURITY DEFINER and already returns
// camelCase, whitelisted fields, so there is nothing to map.
export class CareerPortfolioRepository {
  async getByToken(token: string): Promise<PortfolioData | null> {
    try {
      const { data, error } = await getSupabase().rpc('get_career_portfolio', { p_token: token });

      if (error) throw error;

      return (data as PortfolioData | null) ?? null;
    } catch (error) {
      getLogger().error('Error fetching career portfolio', error);
      throw new Error('Failed to load portfolio');
    }
  }
}
