import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { governmentGroupNameSchema, isGovernmentGroupNameTaken } from '@himan/shared/government';
import type { GovernmentGroup } from '@himan/shared/government';

export function GovernmentGroupManager({ open, groups, counts, busy, onClose, onAdd, onRename, onDelete }: {
  open: boolean; groups: GovernmentGroup[]; counts: Record<string, number>; busy: boolean; onClose: () => void;
  onAdd: (name: string) => Promise<void>; onRename: (id: string, name: string) => Promise<void>; onDelete: (group: GovernmentGroup) => void;
}) {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState('');
  const submit = async (value: string, exceptId: string | undefined, action: (name: string) => Promise<void>, done: () => void) => {
    const parsed = governmentGroupNameSchema.safeParse(value);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    if (isGovernmentGroupNameTaken(groups, parsed.data, exceptId)) { setError('You already have a group with that name'); return; }
    setError('');
    try { await action(parsed.data); done(); }
    catch { setError('Could not save the group. Retry when connected.'); }
  };
  return <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen && !busy) { setEditing(null); setError(''); onClose(); } }}>
    <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto rounded-2xl">
      <DialogHeader className="text-left"><DialogTitle>Manage groups</DialogTitle>
        <DialogDescription>Personal and Business are always here. Add your own groups to sort your records.</DialogDescription></DialogHeader>
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {groups.map((group) => <motion.li key={group.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"><div className="flex flex-wrap items-center gap-2 rounded-xl border p-3">
            {editing?.id === group.id
              ? <form className="flex min-w-0 flex-1 flex-wrap items-end gap-2" noValidate onSubmit={(event) => { event.preventDefault(); void submit(editing.name, group.id, (value) => onRename(group.id, value), () => setEditing(null)); }}>
                <div className="min-w-0 flex-1"><Label htmlFor={`gov-group-${group.id}`}>New name for {group.name}</Label>
                  <Input id={`gov-group-${group.id}`} autoFocus className="mt-1 h-11" maxLength={40} value={editing.name} onFocus={(event) => event.target.select()} onChange={(event) => { setError(''); setEditing({ id: group.id, name: event.target.value }); }} /></div>
                <Button className="h-11 hover:scale-100" type="submit" disabled={busy}>Save name</Button>
                <Button className="h-11 hover:scale-100" type="button" variant="outline" onClick={() => { setEditing(null); setError(''); }}>Cancel</Button>
              </form>
              : <>
                <div className="min-w-0 flex-1"><p className="break-words font-medium">{group.name}</p>
                  <p className="text-xs text-muted-foreground">{counts[group.id] ?? 0} {(counts[group.id] ?? 0) === 1 ? 'record' : 'records'}{group.kind !== 'custom' ? ' · Always available' : ''}</p></div>
                {group.kind === 'custom' && <>
                  <Button className="h-11 hover:scale-100" variant="outline" disabled={busy} onClick={() => { setError(''); setEditing({ id: group.id, name: group.name }); }}><Pencil aria-hidden="true" className="h-4 w-4" />Rename<span className="sr-only"> {group.name}</span></Button>
                  <Button className="h-11 text-destructive hover:scale-100 hover:text-destructive" variant="outline" disabled={busy} onClick={() => onDelete(group)}><Trash2 aria-hidden="true" className="h-4 w-4" />Delete<span className="sr-only"> {group.name}</span></Button>
                </>}
              </>}
          </div></motion.li>)}
        </AnimatePresence>
      </ul>
      <form className="space-y-2 border-t pt-4" noValidate onSubmit={(event) => { event.preventDefault(); void submit(name, undefined, (value) => onAdd(value), () => setName('')); }}>
        <Label htmlFor="gov-new-group">New group name</Label>
        <div className="flex flex-wrap gap-2">
          <Input id="gov-new-group" className="h-11 min-w-0 flex-1" maxLength={40} value={name} placeholder="e.g. Family" aria-invalid={!!error && !editing || undefined} onChange={(event) => { setError(''); setName(event.target.value); }} />
          <Button className="h-11 hover:scale-100" type="submit" disabled={busy}>{busy && !editing ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Plus aria-hidden="true" className="h-4 w-4" />}Add group</Button>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </form>
      <div className="flex justify-end"><Button className="h-11 hover:scale-100" variant="outline" disabled={busy} onClick={() => { setEditing(null); setError(''); onClose(); }}>Done</Button></div>
    </DialogContent>
  </Dialog>;
}
