import { useState } from 'react';
import { ChevronDown, ChevronRight, GripVertical, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui';
import type { CvBlockRef, CareerCvBlockType } from '@himan/shared/career';
import type { CvBlockOption } from '../hooks/useCvData';
import { useDragReorder } from '../hooks/useDragReorder';

function refKey(ref: CvBlockRef): string {
  switch (ref.type) {
    case 'header':
    case 'summary':
      return ref.type;
    case 'skill':
      return `skill:${ref.category}`;
    default:
      return `${ref.type}:${ref.id}`;
  }
}

interface CvComposePaneProps {
  profileBlocks: CvBlockOption[];
  customBlocks: CareerCvBlockType[];
  selected: CvBlockRef[];
  onChange: (selected: CvBlockRef[]) => void;
}

export const CvComposePane = ({ profileBlocks, customBlocks, selected, onChange }: CvComposePaneProps) => {
  const [addOpen, setAddOpen] = useState(false);

  const pool: CvBlockOption[] = [
    ...profileBlocks,
    ...customBlocks.map((block) => ({ ref: { type: 'custom' as const, id: block.id }, label: block.title })),
  ];
  const poolByKey = new Map(pool.map((option) => [refKey(option.ref), option]));
  const selectedKeys = new Set(selected.map(refKey));
  const available = pool.filter((option) => !selectedKeys.has(refKey(option.ref)));

  const { dragIndex, dragHandleProps, dropTargetProps } = useDragReorder(selected, onChange);

  const remove = (index: number) => onChange(selected.filter((_, i) => i !== index));
  const add = (ref: CvBlockRef) => onChange([...selected, ref]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Selected blocks</h3>
        {selected.length === 0 ? (
          <p className="text-sm text-muted-foreground">No blocks selected yet.</p>
        ) : (
          <div className="space-y-2">
            {selected.map((ref, index) => {
              const option = poolByKey.get(refKey(ref));
              return (
                <div
                  key={`${refKey(ref)}-${index}`}
                  {...dropTargetProps(index)}
                  className={`rounded-lg border border-border p-2.5 flex items-center gap-2 ${dragIndex === index ? 'opacity-40' : ''}`}
                >
                  <div {...dragHandleProps(index)} className="cursor-grab active:cursor-grabbing text-muted-foreground touch-none">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <p className="text-sm min-w-0 flex-1 truncate">{option?.label ?? '(missing block)'}</p>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => remove(index)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
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
              {available.map((option) => (
                <div key={refKey(option.ref)} className="rounded-lg border border-border p-2.5 flex items-center gap-2">
                  <p className="text-sm min-w-0 flex-1 truncate">{option.label}</p>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => add(option.ref)}>
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
