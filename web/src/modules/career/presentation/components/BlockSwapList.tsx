import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import type { CareerBlockKind, CareerBlockType } from '@himan/shared/career';
import type { SelectedBlock } from './ComposePane';

const KIND_LABELS: Record<CareerBlockKind, string> = {
  greeting: 'Greeting',
  opening: 'Opening',
  experience_line: 'Experience line',
  proof: 'Proof paragraph',
  portfolio_line: 'Portfolio line',
  close: 'Close',
  cv_summary: 'CV summary',
};

interface BlockSwapListProps {
  allBlocks: CareerBlockType[];
  selected: SelectedBlock[];
  onSwap: (index: number, newBlockId: string) => void;
  disabled?: boolean;
}

// Swap-only, same order as saved — reordering/adding/removing stays behind
// the "Edit blocks" dialog. This is the fast path for "same letter, just
// pick a different experience line for this application."
export const BlockSwapList = ({ allBlocks, selected, onSwap, disabled }: BlockSwapListProps) => {
  const blockById = new Map(allBlocks.map((b) => [b.id, b]));

  if (selected.length === 0) {
    return <p className="text-sm text-muted-foreground">No blocks set up yet — click &quot;Edit blocks&quot; to draft the letter.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        {selected.map((s, index) => {
          const block = blockById.get(s.blockId);
          if (!block) return null;
          const alternatives = allBlocks.filter((b) => b.kind === block.kind);
          return (
            <div key={`${s.blockId}-${index}`} className="rounded-lg border border-border p-2.5 flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{block.label}</p>
                <p className="text-xs text-muted-foreground">{KIND_LABELS[block.kind]}</p>
              </div>
              <Select
                value={s.blockId}
                onValueChange={(v) => { if (v !== s.blockId) onSwap(index, v); }}
                disabled={disabled || alternatives.length <= 1}
              >
                <SelectTrigger className="w-44 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {alternatives.map((alt) => (
                    <SelectItem key={alt.id} value={alt.id}>
                      {alt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
};
