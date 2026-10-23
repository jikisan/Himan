import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Plus, Search, Tags, Wallet } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { breakdown, filterTransactions, formatPesos, manilaToday, monthLabel, monthOf, percentLabel, shiftMonth, summarize } from '@himan/shared/finances';
import type { FinanceCategory, FinanceTransaction } from '@himan/shared/finances';
import { useFinances } from '../hooks/useFinances';
import { CountUp } from '../components/CountUp';
import { Donut } from '../components/Donut';
import { TransactionForm } from '../components/TransactionForm';
import { CategoriesDialog } from '../components/CategoriesDialog';

type Pending = { type: 'transaction'; id: string } | { type: 'category'; category: FinanceCategory } | null;

export function FinancesPage() {
  const today = manilaToday();
  const [month, setMonth] = useState(monthOf(today));
  const f = useFinances(month);
  return <MotionConfig reducedMotion="user"><FinancesContent key={f.userId ?? 'signed-out'} month={month} setMonth={setMonth} today={today} {...f} /></MotionConfig>;
}

function Total({ label, centavos, tone }: { label: string; centavos: number; tone: string }) {
  return <div className="rounded-2xl border bg-card p-4 shadow-sm">
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    <p className={`mt-1 text-2xl font-semibold tracking-tight sm:text-3xl ${tone}`}><CountUp centavos={centavos} /></p>
  </div>;
}

