---
type: plan
area: friends
status: shipped
created: 2026-08-01
spec: "[[2026-08-01-grocery-friends-design]]"
note: "Verified shipped 2026-08-30 despite unticked checkboxes: migration 20260801000000_create_friendships.sql, packages/shared/src/modules/friends/, mobile/app/(app)/friends.tsx all exist."
---

# Grocery Friends Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mutual (request + accept) friend graph so users pick saved friends when sharing grocery lists and errands, instead of retyping emails every time.

**Architecture:** A new standalone `@himan/shared/friends` module (domain + Supabase repository) backed by one `friendships` table and three SECURITY DEFINER RPCs. Friendship is purely a discovery layer: friend taps call the *existing* `onInvite(email)` / `onAddShopper(email)` share flows, so no existing grocery RLS or membership logic changes. Mobile gets a Friends screen, a `useFriends` hook, and a `FriendPicker` dropped into the two share modals.

**Tech Stack:** Supabase (Postgres + RLS + RPC), TypeScript, `@supabase/supabase-js`, React Native / Expo Router, NativeWind, TanStack React Query, Vitest (shared-domain tests run from `web/`).

## Global Constraints

- Conventional commits (`feat:`, `fix:`, etc.); **no AI attribution** in commit messages.
- Commit descriptions: proper sentences starting with verbs, one per line.
- RLS enabled on every new table; policies scoped via `auth.uid()`.
- Inter-module imports go through each module's `index.ts` — never internal paths.
- Shared package exports raw `.ts` (no build step); consumed via package `exports` subpaths.
- Shared-domain tests run: `cd web && npm run test:run`.
- Mobile type check: `cd mobile && npm run typecheck`.
- Migrations live in `supabase/migrations/` (repo root), timestamped `YYYYMMDDHHMMSS_name.sql`.
- Friendship grants **no** list/errand access; unfriend does **not** revoke existing memberships.

---

### Task 1: Migration — `friendships` table, RLS, RPCs

**Files:**
- Create: `supabase/migrations/20260801000000_create_friendships.sql`

**Interfaces:**
- Consumes: existing `update_updated_at_column()` trigger fn; `auth.users`.
- Produces (called by Task 3):
  - `send_friend_request(lookup_email text) RETURNS text` — returns `'pending'`, or raises `USER_NOT_FOUND` / `CANNOT_FRIEND_SELF` / `ALREADY_FRIENDS` / `REQUEST_ALREADY_PENDING`.
  - `get_friends() RETURNS TABLE (id uuid, requester_id uuid, addressee_id uuid, requester_email text, addressee_email text, status text, created_at timestamptz)` — accepted only.
  - `get_friend_requests() RETURNS TABLE (...same columns...)` — pending only.
  - Table `friendships` for direct `UPDATE status` (accept/decline) and `DELETE` (cancel/unfriend).

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/20260801000000_create_friendships.sql`:

```sql
-- ============================================================
-- Friends: mutual (request + accept) social graph.
-- Discovery layer only — grants no list/errand access.
-- ============================================================

