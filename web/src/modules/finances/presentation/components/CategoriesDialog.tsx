import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CATEGORY_COLORS } from '@himan/shared/finances';
import type { FinanceCategory, FinanceCategoryInput, FinanceKind } from '@himan/shared/finances';

interface Props {
  open: boolean; onOpenChange: (open: boolean) => void; categories: FinanceCategory[]; busy: boolean;
  onSave: (id: string | null, input: FinanceCategoryInput) => Promise<void>;
  onDelete: (category: FinanceCategory) => void;
}

function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return <div role="group" aria-label="Colour" className="flex flex-wrap gap-2">
    {CATEGORY_COLORS.map((color) => <button key={color} type="button" aria-label={`Colour ${color}`} aria-pressed={value === color}
      onClick={() => onChange(color)} style={{ background: color }}
      className={`h-8 w-8 rounded-full ring-offset-2 ring-offset-card ${value === color ? 'ring-2 ring-foreground' : ''}`} />)}
  </div>;
}

export function CategoriesDialog({ open, onOpenChange, categories, busy, onSave, onDelete }: Props) {
  const [kind, setKind] = useState<FinanceKind>('expense');
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(CATEGORY_COLORS[6]);
  const [editing, setEditing] = useState<{ id: string; name: string; color: string } | null>(null);
  const [error, setError] = useState('');
  const run = async (id: string | null, input: FinanceCategoryInput, done: () => void) => {
    try { setError(''); await onSave(id, input); done(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not save'); }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader><DialogTitle>Categories</DialogTitle>
        <DialogDescription>Rename, recolour or remove them. Removing one keeps its transactions as Uncategorized.</DialogDescription></DialogHeader>
      {(['expense', 'income'] as const).map((k) => <section key={k} aria-label={`${k === 'expense' ? 'Expense' : 'Income'} categories`}>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{k === 'expense' ? 'Expenses' : 'Income'}</h3>
        <ul className="space-y-2">
          {categories.filter((c) => c.kind === k).map((c) => <li key={c.id} className="rounded-xl border p-3">
            {editing?.id === c.id ? <div className="space-y-3">
              <Input aria-label="Category name" className="h-11 text-base" maxLength={40} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              <ColorPicker value={editing.color} onChange={(next) => setEditing({ ...editing, color: next })} />
              <div className="flex gap-2">
                <Button className="h-10 hover:scale-100" disabled={busy} onClick={() => void run(c.id, { kind: k, name: editing.name, color: editing.color }, () => setEditing(null))}>Save</Button>
                <Button className="h-10 hover:scale-100" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              </div>
            </div> : <div className="flex items-center gap-3">
              <span aria-hidden="true" className="h-4 w-4 shrink-0 rounded-full" style={{ background: c.color }} />
              <span className="min-w-0 flex-1 truncate text-base">{c.name}</span>
              <Button size="sm" variant="outline" className="h-9 hover:scale-100" aria-label={`Edit ${c.name}`} onClick={() => setEditing({ id: c.id, name: c.name, color: c.color })}>Edit</Button>
              <Button size="sm" variant="outline" className="h-9 text-destructive hover:scale-100" aria-label={`Delete ${c.name}`} onClick={() => onDelete(c)}>Delete</Button>
            </div>}
          </li>)}
        </ul>
      </section>)}
      <form className="space-y-3 border-t pt-4" onSubmit={(e) => { e.preventDefault(); void run(null, { kind, name, color }, () => setName('')); }}>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">New category</h3>
        <div role="group" aria-label="Category type" className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
          {(['expense', 'income'] as const).map((k) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}
            className={`h-10 rounded-lg text-base font-medium ${kind === k ? 'bg-background shadow' : 'text-muted-foreground'}`}>{k === 'expense' ? 'Expense' : 'Income'}</button>)}
        </div>
        <Input aria-label="New category name" className="h-11 text-base" placeholder="e.g. Pets" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
        <ColorPicker value={color} onChange={setColor} />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="h-11 w-full hover:scale-100" disabled={busy}>Add category</Button>
      </form>
    </DialogContent>
  </Dialog>;
}
