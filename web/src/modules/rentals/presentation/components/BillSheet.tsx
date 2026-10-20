import { useState } from 'react';
import type { ReactNode } from 'react';
import { Copy, HandCoins, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { billBalance, billPaid, centavosToInput, formatBillPesos, isOverdue, lineTitle, manilaToday, parsePesos, statementText } from '@himan/shared/rentals';
import type { BillLine, RentalBill, RentalPayment } from '@himan/shared/rentals';
import { BillStateBadge } from './Badges';
import { Statement } from './Statement';
import type { StatementBill, StatementInfo } from './Statement';
import { MoneyInput, inputClass } from './Field';
import { errorMessage } from '../utils/errorMessage';
import { paidChangeWarning } from '../utils/billingMonth';
import { PdfButton } from './PdfButton';
import { useFieldErrors } from '@core/presentation/hooks';
import { FieldError, FormErrorBanner } from '@core/presentation/components';

const isUtility = (l: BillLine) => l.kind === 'electric' || l.kind === 'water';
/** Like parsePesos, but a leading minus makes a discount. */
const signedPesos = (value: string) => (value.trim().startsWith('-') ? -parsePesos(value.trim().slice(1)) : parsePesos(value));

/**
 * Side-panel body for one bill (issued or still pending). Rendered inside a SheetContent.
 * `children` is the bill's payments list; `credit` is the tenant's unused credit (it pays a pending bill once generated).
 */
export function BillSheet({ bill, info, canManage, busy, onSaveLines, onIssue, onCancelBill, payments = [], credit = 0, onRecordPayment, qrUrl, children }: {
  bill: (StatementBill & { id?: string }); info: StatementInfo; canManage: boolean; busy: boolean; qrUrl?(path: string): string;
  onSaveLines(lines: BillLine[]): Promise<void>; onIssue?(): Promise<void>; onCancelBill?(): void;
  payments?: RentalPayment[]; credit?: number; onRecordPayment?(): void; children?: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmEdit, setConfirmEdit] = useState(false);
  const issued = !!bill.number && bill.status === 'issued';
  const saved = issued ? bill as RentalBill : null;
  const paid = saved ? billPaid(saved.id, payments) : 0;
  const changeable = issued && !saved?.settled;
  const fromCredit = !!saved && payments.some((p) => p.status === 'active' && p.paidOn < saved.issuedOn && p.allocations.some((a) => a.billId === saved.id));
  const lateFee = canManage && changeable && info.lateFeeCentavos > 0 && isOverdue(bill as RentalBill, manilaToday())
    && !bill.lines.some((l) => l.kind === 'penalty');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(statementText(bill, info));
      toast.success('Copied. Paste it in Messenger.');
    } catch { toast.error('Couldn’t copy. Select the text and copy it instead.'); }
  };

  return <>
    <SheetHeader className="border-b p-5 pr-24 text-left">
      <SheetTitle>{bill.number ? `SOA ${bill.number}` : 'SOA preview'}</SheetTitle>
      <SheetDescription>{info.renterName} · {info.roomName}</SheetDescription>
    </SheetHeader>
    <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 [scrollbar-width:thin]">
      {editing
        ? <EditLines lines={bill.lines} busy={busy} onCancel={() => setEditing(false)}
            onSave={async (lines) => { await onSaveLines(lines); setEditing(false); toast.success('SOA saved'); }} />
        : <>
          {saved && <div className="flex flex-wrap items-center gap-2 text-sm">
            <BillStateBadge bill={saved} payments={payments} today={manilaToday()} />
            {fromCredit && <span className="text-muted-foreground">Part of this SOA was paid from the tenant’s credit.</span>}
            {saved.settled && <span className="text-muted-foreground">Settled with the deposit, so this SOA can’t be changed.</span>}
          </div>}
          {!bill.number && credit > 0 && <p className="rounded-md bg-muted px-3 py-2 text-sm">
            {info.renterName} has {formatBillPesos(credit)} credit. It pays this SOA as soon as you generate it.</p>}
          <Statement bill={bill} info={info} qrUrl={qrUrl} />
          {saved && <section aria-labelledby="bill-payments" className="space-y-2">
            <h3 id="bill-payments" className="text-sm font-semibold">Money received</h3>
            {children}
          </section>}
        </>}
    </div>
    {!editing && <div className="flex flex-wrap items-center gap-2 border-t px-4 py-3">
      {canManage && saved && onRecordPayment && billBalance(saved, payments) > 0 && <Button className="h-11 sm:h-9" onClick={onRecordPayment}>
        <HandCoins className="h-4 w-4" />Record payment</Button>}
      <Button variant="outline" className="h-11 sm:h-9" onClick={() => void copy()}><Copy className="h-4 w-4" />Copy as text</Button>
      {bill.number && bill.id && <PdfButton className="h-11 sm:h-9"
        make={async () => (await import('../pdf/download')).downloadBillPdf(bill as RentalBill, info, qrUrl)}>Download PDF</PdfButton>}
      {lateFee && <Button variant="outline" className="h-11 sm:h-9" disabled={busy}
        onClick={() => void onSaveLines([...bill.lines, { kind: 'penalty', label: 'Late payment penalty', amount: info.lateFeeCentavos }])
          .then(() => toast.success('Late fee added'), (e) => toast.error(errorMessage(e)))}>
        Add late fee {formatBillPesos(info.lateFeeCentavos)}</Button>}
      {canManage && changeable && <Button variant="outline" className="h-11 sm:h-9" onClick={() => (paid > 0 ? setConfirmEdit(true) : setEditing(true))}><Pencil className="h-4 w-4" />Edit SOA</Button>}
      {canManage && !bill.number && onIssue && <Button className="h-11 sm:h-9" disabled={busy} onClick={() => void onIssue()}>Generate SOA</Button>}
      {canManage && changeable && onCancelBill && <Button variant="ghost" className="ml-auto h-11 px-2 text-destructive hover:text-destructive sm:h-9"
        onClick={onCancelBill}><Trash2 className="h-4 w-4" />Cancel SOA</Button>}
    </div>}
    <ConfirmDialog open={confirmEdit} onOpenChange={setConfirmEdit} title={`Edit ${bill.number}?`} description={paidChangeWarning(paid)}
      confirmText="Edit SOA" cancelText="Back" onConfirm={() => setEditing(true)} />
  </>;
}

