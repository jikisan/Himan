import { Children, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Image, Linking, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { addPeriods, billBalance, centavosToInput, chargeErrors, contractOpen, contractStage, contractTermsSchema, depositToReturn, detailsStatus, errorMessage,
  formatBillPesos, formatPesos, manilaToday, messengerLabel, messengerUrl, moveInDefaults, nextDueDate, ordinal, parseCharges, parsePesos, periodOf, proratedRent,
  renterSchema, roomRent, tenancyCredit, tenancyOwed, tenancyTermsSchema, toChargeRows } from '@himan/shared/rentals';
import type { ChargeRow, ContractStage, ContractTermsInput, MeterKind, ReceiptContext, RentalBill, RentalContract, RentalPayment, RentalProperty, RentalSettlement, RentalTenancy, RentalUnit,
  Renter, RenterFile, RenterInput } from '@himan/shared/rentals';
import type { RentalAction, RentalsState } from '../hooks/useRentals';
import { Badge, Banner, Btn, Check, Choice, DateField, Facts, Field, Initials, Input, MoneyInput, Row, Sheet, Title, card, muted, text, useFieldErrors, useIconColor,
  useRentalToast, zodFieldErrors } from './ui';
import type { FieldErrors } from './ui';
import { ContractPanel, DetailsReview, TenantLinkPanel } from './Contracts';
import type { ContractInfo } from './Contracts';
import { PaymentFields, PaymentsList, paymentDraft, readPayment } from './Payments';
import { Paper, receiptHtml } from './papers';
import { openSigned, pickFiles } from './types';

const day = (iso: string) => format(parseISO(iso), 'MMM d, yyyy');
/** The sheet's sections, each one the same distance from a line above it (like the web sheet). */
function Sections({ children }: { children: ReactNode }) {
  return <View>{Children.toArray(children).map((child, i) => <View key={i}
    className={i ? 'border-t border-gray-200 py-6 dark:border-gray-700' : 'pb-6'}>{child}</View>)}</View>;
}

const STAGE_WORD: Partial<Record<ContractStage, string>> = { none: 'Not started', draft: 'Draft', sent: 'Waiting to sign', signed: 'Needs your signature' };

/** Everything about one tenant in a full-screen sheet: checklist, contract, rent, money, deposit, link, charges, ID, contact, history. */
export function TenantSheet({ open, onClose, renter, tenancies, bills, payments, settlements, unitName, canManage, busy, run, fileUrl, paymentProofUrl, contractInfo,
  receipt, onSaveDetails, onMoveOut, onRecordPayment, onOpenSettlement, onDelete, overlay }: {
  open: boolean; onClose(): void; renter: Renter | undefined; tenancies: RentalTenancy[]; bills: RentalBill[]; payments: RentalPayment[]; settlements: RentalSettlement[];
  unitName(id: string): string; canManage: boolean; contractInfo: ContractInfo; receipt(p: RentalPayment): ReceiptContext;
  onSaveDetails(input: RenterInput): Promise<void>; onMoveOut(tenancyId: string): void; onRecordPayment(tenancyId: string): void; onOpenSettlement(tenancyId: string): void;
  onDelete(): void; overlay?: React.ReactNode;
} & Pick<RentalsState, 'busy' | 'run' | 'fileUrl' | 'paymentProofUrl'>) {
  const toast = useRentalToast();
  const [editing, setEditing] = useState<'rent' | 'contact' | null>(null);
  if (!renter) return <Sheet open={open} onClose={onClose} title="Tenant"><Text className={muted}>This tenant isn’t available.</Text></Sheet>;
  const mine = tenancies.filter((t) => t.renterId === renter.id);
  const active = mine.filter((t) => t.moveOut === null);
  const last = [...mine].sort((a, b) => (b.moveOut ?? '').localeCompare(a.moveOut ?? ''))[0];
  const contracts = active.flatMap((t) => t.contracts.filter((c) => c.status === 'active'));
  const rent = contracts.reduce((sum, c) => sum + c.monthlyRentCentavos, 0);
  const nextDue = contracts.map((c) => nextDueDate(c.dueDay, manilaToday())).sort()[0];
  const history = mine.flatMap((t) => [{ key: `${t.id}-in`, text: `Moved into ${unitName(t.unitId)}`, date: t.moveIn },
    ...(t.moveOut ? [{ key: `${t.id}-out`, text: `Moved out of ${unitName(t.unitId)}`, date: t.moveOut }] : [])]).sort((a, b) => b.date.localeCompare(a.date));
  const myPayments = payments.filter((p) => mine.some((t) => t.id === p.tenancyId));
  const owed = mine.reduce((sum, t) => sum + tenancyOwed(t.id, bills, payments), 0);
  const credit = mine.reduce((sum, t) => sum + tenancyCredit(t.id, payments, settlements), 0);
  const chat = messengerUrl(renter.facebook);
  const deposits = mine.filter((t) => t.moveOut).map((t) => ({ t, settlement: settlements.find((x) => x.tenancyId === t.id) }))
    .map(({ t, settlement }) => ({ t, settlement, deposit: depositToReturn(t, bills, payments, settlement) })).filter(({ deposit }) => deposit.state !== 'none');
  const linkOf = (t: RentalTenancy) => contractInfo.links.find((l) => l.tenancyId === t.id);
  const waiting = active.map((t) => detailsStatus(contractInfo.links, t.id)).find(Boolean);
  const contact: [string, string][] = [['Mobile', renter.phone], ['Messenger', chat ? messengerLabel(renter.facebook) : renter.facebook], ['Email', renter.email],
    ['Home address', renter.address], ['Emergency', [renter.emergencyName, renter.emergencyPhone].filter(Boolean).join(' · ')],
    ['Living with them', `${renter.occupants} ${renter.occupants === 1 ? 'person' : 'people'}`], ['Notes', renter.notes]];
  const stageOf = (tenancyId: string): ContractStage => contractStage(active.find((t) => t.id === tenancyId)!, contractInfo.texts);
  const contractFirst = contracts.some((c) => contractOpen(stageOf(c.tenancyId)));
  const checklists = active.map((t) => {
    const stage = stageOf(t.id);
    const paid = bills.filter((b) => b.tenancyId === t.id && b.kind === 'move_in' && b.status === 'issued').every((b) => billBalance(b, payments) === 0);
    return { t, stage, paid };
  }).filter(({ stage, paid }) => stage !== 'not_needed' && (!paid || stage !== 'done'));
  const setNotNeeded = (tenancyId: string, value: boolean) => run({ type: 'setContractNotNeeded', tenancyId, value })
    .then(() => toast(value ? 'Marked as not needed' : 'Contract is back on your to-do list'), (e) => toast(errorMessage(e), 'error'));
  const contractSections = contracts.map((c) => {
    const stage = stageOf(c.tenancyId);
    return <View key={c.id} className="gap-3">
      <Title size="base">Contract</Title>
      <Facts rows={[['Lease starts', day(c.startDate)], ['Lease ends', day(c.endDate)],
        ['Deposit', `${formatPesos(c.depositCentavos)} · ${c.advanceMonths} month${c.advanceMonths === 1 ? '' : 's'} advance`]]} />
      {stage === 'not_needed' ? <View className={`${card} flex-row items-center gap-2`}><Text className={`flex-1 ${muted}`}>Contract not needed</Text>
        {canManage && <Btn small label="Undo" disabled={busy} onPress={() => void setNotNeeded(c.tenancyId, false)} />}</View>
        : <ContractPanel contract={c} renter={renter} info={contractInfo} canManage={canManage} busy={busy} run={run}
          onNotNeeded={stage === 'none' || stage === 'draft' ? () => void setNotNeeded(c.tenancyId, true) : undefined} />}
    </View>;
  });
  const sub = active.length ? active.map((t) => `Lives in ${unitName(t.unitId)} since ${day(t.moveIn)}`).join(' · ')
    : last?.moveOut ? `Moved out of ${unitName(last.unitId)} on ${day(last.moveOut)}` : 'Not renting a room right now';

  return <Sheet open={open} onClose={() => { setEditing(null); onClose(); }} title={renter.fullName} subtitle={sub} overlay={overlay}><Sections>
    {(waiting || renter.phone || chat || (canManage && active.length > 0)) && <View className="gap-3">
    {waiting && <Badge tone="amber" label={waiting} />}
    <Row>
      {renter.phone ? <Btn small icon="phone" label="Call" onPress={() => void Linking.openURL(`tel:${renter.phone}`)} /> : null}
      {renter.phone ? <Btn small icon="message-square" label="Text" onPress={() => void Linking.openURL(`sms:${renter.phone}`)} /> : null}
      {chat ? <Btn small icon="message-circle" label="Messenger" onPress={() => void Linking.openURL(chat)} /> : null}
      {canManage && active.map((t) => <Btn key={t.id} small variant="dangerOutline" icon="log-out" label="Move out" a11y={`Move ${renter.fullName} out of ${unitName(t.unitId)}`}
        onPress={() => onMoveOut(t.id)} />)}
    </Row></View>}

    {checklists.map(({ t, stage, paid }) => <View key={`steps-${t.id}`} className="gap-2">
      {active.length > 1 && <Text className={`font-semibold ${text}`}>{unitName(t.unitId)}</Text>}
      {/* A progress line, not cards: plain dots and words, so nothing here looks pressable. */}
      <View className="flex-row">{([['Added', true, ''], ['Move-in paid', paid, ''], ['Contract', stage === 'done', STAGE_WORD[stage] ?? '']] as const).map(([label, ok, word], i, all) =>
        <View key={label} accessible accessibilityLabel={`${label}, ${ok ? 'done' : 'not yet'}${word ? `, ${word}` : ''}`} className="flex-1 items-center gap-1">
          {i < all.length - 1 && <View style={{ position: 'absolute', left: '50%', width: '100%', top: 11, height: 2 }}
            className={ok && all[i + 1][1] ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'} />}
          <View className={`h-6 w-6 items-center justify-center rounded-full ${ok ? 'bg-emerald-600' : 'border-2 border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-900'}`}>
            {ok && <Feather name="check" size={14} color="#fff" />}</View>
          <Text className={`text-center text-sm ${ok ? `font-semibold ${text}` : muted}`}>{label}</Text>
          {word ? <Text className={`text-center text-xs ${muted}`}>{word}</Text> : null}
        </View>)}</View>
    </View>)}
    {canManage && active.map((t) => { const link = linkOf(t);
      return link?.status === 'submitted' && link.submittedDetails ? <DetailsReview key={`review-${t.id}`} tenancyId={t.id} details={link.submittedDetails} busy={busy} run={run} /> : null; })}
    {contractFirst && contractSections}

    {nextDue && <View className="gap-3">
      <View className="flex-row items-center justify-between"><Title size="base">Rent</Title>
        {canManage && <Btn small variant="ghost" label={editing === 'rent' ? 'Done' : 'Change'} a11y={editing === 'rent' ? 'Done changing rent' : 'Change rent'}
          onPress={() => setEditing(editing === 'rent' ? null : 'rent')} />}</View>
      <Text className={`text-3xl font-bold ${text}`}>{formatPesos(rent)} <Text className={`text-sm font-normal ${muted}`}>per month</Text></Text>
      <View className="rounded-xl bg-red-50 px-3 py-2 dark:bg-red-950/40"><Text className={text}>Next due <Text className="font-bold">{format(parseISO(nextDue), 'MMM d')}</Text>
        {contracts.length === 1 ? ` · every ${contracts[0].dueDay === 31 ? 'month end' : ordinal(contracts[0].dueDay)}` : ''}</Text></View>
      {editing === 'rent' && active.map((t) => {
        const contract = t.contracts.find((c) => c.status === 'active');
        const billed = (kind: RentalBill['kind']) => bills.some((b) => b.tenancyId === t.id && b.kind === kind && b.status === 'issued');
        return contract && <RentTerms key={contract.id} contract={contract} room={unitName(t.unitId)} showRoom={active.length > 1} busy={busy}
          billed={{ monthly: billed('monthly'), moveIn: billed('move_in') }} onSave={async (input, newRent) => {
            if (input) await run({ type: 'updateTerms', contractId: contract.id, input });
            if (newRent) await run({ type: 'changeRent', contractId: contract.id, from: newRent.from, rentCentavos: newRent.rentCentavos });
          }} />;
      })}
    </View>}

    {mine.length > 0 && <View className="gap-3">
      <Title size="base">Money received</Title>
      <View className="flex-row flex-wrap items-center gap-2">
        <Text className={owed > 0 ? `font-semibold ${text}` : muted}>{owed > 0 ? `Owes ${formatBillPesos(owed)}` : 'Owes nothing'}</Text>
        {credit > 0 && <Badge tone="green" label={`${formatBillPesos(credit)} credit`} />}
      </View>
      {credit > 0 && <Text className={`text-xs ${muted}`}>Credit is used on their next SOA automatically, so a new SOA may already be partly paid.</Text>}
      {canManage && (active.length ? active : [last]).map((t) => <Btn key={t.id} icon="dollar-sign" label={`Record payment${active.length > 1 ? ` · ${unitName(t.unitId)}` : ''}`}
        onPress={() => onRecordPayment(t.id)} />)}
      <PaymentsList payments={myPayments} bills={bills} canManage={canManage} busy={busy} run={run} proofUrl={paymentProofUrl} empty="No payments recorded yet." receipt={receipt} />
    </View>}

    {deposits.length > 0 && <View className="gap-2">
      <Title size="base">Deposit</Title>
      {deposits.map(({ t, settlement, deposit }) => <View key={t.id} className="gap-2">
        <Text className={text}>{mine.length > 1 ? `${unitName(t.unitId)} · ` : ''}{settlement
          ? settlement.refundCentavos > 0 ? `Settled · ${formatBillPesos(settlement.refundCentavos)} refunded` : `Settled · deposit kept${settlement.owedCentavos > 0 ? ` · still owes ${formatBillPesos(settlement.owedCentavos)}` : ''}`
          : `${formatBillPesos(deposit.depositCentavos)} to return`}</Text>
        {settlement ? <Btn label="View settlement" onPress={() => onOpenSettlement(t.id)} /> : canManage && <Btn variant="primary" label="Settle deposit" onPress={() => onOpenSettlement(t.id)} />}
      </View>)}
    </View>}

    {!contractFirst && contractSections}
    {canManage && active.map((t) => { const link = linkOf(t); return link ? <TenantLinkPanel key={`link-${t.id}`} link={link} name={renter.fullName} busy={busy} run={run} /> : null; })}
    {active.map((t) => <Charges key={t.id} tenancy={t} room={unitName(t.unitId)} showRoom={active.length > 1} canManage={canManage} busy={busy}
      onSave={(charges) => run({ type: 'setCharges', tenancyId: t.id, charges })} />)}
    {canManage && <RenterFiles renter={renter} busy={busy} run={run} fileUrl={fileUrl} />}

    <View className="gap-2">
      <View className="flex-row items-center justify-between"><Title size="base">Contact</Title>
        {canManage && editing !== 'contact' && <Btn small variant="ghost" icon="edit-2" label="Edit" a11y="Edit contact" onPress={() => setEditing('contact')} />}</View>
      {editing === 'contact' ? <RenterForm renter={renter} busy={busy} onCancel={() => setEditing(null)} onSave={async (input) => { await onSaveDetails(input); setEditing(null); }} />
        : <Facts rows={contact.filter(([, v]) => v)} />}
    </View>
    {history.length > 0 && <View className="gap-2"><Title size="base">History</Title>
      {history.map((h) => <View key={h.key} className="flex-row items-center gap-3"><View className="h-2 w-2 rounded-full bg-indigo-600" />
        <Text className={`flex-1 ${text}`}>{h.text}</Text><Text className={muted}>{day(h.date)}</Text></View>)}</View>}
    {canManage && <Btn variant="dangerOutline" icon="trash-2" label="Delete tenant" onPress={onDelete} />}
  </Sections></Sheet>;
}

const TERM_FIELD: Record<string, string> = { monthlyRentCentavos: 'rent', dueDay: 'due', advanceMonths: 'advance', depositCentavos: 'deposit' };

function RentTerms({ contract, room, showRoom, busy, billed, onSave }: {
  contract: RentalContract; room: string; showRoom: boolean; busy: boolean; billed: { monthly: boolean; moveIn: boolean };
  onSave(input: ContractTermsInput | null, newRent: { from: string; rentCentavos: number } | null): Promise<unknown>;
}) {
  const [rent, setRent] = useState(centavosToInput(contract.monthlyRentCentavos));
  const [newRent, setNewRent] = useState('');
  const [from, setFrom] = useState(addPeriods(periodOf(manilaToday()), 1));
  const [dueDay, setDueDay] = useState(String(contract.dueDay));
  const [advance, setAdvance] = useState(String(contract.advanceMonths));
  const [deposit, setDeposit] = useState(centavosToInput(contract.depositCentavos));
  const [message, setMessage] = useState('');
  const fe = useFieldErrors();
  const months = Array.from({ length: 6 }, (_, i) => addPeriods(periodOf(manilaToday()), i));
  const save = async () => {
    fe.clear(); setMessage('');
    const bad: [string, string][] = [];
    const pesos = (key: string, value: string) => { try { return parsePesos(value); } catch (e) { bad.push([key, errorMessage(e)]); return 0; } };
    const monthlyRentCentavos = billed.monthly ? contract.monthlyRentCentavos : pesos('rent', rent);
    const depositCentavos = deposit.trim() ? pesos('deposit', deposit) : 0;
    if (bad.length) { fe.failMany(bad); return; }
    const result = contractTermsSchema.safeParse({ monthlyRentCentavos, dueDay: Number(dueDay), advanceMonths: Number(advance), depositCentavos });
    if (!result.success) { fe.failMany(zodFieldErrors(result.error, ([key]) => TERM_FIELD[key as string] ?? 'rent')); return; }
    const changed = result.data.monthlyRentCentavos !== contract.monthlyRentCentavos || result.data.dueDay !== contract.dueDay
      || result.data.advanceMonths !== contract.advanceMonths || result.data.depositCentavos !== contract.depositCentavos;
    let renewal = null;
    if (billed.monthly && newRent.trim()) {
      renewal = { from: `${from}-01`, rentCentavos: pesos('new-rent', newRent) };
      if (bad.length) { fe.failMany(bad); return; }
      if (!renewal.rentCentavos) { fe.fail('new-rent', 'Enter the monthly rent'); return; }
    }
    if (!changed && !renewal) { setMessage('Nothing changed'); return; }
    try { await onSave(changed ? result.data : null, renewal); setMessage(renewal ? `New rent starts ${from}` : 'Saved'); } catch (e) { fe.setFormError(errorMessage(e)); }
  };
  return <View className="gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
    <Banner message={fe.formError} />
    <View><Text className={`font-semibold ${text}`}>Rent, advance and deposit{showRoom ? ` · ${room}` : ''}</Text>
      <Text className={`text-xs ${muted}`}>{billed.monthly ? 'This rent is already on bills. A new rent starts from the month you pick.' : 'Fix a typo or record a new agreement.'}</Text></View>
    {billed.monthly ? <>
      <Field label="New rent" hint={`now ${formatPesos(contract.monthlyRentCentavos)}`} error={fe.errors['new-rent']}>
        <MoneyInput accessibilityLabel="New rent" value={newRent} placeholder="Leave blank to keep" onChangeText={(v) => { setNewRent(v); fe.clear('new-rent'); }} /></Field>
      <Field label="Starting"><Choice label="Starting month" value={from} onChange={setFrom}
        options={months.map((m) => [m, format(parseISO(`${m}-01`), 'MMM yyyy')] as const)} /></Field>
    </> : <Field label="Rent per month" required error={fe.errors.rent}>
      <MoneyInput accessibilityLabel="Rent per month" value={rent} invalid={!!fe.errors.rent} onChangeText={(v) => { setRent(v); fe.clear('rent'); }} /></Field>}
    <Field label="Due day" required error={fe.errors.due}>
      <Input accessibilityLabel="Due day" keyboardType="number-pad" value={dueDay} invalid={!!fe.errors.due} onChangeText={(v) => { setDueDay(v); fe.clear('due'); }} /></Field>
    <Field label="Advance months" hint={billed.moveIn ? 'On the move-in bill' : undefined} error={fe.errors.advance}>
      <Input accessibilityLabel="Advance months" keyboardType="number-pad" value={advance} editable={!billed.moveIn} onChangeText={(v) => { setAdvance(v); fe.clear('advance'); }} /></Field>
    <Field label="Deposit" hint={billed.moveIn ? 'On the move-in bill' : undefined} error={fe.errors.deposit}>
      <MoneyInput accessibilityLabel="Deposit" value={deposit} editable={!billed.moveIn} onChangeText={(v) => { setDeposit(v); fe.clear('deposit'); }} /></Field>
    <Btn variant="primary" label="Save" busy={busy} onPress={() => void save()} />
    {message ? <Text className={`text-sm ${muted}`}>{message}</Text> : null}
  </View>;
}

// ---- Extra charges

const SUGGESTIONS = ['CUSA', 'Parking', 'Wi-Fi', 'Cleaning', 'Appliances'];
const peso = (value: string) => { try { return value.trim() ? parsePesos(value) : 0; } catch { return 0; } };

export function ChargesEditor({ idPrefix, value, onChange, fe }: { idPrefix: string; value: ChargeRow[]; onChange(rows: ChargeRow[]): void; fe?: FieldErrors }) {
  const set = (i: number, patch: Partial<ChargeRow>) => { fe?.clear(`${idPrefix}-charge-${i}-${'label' in patch ? 'name' : 'amount'}`); onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r))); };
  const used = new Set(value.map((r) => r.label.trim().toLowerCase()));
  const total = value.reduce((sum, r) => sum + peso(r.amount), 0);
  return <View className="gap-3">
    {value.map((row, i) => { const name = `${idPrefix}-charge-${i}-name`, amount = `${idPrefix}-charge-${i}-amount`;
      return <View key={i} className="gap-2 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
        <Input accessibilityLabel="Charge name" placeholder="Name, e.g. Parking" value={row.label} invalid={!!fe?.errors[name]} onChangeText={(v) => set(i, { label: v })} />
        {fe?.errors[name] ? <Text className="text-sm text-red-600 dark:text-red-400">{fe.errors[name]}</Text> : null}
        <MoneyInput accessibilityLabel="Charge amount" placeholder="0.00" value={row.amount} invalid={!!fe?.errors[amount]} onChangeText={(v) => set(i, { amount: v })} />
        {fe?.errors[amount] ? <Text className="text-sm text-red-600 dark:text-red-400">{fe.errors[amount]}</Text> : null}
        <Btn small variant="ghost" icon="x" label="Remove" a11y={`Remove ${row.label || 'charge'}`} onPress={() => { fe?.clear(); onChange(value.filter((_, j) => j !== i)); }} />
      </View>; })}
    {total > 0 && <View className="flex-row justify-between"><Text className={muted}>Total each month</Text><Text className={`font-semibold ${text}`}>{formatPesos(total)}</Text></View>}
    {value.length === 0 && <Text className={`italic ${muted}`}>No extra charges. Tap one to add it.</Text>}
    <Row>{SUGGESTIONS.filter((s) => !used.has(s.toLowerCase())).map((label) => <Btn key={label} small icon="plus" label={label} a11y={`Add ${label}`}
      onPress={() => onChange([...value, { label, amount: '' }])} />)}
      <Btn small icon="plus" label="Other" a11y="Add another charge" onPress={() => onChange([...value, { label: '', amount: '' }])} /></Row>
  </View>;
}

