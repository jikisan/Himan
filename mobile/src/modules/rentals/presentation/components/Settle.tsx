import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { format, parseISO } from 'date-fns';
import { METHOD_LABEL, PAYMENT_METHODS, errorMessage, formatBillPesos, manilaToday, parsePesos, settlementPreview, settlementSchema } from '@himan/shared/rentals';
import type { PaymentMethod, RentalSettlement, SettlementContext, SettlementInput } from '@himan/shared/rentals';
import type { RentalsState } from '../hooks/useRentals';
import { Banner, Btn, Check, Choice, DateField, Facts, Field, Input, MoneyInput, Row, Sheet, Title, card, muted, text, useFieldErrors, useRentalToast,
  zodFieldErrors } from './ui';
import { ProofFiles } from './Payments';
import { settlementHtml, sharePdf } from './papers';
import { pickFiles } from './types';
import type { FileInput } from './types';

const PRESETS = ['Cleaning', 'Damage', 'Other'];
const day = (iso: string) => format(parseISO(iso), 'MMM d, yyyy');
type Line = { name: string; label: string; amount: string };
const FIELD_ID: Record<string, string> = { refundedOn: 'date', refundMethod: 'method', refundReference: 'reference', notes: 'notes' };
const fieldId = (path: PropertyKey[]) => (path[0] === 'lines' ? (path.length > 2 ? `line-${String(path[1])}-${String(path[2])}` : null) : FIELD_ID[String(path[0])] ?? null);

export type SettleTarget = { tenancyId: string; name: string; room: string; depositCentavos: number; unpaidCentavos: number; creditCentavos: number; ctx: SettlementContext };

/** Settling a moved-out tenant's deposit (managers), or the settled summary (everyone). The database recomputes every figure. */
export function SettleSheet({ target, settlement, canManage, busy, run, proofUrl, onClose }: {
  target: SettleTarget | null; settlement?: RentalSettlement; canManage: boolean; proofUrl: RentalsState['settlementProofUrl']; onClose(): void;
} & Pick<RentalsState, 'busy' | 'run'>) {
  return <Sheet open={!!target} onClose={onClose} title={settlement ? 'Deposit settled' : 'Settle deposit'}
    subtitle={target ? `${target.name} · ${target.room} · moved out ${day(target.ctx.moveOut)}` : undefined}>
    {target && (settlement ? <Settled settlement={settlement} ctx={target.ctx} canManage={canManage} busy={busy} run={run} proofUrl={proofUrl} />
      : canManage ? <SettleForm key={target.tenancyId} {...target} busy={busy} run={run} />
      : <Text className={muted}>This deposit hasn’t been settled yet.</Text>)}
  </Sheet>;
}

