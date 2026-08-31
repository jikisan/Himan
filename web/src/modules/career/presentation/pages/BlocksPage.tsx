import { useState } from 'react';
import { ArrowLeft, Plus, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, ScrollArea } from '@/components/ui';
import { useCareerBlocks } from '../hooks/useCareerBlocks';
import { BlockEditor } from '../components/BlockEditor';
import { BlockList } from '../components/BlockList';
import { SEED_BLOCKS } from '../constants/seedBlocks';
import type { CareerBlockWithUsageType } from '@himan/shared/career';

export const BlocksPage = () => {
  const { blocks, loading, createBlock, updateBlock, deleteBlock } = useCareerBlocks();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<CareerBlockWithUsageType | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      for (const seed of SEED_BLOCKS) {
        await createBlock(seed);
      }
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="px-4 py-3.5 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/career" className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-accent transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold">Block Library</h1>
        </div>
        <Button size="sm" onClick={() => { setEditingBlock(null); setEditorOpen(true); }}>
          <Plus className="h-4 w-4 mr-1.5" />
          New block
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 max-w-3xl mx-auto">
          {!loading && blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 text-muted-foreground">
              <Sparkles className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm mb-4">No blocks yet.</p>
              <Button variant="outline" onClick={handleSeed} disabled={isSeeding}>
                {isSeeding ? 'Adding...' : 'Add starter blocks'}
              </Button>
            </div>
          ) : (
            <BlockList
              blocks={blocks}
              onEdit={(block) => { setEditingBlock(block); setEditorOpen(true); }}
              onDelete={deleteBlock}
            />
          )}
        </div>
      </ScrollArea>

      <BlockEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        block={editingBlock}
        onSave={async (dto) => {
          if (editingBlock) {
            await updateBlock(editingBlock.id, dto);
          } else {
            await createBlock(dto);
          }
        }}
      />
    </div>
  );
};
