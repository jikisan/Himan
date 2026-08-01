# Grocery Friends — Design

**Date:** 2026-08-01
**Status:** Approved (design), pending implementation plan
**Scope:** Add a mutual "friends" system so users can share grocery lists and errands (sessions) with saved friends instead of retyping emails.

## Summary

Today, sharing requires typing an email every time:

- **Lists**: `ShareListModal` → `grocery_invitations` row → invitee accepts → `grocery_list_members`.
- **Errands (sessions)**: `AddShopperModal` → `get_user_id_by_email` RPC → direct `grocery_session_members` insert.

This feature adds a **mutual friend graph** (request + accept) that acts as a **discovery/convenience layer** on top of those existing flows. Friendship itself grants **no** access to any list or errand — the user still sends an invite/adds a shopper, and the existing acceptance/membership flow is unchanged. This keeps risk low and requires **no changes to existing grocery RLS**.

### Locked decisions

| Decision | Choice |
|---|---|
| Relationship model | Mutual: requester sends, addressee accepts |
| Identity lookup | Email only (exact match; reuses user-by-email lookup) |
| Share integration | Friend picker in share modals, **email fallback kept** (non-friends still shareable) |
| Platform | Shared package + mobile now; web deferred (shared layer stays UI-agnostic) |
| Module | New standalone `@himan/shared/friends` module |
| Entry point | People icon in grocery header → `/friends` screen |

## 1. Data model

One new migration adding a `friendships` table.

```
friendships
  id            uuid pk default gen_random_uuid()
  requester_id  uuid not null → auth.users(id) on delete cascade
  addressee_id  uuid not null → auth.users(id) on delete cascade
  status        text not null default 'pending'   -- 'pending' | 'accepted' | 'declined'
  created_at    timestamptz default now()
  updated_at    timestamptz default now()

  UNIQUE (requester_id, addressee_id)
  CHECK  (requester_id <> addressee_id)
```

Indexes: `requester_id`, `addressee_id` (both directions queried).
Trigger: `update_updated_at_column` on update (reuse existing function).

"My friends" = rows with `status = 'accepted'` where `auth.uid()` is requester **or** addressee.

### RLS (RLS enabled on table)

| Command | Policy |
|---|---|
| SELECT | `auth.uid() IN (requester_id, addressee_id)` |
| INSERT | `requester_id = auth.uid()` |
| UPDATE | `addressee_id = auth.uid()` (only addressee accepts/declines — no self-accept) |
| DELETE | `auth.uid() IN (requester_id, addressee_id)` (unfriend / cancel request) |

### RPCs (SECURITY DEFINER)

Reasons for RPCs over raw client queries: keep other users' emails private (no direct `auth.users` read), dedup a request across **both** directions atomically, and resolve `user_id → email` server-side to avoid N+1 lookups.

- **`send_friend_request(lookup_email text)`**
  - Resolve `addressee_id` from `auth.users` by exact email.
  - Errors (friendly): email not found; addressee == self; a row already exists in either direction (surface its status, e.g. already friends / already pending).
  - If a prior `declined` row exists, upsert it back to `pending` (allow re-send).
  - Insert `pending` with `requester_id = auth.uid()`. Return resulting status.
- **`get_friends()`** → accepted friendships for current user, joined to the friend's email, with a `direction` marker and the friend's `user_id`.
- **`get_friend_requests()`** → pending rows for current user, each tagged `incoming` (addressee == me) or `outgoing` (requester == me), with the other party's email.

## 2. Shared layer — `@himan/shared/friends`

New standalone module (the friend graph is not grocery-specific; clean boundary, reusable by web and future features). Adds one subpath export to `packages/shared/package.json`.

```
packages/shared/src/modules/friends/
  domain/
    entities/Friend.ts        # FriendType
    types/index.ts
    index.ts
  infrastructure/
    repositories/FriendRepository.ts
    index.ts
  index.ts
```

`FriendType`:

```ts
{
  id: string;            // friendship row id
  userId: string;        // the friend's auth user id
  email: string;         // the friend's email
  status: 'pending' | 'accepted' | 'declined';
  direction: 'incoming' | 'outgoing';
  createdAt: Date;
}
```

`FriendRepository` (thin wrappers over RPCs/table):

- `sendRequest(email: string)`
- `getFriends(): Promise<FriendType[]>`
- `getRequests(): Promise<FriendType[]>`  (both directions, pending)
- `accept(friendshipId: string)`
- `decline(friendshipId: string)`
- `cancelRequest(friendshipId: string)`  (delete outgoing pending)
- `remove(friendUserId: string)`         (unfriend accepted)

## 3. Mobile UI

- **Screen** `mobile/app/(app)/friends.tsx`
  - Add-by-email input (reuse validation from `ShareListModal`).
  - Incoming requests: accept / decline.
  - Outgoing requests: cancel.
  - Friends list: unfriend.
  - Visual pattern mirrors existing `Invitation/InvitationsSection` + `InvitationBanner`.
- **Hook** `mobile/src/modules/grocery/presentation/hooks/useFriends.ts` (or a new `friends` presentation dir) — React Query, mirrors `useGroceryInvitations` structure (queries + mutations + cache invalidation). Refetch on screen focus (no realtime for friends).
- **Component** `FriendPicker` — renders friend rows; tapping a friend triggers a share callback. Dropped into both `ShareListModal` and `AddShopperModal`, **above** the existing email field. Tapping a friend calls the existing `onInvite(email)` / `onAddShopper(email)` — no new share plumbing, no new RLS.
- **Entry point** — people icon in the grocery header routing to `/friends`.

## 4. Edge cases & non-goals

Handled:

- Self-request, duplicate request, reverse-duplicate, already-friends → caught in `send_friend_request`, surfaced as friendly errors.
- Declined request → re-send allowed (RPC upserts declined → pending).
- Email not found → friendly error.

Explicit non-goals (deferred):

- **Unfriend does NOT revoke** already-shared lists/errands. Membership (`grocery_list_members`, `grocery_session_members`) is independent of friendship. Removing access stays a separate action in the share modals.
- No blocking / no username handles / no display names beyond email.
- No web UI (shared layer built UI-agnostic so web can adopt later without rework).
- No realtime for friend requests (poll/refetch on focus).

## Wiring checklist (per repo conventions)

- `packages/shared/package.json` — add `./friends` subpath export.
- New migration file under `supabase/migrations/` (timestamped).
- Mobile: new screen route (Expo Router auto-registers `app/(app)/friends.tsx`), new hook, `FriendPicker`, header entry point. `@himan/shared/friends` consumed directly (Metro already resolves shared subpaths).
