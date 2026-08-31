import { useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button, ConfirmDialog } from '@/components/ui';
import { resolvePlaceholders, type CareerBlockKind, type CareerBlockWithUsageType } from '@himan/shared/career';

const KIND_LABELS: Record<CareerBlockKind, string> = {
  greeting: 'Greeting',
  opening: 'Opening',
  experience_line: 'Experience line',
  proof: 'Proof paragraph',
  portfolio_line: 'Portfolio line',
  close: 'Close',
  cv_summary: 'CV summary',
};

const SAMPLE_CTX = { jobTitle: 'Senior Software Engineer', company: 'Acme Corp' };

interface BlockListProps {
  blocks: CareerBlockWithUsageType[];
  onEdit: (block: CareerBlockWithUsageType) => void;
  onDelete: (id: string) => void;
}

export const BlockList = ({ blocks, onEdit, onDelete }: BlockListProps) => {
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const tags = useMemo(
    () => Array.from(new Set(blocks.flatMap((block) => block.tags))).sort(),
    [blocks]
  );

  const filtered = tagFilter ? blocks.filter((block) => block.tags.includes(tagFilter)) : blocks;

  const grouped = useMemo(() => {
    const map = new Map<CareerBlockKind, CareerBlockWithUsageType[]>();
    for (const block of filtered) {
      const list = map.get(block.kind) ?? [];
      list.push(block);
      map.set(block.kind, list);
    }
    return map;
  }, [filtered]);

  const blockToDelete = blocks.find((block) => block.id === deleteId) ?? null;

  return (
    <div className="space-y-6">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTagFilter(null)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              tagFilter === null ? 'bg-accent border-accent-foreground/20' : 'border-border hover:bg-accent'
            }`}
          >
            All
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setTagFilter(tag)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                tagFilter === tag ? 'bg-accent border-accent-foreground/20' : 'border-border hover:bg-accent'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {[...grouped.entries()].map(([kind, kindBlocks]) => (
        <div key={kind}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">{KIND_LABELS[kind]}</h3>
          <div className="space-y-2">
            {kindBlocks.map((block) => {
              const preview = resolvePlaceholders(block.body, SAMPLE_CTX);
              return (
                <div
                  key={block.id}
                  className="rounded-lg border border-border p-3 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{block.label}</span>
                      {block.tags.map((tag) => (
                        <span key={tag} className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{preview.text}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(block)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      disabled={block.itemCount > 0}
                      title={block.itemCount > 0 ? `Used by ${block.itemCount} item${block.itemCount === 1 ? '' : 's'}` : undefined}
                      onClick={() => setDeleteId(block.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title={`Delete "${blockToDelete?.label ?? 'block'}"`}
        description="This block will be permanently deleted. This action cannot be undone."
        confirmText="Delete"
        onConfirm={() => { if (deleteId) onDelete(deleteId); setDeleteId(null); }}
        variant="destructive"
      />
    </div>
  );
};
