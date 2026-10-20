import { useState } from 'react';
import type { ReactNode } from 'react';
import { format, parseISO } from 'date-fns';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PAYMENT_METHODS, formatBillPesos, manilaToday, parsePesos, settlementPreview, settlementSchema, validateRentalFile } from '@himan/shared/rentals';
import type { PaymentMethod, RentalSettlement, SettlementContext, SettlementInput } from '@himan/shared/rentals';
import type { RentalsState } from '../pages/RentalsPage';
import { Field, MoneyInput, inputClass } from './Field';
import { ProofFiles } from './PaymentsList';
import { PdfButton } from './PdfButton';
import { METHOD } from '../utils/billingMonth';
import { errorMessage } from '../utils/errorMessage';
import { cn } from '@core/presentation/utils';
import { useFieldErrors, zodFieldErrors } from '@core/presentation/hooks';
import { FieldError, FormErrorBanner } from '@core/presentation/components';

const PRESETS = ['Cleaning', 'Damage', 'Other'];
const day = (iso: string) => format(parseISO(iso), 'MMM d, yyyy');
type Row = { name: string; label: string; amount: string };
const FIELD_ID: Record<string, string> = { refundedOn: 'settle-date', refundMethod: 'settle-method', refundReference: 'settle-reference', notes: 'settle-notes' };
/** Input id of a schema path: `lines.<i>.<label|amount>` is that deduction's box; null (e.g. too many lines) goes to the banner. */
const fieldId = (path: PropertyKey[]) => (path[0] === 'lines' ? (path.length > 2 ? `settle-line-${String(path[1])}-${String(path[2])}` : null)
  : FIELD_ID[String(path[0])] ?? null);

/**
 * Settling a moved-out tenant's deposit (managers), or the settled summary (everyone). The figures shown before saving
 * are an estimate; the database recomputes the deposit and unpaid bills, and the summary shows what it stored.
 */
export function SettleDepositDialog({ target, settlement, canManage, busy, run, proofUrl, onClose }: {
  target: { tenancyId: string; name: string; room: string; depositCentavos: number; unpaidCentavos: number; creditCentavos: number; ctx: SettlementContext } | null;
  settlement?: RentalSettlement; canManage: boolean; proofUrl: RentalsState['settlementProofUrl']; onClose(): void;
} & Pick<RentalsState, 'busy' | 'run'>) {
  return <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
      {target && <>
        <DialogHeader><DialogTitle>{settlement ? 'Deposit settled' : 'Settle deposit'}</DialogTitle>
          <DialogDescription>{target.name} · {target.room} · moved out {day(target.ctx.moveOut)}</DialogDescription></DialogHeader>
        {settlement ? <Settled settlement={settlement} ctx={target.ctx} canManage={canManage} busy={busy} run={run} proofUrl={proofUrl} />
          : canManage ? <SettleForm key={target.tenancyId} {...target} busy={busy} run={run} onClose={onClose} />
          : <p className="text-sm text-muted-foreground">This deposit hasn’t been settled yet.</p>}
      </>}
    </DialogContent>
  </Dialog>;
}

