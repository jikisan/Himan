import { useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Text, View } from 'react-native';
import { format, parseISO } from 'date-fns';
import { METHOD_LABEL, PAYMENT_METHODS, billBalance, billName, centavosToInput, errorMessage, findDuplicateReference, formatBillPesos, manilaToday,
  parsePesos, paymentSchema, tenancyOwed } from '@himan/shared/rentals';
import type { PaymentInput, PaymentMethod, ReceiptContext, RentalBill, RentalPayment } from '@himan/shared/rentals';
import type { RentalsState } from '../hooks/useRentals';
import { Banner, Btn, Choice, DateField, Field, Input, MoneyInput, Sheet, muted, text, useFieldErrors, useRentalToast } from './ui';
import type { FieldErrors } from './ui';
import { Paper, receiptHtml, sharePdf } from './papers';
import { openSigned, pickFiles } from './types';
import type { FileInput } from './types';

const day = (iso: string) => format(parseISO(iso), 'MMM d, yyyy');

/** The payment form as typed (Record payment and the move-in flow's Pay step). */
export interface PaymentDraft { amount: string; paidOn: string; method: PaymentMethod; reference: string; notes: string; proofs: FileInput[] }
export const paymentDraft = (amountCentavos: number): PaymentDraft =>
  ({ amount: centavosToInput(amountCentavos), paidOn: manilaToday(), method: 'gcash', reference: '', notes: '', proofs: [] });

const FIELD: Record<string, string> = { amountCentavos: 'pay-amount', paidOn: 'pay-date', method: 'pay-method', reference: 'pay-reference', notes: 'pay-notes',
  billId: 'pay-bill' };

/** Checks the draft; a bad field is shown under it and null comes back. `billId` (null = oldest first) is left out when not given. */
export function readPayment(d: PaymentDraft, fe: FieldErrors, billId?: string | null): PaymentInput | null {
  let amountCentavos = 0;
  try { amountCentavos = d.amount.trim() ? parsePesos(d.amount) : 0; } catch (e) { fe.fail('pay-amount', errorMessage(e)); return null; }
  const result = paymentSchema.safeParse({ amountCentavos, paidOn: d.paidOn, method: d.method, reference: d.reference, notes: d.notes,
    ...(billId !== undefined && { billId }) });
  if (!result.success) { const issue = result.error.issues[0]; fe.fail(FIELD[String(issue.path[0])] ?? 'pay-amount', issue.message); return null; }
  if (result.data.paidOn > manilaToday()) { fe.fail('pay-date', 'The payment date can’t be in the future'); return null; }
  return result.data;
}