function Charges({ tenancy, room, showRoom, canManage, busy, onSave }: {
  tenancy: RentalTenancy; room: string; showRoom: boolean; canManage: boolean; busy: boolean; onSave(charges: RentalTenancy['charges']): Promise<unknown>;
}) {
  const [rows, setRows] = useState(() => toChargeRows(tenancy.charges));
  const [saved, setSaved] = useState(false);
  const fe = useFieldErrors();
  if (!canManage && !tenancy.charges.length) return null;
  return <View className="gap-2">
    <View><Title size="base">{`Extra monthly charges${showRoom ? ` · ${room}` : ''}`}</Title><Text className={`text-xs ${muted}`}>Added to every monthly SOA.</Text></View>
    {canManage ? <>
      <Banner message={fe.formError} />
      <ChargesEditor idPrefix={`charges-${tenancy.id}`} value={rows} fe={fe} onChange={(r) => { setRows(r); setSaved(false); fe.setFormError(null); }} />
      <Btn label="Save charges" busy={busy} onPress={async () => {
        fe.clear(); setSaved(false);
        const bad = chargeErrors(`charges-${tenancy.id}`, rows);
        if (bad.length) { fe.failMany(bad); return; }
        try { await onSave(parseCharges(rows)); setSaved(true); } catch (e) { fe.setFormError(errorMessage(e)); }
      }} />
      {saved && <Text className={`text-sm ${muted}`}>Saved</Text>}
    </> : <Facts rows={tenancy.charges.map((c) => [c.label, formatPesos(c.amount)])} />}
  </View>;
}

