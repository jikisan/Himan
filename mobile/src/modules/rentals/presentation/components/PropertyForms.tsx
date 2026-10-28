import { useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Image, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ACCOUNT_KINDS, LESSOR_CAPACITIES, UNIT_KINDS, UTILITY_MODES, billPrefix, centavosToInput, errorMessage, manilaToday, parsePesos, paymentAccountSchema,
  propertyInput, propertySchema, unitSchema, utilityColumns, utilityErrors, utilityFieldId } from '@himan/shared/rentals';
import type { PaymentAccount, PropertyInput, RentalAction, RentalProperty, RentalUnit, UnitInput, UtilityState } from '@himan/shared/rentals';
import type { RentalsState } from '../hooks/useRentals';
import { Badge, Banner, Btn, Check, Choice, Field, Initials, Input, MoneyInput, Row, Select, Title, card, muted, text, useFieldErrors, useRentalToast,
  zodFieldErrors } from './ui';
import type { FieldErrors } from './ui';
import { pickFiles } from './types';

/** A form section: a heading with its note, then the fields with room between them. */
function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <View className="gap-6">
    <View className="gap-1"><Title size="base">{title}</Title>{description ? <Text className={`text-sm ${muted}`}>{description}</Text> : null}</View>
    {children}
  </View>;
}

// ---- Utilities (room form + setup)

const NAME = { electric: 'Electricity', water: 'Water' } as const;
const RATE = { electric: 'Price per kWh', water: 'Price per m³' } as const;
const MODE_LABEL = { none: 'Not included in rent', submeter: 'By meter reading', fixed: 'Fixed amount monthly', monthly: 'Actual bill amount each month' } as const;

export function UtilityFields({ idPrefix, value, onChange, fe }: { idPrefix: string; value: UtilityState; onChange(next: UtilityState): void; fe: FieldErrors }) {
  return <>{(['electric', 'water'] as const).map((key) => {
    const amountId = `${idPrefix}-${key}-amount`;
    return <View key={key} className="gap-4">
      <Field label={NAME[key]}>
        <Select label={NAME[key]} value={value.modes[key]} options={UTILITY_MODES.map((m) => [m, MODE_LABEL[m]] as const)}
          onChange={(m) => { fe.clear(amountId); onChange({ ...value, modes: { ...value.modes, [key]: m } }); }} />
      </Field>
      {value.modes[key] === 'monthly' ? <Text className={`text-xs ${muted}`}>You type the amount from the {NAME[key].toLowerCase()} bill each month, in Bills.</Text>
        : value.modes[key] !== 'none' && <Field label={value.modes[key] === 'submeter' ? RATE[key] : `${NAME[key]} per month`} required error={fe.errors[amountId]}>
          <MoneyInput accessibilityLabel={value.modes[key] === 'submeter' ? RATE[key] : `${NAME[key]} per month`} value={value.amounts[key]} placeholder="0.00"
            invalid={!!fe.errors[amountId]} onChangeText={(v) => { fe.clear(amountId); onChange({ ...value, amounts: { ...value.amounts, [key]: v } }); }} />
        </Field>}
    </View>;
  })}</>;
}

// ---- Property

const FIELD: Record<string, string> = { lessorCapacity: 'property-capacity', lateFeeCentavos: 'property-late-fee', rentDueDay: 'property-due' };
const fieldOf = (key: PropertyKey) => FIELD[key as string] ?? `property-${String(key)}`;
type TextKey = Exclude<keyof PropertyInput, 'lessorCapacity' | 'lateFeeCentavos' | 'rentDueDay'>;
type NameKey = 'ownerName' | 'lessorName';

