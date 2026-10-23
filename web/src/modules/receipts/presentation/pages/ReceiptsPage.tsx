import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, MotionConfig } from 'motion/react';
import { ArrowLeft, Loader2, Pencil, Plus, ReceiptText, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { expiringSoon, filterReceipts, tagCounts, todayISO } from '@himan/shared/receipts';
import type { Receipt } from '@himan/shared/receipts';
import { useReceipts } from '../hooks/useReceipts';
import { ReceiptCard } from '../components/ReceiptCard';
import { ReceiptForm } from '../components/ReceiptForm';
import { Photo } from '../components/Photo';
import { StatusChip } from '../components/StatusChip';
import { formatDate, formatPeso } from '../utils/format';

type View = 'all' | 'soon';
const pill = (active: boolean) => `min-h-11 rounded-full border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
  active ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-accent'}`;

export function ReceiptsPage() {
  const receipts = useReceipts();
  return <ReceiptsContent key={receipts.userId ?? 'signed-out'} {...receipts} />;
}

function ReceiptsContent({ receipts, photoUrls, loading, error, online, busy, run, refetch, userId }: ReturnType<typeof useReceipts>) {
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [view, setView] = useState<View>('all');
  // The dialog keeps its last content while it fades out, so closing is `setOpen(false)` and never clears `dialog`.
  const [dialog, setDialog_] = useState<{ id: string | null; editing: boolean }>({ id: null, editing: true });
  const [open, setOpen] = useState(false);
  const setDialog = (next: { id: string | null; editing: boolean } | null) => { if (next) { setDialog_(next); setOpen(true); } else setOpen(false); };
  const [deleteTarget, setDeleteTarget] = useState<Receipt | null>(null);
  const today = todayISO();
  const soon = useMemo(() => expiringSoon(receipts, today), [receipts, today]);
  const tags = useMemo(() => tagCounts(receipts), [receipts]);
  const activeTag = tag && tags.some((t) => t.tag === tag) ? tag : null;
  const shown = filterReceipts(view === 'soon' ? soon : receipts, search, activeTag);
  const selected = receipts.find((r) => r.id === dialog.id);
  const filtering = !!search.trim() || !!activeTag;

  return <MotionConfig reducedMotion="user"><div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <Link to="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16} />Dashboard</Link>
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight"><ReceiptText className="h-8 w-8 text-primary" />Receipts</h1>
        <p className="mt-2 text-muted-foreground">Keep a photo of every receipt, and never miss a warranty.</p></div>
      <Button className="h-11 rounded-xl" onClick={() => setDialog({ id: null, editing: true })} disabled={!online || !userId || busy}><Plus aria-hidden="true" className="h-4 w-4" />Add receipt</Button>
    </header>
    {!online ? <div role="status" className="rounded-xl border p-6 text-center">Connect to the internet to see your receipts.</div>
      : !userId ? <p>Sign in to see your receipts.</p> : <>
        <div role="group" aria-label="Show" className="mb-4 flex flex-wrap gap-2">
          <button type="button" aria-pressed={view === 'all'} className={pill(view === 'all')} onClick={() => setView('all')}>All receipts ({receipts.length})</button>
          <button type="button" aria-pressed={view === 'soon'} className={pill(view === 'soon')} onClick={() => setView('soon')}>Expiring soon ({soon.length})</button>
        </div>
        <div className="relative mb-4 w-full sm:max-w-md"><Search aria-hidden="true" className="absolute left-4 top-4 h-4 w-4 text-muted-foreground" />
          <Input aria-label="Search receipts" value={search} onChange={(e) => setSearch(e.target.value)} className="h-12 rounded-xl bg-card pl-11 text-base" placeholder="Search store, note or tag…" /></div>
        {tags.length > 0 && <div role="group" aria-label="Filter by tag" className="mb-6 flex flex-wrap gap-2">
          {tags.map(({ tag: t, count }) => <button key={t} type="button" aria-pressed={activeTag === t} className={pill(activeTag === t)}
            onClick={() => setTag(activeTag === t ? null : t)}>{t} ({count})</button>)}
          {activeTag && <button type="button" className={pill(false)} onClick={() => setTag(null)}>Clear tag filter</button>}
        </div>}
        {error && <div role="alert" className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 p-4">
          <p>Could not load your receipts.</p><Button variant="outline" onClick={() => void refetch()}>Retry</Button></div>}
        {loading ? <p role="status" className="flex items-center gap-2 py-10"><Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" />Loading receipts…</p>
          : !error && !shown.length ? <div className="rounded-2xl border border-dashed px-6 py-16 text-center">
            <ReceiptText className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold">{filtering ? 'No matching receipts' : view === 'soon' ? 'Nothing is expiring soon' : 'No receipts yet'}</h2>
            <p className="mt-2 text-muted-foreground">{filtering ? 'Try a different search or tag.' : view === 'soon' ? 'Warranties and expiry dates within 30 days show up here.' : 'Take a photo of a receipt to keep it safe.'}</p>
            {!filtering && view === 'all' && <Button className="mt-5 h-11 rounded-xl" onClick={() => setDialog({ id: null, editing: true })}>Add your first receipt</Button>}
          </div> : <ul className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Receipts">
            <AnimatePresence mode="popLayout">
              {shown.map((r) => <ReceiptCard key={r.id} receipt={r} today={today} photoUrl={photoUrls[r.photoPath]} onOpen={() => setDialog({ id: r.id, editing: false })} />)}
            </AnimatePresence>
          </ul>}
      </>}

    <Dialog open={open && online && !!userId} onOpenChange={(next) => { if (!next && !busy) setOpen(false); }}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-xl flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:rounded-2xl">
        <DialogHeader className="shrink-0 border-b p-4 pr-24 text-left">
          <DialogTitle className="break-words text-lg leading-6">{dialog.editing ? selected ? 'Edit receipt' : 'Add receipt' : selected?.merchant ?? 'Receipt unavailable'}</DialogTitle>
          <DialogDescription>{dialog.editing ? 'A photo, the store, the amount and the date.' : selected ? `${formatDate(selected.purchasedOn)} · ${formatPeso(selected.amount)}` : 'Close this and try again.'}</DialogDescription>
        </DialogHeader>
        {dialog.editing ? <div className="min-h-0 overflow-y-auto p-6">
          <ReceiptForm key={dialog.id ?? 'new'} receipt={selected} existingPhotoUrl={selected && photoUrls[selected.photoPath]} knownTags={tags.map((t) => t.tag)} busy={busy}
            onCancel={() => setDialog(selected ? { id: selected.id, editing: false } : null)}
            onSave={async (value, photo) => {
              const saved = await run({ type: 'save', id: dialog.id, input: value, photo }) as Receipt;
              setDialog({ id: saved.id, editing: false }); toast.success('Receipt saved');
            }} />
        </div> : selected && <>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            <Photo src={photoUrls[selected.photoPath]} alt={`Photo of the ${selected.merchant} receipt`} className="min-h-48 w-full rounded-xl [&_img]:object-contain" />
            <StatusChip receipt={selected} today={today} />
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Warranty ends</dt><dd>{selected.warrantyEndsOn ? formatDate(selected.warrantyEndsOn) : 'Not set'}</dd>
              <dt className="text-muted-foreground">Expires</dt><dd>{selected.expiresOn ? formatDate(selected.expiresOn) : 'Not set'}</dd>
              {selected.tags.length > 0 && <><dt className="text-muted-foreground">Tags</dt><dd>{selected.tags.join(', ')}</dd></>}
            </dl>
            {selected.note && <p className="whitespace-pre-wrap break-words rounded-xl bg-muted p-3 text-sm">{selected.note}</p>}
          </div>
          <div className="flex shrink-0 items-center justify-between gap-3 border-t px-4 py-3">
            <Button className="h-11 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive" variant="ghost" disabled={busy} onClick={() => setDeleteTarget(selected)}><Trash2 aria-hidden="true" />Delete receipt</Button>
            <Button className="h-11 rounded-xl" variant="outline" disabled={busy} onClick={() => setDialog({ id: selected.id, editing: true })}><Pencil aria-hidden="true" />Edit receipt</Button>
          </div>
        </>}
      </DialogContent>
    </Dialog>
    <AlertDialog open={!!deleteTarget && online} onOpenChange={(open) => { if (!open && !busy) setDeleteTarget(null); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete the {deleteTarget?.merchant} receipt?</AlertDialogTitle>
        <AlertDialogDescription>The receipt and its photo will be permanently deleted. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={busy}>Keep it</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={async (event) => {
            event.preventDefault(); if (!deleteTarget) return;
            try { await run({ type: 'remove', receipt: deleteTarget }); setDialog(null); setDeleteTarget(null); toast.success('Receipt deleted'); }
            catch { toast.error('Deletion did not finish. Retry when connected.'); }
          }}>{busy ? 'Deleting…' : 'Permanently delete'}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div></MotionConfig>;
}
