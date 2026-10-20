import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Image, ScrollView, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import { ABOUT_FIELDS, BLANK, CONTRACT_FIELDS, DEFAULT_CLAUSES, EMERGENCY_FIELDS, OPTIONAL_FIELDS, PRIVACY_CONSENT, SIGN_MODES, canonicalText, clausesSchema,
  contractLines, contractPdfData, contractStatusLabel, contractValues, errorMessage, inPersonDetailsSchema, linkMessage, manilaToday, missingContractDetails,
  previewLessee, propertyInput, renderClauses, resolveLessee, sha256Hex, signModeWords } from '@himan/shared/rentals';
import type { Clause, ContractText, MissingContractDetail, PropertyInput, RentalContract, RentalProperty, Renter, SignMode, SubmittedDetails,
  TenancyLink } from '@himan/shared/rentals';
import type { RentalAction, RentalsState } from '../hooks/useRentals';
import { Banner, Btn, Check, Choice, Facts, Field, Input, Row, Sheet, Title, card, muted, text, useFieldErrors, useRentalToast, zodFieldErrors } from './ui';
import { Paper, contractHtml, sharePdf } from './papers';
import { SignaturePad } from './SignaturePad';
import { pickFiles } from './types';
import type { FileInput } from './types';

/** Where tenant links open: the web app's /r/:token page. */
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? 'https://himan.app').replace(/\/$/, '');
const linkUrl = (token: string) => `${WEB_URL}/r/${token}`;

export interface ContractInfo { property: RentalProperty; texts: ContractText[]; template: Clause[]; links: TenancyLink[] }

