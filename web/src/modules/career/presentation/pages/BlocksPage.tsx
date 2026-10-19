import { toast } from 'sonner';
import { useState } from 'react';
import { ArrowLeft, Plus, Sparkles, UserCog } from 'lucide-react';
import { Link } from 'react-router-dom';
import { STANDARD_CV_TOKENS } from '@himan/shared/profile';
import { Button, ScrollArea } from '@/components/ui';
import { useCareerBlocks } from '../hooks/useCareerBlocks';
import { useCvBlocks } from '../hooks/useCvBlocks';
import { useCvData } from '../hooks/useCvData';
import { BlockEditor } from '../components/BlockEditor';
import { BlockList } from '../components/BlockList';
import { CvBlockEditor } from '../components/CvBlockEditor';
import { CvBlockList } from '../components/CvBlockList';
import { SEED_BLOCKS } from '../constants/seedBlocks';
import type { CareerBlockWithUsageType, CareerCvBlockType } from '@himan/shared/career';

type Tab = 'letter' | 'cv';

export const BlocksPage = () => {
  const [tab, setTab] = useState<Tab>('letter');

  const { blocks, loading, createBlock, updateBlock, deleteBlock } = useCareerBlocks();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<CareerBlockWithUsageType | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const { blocks: cvBlocks, loading: cvLoading, createBlock: createCvBlock, updateBlock: updateCvBlock, deleteBlock: deleteCvBlock } = useCvBlocks();
  const [cvEditorOpen, setCvEditorOpen] = useState(false);
  const [editingCvBlock, setEditingCvBlock] = useState<CareerCvBlockType | null>(null);

  const { cvData, profileBlocks } = useCvData();
  const cvTokens = Array.from(new Set([...STANDARD_CV_TOKENS, ...Object.keys(cvData?.profile.links ?? {})]));

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      for (const seed of SEED_BLOCKS) {
        await createBlock(seed);
      }
    } catch {
      // The block editor reports its own save failures; seeding has no form, so it toasts.
      toast.error('Failed to save block');
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
        {tab === 'letter' ? (
          <Button size="sm" onClick={() => { setEditingBlock(null); setEditorOpen(true); }}>
            <Plus className="h-4 w-4 mr-1.5" />
            New block
          </Button>
        ) : (
          <Button size="sm" onClick={() => { setEditingCvBlock(null); setCvEditorOpen(true); }}>
            <Plus className="h-4 w-4 mr-1.5" />
            New CV block
          </Button>
        )}
      </div>

      <div className="px-4 pt-3">
        <div className="inline-flex items-center gap-0.5 rounded-md border border-border p-0.5">
          <button
            onClick={() => setTab('letter')}
            className={`text-sm px-3 py-1 rounded transition-colors ${tab === 'letter' ? 'bg-accent' : 'hover:bg-accent/50'}`}
          >
            Cover letter
          </button>
          <button
            onClick={() => setTab('cv')}
            className={`text-sm px-3 py-1 rounded transition-colors ${tab === 'cv' ? 'bg-accent' : 'hover:bg-accent/50'}`}
          >
            CV
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 max-w-3xl mx-auto">
          {tab === 'letter' ? (
            !loading && blocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">No blocks yet.</p>
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
            )
          ) : (
            <div className="space-y-6">
              {!cvLoading && cvBlocks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No custom CV blocks yet. Custom blocks (e.g. an Objective) show up alongside your
                  profile sections when building a CV layout on a career item.
                </p>
              ) : (
                <CvBlockList
                  blocks={cvBlocks}
                  onEdit={(block) => { setEditingCvBlock(block); setCvEditorOpen(true); }}
                  onDelete={deleteCvBlock}
                />
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-muted-foreground">From your profile</h2>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/profile">
                      <UserCog className="h-4 w-4 mr-1.5" />
                      Edit in profile
                    </Link>
                  </Button>
                </div>
                {profileBlocks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nothing in your profile yet. Add experience, education, and skills to build these blocks.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {profileBlocks.map((option, index) => (
                      <div key={`${option.label}-${index}`} className="rounded-lg border border-border border-dashed p-2.5">
                        <p className="text-sm truncate">{option.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
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

      <CvBlockEditor
        open={cvEditorOpen}
        onOpenChange={setCvEditorOpen}
        block={editingCvBlock}
        tokens={cvTokens}
        onSave={async (dto) => {
          if (editingCvBlock) {
            await updateCvBlock(editingCvBlock.id, dto);
          } else {
            await createCvBlock(dto);
          }
        }}
      />
    </div>
  );
};
