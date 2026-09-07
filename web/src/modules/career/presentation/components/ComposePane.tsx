import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import type { CareerBlockKind, CareerBlockType, CareerLength } from '@himan/shared/career';

const KIND_LABELS: Record<CareerBlockKind, string> = {
  greeting: 'Greeting',
  opening: 'Opening',
  experience_line: 'Experience line',
  proof: 'Proof paragraph',
  portfolio_line: 'Portfolio line',
  close: 'Close',
  cv_summary: 'CV summary',
};

export interface SelectedBlock {
  blockId: string;
  length: CareerLength | null;
}

interface ComposePaneProps {
  allBlocks: CareerBlockType[];
  selected: SelectedBlock[];
  onChange: (selected: SelectedBlock[]) => void;
}

export const ComposePane = ({ allBlocks, selected, onChange }: ComposePaneProps) => {
  const [addOpen, setAddOpen] = useState(false);
  const blockById = new Map(allBlocks.map((block) => [block.id, block]));
  const selectedIds = new Set(selected.map((s) => s.blockId));
  const available = allBlocks.filter((block) => !selectedIds.has(block.id));

  const move = (index: number, direction: -1 | 1) => {
    const next = [...selected];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(selected.filter((_, i) => i !== index));
  };

  const setLength = (index: number, length: CareerLength | null) => {
    onChange(selected.map((s, i) => (i === index ? { ...s, length } : s)));
  };

  const swap = (index: number, blockId: string) => {
    onChange(selected.map((s, i) => (i === index ? { ...s, blockId } : s)));
  };

  const add = (blockId: string) => {
    onChange([...selected, { blockId, length: null }]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Selected blocks</h3>
        {selected.length === 0 ? (
          <p className="text-sm text-muted-foreground">No blocks selected yet.</p>
        ) : (
          <div className="space-y-2">
            {selected.map((s, index) => {
              const block = blockById.get(s.blockId);
              if (!block) return null;
              const alternatives = allBlocks.filter((b) => b.kind === block.kind);
              return (
                <div key={`${s.blockId}-${index}`} className="rounded-lg border border-border p-2.5 flex items-start gap-2">
                  <div className="flex flex-col">
                    <Button size="icon" variant="ghost" className="h-5 w-5" disabled={index === 0} onClick={() => move(index, -1)}>
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-5 w-5" disabled={index === selected.length - 1} onClick={() => move(index, 1)}>
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-[10px] text-muted-foreground">{KIND_LABELS[block.kind]}</p>
                    <Select value={s.blockId} onValueChange={(v) => swap(index, v)} disabled={alternatives.length <= 1}>
                      <SelectTrigger className="h-8 text-xs">
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
                  <div className="space-y-1">
                    <p className="text-[10px] text-transparent select-none" aria-hidden="true">Length</p>
                    <Select value={s.length ?? 'always'} onValueChange={(v) => setLength(index, v === 'always' ? null : (v as CareerLength))}>
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="always">Always</SelectItem>
                        <SelectItem value="short">Short only</SelectItem>
                        <SelectItem value="long">Long only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-transparent select-none" aria-hidden="true">X</p>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => remove(index)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setAddOpen(!addOpen)}
          className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          {addOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          Add block
        </button>

        {addOpen && (
          available.length === 0 ? (
            <p className="text-sm text-muted-foreground">All blocks are selected.</p>
          ) : (
            <div className="space-y-1.5">
              {available.map((block) => (
                <div key={block.id} className="rounded-lg border border-border p-2.5 flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{block.label}</p>
                    <p className="text-xs text-muted-foreground">{KIND_LABELS[block.kind]}</p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => add(block.id)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};