// ---- ID files

function RenterFiles({ renter, busy, run, fileUrl }: { renter: Renter } & Pick<RentalsState, 'busy' | 'run' | 'fileUrl'>) {
  const toast = useRentalToast();
  const [uploading, setUploading] = useState(false);
  const upload = async () => {
    setUploading(true);
    try {
      const files = await pickFiles(['application/pdf', 'image/jpeg', 'image/png']);
      for (const file of files) await run({ type: 'uploadRenterFile', renterId: renter.id, propertyId: renter.propertyId, file });
      if (files.length) toast(files.length === 1 ? 'ID attached' : `${files.length} files attached`);
    } catch (e) { toast(errorMessage(e), 'error'); } finally { setUploading(false); }
  };
  return <View className="gap-2">
    <View><Title size="base">Valid ID</Title><Text className={`text-xs ${muted}`}>Private. Only you and managers can open these.</Text></View>
    <View className="flex-row flex-wrap gap-3">{renter.files.map((f) => <IdCard key={f.id} file={f} busy={busy} fileUrl={fileUrl}
      onRemove={() => Alert.alert(`Remove ${f.name}?`, undefined, [{ text: 'Keep', style: 'cancel' }, { text: 'Remove', style: 'destructive',
        onPress: () => void run({ type: 'removeRenterFile', id: f.id }).then(() => toast('ID removed'), (e) => toast(errorMessage(e), 'error')) }])} />)}</View>
    <Btn icon="upload" label={uploading ? 'Uploading…' : renter.files.length ? 'Add another ID' : 'Attach ID'} busy={uploading} disabled={busy} onPress={() => void upload()} />
    <Text className={`text-xs ${muted}`}>Photo or PDF, up to 10 MB.</Text>
  </View>;
}

