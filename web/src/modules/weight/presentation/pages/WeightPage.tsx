import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, Loader2, Pencil, Plus, Scale, Settings2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { calcBmi, lastChange, sortEntries, todayIso, weightEntrySchema, weightProgress, weightSettingsSchema } from '@himan/shared/weight';
import type { WeightEntry } from '@himan/shared/weight';
import { FieldError, FormErrorBanner } from '@core/presentation/components';
import { useFieldErrors } from '@core/presentation/hooks';
import { useWeight } from '../hooks/useWeight';
import { useCountUp } from '../hooks/useCountUp';
import { BmiGauge } from '../components/BmiGauge';
import { WeightChart } from '../components/WeightChart';

const fmtDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const num = (text: string) => text.trim() === '' ? null : Number(text.replace(',', '.'));
const card = 'rounded-2xl border bg-card p-5 shadow-sm';

function Field({ id, label, hint, error, ...props }: { id: string; label: string; hint?: string; error?: string } & React.ComponentProps<typeof Input>) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label>
    <Input id={id} className="h-12 rounded-xl text-base" aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} {...props} />
    <FieldError id={id} message={error} />
    {hint && <p className="text-sm text-muted-foreground">{hint}</p>}</div>;
}

function Stat({ label, value, unit }: { label: string; value: number; unit: string }) {
  const shown = useCountUp(value);
  return <div><p className="text-sm text-muted-foreground">{label}</p>
    <p className="text-4xl font-semibold tabular-nums tracking-tight">{shown.toFixed(1)}<span className="ml-1 text-lg font-normal text-muted-foreground">{unit}</span></p></div>;
}

function EntryForm({ entry, busy, onSave, onCancel }: {
  entry: WeightEntry | null; busy: boolean; onSave: (date: string, kg: number) => Promise<void>; onCancel: () => void;
}) {
  const [date, setDate] = useState(entry?.entryDate ?? todayIso());
  const [kg, setKg] = useState(entry ? String(entry.kg) : '');
  const fe = useFieldErrors();
  return <form className="space-y-4" noValidate onSubmit={async (event) => {
    event.preventDefault();
    fe.clear();
    const result = weightEntrySchema.safeParse({ entryDate: date, kg: num(kg) ?? NaN });
    if (!result.success) {
      const issue = result.error.issues[0];
      fe.fail(issue.path[0] === 'entryDate' ? 'weight-date' : 'weight-kg', issue.path[0] === 'kg' && issue.code === 'invalid_type' ? 'Enter your weight in kg' : issue.message);
      return;
    }
    try { await onSave(result.data.entryDate, result.data.kg); }
    catch { fe.setFormError('Could not save. Your entry is still here; try again.'); }
  }}>
    <FormErrorBanner message={fe.formError} />
    <fieldset disabled={busy} className="space-y-4">
      {entry ? <p className="text-base font-medium">{fmtDate(entry.entryDate)}</p>
        : <Field id="weight-date" label="Date" type="date" max={todayIso()} value={date} error={fe.errors['weight-date']} onChange={(e) => { setDate(e.target.value); fe.clear('weight-date'); }}
          hint="Saving a day that already has a weight replaces it." />}
      <Field id="weight-kg" label="Weight (kg)" inputMode="decimal" autoFocus required value={kg} error={fe.errors['weight-kg']} onChange={(e) => { setKg(e.target.value); fe.clear('weight-kg'); }} placeholder="e.g. 72.5" />
      <div className="flex justify-end gap-3 border-t pt-5">
        <Button className="h-11 rounded-xl hover:scale-100" type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button className="h-11 rounded-xl hover:scale-100" type="submit">{busy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}Save weight</Button>
      </div>
    </fieldset>
  </form>;
}

