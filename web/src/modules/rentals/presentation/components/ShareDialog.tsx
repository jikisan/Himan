import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { RentalsState } from '../pages/RentalsPage';
import { inputClass } from './Field';
import { Initials, RoleBadge } from './Badges';
import { errorMessage } from '../utils/errorMessage';

export function ShareDialog({ propertyId, busy, run, listMembers, listFriends }:
  { propertyId: string } & Pick<RentalsState, 'busy' | 'run' | 'listMembers' | 'listFriends'>) {
  const client = useQueryClient();
  const members = useQuery({ queryKey: ['rental-members', propertyId], queryFn: () => listMembers(propertyId), meta: { sensitive: true }, gcTime: 0 });
  const friends = useQuery({ queryKey: ['rental-friends'], queryFn: listFriends, gcTime: 0 });
  const memberIds = new Set(members.data?.map((m) => m.userId));
  const candidates = (friends.data ?? []).filter((f) => !memberIds.has(f.userId));
  const [friendId, setFriendId] = useState('');
  const [role, setRole] = useState<'manager' | 'viewer'>('viewer');
  const refresh = () => client.invalidateQueries({ queryKey: ['rental-members', propertyId] });
  const share = async () => {
    try { await run({ type: 'addMember', propertyId, userId: friendId || candidates[0].userId, role }); toast.success('Shared'); setFriendId(''); }
    catch (e) { toast.error(errorMessage(e)); } finally { void refresh(); }
  };
  return <div className="space-y-4">
    <ul className="divide-y rounded-lg border">{members.isLoading && <li className="p-3 text-sm text-muted-foreground">Loading people…</li>}
      {members.data?.map((m) => <li key={m.userId} className="flex items-center gap-3 p-3">
      <Initials name={m.email} />
      <span className="min-w-0 flex-1 truncate text-sm">{m.email}</span>
      <RoleBadge role={m.role} />
      {m.role !== 'owner' && <Button variant="ghost" size="icon" className="size-11 sm:size-9" aria-label={`Remove ${m.email}`} disabled={busy}
        onClick={() => void run({ type: 'removeMember', propertyId, userId: m.userId })
          .catch((e) => toast.error(errorMessage(e))).finally(() => void refresh())}><Trash2 className="h-4 w-4" /></Button>}
    </li>)}</ul>
    {candidates.length === 0 ? <p className="text-sm text-muted-foreground">{friends.data?.length
      ? 'All your friends already have access.' : 'No friends yet. Add them in the Himan mobile app (Grocery → people icon), then share here.'}</p>
      : <div className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="share-friend">Friend</label>
        <select id="share-friend" className={`${inputClass} min-w-0 flex-1 basis-56`} value={friendId || candidates[0].userId} onChange={(e) => setFriendId(e.target.value)}>
          {candidates.map((f) => <option key={f.userId} value={f.userId}>{f.email}</option>)}</select>
        <label className="sr-only" htmlFor="share-role">Role</label>
        <select id="share-role" className={`${inputClass} w-32`} value={role} onChange={(e) => setRole(e.target.value as 'manager' | 'viewer')}>
          <option value="viewer">Viewer</option><option value="manager">Manager</option></select>
        <Button disabled={busy} onClick={() => void share()}>Share</Button>
      </div>}
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <dt className="font-medium text-foreground">Manager</dt><dd>Adds renters and tenancies, sees renter IDs.</dd>
      <dt className="font-medium text-foreground">Viewer</dt><dd>Read-only. No renter IDs.</dd>
    </dl>
  </div>;
}