function SettleForm({ tenancyId, name, depositCentavos, unpaidCentavos, creditCentavos, busy, run }: SettleTarget & Pick<RentalsState, 'busy' | 'run'>) {
  const toast = useRentalToast();
  const today = manilaToday();
  const [rows, setRows] = useState<Line[]>([]);
  const [forfeit, setForfeit] = useState(false);
  const [refundedOn, setRefundedOn] = useState(today);
  const [method, setMethod] = useState<PaymentMethod>('gcash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [proofs, setProofs] = useState<FileInput[]>([]);
  const [saved, setSaved] = useState(false);
  const fe = useFieldErrors();
  const amountOf = (value: string) => { try { return value.trim() ? parsePesos(value) : 0; } catch { return 0; } };
  const preview = settlementPreview({ depositCentavos, unpaidBillsCentavos: unpaidCentavos, creditCentavos, forfeit,
    lines: rows.map((r) => ({ label: r.label, amount: amountOf(r.amount) })) });
  const refunding = preview.refundCentavos > 0;
  const edit = (i: number, change: Partial<Line>) => { setRows((list) => list.map((r, j) => (j === i ? { ...r, ...change } : r))); Object.keys(change).forEach((k) => fe.clear(`line-${i}-${k}`)); };
  const add = (preset: string) => setRows((list) => { const n = list.filter((r) => r.name.split(' ')[0] === preset).length;
    return [...list, { name: n ? `${preset} ${n + 1}` : preset, label: preset, amount: '' }]; });
  if (saved) return <Text className={muted}>Saved. Loading the settled figures…</Text>;
  const save = async (input: SettlementInput) => {
    try {
      const { failed } = await run({ type: 'settleDeposit', tenancyId, input, proofs }) as { failed: string[] };
      toast('Deposit settled');
      if (failed.length) toast(`Couldn’t attach ${failed.join(', ')}. Add it again from the settlement.`, 'warning');
      setSaved(true);
    } catch (e) { fe.setFormError(errorMessage(e)); }
  };
  const submit = () => {
    fe.clear();
    const failed: [string, string][] = [];
    const lines = rows.map((r, i) => { try { return { label: r.label, amount: r.amount.trim() ? parsePesos(r.amount) : 0 }; }
      catch (e) { failed.push([`line-${i}-amount`, errorMessage(e)]); return { label: r.label, amount: 1 }; } });
    const result = settlementSchema.safeParse({ lines, forfeit, refundedOn: refunding ? refundedOn : null, refundMethod: refunding ? method : null,
      refundReference: refunding ? reference : '', notes });
    if (!result.success) {
      failed.push(...zodFieldErrors(result.error, fieldId).filter(([id]) => !failed.some(([f]) => f === id)));
      if (!failed.length) { fe.setFormError(result.error.issues[0].message); return; }
    } else if (result.data.refundedOn && result.data.refundedOn > today) failed.push(['date', 'The refund date can’t be in the future']);
    if (!result.success || failed.length) { fe.failMany(failed); return; }
    const input = { ...result.data, refundReference: refunding ? result.data.refundReference : '' };
    Alert.alert(refunding ? `Refund ${formatBillPesos(preview.refundCentavos)} to ${name}?` : `Settle ${name}’s deposit with no refund?`,
      'This can’t be undone here. The deposit held becomes ₱0.', [{ text: 'Go back', style: 'cancel' }, { text: 'Yes, settle deposit', onPress: () => void save(input) }]);
  };
  return <>
    <Banner message={fe.formError} />
    <View className={card}><Facts rows={[['Deposit held', formatBillPesos(depositCentavos)], ...(creditCentavos > 0 ? [['Tenant credit', `+ ${formatBillPesos(creditCentavos)}`] as [string, string]] : []),
      ['Unpaid bills (estimate)', formatBillPesos(unpaidCentavos)]]} />
      <Text className={`mt-1 text-xs ${muted}`}>Recomputed when you save.</Text></View>
    <Title size="base">Other deductions</Title>
    {rows.map((r, i) => <View key={r.name} className={`${card} gap-2`}>
      <Field label="Label" error={fe.errors[`line-${i}-label`]}>
        <Input accessibilityLabel={`Label for ${r.name}`} maxLength={80} value={r.label} invalid={!!fe.errors[`line-${i}-label`]} onChangeText={(v) => edit(i, { label: v })} /></Field>
      <Field label="Amount" error={fe.errors[`line-${i}-amount`]}>
        <MoneyInput accessibilityLabel={`Amount for ${r.name}`} placeholder="0.00" value={r.amount} invalid={!!fe.errors[`line-${i}-amount`]} onChangeText={(v) => edit(i, { amount: v })} /></Field>
      <Btn small variant="ghost" icon="x" label="Remove" a11y={`Remove ${r.name}`} onPress={() => { setRows((list) => list.filter((_, j) => j !== i)); fe.clear(); }} />
    </View>)}
    <Row>{PRESETS.map((p) => <Btn key={p} small icon="plus" label={p} a11y={`Add ${p}`} onPress={() => add(p)} />)}</Row>
    <View className={card}><Check label="Keep the whole deposit (early termination)" checked={forfeit} onChange={setForfeit} />
      <Text className={`pl-9 text-xs ${muted}`}>Nothing is refunded. Anything above the deposit is still owed.</Text></View>
    <View className="gap-1 rounded-2xl bg-gray-100 p-4 dark:bg-gray-800">
      <View className="flex-row justify-between"><Text className={`font-semibold ${text}`}>Refund to tenant</Text><Text className={`text-lg font-bold ${text}`}>{formatBillPesos(preview.refundCentavos)}</Text></View>
      {preview.owedByTenantCentavos > 0 && <View className="flex-row justify-between"><Text className={`font-semibold ${text}`}>Tenant still owes</Text>
        <Text className={`font-bold ${text}`}>{formatBillPesos(preview.owedByTenantCentavos)}</Text></View>}
    </View>
    {refunding && <>
      <Field label="Refund date" required error={fe.errors.date}><DateField label="Refund date" value={refundedOn} max={today} onChange={(v) => { setRefundedOn(v); fe.clear('date'); }} /></Field>
      <Field label="How you refunded" required error={fe.errors.method}>
        <Choice label="How you refunded" value={method} onChange={(v) => { setMethod(v); fe.clear('method'); }} options={PAYMENT_METHODS.map((m) => [m, METHOD_LABEL[m]] as const)} /></Field>
      <Field label="Reference no." hint="optional" error={fe.errors.reference}>
        <Input accessibilityLabel="Reference no." maxLength={80} value={reference} onChangeText={(v) => { setReference(v); fe.clear('reference'); }} /></Field>
      <Field label="Proof of refund" hint="screenshots, optional" error={fe.errors.proofs}>
        {proofs.map((f, i) => <View key={i} className="flex-row items-center gap-2"><Text numberOfLines={1} className={`flex-1 ${text}`}>{f.name}</Text>
          <Btn small variant="ghost" icon="x" label="Remove" a11y={`Remove ${f.name}`} onPress={() => setProofs((p) => p.filter((_, j) => j !== i))} /></View>)}
        <Btn icon="image" label="Add screenshot" onPress={() => void pickFiles().then((files) => setProofs((p) => [...p, ...files]), (e) => fe.fail('proofs', errorMessage(e)))} />
      </Field>
    </>}
    <Field label="Notes" hint="optional" error={fe.errors.notes}>
      <Input accessibilityLabel="Notes" multiline maxLength={500} value={notes} onChangeText={(v) => { setNotes(v); fe.clear('notes'); }} /></Field>
    <Btn variant="primary" label="Save settlement" busy={busy} onPress={submit} />
  </>;
}

function Settled({ settlement: s, ctx, canManage, busy, run, proofUrl }: { settlement: RentalSettlement; ctx: SettlementContext; canManage: boolean;
  proofUrl: RentalsState['settlementProofUrl'] } & Pick<RentalsState, 'busy' | 'run'>) {
  const toast = useRentalToast();
  const rows: [string, string][] = [['Deposit held', formatBillPesos(s.depositCentavos)],
    ...((s.creditCentavos ?? 0) > 0 ? [['Tenant credit', `+ ${formatBillPesos(s.creditCentavos!)}`] as [string, string]] : []),
    ...(s.unpaidBillsCentavos > 0 ? [['Unpaid bills', `− ${formatBillPesos(s.unpaidBillsCentavos)}`] as [string, string]] : []),
    ...s.lines.map((l): [string, string] => [l.label, `− ${formatBillPesos(l.amount)}`]),
    ['Refund to tenant', formatBillPesos(s.refundCentavos)], ...(s.owedCentavos > 0 ? [['Tenant still owes', formatBillPesos(s.owedCentavos)] as [string, string]] : [])];
  return <>
    <View className={card}><Facts rows={rows} /></View>
    {s.forfeit && <Text className={text}>Whole deposit kept (early termination).</Text>}
    {s.refundCentavos > 0 && s.refundMethod && s.refundedOn && <Text className={muted}>{METHOD_LABEL[s.refundMethod]} · {day(s.refundedOn)}{s.refundReference ? ` · Ref ${s.refundReference}` : ''}</Text>}
    {s.notes ? <Text className={text}>{s.notes}</Text> : null}
    {canManage && <ProofFiles files={s.proofs} busy={busy} proofUrl={proofUrl} canAdd
      onUpload={(file) => run({ type: 'uploadSettlementProof', settlementId: s.id, propertyId: s.propertyId, file })} onRemove={(id) => run({ type: 'removeSettlementProof', id })} />}
    <Btn variant="primary" icon="share" label="Share settlement PDF" onPress={() => void sharePdf(settlementHtml(s, ctx), `Settlement-${ctx.renterName}`)
      .catch(() => toast('Couldn’t make the PDF. Try again.', 'error'))} />
  </>;
}