CREATE TABLE IF NOT EXISTS friendships (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'accepted' | 'declined'
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their friendships"
  ON friendships FOR SELECT
  USING (auth.uid() IN (requester_id, addressee_id));

CREATE POLICY "Users can create requests they send"
  ON friendships FOR INSERT
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Addressee can respond to requests"
  ON friendships FOR UPDATE
  USING (addressee_id = auth.uid());

CREATE POLICY "Either party can delete"
  ON friendships FOR DELETE
  USING (auth.uid() IN (requester_id, addressee_id));

CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Send a friend request by email. Dedupes across both directions.
CREATE OR REPLACE FUNCTION send_friend_request(lookup_email text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  target_id uuid;
  existing  friendships%ROWTYPE;
BEGIN
  SELECT id INTO target_id
  FROM auth.users WHERE email = lower(btrim(lookup_email)) LIMIT 1;

  IF target_id IS NULL THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;
  IF target_id = auth.uid() THEN RAISE EXCEPTION 'CANNOT_FRIEND_SELF'; END IF;

  SELECT * INTO existing FROM friendships
  WHERE (requester_id = auth.uid() AND addressee_id = target_id)
     OR (requester_id = target_id AND addressee_id = auth.uid())
  LIMIT 1;

  IF existing.id IS NOT NULL THEN
    IF existing.status = 'accepted' THEN RAISE EXCEPTION 'ALREADY_FRIENDS'; END IF;
    IF existing.status = 'pending'  THEN RAISE EXCEPTION 'REQUEST_ALREADY_PENDING'; END IF;
    -- declined: revive as a fresh pending request from the current user
    UPDATE friendships
      SET requester_id = auth.uid(), addressee_id = target_id,
          status = 'pending', updated_at = NOW()
      WHERE id = existing.id;
    RETURN 'pending';
  END IF;

  INSERT INTO friendships (requester_id, addressee_id, status)
  VALUES (auth.uid(), target_id, 'pending');
  RETURN 'pending';
END;
$$;

GRANT EXECUTE ON FUNCTION send_friend_request(text) TO authenticated;

-- Accepted friendships for the current user, with both emails.
CREATE OR REPLACE FUNCTION get_friends()
RETURNS TABLE (
  id uuid, requester_id uuid, addressee_id uuid,
  requester_email text, addressee_email text, status text, created_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT f.id, f.requester_id, f.addressee_id,
         ru.email::text, au.email::text, f.status, f.created_at
  FROM friendships f
  JOIN auth.users ru ON ru.id = f.requester_id
  JOIN auth.users au ON au.id = f.addressee_id
  WHERE f.status = 'accepted'
    AND auth.uid() IN (f.requester_id, f.addressee_id);
$$;

GRANT EXECUTE ON FUNCTION get_friends() TO authenticated;

-- Pending requests involving the current user (either direction), with both emails.
CREATE OR REPLACE FUNCTION get_friend_requests()
RETURNS TABLE (
  id uuid, requester_id uuid, addressee_id uuid,
  requester_email text, addressee_email text, status text, created_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT f.id, f.requester_id, f.addressee_id,
         ru.email::text, au.email::text, f.status, f.created_at
  FROM friendships f
  JOIN auth.users ru ON ru.id = f.requester_id
  JOIN auth.users au ON au.id = f.addressee_id
  WHERE f.status = 'pending'
    AND auth.uid() IN (f.requester_id, f.addressee_id);
$$;

GRANT EXECUTE ON FUNCTION get_friend_requests() TO authenticated;
```

- [ ] **Step 2: Apply the migration locally**

Run: `supabase db reset` (applies all migrations to the local DB).
Expected: completes without error; `friendships` table created.

If the Supabase CLI/local stack is unavailable in this environment, instead verify by `supabase db lint` or by reviewing that the SQL parses; note it in the commit and flag for the reviewer to apply against the hosted project.

- [ ] **Step 3: Smoke-test the RPCs (SQL)**

Run against the local DB (e.g. `supabase db reset` then psql, or the Studio SQL editor). With two seeded test users A and B, as A:

```sql
-- as A: send to B → 'pending'
SELECT send_friend_request('b@example.com');
-- as A: send again → ERROR REQUEST_ALREADY_PENDING
-- as A: send to self → ERROR CANNOT_FRIEND_SELF
-- as A: send to nobody@x.com → ERROR USER_NOT_FOUND
-- as B: get_friend_requests() returns 1 row (incoming)
-- as B: UPDATE friendships SET status='accepted' WHERE id=...;
-- as A: get_friends() returns 1 row with addressee_email='b@example.com'
```

Expected: each line behaves as annotated.
If local Supabase is unavailable, mark this step for reviewer verification against the hosted project and continue.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260801000000_create_friendships.sql
git commit -m "feat(friends): add friendships table, RLS, and RPCs"
```

---

### Task 2: Friends domain — entity, types, row mapper

**Files:**
- Create: `packages/shared/src/modules/friends/domain/entities/Friend.ts`
- Create: `packages/shared/src/modules/friends/domain/types/index.ts`
- Create: `packages/shared/src/modules/friends/domain/index.ts`
- Test: `web/src/modules/friends/__tests__/Friend.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `FriendType = { id: string; userId: string; email: string; status: 'pending' | 'accepted' | 'declined'; direction: 'incoming' | 'outgoing'; createdAt: Date }`
  - `FriendRowType` — raw RPC row shape.
  - `mapFriendRow(row: FriendRowType, currentUserId: string): FriendType` — pure; computes the friend's identity + direction relative to `currentUserId`.

- [ ] **Step 1: Write the failing test**

Create `web/src/modules/friends/__tests__/Friend.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mapFriendRow } from '@himan/shared/friends';
import type { FriendRowType } from '@himan/shared/friends';

const row: FriendRowType = {
  id: 'f1',
  requester_id: 'A',
  addressee_id: 'B',
  requester_email: 'a@example.com',
  addressee_email: 'b@example.com',
  status: 'pending',
  created_at: '2026-08-01T00:00:00.000Z',
};

describe('mapFriendRow', () => {
  it('marks outgoing and picks the addressee when I am the requester', () => {
    const f = mapFriendRow(row, 'A');
    expect(f.direction).toBe('outgoing');
    expect(f.userId).toBe('B');
    expect(f.email).toBe('b@example.com');
    expect(f.createdAt).toBeInstanceOf(Date);
  });

  it('marks incoming and picks the requester when I am the addressee', () => {
    const f = mapFriendRow(row, 'B');
    expect(f.direction).toBe('incoming');
    expect(f.userId).toBe('A');
    expect(f.email).toBe('a@example.com');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npm run test:run -- src/modules/friends/__tests__/Friend.test.ts`
Expected: FAIL — cannot resolve `@himan/shared/friends`.

- [ ] **Step 3: Write the types**

Create `packages/shared/src/modules/friends/domain/types/index.ts`:

```ts
export type FriendStatus = 'pending' | 'accepted' | 'declined';
export type FriendDirection = 'incoming' | 'outgoing';

export interface FriendRowType {
  id: string;
  requester_id: string;
  addressee_id: string;
  requester_email: string;
  addressee_email: string;
  status: FriendStatus;
  created_at: string;
}

export interface FriendType {
  id: string;
  userId: string;   // the *other* person's auth user id
  email: string;    // the *other* person's email
  status: FriendStatus;
  direction: FriendDirection;
  createdAt: Date;
}
```

- [ ] **Step 4: Write the mapper**

Create `packages/shared/src/modules/friends/domain/entities/Friend.ts`:

```ts
import type { FriendRowType, FriendType } from '../types/index.js';

export function mapFriendRow(row: FriendRowType, currentUserId: string): FriendType {
  const isRequester = row.requester_id === currentUserId;
  return {
    id: row.id,
    userId: isRequester ? row.addressee_id : row.requester_id,
    email: isRequester ? row.addressee_email : row.requester_email,
    status: row.status,
    direction: isRequester ? 'outgoing' : 'incoming',
    createdAt: new Date(row.created_at),
  };
}
```

Create `packages/shared/src/modules/friends/domain/index.ts`:

```ts
export * from './types/index.js';
export * from './entities/Friend.js';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd web && npm run test:run -- src/modules/friends/__tests__/Friend.test.ts`
Expected: PASS (2 tests). Note: the `@himan/shared/friends` subpath export is added in Task 3 Step 1 — if resolution still fails here, add that `package.json` export line now, then re-run.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/modules/friends/domain web/src/modules/friends/__tests__/Friend.test.ts
git commit -m "feat(friends): add domain entity, types, and row mapper"
```

---

### Task 3: FriendRepository + module public API + subpath export

**Files:**
- Create: `packages/shared/src/modules/friends/infrastructure/repositories/FriendRepository.ts`
- Create: `packages/shared/src/modules/friends/infrastructure/index.ts`
- Create: `packages/shared/src/modules/friends/index.ts`
- Modify: `packages/shared/package.json` (add `./friends` export)

**Interfaces:**
- Consumes: `getSupabase()` from `../../../../config/index.js`; `mapFriendRow`, `FriendType`, `FriendRowType` from domain (Task 2); RPCs from Task 1.
- Produces:
  - `class FriendRepository` with:
    - `sendRequest(email: string): Promise<void>`
    - `getFriends(currentUserId: string): Promise<FriendType[]>`
    - `getRequests(currentUserId: string): Promise<FriendType[]>`
    - `accept(friendshipId: string): Promise<void>`
    - `decline(friendshipId: string): Promise<void>`
    - `cancelRequest(friendshipId: string): Promise<void>`
    - `remove(friendshipId: string): Promise<void>`

- [ ] **Step 1: Add the subpath export**

In `packages/shared/package.json`, add to `exports` (after the `./grocery` line):

```json
    "./grocery": "./src/modules/grocery/index.ts",
    "./friends": "./src/modules/friends/index.ts"
```

- [ ] **Step 2: Write the repository**

Create `packages/shared/src/modules/friends/infrastructure/repositories/FriendRepository.ts`:

```ts
import { getSupabase } from '../../../../config/index.js';
import { mapFriendRow } from '../../domain/index.js';
import type { FriendRowType, FriendType } from '../../domain/index.js';

// Maps a raised Postgres exception message to a friendly error.
function friendlyError(message: string): Error {
  const map: Record<string, string> = {
    USER_NOT_FOUND: 'No account found with that email.',
    CANNOT_FRIEND_SELF: "You can't add yourself.",
    ALREADY_FRIENDS: "You're already friends.",
    REQUEST_ALREADY_PENDING: 'A request between you two is already pending.',
  };
  for (const key of Object.keys(map)) {
    if (message.includes(key)) return new Error(map[key]);
  }
  return new Error('Failed to send friend request.');
}

export class FriendRepository {
  async sendRequest(email: string): Promise<void> {
    const { error } = await getSupabase().rpc('send_friend_request', {
      lookup_email: email.trim().toLowerCase(),
    });
    if (error) throw friendlyError(error.message);
  }

  async getFriends(currentUserId: string): Promise<FriendType[]> {
    const { data, error } = await getSupabase().rpc('get_friends');
    if (error) throw new Error(`Failed to fetch friends: ${error.message}`);
    return ((data as FriendRowType[]) || []).map((r) => mapFriendRow(r, currentUserId));
  }

  async getRequests(currentUserId: string): Promise<FriendType[]> {
    const { data, error } = await getSupabase().rpc('get_friend_requests');
    if (error) throw new Error(`Failed to fetch requests: ${error.message}`);
    return ((data as FriendRowType[]) || []).map((r) => mapFriendRow(r, currentUserId));
  }

  async accept(friendshipId: string): Promise<void> {
    const { error } = await getSupabase()
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);
    if (error) throw new Error(`Failed to accept request: ${error.message}`);
  }

  async decline(friendshipId: string): Promise<void> {
    const { error } = await getSupabase()
      .from('friendships')
      .update({ status: 'declined' })
      .eq('id', friendshipId);
    if (error) throw new Error(`Failed to decline request: ${error.message}`);
  }

  async cancelRequest(friendshipId: string): Promise<void> {
    const { error } = await getSupabase()
      .from('friendships')
      .delete()
      .eq('id', friendshipId);
    if (error) throw new Error(`Failed to cancel request: ${error.message}`);
  }

  async remove(friendshipId: string): Promise<void> {
    const { error } = await getSupabase()
      .from('friendships')
      .delete()
      .eq('id', friendshipId);
    if (error) throw new Error(`Failed to remove friend: ${error.message}`);
  }
}
```

Note: `accept`/`decline` update `status`; the addressee-only UPDATE RLS enforces that only the recipient can respond. `cancelRequest` and `remove` both delete (allowed for either party) — kept as distinct method names for caller clarity.

- [ ] **Step 3: Write the module index files**

Create `packages/shared/src/modules/friends/infrastructure/index.ts`:

```ts
export * from './repositories/FriendRepository.js';
```

Create `packages/shared/src/modules/friends/index.ts`:

```ts
export * from './domain/index.js';
export * from './infrastructure/index.js';
```

- [ ] **Step 4: Verify typecheck + tests still pass**

Run: `cd mobile && npm run typecheck`
Expected: PASS (no errors).
Run: `cd web && npm run test:run -- src/modules/friends/__tests__/Friend.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/modules/friends packages/shared/package.json
git commit -m "feat(friends): add FriendRepository and shared module export"
```

---

### Task 4: `useFriends` hook (mobile)

**Files:**
- Create: `mobile/src/modules/grocery/presentation/hooks/useFriends.ts`
- Modify: `mobile/src/modules/grocery/presentation/hooks/queryKeys.ts`
- Modify: `mobile/src/modules/grocery/presentation/hooks/index.ts`

**Interfaces:**
- Consumes: `FriendRepository`, `FriendType` from `@himan/shared/friends`; `useAuth` from `@/modules/auth/presentation/contexts/AuthContext`; `getLogger` from `@himan/shared`.
- Produces: `useFriends()` returning `{ friends, incomingRequests, outgoingRequests, sendRequest, accept, decline, cancelRequest, remove }`.

- [ ] **Step 1: Add query keys**

In `mobile/src/modules/grocery/presentation/hooks/queryKeys.ts`, add to the `groceryKeys` object (match existing style — inspect the file for the exact shape, keys are functions returning arrays):

```ts
  friends: () => ['grocery', 'friends'] as const,
  friendRequests: () => ['grocery', 'friendRequests'] as const,
```

- [ ] **Step 2: Write the hook**

Create `mobile/src/modules/grocery/presentation/hooks/useFriends.ts`:

```ts
import { useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { useAuth } from '@/modules/auth/presentation/contexts/AuthContext';
import { FriendRepository } from '@himan/shared/friends';
import { getLogger } from '@himan/shared';
import { groceryKeys } from './queryKeys';

const logger = getLogger();

export const useFriends = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const repository = useMemo(() => new FriendRepository(), []);
  const userId = user?.id;

  const { data: friends = [] } = useQuery({
    queryKey: groceryKeys.friends(),
    queryFn: () => repository.getFriends(userId!),
    enabled: !!userId,
  });

  const { data: requests = [] } = useQuery({
    queryKey: groceryKeys.friendRequests(),
    queryFn: () => repository.getRequests(userId!),
    enabled: !!userId,
  });

  const incomingRequests = useMemo(
    () => requests.filter((r) => r.direction === 'incoming'),
    [requests]
  );
  const outgoingRequests = useMemo(
    () => requests.filter((r) => r.direction === 'outgoing'),
    [requests]
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: groceryKeys.friends() });
    queryClient.invalidateQueries({ queryKey: groceryKeys.friendRequests() });
  };

  const sendMutation = useMutation({
    mutationFn: (email: string) => repository.sendRequest(email),
    onSuccess: () => { invalidate(); Alert.alert('Success', 'Friend request sent'); },
    onError: (err: Error) => { logger.error('Send friend request failed', err); Alert.alert('Error', err.message); },
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => repository.accept(id),
    onSuccess: invalidate,
    onError: (err) => { logger.error('Accept friend failed', err); Alert.alert('Error', 'Failed to accept request'); },
  });

  const declineMutation = useMutation({
    mutationFn: (id: string) => repository.decline(id),
    onSuccess: invalidate,
    onError: (err) => { logger.error('Decline friend failed', err); Alert.alert('Error', 'Failed to decline request'); },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => repository.cancelRequest(id),
    onSuccess: invalidate,
    onError: (err) => { logger.error('Cancel request failed', err); Alert.alert('Error', 'Failed to cancel request'); },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => repository.remove(id),
    onSuccess: invalidate,
    onError: (err) => { logger.error('Remove friend failed', err); Alert.alert('Error', 'Failed to remove friend'); },
  });

  return {
    friends,
    incomingRequests,
    outgoingRequests,
    sendRequest: useCallback((email: string) => sendMutation.mutateAsync(email), [sendMutation]),
    accept: useCallback((id: string) => acceptMutation.mutateAsync(id), [acceptMutation]),
    decline: useCallback((id: string) => declineMutation.mutateAsync(id), [declineMutation]),
    cancelRequest: useCallback((id: string) => cancelMutation.mutateAsync(id), [cancelMutation]),
    remove: useCallback((id: string) => removeMutation.mutateAsync(id), [removeMutation]),
  };
};
```

- [ ] **Step 3: Export the hook**

In `mobile/src/modules/grocery/presentation/hooks/index.ts`, add (match the existing export style in that file):

```ts
export * from './useFriends';
```

- [ ] **Step 4: Verify typecheck**

Run: `cd mobile && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/modules/grocery/presentation/hooks
git commit -m "feat(friends): add useFriends hook"
```

---

### Task 5: Friends screen + route

**Files:**
- Create: `mobile/app/(app)/friends.tsx`

**Interfaces:**
- Consumes: `useFriends` (Task 4); `useAuth`; NativeWind, Expo Router, `react-native-safe-area-context`, `@expo/vector-icons`.
- Produces: route `/friends` (Expo Router auto-registers the file).

- [ ] **Step 1: Write the screen**

Create `mobile/app/(app)/friends.tsx`. Follow existing screen conventions (SafeAreaView, `useSafeAreaInsets`, NativeWind classes from mobile/CLAUDE.md, back navigation via `router.back()`):

```tsx
import { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFriends } from '@/modules/grocery/presentation/hooks';

export default function FriendsScreen() {
  const {
    friends, incomingRequests, outgoingRequests,
    sendRequest, accept, decline, cancelRequest, remove,
  } = useFriends();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    setSending(true);
    try {
      await sendRequest(trimmed);
      setEmail('');
    } catch {
      // handled by hook
    } finally {
      setSending(false);
    }
  };

  const confirmRemove = (id: string, label: string) =>
    Alert.alert('Remove Friend', `Remove ${label}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => remove(id) },
    ]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-950">
      <View className="flex-row items-center px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <Pressable onPress={() => router.back()} className="pr-3 py-1">
          <Feather name="chevron-left" size={24} color="#6b7280" />
        </Pressable>
        <Text className="text-lg font-semibold text-gray-900 dark:text-white">Friends</Text>
      </View>

      <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
        {/* Add by email */}
        <View className="flex-row gap-2 my-4">
          <TextInput
            placeholder="Add friend by email..."
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            onSubmitEditing={handleSend}
            keyboardType="email-address"
            autoCapitalize="none"
            className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
          />
          <Pressable
            onPress={handleSend}
            disabled={sending || !email.trim()}
            className={`flex-row items-center gap-1 px-4 rounded-lg ${
              sending || !email.trim() ? 'bg-gray-300 dark:bg-gray-700' : 'bg-indigo-600'
            }`}
          >
            <Feather name="user-plus" size={16} color="#ffffff" />
            <Text className="text-white font-medium">Add</Text>
          </Pressable>
        </View>

        {/* Incoming requests */}
        {incomingRequests.length > 0 && (
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Requests</Text>
            {incomingRequests.map((r) => (
              <View key={r.id} className="flex-row items-center justify-between py-2">
                <Text className="text-sm text-gray-900 dark:text-white flex-1" numberOfLines={1}>{r.email}</Text>
                <View className="flex-row gap-2">
                  <Pressable onPress={() => accept(r.id)} className="px-3 py-1.5 bg-indigo-600 rounded-lg">
                    <Text className="text-white text-xs font-medium">Accept</Text>
                  </Pressable>
                  <Pressable onPress={() => decline(r.id)} className="px-3 py-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg">
                    <Text className="text-gray-700 dark:text-gray-300 text-xs font-medium">Decline</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Outgoing requests */}
        {outgoingRequests.length > 0 && (
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sent</Text>
            {outgoingRequests.map((r) => (
              <View key={r.id} className="flex-row items-center justify-between py-2">
                <Text className="text-sm text-gray-900 dark:text-white flex-1" numberOfLines={1}>{r.email}</Text>
                <Pressable onPress={() => cancelRequest(r.id)} className="px-3 py-1.5">
                  <Text className="text-xs text-gray-500">Cancel</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Friends */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            My Friends ({friends.length})
          </Text>
          {friends.length === 0 ? (
            <Text className="text-sm text-gray-400 py-4">No friends yet. Add one by email above.</Text>
          ) : (
            friends.map((f) => (
              <View key={f.id} className="flex-row items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-800">
                <View className="flex-row items-center gap-2 flex-1">
                  <View className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 items-center justify-center">
                    <Feather name="user" size={14} color="#6366f1" />
                  </View>
                  <Text className="text-sm text-gray-900 dark:text-white flex-1" numberOfLines={1}>{f.email}</Text>
                </View>
                <Pressable onPress={() => confirmRemove(f.id, f.email)} className="px-3 py-1">
                  <Text className="text-xs text-red-500">Remove</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `cd mobile && npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Manual verification**

Run: `cd mobile && npx expo start`. Navigate to `/friends` (temporarily via a deep link or a `router.push('/friends')` button, or wait for Task 7's entry point). Confirm: add-by-email sends a request; a second device/account sees it under Requests and can Accept; accepted user appears under My Friends; Remove works.
Expected: all flows work against the hosted Supabase project (migration from Task 1 must be applied there).

- [ ] **Step 4: Commit**

```bash
git add mobile/app/\(app\)/friends.tsx
git commit -m "feat(friends): add friends screen"
```

---

### Task 6: `FriendPicker` + integrate into both share modals

**Files:**
- Create: `mobile/src/modules/grocery/presentation/components/Invitation/FriendPicker.tsx`
- Modify: `mobile/src/modules/grocery/presentation/components/Invitation/ShareListModal.tsx`
- Modify: `mobile/src/modules/grocery/presentation/components/Session/AddShopperModal.tsx`

**Interfaces:**
- Consumes: `useFriends` (Task 4); `FriendType` from `@himan/shared/friends`.
- Produces: `FriendPicker` component — props `{ excludeUserIds?: string[]; onPick: (email: string) => void; disabled?: boolean }`. Renders accepted friends as tappable rows; hides friends already in `excludeUserIds`.

- [ ] **Step 1: Write the FriendPicker**

Create `mobile/src/modules/grocery/presentation/components/Invitation/FriendPicker.tsx`:

```tsx
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFriends } from '@/modules/grocery/presentation/hooks';

interface FriendPickerProps {
  excludeUserIds?: string[];
  onPick: (email: string) => void;
  disabled?: boolean;
}

export const FriendPicker = ({ excludeUserIds = [], onPick, disabled }: FriendPickerProps) => {
  const { friends } = useFriends();
  const available = friends.filter((f) => !excludeUserIds.includes(f.userId));

  if (available.length === 0) return null;

  return (
    <View className="mb-4">
      <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        Friends
      </Text>
      <ScrollView className="max-h-40" keyboardShouldPersistTaps="handled">
        {available.map((f) => (
          <Pressable
            key={f.id}
            onPress={() => !disabled && onPick(f.email)}
            disabled={disabled}
            className="flex-row items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-800"
          >
            <View className="flex-row items-center gap-2 flex-1">
              <View className="h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 items-center justify-center">
                <Feather name="user" size={14} color="#6366f1" />
              </View>
              <Text className="text-sm text-gray-900 dark:text-white flex-1" numberOfLines={1}>{f.email}</Text>
            </View>
            <Feather name="plus-circle" size={18} color="#6366f1" />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};
```

- [ ] **Step 2: Integrate into ShareListModal**

In `mobile/src/modules/grocery/presentation/components/Invitation/ShareListModal.tsx`:

Add the import near the top:

```tsx
import { FriendPicker } from './FriendPicker';
```

Inside the `isOwner &&` block, immediately **above** the existing email `<View className="flex flex-row gap-2 mb-4">`, insert:

```tsx
<FriendPicker
  excludeUserIds={members.map((m) => m.userId)}
  onPick={(friendEmail) => onInvite(friendEmail)}
  disabled={isInviting}
/>
```

This reuses the existing `onInvite(email)` invitation flow — a friend tap creates the same `grocery_invitations` row the typed email would.

- [ ] **Step 3: Integrate into AddShopperModal**

In `mobile/src/modules/grocery/presentation/components/Session/AddShopperModal.tsx`:

Add the import:

```tsx
import { FriendPicker } from '../Invitation/FriendPicker';
```

Inside the `isOwner &&` block, immediately **above** the `Add Shopper` `<View>` group, insert:

```tsx
<FriendPicker
  excludeUserIds={members.map((m) => m.userId)}
  onPick={async (friendEmail) => { await onAddShopper(friendEmail); onOpenChange(false); }}
  disabled={isAdding}
/>
```

This reuses `onAddShopper(email)` → `findUserByEmail` + `addMember`.

- [ ] **Step 4: Verify typecheck**

Run: `cd mobile && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Manual verification**

Run the app; open a list's share modal and a session's Add Shopper modal as the owner. Confirm accepted friends appear as tappable rows above the email field, tapping shares to that friend (list → pending invitation; session → shopper added), already-member friends are hidden, and the email fallback still works.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/modules/grocery/presentation/components/Invitation/FriendPicker.tsx \
        mobile/src/modules/grocery/presentation/components/Invitation/ShareListModal.tsx \
        mobile/src/modules/grocery/presentation/components/Session/AddShopperModal.tsx
git commit -m "feat(friends): add friend picker to share modals"
```

---

### Task 7: Grocery header entry point → Friends

**Files:**
- Modify: `mobile/src/modules/grocery/presentation/components/Main/GroceryHeader.tsx`

**Interfaces:**
- Consumes: Expo Router `router`; `useFriends` (for the incoming-request badge count).
- Produces: a people icon in the grocery header routing to `/friends`, with an optional unread-count badge.

- [ ] **Step 1: Inspect the header**

Read `mobile/src/modules/grocery/presentation/components/Main/GroceryHeader.tsx` to find the existing action-icon row and match its icon sizing/spacing conventions. (If the header has no icon row, add the button adjacent to the title.)

- [ ] **Step 2: Add the Friends button**

Add the import(s):

```tsx
import { router } from 'expo-router';
import { useFriends } from '@/modules/grocery/presentation/hooks';
```

Inside the component, read the count:

```tsx
const { incomingRequests } = useFriends();
```

In the header's action-icon area, add (match neighboring icon button styling — colors/sizes observed in Step 1):

```tsx
<Pressable onPress={() => router.push('/friends')} className="p-2">
  <Feather name="users" size={20} color="#6b7280" />
  {incomingRequests.length > 0 && (
    <View className="absolute top-0 right-0 min-w-4 h-4 px-1 rounded-full bg-red-500 items-center justify-center">
      <Text className="text-[10px] font-bold text-white">{incomingRequests.length}</Text>
    </View>
  )}
</Pressable>
```

If `Feather` is not already imported in this file, add `import { Feather } from '@expo/vector-icons';`.

- [ ] **Step 3: Verify typecheck**

Run: `cd mobile && npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Manual verification**

Run the app; on the grocery main screen, confirm the people icon appears, tapping it opens `/friends`, and a pending incoming request shows the red badge.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/modules/grocery/presentation/components/Main/GroceryHeader.tsx
git commit -m "feat(friends): add friends entry point to grocery header"
```

---

## Self-Review

**Spec coverage:**
- Data model (table, RLS, RPCs) → Task 1. ✔
- Shared `@himan/shared/friends` module (entity, types, repository) → Tasks 2–3. ✔
- Mobile: `useFriends` hook → Task 4; Friends screen → Task 5; `FriendPicker` in both modals → Task 6; header entry point → Task 7. ✔
- Email-only lookup → Task 1 `send_friend_request`. ✔
- Friend picker + email fallback kept → Task 6 (picker inserted above, email field untouched). ✔
- Mutual request/accept → Task 1 RLS (addressee-only UPDATE) + Task 4/5 accept/decline. ✔
- Edge cases (self, duplicate, reverse-dup, already-friends, declined re-send, not-found) → Task 1 `send_friend_request` + Task 3 `friendlyError`. ✔
- Non-goals (no unfriend revocation, no blocking/usernames, no web, no realtime) → honored (no code touches memberships; poll via React Query). ✔
- Shared layer stays UI-agnostic (web later) → Tasks 2–3 have no React/RN imports. ✔

**Placeholder scan:** No TBD/TODO; every code step has concrete code. Steps that inspect existing files (Task 4 Step 1 queryKeys shape, Task 7 Step 1 header) are inspection-before-edit, not deferred logic. ✔

**Type consistency:** `FriendType` / `FriendRowType` / `mapFriendRow` defined in Task 2, imported unchanged in Tasks 3–4. `FriendRepository` method names (`sendRequest`, `getFriends`, `getRequests`, `accept`, `decline`, `cancelRequest`, `remove`) defined in Task 3, called identically in Task 4. `useFriends` return keys (`friends`, `incomingRequests`, `outgoingRequests`, `sendRequest`, `accept`, `decline`, `cancelRequest`, `remove`) defined in Task 4, consumed in Tasks 5–7. RPC names (`send_friend_request`, `get_friends`, `get_friend_requests`) match between Task 1 and Task 3. ✔