function SettingsForm({ heightCm, goalKg, busy, onSave, onCancel }: {
  heightCm: number | null; goalKg: number | null; busy: boolean; onSave: (height: number | null, goal: number | null) => Promise<void>; onCancel: () => void;
}) {
  const [height, setHeight] = useState(heightCm?.toString() ?? '');
  const [goal, setGoal] = useState(goalKg?.toString() ?? '');
  const fe = useFieldErrors();
  return <form className="space-y-4" noValidate onSubmit={async (event) => {
    event.preventDefault();
    fe.clear();
    const result = weightSettingsSchema.safeParse({ heightCm: num(height), goalKg: num(goal) });
    if (!result.success) {
      const issue = result.error.issues[0];
      fe.fail(issue.path[0] === 'heightCm' ? 'weight-height' : 'weight-goal', issue.code === 'invalid_type' ? 'Enter a number' : issue.message);
      return;
    }
    try { await onSave(result.data.heightCm, result.data.goalKg); }
    catch { fe.setFormError('Could not save. Your changes are still here; try again.'); }
  }}>
    <FormErrorBanner message={fe.formError} />
    <fieldset disabled={busy} className="space-y-4">
      <Field id="weight-height" label="Height (cm)" inputMode="decimal" autoFocus value={height} error={fe.errors['weight-height']} onChange={(e) => { setHeight(e.target.value); fe.clear('weight-height'); }}
        placeholder="e.g. 165" hint="Used to work out your BMI." />
      <Field id="weight-goal" label="Goal weight (kg)" inputMode="decimal" value={goal} error={fe.errors['weight-goal']} onChange={(e) => { setGoal(e.target.value); fe.clear('weight-goal'); }}
        placeholder="e.g. 65" hint="Optional. Leave empty for no goal." />
      <div className="flex justify-end gap-3 border-t pt-5">
        <Button className="h-11 rounded-xl hover:scale-100" type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button className="h-11 rounded-xl hover:scale-100" type="submit">{busy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}Save settings</Button>
      </div>
    </fieldset>
  </form>;
}

