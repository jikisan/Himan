import { useState } from 'react';
import { Plus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ACCOUNT_KINDS, paymentAccountSchema } from '@himan/shared/rentals';
import type { PaymentAccount } from '@himan/shared/rentals';
import type { RentalsState } from '../pages/RentalsPage';
import { Field, inputClass } from './Field';
import { errorMessage } from '../utils/errorMessage';

type Kind = PaymentAccount['kind'];
const KIND: Record<Kind, string> = { gcash: 'GCash', maya: 'Maya', bank: 'Bank', other: 'Other' };
const DEFAULT_LABEL: Record<Kind, string> = { gcash: 'GCash', maya: 'Maya', bank: 'Bank', other: '' };

/**
 * Owner-only "Payment accounts" for a property: where tenants send money. Shown on every SOA.
 * Sits inside the property form, so it uses plain buttons and keeps Enter from submitting that form.
 */
export function PaymentAccountsEditor({ propertyId, accounts, busy, run, qrUrl }: {
  propertyId: string; accounts: PaymentAccount[];
} & Pick<RentalsState, 'busy' | 'run' | 'qrUrl'>) {
  const [adding, setAdding] = useState(false);
  return <section aria-labelledby="payment-accounts" className="space-y-3"
    onKeyDown={(e) => { if (e.key === 'Enter' && e.target instanceof HTMLInputElement) e.preventDefault(); }}>
    <div>
      <h3 id="payment-accounts" className="text-sm font-semibold">Payment accounts</h3>
      <p className="text-xs text-muted-foreground">Where tenants send rent. Shown on every SOA and its Messenger copy.</p>
    </div>
    {accounts.map((a) => <AccountRow key={a.id} propertyId={propertyId} account={a} position={a.position} busy={busy} run={run} qrUrl={qrUrl} />)}
    {adding ? <AccountRow propertyId={propertyId} position={accounts.length} busy={busy} run={run} qrUrl={qrUrl} onDone={() => setAdding(false)} />
      : <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Add payment account</Button>}
  </section>;
}

function AccountRow({ propertyId, account, position, busy, run, qrUrl, onDone }: {
  propertyId: string; account?: PaymentAccount; position: number; onDone?(): void;
} & Pick<RentalsState, 'busy' | 'run' | 'qrUrl'>) {
  const [kind, setKind] = useState<Kind>(account?.kind ?? 'gcash');
  const [label, setLabel] = useState(account?.label ?? DEFAULT_LABEL.gcash);
  const [accountName, setName] = useState(account?.accountName ?? '');
  const [accountNumber, setNumber] = useState(account?.accountNumber ?? '');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const id = `account-${account?.id ?? 'new'}`;
  const save = async () => {
    const result = paymentAccountSchema.safeParse({ kind, label, accountName, accountNumber, position });
    if (!result.success) { setError(result.error.issues[0].message); return; }
    setError('');
    try {
      await run({ type: 'saveAccount', propertyId, id: account?.id ?? null, input: result.data });
      toast.success('Payment account saved');
      onDone?.();
    } catch (e) { setError(errorMessage(e)); }
  };
  const uploadQr = async (file: File | undefined) => {
    if (!file || !account) return;
    try {
      await run({ type: 'uploadQr', propertyId, accountId: account.id, file: { name: file.name, mimeType: file.type, bytes: await file.arrayBuffer() } });
      toast.success('QR code saved');
    } catch (e) { toast.error(errorMessage(e)); }
  };
  const remove = () => run({ type: 'removeAccount', id: account!.id })
    .then(() => toast.success('Payment account deleted'), (e) => toast.error(errorMessage(e))).finally(() => setConfirming(false));

  return <div role="group" aria-label={account ? `${account.label} account` : 'New payment account'} className="space-y-3 rounded-lg border p-3">
    <div className="grid gap-3 sm:grid-cols-2">
      <Field id={`${id}-kind`} label="Type">
        <select id={`${id}-kind`} className={inputClass} value={kind} onChange={(e) => {
          const next = e.target.value as Kind;
          if (!label.trim() || label === DEFAULT_LABEL[kind]) setLabel(DEFAULT_LABEL[next]);
          setKind(next);
        }}>{ACCOUNT_KINDS.map((k) => <option key={k} value={k}>{KIND[k]}</option>)}</select>
      </Field>
      <Field id={`${id}-label`} label="Label" hint="e.g. BDO Savings">
        <input id={`${id}-label`} className={inputClass} maxLength={60} value={label} onChange={(e) => setLabel(e.target.value)} />
      </Field>
      <Field id={`${id}-name`} label="Account name">
        <input id={`${id}-name`} className={inputClass} maxLength={120} value={accountName} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field id={`${id}-number`} label="Account number">
        <input id={`${id}-number`} className={inputClass} maxLength={60} value={accountNumber} onChange={(e) => setNumber(e.target.value)} />
      </Field>
    </div>
    {account ? <div className="flex flex-wrap items-center gap-3">
      {account.qrPath && <img src={qrUrl(account.qrPath)} alt={`${account.label} QR code`} className="size-20 rounded-md border object-contain" />}
      <label className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed px-3 text-sm font-medium hover:border-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:disabled]:opacity-60 sm:h-9">
        <Upload aria-hidden className="h-4 w-4" />{account.qrPath ? 'Change QR' : 'Add QR code'}
        <input type="file" className="sr-only" accept="image/png,image/jpeg,image/webp" disabled={busy} aria-label={`Upload QR for ${account.label}`}
          onChange={(e) => { void uploadQr(e.target.files?.[0]); e.target.value = ''; }} />
      </label>
      <span className="text-xs text-muted-foreground">PNG, JPEG or WebP up to 2 MB. Anyone with the link can see it.</span>
    </div> : <p className="text-xs text-muted-foreground">Save first, then you can add a QR code.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap justify-end gap-2">
      {account && (confirming
        ? <>
          <Button type="button" variant="destructive" className="h-11 sm:h-9" disabled={busy} onClick={() => void remove()}>Delete</Button>
          <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={() => setConfirming(false)}>Keep</Button>
        </>
        : <Button type="button" variant="ghost" className="mr-auto h-11 px-2 text-destructive hover:text-destructive sm:h-9" disabled={busy}
            aria-label={`Delete ${account.label}`} onClick={() => setConfirming(true)}><Trash2 className="h-4 w-4" />Delete</Button>)}
      {onDone && <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={onDone}>Cancel</Button>}
      <Button type="button" variant="outline" className="h-11 sm:h-9" disabled={busy} onClick={() => void save()}>Save account</Button>
    </div>
  </div>;
}
