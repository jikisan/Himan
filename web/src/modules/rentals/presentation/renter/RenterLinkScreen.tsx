import { useCallback, useEffect, useState } from 'react';
import type { PublicLink } from '@himan/shared/rentals';
import { Button } from '@/components/ui/button';
import { cn } from '@core/presentation/utils';
import { LinkRepository } from '../../infrastructure';
import { DetailsSection } from './DetailsForm';
import { ContractSection } from './ContractSection';
import { BillsTab } from './BillsTab';

const links = new LinkRepository();

type Load = { state: 'loading' } | { state: 'invalid' } | { state: 'offline' } | { state: 'ready'; data: PublicLink };

/**
 * The tenant's private page at /r/:token, outside every guard and app shell; works signed out or signed in.
 * Talks to the database only through the token-keyed link RPCs. The token is never shown, logged or put in a message.
 */
export function RenterLinkScreen({ token }: { token: string }) {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [tab, setTab] = useState<'contract' | 'bills'>('contract');
  const reload = useCallback(() => links.getPublic(token).then((data) => setLoad({ state: 'ready', data }), (error: unknown) => {
    // The database answers invalid, expired and revoked links with one message; so does this page.
    setLoad({ state: error instanceof Error && /isn.t valid anymore/i.test(error.message) ? 'invalid' : 'offline' });
  }), [token]);
  useEffect(() => { void reload(); }, [reload]);

  if (load.state === 'loading') return <Shell><p role="status" aria-label="Loading" className="py-16 text-center text-muted-foreground">Loading…</p></Shell>;
  if (load.state === 'invalid') return <Shell><Message>This link isn’t valid anymore. Ask your landlord for a new one.</Message></Shell>;
  if (load.state === 'offline') return <Shell><Message>We couldn’t open this page. Check your connection and try again.</Message>
    <Button className="mt-4 h-12 w-full text-base" onClick={() => { setLoad({ state: 'loading' }); void reload(); }}>Try again</Button></Shell>;

  const { data } = load;
  const tabs = [['contract', data.kind === 'new' ? 'Details & contract' : 'Contract'], ['bills', 'Bills']] as const;
  return <Shell>
    <header className="space-y-1">
      <p className="text-sm text-muted-foreground">{data.property.name}{data.roomName && ` · ${data.roomName}`}</p>
      <h1 className="text-2xl font-semibold">Hi, {data.tenantName.split(' ')[0] || 'there'}</h1>
    </header>
    <div role="tablist" aria-label="Sections" className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
      {tabs.map(([key, label]) => <button key={key} type="button" role="tab" id={`tab-${key}`} aria-selected={tab === key}
        aria-controls={`panel-${key}`} onClick={() => setTab(key)}
        className={cn('h-12 rounded-lg text-base font-medium', tab === key ? 'bg-background shadow-sm' : 'text-muted-foreground')}>{label}</button>)}
    </div>
    <section role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="space-y-6">
      {tab === 'contract' ? <>
        {data.kind === 'new' && <DetailsSection token={token} status={data.status} onSent={reload} />}
        <ContractSection token={token} data={data} reload={reload} />
      </> : <BillsTab data={data} />}
    </section>
  </Shell>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-dvh bg-background text-foreground">
    <div className="mx-auto w-full max-w-xl space-y-5 px-4 py-6">{children}</div>
  </main>;
}

function Message({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border bg-card px-4 py-8 text-center text-lg">{children}</p>;
}