function EditLines({ lines, busy, onSave, onCancel }: {
  lines: BillLine[]; busy: boolean; onSave(lines: BillLine[]): Promise<void>; onCancel(): void;
}) {
  const [amounts, setAmounts] = useState(() => lines.map((l) => (l.amount < 0 ? '-' : '') + centavosToInput(Math.abs(l.amount))));
  const [kept, setKept] = useState(() => lines.map(() => true));
  const [extra, setExtra] = useState<{ label: string; amount: string }[]>([]);
  const fe = useFieldErrors();
  const lineId = (i: number) => `soa-line-${i}`;
  const extraId = (i: number, part: 'label' | 'amount') => `soa-extra-${i}-${part}`;
  return <form noValidate className="space-y-4" onSubmit={async (event) => {
    event.preventDefault();
    fe.clear();
    // Every bad box at once; the hook focuses the first one.
    const failed: [string, string][] = [];
    const amountOf = (id: string, value: string) => { try { return signedPesos(value); } catch (e) { failed.push([id, errorMessage(e)]); return 0; } };
    const next: BillLine[] = lines.flatMap((l, i) => !kept[i] ? [] : isUtility(l) ? [l] : [{ ...l, amount: amountOf(lineId(i), amounts[i]) }]);
    extra.forEach((x, i) => {
      if (!x.label.trim() || !x.amount.trim()) failed.push([extraId(i, x.label.trim() ? 'amount' : 'label'), 'Enter a name and amount for each extra line']);
      else next.push({ kind: 'other', label: x.label.trim(), amount: amountOf(extraId(i, 'amount'), x.amount) });
    });
    if (failed.length) { fe.failMany(failed); return; }
    if (!next.length) { fe.setFormError('A bill needs at least one line'); return; }
    try { await onSave(next); } catch (failure) { fe.setFormError(errorMessage(failure)); }
  }}>
    <FormErrorBanner message={fe.formError} />
    <fieldset disabled={busy} className="space-y-3">
      <p className="text-sm text-muted-foreground">Change amounts, or add a line. Use a minus sign for a discount, e.g. -500.</p>
      <ul className="space-y-2">{lines.map((l, i) => kept[i] && <li key={i} className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm">{lineTitle(l)}</span>
          {isUtility(l) ? <span className="w-36 text-right text-sm tabular-nums text-muted-foreground">{formatBillPesos(l.amount)}</span>
            : <div className="w-36"><MoneyInput id={lineId(i)} aria-label={`${lineTitle(l)} amount`} required {...fe.invalid(lineId(i))} value={amounts[i]}
                onChange={(e) => { setAmounts((a) => a.map((v, j) => (j === i ? e.target.value : v))); fe.clear(lineId(i)); }} /></div>}
          {(l.kind === 'penalty' || l.kind === 'other') ? <Button type="button" variant="ghost" size="sm" className="h-11 w-[6.25rem] px-2.5 sm:h-9"
            aria-label={`Remove ${l.label}`} onClick={() => { setKept((k) => k.map((v, j) => (j === i ? false : v))); fe.clear(lineId(i)); }}><X className="h-4 w-4" />Remove</Button>
            : <span className="w-[6.25rem]" />}
        </div>
        <FieldError id={lineId(i)} message={fe.errors[lineId(i)]} />
      </li>)}
      {extra.map((x, i) => <li key={`x${i}`} className="space-y-1">
        <div className="flex items-center gap-2">
          <input id={extraId(i, 'label')} aria-label="Other charge name" placeholder="e.g. Discount" required {...fe.invalid(extraId(i, 'label'))}
            className={`${inputClass} min-w-0 flex-1`} value={x.label}
            onChange={(e) => { setExtra((all) => all.map((v, j) => (j === i ? { ...v, label: e.target.value } : v))); fe.clear(extraId(i, 'label')); }} />
          <div className="w-36"><MoneyInput id={extraId(i, 'amount')} aria-label="Other charge amount" required {...fe.invalid(extraId(i, 'amount'))} value={x.amount}
            onChange={(e) => { setExtra((all) => all.map((v, j) => (j === i ? { ...v, amount: e.target.value } : v))); fe.clear(extraId(i, 'amount')); }} /></div>
          <Button type="button" variant="ghost" size="sm" className="h-11 px-2.5 sm:h-9" aria-label="Remove this line"
            onClick={() => { setExtra((all) => all.filter((_, j) => j !== i)); fe.clear(); }}><X className="h-4 w-4" />Remove</Button>
        </div>
        <FieldError id={extraId(i, 'label')} message={fe.errors[extraId(i, 'label')]} />
        <FieldError id={extraId(i, 'amount')} message={fe.errors[extraId(i, 'amount')]} />
      </li>)}</ul>
      <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={() => setExtra((all) => [...all, { label: '', amount: '' }])}>
        <Plus className="h-4 w-4" />Add other charge</Button>
      <div className="flex justify-end gap-2 border-t pt-3">
        <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={onCancel}>Back</Button>
        <Button type="submit" className="h-11 sm:h-9">Save SOA</Button>
      </div>
    </fieldset>
  </form>;
}
