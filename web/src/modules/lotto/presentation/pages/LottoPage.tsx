import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Pause, Pencil, Play, Plus, Ticket, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { LOTTO_GAMES, LOTTO_GAME_INFO, LOTTO_NUMBERS_LIMIT, drawDateLabel, lottoGameLabel } from '@himan/shared/lotto';
import type { LottoDraw, LottoGame, LottoNumbers } from '@himan/shared/lotto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuth } from '@auth/index';
import { useLottoDraws, useLottoNumbers } from '../hooks/useLotto';
import { DrawCard } from '../components/DrawCard';
import { LottoBalls } from '../components/LottoBalls';
import { NumbersDialog } from '../components/NumbersDialog';

const dayHeading = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
};

function Results({ sets }: { sets: LottoNumbers[] }) {
  const [game, setGame] = useState<LottoGame | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const filter = useMemo(() => ({ game: game || undefined, from: from || undefined, to: to || undefined }), [game, from, to]);
  const { draws, loading, error, more, loadingMore, loadMore, refetch } = useLottoDraws(filter);
  const days = useMemo(() => {
    const byDay = new Map<string, LottoDraw[]>();
    for (const draw of draws) byDay.set(draw.drawDate, [...(byDay.get(draw.drawDate) ?? []), draw]);
    return [...byDay];
  }, [draws]);
  const filtered = !!(game || from || to);
  return <div className="space-y-6">
    <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => event.preventDefault()}>
      <div className="space-y-1.5"><Label htmlFor="lotto-filter-game">Game</Label>
        <select id="lotto-filter-game" className="block h-11 rounded-xl border border-input bg-background px-3 text-base" value={game} onChange={(event) => setGame(event.target.value as LottoGame | '')}>
          <option value="">All games</option>{LOTTO_GAMES.map((g) => <option key={g} value={g}>{lottoGameLabel(g)}</option>)}</select></div>
      <div className="space-y-1.5"><Label htmlFor="lotto-from">From</Label><Input id="lotto-from" type="date" className="h-11 rounded-xl" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} /></div>
      <div className="space-y-1.5"><Label htmlFor="lotto-to">To</Label><Input id="lotto-to" type="date" className="h-11 rounded-xl" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} /></div>
      {filtered && <Button type="button" variant="ghost" className="h-11" onClick={() => { setGame(''); setFrom(''); setTo(''); }}>Clear filters</Button>}
    </form>
    {error ? <div role="alert" className="space-y-3 rounded-xl border p-6 text-center"><p>Couldn’t load the results. Check your connection and try again.</p>
        <Button variant="outline" onClick={() => void refetch()}>Try again</Button></div>
      : loading ? <p role="status" className="text-muted-foreground">Loading results…</p>
      : days.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">{filtered ? 'No draws match these filters.' : 'No results yet. They appear after each night’s draw.'}</p>
      : <div className="space-y-8">
        {days.map(([date, list]) => <section key={date} aria-label={dayHeading(date)} className="space-y-3">
          <h2 className="text-base font-semibold">{dayHeading(date)}</h2>
          <div className="grid gap-3 md:grid-cols-2">{list.map((draw) => <DrawCard key={draw.id} draw={draw} sets={sets} />)}</div>
        </section>)}
        {more && <div className="flex justify-center"><Button variant="outline" className="h-11 rounded-xl" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? 'Loading…' : 'Show older results'}</Button></div>}
      </div>}
  </div>;
}