export function PropertyForm({ property, myName, busy, onSave, extra }: {
  property: RentalProperty; myName: string; busy: boolean; onSave(value: PropertyInput): Promise<void>; extra?: ReactNode;
}) {
  const [form, setForm] = useState<PropertyInput>(() => propertyInput(property));
  const [mine, setMine] = useState<Record<NameKey, boolean | null>>({ ownerName: null, lessorName: null });
  const [due, setDue] = useState(property.rentDueDay ? String(property.rentDueDay) : '');
  const [fee, setFee] = useState(centavosToInput(property.lateFeeCentavos));
  const [contractOpen, setContractOpen] = useState([property.ownerAddress, property.lessorCivilStatus, property.lessorAddress, property.signingCity].some(Boolean));
  const fe = useFieldErrors();
  const isMine = (key: NameKey) => !!myName && (mine[key] ?? property[key] === myName);
  const input = (key: TextKey, label: string, extraProps?: { hint?: string; placeholder?: string; required?: boolean }) =>
    <Field label={label} hint={extraProps?.hint} required={extraProps?.required} error={fe.errors[`property-${key}`]}>
      <Input accessibilityLabel={label} value={form[key]} placeholder={extraProps?.placeholder} invalid={!!fe.errors[`property-${key}`]} editable={!busy}
        onChangeText={(v) => { setForm((f) => ({ ...f, [key]: v })); fe.clear(`property-${key}`); }} />
    </Field>;
  const name = (key: NameKey, label: string) => <View className="gap-1">
    <Field label={label} error={fe.errors[`property-${key}`]}>
      <Input accessibilityLabel={label} editable={!isMine(key) && !busy} value={isMine(key) ? myName : form[key]}
        onChangeText={(v) => { setForm((f) => ({ ...f, [key]: v })); fe.clear(`property-${key}`); }} />
    </Field>
    <Check label="Use my name" disabled={!myName} checked={isMine(key)} onChange={(checked) => {
      setMine((m) => ({ ...m, [key]: checked }));
      if (!checked && !form[key]) setForm((f) => ({ ...f, [key]: myName }));
    }} />
  </View>;
  const save = async () => {
    fe.clear();
    let lateFeeCentavos;
    try { lateFeeCentavos = fee.trim() ? parsePesos(fee) : 0; } catch (e) { fe.fail('property-late-fee', `Late fee: ${errorMessage(e)}`); return; }
    const value = { ...form, ownerName: isMine('ownerName') ? myName : form.ownerName, lessorName: isMine('lessorName') ? myName : form.lessorName,
      rentDueDay: due.trim() ? Number(due) : null, lateFeeCentavos, invoicePrefix: form.invoicePrefix || billPrefix(form.name) };
    const result = propertySchema.safeParse(value);
    if (!result.success) { fe.failMany(zodFieldErrors(result.error, ([key]) => fieldOf(key))); fe.setFormError('Check the fields marked in red.'); return; }
    try { await onSave(result.data); } catch (e) { fe.setFormError(errorMessage(e)); }
  };
  return <>
    <Banner message={fe.formError} />
    <Section title="Property">{input('name', 'Name', { required: true })}{input('address', 'Address')}</Section>
    <Section title="Bills">
      <Field label="Rent is due every" hint="day of the month · blank = move-in day" error={fe.errors['property-due']}>
        <Input accessibilityLabel="Rent due day" keyboardType="number-pad" value={due} invalid={!!fe.errors['property-due']} onChangeText={(v) => { setDue(v); fe.clear('property-due'); }} />
      </Field>
      {due !== (property.rentDueDay ? String(property.rentDueDay) : '') && <Text className={`text-xs ${muted}`}>New tenants get this date. Change existing tenants on their tenant sheet.</Text>}
      <Field label="Late fee" hint="optional" error={fe.errors['property-late-fee']}>
        <MoneyInput accessibilityLabel="Late fee" value={fee} placeholder="0.00" invalid={!!fe.errors['property-late-fee']} onChangeText={(v) => { setFee(v); fe.clear('property-late-fee'); }} />
      </Field>
      {input('invoicePrefix', 'Bill numbers start with', { hint: `${form.invoicePrefix || 'INV'}-${manilaToday().slice(0, 4)}-0001` })}
    </Section>
    <View className={`${card} gap-4`}>
      <Btn variant="ghost" icon={contractOpen ? 'chevron-down' : 'chevron-right'} label={contractOpen ? 'Hide contract details' : 'Contract details – fill in later'}
        onPress={() => setContractOpen(!contractOpen)} />
      {!contractOpen && <Text className={`text-xs ${muted}`}>Only needed when you print a contract.</Text>}
      {contractOpen && <>
        <Section title="Owner of the house">{name('ownerName', 'Owner name')}{input('ownerAddress', 'Owner address')}</Section>
        <Section title="Who signs the contract" description="Usually the owner, or someone they authorized.">
          {name('lessorName', 'Signer’s name')}
          <Field label="Signs as"><Choice label="Signs as" value={form.lessorCapacity} onChange={(v) => setForm((f) => ({ ...f, lessorCapacity: v }))}
            options={LESSOR_CAPACITIES.map((v) => [v, v === 'owner' ? 'The owner' : 'Authorized representative'] as const)} /></Field>
          {input('lessorCivilStatus', 'Civil status')}
          {input('lessorAddress', 'Signer’s address', { hint: 'blank uses your profile' })}
        </Section>
        <Section title="Printing">{input('signingCity', 'City where contracts are signed')}</Section>
      </>}
    </View>
    {!myName && <Text className={`text-xs ${muted}`}>Add your full name in your profile to fill the owner and signer with one tick.</Text>}
    <Btn variant="primary" label="Save property" busy={busy} onPress={() => void save()} />
    {extra}
  </>;
}