function IdCard({ file, busy, fileUrl, onRemove }: { file: RenterFile; busy: boolean; fileUrl: RentalsState['fileUrl']; onRemove(): void }) {
  const toast = useRentalToast();
  const icon = useIconColor();
  const isImage = file.mimeType.startsWith('image/');
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!isImage || !file.ready) return;
    let live = true;
    fileUrl(file.id).then((url) => { if (live) setSrc(url); }, () => undefined);
    return () => { live = false; };
  }, [file.id, file.ready, isImage, fileUrl]);
  const open = () => void openSigned(fileUrl(file.id)).catch((e) => toast(errorMessage(e), 'error'));
  return <View className="w-[47%] overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
    <Pressable accessibilityRole="button" accessibilityLabel={`View ${file.name}`} disabled={!file.ready} onPress={open}
      className="aspect-[4/3] items-center justify-center bg-gray-100 dark:bg-gray-800">
      {src ? <Image source={{ uri: src }} accessible={false} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        : <Feather name={isImage ? 'image' : 'file-text'} size={28} color={icon} />}
    </Pressable>
    <View className="gap-2 p-2">
      <Text numberOfLines={1} className={`text-sm font-semibold ${text}`}>{file.name}</Text>
      {!file.ready && <Text className="text-xs text-red-600">Upload didn’t finish. Remove and attach again.</Text>}
      <Btn small icon="eye" label="View" a11y={`Open ${file.name}`} disabled={!file.ready} onPress={open} />
      <Btn small variant="dangerOutline" icon="trash-2" label="Remove" a11y={`Remove ${file.name}`} disabled={busy} onPress={onRemove} />
    </View>
  </View>;
}