function SignModeChoice({ value, onChange, disabled, error }: { value: SignMode | null; onChange(mode: SignMode): void; disabled?: boolean; error?: string }) {
  return <View className="gap-2">
    {SIGN_MODES.map(([mode, label, hint]) => {
      const on = value === mode;
      return <View key={mode} className={`rounded-xl border p-3 ${on ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' : error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}>
        <Check label={label} checked={on} disabled={disabled} onChange={() => onChange(mode)} />
        <Text className={`pl-9 text-xs ${muted}`}>{hint}</Text>
      </View>;
    })}
    {error ? <Text className="text-sm text-red-600 dark:text-red-400">{error}</Text> : null}
  </View>;
}

/** The contract at a glance: where it stands, the one next step and its button, then the smaller actions. */
function StatusCard({ status, next, details = [], warning, done, primary, secondary, notNeeded, children }: {
  status: string; next?: string; details?: string[]; warning?: string; done?: boolean; primary?: ReactNode; secondary?: ReactNode; notNeeded?: ReactNode; children?: ReactNode;
}) {
  return <View className={`${card} gap-3`}>
    <View className="flex-row gap-2.5">
      <Feather name={done ? 'check-circle' : 'circle'} size={20} color={done ? '#059669' : '#d97706'} />
      <View className="flex-1"><Text accessibilityRole="text" className={`font-semibold ${text}`}>{status}</Text>
        {next ? <Text className={text}>{next}</Text> : null}
        {details.map((d) => <Text key={d} className={`text-xs ${muted}`}>{d}</Text>)}</View>
    </View>
    <Banner tone="amber" message={warning} />
    {primary}
    {children}
    {secondary ? <Row>{secondary}</Row> : null}
    {notNeeded ? <View className="border-t border-gray-200 pt-3 dark:border-gray-700">{notNeeded}</View> : null}
  </View>;
}

/** The written contract for one tenancy: create → generate (or sign on this device) → tenant signs → countersign → PDF.
 * `inline`: shown inside the move-in flow, so the new-contract form opens in place. */
export function ContractPanel({ contract, renter, info, canManage, busy, run, inline = false, onNotNeeded }: {
  contract: RentalContract; renter: Renter; info: ContractInfo; canManage: boolean; inline?: boolean; onNotNeeded?(): void;
} & Pick<RentalsState, 'busy' | 'run'>) {
  const toast = useRentalToast();
  const [filled, setFilled] = useState<Partial<PropertyInput>>({});
  const property = { ...info.property, ...filled };
  const text = info.texts.find((t) => t.contractId === contract.id);
  const link = info.links.find((l) => l.tenancyId === contract.tenancyId && !l.revokedAt);
  const [editing, setEditing] = useState(inline);
  const [filling, setFilling] = useState(false);
  const [inPerson, setInPerson] = useState(false);
  const [choosingMode, setChoosingMode] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<string | null | undefined>(undefined);
  const body = () => renderClauses(info.template, contractValues({ property, contract, signingDate: manilaToday() }), { keepLessee: true });
  const fail = (e: unknown) => toast(errorMessage(e), 'error');
  const notNeededButton = canManage && onNotNeeded ? <Btn icon="slash" label="Not needed for this tenant" disabled={busy} onPress={onNotNeeded} /> : null;
  const missing = canManage ? missingContractDetails(info.template, property) : [];
  const send = async (draft: ContractText) => {
    const fresh = body();
    if (fresh.join('\n') !== draft.body.join('\n')) await run({ type: 'updateContractText', id: draft.id, changes: { body: fresh } });
    await run({ type: 'sendContract', id: draft.id });
  };
  const kind = info.links.find((l) => l.tenancyId === contract.tenancyId)?.kind ?? (renter.address.trim() && renter.phone.trim() ? 'existing' : 'new');
  const linkToken = async () => token ?? link?.token ?? await run({ type: 'createLink', tenancyId: contract.tenancyId, kind }) as string;
  const copy = async (asText: boolean) => {
    try {
      const t = await linkToken();
      setToken(t);
      await Clipboard.setStringAsync(asText ? linkMessage(linkUrl(t), renter.fullName, kind) : linkUrl(t));
      toast(asText ? 'Message with the link copied. Paste it in Messenger.' : 'Link copied.');
    } catch (e) { fail(e); }
  };
  const countersign = async (signature?: string) => {
    try { await run(signature ? { type: 'countersign', id: text!.id, signature } : { type: 'countersign', id: text!.id }); toast('Contract signed by both'); setDrawing(undefined); }
    catch (e) { fail(e); }
  };

  if (!text && !canManage) return <Text className={muted}>No written contract yet.</Text>;
  const detailsForm = (editing || filling) && missing.length > 0;
  const modeLocked = !!text && text.status !== 'draft';
  const closeForm = () => { setEditing(false); setFilling(false); };
  const form = detailsForm
    ? <ContractDetailsForm missing={missing} busy={busy} onSave={async (values) => {
      await run({ type: 'saveProperty', id: property.id, input: { ...propertyInput(info.property), ...values } });
      setFilled(values); setFilling(false);
    }} />
    : editing ? <ContractEditor initialTerms={text?.specialTerms ?? ''} initialMode={text?.signMode ?? (modeLocked ? null : 'esign')} modeLocked={modeLocked}
      preview={previewLessee(body(), renter.fullName, renter.address)} busy={busy} submit={text ? 'Save changes' : 'Save draft'}
      note={text?.status === 'sent' ? 'Your tenant’s page will ask them to reload and read the new version.' : undefined}
      onSave={async (specialTerms, signMode) => {
        if (text) await run({ type: 'updateContractText', id: text.id, changes: { body: body(), specialTerms, ...(signMode && { signMode }) } });
        else await run({ type: 'createContractText', contractId: contract.id, propertyId: property.id, body: body(), specialTerms, signMode: signMode ?? 'esign' });
        toast(text ? 'Contract saved' : 'Draft saved. Generate it when you’re ready.');
        setEditing(false);
      }} /> : null;
  if (inline && form) return <View className="gap-4">{detailsForm && <View><Title size="base">Fill these in first</Title>
    <Text className={`text-xs ${muted}`}>They go into every contract for this property, so it has no blank spaces.</Text></View>}{form}</View>;
  const formSheet = !inline && <Sheet open={!!form} onClose={closeForm} closeLabel="Cancel" title={detailsForm ? 'Fill these in first' : text ? 'Edit contract' : 'New contract'}
    subtitle={detailsForm ? 'They go into every contract for this property, so it has no blank spaces.' : `For ${renter.fullName}. Choose how it’s signed, check the wording, then save.`}>
    {form}
  </Sheet>;

  if (!text) return <>
    <StatusCard status="No contract yet" next="Write the contract, then send it to the tenant to sign."
      primary={<Btn variant="primary" icon="file-plus" label="Create contract" onPress={() => setEditing(true)} />} notNeeded={notNeededButton} />
    {formSheet}
  </>;

  const editable = canManage && (text.status === 'draft' || text.status === 'sent');
  const notarize = text.signMode === 'notarize' && !!text.tenantSignedAt;
  const saved = property.role === 'owner' && !!property.lessorSignature;
  const pdfData = contractPdfData(text, property, renter);
  const blanks = text.status === 'sent' && text.body.some((line) => line.includes(BLANK));
  const sharePdfNow = () => void sharePdf(contractHtml(pdfData), `Contract-${renter.fullName}`).catch(() => toast('Couldn’t make the PDF. Try again.', 'error'));
  const sendNow = async () => {
    if (missing.length) return setFilling(true);
    try { await send(text); setToken(await linkToken()); toast('Contract generated. Copy the link and send it to your tenant.'); } catch (e) { fail(e); }
  };
  const signOnDevice = <Btn small icon="smartphone" label="Sign on this phone" disabled={busy} onPress={async () => {
    try {
      if (text.status === 'draft' && missing.length) return setFilling(true);
      if (text.status === 'draft') await send(text);
      setInPerson(true);
    } catch (e) { fail(e); }
  }} />;
  const edit = editable && <Btn small icon="edit-2" label="Edit" disabled={busy} onPress={() => setEditing(true)} />;
  const linkOut = text.status === 'sent' || !!token;
  const uploadScan = async () => {
    const pick = async () => {
      try {
        const [file] = await pickFiles(['application/pdf', 'image/jpeg', 'image/png'], false);
        if (!file) return;
        await run({ type: 'setNotarizedScan', id: text.id, file });
        toast('Notarized copy saved');
      } catch (e) { fail(e); }
    };
    if (text.notarizedScanPath) Alert.alert('Replace the notarized copy?', 'The copy you attached before is replaced by the new file.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Choose new file', onPress: () => void pick() }]);
    else void pick();
  };

  let next: string | undefined;
  let primary: ReactNode = null;
  let secondary: ReactNode = null;
  if (text.status === 'draft' && !text.signMode) {
    next = 'Choose how the contract is signed, then send it.';
    primary = canManage && <Btn variant="primary" icon="edit-3" label="Choose how it’s signed" disabled={busy} onPress={() => setChoosingMode(true)} />;
  } else if (text.status === 'draft' && !linkOut) {
    next = 'Generate the contract to get the tenant’s signing link, or sign it together on this phone.';
    primary = canManage && <Btn variant="primary" icon="file-text" label="Generate contract" busy={busy} onPress={() => void sendNow()} />;
    secondary = canManage && <>{signOnDevice}{edit}</>;
  } else if (linkOut && text.status !== 'signed' && text.status !== 'countersigned') {
    next = 'Send the tenant their link so they can sign.';
    primary = canManage && <Btn variant="primary" icon="copy" label="Copy as text" disabled={busy} onPress={() => void copy(true)} />;
    secondary = canManage && <><Btn small icon="link" label="Copy link" disabled={busy} onPress={() => void copy(false)} />{signOnDevice}{edit}</>;
  } else if (text.status === 'signed') {
    next = 'The tenant signed. Add your signature to finish.';
    primary = canManage && <Btn variant="primary" icon="edit-3" label="Countersign" disabled={busy} onPress={() => (saved ? void countersign() : setDrawing(null))} />;
  } else if (notarize && !text.notarizedScanPath) {
    next = 'Print it, sign it in front of a notary, then upload the notarized copy.';
  }
  const scanButton = notarize && canManage && <Btn variant={text.notarizedScanPath ? 'outline' : 'primary'} small={!!text.notarizedScanPath} icon="upload"
    label={text.notarizedScanPath ? 'Replace notarized copy' : 'Upload notarized copy'} disabled={busy} onPress={() => void uploadScan()} />;

  return <>
    <StatusCard done={text.status === 'countersigned'} status={contractStatusLabel(text.status, text.signMode)} next={next}
      details={[text.signMode && `Signing: ${signModeWords(text.signMode)}`, text.notarizedScanPath && 'Notarized copy attached'].filter((d): d is string => !!d)}
      warning={blanks && canManage ? 'This contract has blank spaces. Press Edit and Save changes to fill them in.' : undefined}
      primary={primary || (notarize && !text.notarizedScanPath ? scanButton : null)}
      secondary={<>{secondary}{notarize && text.notarizedScanPath && scanButton}
        <Btn small icon="file-text" label="View contract" onPress={() => setViewing(true)} />
        <Btn small icon="share" label="Share PDF" onPress={sharePdfNow} /></>}
      notNeeded={text.status === 'draft' ? notNeededButton : null}>
      {notarize && canManage && <Text className={`text-xs ${muted}`}>Notarized copy: PDF, JPEG or PNG, up to 10 MB.</Text>}
    </StatusCard>
    {formSheet}
    <Sheet open={viewing} onClose={() => setViewing(false)} title="Contract of lease" subtitle={contractStatusLabel(text.status, text.signMode)}
      footer={<Btn variant="primary" icon="share" label="Save or share PDF" onPress={sharePdfNow} />}>
      {viewing && <Paper html={contractHtml(pdfData)} />}
    </Sheet>
    <Sheet open={drawing !== undefined} onClose={() => setDrawing(undefined)} closeLabel="Cancel" title="Countersign the contract"
      subtitle={property.role === 'owner' ? 'You haven’t saved a signature yet. Sign in the box to countersign.' : 'Draw your signature in the box to countersign.'}>
      <SignaturePad label="Draw your signature" onChange={setDrawing} disabled={busy} />
      <Btn variant="primary" icon="edit-3" label="Sign and countersign" busy={busy} disabled={!drawing} onPress={() => void countersign(drawing!)} />
    </Sheet>
    {choosingMode && <SignModeSheet busy={busy} onClose={() => setChoosingMode(false)} onSave={async (signMode) => {
      await run({ type: 'updateContractText', id: text.id, changes: { body: body(), signMode } });
      toast('Saved. You can send it now.');
      setChoosingMode(false);
    }} />}
    {inPerson && <InPersonSigning text={text} renter={renter} property={property} busy={busy} run={run} onClose={() => setInPerson(false)} />}
  </>;
}

function ContractEditor({ initialTerms, initialMode, modeLocked, preview, busy, submit, note, onSave }: {
  initialTerms: string; initialMode: SignMode | null; modeLocked: boolean; preview: string[]; busy: boolean; submit: string; note?: string;
  onSave(terms: string, signMode?: SignMode): Promise<void>;
}) {
  const [terms, setTerms] = useState(initialTerms);
  const [mode, setMode] = useState(initialMode);
  const fe = useFieldErrors();
  return <>
    <Banner message={fe.formError} />
    {modeLocked ? mode && <Text className={`text-xs ${muted}`}>Signing: {signModeWords(mode)}</Text>
      : <Field label="How is the contract signed?"><SignModeChoice value={mode} onChange={setMode} disabled={busy} /></Field>}
    <Field label="Contract preview">
      {/* Its own scroll area: the clauses would otherwise spill over the fields below. */}
      <View className="overflow-hidden rounded-xl border border-gray-200 bg-white" style={{ height: 320 }}>
        <ScrollView nestedScrollEnabled contentContainerStyle={{ padding: 16 }}>
          {contractLines(preview, terms).map((line, i) => <Text key={i} className="mb-2 text-sm leading-5 text-gray-900">{line}</Text>)}
        </ScrollView>
      </View>
      <Text className={`text-xs ${muted}`}>Scroll inside the box to read the whole contract.</Text>
    </Field>
    <Field label="Special terms" hint="optional">
      <Input accessibilityLabel="Special terms" multiline maxLength={4000} value={terms} className="min-h-24"
        placeholder="Anything only for this tenant, e.g. “The storage room is not included.”" onChangeText={setTerms} />
      <Text className={`text-xs ${muted}`}>Added as the last clause. Change the other clauses in Edit property → Contract template.</Text>
    </Field>
    {note ? <Text className={`text-xs ${muted}`}>{note}</Text> : null}
    <Btn variant="primary" label={submit} busy={busy} onPress={async () => {
      fe.clear();
      try { await onSave(terms.trim(), modeLocked ? undefined : mode ?? undefined); } catch (e) { fe.setFormError(errorMessage(e)); }
    }} />
  </>;
}

const CIVIL_STATUSES = ['single', 'married', 'widowed', 'separated'] as const;

function ContractDetailsForm({ missing, busy, onSave }: { missing: MissingContractDetail[]; busy: boolean; onSave(values: Partial<PropertyInput>): Promise<void> }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const fe = useFieldErrors();
  return <>
    <Banner message={fe.formError} />
    {missing.map((d) => <Field key={d.field} label={d.label} required error={fe.errors[d.field]}>
      {d.field === 'lessorCivilStatus'
        ? <Choice label={d.label} value={values[d.field] ?? ''} onChange={(v) => { setValues((x) => ({ ...x, [d.field]: v })); fe.clear(d.field); }}
          options={CIVIL_STATUSES.map((s) => [s, s[0].toUpperCase() + s.slice(1)] as const)} />
        : <Input accessibilityLabel={d.label} value={values[d.field] ?? ''} invalid={!!fe.errors[d.field]} editable={!busy}
          onChangeText={(v) => { setValues((x) => ({ ...x, [d.field]: v })); fe.clear(d.field); }} />}
    </Field>)}
    <Btn variant="primary" label="Save and continue" busy={busy} onPress={async () => {
      fe.clear();
      const empty = missing.filter((d) => !values[d.field]?.trim());
      if (empty.length) { fe.failMany(empty.map((d) => [d.field, 'Fill this in'])); return; }
      try { await onSave(Object.fromEntries(missing.map((d) => [d.field, values[d.field].trim()]))); } catch (e) { fe.setFormError(errorMessage(e)); }
    }} />
  </>;
}

function SignModeSheet({ busy, onSave, onClose }: { busy: boolean; onSave(mode: SignMode): Promise<void>; onClose(): void }) {
  const [mode, setMode] = useState<SignMode>('esign');
  const fe = useFieldErrors();
  return <Sheet open onClose={onClose} closeLabel="Cancel" title="How is the contract signed?" subtitle="You can’t change this after sending it.">
    <Banner message={fe.formError} />
    <SignModeChoice value={mode} onChange={setMode} disabled={busy} />
    <Btn variant="primary" label="Save" busy={busy} onPress={async () => { fe.clear(); try { await onSave(mode); } catch (e) { fe.setFormError(errorMessage(e)); } }} />
  </Sheet>;
}

// ---- Signing on the owner's phone

const MAX_IDS = 3;
type Screen = 'intro' | 'details' | 'sign' | 'handback' | 'countersign';
type DetailKey = 'fullName' | 'phone' | 'address' | 'emergencyName' | 'emergencyPhone' | 'facebook' | 'email';

/** "Tenant mode": the tenant fills in their details, reads the contract with their name in it and signs; then the owner countersigns. */
function InPersonSigning({ text: contractText, renter, property, busy, run, onClose }: {
  text: ContractText; renter: Renter; property: RentalProperty; onClose(): void;
} & Pick<RentalsState, 'busy' | 'run'>) {
  const toast = useRentalToast();
  const [screen, setScreen] = useState<Screen>('intro');
  const [values, setValues] = useState({ fullName: renter.fullName, phone: renter.phone, address: renter.address, emergencyName: renter.emergencyName,
    emergencyPhone: renter.emergencyPhone, facebook: renter.facebook, email: renter.email, occupants: String(renter.occupants) });
  const [ids, setIds] = useState<FileInput[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [ownSignature, setOwnSignature] = useState<string | null>(null);
  const fe = useFieldErrors();
  const first = values.fullName.trim().split(/\s+/)[0] || renter.fullName;
  const needsId = renter.files.length === 0;
  const details = inPersonDetailsSchema.safeParse({ ...values, occupants: values.occupants.trim() ? Number(values.occupants) : 1 });
  const body = details.success ? resolveLessee(contractText.body, details.data.fullName, details.data.address) : contractText.body;
  const saved = property.role === 'owner' && !!property.lessorSignature;
  const go = (next: Screen) => { fe.clear(); setScreen(next); };
  const next = () => {
    fe.clear();
    const bad: [string, string][] = details.success ? [] : zodFieldErrors(details.error, ([key]) => String(key));
    if (needsId && !ids.length) bad.push(['ids', 'Add a photo of a valid ID']);
    if (!agreed) bad.push(['agree', 'Tick the box to agree to the details being stored']);
    if (bad.length) { fe.failMany(bad); fe.setFormError('Check the fields marked in red.'); return; }
    go('sign');
  };
  const sign = async () => {
    fe.clear();
    if (!signature) { fe.fail('signature', 'Draw your signature'); return; }
    if (!details.success) return;
    try {
      const contentHash = await sha256Hex(canonicalText(body, contractText.specialTerms));
      const { failed } = await run({ type: 'signInPerson', id: contractText.id, renterId: renter.id, propertyId: property.id, name: details.data.fullName, signature,
        contentHash, details: details.data, ids }) as { failed: string[] };
      if (failed.length) toast(`Signed, but couldn’t attach ${failed.join(', ')}. Add it from their tenant sheet.`, 'warning');
      go('handback');
    } catch (e) { fe.setFormError(errorMessage(e)); }
  };
  const countersign = async (drawn?: string) => {
    fe.clear();
    try { await run(drawn ? { type: 'countersign', id: contractText.id, signature: drawn } : { type: 'countersign', id: contractText.id }); toast('Contract signed by both'); onClose(); }
    catch (e) { fe.setFormError(errorMessage(e)); }
  };
  const addIds = async () => {
    fe.clear('ids');
    try {
      const files = await pickFiles(['image/jpeg', 'image/png', 'application/pdf']);
      const room = MAX_IDS - ids.length;
      if (files.length > room) fe.fail('ids', `Add up to ${MAX_IDS} ID files`);
      setIds((all) => [...all, ...files.slice(0, room)]);
    } catch (e) { fe.fail('ids', errorMessage(e)); }
  };
  const titles: Record<Screen, [string, string]> = {
    intro: [`Hand the phone to ${renter.fullName}`, 'They fill in their details, read the contract and sign it here.'],
    details: ['Your details', 'Your landlord needs these for your rental.'],
    sign: ['Read and sign', 'This is your contract with your name and address filled in.'],
    handback: ['Thank you!', `Please give the phone back to ${property.lessorName || 'your landlord'}.`],
    countersign: ['Your signature', `Countersign ${first}’s contract.`],
  };
  const detail = (key: DetailKey, label: string, type: string, required = true) => <Field key={key} label={label} required={required} error={fe.errors[key]}>
    <Input accessibilityLabel={label} value={values[key]} invalid={!!fe.errors[key]} className="text-lg"
      keyboardType={type === 'tel' ? 'phone-pad' : type === 'email' ? 'email-address' : 'default'} autoCapitalize={type === 'email' ? 'none' : 'words'}
      onChangeText={(v) => { setValues((x) => ({ ...x, [key]: v })); fe.clear(key); }} />
  </Field>;
  // Only Close ends this screen: the phone is in the tenant's hands.
  const close = () => Alert.alert('Stop signing on this phone?', 'Nothing typed here is saved.', [{ text: 'Keep going', style: 'cancel' }, { text: 'Stop', style: 'destructive', onPress: onClose }]);
  return <Sheet open onClose={screen === 'intro' || screen === 'handback' || screen === 'countersign' ? onClose : close} title={titles[screen][0]} subtitle={titles[screen][1]}>
    <Banner message={fe.formError} />
    {screen === 'intro' && <>
      <Banner tone="gray" message={`${contractText.signMode ? `Signing: ${signModeWords(contractText.signMode)}. ` : ''}Your details are saved straight to your record, and the contract shows it was signed in person.`} />
      <Btn variant="primary" label="Start" onPress={() => go('details')} />
    </>}
    {screen === 'details' && <>
      <Title size="base">About you</Title>
      {ABOUT_FIELDS.map(([key, label, , type]) => detail(key, label, type))}
      <Title size="base">Emergency contact</Title>
      {EMERGENCY_FIELDS.map(([key, label, , type]) => detail(key, label, type))}
      <Field label={`Valid ID (photo or PDF, up to ${MAX_IDS})${needsId ? '' : ' (optional)'}`} hint="10 MB each" required={needsId} error={fe.errors.ids}>
        {ids.map((f, i) => <View key={i} className="flex-row items-center gap-2"><Text numberOfLines={1} className={`flex-1 ${text}`}>{f.name}</Text>
          <Btn small variant="ghost" icon="x" label="Remove" a11y={`Remove ${f.name}`} onPress={() => { setIds((all) => all.filter((_, j) => j !== i)); fe.clear('ids'); }} /></View>)}
        {ids.length < MAX_IDS && <Btn icon="camera" label="Add ID photo" onPress={() => void addIds()} />}
      </Field>
      <Title size="base">Optional</Title>
      {OPTIONAL_FIELDS.map(([key, label, , type]) => detail(key, label, type, false))}
      <Field label="People living there" error={fe.errors.occupants}>
        <Input accessibilityLabel="People living there" keyboardType="number-pad" value={values.occupants} onChangeText={(v) => { setValues((x) => ({ ...x, occupants: v })); fe.clear('occupants'); }} />
      </Field>
      <View className={`rounded-xl border p-3 ${fe.errors.agree ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}>
        <Check label={`${PRIVACY_CONSENT} *`} checked={agreed} onChange={(v) => { setAgreed(v); fe.clear('agree'); }} />
      </View>
      {fe.errors.agree ? <Text className="text-sm text-red-600 dark:text-red-400">{fe.errors.agree}</Text> : null}
      <Btn variant="primary" label="Next: read the contract" onPress={next} />
    </>}
    {screen === 'sign' && <>
      <Paper html={contractHtml(contractPdfData({ ...contractText, body }, property, { fullName: values.fullName, address: values.address }))} height={420} />
      {contractText.signMode && <Text className={`text-base ${text}`}>Signing: {signModeWords(contractText.signMode)}</Text>}
      <View className="rounded-xl bg-gray-100 p-3 dark:bg-gray-800"><Text className={`text-base ${text}`}>Signing as <Text className="font-bold">{values.fullName.trim()}</Text></Text>
        <Text className={`text-sm ${muted}`}>Name wrong? Press Back to fix it.</Text></View>
      <Field label="Draw your signature" required error={fe.errors.signature}>
        <SignaturePad label="Your signature" invalid={!!fe.errors.signature} disabled={busy} onChange={(png) => { setSignature(png); fe.clear('signature'); }} />
      </Field>
      <Row wrap={false}><Btn grow label="Back" disabled={busy} onPress={() => go('details')} /><Btn grow variant="primary" label="Sign" busy={busy} onPress={() => void sign()} /></Row>
    </>}
    {screen === 'handback' && <Btn variant="primary" label="I’m the owner: countersign" onPress={() => go('countersign')} />}
    {screen === 'countersign' && <>
      {saved && <Btn variant="primary" label="Sign with my saved signature" busy={busy} onPress={() => void countersign()} />}
      {saved && <Text className={`text-center ${muted}`}>or draw it</Text>}
      <SignaturePad label="Draw your signature" onChange={setOwnSignature} disabled={busy} />
      <Btn variant={saved ? 'outline' : 'primary'} label="Sign and countersign" disabled={busy || !ownSignature} onPress={() => void countersign(ownSignature!)} />
      <Btn variant="ghost" label="Countersign later" onPress={onClose} />
    </>}
  </Sheet>;
}

// ---- Owner settings in Edit property

export function ContractTemplateEditor({ propertyId, template, busy, run }: { propertyId: string; template: Clause[] } & Pick<RentalsState, 'busy' | 'run'>) {
  const toast = useRentalToast();
  const [clauses, setClauses] = useState(template);
  const [inserting, setInserting] = useState<string | null>(null);
  const fe = useFieldErrors();
  const seq = useRef(0);
  const update = (next: Clause[], changed?: string) => { setClauses(next); fe.clear(changed); };
  const move = (i: number, to: number) => { const next = [...clauses]; [next[i], next[to]] = [next[to], next[i]]; update(next); };
  return <View className="gap-3">
    <View><Title size="base">Contract template</Title>
      <Text className={`text-xs ${muted}`}>New contracts start from these clauses. Fields in {'{{ }}'} are filled in for each tenant. Contracts already made don’t change.</Text></View>
    <Banner message={fe.formError} />
    {clauses.map((clause, i) => <View key={clause.id} className={`${card} gap-2`}>
      <Field label={`Clause ${i + 1}`} error={fe.errors[clause.id]}>
        <Input accessibilityLabel={`Clause ${i + 1}`} multiline value={clause.text} maxLength={4000} invalid={!!fe.errors[clause.id]} className="text-sm"
          onChangeText={(v) => update(clauses.map((c, j) => (j === i ? { ...c, text: v } : c)), clause.id)} />
      </Field>
      {inserting === clause.id && <Choice<string> label="Insert field" value="" onChange={(key) => {
        update(clauses.map((c, j) => (j === i ? { ...c, text: `${c.text}{{${key}}}` } : c)), clause.id); setInserting(null);
      }} options={CONTRACT_FIELDS.map((f) => [f.key, f.label] as const)} />}
      <Row>
        <Btn small icon="plus" label={inserting === clause.id ? 'Done' : 'Insert field'} onPress={() => setInserting(inserting === clause.id ? null : clause.id)} />
        <Btn small icon="arrow-up" label="Up" a11y={`Move clause ${i + 1} up`} disabled={i === 0} onPress={() => move(i, i - 1)} />
        <Btn small icon="arrow-down" label="Down" a11y={`Move clause ${i + 1} down`} disabled={i === clauses.length - 1} onPress={() => move(i, i + 1)} />
        <Btn small variant="dangerOutline" icon="trash-2" label="Remove" a11y={`Remove clause ${i + 1}`} onPress={() => update(clauses.filter((_, j) => j !== i))} />
      </Row>
    </View>)}
    <Row>
      <Btn icon="plus" label="Add clause" onPress={() => update([...clauses, { id: `c-${Date.now().toString(36)}${seq.current++}`, text: '' }])} />
      <Btn variant="ghost" label="Reset to default" onPress={() => Alert.alert('Reset to the default contract?',
        'Your changes to the clauses are replaced by the standard contract. Nothing is saved until you tap Save template.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset', onPress: () => update(DEFAULT_CLAUSES) }])} />
    </Row>
    <Btn variant="primary" label="Save template" busy={busy} onPress={async () => {
      fe.clear();
      const result = clausesSchema.safeParse(clauses);
      if (!result.success) {
        const fields = result.error.issues.flatMap((issue): [string, string][] => typeof issue.path[0] === 'number' ? [[clauses[issue.path[0]].id, issue.message]] : []);
        if (fields.length) fe.failMany(fields); else fe.setFormError(result.error.issues[0].message);
        return;
      }
      try { await run({ type: 'saveTemplate', propertyId, clauses: result.data }); toast('Contract template saved'); } catch (e) { fe.setFormError(errorMessage(e)); }
    }} />
  </View>;
}

export function LessorSignatureEditor({ property, busy, run }: { property: RentalProperty } & Pick<RentalsState, 'busy' | 'run'>) {
  const toast = useRentalToast();
  const [drawing, setDrawing] = useState(!property.lessorSignature);
  const [png, setPng] = useState<string | null>(null);
  const fe = useFieldErrors();
  return <View className="gap-3">
    <View><Title size="base">My signature</Title><Text className={`text-xs ${muted}`}>Draw it once. It signs your side of contracts when you tap Countersign.</Text></View>
    <Banner message={fe.formError} />
    {drawing ? <>
      <SignaturePad label="Draw your signature" onChange={setPng} disabled={busy} />
      <Row>
        {property.lessorSignature && <Btn label="Cancel" onPress={() => setDrawing(false)} />}
        <Btn variant="primary" label="Save signature" busy={busy} disabled={!png} onPress={async () => {
          fe.clear();
          try { await run({ type: 'saveLessorSignature', propertyId: property.id, png: png! }); toast('Signature saved'); setDrawing(false); } catch (e) { fe.setFormError(errorMessage(e)); }
        }} />
      </Row>
    </> : <View className={`${card} flex-row items-center justify-between gap-3`}>
      <Image source={{ uri: property.lessorSignature! }} accessibilityLabel="Your saved signature" style={{ height: 64, width: 180 }} resizeMode="contain" className="rounded bg-white" />
      <Btn label="Replace" onPress={() => Alert.alert('Replace your signature?', 'Contracts you already signed keep the old one. New countersignatures use the new one once you save it.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Replace signature', onPress: () => { setPng(null); setDrawing(true); } }])} />
    </View>}
  </View>;
}