// ---- Room

const KIND = { whole: 'Whole house', room: 'Room', bedspace: 'Shared room' } as const;
const UNIT_FIELD: Record<string, string> = { name: 'unit-name', capacity: 'unit-capacity', defaultRentCentavos: 'unit-rent', extraPersonRentCentavos: 'unit-extra' };
const UNIT_STEPS = ['Room', 'Electricity and water'] as const;

/** The progress bars and step names at the top of a multi-step form. */
function Stepper({ steps, step }: { steps: readonly string[]; step: number }) {
  return <View className="flex-row gap-2">{steps.map((label, i) => <View key={label} className="flex-1 gap-1">
    <View className={`h-1.5 rounded-full ${i <= step ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
    <Text className={`text-xs font-semibold ${i === step ? 'text-indigo-600 dark:text-indigo-400' : muted}`}>{i + 1} · {label}</Text></View>)}</View>;
}

export function UnitForm({ unit, busy, onSave }: { unit?: RentalUnit; busy: boolean; onSave(value: UnitInput): Promise<void> }) {
  const [name, setName] = useState(unit?.name ?? '');
  const [kind, setKind] = useState<UnitInput['kind']>(unit?.kind ?? 'room');
  const [capacity, setCapacity] = useState(String(unit?.capacity ?? 2));
  const [rent, setRent] = useState(centavosToInput(unit?.defaultRentCentavos ?? 0));
  const [extra, setExtra] = useState(centavosToInput(unit?.extraPersonRentCentavos ?? 0));
  const [utilities, setUtilities] = useState<UtilityState>({
    modes: { electric: unit?.electricMode ?? 'none', water: unit?.waterMode ?? 'none' },
    amounts: { electric: centavosToInput(unit?.electricAmountCentavos ?? 0), water: centavosToInput(unit?.waterAmountCentavos ?? 0) },
  });
  const [step, setStep] = useState(0);
  const fe = useFieldErrors();
  /** Step 1 (the room itself): checks only its own fields before moving on to electricity and water. */
  const next = () => {
    fe.clear();
    const bad: [string, string][] = [];
    const pesos = (id: string, value: string) => { if (!value.trim()) return 0; try { return parsePesos(value); } catch (e) { bad.push([id, errorMessage(e)]); return 0; } };
    const defaultRentCentavos = pesos('unit-rent', rent);
    const extraPersonRentCentavos = kind !== 'bedspace' ? pesos('unit-extra', extra) : 0;
    if (!bad.length) {
      const result = unitSchema.safeParse({ name, kind, capacity: kind === 'bedspace' ? Number(capacity) : 1, defaultRentCentavos, extraPersonRentCentavos, ...utilityColumns(utilities) });
      if (!result.success) bad.push(...zodFieldErrors(result.error, ([key]) => UNIT_FIELD[key as string] ?? null));
    }
    if (bad.length) fe.failMany(bad); else setStep(1);
  };
  const save = async () => {
    fe.clear();
    const bad: [string, string][] = [];
    const pesos = (id: string, value: string) => { if (!value.trim()) return 0; try { return parsePesos(value); } catch (e) { bad.push([id, errorMessage(e)]); return 0; } };
    const defaultRentCentavos = pesos('unit-rent', rent);
    const extraPersonRentCentavos = kind !== 'bedspace' ? pesos('unit-extra', extra) : 0;
    bad.push(...utilityErrors('unit', utilities));
    if (bad.length) { fe.failMany(bad); return; }
    const result = unitSchema.safeParse({ name, kind, capacity: kind === 'bedspace' ? Number(capacity) : 1, defaultRentCentavos, extraPersonRentCentavos, ...utilityColumns(utilities) });
    if (!result.success) {
      const fields = zodFieldErrors(result.error, ([key]) => UNIT_FIELD[key as string] ?? utilityFieldId('unit', key));
      if (fields.length) fe.failMany(fields); else fe.setFormError(result.error.issues[0].message);
      return;
    }
    try { await onSave(result.data); } catch (e) { fe.setFormError(errorMessage(e)); }
  };
  return <>
    <Stepper steps={UNIT_STEPS} step={step} />
    <Banner message={fe.formError} />
    {step === 0 && <Section title="Room">
      <Field label="Room name" required error={fe.errors['unit-name']}>
        <Input accessibilityLabel="Room name" value={name} placeholder="Room A" invalid={!!fe.errors['unit-name']} onChangeText={(v) => { setName(v); fe.clear('unit-name'); }} />
      </Field>
      <Field label="Type"><Choice label="Type" value={kind} onChange={setKind} options={UNIT_KINDS.map((k) => [k, KIND[k]] as const)} /></Field>
      {kind === 'bedspace' && <Field label="Beds" required error={fe.errors['unit-capacity']}>
        <Input accessibilityLabel="Beds" keyboardType="number-pad" value={capacity} invalid={!!fe.errors['unit-capacity']} onChangeText={(v) => { setCapacity(v); fe.clear('unit-capacity'); }} />
      </Field>}
      <Field label="Usual rent" hint={kind === 'bedspace' ? 'per bed, per month' : 'per month'} error={fe.errors['unit-rent']}>
        <MoneyInput accessibilityLabel="Usual rent" value={rent} placeholder="Optional" invalid={!!fe.errors['unit-rent']} onChangeText={(v) => { setRent(v); fe.clear('unit-rent'); }} />
      </Field>
      {kind !== 'bedspace' && <Field label="Extra per added person" hint="e.g. 500 if 2 people pay 500 more" error={fe.errors['unit-extra']}>
        <MoneyInput accessibilityLabel="Extra per added person" value={extra} placeholder="Optional" invalid={!!fe.errors['unit-extra']} onChangeText={(v) => { setExtra(v); fe.clear('unit-extra'); }} />
      </Field>}
    </Section>}
    {step === 1 && <Section title="Electricity and water" description="What you charge the tenant on top of rent.">
      <UtilityFields idPrefix="unit" value={utilities} onChange={setUtilities} fe={fe} />
    </Section>}
    <Row wrap={false}>
      {step === 1 && <Btn grow label="Back" onPress={() => { fe.clear(); setStep(0); }} />}
      {step === 0 ? <Btn grow variant="primary" label="Next" onPress={next} /> : <Btn grow variant="primary" label="Save room" busy={busy} onPress={() => void save()} />}
    </Row>
  </>;
}

// ---- Setup wizard

type Setup = Extract<RentalAction, { type: 'setupProperty' }>;
type RoomRow = { key: number; name: string; shared: boolean; beds: string; rent: string; extra: string };
const STEPS = ['Property', 'Rooms', 'Electricity and water'] as const;
const blankProperty: PropertyInput = { name: '', address: '', ownerName: '', ownerAddress: '', lessorName: '', lessorCivilStatus: '', lessorAddress: '',
  lessorCapacity: 'owner', signingCity: '', invoicePrefix: 'INV', lateFeeCentavos: 0, rentDueDay: null };
const letter = (i: number) => (i < 26 ? String.fromCharCode(65 + i) : String(i + 1));

export function SetupWizard({ myName, busy, onFinish, onCancel }: { myName: string; busy: boolean; onFinish(action: Setup): Promise<void>; onCancel(): void }) {
  const [step, setStep] = useState(0);
  const [house, setHouse] = useState({ name: '', address: '', due: '' });
  const [whole, setWhole] = useState(false);
  const [rows, setRows] = useState<RoomRow[]>([{ key: 0, name: 'Room A', shared: false, beds: '2', rent: '', extra: '' }]);
  const [utilities, setUtilities] = useState<UtilityState>({ modes: { electric: 'none', water: 'none' }, amounts: { electric: '', water: '' } });
  const fe = useFieldErrors();
  const edit = (key: number, patch: Partial<RoomRow>, id: string) => { setRows((all) => all.map((r) => (r.key === key ? { ...r, ...patch } : r))); fe.clear(id); };
  const rooms = (bad: [string, string][]): UnitInput[] => {
    const list = whole ? [{ name: 'Whole house', kind: 'whole' as const, capacity: 1, rent: rows[0]?.rent ?? '', extra: rows[0]?.extra ?? '',
      ids: { name: '', rent: 'setup-whole-rent', extra: 'setup-whole-extra', capacity: '' } }]
      : rows.map((r) => ({ name: r.name, kind: r.shared ? 'bedspace' as const : 'room' as const, capacity: r.shared ? Number(r.beds) : 1, rent: r.rent,
        extra: r.shared ? '' : r.extra, ids: { name: `setup-room-${r.key}`, rent: `setup-rent-${r.key}`, extra: `setup-extra-${r.key}`, capacity: `setup-beds-${r.key}` } }));
    const utility = step === 2 ? utilityColumns(utilities) : utilityColumns({ ...utilities, modes: { electric: 'none', water: 'none' } });
    return list.flatMap(({ rent, extra, ids, ...room }) => {
      const pesos = (id: string, value: string) => { if (!value.trim()) return 0; try { return parsePesos(value); } catch (e) { bad.push([id, errorMessage(e)]); return null; } };
      const defaultRentCentavos = pesos(ids.rent, rent);
      const extraPersonRentCentavos = pesos(ids.extra, extra);
      if (defaultRentCentavos === null || extraPersonRentCentavos === null) return [];
      const result = unitSchema.safeParse({ ...room, defaultRentCentavos, extraPersonRentCentavos, ...utility });
      if (result.success) return [result.data];
      const key = String(result.error.issues[0].path[0]) as keyof typeof ids;
      bad.push([ids[key] || ids.name || ids.rent, result.error.issues[0].message]);
      return [];
    });
  };
  const next = async () => {
    fe.clear();
    const bad: [string, string][] = [];
    if (step === 0) {
      if (!house.name.trim()) bad.push(['setup-name', 'Enter a property name']);
      if (house.due.trim() && !(Number.isInteger(Number(house.due)) && Number(house.due) >= 1 && Number(house.due) <= 31)) bad.push(['setup-due', 'Due day is 1–31']);
    }
    if (step === 1) {
      if (!whole && rows.length === 0) { fe.setFormError('Add at least one room'); return; }
      if (!whole) rows.forEach((r, i) => { if (rows.slice(0, i).some((o) => o.name.trim().toLowerCase() === r.name.trim().toLowerCase())) bad.push([`setup-room-${r.key}`, 'Give each room a different name']); });
      rooms(bad);
    }
    if (step === 2) bad.push(...utilityErrors('setup', utilities));
    if (bad.length) { fe.failMany(bad); return; }
    if (step < 2) { setStep(step + 1); return; }
    try {
      const input = propertySchema.parse({ ...blankProperty, name: house.name, address: house.address, ownerName: myName, lessorName: myName,
        invoicePrefix: billPrefix(house.name), rentDueDay: house.due.trim() ? Number(house.due) : null });
      await onFinish({ type: 'setupProperty', input, rooms: rooms([]) });
    } catch (e) { fe.setFormError(errorMessage(e)); }
  };
  return <>
    <Stepper steps={STEPS} step={step} />
    <Banner message={fe.formError} />
    {step === 0 && <Section title="Your property" description="A house, apartment, boarding house or dorm. You can change this later.">
      <Field label="Property name" required error={fe.errors['setup-name']}>
        <Input accessibilityLabel="Property name" autoFocus value={house.name} placeholder="e.g. Lahug Boarding House" invalid={!!fe.errors['setup-name']}
          onChangeText={(v) => { setHouse((h) => ({ ...h, name: v })); fe.clear('setup-name'); }} /></Field>
      <Field label="Address" hint="optional"><Input accessibilityLabel="Address" value={house.address} onChangeText={(v) => setHouse((h) => ({ ...h, address: v }))} /></Field>
      <Field label="Rent is due every" hint="day of the month · optional" error={fe.errors['setup-due']}>
        <Input accessibilityLabel="Rent due day" keyboardType="number-pad" value={house.due} placeholder="e.g. 5 · blank = move-in day" invalid={!!fe.errors['setup-due']}
          onChangeText={(v) => { setHouse((h) => ({ ...h, due: v })); fe.clear('setup-due'); }} /></Field>
    </Section>}
    {step === 1 && <Section title="What do you rent out?" description="One card per room. A shared room has beds rented to different people.">
      <Check label="I rent out the whole house to one household" checked={whole} onChange={setWhole} />
      {whole ? <>
        <Field label="Usual rent for the house" hint="per month" error={fe.errors['setup-whole-rent']}>
          <MoneyInput accessibilityLabel="Usual rent for the house" value={rows[0]?.rent ?? ''} placeholder="Optional"
            onChangeText={(v) => { setRows((all) => all.map((r, i) => (i === 0 ? { ...r, rent: v } : r))); fe.clear('setup-whole-rent'); }} /></Field>
        <Field label="Extra per added person" hint="optional" error={fe.errors['setup-whole-extra']}>
          <MoneyInput accessibilityLabel="Extra per added person" value={rows[0]?.extra ?? ''} placeholder="Optional"
            onChangeText={(v) => { setRows((all) => all.map((r, i) => (i === 0 ? { ...r, extra: v } : r))); fe.clear('setup-whole-extra'); }} /></Field>
      </> : <>
        {rows.map((row) => <View key={row.key} className={`${card} gap-3`}>
          <Field label="Room name" required error={fe.errors[`setup-room-${row.key}`]}>
            <Input accessibilityLabel="Room name" value={row.name} invalid={!!fe.errors[`setup-room-${row.key}`]} onChangeText={(v) => edit(row.key, { name: v }, `setup-room-${row.key}`)} /></Field>
          <Field label="Usual rent" hint={row.shared ? 'per bed' : undefined} error={fe.errors[`setup-rent-${row.key}`]}>
            <MoneyInput accessibilityLabel={`${row.name} rent`} value={row.rent} placeholder="Optional" onChangeText={(v) => edit(row.key, { rent: v }, `setup-rent-${row.key}`)} /></Field>
          <Choice label={`${row.name || 'Room'} type`} value={row.shared ? 'shared' : 'private'} options={[['private', 'Private room'], ['shared', 'Shared room']] as const}
            onChange={(v) => edit(row.key, { shared: v === 'shared' }, `setup-beds-${row.key}`)} />
          {row.shared ? <Field label="Beds" required error={fe.errors[`setup-beds-${row.key}`]}>
            <Input accessibilityLabel="Beds" keyboardType="number-pad" value={row.beds} onChangeText={(v) => edit(row.key, { beds: v }, `setup-beds-${row.key}`)} /></Field>
            : <Field label="Extra per added person" error={fe.errors[`setup-extra-${row.key}`]}>
              <MoneyInput accessibilityLabel="Extra per added person" value={row.extra} placeholder="Optional" onChangeText={(v) => edit(row.key, { extra: v }, `setup-extra-${row.key}`)} /></Field>}
          {rows.length > 1 && <Btn small variant="ghost" icon="x" label="Remove" a11y={`Remove ${row.name || 'room'}`} onPress={() => setRows((all) => all.filter((r) => r.key !== row.key))} />}
        </View>)}
        <Btn icon="plus" label="Add another room" onPress={() => setRows((all) => [...all, { key: Math.max(...all.map((r) => r.key), -1) + 1, name: `Room ${letter(all.length)}`,
          shared: false, beds: '2', rent: '', extra: '' }])} />
        <Text className={`text-sm ${muted}`}>{rows.length} {rows.length === 1 ? 'room' : 'rooms'} · {rows.reduce((sum, r) => sum + (r.shared ? Number(r.beds) || 0 : 1), 0)} beds</Text>
      </>}
    </Section>}
    {step === 2 && <Section title="Electricity and water" description="Set once for every room. You can change a single room later.">
      <UtilityFields idPrefix="setup" value={utilities} onChange={setUtilities} fe={fe} />
    </Section>}
    <Row wrap={false}>
      <Btn grow label={step === 0 ? 'Cancel' : 'Back'} onPress={() => (step === 0 ? onCancel() : (fe.clear(), setStep(step - 1)))} />
      <Btn grow variant="primary" label={step < 2 ? 'Next' : 'Finish setup'} busy={busy} onPress={() => void next()} />
    </Row>
  </>;
}

// ---- Payment accounts

type Kind = PaymentAccount['kind'];
const ACCOUNT: Record<Kind, string> = { gcash: 'GCash', maya: 'Maya', bank: 'Bank', other: 'Other' };
const ACCOUNT_FIELD: Record<string, string> = { kind: 'kind', label: 'label', accountName: 'name', accountNumber: 'number' };
const DEFAULT_LABEL: Record<Kind, string> = { gcash: 'GCash', maya: 'Maya', bank: 'Bank', other: '' };

export function PaymentAccountsEditor({ propertyId, accounts, busy, run, qrUrl }: { propertyId: string; accounts: PaymentAccount[] } & Pick<RentalsState, 'busy' | 'run' | 'qrUrl'>) {
  const [adding, setAdding] = useState(false);
  return <Section title="Payment accounts" description="Where tenants send rent. Shown on every SOA and its Messenger copy.">
    {accounts.map((a) => <AccountRow key={a.id} propertyId={propertyId} account={a} position={a.position} busy={busy} run={run} qrUrl={qrUrl} />)}
    {adding ? <AccountRow propertyId={propertyId} position={accounts.length} busy={busy} run={run} qrUrl={qrUrl} onDone={() => setAdding(false)} />
      : <Btn icon="plus" label="Add payment account" onPress={() => setAdding(true)} />}
  </Section>;
}

function AccountRow({ propertyId, account, position, busy, run, qrUrl, onDone }: { propertyId: string; account?: PaymentAccount; position: number; onDone?(): void }
  & Pick<RentalsState, 'busy' | 'run' | 'qrUrl'>) {
  const toast = useRentalToast();
  const [kind, setKind] = useState<Kind>(account?.kind ?? 'gcash');
  const [label, setLabel] = useState(account?.label ?? DEFAULT_LABEL.gcash);
  const [accountName, setName] = useState(account?.accountName ?? '');
  const [accountNumber, setNumber] = useState(account?.accountNumber ?? '');
  const fe = useFieldErrors();
  const id = (f: string) => `account-${f}`;
  const save = async () => {
    fe.clear();
    const result = paymentAccountSchema.safeParse({ kind, label, accountName, accountNumber, position });
    if (!result.success) { fe.failMany(zodFieldErrors(result.error, ([key]) => id(ACCOUNT_FIELD[key as string] ?? 'label'))); return; }
    try { await run({ type: 'saveAccount', propertyId, id: account?.id ?? null, input: result.data }); toast('Payment account saved'); onDone?.(); }
    catch (e) { fe.setFormError(errorMessage(e)); }
  };
  const uploadQr = async () => {
    if (!account) return;
    try {
      const [file] = await pickFiles(['image/png', 'image/jpeg', 'image/webp'], false);
      if (!file) return;
      await run({ type: 'uploadQr', propertyId, accountId: account.id, file });
      toast('QR code saved');
    } catch (e) { toast(errorMessage(e), 'error'); }
  };
  return <View className={`${card} gap-3`}>
    <Banner message={fe.formError} />
    <Field label="Type"><Choice label="Account type" value={kind} options={ACCOUNT_KINDS.map((k) => [k, ACCOUNT[k]] as const)} onChange={(next) => {
      if (!label.trim() || label === DEFAULT_LABEL[kind]) setLabel(DEFAULT_LABEL[next]);
      setKind(next); fe.clear(id('label'));
    }} /></Field>
    <Field label="Label" hint="e.g. BDO Savings" required error={fe.errors[id('label')]}>
      <Input accessibilityLabel="Label" maxLength={60} value={label} invalid={!!fe.errors[id('label')]} onChangeText={(v) => { setLabel(v); fe.clear(id('label')); }} /></Field>
    <Field label="Account name" error={fe.errors[id('name')]}>
      <Input accessibilityLabel="Account name" maxLength={120} value={accountName} onChangeText={(v) => { setName(v); fe.clear(id('name')); }} /></Field>
    <Field label="Account number" error={fe.errors[id('number')]}>
      <Input accessibilityLabel="Account number" maxLength={60} value={accountNumber} onChangeText={(v) => { setNumber(v); fe.clear(id('number')); }} /></Field>
    {account ? <View className="gap-2">
      {account.qrPath && <Image source={{ uri: qrUrl(account.qrPath) }} accessibilityLabel={`${account.label} QR code`} style={{ width: 96, height: 96 }} resizeMode="contain" />}
      <Btn icon="upload" label={account.qrPath ? 'Change QR' : 'Add QR code'} disabled={busy} onPress={() => void uploadQr()} />
      <Text className={`text-xs ${muted}`}>PNG, JPEG or WebP up to 2 MB. Anyone with the link can see it.</Text>
    </View> : <Text className={`text-xs ${muted}`}>Save first, then you can add a QR code.</Text>}
    <Row>
      {account && <Btn variant="dangerOutline" icon="trash-2" label="Delete" a11y={`Delete ${account.label}`} disabled={busy}
        onPress={() => Alert.alert(`Delete ${account.label}?`, undefined, [{ text: 'Keep', style: 'cancel' }, { text: 'Delete', style: 'destructive',
          onPress: () => void run({ type: 'removeAccount', id: account.id }).then(() => toast('Payment account deleted'), (e) => toast(errorMessage(e), 'error')) }])} />}
      {onDone && <Btn label="Cancel" onPress={onDone} />}
      <Btn variant="primary" label="Save account" busy={busy} onPress={() => void save()} />
    </Row>
  </View>;
}

// ---- Sharing

const ROLE_TONE = { owner: 'primary', manager: 'gray', viewer: 'gray' } as const;
export function RoleBadge({ role }: { role: 'owner' | 'manager' | 'viewer' }) {
  return <Badge tone={ROLE_TONE[role]} label={role[0].toUpperCase() + role.slice(1)} />;
}

export function ShareProperty({ propertyId, busy, run, listMembers, listFriends }: { propertyId: string } & Pick<RentalsState, 'busy' | 'run' | 'listMembers' | 'listFriends'>) {
  const toast = useRentalToast();
  const client = useQueryClient();
  const members = useQuery({ queryKey: ['rental-members', propertyId], queryFn: () => listMembers(propertyId), meta: { sensitive: true }, gcTime: 0 });
  const friends = useQuery({ queryKey: ['rental-friends'], queryFn: listFriends, meta: { sensitive: true }, gcTime: 0 });
  const memberIds = new Set(members.data?.map((m) => m.userId));
  const candidates = (friends.data ?? []).filter((f) => !memberIds.has(f.userId));
  const [friendId, setFriendId] = useState('');
  const [role, setRole] = useState<'manager' | 'viewer'>('viewer');
  const refresh = () => client.invalidateQueries({ queryKey: ['rental-members', propertyId] });
  const chosen = friendId || candidates[0]?.userId || '';
  return <>
    <View className={`${card} gap-3`}>
      {members.isLoading && <Text className={muted}>Loading people…</Text>}
      {members.data?.map((m) => <View key={m.userId} className="flex-row items-center gap-3">
        <Initials name={m.email} /><Text numberOfLines={1} className={`flex-1 ${text}`}>{m.email}</Text><RoleBadge role={m.role} />
        {m.role !== 'owner' && <Btn small variant="dangerOutline" label="Remove" a11y={`Remove ${m.email}`} disabled={busy}
          onPress={() => void run({ type: 'removeMember', propertyId, userId: m.userId }).catch((e) => toast(errorMessage(e), 'error')).finally(() => void refresh())} />}
      </View>)}
    </View>
    {candidates.length === 0 ? <Text className={muted}>{friends.data?.length ? 'All your friends already have access.' : 'No friends yet. Add them in Grocery → people, then share here.'}</Text>
      : <>
        <Field label="Friend"><Choice label="Friend" value={chosen} onChange={setFriendId} options={candidates.map((f) => [f.userId, f.email] as const)} /></Field>
        <Field label="Role"><Choice label="Role" value={role} onChange={setRole} options={[['viewer', 'Viewer'], ['manager', 'Manager']] as const} /></Field>
        <Btn variant="primary" icon="share-2" label="Share" busy={busy} onPress={async () => {
          try { await run({ type: 'addMember', propertyId, userId: chosen, role }); toast('Shared'); setFriendId(''); }
          catch (e) { toast(errorMessage(e), 'error'); } finally { void refresh(); }
        }} />
      </>}
    <Text className={`text-xs ${muted}`}><Text className={`font-semibold ${text}`}>Manager: </Text>adds and moves out tenants, sees their IDs.</Text>
    <Text className={`text-xs ${muted}`}><Text className={`font-semibold ${text}`}>Viewer: </Text>can look only. Can’t see tenant IDs.</Text>
  </>;
}
