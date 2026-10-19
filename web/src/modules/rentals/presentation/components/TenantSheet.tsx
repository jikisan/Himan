import { useState } from 'react';
import type { ReactNode } from 'react';
import { format, parseISO } from 'date-fns';
import { ExternalLink, HandCoins, LogOut, MessageCircle, MessageSquare, Phone, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { addPeriods, centavosToInput, contractTermsSchema, depositToReturn, formatBillPesos, formatPesos, manilaToday, nextDueDate, parsePesos, periodOf, tenancyCredit,
  tenancyOwed } from '@himan/shared/rentals';
import type { ContractTermsInput, ReceiptContext, RentalBill, RentalContract, RentalPayment, RentalSettlement, RentalTenancy, Renter, RenterInput } from '@himan/shared/rentals';
import { PaymentsList } from './PaymentsList';
import { ContractPanel } from './ContractPanel';
import type { ContractInfo } from './ContractPanel';
import { DetailsReview, TenantLinkPanel } from './TenantLink';
import { detailsStatus } from '../utils/contract';
import type { RentalsState } from '../pages/RentalsPage';
import { Field, MoneyInput, inputClass } from './Field';
import { Initials } from './Badges';
import { RenterForm } from './RenterForm';
import { RenterFiles } from './RenterFiles';
import { errorMessage } from '../utils/errorMessage';
import { messengerLabel, messengerUrl } from '../utils/messenger';
import { ChargesEditor } from './ChargesEditor';
import { parseCharges, toChargeRows } from '../utils/charges';

const day = (iso: string) => format(parseISO(iso), 'MMM d, yyyy');
const action = 'flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-lg border py-2 text-xs font-semibold transition-colors '
  + 'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** Side-panel body for one tenant: summary up top, details below, delete in the footer. Rendered inside a SheetContent. */
export function TenantSheet({ renter, tenancies, bills = [], payments = [], settlements = [], unitName, canManage, busy, run, fileUrl, paymentProofUrl, onSaveDetails,
  onMoveOut, onRecordPayment, onOpenSettlement, receipt, deleteAction, contractInfo }: {
  renter: Renter; tenancies: RentalTenancy[]; bills?: RentalBill[]; payments?: RentalPayment[]; unitName(id: string): string; canManage: boolean;
  deleteAction?: ReactNode; onSaveDetails(input: RenterInput): Promise<void>; onMoveOut(tenancyId: string): void; onRecordPayment?(tenancyId: string): void;
  receipt?(payment: RentalPayment): ReceiptContext;
  /** Moved-out tenancies: settle the deposit (managers) or view the settlement (everyone). */
  settlements?: RentalSettlement[]; onOpenSettlement?(tenancyId: string): void;
  /** The property's contract texts, template and links; without it the sheet shows the terms only. */
  contractInfo?: ContractInfo;
} & Pick<RentalsState, 'busy' | 'run' | 'fileUrl' | 'paymentProofUrl'>) {
  const [editing, setEditing] = useState<'rent' | 'contact' | null>(null);
  // Pending tenancies (waiting for the contract) show only their contract: no rent, bills, payments or deposit yet.
  const pending = tenancies.filter((t) => t.renterId === renter.id && t.pending && t.moveOut === null);
  const mine = tenancies.filter((t) => t.renterId === renter.id && !t.pending);
  const active = mine.filter((t) => t.moveOut === null);
  const last = [...mine].sort((a, b) => (b.moveOut ?? '').localeCompare(a.moveOut ?? ''))[0];
  const contracts = active.flatMap((t) => t.contracts.filter((c) => c.status === 'active'));
  const rent = contracts.reduce((sum, c) => sum + c.monthlyRentCentavos, 0);
  const nextDue = contracts.map((c) => nextDueDate(c.dueDay, manilaToday())).sort()[0];
  const history = mine.flatMap((t) => [{ key: `${t.id}-in`, text: `Moved into ${unitName(t.unitId)}`, date: t.moveIn },
    ...(t.moveOut ? [{ key: `${t.id}-out`, text: `Moved out of ${unitName(t.unitId)}`, date: t.moveOut }] : [])])
    .sort((a, b) => b.date.localeCompare(a.date));
  const myPayments = payments.filter((p) => mine.some((t) => t.id === p.tenancyId));
  const owed = mine.reduce((sum, t) => sum + tenancyOwed(t.id, bills, payments), 0);
  const credit = mine.reduce((sum, t) => sum + tenancyCredit(t.id, payments, settlements), 0);
  const chat = messengerUrl(renter.facebook);
  const deposits = mine.filter((t) => t.moveOut).map((t) => ({ t, settlement: settlements.find((x) => x.tenancyId === t.id) }))
    .map(({ t, settlement }) => ({ t, settlement, deposit: depositToReturn(t, bills, payments, settlement) }))
    .filter(({ deposit }) => deposit.state !== 'none');
  const links = contractInfo?.links ?? [];
  const linkOf = (t: RentalTenancy) => links.find((l) => l.tenancyId === t.id);
  const living = [...pending, ...active];
  const waiting = living.map((t) => detailsStatus(links, t.id)).find(Boolean) ?? (pending.length ? 'Pending contract' : undefined);
  const contact: [string, string][] = [['Mobile', renter.phone], ['Messenger', renter.facebook], ['Email', renter.email],
    ['Home address', renter.address], ['Emergency', [renter.emergencyName, renter.emergencyPhone].filter(Boolean).join(' · ')],
    ['Living with them', `${renter.occupants} ${renter.occupants === 1 ? 'person' : 'people'}`], ['Notes', renter.notes]];

  return <>
    <SheetHeader className="space-y-4 border-b p-5 pr-12 text-left">
      <div className="flex items-start gap-3">
        <Initials name={renter.fullName} className="size-12 text-base" />
        <div className="min-w-0">
          <SheetTitle className="truncate text-xl">{renter.fullName}</SheetTitle>
          <SheetDescription>
            {pending.length && !active.length ? pending.map((t) => `Pending for ${unitName(t.unitId)} from ${day(t.moveIn)}`).join(' · ')
              : active.length ? active.map((t) => `Lives in ${unitName(t.unitId)} since ${day(t.moveIn)}`).join(' · ')
              : last?.moveOut ? `Moved out of ${unitName(last.unitId)} on ${day(last.moveOut)}` : 'Not renting a room right now'}
          </SheetDescription>
          {waiting && <p className="mt-1.5 w-fit rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">{waiting}</p>}
        </div>
      </div>
      {(renter.phone || chat || (canManage && active.length > 0)) && <div className="flex gap-2">
        {renter.phone && <a href={`tel:${renter.phone}`} className={action}><Phone className="h-4 w-4" />Call</a>}
        {renter.phone && <a href={`sms:${renter.phone}`} className={action}><MessageSquare className="h-4 w-4" />Text</a>}
        {chat && <a href={chat} target="_blank" rel="noopener noreferrer" className={action}><MessageCircle className="h-4 w-4" />Messenger</a>}
        {canManage && active.map((t) => <button key={t.id} type="button" className={action} onClick={() => onMoveOut(t.id)}
          aria-label={`Move ${renter.fullName} out of ${unitName(t.unitId)}`}><LogOut className="h-4 w-4" />Move out</button>)}
      </div>}
    </SheetHeader>

    {/* Every section gets a line above it: same spacing around each line. */}
    <div className="flex-1 divide-y overflow-y-auto px-6 py-5 [scrollbar-width:thin] [&>*]:py-6 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
      {canManage && living.map((t) => {
        const link = linkOf(t);
        return link?.status === 'submitted' && link.submittedDetails
          && <DetailsReview key={`review-${t.id}`} tenancyId={t.id} details={link.submittedDetails} busy={busy} run={run} />;
      })}
      {pending.map((t) => {
        const contract = t.contracts[0];
        const signedByBoth = contractInfo?.texts.some((x) => x.contractId === contract?.id && x.status === 'countersigned');
        return <section key={`pending-${t.id}`} aria-label="Contract" className="space-y-3">
          <h3 className="text-sm font-semibold">Contract{pending.length > 1 && ` · ${unitName(t.unitId)}`}</h3>
          <p className="text-sm text-muted-foreground">Their bed in {unitName(t.unitId)} is held. They become an active tenant once they sign and you countersign. Their move-in bill is made then.</p>
          {canManage && signedByBoth && <Button className="h-11 sm:h-9" disabled={busy} onClick={() => void run({ type: 'activateTenancy', tenancyId: t.id })
            .then(() => toast.success(`${renter.fullName} is now an active tenant`), (e: unknown) => toast.error(errorMessage(e)))}>
            <UserCheck className="h-4 w-4" />Make active tenant</Button>}
          {contract && contractInfo && <ContractPanel contract={contract} renter={renter} info={contractInfo} canManage={canManage} busy={busy} run={run} />}
        </section>;
      })}
      {nextDue && <section aria-labelledby="sheet-rent" className="rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <h3 id="sheet-rent" className="text-sm font-semibold">Rent</h3>
          {canManage && <Button variant="link" className="h-auto p-0" onClick={() => setEditing(editing === 'rent' ? null : 'rent')}>
            {editing === 'rent' ? 'Done' : <>Change<span className="sr-only"> rent</span></>}</Button>}
        </div>
        <p className="mt-1 text-3xl font-bold tabular-nums">{formatPesos(rent)} <span className="text-sm font-normal text-muted-foreground">per month</span></p>
        <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm">Next due <strong>{format(parseISO(nextDue), 'MMM d')}</strong>
          {contracts.length === 1 && ` · every ${contracts[0].dueDay === 31 ? 'month end' : ordinal(contracts[0].dueDay)}`}</p>
        {editing === 'rent' && <div className="mt-4 space-y-3">{active.map((t) => {
          const contract = t.contracts.find((c) => c.status === 'active');
          const billed = (kind: RentalBill['kind']) => bills.some((b) => b.tenancyId === t.id && b.kind === kind && b.status === 'issued');
          return contract && <RentTerms key={contract.id} contract={contract} room={unitName(t.unitId)} showRoom={active.length > 1} busy={busy}
            billed={{ monthly: billed('monthly'), moveIn: billed('move_in') }}
            onSave={async (input, newRent) => {
              if (input) await run({ type: 'updateTerms', contractId: contract.id, input });
              if (newRent) await run({ type: 'changeRent', contractId: contract.id, from: newRent.from, rentCentavos: newRent.rentCentavos });
            }} />;
        })}</div>}
      </section>}

      {mine.length > 0 && <section aria-labelledby="sheet-money" className="space-y-2">
        <h3 id="sheet-money" className="text-sm font-semibold">Money received</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className={owed > 0 ? 'font-semibold' : 'text-muted-foreground'}>{owed > 0 ? `Owes ${formatBillPesos(owed)}` : 'Owes nothing'}</span>
          {credit > 0 && <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            {formatBillPesos(credit)} credit</span>}
        </div>
        {credit > 0 && <p className="text-xs text-muted-foreground">Credit is used on their next SOA automatically, so a new SOA may already be partly paid.</p>}
        {canManage && onRecordPayment && <div className="flex flex-wrap gap-2">{(active.length ? active : [last]).map((t) =>
          <Button key={t.id} variant="outline" className="h-11 sm:h-9" onClick={() => onRecordPayment(t.id)}>
            <HandCoins className="h-4 w-4" />Record payment{active.length > 1 && <span> · {unitName(t.unitId)}</span>}</Button>)}</div>}
        <PaymentsList payments={myPayments} bills={bills} canManage={canManage} busy={busy} run={run} proofUrl={paymentProofUrl}
          empty="No payments recorded yet." receipt={receipt} />
      </section>}

      {onOpenSettlement && deposits.length > 0 && <section aria-labelledby="sheet-deposit" className="space-y-2">
        <h3 id="sheet-deposit" className="text-sm font-semibold">Deposit</h3>
        {deposits.map(({ t, settlement, deposit }) => <div key={t.id} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="min-w-0 flex-1">{mine.length > 1 && `${unitName(t.unitId)} · `}{settlement
            ? settlement.refundCentavos > 0 ? `Settled · ${formatBillPesos(settlement.refundCentavos)} refunded` : `Settled · deposit kept${settlement.owedCentavos > 0 ? ` · still owes ${formatBillPesos(settlement.owedCentavos)}` : ''}`
            : `${formatBillPesos(deposit.depositCentavos)} to return`}</span>
          {settlement ? <Button variant="outline" className="h-11 sm:h-9" onClick={() => onOpenSettlement(t.id)}>View settlement</Button>
            : canManage && <Button className="h-11 sm:h-9" onClick={() => onOpenSettlement(t.id)}>Settle deposit</Button>}
        </div>)}
      </section>}

      {contracts.map((c) => <section key={c.id} aria-label="Contract">
        <h3 className="mb-2 text-sm font-semibold">Contract</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Item label="Started" value={day(c.startDate)} />
          <Item label="Ends" value={day(c.endDate)} />
          <Item label="Deposit" value={formatPesos(c.depositCentavos)} />
          <Item label="Advance" value={`${c.advanceMonths} month${c.advanceMonths === 1 ? '' : 's'}`} />
        </dl>
        {contractInfo && <div className="mt-4"><ContractPanel contract={c} renter={renter} info={contractInfo} canManage={canManage} busy={busy} run={run} /></div>}
      </section>)}

      {canManage && living.map((t) => {
        const link = linkOf(t);
        return link && <TenantLinkPanel key={`link-${t.id}`} link={link} name={renter.fullName} busy={busy} run={run} />;
      })}

      {active.map((t) => <Charges key={t.id} tenancy={t} room={unitName(t.unitId)} showRoom={active.length > 1} canManage={canManage} busy={busy}
        onSave={(charges) => run({ type: 'setCharges', tenancyId: t.id, charges })} />)}

      {canManage && <RenterFiles renter={renter} busy={busy} run={run} fileUrl={fileUrl} />}

      <section aria-labelledby="sheet-contact">
        <div className="mb-2 flex items-center justify-between">
          <h3 id="sheet-contact" className="text-sm font-semibold">Contact</h3>
          {canManage && editing !== 'contact' && <Button variant="link" className="h-auto p-0" onClick={() => setEditing('contact')}>
            Edit<span className="sr-only"> contact</span></Button>}
        </div>
        {editing === 'contact'
          ? <RenterForm renter={renter} readOnly={false} busy={busy} onCancel={() => setEditing(null)}
              onSave={async (input) => { await onSaveDetails(input); setEditing(null); }} />
          : <dl className="divide-y rounded-lg border text-sm">
            {contact.filter(([, value]) => value).map(([label, value]) => <div key={label} className="flex justify-between gap-4 px-3 py-2.5">
              <dt className="shrink-0 text-muted-foreground">{label}</dt><dd className="min-w-0 whitespace-pre-line break-words text-right font-medium">
                {label === 'Messenger' && chat ? <a href={chat} target="_blank" rel="noopener noreferrer"
                  className="inline-flex max-w-full items-center gap-1 rounded text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="truncate">{messengerLabel(value)}</span><ExternalLink aria-hidden className="h-3.5 w-3.5 shrink-0" />
                  <span className="sr-only"> (opens Facebook)</span></a> : value}</dd>
            </div>)}
          </dl>}
      </section>

      {history.length > 0 && <section aria-labelledby="sheet-history">
        <h3 id="sheet-history" className="mb-2 text-sm font-semibold">History</h3>
        <ol className="space-y-2 text-sm">{history.map((h) => <li key={h.key} className="flex items-center gap-3">
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-primary" /><span className="flex-1">{h.text}</span>
          <span className="text-muted-foreground">{day(h.date)}</span></li>)}</ol>
      </section>}
    </div>

    {canManage && deleteAction && <div className="border-t px-4 py-3">{deleteAction}</div>}
  </>;
}

const ordinal = (n: number) => {
  const tail = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${tail}`;
};

function Item({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-semibold tabular-nums">{value}</dd></div>;
}

function Charges({ tenancy, room, showRoom, canManage, busy, onSave }: {
  tenancy: RentalTenancy; room: string; showRoom: boolean; canManage: boolean; busy: boolean;
  onSave(charges: RentalTenancy['charges']): Promise<unknown>;
}) {
  const [rows, setRows] = useState(() => toChargeRows(tenancy.charges));
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  if (!canManage && !tenancy.charges.length) return null;
  return <section aria-label="Extra monthly charges" className="space-y-2">
    <div><h3 className="text-sm font-semibold">Extra monthly charges{showRoom && ` · ${room}`}</h3>
      <p className="text-xs text-muted-foreground">Added to every monthly SOA.</p></div>
    {canManage ? <form noValidate className="space-y-2" onSubmit={async (event) => {
      event.preventDefault();
      try { await onSave(parseCharges(rows)); setMessage({ error: false, text: 'Saved' }); } catch (e) { setMessage({ error: true, text: errorMessage(e) }); }
    }}>
      <fieldset disabled={busy} className="space-y-2">
        <ChargesEditor idPrefix={`charges-${tenancy.id}`} value={rows} onChange={(r) => { setRows(r); setMessage(null); }} />
        <div className="flex justify-end"><Button type="submit" variant="outline" className="h-11 sm:h-9">Save charges</Button></div>
      </fieldset>
      {message && <p role={message.error ? 'alert' : 'status'} className={`text-sm ${message.error ? 'text-destructive' : 'text-muted-foreground'}`}>{message.text}</p>}
    </form>
      : <ul className="divide-y rounded-lg border text-sm">{tenancy.charges.map((c) => <li key={c.label} className="flex justify-between px-3 py-2">
        <span>{c.label}</span><span className="tabular-nums">{formatPesos(c.amount)}</span></li>)}</ul>}
  </section>;
}

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
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const id = `terms-${contract.id}`;
  const lockedHint = billed.moveIn ? 'On the move-in bill' : undefined;
  return <form noValidate className="space-y-3 rounded-lg border p-4" onSubmit={async (event) => {
    event.preventDefault();
    try {
      const result = contractTermsSchema.safeParse({ monthlyRentCentavos: billed.monthly ? contract.monthlyRentCentavos : parsePesos(rent),
        dueDay: Number(dueDay), advanceMonths: Number(advance), depositCentavos: deposit.trim() ? parsePesos(deposit) : 0 });
      if (!result.success) { setMessage({ error: true, text: result.error.issues[0].message }); return; }
      const changed = result.data.monthlyRentCentavos !== contract.monthlyRentCentavos || result.data.dueDay !== contract.dueDay
        || result.data.advanceMonths !== contract.advanceMonths || result.data.depositCentavos !== contract.depositCentavos;
      let renewal = null;
      if (billed.monthly && newRent.trim()) {
        if (!/^\d{4}-\d{2}$/.test(from)) { setMessage({ error: true, text: 'Choose the month the new rent starts' }); return; }
        renewal = { from: `${from}-01`, rentCentavos: parsePesos(newRent) };
        if (!renewal.rentCentavos) { setMessage({ error: true, text: 'Enter the monthly rent' }); return; }
      }
      if (!changed && !renewal) { setMessage({ error: false, text: 'Nothing changed' }); return; }
      await onSave(changed ? result.data : null, renewal);
      setMessage({ error: false, text: renewal ? `New rent starts ${from}` : 'Saved' });
    } catch (failure) { setMessage({ error: true, text: errorMessage(failure) }); }
  }}>
    <div><h3 className="text-sm font-semibold">Rent, advance and deposit{showRoom && ` · ${room}`}</h3>
      <p className="text-xs text-muted-foreground">{billed.monthly ? 'This rent is already on bills. A new rent starts from the month you pick.'
        : 'Fix a typo or record a new agreement.'}</p></div>
    <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
      {billed.monthly ? <>
        <Field id={`${id}-new-rent`} label="New rent" hint={`now ${formatPesos(contract.monthlyRentCentavos)}`}>
          <MoneyInput id={`${id}-new-rent`} value={newRent} placeholder="Leave blank to keep" onChange={(e) => setNewRent(e.target.value)} />
        </Field>
        <Field id={`${id}-from`} label="Starting">
          <input id={`${id}-from`} type="month" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
      </> : <Field id={`${id}-rent`} label="Rent per month"><MoneyInput id={`${id}-rent`} value={rent} onChange={(e) => setRent(e.target.value)} /></Field>}
      <Field id={`${id}-due`} label="Due day">
        <input id={`${id}-due`} type="number" min={1} max={31} className={inputClass} value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
      </Field>
      <Field id={`${id}-advance`} label="Advance months" hint={lockedHint}>
        <input id={`${id}-advance`} type="number" min={0} max={12} className={inputClass} value={advance} readOnly={billed.moveIn}
          onChange={(e) => setAdvance(e.target.value)} />
      </Field>
      <Field id={`${id}-deposit`} label="Deposit" hint={lockedHint}>
        <MoneyInput id={`${id}-deposit`} value={deposit} readOnly={billed.moveIn} onChange={(e) => setDeposit(e.target.value)} />
      </Field>
      <Button type="submit" variant="outline" className="h-11 sm:col-span-2 sm:h-10 sm:w-fit sm:justify-self-end">Save</Button>
    </fieldset>
    {message && <p role={message.error ? 'alert' : 'status'} className={`text-sm ${message.error ? 'text-destructive' : 'text-muted-foreground'}`}>{message.text}</p>}
  </form>;
}