// ---- Tenant link and submitted details

export function TenantLinkPanel({ link, name, busy, run }: { link: TenancyLink; name: string } & Pick<RentalsState, 'busy' | 'run'>) {
  const toast = useRentalToast();
  const act = async (action: RentalAction, done: string) => { try { await run(action); toast(done); } catch (e) { toast(errorMessage(e), 'error'); } };
  const copyText = async (value: string, done: string) => { try { await Clipboard.setStringAsync(value); toast(done); } catch (e) { toast(errorMessage(e), 'error'); } };
  const off = !!link.revokedAt;
  return <View className="gap-2">
    <Title size="base">Tenant link</Title>
    <Text className={`text-xs ${muted}`}>{off ? 'The link is off.' : link.kind === 'new' ? 'Their private page for sending details and signing the contract.'
      : 'Their private page for signing the contract and seeing bills.'}</Text>
    <Row>
      {!off && <>
        <Btn small icon="copy" label="Copy as text" disabled={busy} onPress={() => void copyText(linkMessage(linkUrl(link.token), name, link.kind), 'Message with the link copied. Paste it in Messenger.')} />
        <Btn small icon="link" label="Copy link" disabled={busy} onPress={() => void copyText(linkUrl(link.token), 'Link copied.')} />
      </>}
      <Btn small icon="refresh-cw" label="Make a new link" disabled={busy} onPress={() => Alert.alert('Make a new link?', 'The old link stops working. Send the new one to your tenant.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Make new link', onPress: () => void act({ type: 'createLink', tenancyId: link.tenancyId, kind: link.kind }, 'New link made. Copy it and send it.') }])} />
      {!off && <Btn small variant="dangerOutline" icon="slash" label="Turn off link" disabled={busy} onPress={() => Alert.alert('Turn off the link?',
        'Your tenant can’t open their page anymore. You can make a new link later.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Turn off', style: 'destructive', onPress: () => void act({ type: 'revokeLink', tenancyId: link.tenancyId }, 'Link turned off') }])} />}
    </Row>
  </View>;
}

