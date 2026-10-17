import { useState } from 'react';
import type { ReactNode } from 'react';
import { format, parseISO } from 'date-fns';
import { LogOut, MessageSquare, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { centavosToInput, contractTermsSchema, formatPesos, manilaToday, nextDueDate, parsePesos } from '@himan/shared/rentals';
import type { ContractTermsInput, RentalContract, RentalTenancy, Renter, RenterInput } from '@himan/shared/rentals';
import type { RentalsState } from '../pages/RentalsPage';
import { Field, MoneyInput, inputClass } from './Field';
import { Initials } from './Badges';
import { RenterForm } from './RenterForm';
import { RenterFiles } from './RenterFiles';
import { errorMessage } from '../utils/errorMessage';

const day = (iso: string) => format(parseISO(iso), 'MMM d, yyyy');
const action = 'flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-lg border py-2 text-xs font-semibold transition-colors '
  + 'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** Side-panel body for one tenant: summary up top, details below, delete in the footer. Rendered inside a SheetContent. */
export function TenantSheet({ renter, tenancies, unitName, canManage, busy, run, fileUrl, onSaveDetails, onMoveOut, deleteAction }: {
  renter: Renter; tenancies: RentalTenancy[]; unitName(id: string): string; canManage: boolean; deleteAction?: ReactNode;
  onSaveDetails(input: RenterInput): Promise<void>; onMoveOut(tenancyId: string): void;
} & Pick<RentalsState, 'busy' | 'run' | 'fileUrl'>) {
  const [editing, setEditing] = useState<'rent' | 'contact' | null>(null);
  const mine = tenancies.filter((t) => t.renterId === renter.id);
  const active = mine.filter((t) => t.moveOut === null);
  const last = [...mine].sort((a, b) => (b.moveOut ?? '').localeCompare(a.moveOut ?? ''))[0];
  const contracts = active.flatMap((t) => t.contracts.filter((c) => c.status === 'active'));
  const rent = contracts.reduce((sum, c) => sum + c.monthlyRentCentavos, 0);
  const nextDue = contracts.map((c) => nextDueDate(c.dueDay, manilaToday())).sort()[0];
  const history = mine.flatMap((t) => [{ key: `${t.id}-in`, text: `Moved into ${unitName(t.unitId)}`, date: t.moveIn },
    ...(t.moveOut ? [{ key: `${t.id}-out`, text: `Moved out of ${unitName(t.unitId)}`, date: t.moveOut }] : [])])
    .sort((a, b) => b.date.localeCompare(a.date));
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
            {active.length ? active.map((t) => `Lives in ${unitName(t.unitId)} since ${day(t.moveIn)}`).join(' · ')
              : last?.moveOut ? `Moved out of ${unitName(last.unitId)} on ${day(last.moveOut)}` : 'Not renting a room right now'}
          </SheetDescription>
        </div>
      </div>
      {(renter.phone || (canManage && active.length > 0)) && <div className="flex gap-2">
        {renter.phone && <a href={`tel:${renter.phone}`} className={action}><Phone className="h-4 w-4" />Call</a>}
        {renter.phone && <a href={`sms:${renter.phone}`} className={action}><MessageSquare className="h-4 w-4" />Text</a>}
        {canManage && active.map((t) => <button key={t.id} type="button" className={action} onClick={() => onMoveOut(t.id)}
          aria-label={`Move ${renter.fullName} out of ${unitName(t.unitId)}`}><LogOut className="h-4 w-4" />Move out</button>)}
      </div>}
    </SheetHeader>

    <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5 [scrollbar-width:thin]">
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
          return contract && <RentTerms key={contract.id} contract={contract} room={unitName(t.unitId)} showRoom={active.length > 1} busy={busy}
            onSave={(input) => run({ type: 'updateTerms', contractId: contract.id, input })} />;
        })}</div>}
      </section>}

      {contracts.map((c) => <section key={c.id} aria-label="Contract">
        <h3 className="mb-2 text-sm font-semibold">Contract</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Item label="Started" value={day(c.startDate)} />
          <Item label="Ends" value={day(c.endDate)} />
          <Item label="Deposit" value={formatPesos(c.depositCentavos)} />
          <Item label="Advance" value={`${c.advanceMonths} month${c.advanceMonths === 1 ? '' : 's'}`} />
        </dl>
      </section>)}

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
              <dt className="shrink-0 text-muted-foreground">{label}</dt><dd className="min-w-0 whitespace-pre-line break-words text-right font-medium">{value}</dd>
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

function RentTerms({ contract, room, showRoom, busy, onSave }: {
  contract: RentalContract; room: string; showRoom: boolean; busy: boolean;
  onSave(input: ContractTermsInput): Promise<unknown>;
}) {
  const [rent, setRent] = useState(centavosToInput(contract.monthlyRentCentavos));
  const [dueDay, setDueDay] = useState(String(contract.dueDay));
  const [advance, setAdvance] = useState(String(contract.advanceMonths));
  const [deposit, setDeposit] = useState(centavosToInput(contract.depositCentavos));
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const id = `terms-${contract.id}`;
  return <form noValidate className="space-y-3 rounded-lg border p-4" onSubmit={async (event) => {
    event.preventDefault();
    try {
      const result = contractTermsSchema.safeParse({ monthlyRentCentavos: parsePesos(rent), dueDay: Number(dueDay),
        advanceMonths: Number(advance), depositCentavos: deposit.trim() ? parsePesos(deposit) : 0 });
      if (!result.success) { setMessage({ error: true, text: result.error.issues[0].message }); return; }
      await onSave(result.data);
      setMessage({ error: false, text: 'Saved' });
    } catch (failure) { setMessage({ error: true, text: errorMessage(failure) }); }
  }}>
    <div><h3 className="text-sm font-semibold">Rent, advance and deposit{showRoom && ` · ${room}`}</h3>
      <p className="text-xs text-muted-foreground">Fix a typo or record a new agreement.</p></div>
    <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
      <Field id={`${id}-rent`} label="Rent per month"><MoneyInput id={`${id}-rent`} value={rent} onChange={(e) => setRent(e.target.value)} /></Field>
      <Field id={`${id}-due`} label="Due day">
        <input id={`${id}-due`} type="number" min={1} max={31} className={inputClass} value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
      </Field>
      <Field id={`${id}-advance`} label="Advance months">
        <input id={`${id}-advance`} type="number" min={0} max={12} className={inputClass} value={advance} onChange={(e) => setAdvance(e.target.value)} />
      </Field>
      <Field id={`${id}-deposit`} label="Deposit"><MoneyInput id={`${id}-deposit`} value={deposit} onChange={(e) => setDeposit(e.target.value)} /></Field>
      <Button type="submit" variant="outline" className="h-11 sm:col-span-2 sm:h-10 sm:w-fit sm:justify-self-end">Save rent</Button>
    </fieldset>
    {message && <p role={message.error ? 'alert' : 'status'} className={`text-sm ${message.error ? 'text-destructive' : 'text-muted-foreground'}`}>{message.text}</p>}
  </form>;
}