/** Amount, date, method, reference (with a duplicate warning), notes and proof screenshots. */
export function PaymentFields({ value, onChange, owed, propertyId, payments, nameOf, fe, children }: {
  value: PaymentDraft; onChange(next: PaymentDraft): void; owed: number; propertyId: string; payments: RentalPayment[];
  nameOf(tenancyId: string): string; fe: FieldErrors; children?: ReactNode;
}) {
  const toast = useRentalToast();
  const set = <K extends keyof PaymentDraft>(key: K, v: PaymentDraft[K], id: string) => { onChange({ ...value, [key]: v }); fe.clear(id); };
  const duplicate = findDuplicateReference(payments, propertyId, value.reference);
  let extra = 0;
  try { extra = value.amount.trim() ? parsePesos(value.amount) - owed : 0; } catch { /* shown on save */ }
  return <View className="gap-4">
    <Field label="Amount" required error={fe.errors['pay-amount']}>
      <MoneyInput accessibilityLabel="Amount" invalid={!!fe.errors['pay-amount']} value={value.amount} placeholder="0.00" onChangeText={(v) => set('amount', v, 'pay-amount')} />
    </Field>
    <Field label="Date paid" required error={fe.errors['pay-date']}>
      <DateField label="Date paid" value={value.paidOn} max={manilaToday()} onChange={(v) => set('paidOn', v, 'pay-date')} />
    </Field>
    {extra > 0 && <Text className={`text-sm ${muted}`}>{formatBillPesos(extra)} more than they owe. The extra is kept as credit and pays their next SOA.</Text>}
    <Field label="How they paid" required error={fe.errors['pay-method']}>
      <Choice label="How they paid" value={value.method} options={PAYMENT_METHODS.map((m) => [m, METHOD_LABEL[m]] as const)} onChange={(v) => set('method', v, 'pay-method')} />
    </Field>
    <Field label="Reference no." hint="optional" error={fe.errors['pay-reference']}>
      <Input accessibilityLabel="Reference no." value={value.reference} maxLength={80} onChangeText={(v) => set('reference', v, 'pay-reference')} />
    </Field>
    {duplicate && <Banner tone="amber" message={`This reference no. was already used on a ${formatBillPesos(duplicate.amountCentavos)} payment from ${nameOf(duplicate.tenancyId)} on ${format(parseISO(duplicate.paidOn), 'MMM d')}. Check it isn’t the same payment.`} />}
    {children}
    <Field label="Notes" hint="optional" error={fe.errors['pay-notes']}>
      <Input accessibilityLabel="Notes" multiline value={value.notes} maxLength={500} onChangeText={(v) => set('notes', v, 'pay-notes')} />
    </Field>
    <Field label="Proof of payment" hint="screenshots, optional" error={fe.errors['pay-proofs']}>
      <View className="gap-2">
        {value.proofs.map((f, i) => <View key={i} className="flex-row items-center gap-2">
          <Text numberOfLines={1} className={`flex-1 ${text}`}>{f.name}</Text>
          <Btn small variant="ghost" icon="x" label="Remove" a11y={`Remove ${f.name}`} onPress={() => set('proofs', value.proofs.filter((_, j) => j !== i), 'pay-proofs')} />
        </View>)}
        <Btn icon="image" label="Add screenshot" onPress={() => void pickFiles().then((files) => files.length && set('proofs', [...value.proofs, ...files], 'pay-proofs'),
          (e) => toast(errorMessage(e), 'error'))} />
      </View>
    </Field>
  </View>;
}

/** "Record payment" for one tenant; amount starts at what they still owe. `billId` pre-picks the bill to pay first. */
export function RecordPaymentSheet({ target, name, nameOf, propertyId, bills, payments, busy, onSave, onClose }: {
  target: { tenancyId: string; billId?: string } | null; name: string; nameOf(tenancyId: string): string; propertyId: string;
  bills: RentalBill[]; payments: RentalPayment[]; busy: boolean; onSave(input: PaymentInput, proofs: FileInput[]): Promise<void>; onClose(): void;
}) {
  return <Sheet open={!!target} onClose={onClose} title="Record payment" subtitle={target ? `Money received from ${name}` : undefined} closeLabel="Cancel">
    {target && <PaymentForm key={`${target.tenancyId}:${target.billId ?? ''}`} {...target} nameOf={nameOf} propertyId={propertyId}
      bills={bills} payments={payments} busy={busy} onSave={onSave} />}
  </Sheet>;
}

function PaymentForm({ tenancyId, billId: startBill, nameOf, propertyId, bills, payments, busy, onSave }: {
  tenancyId: string; billId?: string; nameOf(tenancyId: string): string; propertyId: string; bills: RentalBill[];
  payments: RentalPayment[]; busy: boolean; onSave(input: PaymentInput, proofs: FileInput[]): Promise<void>;
}) {
  const owed = tenancyOwed(tenancyId, bills, payments);
  const unpaid = bills.filter((b) => b.tenancyId === tenancyId && b.status === 'issued' && billBalance(b, payments) > 0).sort((a, b) => a.dueOn.localeCompare(b.dueOn));
  const [draft, setDraft] = useState(() => paymentDraft(owed));
  const [billId, setBillId] = useState(startBill && unpaid.some((b) => b.id === startBill) ? startBill : '');
  const fe = useFieldErrors();
  return <>
    <Text className={muted}>{owed > 0 ? `They owe ${formatBillPesos(owed)}.` : 'They owe nothing right now.'}</Text>
    <Banner message={fe.formError} />
    <PaymentFields value={draft} onChange={setDraft} owed={owed} propertyId={propertyId} payments={payments} nameOf={nameOf} fe={fe}>
      {unpaid.length > 0 && <Field label="Pay this bill first" error={fe.errors['pay-bill']}>
        <Choice label="Pay this bill first" value={billId} onChange={setBillId}
          options={[['', 'Oldest unpaid bill first'] as const, ...unpaid.map((b) => [b.id, `${billName(b)} · ${formatBillPesos(billBalance(b, payments))} left`] as const)]} />
      </Field>}
    </PaymentFields>
    <Btn variant="primary" label="Save payment" busy={busy} onPress={async () => {
      fe.clear();
      const input = readPayment(draft, fe, billId || null);
      if (!input) return;
      try { await onSave(input, draft.proofs); } catch (e) { fe.setFormError(errorMessage(e)); }
    }} />
  </>;
}

