---
type: module
area: auth
platforms: [mobile, shared, web]
status: active
---

# auth

> Generated from the code graph. Regenerate with `/graphify` then the vault script.

**Scale:** 29 source files · 90 graph nodes
**Import path:** `@himan/shared/auth`

## Where it lives

- **shared** — `packages/shared/src/modules/auth/` (7 files)
- **web** — `web/src/modules/auth/` (19 files)
- **mobile** — `mobile/src/modules/auth/` (3 files)

## Key types & classes

`User`, `AuthError`, `AuthRepository`, `LoginCredentials`, `SignUpCredentials`, `AuthSession`, `SupabaseAuthRepository`, `AuthContextType`, `AuthProviderProps`, `MobileAuthRepository`

## Blast radius

_Changing these breaks the most callers:_

- `mobile/src/modules/auth/presentation/contexts/AuthContext.tsx` — imported by **23**
- `packages/shared/src/modules/auth/domain/types/auth.types.ts` — imported by **6**
- `web/src/modules/auth/domain/types/auth.types.ts` — imported by **6**
- `web/src/modules/auth/presentation/contexts/AuthContext.tsx` — imported by **4**
- `web/src/modules/auth/domain/entities/index.ts` — imported by **3**
- `packages/shared/src/modules/auth/domain/entities/User.ts` — imported by **2**

## Mobile routes

- `mobile/app/(auth)/_layout.tsx`
- `mobile/app/(auth)/login.tsx`

## Migrations

- `20260505000000_add_get_user_by_id_rpc.sql`

---
[[MAP|← back to MAP]]
