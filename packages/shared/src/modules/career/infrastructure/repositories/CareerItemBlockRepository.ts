import { getSupabase } from '../../../../config/index.js';
import { getLogger } from '../../../../services/index.js';
import type { ComposableBlock, CareerLength, SetItemBlocksDto } from '../../domain/types/index.js';

interface ItemBlockRow {
  block_id: string;
  position: number;
  length: CareerLength | null;
  career_blocks: { body: string } | null;
}

export class CareerItemBlockRepository {
  async findByItem(itemId: string): Promise<ComposableBlock[]> {
    try {
      const { data, error } = await getSupabase()
        .from('career_item_blocks')
        .select('block_id, position, length, career_blocks(body)')
        .eq('item_id', itemId)
        .order('position', { ascending: true });

      if (error) throw error;

      return ((data as unknown as ItemBlockRow[]) || []).map((row) => ({
        blockId: row.block_id,
        position: row.position,
        length: row.length,
        body: row.career_blocks?.body ?? '',
      }));
    } catch (error) {
      getLogger().error('Error fetching item blocks', error);
      throw new Error('Failed to fetch item blocks');
    }
  }

  // Replaces the item's full selection via a single RPC call — see
  // replace_career_item_blocks in the career migration for why this isn't
  // a client-side delete-then-insert.
  async replaceForItem(dto: SetItemBlocksDto): Promise<void> {
    try {
      const { error } = await getSupabase().rpc('replace_career_item_blocks', {
        p_item_id: dto.itemId,
        p_blocks: dto.blocks.map((block) => ({
          block_id: block.blockId,
          position: block.position,
          length: block.length,
        })),
      });

      if (error) throw error;
    } catch (error) {
      getLogger().error('Error replacing item blocks', error);
      throw new Error('Failed to save block selection');
    }
  }
}