/** Money received, newest first: what each payment paid, any credit left over, proofs, receipt and void. */
export function PaymentsList({ payments, bills, canManage, busy, run, proofUrl, empty, receipt }: {
  payments: RentalPayment[]; bills: RentalBill[]; canManage: boolean; proofUrl: RentalsState['paymentProofUrl']; empty: string;
  receipt?(payment: RentalPayment): ReceiptContext;
} & Pick<RentalsState, 'busy' | 'run'>) {
  const toast = useRentalToast();
  const [voiding, setVoiding] = useState<RentalPayment | null>(null);
  const [viewing, setViewing] = useState<RentalPayment | null>(null);
  if (!payments.length) return <Text className={`text-sm ${muted}`}>{empty}</Text>;
  return <View className="gap-2">
    {payments.map((p) => {
      const isVoid = p.status === 'void';
      const credit = p.amountCentavos - p.allocations.reduce((sum, a) => sum + a.amountCentavos, 0);
      return <View key={p.id} className={`gap-1.5 rounded-xl border border-gray-200 p-3 dark:border-gray-700 ${isVoid ? 'opacity-70' : ''}`}>
        <Text className={`text-base font-semibold ${text} ${isVoid ? 'line-through' : ''}`}>{formatBillPesos(p.amountCentavos)}</Text>
        <Text className={`text-sm ${muted}`}>{METHOD_LABEL[p.method]} · {day(p.paidOn)}{p.reference ? ` · Ref ${p.reference}` : ''}{isVoid ? ' · Voided' : ''}</Text>
        {isVoid ? <Text className={`text-xs ${muted}`}>Reason: {p.voidReason}</Text>
          : <View>{p.allocations.map((a) => { const b = bills.find((x) => x.id === a.billId);
            return <Text key={a.id} className={`text-xs ${muted}`}>Paid {formatBillPesos(a.amountCentavos)} of {b ? billName(b) : 'a bill'}</Text>; })}
            {credit > 0 && <Text className={`text-xs ${muted}`}>{formatBillPesos(credit)} kept as credit for the next SOA</Text>}</View>}
        {p.notes ? <Text className={`text-xs ${text}`}>{p.notes}</Text> : null}
        {canManage && <ProofFiles files={p.proofs} busy={busy} proofUrl={proofUrl} canAdd={!isVoid}
          onUpload={(file) => run({ type: 'uploadPaymentProof', paymentId: p.id, propertyId: p.propertyId, file })}
          onRemove={(id) => run({ type: 'removePaymentProof', id })} />}
        {!isVoid && <View className="flex-row flex-wrap gap-2 pt-1">
          {receipt && <Btn small icon="file-text" label="View receipt" a11y={`View receipt for ${formatBillPesos(p.amountCentavos)} on ${day(p.paidOn)}`} onPress={() => setViewing(p)} />}
          {canManage && <Btn small variant="dangerOutline" label="Void" a11y={`Void payment of ${formatBillPesos(p.amountCentavos)} on ${day(p.paidOn)}`}
            disabled={busy} onPress={() => setVoiding(p)} />}
        </View>}
      </View>;
    })}
    {receipt && <Sheet open={!!viewing} onClose={() => setViewing(null)} title="Receipt" subtitle={viewing ? `${formatBillPesos(viewing.amountCentavos)} on ${day(viewing.paidOn)}` : undefined}
      footer={viewing && <Btn variant="primary" icon="share" label="Save or share PDF" onPress={() => void sharePdf(receiptHtml(viewing, receipt(viewing)),
        `Receipt-${viewing.id.slice(0, 8)}`).catch(() => toast('Couldn’t make the PDF. Try again.', 'error'))} />}>
      {viewing && <Paper html={receiptHtml(viewing, receipt(viewing))} />}
    </Sheet>}
    <VoidSheet payment={voiding} busy={busy} onClose={() => setVoiding(null)}
      onVoid={async (reason) => { await run({ type: 'voidPayment', id: voiding!.id, reason }); toast('Payment voided'); setVoiding(null); }} />
  </View>;
}