export function DetailsReview({ tenancyId, details, busy, run }: { tenancyId: string; details: SubmittedDetails } & Pick<RentalsState, 'busy' | 'run'>) {
  const toast = useRentalToast();
  const fe = useFieldErrors();
  const ids = details.idPaths.length;
  const rows: [string, string][] = [['Full name', details.fullName], ['Mobile', details.phone], ['Home address', details.address],
    ['Emergency', [details.emergencyName, details.emergencyPhone].filter(Boolean).join(' · ')], ['Messenger', details.facebook], ['Email', details.email],
    ['Living with them', details.occupants ? `${details.occupants} ${details.occupants === 1 ? 'person' : 'people'}` : ''], ['Valid ID', `${ids} ID photo${ids === 1 ? '' : 's'}`]];
  const act = async (action: RentalAction, done: string) => { fe.clear(); try { await run(action); toast(done); } catch (e) { fe.setFormError(errorMessage(e)); } };
  return <View className={`${card} gap-3 border-amber-300 dark:border-amber-800`}>
    <Title size="base">Details to review</Title>
    <Text className={`text-xs ${muted}`}>Sent by the tenant. Accept to save them and add the ID photos to their files.</Text>
    <Banner message={fe.formError} />
    <Facts rows={rows.filter(([, v]) => v)} />
    <Row wrap={false}>
      <Btn grow label="Ask again" disabled={busy} onPress={() => void act({ type: 'reopenLink', tenancyId }, 'The link is open again. Ask them to send their details again.')} />
      <Btn grow variant="primary" label="Accept" busy={busy} onPress={() => void act({ type: 'acceptDetails', tenancyId }, 'Details saved')} />
    </Row>
  </View>;
}