function GoalCard({ start, current, goal, onEdit }: { start: number; current: number; goal: number | null; onEdit: () => void }) {
  const reduce = useReducedMotion();
  if (goal === null) return <section className={card}><h2 className="text-lg font-semibold">Goal</h2>
    <p className="mt-1 text-muted-foreground">Set a goal weight to see how far along you are.</p>
    <Button className="mt-4 h-11 rounded-xl hover:scale-100" variant="outline" onClick={onEdit}>Set a goal</Button></section>;
  const progress = weightProgress(start, current, goal);
  const percent = Math.round(progress.fraction * 100);
  return <section className={card} aria-label="Goal progress">
    <div className="flex items-baseline justify-between"><h2 className="text-lg font-semibold">Goal: {goal} kg</h2>
      <p className="text-2xl font-semibold tabular-nums">{percent}%</p></div>
    <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Progress toward goal weight"
      className="mt-3 h-4 overflow-hidden rounded-full bg-muted">
      <motion.div className="h-full rounded-full bg-emerald-500" initial={reduce ? false : { width: 0 }} animate={{ width: `${percent}%` }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
    </div>
    <p className="mt-3 text-base">{progress.reached ? 'You reached your goal. Well done!' : `${progress.remainingKg.toFixed(1)} kg to go`}</p>
    <p className="text-sm text-muted-foreground">Started at {start} kg</p>
  </section>;
}

export function WeightPage() {
  const weight = useWeight();
  return <WeightContent key={weight.userId ?? 'signed-out'} {...weight} />;
}

function WeightContent({ entries, settings, loading, error, refetch, userId, online, busy, saveEntry, removeEntry, saveSettings }: ReturnType<typeof useWeight>) {
  const reduce = useReducedMotion();
  const [dialog, setDialog] = useState<'log' | 'settings' | { edit: WeightEntry } | null>(null);
  const [deleting, setDeleting] = useState<WeightEntry | null>(null);
  const sorted = sortEntries(entries);
  const latest = sorted[sorted.length - 1];
  const change = lastChange(sorted);
  const bmi = latest && settings.heightCm ? calcBmi(latest.kg, settings.heightCm) : null;
  const editing = typeof dialog === 'object' && dialog ? dialog.edit : null;

  return <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <Link to="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16} />Dashboard</Link>
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight"><Scale className="h-8 w-8 text-primary" />Weight</h1>
        <p className="mt-2 text-muted-foreground">Log your weight and watch the trend toward your goal.</p></div>
      <div className="flex flex-wrap gap-3">
        <Button className="h-11 rounded-xl hover:scale-100" variant="outline" onClick={() => setDialog('settings')} disabled={!userId || !online}><Settings2 aria-hidden="true" className="h-4 w-4" />Height & goal</Button>
        <Button className="h-11 rounded-xl hover:scale-100" onClick={() => setDialog('log')} disabled={!userId || !online}><Plus aria-hidden="true" className="h-4 w-4" />Log weight</Button>
      </div>
    </header>

    {!userId ? <p>Sign in to track your weight.</p> : !online ? <div role="status" className="rounded-xl border p-6 text-center">Connect to the internet to see and log your weight.</div> : error ? <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 p-4">
      <p>Could not load your weight.</p><Button variant="outline" onClick={() => void refetch()}>Retry</Button></div>
      : loading ? <p role="status" className="flex items-center gap-2 py-10"><Loader2 className="h-5 w-5 animate-spin" />Loading…</p>
      : !latest ? <div className="rounded-2xl border border-dashed px-6 py-16 text-center">
        <Scale className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Start your weight log</h2>
        <p className="mt-2 text-muted-foreground">Add today’s weight. Add your height too and we will show your BMI.</p>
        <Button className="mt-5 h-11 rounded-xl hover:scale-100" onClick={() => setDialog('log')}>Log your first weight</Button></div>
      : <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <section className={`${card} lg:col-span-2`} aria-label="Weight over time">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
              <Stat label={`Latest · ${fmtDate(latest.entryDate)}`} value={latest.kg} unit="kg" />
              {change !== null && <p className="text-base font-medium">{change === 0 ? 'No change since last entry' : `${change > 0 ? '+' : '−'}${Math.abs(change)} kg since last entry`}</p>}
            </div>
            <WeightChart entries={sorted} goalKg={settings.goalKg} />
          </section>
          <div className="space-y-6">
            <section className={card} aria-label="Body mass index">
              <h2 className="mb-2 text-lg font-semibold">BMI</h2>
              {bmi !== null ? <BmiGauge bmi={bmi} /> : <>
                <p className="text-muted-foreground">Add your height to see your BMI.</p>
                <Button className="mt-4 h-11 rounded-xl hover:scale-100" variant="outline" onClick={() => setDialog('settings')}>Add height</Button></>}
            </section>
            <GoalCard start={sorted[0].kg} current={latest.kg} goal={settings.goalKg} onEdit={() => setDialog('settings')} />
          </div>
        </div>

        <section className={card} aria-label="History">
          <h2 className="mb-2 text-lg font-semibold">History</h2>
          <ul>
            <AnimatePresence initial={false}>
              {[...sorted].reverse().map((entry) => <motion.li key={entry.id} layout={!reduce}
                initial={reduce ? false : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden border-t first:border-t-0">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                  <p className="min-w-0 flex-1 basis-48 text-base">{fmtDate(entry.entryDate)}</p>
                  <p className="text-lg font-semibold tabular-nums">{entry.kg} kg</p>
                  <div className="flex w-full gap-3 sm:w-auto">
                  <Button className="h-11 flex-1 rounded-xl hover:scale-100 sm:flex-none" variant="outline" aria-label={`Edit weight on ${fmtDate(entry.entryDate)}`} onClick={() => setDialog({ edit: entry })}><Pencil aria-hidden="true" className="h-4 w-4" />Edit</Button>
                  <Button className="h-11 flex-1 rounded-xl text-destructive hover:scale-100 sm:flex-none" variant="outline" aria-label={`Delete weight on ${fmtDate(entry.entryDate)}`} onClick={() => setDeleting(entry)}><Trash2 aria-hidden="true" className="h-4 w-4" />Delete</Button>
                  </div>
                </div>
              </motion.li>)}
            </AnimatePresence>
          </ul>
        </section>
      </div>}

    <Dialog open={!!dialog} onOpenChange={(open) => { if (!open && !busy) setDialog(null); }}>
      <DialogContent className="w-[calc(100%_-_2rem)] max-w-md rounded-2xl">
        <DialogHeader className="text-left">
          <DialogTitle>{dialog === 'settings' ? 'Height & goal' : editing ? 'Edit weight' : 'Log weight'}</DialogTitle>
          <DialogDescription>{dialog === 'settings' ? 'Set these once. You can change them any time.' : 'Enter your weight in kilograms.'}</DialogDescription>
        </DialogHeader>
        {dialog === 'settings' ? <SettingsForm heightCm={settings.heightCm} goalKg={settings.goalKg} busy={busy} onCancel={() => setDialog(null)}
          onSave={async (heightCm, goalKg) => { await saveSettings({ heightCm, goalKg }); setDialog(null); toast.success('Saved'); }} />
          : dialog && <EntryForm entry={editing} busy={busy} onCancel={() => setDialog(null)}
            onSave={async (entryDate, kg) => { await saveEntry({ entryDate, kg }); setDialog(null); toast.success('Weight saved'); }} />}
      </DialogContent>
    </Dialog>

    <AlertDialog open={!!deleting} onOpenChange={(open) => { if (!open && !busy) setDeleting(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Delete this entry?</AlertDialogTitle>
          <AlertDialogDescription>{deleting && `${deleting.kg} kg on ${fmtDate(deleting.entryDate)} will be removed.`}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={busy}>Keep it</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={async (event) => {
            event.preventDefault();
            if (!deleting) return;
            try { await removeEntry(deleting.id); setDeleting(null); toast.success('Entry deleted'); }
            catch { toast.error('Could not delete. Try again.'); }
          }}>{busy ? 'Deleting…' : 'Delete'}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}
