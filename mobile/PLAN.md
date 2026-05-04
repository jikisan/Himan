# Plan: Expo App Screen Structure (Login → Dashboard → Grocery)

## Context

Mobile app has Expo Router + NativeWind configured with a login screen. Need to add navigation flow: Login → Dashboard → Grocery. No backend — Gmail button on login navigates directly to dashboard. Dashboard mirrors web's card-based quick links. Grocery is placeholder only.

## Approach: Route Groups with Expo Router

Use Expo Router's file-based routing with route groups for clean separation:

```
mobile/app/
├── _layout.tsx              # Root layout (keep as-is, Stack)
├── index.tsx                # Redirect → /login (keep as-is)
├── login.tsx                # Modify: Google button → router.replace('/(app)/dashboard')
├── (app)/
│   ├── _layout.tsx          # App group layout (Stack, no header)
│   ├── dashboard.tsx        # Dashboard screen with card grid
│   └── grocery.tsx          # Placeholder grocery screen
```

### Why `(app)` group instead of `(tabs)`?
User said "just dashboard for now, others to follow." Tab bar unnecessary with single destination. Group keeps authenticated screens organized. Easy to convert to tabs later.

## Changes

### 1. Modify `mobile/app/login.tsx`
- Import `useRouter` from expo-router
- Google button `onPress` → `router.replace('/(app)/dashboard')`
- No auth logic, just navigation

### 2. Create `mobile/app/(app)/_layout.tsx`
- Stack navigator with `headerShown: false`
- Simple wrapper for app screens

### 3. Create `mobile/app/(app)/dashboard.tsx`
- Match web dashboard style: greeting + card grid
- Cards: icon + label + description (same as web `quickLinks` array)
- Show all quick link cards from web, Grocery navigates to grocery screen, others are visual placeholders
- Use `FlatList` with 2-column grid layout
- Card styling: white bg, rounded corners, shadow, icon + title + description
- Grocery card `onPress` → `router.push('/(app)/grocery')`
- Other cards: show but with "Coming Soon" indicator or just non-functional

### 4. Create `mobile/app/(app)/grocery.tsx`
- SafeAreaView with centered placeholder text: "Grocery — Coming Soon"
- Back navigation via header or back button

## Files to Modify

| File | Action |
|------|--------|
| `mobile/app/login.tsx` | Modify — add router navigation on Google button |
| `mobile/app/(app)/_layout.tsx` | Create — Stack layout for app group |
| `mobile/app/(app)/dashboard.tsx` | Create — Dashboard with card grid |
| `mobile/app/(app)/grocery.tsx` | Create — Placeholder screen |

## Implementation Details

### Dashboard Cards (from web DashboardPage.tsx)
```
- Notes (FileText icon) → placeholder
- Passwords (KeyRound) → placeholder  
- Cards (CreditCard) → placeholder
- Grocery (ShoppingCart) → navigates to grocery
- Invoice Generator (Receipt) → placeholder
```

Skip Storage (enterprise-gated on web).

### Icons
Use `@expo/vector-icons` (already available in Expo) — specifically `Feather` or `MaterialCommunityIcons` icon set, which has equivalents for all web Lucide icons.

### Styling
NativeWind classes consistent with existing login.tsx patterns:
- Background: `bg-gray-50`
- Cards: `bg-white rounded-2xl border border-gray-200 shadow-sm`
- Text: `text-gray-900`, `text-gray-500`
- Accent: `bg-indigo-600` (matching login button)

## Verification

1. `cd mobile && npx expo start` — app launches
2. Login screen shows → tap "Sign in with Google" → navigates to Dashboard
3. Dashboard shows greeting + 5 feature cards in 2-column grid
4. Tap Grocery card → navigates to Grocery screen
5. Grocery screen shows placeholder text
6. Back navigation works from Grocery → Dashboard
