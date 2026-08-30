---
type: module
area: subscriptions
platforms: [shared, web]
status: active
---

# subscriptions

> Generated from the code graph. Regenerate with `/graphify` then the vault script.

**Scale:** 34 source files · 143 graph nodes
**Import path:** `@himan/shared/subscriptions`

## Where it lives

- **shared** — `packages/shared/src/modules/subscriptions/` (14 files)
- **web** — `web/src/modules/subscriptions/` (20 files)

## Key types & classes

`Subscription`, `UsageLimits`, `FeatureAccessResult`, `RoleType`, `SubscriptionType`, `TierLimits`, `TierType`, `UsageLimitsType`, `UsageStats`, `CheckFeatureAccess`, `GetCurrentUsage`, `SubscriptionRepository`, `UsageLimitsRepository`, `RoleBadgeProps`, `TierBadgeProps`, `UpgradeDialogProps`, `UsageIndicatorProps`, `SubscriptionContextType`, `SubscriptionProviderProps`

## Blast radius

_Changing these breaks the most callers:_

- `packages/shared/src/modules/subscriptions/domain/types/index.ts` — imported by **6**
- `web/src/modules/subscriptions/domain/index.ts` — imported by **5**
- `web/src/modules/subscriptions/domain/types/index.ts` — imported by **5**
- `packages/shared/src/modules/subscriptions/index.ts` — imported by **4**
- `packages/shared/src/modules/subscriptions/domain/constants/tierLimits.ts` — imported by **3**
- `packages/shared/src/modules/subscriptions/domain/index.ts` — imported by **3**

## Migrations

- `20260105105154_create_subscription_tables.sql`
- `20260105110919_add_role_to_subscriptions.sql`

---
[[MAP|← back to MAP]]