function FinancesContent({ month, setMonth, today, userId, categories, transactions, loading, error, refetch, busy, run }:
  ReturnType<typeof useFinances> & { month: string; setMonth: (m: string) => void; today: string }) {
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<{ transaction?: FinanceTransaction } | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [pending, setPending] = useState<Pending>(null);

  const totals = useMemo(() => summarize(transactions), [transactions]);
  const rows = useMemo(() => breakdown(transactions, categories), [transactions, categories]);
  const visible = useMemo(() => filterTransactions(transactions, categories, search), [transactions, categories, search]);
  const names = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const days = useMemo(() => {
    const groups = new Map<string, FinanceTransaction[]>();
    for (const t of visible) groups.set(t.occurredOn, [...(groups.get(t.occurredOn) ?? []), t]);
    return [...groups];
  }, [visible]);

  const confirmDelete = async () => {
    if (!pending) return;
    try {
      await run(pending.type === 'transaction' ? { type: 'deleteTransaction', id: pending.id } : { type: 'deleteCategory', id: pending.category.id });
      toast.success('Deleted');
    } catch { toast.error('Could not delete. Try again.'); }
    setPending(null);
  };

  const defaultDate = month === monthOf(today) ? today : `${month}-01`;
  const atLatest = month >= monthOf(today);

  return <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6">
    <Link to="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16} />Dashboard</Link>
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight"><Wallet className="h-8 w-8 text-primary" />Finances</h1>
        <p className="mt-2 text-muted-foreground">Track what comes in and what goes out, month by month.</p></div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="h-11 rounded-xl hover:scale-100" onClick={() => setCategoriesOpen(true)}><Tags aria-hidden="true" />Categories</Button>
        <Button className="h-11 rounded-xl hover:scale-100" onClick={() => setEditor({})} disabled={!userId}><Plus aria-hidden="true" />Add transaction</Button>
      </div>
    </header>

    {!userId ? <p>Sign in to track your finances.</p> : <>
      <nav aria-label="Month" className="mb-6 flex items-center justify-between gap-2 rounded-2xl border bg-card p-2">
        <Button variant="ghost" className="h-11 hover:scale-100" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft aria-hidden="true" />Previous</Button>
        <h2 className="whitespace-nowrap text-base font-semibold sm:text-lg" aria-live="polite">{monthLabel(month)}</h2>
        <Button variant="ghost" className="h-11 hover:scale-100" disabled={atLatest} onClick={() => setMonth(shiftMonth(month, 1))}>Next<ChevronRight aria-hidden="true" /></Button>
      </nav>

      {error && <div role="alert" className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 p-4">
        <p>Could not load your finances.</p><Button variant="outline" onClick={refetch}>Retry</Button></div>}

      {loading ? <p role="status" className="flex items-center gap-2 py-10"><Loader2 className="h-5 w-5 animate-spin" />Loading…</p> : !error && <>
        <section aria-label="Totals" className="mb-6 grid gap-3 sm:grid-cols-3">
          <Total label="Money in" centavos={totals.income} tone="text-green-600 dark:text-green-400" />
          <Total label="Money out" centavos={totals.expense} tone="text-rose-600 dark:text-rose-400" />
          <Total label="Left over" centavos={totals.balance} tone={totals.balance < 0 ? 'text-rose-600 dark:text-rose-400' : ''} />
        </section>

        {rows.length > 0 && <section aria-label="Spending by category" className="mb-8 grid items-center gap-6 rounded-2xl border bg-card p-5 shadow-sm sm:grid-cols-[auto_1fr]">
          <div className="relative mx-auto">
            <Donut key={`${month}-${transactions.length}`} rows={rows} />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xs text-muted-foreground">Spent</span><span className="text-base font-semibold tabular-nums">{formatPesos(totals.expense)}</span>
            </div>
          </div>
          <ul className="space-y-3">
            {rows.map((row, i) => <li key={row.categoryId ?? 'none'}>
              <div className="flex items-center justify-between gap-3 text-base">
                <span className="flex min-w-0 items-center gap-2"><span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ background: row.color }} /><span className="truncate">{row.name}</span></span>
                <span className="shrink-0 tabular-nums">{formatPesos(row.total)} <span className="text-sm text-muted-foreground">{percentLabel(row.share)}</span></span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                <motion.div className="h-full rounded-full" style={{ background: row.color }} initial={{ width: 0 }} animate={{ width: `${row.share * 100}%` }}
                  transition={{ duration: 0.6, delay: 0.05 * i, ease: 'easeOut' }} />
              </div>
            </li>)}
          </ul>
        </section>}

        <div className="relative mb-4 w-full sm:max-w-md"><Search aria-hidden="true" className="absolute left-4 top-4 h-4 w-4 text-muted-foreground" />
          <Input aria-label="Search transactions" value={search} onChange={(e) => setSearch(e.target.value)} className="h-12 rounded-xl bg-card pl-11 text-base" placeholder="Search notes or categories…" /></div>

        {!visible.length ? <div className="rounded-2xl border border-dashed px-6 py-14 text-center">
          <Wallet className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-lg font-semibold">{search ? 'Nothing matches your search' : `No transactions in ${monthLabel(month)}`}</h2>
          <p className="mt-2 text-muted-foreground">{search ? 'Try a different word.' : 'Add what you earned or spent to see your totals.'}</p>
          {!search && <Button className="mt-5 h-11 rounded-xl hover:scale-100" onClick={() => setEditor({})}>Add your first transaction</Button>}
        </div> : <div className="space-y-5">
          {days.map(([date, list]) => <section key={date} aria-label={format(parseISO(date), 'EEEE, MMMM d')}>
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{format(parseISO(date), 'EEEE, MMMM d')}</h3>
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
              <AnimatePresence initial={false}>
                {list.map((t) => {
                  const category = t.categoryId ? names.get(t.categoryId) : undefined;
                  return <motion.li key={t.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="flex flex-wrap items-center gap-3 p-4">
                      <span aria-hidden="true" className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: category?.color ?? '#94a3b8' }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-medium">{category?.name ?? 'Uncategorized'}</p>
                        {t.note && <p className="truncate text-sm text-muted-foreground">{t.note}</p>}
                      </div>
                      <p className={`text-lg font-semibold tabular-nums ${t.kind === 'income' ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        <span className="sr-only">{t.kind === 'income' ? 'Income ' : 'Expense '}</span>{t.kind === 'income' ? '+' : '−'}{formatPesos(t.amountCentavos)}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-10 text-sm hover:scale-100" aria-label={`Edit ${category?.name ?? 'Uncategorized'} ${formatPesos(t.amountCentavos)}`} onClick={() => setEditor({ transaction: t })}>Edit</Button>
                        <Button size="sm" variant="outline" className="h-10 text-sm text-destructive hover:scale-100" aria-label={`Delete ${category?.name ?? 'Uncategorized'} ${formatPesos(t.amountCentavos)}`} onClick={() => setPending({ type: 'transaction', id: t.id })}>Delete</Button>
                      </div>
                    </div>
                  </motion.li>;
                })}
              </AnimatePresence>
            </ul>
          </section>)}
        </div>}
      </>}
    </>}

    <Dialog open={!!editor} onOpenChange={(o) => !o && setEditor(null)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader><DialogTitle>{editor?.transaction ? 'Edit transaction' : 'Add transaction'}</DialogTitle>
          <DialogDescription>Amount, category and date.</DialogDescription></DialogHeader>
        {editor && <TransactionForm transaction={editor.transaction} categories={categories} defaultDate={defaultDate} busy={busy}
          onCancel={() => setEditor(null)}
          onSave={async (input) => {
            await run({ type: 'saveTransaction', id: editor.transaction?.id ?? null, input });
            // Show the month the entry landed in.
            if (input.occurredOn.slice(0, 7) !== month) setMonth(input.occurredOn.slice(0, 7));
            setEditor(null); toast.success('Saved');
          }} />}
      </DialogContent>
    </Dialog>

    <CategoriesDialog open={categoriesOpen} onOpenChange={setCategoriesOpen} categories={categories} busy={busy}
      onSave={(id, input) => run({ type: 'saveCategory', id, input })} onDelete={(category) => setPending({ type: 'category', category })} />

    <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{pending?.type === 'category' ? `Delete ${pending.category.name}?` : 'Delete this transaction?'}</AlertDialogTitle>
          <AlertDialogDescription>{pending?.type === 'category' ? 'Its transactions stay, as Uncategorized.' : 'This cannot be undone.'}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void confirmDelete()}>Delete</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}