type ProofFile = { id: string; name: string; ready: boolean };

/** Proof screenshots: view through a short-lived link, remove (asks first), add more. Managers only. */
export function ProofFiles({ files, busy, proofUrl, canAdd, onUpload, onRemove }: {
  files: ProofFile[]; busy: boolean; proofUrl(id: string): Promise<string>; canAdd: boolean;
  onUpload(file: FileInput): Promise<unknown>; onRemove(id: string): Promise<unknown>;
}) {
  const toast = useRentalToast();
  const upload = async () => {
    try {
      const chosen = await pickFiles();
      for (const f of chosen) await onUpload(f);
      if (chosen.length) toast(chosen.length === 1 ? 'Proof attached' : `${chosen.length} proofs attached`);
    } catch (e) { toast(errorMessage(e), 'error'); }
  };
  return <View className="gap-1.5">
    <Text className={`text-xs ${muted}`}>Proof</Text>
    {files.map((f) => <View key={f.id} className="flex-row flex-wrap gap-2">
      <Btn small icon="eye" label={f.ready ? `View ${f.name.length > 18 ? `${f.name.slice(0, 16)}…` : f.name}` : 'Upload didn’t finish'} a11y={`View ${f.name}`}
        disabled={!f.ready} onPress={() => void openSigned(proofUrl(f.id)).catch((e) => toast(errorMessage(e), 'error'))} />
      <Btn small variant="dangerOutline" icon="trash-2" label="Remove" a11y={`Remove ${f.name}`} disabled={busy} onPress={() => Alert.alert(`Remove ${f.name}?`, undefined, [
        { text: 'Keep', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => void onRemove(f.id).then(() => toast('Proof removed'), (e) => toast(errorMessage(e), 'error')) }])} />
    </View>)}
    {canAdd && <Btn small icon="upload" label="Add proof" disabled={busy} onPress={() => void upload()} />}
  </View>;
}

function VoidSheet({ payment, busy, onVoid, onClose }: { payment: RentalPayment | null; busy: boolean; onVoid(reason: string): Promise<void>; onClose(): void }) {
  const [reason, setReason] = useState('');
  const fe = useFieldErrors();
  const close = () => { setReason(''); fe.clear(); onClose(); };
  return <Sheet open={!!payment} onClose={close} title="Void this payment?" closeLabel="Keep payment"
    subtitle={payment ? `${formatBillPesos(payment.amountCentavos)} on ${day(payment.paidOn)}` : undefined}>
    <Text className={muted}>The record stays, marked voided. The bills it paid go back to unpaid.</Text>
    <Banner message={fe.formError} />
    <Field label="Reason" required error={fe.errors['void-reason']}>
      <Input accessibilityLabel="Reason" multiline maxLength={300} value={reason} placeholder="e.g. Transfer bounced" invalid={!!fe.errors['void-reason']}
        onChangeText={(v) => { setReason(v); fe.clear('void-reason'); }} />
    </Field>
    <Btn variant="danger" label="Void payment" busy={busy} onPress={async () => {
      fe.clear();
      if (!reason.trim()) { fe.fail('void-reason', 'Say why you’re voiding this payment'); return; }
      try { await onVoid(reason.trim()); setReason(''); } catch (e) { fe.setFormError(errorMessage(e)); }
    }} />
  </Sheet>;
}
