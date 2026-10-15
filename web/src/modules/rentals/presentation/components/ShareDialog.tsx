import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { RentalsState } from '../pages/RentalsPage';
import { inputClass } from './Field';
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
    <ul className="space-y-2">{members.data?.map((m) => <li key={m.userId} className="flex items-center justify-between rounded-lg border p-3">
      <span className="text-sm">{m.email} · <span className="capitalize">{m.role}</span></span>
      {m.role !== 'owner' && <Button variant="ghost" size="icon" aria-label={`Remove ${m.email}`} disabled={busy}
        onClick={() => void run({ type: 'removeMember', propertyId, userId: m.userId })
          .catch((e) => toast.error(errorMessage(e))).finally(() => void refresh())}><Trash2 className="h-4 w-4" /></Button>}
    </li>)}</ul>
    {candidates.length === 0 ? <p className="text-sm text-muted-foreground">Add friends in the Friends page to share this property.</p>
      : <div className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="share-friend">Friend</label>
        <select id="share-friend" className={`${inputClass} flex-1`} value={friendId || candidates[0].userId} onChange={(e) => setFriendId(e.target.value)}>
          {candidates.map((f) => <option key={f.userId} value={f.userId}>{f.email}</option>)}</select>
        <label className="sr-only" htmlFor="share-role">Role</label>
        <select id="share-role" className={`${inputClass} w-36`} value={role} onChange={(e) => setRole(e.target.value as 'manager' | 'viewer')}>
          <option value="viewer">Viewer</option><option value="manager">Manager</option></select>
        <Button disabled={busy} onClick={() => void share()}>Share</Button>
      </div>}
    <p className="text-xs text-muted-foreground">Managers handle renters and tenancies. Viewers can only look. Neither can see renter IDs unless they’re a manager.</p>
  </div>;
}