// ---- Contact form

type TextKey = Exclude<keyof RenterInput, 'occupants' | 'notes'>;
function RenterForm({ renter, busy, onSave, onCancel }: { renter: Renter; busy: boolean; onSave(value: RenterInput): Promise<void>; onCancel(): void }) {
  const [form, setForm] = useState<RenterInput>({ fullName: renter.fullName, phone: renter.phone, facebook: renter.facebook, email: renter.email, address: renter.address,
    emergencyName: renter.emergencyName, emergencyPhone: renter.emergencyPhone, occupants: renter.occupants, notes: renter.notes });
  const fe = useFieldErrors();
  const edit = (key: keyof RenterInput, value: string | number) => { setForm((f) => ({ ...f, [key]: value })); fe.clear(key); };
  const input = (key: TextKey, label: string, kind: 'default' | 'phone-pad' | 'email-address' = 'default', required = false) =>
    <Field key={key} label={label} required={required} error={fe.errors[key]}>
      <Input accessibilityLabel={label} keyboardType={kind} autoCapitalize={kind === 'email-address' ? 'none' : 'words'} value={form[key]} invalid={!!fe.errors[key]} onChangeText={(v) => edit(key, v)} />
    </Field>;
  return <View className="gap-4">
    <Banner message={fe.formError} />
    {input('fullName', 'Full name', 'default', true)}{input('phone', 'Mobile number', 'phone-pad')}{input('facebook', 'Facebook / Messenger')}
    {input('email', 'Email', 'email-address')}{input('address', 'Home address')}
    {input('emergencyName', 'Emergency contact name')}{input('emergencyPhone', 'Emergency contact number', 'phone-pad')}
    <Field label="Occupants" error={fe.errors.occupants}><Input accessibilityLabel="Occupants" keyboardType="number-pad" value={String(form.occupants)} onChangeText={(v) => edit('occupants', Number(v))} /></Field>
    <Field label="Notes" error={fe.errors.notes}><Input accessibilityLabel="Notes" multiline value={form.notes} onChangeText={(v) => edit('notes', v)} /></Field>
    <Row wrap={false}><Btn grow label="Cancel" onPress={onCancel} /><Btn grow variant="primary" label="Save tenant" busy={busy} onPress={async () => {
      fe.clear();
      const result = renterSchema.safeParse(form);
      if (!result.success) { fe.failMany(zodFieldErrors(result.error, ([key]) => String(key))); return; }
      try { await onSave(result.data); } catch (e) { fe.setFormError(errorMessage(e)); }
    }} /></Row>
  </View>;
}

// ---- Move out

type FinalReadings = { kind: MeterKind; value: number }[];
export function MoveOutSheet({ tenancy, unit, name, busy, onConfirm, onClose }: {
  tenancy: RentalTenancy | null; unit?: RentalUnit; name: string; busy: boolean; onConfirm(moveOut: string, readings: FinalReadings): void; onClose(): void;
}) {
  return <Sheet open={!!tenancy} onClose={onClose} closeLabel="Cancel" title={`Move out ${name}?`}>
    {tenancy && <MoveOutForm key={tenancy.id} tenancy={tenancy} unit={unit} busy={busy} onConfirm={onConfirm} />}
  </Sheet>;
}

function MoveOutForm({ tenancy, unit, busy, onConfirm }: { tenancy: RentalTenancy; unit?: RentalUnit; busy: boolean; onConfirm(moveOut: string, readings: FinalReadings): void }) {
  const meters = unit ? (['electric', 'water'] as const).filter((k) => (k === 'electric' ? unit.electricMode : unit.waterMode) === 'submeter') : [];
  const [readings, setReadings] = useState<Partial<Record<MeterKind, string>>>({});
  const today = manilaToday();
  const [date, setDate] = useState(today < tenancy.moveIn ? tenancy.moveIn : today);
  const fe = useFieldErrors();
  return <>
    <Text className={muted}>Their bed becomes free. {meters.length > 0 ? 'A final reading makes a final bill for their last usage. ' : ''}You settle their deposit afterwards.</Text>
    <Field label="Move-out date" required error={fe.errors.date}><DateField label="Move-out date" value={date} min={tenancy.moveIn} onChange={(v) => { setDate(v); fe.clear('date'); }} /></Field>
    {meters.map((kind) => <Field key={kind} label={`Final ${kind === 'electric' ? 'electricity' : 'water'} reading`} hint="optional" error={fe.errors[kind]}>
      <Input accessibilityLabel={`Final ${kind} reading`} keyboardType="decimal-pad" value={readings[kind] ?? ''} invalid={!!fe.errors[kind]}
        onChangeText={(v) => { setReadings((r) => ({ ...r, [kind]: v })); fe.clear(kind); }} />
    </Field>)}
    <Btn variant="danger" icon="log-out" label="Confirm move out" busy={busy} onPress={() => {
      fe.clear();
      if (date < tenancy.moveIn) { fe.fail('date', `Move-out can’t be before move-in (${day(tenancy.moveIn)})`); return; }
      const bad = meters.filter((kind) => readings[kind]?.trim() && !(Number.isFinite(Number(readings[kind])) && Number(readings[kind]) >= 0));
      if (bad.length) { fe.failMany(bad.map((kind) => [kind, 'Meter readings must be 0 or more'])); return; }
      onConfirm(date, meters.flatMap((kind) => readings[kind]?.trim() ? [{ kind, value: Number(readings[kind]) }] : []));
    }} />
  </>;
}

// ---- Move in: Add tenant → Pay → Contract