function SettleForm({ tenancyId, name, depositCentavos, unpaidCentavos, creditCentavos, busy, run, onClose }: {
  tenancyId: string; name: string; depositCentavos: number; unpaidCentavos: number; creditCentavos: number; onClose(): void;
} & Pick<RentalsState, 'busy' | 'run'>) {
  const today = manilaToday();
  const [rows, setRows] = useState<Row[]>([]);
  const [forfeit, setForfeit] = useState(false);
  const [refundedOn, setRefundedOn] = useState(today);
  const [method, setMethod] = useState<PaymentMethod>('gcash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [proofs, setProofs] = useState<File[]>([]);
  const fe = useFieldErrors();
  const [confirming, setConfirming] = useState<SettlementInput | null>(null);
  const [saved, setSaved] = useState(false);
  const amountOf = (text: string) => { try { return text.trim() ? parsePesos(text) : 0; } catch { return 0; } };
  const preview = settlementPreview({ depositCentavos, unpaidBillsCentavos: unpaidCentavos, creditCentavos, forfeit,
    lines: rows.map((r) => ({ label: r.label, amount: amountOf(r.amount) })) });
  const refunding = preview.refundCentavos > 0;
  const edit = (i: number, change: Partial<Row>) => {
    setRows((list) => list.map((r, j) => j === i ? { ...r, ...change } : r));
    Object.keys(change).forEach((k) => fe.clear(`settle-line-${i}-${k}`));
  };
  const add = (preset: string) => setRows((list) => {
    const n = list.filter((r) => r.name.split(' ')[0] === preset).length;
    return [...list, { name: n ? `${preset} ${n + 1}` : preset, label: preset, amount: '' }];
  });

  if (saved) return <p role="status" className="text-sm text-muted-foreground">Saved. Loading the settled figures…</p>;

  const save = async (input: SettlementInput) => {
    try {
      const files = await Promise.all(proofs.map(async (f) => ({ name: f.name, mimeType: f.type, bytes: await f.arrayBuffer() })));
      const { failed } = await run({ type: 'settleDeposit', tenancyId, input, proofs: files }) as { failed: string[] };
      toast.success('Deposit settled');
      if (failed.length) toast.warning(`Couldn’t attach ${failed.join(', ')}. Add it again from the settlement.`);
      setSaved(true);
    } catch (failure) { fe.setFormError(errorMessage(failure)); setConfirming(null); }
  };

  return <form noValidate className="grid gap-4" onSubmit={(event) => {
    event.preventDefault();
    fe.clear();
    // An amount that isn't a number keeps that message rather than the schema's.
    const failed: [string, string][] = [];
    const lines = rows.map((r, i) => {
      try { return { label: r.label, amount: r.amount.trim() ? parsePesos(r.amount) : 0 }; }
      catch (e) { failed.push([`settle-line-${i}-amount`, errorMessage(e)]); return { label: r.label, amount: 1 }; }
    });
    const result = settlementSchema.safeParse({ lines, forfeit,
      refundedOn: refunding ? refundedOn : null, refundMethod: refunding ? method : null, refundReference: refunding ? reference : '', notes });
    if (!result.success) {
      failed.push(...zodFieldErrors(result.error, fieldId).filter(([id]) => !failed.some(([f]) => f === id)));
      if (!failed.length) { fe.setFormError(result.error.issues[0].message); return; }
    } else if (result.data.refundedOn && result.data.refundedOn > today) failed.push(['settle-date', 'The refund date can’t be in the future']);
    if (!result.success || failed.length) { fe.failMany(failed); return; }
    try { if (refunding) for (const f of proofs) validateRentalFile(f.name, f.type, f.size); }
    catch (failure) { fe.fail('settle-proofs', errorMessage(failure)); return; }
    setConfirming({ ...result.data, refundReference: refunding ? result.data.refundReference : '' });
  }}>
    <FormErrorBanner message={fe.formError} />
    <fieldset disabled={busy || !!confirming} className="grid gap-4">
      <dl className="divide-y rounded-lg border text-sm">
        <Line label="Deposit held" value={formatBillPesos(depositCentavos)} strong />
        {creditCentavos > 0 && <Line label="Tenant credit" value={`+ ${formatBillPesos(creditCentavos)}`} />}
        <div className="flex items-start justify-between gap-4 px-3 py-2.5">
          <dt><span className="text-muted-foreground">Unpaid bills</span>
            <span className="block text-xs text-muted-foreground">Estimate · recomputed when you save</span></dt>
          <dd className="font-medium tabular-nums">{formatBillPesos(unpaidCentavos)}</dd>
        </div>
      </dl>

      <section aria-label="Other deductions" className="space-y-2">
        <h3 className="text-sm font-semibold">Other deductions</h3>
        {rows.map((r, i) => <div key={r.name} className="space-y-1">
          <div className="flex items-center gap-2">
            <input id={`settle-line-${i}-label`} aria-label={`Label for ${r.name}`} required {...fe.invalid(`settle-line-${i}-label`)}
              className={cn(inputClass, 'min-w-0 flex-1')} maxLength={80} value={r.label} onChange={(e) => edit(i, { label: e.target.value })} />
            <div className="w-32 shrink-0"><MoneyInput id={`settle-line-${i}-amount`} aria-label={`Amount for ${r.name}`} required
              {...fe.invalid(`settle-line-${i}-amount`)} placeholder="0.00" value={r.amount} onChange={(e) => edit(i, { amount: e.target.value })} /></div>
            <Button type="button" variant="ghost" size="sm" className="h-11 px-2.5 shrink-0 sm:h-9" aria-label={`Remove ${r.name}`}
              onClick={() => { setRows((list) => list.filter((_, j) => j !== i)); fe.clear(); }}><X className="h-4 w-4" />Remove</Button>
          </div>
          <FieldError id={`settle-line-${i}-label`} message={fe.errors[`settle-line-${i}-label`]} />
          <FieldError id={`settle-line-${i}-amount`} message={fe.errors[`settle-line-${i}-amount`]} />
        </div>)}
        <div className="flex flex-wrap gap-2">{PRESETS.map((p) => <Button key={p} type="button" variant="outline" className="h-11 sm:h-9"
          aria-label={`Add ${p}`} onClick={() => add(p)}><Plus className="h-4 w-4" />{p}</Button>)}</div>
      </section>

      <div className="rounded-lg border p-3 text-sm">
        <label className="flex min-h-6 cursor-pointer items-center gap-3 font-medium">
          <input type="checkbox" className="size-4 accent-primary" aria-describedby="settle-forfeit-hint" checked={forfeit}
            onChange={(e) => setForfeit(e.target.checked)} />Keep the whole deposit (early termination)</label>
        <p id="settle-forfeit-hint" className="pl-7 text-xs text-muted-foreground">Nothing is refunded. Anything above the deposit is still owed.</p>
      </div>

      <dl className="divide-y rounded-lg border bg-muted/30 text-sm" aria-live="polite">
        <Line label="Refund to tenant" value={formatBillPesos(preview.refundCentavos)} strong />
        {preview.owedByTenantCentavos > 0 && <Line label="Tenant still owes" value={formatBillPesos(preview.owedByTenantCentavos)} strong />}
      </dl>

      {refunding && <div className="grid gap-4 sm:grid-cols-2">
        <Field id="settle-date" label="Refund date" required error={fe.errors['settle-date']}>
          <input id="settle-date" type="date" required {...fe.invalid('settle-date')} max={today} className={inputClass} value={refundedOn}
            onChange={(e) => { setRefundedOn(e.target.value); fe.clear('settle-date'); }} />
        </Field>
        <Field id="settle-method" label="How you refunded" required error={fe.errors['settle-method']}>
          <select id="settle-method" required {...fe.invalid('settle-method')} className={inputClass} value={method}
            onChange={(e) => { setMethod(e.target.value as PaymentMethod); fe.clear('settle-method'); }}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{METHOD[m]}</option>)}
          </select>
        </Field>
        <Field id="settle-reference" label="Reference no." hint="optional" className="sm:col-span-2" error={fe.errors['settle-reference']}>
          <input id="settle-reference" {...fe.invalid('settle-reference')} className={inputClass} maxLength={80} value={reference}
            onChange={(e) => { setReference(e.target.value); fe.clear('settle-reference'); }} />
        </Field>
        <div className="space-y-2 sm:col-span-2">
          <Field id="settle-proofs" label="Proof of refund" hint="screenshots, optional" error={fe.errors['settle-proofs']}>
            <input id="settle-proofs" type="file" multiple accept="image/jpeg,image/png" {...fe.invalid('settle-proofs')}
              className="block w-full text-sm file:mr-3 file:h-10 file:rounded-lg file:border file:bg-background file:px-3 file:text-sm file:font-medium"
              onChange={(e) => { const chosen = [...(e.target.files ?? [])]; setProofs((p) => [...p, ...chosen]); e.target.value = ''; fe.clear('settle-proofs'); }} />
          </Field>
          {proofs.length > 0 && <ul className="space-y-1 text-sm">{proofs.map((f, i) => <li key={i} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate">{f.name}</span>
            <Button type="button" variant="ghost" size="sm" className="h-11 px-2.5 sm:h-8" aria-label={`Remove ${f.name}`}
              onClick={() => { setProofs((p) => p.filter((_, j) => j !== i)); fe.clear('settle-proofs'); }}><X className="h-4 w-4" />Remove</Button>
          </li>)}</ul>}
        </div>
      </div>}
      <Field id="settle-notes" label="Notes" hint="optional" error={fe.errors['settle-notes']}>
        <textarea id="settle-notes" {...fe.invalid('settle-notes')} rows={2} maxLength={500} className={`${inputClass} h-auto py-2`} value={notes}
          onChange={(e) => { setNotes(e.target.value); fe.clear('settle-notes'); }} />
      </Field>
    </fieldset>
    {confirming ? <div className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
      <p><strong>{refunding ? `Refund ${formatBillPesos(preview.refundCentavos)} to ${name}?` : `Settle ${name}’s deposit with no refund?`}</strong>{' '}
        This can’t be undone here. The deposit held becomes ₱0.</p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="h-11 sm:h-9" disabled={busy} onClick={() => setConfirming(null)}>Go back</Button>
        <Button type="button" className="h-11 sm:h-9" disabled={busy} onClick={() => void save(confirming)}>Yes, settle deposit</Button>
      </div>
    </div> : <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={onClose}>Cancel</Button>
      <Button type="submit" className="h-11 sm:h-9" disabled={busy}>Save settlement</Button>
    </div>}
  </form>;
}

