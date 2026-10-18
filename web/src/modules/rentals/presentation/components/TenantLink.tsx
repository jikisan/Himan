import { useEffect, useRef, useState } from 'react';
import { Copy, Link2, Link2Off, RefreshCw, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { LinkDetails, TenancyLink } from '@himan/shared/rentals';
import type { RentalsState } from '../pages/RentalsPage';
import { tenantLinkMessage } from '../utils/contract';
import { errorMessage } from '../utils/errorMessage';
import { inputClass } from './Field';

const copyText = async (text: string) => {
  try { await navigator.clipboard.writeText(text); toast.success('Link copied. Paste it in Messenger.'); } catch (e) { toast.error(errorMessage(e)); }
};
const shareText = async (text: string) => {
  try { await navigator.share({ text }); } catch (e) { if ((e as Error)?.name !== 'AbortError') toast.error(errorMessage(e)); }
};
const canShare = () => typeof navigator.share === 'function';

/** Right after Add tenant: makes the new tenant's details link and shows the message with Copy and Share; a failed link can be retried. */
export function LinkReady({ name, tenancyId, busy, run, onDone }: { name: string; tenancyId: string; onDone(): void } & Pick<RentalsState, 'busy' | 'run'>) {
  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const make = async () => {
    setFailed(false);
    try { setToken(await run({ type: 'createLink', tenancyId, kind: 'new' }) as string); } catch { setFailed(true); }
  };
  const started = useRef(false);
  useEffect(() => { if (!started.current) { started.current = true; void make(); } });
  const message = token ? tenantLinkMessage(token, name, 'new') : '';
  return <div className="space-y-4 pb-6">
    {failed ? <p role="alert" className="text-sm">{name} moved in, but the link wasn’t made. Tap Try again.</p>
      : <p className="text-sm">Send this to {name} so they can fill in their details. Their bed is reserved and the move-in SOA is ready.</p>}
    {token && <textarea readOnly aria-label="Message to send" rows={5} className={`${inputClass} h-auto py-2 text-sm`} value={message}
      onFocus={(e) => e.currentTarget.select()} />}
    <div className="flex flex-wrap justify-end gap-2">
      {failed && <Button variant="outline" className="h-11 sm:h-9" disabled={busy} onClick={() => void make()}>Try again</Button>}
      {token && canShare() && <Button variant="outline" className="h-11 sm:h-9" onClick={() => void shareText(message)}><Share2 className="h-4 w-4" />Share</Button>}
      {token && <Button variant="outline" className="h-11 sm:h-9" onClick={() => void copyText(message)}><Copy className="h-4 w-4" />Copy</Button>}
      <Button className="h-11 sm:h-9" onClick={onDone}>Done</Button>
    </div>
  </div>;
}

/** Managers only: copy, regenerate or turn off the tenant's private link. */
export function TenantLinkPanel({ link, name, busy, run }: { link: TenancyLink; name: string } & Pick<RentalsState, 'busy' | 'run'>) {
  const [confirm, setConfirm] = useState<'new' | 'off' | null>(null);
  const act = async (action: Parameters<RentalsState['run']>[0], done: string) => {
    try { await run(action); toast.success(done); } catch (e) { toast.error(errorMessage(e)); }
  };
  const off = !!link.revokedAt;
  return <section aria-label="Tenant link" className="space-y-2">
    <h3 className="text-sm font-semibold">Tenant link</h3>
    <p className="text-xs text-muted-foreground">{off ? 'The link is off.'
      : link.kind === 'new' ? 'Their private page for sending details and signing the contract.' : 'Their private page for signing the contract and seeing bills.'}</p>
    <div className="flex flex-wrap gap-2">
      {!off && <Button variant="outline" className="h-11 sm:h-9" disabled={busy}
        onClick={() => void copyText(tenantLinkMessage(link.token, name, link.kind))}><Link2 className="h-4 w-4" />Copy link</Button>}
      <Button variant="outline" className="h-11 sm:h-9" disabled={busy} onClick={() => setConfirm('new')}><RefreshCw className="h-4 w-4" />Make a new link</Button>
      {!off && <Button variant="outline" className="h-11 text-destructive hover:text-destructive sm:h-9" disabled={busy} onClick={() => setConfirm('off')}>
        <Link2Off className="h-4 w-4" />Turn off link</Button>}
    </div>
    <ConfirmDialog open={confirm === 'new'} onOpenChange={(open) => !open && setConfirm(null)} title="Make a new link?" confirmText="Make new link"
      description="The old link stops working. Send the new one to your tenant."
      onConfirm={() => void act({ type: 'createLink', tenancyId: link.tenancyId, kind: link.kind }, 'New link made. Copy it and send it.')} />
    <ConfirmDialog open={confirm === 'off'} onOpenChange={(open) => !open && setConfirm(null)} title="Turn off the link?" confirmText="Turn off"
      variant="destructive" description="Your tenant can’t open their page anymore. You can make a new link later."
      onConfirm={() => void act({ type: 'revokeLink', tenancyId: link.tenancyId }, 'Link turned off')} />
  </section>;
}

/** Managers only: what a new tenant sent through the link. Nothing reaches the tenant record until Accept. */
export function DetailsReview({ tenancyId, details, busy, run }: { tenancyId: string; details: LinkDetails } & Pick<RentalsState, 'busy' | 'run'>) {
  const [error, setError] = useState('');
  const ids = details.idPaths.length;
  const rows: [string, string][] = [['Full name', details.fullName], ['Mobile', details.phone], ['Home address', details.address],
    ['Emergency', [details.emergencyName, details.emergencyPhone].filter(Boolean).join(' · ')], ['Messenger', details.facebook],
    ['Email', details.email], ['Living with them', `${details.occupants} ${details.occupants === 1 ? 'person' : 'people'}`],
    ['Valid ID', `${ids} ID photo${ids === 1 ? '' : 's'}`]];
  const act = async (action: Parameters<RentalsState['run']>[0], done: string) => {
    setError('');
    try { await run(action); toast.success(done); } catch (e) { setError(errorMessage(e)); }
  };
  return <section aria-label="Details to review" className="space-y-2">
    <h3 className="text-sm font-semibold">Details to review</h3>
    <p className="text-xs text-muted-foreground">Sent by the tenant. Accept to save them and add the ID photos to their files.</p>
    <dl className="divide-y rounded-lg border text-sm">
      {rows.filter(([, value]) => value).map(([label, value]) => <div key={label} className="flex justify-between gap-4 px-3 py-2.5">
        <dt className="shrink-0 text-muted-foreground">{label}</dt><dd className="min-w-0 break-words text-right font-medium">{value}</dd>
      </div>)}
    </dl>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap justify-end gap-2">
      <Button variant="outline" className="h-11 sm:h-9" disabled={busy}
        onClick={() => void act({ type: 'reopenLink', tenancyId }, 'The link is open again. Ask them to send their details again.')}>Ask again</Button>
      <Button className="h-11 sm:h-9" disabled={busy} onClick={() => void act({ type: 'acceptDetails', tenancyId }, 'Details saved')}>Accept</Button>
    </div>
  </section>;
}