type MoveInDraft = Omit<Extract<RentalAction, { type: 'moveIn' }>, 'payment' | 'proofs'>;
const blankPerson: RenterInput = { fullName: '', phone: '', facebook: '', email: '', address: '', emergencyName: '', emergencyPhone: '', occupants: 1, notes: '' };
const FIELD_ID: Record<string, string> = { moveIn: 'moveIn', startDate: 'moveIn', endDate: 'end', monthlyRentCentavos: 'rent', dueDay: 'due', advanceMonths: 'advance',
  depositCentavos: 'deposit' };
const fieldId = (path: PropertyKey[]) => FIELD_ID[String(path[0])] ?? String(path[0]);

function moveInLines({ moveIn, terms: t }: MoveInDraft): [string, number][] {
  const days = proratedRent(t.monthlyRentCentavos, moveIn, t.dueDay);
  return [
    ...(days && days.amount > 0 ? [[`Rent for ${days.days} day${days.days === 1 ? '' : 's'}`, days.amount] as [string, number]] : []),
    ...(t.advanceMonths > 0 ? [[`Advance · ${t.advanceMonths} month${t.advanceMonths === 1 ? '' : 's'}`, t.monthlyRentCentavos * t.advanceMonths] as [string, number]] : []),
    ...(t.depositCentavos > 0 ? [['Deposit', t.depositCentavos] as [string, number]] : []),
  ];
}

function MoneyBox({ title, lines, total }: { title: string; lines: [string, number][]; total: number | null }) {
  return <View className="gap-1 rounded-2xl bg-indigo-50 p-4 dark:bg-indigo-950/40">
    <Text className={`font-semibold ${text}`}>{title}</Text>
    {lines.map(([label, amount]) => <View key={label} className="flex-row justify-between gap-3"><Text className={`flex-1 ${muted}`}>{label}</Text><Text className={text}>{formatPesos(amount)}</Text></View>)}
    <View className="mt-1 flex-row items-baseline justify-between border-t border-indigo-200 pt-2 dark:border-indigo-800">
      <Text className={`font-semibold ${text}`}>Total</Text><Text className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{total === null ? '—' : formatPesos(total)}</Text></View>
  </View>;
}

const STEPS = ['Add tenant', 'Pay', 'Contract'];

export function MoveInFlow({ property, unit, renters, others, state, receipt, contractInfo, onClose }: {
  property: RentalProperty; unit: RentalUnit; renters: Renter[]; others: { renter: Renter; propertyName: string }[]; state: RentalsState;
  receipt(p: RentalPayment): ReceiptContext; contractInfo: ContractInfo; onClose(): void;
}) {
  const toast = useRentalToast();
  const { busy, run } = state;
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<MoveInDraft | null>(null);
  const [pay, setPay] = useState(() => paymentDraft(0));
  const [saved, setSaved] = useState<{ renterId: string; tenancyId: string; paymentId: string | null } | null>(null);
  const [viewReceipt, setViewReceipt] = useState(false);
  const fe = useFieldErrors();
  const close = () => (saved ? onClose() : Alert.alert('Discard this move-in?', 'Nothing is saved yet. What you typed will be lost.',
    [{ text: 'Keep going', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: onClose }]));
  const nameOf = (tenancyId: string) => state.renters.find((r) => r.id === state.tenancies.find((t) => t.id === tenancyId)?.renterId)?.fullName ?? 'Tenant';
  const name = draft?.renter?.fullName ?? state.renters.find((r) => r.id === draft?.renterId)?.fullName ?? '';
  const lines = draft ? moveInLines(draft) : [];
  const total = lines.reduce((sum, [, amount]) => sum + amount, 0);
  const payments = state.payments.filter((p) => p.propertyId === property.id);
  const payment = saved?.paymentId ? payments.find((p) => p.id === saved.paymentId) : undefined;
  const tenancy = saved && state.tenancies.find((t) => t.id === saved.tenancyId);
  const contract = tenancy?.contracts.find((c) => c.status === 'active');
  const renter = saved && state.renters.find((r) => r.id === saved.renterId);
  const save = async (withPayment: boolean) => {
    if (!draft) return;
    fe.clear();
    const input = withPayment ? readPayment(pay, fe) : null;
    if (withPayment && !input) return;
    try {
      const result = await run({ ...draft, payment: input, proofs: withPayment ? pay.proofs : [] }) as { renterId: string; tenancyId: string; paymentId: string | null; warnings: string[] };
      result.warnings.forEach((w) => toast(w, 'warning'));
      setSaved(result);
    } catch (e) { fe.setFormError(errorMessage(e)); }
  };
  const subtitle = `${unit.kind === 'bedspace' ? 'Shared room' : unit.kind === 'whole' ? 'Whole house' : 'Private room'}${unit.defaultRentCentavos > 0 ? ` · ${formatPesos(unit.defaultRentCentavos)}` : ''}`;
  return <Sheet open onClose={close} title={`Add tenant to ${unit.name}`} subtitle={subtitle}>
    <View className="flex-row gap-2">{STEPS.map((label, i) => { const done = step > i + 1, now = step === i + 1;
      return <View key={label} accessible accessibilityLabel={`Step ${i + 1}, ${label}${done ? ', done' : now ? ', current' : ''}`} className="flex-1 flex-row items-center gap-1.5">
        <View className={`h-6 w-6 items-center justify-center rounded-full ${done ? 'bg-emerald-600' : now ? 'bg-indigo-600' : 'border border-gray-300'}`}>
          {done ? <Feather name="check" size={14} color="#fff" /> : <Text className={`text-xs ${now ? 'text-white' : muted}`}>{i + 1}</Text>}</View>
        <Text className={`text-sm ${now ? `font-semibold ${text}` : muted}`}>{label}</Text></View>; })}</View>

    {step === 1 && <AddTenantForm unit={unit} rentDueDay={property.rentDueDay} renters={renters} others={others} busy={busy} onCancel={close}
      onNext={(next) => { setDraft(next); setPay(paymentDraft(moveInLines(next).reduce((sum, [, a]) => sum + a, 0))); setStep(2); }} />}

    {step === 2 && draft && <>
      <MoneyBox title={`Move-in bill for ${name}`} lines={lines} total={total} />
      {saved ? <>
        <Banner tone="gray" message="Tenant added" />
        <Text className={muted}>{payment ? `${formatBillPesos(payment.amountCentavos)} recorded.` : 'Nothing paid yet: the move-in bill waits in Bills.'} Their bed is taken. Next, the contract.</Text>
        {payment && <Btn icon="file-text" label="View receipt" onPress={() => setViewReceipt(true)} />}
        <Btn variant="primary" label="Next: contract" onPress={() => setStep(3)} />
        {payment && <Sheet open={viewReceipt} onClose={() => setViewReceipt(false)} title="Receipt" subtitle={`${formatBillPesos(payment.amountCentavos)} from ${name}`}>
          <Paper html={receiptHtml(payment, receipt(payment))} /></Sheet>}
      </> : <>
        <Banner message={fe.formError} />
        <Text className={text}>Record what {name.split(' ')[0] || 'they'} paid now. A part is fine; the rest stays on the bill.</Text>
        <PaymentFields value={pay} onChange={setPay} owed={total} propertyId={property.id} payments={payments} nameOf={nameOf} fe={fe} />
        <Btn variant="primary" label="Record payment and add tenant" busy={busy} onPress={() => void save(true)} />
        <Btn label="Add without payment (pay later)" disabled={busy} onPress={() => void save(false)} />
      </>}
    </>}

    {step === 3 && <>
      {contract && renter ? <ContractPanel contract={contract} renter={renter} canManage busy={busy} run={run} inline info={contractInfo} />
        : <Text className={muted}>Loading…</Text>}
      <Btn label={state.contractTexts.some((t) => t.contractId === contract?.id) ? 'Close' : 'Do the contract later'} onPress={onClose} />
    </>}
  </Sheet>;
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange(n: number): void }) {
  return <View className="flex-row items-center gap-2">
    <Btn small icon="minus" label="Less" a11y={`${label}: one less`} disabled={value <= min} onPress={() => onChange(value - 1)} />
    <Text accessibilityLabel={`${label}: ${value}`} className={`min-w-12 text-center text-xl font-bold ${text}`}>{value}</Text>
    <Btn small icon="plus" label="More" a11y={`${label}: one more`} disabled={value >= max} onPress={() => onChange(value + 1)} />
  </View>;
}

