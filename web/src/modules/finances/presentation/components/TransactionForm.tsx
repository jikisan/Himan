import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { centavosToInput, manilaToday, parsePesos, transactionSchema } from '@himan/shared/finances';
import type { FinanceCategory, FinanceKind, FinanceTransaction, FinanceTransactionInput } from '@himan/shared/finances';

const KINDS: { kind: FinanceKind; label: string }[] = [{ kind: 'expense', label: 'Expense' }, { kind: 'income', label: 'Income' }];

export function TransactionForm({ transaction, categories, defaultDate, busy, onSave, onCancel }: {
  transaction?: FinanceTransaction; categories: FinanceCategory[]; defaultDate: string; busy: boolean;
  onSave: (value: FinanceTransactionInput) => Promise<void>; onCancel: () => void;
}) {
  const [kind, setKind] = useState<FinanceKind>(transaction?.kind ?? 'expense');
  const [amount, setAmount] = useState(transaction ? centavosToInput(transaction.amountCentavos) : '');
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? '');
  const [date, setDate] = useState(transaction?.occurredOn ?? defaultDate);
  const [note, setNote] = useState(transaction?.note ?? '');
  const [error, setError] = useState('');
  const options = categories.filter((c) => c.kind === kind);

  return <form className="space-y-4" noValidate onSubmit={async (event) => {
    event.preventDefault();
    let amountCentavos: number;
    try { amountCentavos = parsePesos(amount); } catch (e) { setError((e as Error).message); return; }
    const result = transactionSchema.safeParse({ kind, amountCentavos, occurredOn: date, note, categoryId: categoryId || null });
    if (!result.success) { setError(result.error.issues[0].message); return; }
    setError('');
    try { await onSave(result.data); } catch { setError('Could not save. Your changes are still here; try again.'); }
  }}>
    <div role="group" aria-label="Type" className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
      {KINDS.map((k) => <button key={k.kind} type="button" aria-pressed={kind === k.kind}
        onClick={() => { setKind(k.kind); setCategoryId(''); }}
        className={`h-11 rounded-lg text-base font-medium transition-colors ${kind === k.kind
          ? k.kind === 'income' ? 'bg-green-600 text-white shadow' : 'bg-rose-600 text-white shadow'
          : 'text-muted-foreground hover:text-foreground'}`}>{k.label}</button>)}
    </div>
    <div className="space-y-2"><Label htmlFor="fin-amount" required>Amount (₱)</Label>
      <Input id="fin-amount" className="h-12 rounded-xl text-lg tabular-nums" inputMode="decimal" autoFocus placeholder="0.00"
        value={amount} onChange={(e) => setAmount(e.target.value)} autoComplete="off" /></div>
    <div className="space-y-2"><Label htmlFor="fin-category">Category</Label>
      <select id="fin-category" className="h-12 w-full rounded-xl border border-input bg-background px-3 text-base"
        value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
        <option value="">Uncategorized</option>
        {options.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select></div>
    <div className="space-y-2"><Label htmlFor="fin-date" required>Date</Label>
      <Input id="fin-date" type="date" className="h-12 rounded-xl text-base" max={manilaToday()} value={date} onChange={(e) => setDate(e.target.value)} /></div>
    <div className="space-y-2"><Label htmlFor="fin-note">Note <span className="text-muted-foreground">(optional)</span></Label>
      <Input id="fin-note" className="h-12 rounded-xl text-base" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Lunch at the market" /></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex justify-end gap-3 border-t pt-5">
      <Button type="button" variant="outline" className="h-11 rounded-xl hover:scale-100" onClick={onCancel}>Cancel</Button>
      <Button type="submit" disabled={busy} className="h-11 rounded-xl hover:scale-100">
        {busy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}Save</Button>
    </div>
  </form>;
}
