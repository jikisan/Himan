import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { LOTTO_GAMES, LOTTO_GAME_INFO, LOTTO_SET_SIZE, lottoGameLabel, lottoNumbersSchema } from '@himan/shared/lotto';
import type { LottoGame, LottoNumbers, LottoNumbersInput } from '@himan/shared/lotto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FieldError, FormErrorBanner } from '@core/presentation/components';
import { cn } from '@core/presentation/utils';

function Form({ set, game: initialGame, busy, onSave, onCancel }: {
  set?: LottoNumbers; game: LottoGame; busy: boolean; onSave(input: LottoNumbersInput): Promise<void>; onCancel(): void;
}) {
  const [game, setGame] = useState<LottoGame>(set?.game ?? initialGame);
  const [label, setLabel] = useState(set?.label ?? '');
  const [numbers, setNumbers] = useState<number[]>(set?.numbers ?? []);
  const [error, setError] = useState('');
  const max = LOTTO_GAME_INFO[game].max;
  const toggle = (n: number) => { setError(''); setNumbers((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : prev.length < LOTTO_SET_SIZE ? [...prev, n].sort((a, b) => a - b) : prev); };
  return <form noValidate className="space-y-5" onSubmit={async (event) => {
    event.preventDefault();
    const result = lottoNumbersSchema.safeParse({ game, label, numbers });
    if (!result.success) { setError(result.error.issues[0].message); return; }
    try { await onSave(result.data); } catch (e) { setError(e instanceof Error && e.message ? e.message : 'Could not save these numbers. Try again.'); }
  }}>
    <FormErrorBanner message={error} />
    <fieldset disabled={busy} className="space-y-5">
      <div className="space-y-2"><Label htmlFor="lotto-game">Game</Label>
        <select id="lotto-game" className="h-12 w-full rounded-xl border border-input bg-background px-3 text-base disabled:opacity-60" value={game} disabled={!!set}
          onChange={(event) => { const next = event.target.value as LottoGame; setGame(next); setNumbers((prev) => prev.filter((n) => n <= LOTTO_GAME_INFO[next].max)); }}>
          {LOTTO_GAMES.map((g) => <option key={g} value={g}>{lottoGameLabel(g)}</option>)}</select>
        {set && <p className="text-sm text-muted-foreground">The game can’t change. Add new numbers to play another game.</p>}</div>
      <div className="space-y-2"><Label htmlFor="lotto-label">Name <span className="text-muted-foreground">(optional)</span></Label>
        <Input id="lotto-label" className="h-12 rounded-xl text-base" maxLength={60} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="e.g. Birthday" /></div>
      <div className="space-y-2">
        <div className="flex items-baseline justify-between"><Label id="lotto-pick">Pick {LOTTO_SET_SIZE} numbers</Label>
          <span role="status" className="text-sm text-muted-foreground">{numbers.length} of {LOTTO_SET_SIZE} chosen</span></div>
        <div role="group" aria-labelledby="lotto-pick" className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => <button key={n} type="button" aria-pressed={numbers.includes(n)} onClick={() => toggle(n)}
            className={cn('h-10 rounded-full border text-sm font-semibold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              numbers.includes(n) ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-accent')}>{n}</button>)}
        </div>
        <FieldError id="lotto-pick" message={error && numbers.length !== LOTTO_SET_SIZE ? error : undefined} />
      </div>
      <div className="flex justify-end gap-3 border-t pt-5">
        <Button type="button" variant="outline" className="h-11 rounded-xl hover:scale-100" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="h-11 rounded-xl hover:scale-100">{busy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}Save numbers</Button>
      </div>
    </fieldset>
  </form>;
}

/** Add, or edit, a set of numbers to keep. `set` is the one being edited. */
export function NumbersDialog({ open, set, game, busy, onSave, onClose }: {
  open: boolean; set?: LottoNumbers; game: LottoGame; busy: boolean; onSave(input: LottoNumbersInput): Promise<void>; onClose(): void;
}) {
  return <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader><DialogTitle>{set ? 'Edit numbers' : 'Add numbers'}</DialogTitle>
        <DialogDescription>We check these against every draw of this game from the day you save them.</DialogDescription></DialogHeader>
      {open && <Form key={set?.id ?? 'new'} set={set} game={game} busy={busy} onSave={onSave} onCancel={onClose} />}
    </DialogContent>
  </Dialog>;
}