function Settled({ settlement: s, ctx, canManage, busy, run, proofUrl }: { settlement: RentalSettlement; ctx: SettlementContext; canManage: boolean;
  proofUrl: RentalsState['settlementProofUrl'] } & Pick<RentalsState, 'busy' | 'run'>) {
  return <div className="grid gap-4">
    <dl className="divide-y rounded-lg border text-sm">
      <Line label="Deposit held" value={formatBillPesos(s.depositCentavos)} strong />
      {(s.creditCentavos ?? 0) > 0 && <Line label="Tenant credit" value={`+ ${formatBillPesos(s.creditCentavos!)}`} />}
      {s.unpaidBillsCentavos > 0 && <Line label="Unpaid bills" value={`− ${formatBillPesos(s.unpaidBillsCentavos)}`} />}
      {s.lines.map((l, i) => <Line key={i} label={l.label} value={`− ${formatBillPesos(l.amount)}`} />)}
      <Line label="Refund to tenant" value={formatBillPesos(s.refundCentavos)} strong />
      {s.owedCentavos > 0 && <Line label="Tenant still owes" value={formatBillPesos(s.owedCentavos)} strong />}
    </dl>
    {s.forfeit && <p className="text-sm">Whole deposit kept (early termination).</p>}
    {s.refundCentavos > 0 && s.refundMethod && s.refundedOn && <p className="text-sm text-muted-foreground">
      {METHOD[s.refundMethod]} · {day(s.refundedOn)}{s.refundReference && ` · Ref ${s.refundReference}`}</p>}
    {s.notes && <p className="whitespace-pre-line text-sm">{s.notes}</p>}
    {canManage && <ProofFiles files={s.proofs} busy={busy} proofUrl={proofUrl} canAdd
      onUpload={(file) => run({ type: 'uploadSettlementProof', settlementId: s.id, propertyId: s.propertyId, file })}
      onRemove={(id) => run({ type: 'removeSettlementProof', id })} />}
    <div className="flex justify-end">
      <PdfButton className="h-11 sm:h-9" make={async () => (await import('../pdf/download')).downloadSettlementPdf(s, ctx)}>Settlement PDF</PdfButton>
    </div>
  </div>;
}

function Line({ label, value, strong }: { label: ReactNode; value: string; strong?: boolean }) {
  return <div className="flex items-baseline justify-between gap-4 px-3 py-2.5">
    <dt className={cn('min-w-0 break-words', strong ? 'font-semibold' : 'text-muted-foreground')}>{label}</dt>
    <dd className={cn('shrink-0 tabular-nums', strong ? 'font-bold' : 'font-medium')}>{value}</dd>
  </div>;
}