function MyNumbers({ sets, busy, run, loading }: ReturnType<typeof useLottoNumbers>) {
  const [dialog, setDialog] = useState<{ set?: LottoNumbers } | null>(null);
  const [removing, setRemoving] = useState<LottoNumbers | null>(null);
  const full = sets.length >= LOTTO_NUMBERS_LIMIT;
  const act = async (task: Promise<unknown>, done: string) => { try { await task; toast.success(done); } catch { toast.error('Could not do that. Check your connection and try again.'); } };
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-muted-foreground">Keep the numbers you play. We check them against every draw from the day you save them. {sets.length} of {LOTTO_NUMBERS_LIMIT} kept.</p>
      <Button className="h-11 rounded-xl hover:scale-100" disabled={full || busy} onClick={() => setDialog({})}><Plus aria-hidden="true" className="h-4 w-4" />Add numbers</Button>
    </div>
    {full && <p role="status" className="text-sm text-muted-foreground">You’ve kept the most you can. Delete some to add more.</p>}
    {loading ? <p role="status" className="text-muted-foreground">Loading…</p>
      : sets.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">No numbers yet. Add the ones you play, and each result shows how many matched.</p>
      : <ul className="grid gap-3 md:grid-cols-2">{sets.map((set) => <li key={set.id} className="space-y-3 rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold">{set.label || 'Untitled numbers'}</h3>
          <span className="text-sm text-muted-foreground">{lottoGameLabel(set.game)}{set.active ? '' : ' · Paused'}</span></div>
        <LottoBalls label="Numbers" numbers={set.numbers} />
        <p className="text-sm text-muted-foreground">{set.active ? `Counting from ${drawDateLabel(set.startsOn, true)}` : 'Paused: not checked against new draws.'}</p>
        <div className="flex flex-wrap gap-2 border-t pt-3">
          <Button variant="outline" size="sm" className="h-10" disabled={busy} onClick={() => setDialog({ set })}><Pencil aria-hidden="true" className="h-4 w-4" />Edit</Button>
          <Button variant="outline" size="sm" className="h-10" disabled={busy} onClick={() => void act(run({ type: 'active', id: set.id, active: !set.active }), set.active ? 'Paused' : 'Resumed')}>
            {set.active ? <><Pause aria-hidden="true" className="h-4 w-4" />Pause</> : <><Play aria-hidden="true" className="h-4 w-4" />Resume</>}</Button>
          <Button variant="outline" size="sm" className="h-10 text-destructive" disabled={busy} onClick={() => setRemoving(set)}><Trash2 aria-hidden="true" className="h-4 w-4" />Delete</Button>
        </div>
      </li>)}</ul>}
    <NumbersDialog open={!!dialog} set={dialog?.set} game="6/45" busy={busy} onClose={() => setDialog(null)}
      onSave={async (input) => { await run({ type: 'save', id: dialog?.set?.id ?? null, input }); setDialog(null); toast.success(dialog?.set ? 'Numbers updated' : 'Numbers saved'); }} />
    <ConfirmDialog open={!!removing} onOpenChange={(open) => !open && setRemoving(null)} variant="destructive" title="Delete these numbers?"
      description={`${removing?.label || 'These numbers'} will no longer be checked against draws.`} confirmText="Delete"
      onConfirm={() => { const set = removing!; setRemoving(null); void act(run({ type: 'remove', id: set.id }), 'Deleted'); }} />
  </div>;
}

export function LottoPage() {
  const { user } = useAuth();
  const numbers = useLottoNumbers();
  return <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6">
    <Link to="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16} />Dashboard</Link>
    <header className="mb-8"><h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight"><Ticket className="h-8 w-8 text-primary" />Lotto</h1>
      <p className="mt-2 text-muted-foreground">PCSO results for {Object.keys(LOTTO_GAME_INFO).join(', ')}. Draws are at 9 PM, and results appear a little after.</p></header>
    {!user ? <p>Sign in to see results.</p>
      : <Tabs defaultValue="results">
        <TabsList className="mb-6 h-12"><TabsTrigger className="h-10 px-5 text-base" value="results">Results</TabsTrigger>
          <TabsTrigger className="h-10 px-5 text-base" value="numbers">My numbers</TabsTrigger></TabsList>
        <TabsContent value="results"><Results sets={numbers.sets} /></TabsContent>
        <TabsContent value="numbers"><MyNumbers {...numbers} /></TabsContent>
      </Tabs>}
  </div>;
}