function Collapsible({ title, summary, children }: { title: string; summary: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const icon = useIconColor();
  return <View className="rounded-xl border border-gray-200 dark:border-gray-700">
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} className="min-h-12 flex-row items-center gap-3 px-4 py-2">
      <View className="flex-1"><Text className={`font-semibold ${text}`}>{title}</Text><Text numberOfLines={1} className={`text-xs ${muted}`}>{summary}</Text></View>
      <Text className="font-semibold text-indigo-600 dark:text-indigo-400">{open ? 'Hide' : 'Show'}</Text>
      <Feather name={open ? 'chevron-down' : 'chevron-right'} size={18} color={icon} />
    </Pressable>
    {open && <View className="gap-4 border-t border-gray-200 p-4 dark:border-gray-700">{children}</View>}
  </View>;
}

function AddTenantForm({ unit, renters, others, rentDueDay, busy, onNext, onCancel }: {
  unit: RentalUnit; renters: Renter[]; others: { renter: Renter; propertyName: string }[]; rentDueDay: number | null; busy: boolean;
  onNext(draft: MoveInDraft): void; onCancel(): void;
}) {
  const [person, setPerson] = useState(blankPerson);
  const [existingId, setExistingId] = useState<string | null>(null);
  const other = existingId?.startsWith('other:') ? others.find((o) => `other:${o.renter.id}` === existingId)?.renter : undefined;
  const [moveIn, setMoveIn] = useState(manilaToday());
  const [ownRent, setOwnRent] = useState<string | null>(null);
  const people = Math.max(person.occupants || 1, 1);
  const rent = ownRent ?? centavosToInput(roomRent(unit, people));
  const [own, setOwn] = useState<{ endDate?: string; dueDay?: string; advance?: string; deposit?: string }>({});
  const fe = useFieldErrors();
  const [readings, setReadings] = useState<Partial<Record<MeterKind, string>>>({});
  const [charges, setCharges] = useState<ChargeRow[]>([]);
  const meters = (['electric', 'water'] as const).filter((k) => (k === 'electric' ? unit.electricMode : unit.waterMode) === 'submeter');
  const rentValue = (() => { try { return rent.trim() ? parsePesos(rent) : null; } catch { return null; } })();
  const auto = moveInDefaults(moveIn || manilaToday(), rentValue ?? 0, rentDueDay);
  const endDate = own.endDate ?? auto.endDate;
  const dueDay = own.dueDay ?? String(auto.dueDay);
  const advance = own.advance ?? '1';
  const deposit = own.deposit ?? centavosToInput(auto.depositCentavos);
  const depositValue = (() => { try { return deposit.trim() ? parsePesos(deposit) : 0; } catch { return null; } })();
  const dueNumber = Number(dueDay);
  const days = rentValue !== null && moveIn && dueNumber >= 1 && dueNumber <= 31 ? proratedRent(rentValue, moveIn, dueNumber) : null;
  const total = rentValue !== null && depositValue !== null ? rentValue * Number(advance || 0) + depositValue + (days?.amount ?? 0) : null;
  const setTerm = (key: keyof typeof own, id: string) => (value: string) => { setOwn((o) => ({ ...o, [key]: value })); fe.clear(id); };
  const input = (key: Exclude<keyof RenterInput, 'occupants'>, label: string, extra?: { kind?: 'phone-pad' | 'email-address'; hint?: string; required?: boolean; multiline?: boolean }) =>
    <Field key={key} label={label} hint={extra?.hint} required={extra?.required} error={fe.errors[key]}>
      <Input accessibilityLabel={label} keyboardType={extra?.kind ?? 'default'} autoCapitalize={extra?.kind === 'email-address' ? 'none' : 'words'} multiline={extra?.multiline}
        value={person[key]} invalid={!!fe.errors[key]} onChangeText={(v) => { setPerson((p) => ({ ...p, [key]: v })); fe.clear(key); }} />
    </Field>;
  const existingOptions = [...renters.map((r) => [r.id, r.fullName] as const), ...others.map((o) => [`other:${o.renter.id}`, `${o.renter.fullName} · ${o.propertyName}`] as const)];
  const next = () => {
    fe.clear();
    try {
      const copied = other && { fullName: other.fullName, phone: other.phone, facebook: other.facebook, email: other.email, address: other.address,
        emergencyName: other.emergencyName, emergencyPhone: other.emergencyPhone, occupants: other.occupants, notes: '' };
      const renter = copied ? renterSchema.safeParse(copied) : existingId ? null : renterSchema.safeParse(person);
      const failed: [string, string][] = renter && !renter.success ? zodFieldErrors(renter.error, copied ? () => 'existing' : fieldId) : [];
      const money = (id: string, value: string) => { try { return value.trim() ? parsePesos(value) : 0; } catch (e) { failed.push([id, errorMessage(e)]); return 0; } };
      const monthlyRentCentavos = money('rent', rent);
      const depositCentavos = money('deposit', deposit);
      const terms = tenancyTermsSchema.safeParse({ moveIn, startDate: moveIn, endDate, monthlyRentCentavos, dueDay: Number(dueDay), advanceMonths: Number(advance), depositCentavos });
      if (!terms.success) failed.push(...zodFieldErrors(terms.error, fieldId).filter(([id]) => !failed.some(([f]) => f === id)));
      failed.push(...chargeErrors('add', charges));
      const badReading = meters.find((kind) => readings[kind]?.trim() && !(Number.isFinite(Number(readings[kind])) && Number(readings[kind]) >= 0));
      if (badReading) failed.push([`reading-${badReading}`, 'Meter readings must be 0 or more']);
      if (!terms.success || failed.length) { fe.failMany(failed); fe.setFormError('Check the fields marked in red. Some may be inside “More details”.'); return; }
      const { moveIn: date, ...rest } = terms.data;
      onNext({ type: 'moveIn', propertyId: unit.propertyId, unitId: unit.id, renterId: renter ? null : existingId, renter: renter?.success ? renter.data : null,
        moveIn: date, terms: rest, readings: meters.flatMap((kind) => readings[kind]?.trim() ? [{ kind, value: Number(readings[kind]) }] : []), charges: parseCharges(charges) });
    } catch (e) { fe.setFormError(errorMessage(e)); }
  };
  return <>
    <Banner message={fe.formError} />
    <Title size="base">Who is moving in?</Title>
    {existingOptions.length > 0 && <Choice label="New or existing tenant" value={existingId === null ? 'new' : 'existing'}
      onChange={(v) => setExistingId(v === 'new' ? null : existingId ?? existingOptions[0][0])} options={[['new', 'New person'], ['existing', 'Already a tenant']] as const} />}
    {existingId === null ? <>{input('fullName', 'Full name', { required: true })}{input('phone', 'Mobile number', { kind: 'phone-pad', hint: 'optional' })}</>
      : <Field label="Tenant" error={fe.errors.existing}>
        <Choice label="Tenant" value={existingId} onChange={(v) => { setExistingId(v); fe.clear('existing'); }} options={existingOptions} />
        {other && <Text className={`text-xs ${muted}`}>Their contact details are copied. Ask for a new ID photo.</Text>}
      </Field>}
    <Title size="base">Move-in</Title>
    <Field label="Move-in date" required error={fe.errors.moveIn}><DateField label="Move-in date" value={moveIn} onChange={(v) => { setMoveIn(v); fe.clear('moveIn'); }} /></Field>
    {unit.kind !== 'bedspace' && <Field label="People in the room" hint="including the tenant" error={fe.errors.occupants}>
      <Stepper label="People in the room" value={person.occupants} min={1} max={50} onChange={(n) => { setPerson((p) => ({ ...p, occupants: n })); fe.clear('occupants'); }} /></Field>}
    <Field label="Monthly rent" hint={unit.kind === 'bedspace' ? 'per bed' : undefined} required error={fe.errors.rent}>
      <MoneyInput accessibilityLabel="Monthly rent" value={rent} placeholder="0.00" invalid={!!fe.errors.rent} onChangeText={(v) => { setOwnRent(v); fe.clear('rent'); }} />
      {unit.extraPersonRentCentavos > 0 && unit.defaultRentCentavos > 0 && ownRent === null && <Text className={`text-xs ${muted}`}>{people > 1
        ? `${formatPesos(unit.defaultRentCentavos)} + ${formatPesos(unit.extraPersonRentCentavos)} × ${people - 1} extra person${people === 2 ? '' : 's'}`
        : `+${formatPesos(unit.extraPersonRentCentavos)} for each extra person`}</Text>}
    </Field>
    <Field label="Advance months" hint="rent paid ahead, used for the first months" error={fe.errors.advance}>
      <Stepper label="Advance months" value={Number(advance) || 0} min={0} max={12} onChange={(n) => setTerm('advance', 'advance')(String(n))} /></Field>
    <Field label="Deposit" hint="kept until they move out" error={fe.errors.deposit}>
      <MoneyInput accessibilityLabel="Deposit" value={deposit} invalid={!!fe.errors.deposit} onChangeText={setTerm('deposit', 'deposit')} /></Field>
    <MoneyBox title="Collect on move-in" total={total} lines={[
      ...(days && days.amount > 0 ? [[`Rent for ${days.days} day${days.days === 1 ? '' : 's'} before the first due date`, days.amount] as [string, number]] : []),
      ...(rentValue !== null && Number(advance) > 0 ? [[`Advance · ${advance} month${advance === '1' ? '' : 's'}`, rentValue * Number(advance)] as [string, number]] : []),
      ...(depositValue !== null && depositValue > 0 ? [['Deposit', depositValue] as [string, number]] : [])]} />

    <Text className={`font-semibold ${text}`}>More details <Text className={`font-normal ${muted}`}>(optional, filled in for you)</Text></Text>
    <Collapsible title="Due date and lease end" summary={`Due every ${dueNumber >= 1 && dueNumber <= 31 ? (dueNumber === 31 ? 'month end' : ordinal(dueNumber)) : '—'} · ends ${endDate ? day(endDate) : '—'}`}>
      <Field label="Due day" hint="31 = month end" error={fe.errors.due}>
        <Input accessibilityLabel="Due day" keyboardType="number-pad" value={dueDay} invalid={!!fe.errors.due} onChangeText={setTerm('dueDay', 'due')} /></Field>
      <Field label="Lease ends" error={fe.errors.end}><DateField label="Lease ends" value={endDate} min={moveIn} onChange={setTerm('endDate', 'end')} /></Field>
    </Collapsible>
    <Collapsible title={meters.length ? 'Meters and extra charges' : 'Extra charges'} summary={charges.length ? `${charges.length} extra charge${charges.length === 1 ? '' : 's'}` : 'No extra charges'}>
      {meters.map((kind) => <Field key={kind} label={kind === 'electric' ? 'Electricity reading today' : 'Water reading today'} error={fe.errors[`reading-${kind}`]}>
        <Input accessibilityLabel={`${kind} reading today`} keyboardType="decimal-pad" value={readings[kind] ?? ''} onChangeText={(v) => { setReadings((r) => ({ ...r, [kind]: v })); fe.clear(`reading-${kind}`); }} />
      </Field>)}
      <Text className={`font-semibold ${text}`}>Extra monthly charges</Text>
      <ChargesEditor idPrefix="add" value={charges} fe={fe} onChange={setCharges} />
    </Collapsible>
    <Collapsible title="Contact and emergency" summary={existingId !== null ? 'Already on file' : 'Messenger, email, emergency contact'}>
      {existingId !== null ? <Text className={muted}>Their contact details are already on file. Change them from their tenant sheet after moving them in.</Text> : <>
        <Text className={`text-xs italic ${muted}`}>Optional: the tenant fills these in, with their ID, when signing the contract.</Text>
        {input('facebook', 'Facebook / Messenger')}{input('email', 'Email', { kind: 'email-address' })}{input('address', 'Home address')}
        {input('emergencyName', 'Emergency contact name')}{input('emergencyPhone', 'Emergency contact number', { kind: 'phone-pad' })}
        {input('notes', 'Notes', { multiline: true })}
      </>}
    </Collapsible>
    <Row wrap={false}><Btn grow label="Cancel" onPress={onCancel} /><Btn grow variant="primary" label="Next: payment" disabled={busy} onPress={next} /></Row>
  </>;
}
