# Grocery module redesign — Notes-app minimalist

A spec for applying the **Notes-app minimalist** direction (Broadsheet design system, direction `3a`/`3b` in `Grocery Redesign.dc.html`) to the existing React Native + NativeWind app.

The visual mock lives in `Grocery Redesign.dc.html` (open it, zoom to turn **3**). This doc is the bridge from that mock to the real components under `grocery/presentation/`.

---

## 1. Design principles

The look is iOS Notes calm, set in Broadsheet's newsprint voice:

- **Paper, not white cards.** One flat paper ground. No card backgrounds, no `rounded-xl` containers, no shadows on rows. Sections are separated by whitespace and single hairline rules — never boxes.
- **The serif is the chrome.** Everything is Source Serif 4 — titles, body, and UI labels alike. No sans-serif anywhere.
- **One accent.** Cyan is the only color, used for interactive elements (checkbox fill, links, `#tags`, primary actions). Drop indigo and green entirely. Magenta stays unused in these screens.
- **One straight list.** Items are a single flush-left list you cross off by tapping the row. No "To Get / Checked" tab split — checked items stay in place, struck through and greyed. Categories remain as collapsible `#tag` section headers.
- **Air.** Keep the generous spacing; don't tighten it.

---

## 2. Tokens

Replace the current indigo/gray palette. Keep `theme/notebook.ts` as the single source and mirror into `tailwind.config.js`.

### Palette (from Broadsheet `styles.css`)

| Role | Token | Value |
| --- | --- | --- |
| Paper (bg) | `paper` | `#f3f2f2` |
| Surface (inputs) | `surface` | `#eae9e9` |
| Ink (text) | `ink` | `#201e1d` |
| Muted text | `inkSoft` | `#7d7979` (neutral-600) |
| Faint text | `inkFaint` | `#9b9797` (neutral-500) |
| Hairline / divider | `hairline` | `rgba(32,30,29,.16)` |
| Accent (fills, icons) | `accent` | `#0088b0` |
| Accent text (on paper) | `accentText` | `#006786` (accent-700, meets contrast for small text) |
| Destructive | `danger` | `#aa0b56` (accent-2-700) |

> Note: use `accentText` (#006786) for anything text-sized in the accent — the base cyan only clears 3:1, fine for icons and fills, not body copy.

### Type

- Family: **Source Serif 4** (weights 400, 600; italic 400). Load via `expo-font` / `@expo-google-fonts/source-serif-4` and set as the default `Text` family app-wide, replacing the system sans.
- Scale used in the mock: title `32`, item name `17`, category tag / subline `15`, meta & price `14`, status caption `15`.
- Emphasis and captions use the **true italic** (e.g. the "Add an item…" placeholder, the store subline), never a synthesized oblique.

### Radius & spacing

- Checkbox radius `6`. Inputs `2` (Broadsheet `--radius-md`). No large rounded containers.
- Keep the existing spacing scale — do not compress.

---

## 3. Component-by-component changes

Paths are under `grocery/presentation/`.

### `shared/Checkbox.tsx`  ← do this first
Highest-leverage change; it propagates to every list and the session.
- Shape: **rounded square** (`rounded-md`, ~24×24), 2px border in `inkFaint` when unchecked.
- Checked: solid `accent` fill + white Feather `check`.
- Remove the `color` prop's `green` branch — there is one accent now (cyan). Delete the indigo/green variants.

### `shared/ItemRowContent.tsx`
- Name in serif `17`, ink. Quantity label inline, `inkSoft` `14`.
- Checked: `line-through` + `inkFaint` (applies to name **and** meta).
- Price: `inkFaint` `14`, tabular figures, right-aligned. Keep `₱`.

### `components/Main/GroceryItemRow.tsx`
- Remove `bg-white dark:bg-gray-800` and `rounded-xl` from the row — rows are hairline-separated (`border-b` in `hairline`), on paper.
- Make the **whole row** the check target (tap crosses off). Keep long-press → delete.
- Move edit to a tap on the name if you still want it; drop the always-visible red trash icon (or make it a muted `inkFaint` outline icon, revealed on the detail sheet). No red.

### `components/Main/CategoryGroup.tsx` and `components/Session/SessionCategoryGroup.tsx`
- Replace the gray pill header with a flush-left cyan **`#tag`** (`accentText`, `15`) + a chevron (`inkFaint`) on the right. No background fill.
- Keep the existing `isCollapsed` state and the `collapseStamp` behaviour untouched.

### `components/Main/AddItemInput.tsx`
- Field: `surface` fill, `hairline` border, `radius 2`, a cyan `+` glyph, italic `inkSoft` "Add an item…" placeholder.
- Suggestion dropdown rows: serif, hairline separators, no indigo highlight — use a faint `surface` fill for the selected row.

### `components/Main/SuggestionChips.tsx`
- If kept: use Broadsheet `.tag`-style chips — `accent-100` fill (`#e9f8ff`) with `accent-800` text, small radius. (In the mock the planning screen omits chips for calm; optional.)

### `components/Main/GroceryHeader.tsx`
- "‹ Lists" back link in `accentText`.
- Big serif title (`32`). Below it a `#tag` + count subline (`accentText` / `inkSoft`).
- Actions become quiet outline icons (share / more) in `accentText`. **Drop the filled indigo "Shop" pill** → cyan outline or text button. Remove the friends-badge red dot → cyan.

### `components/Session/SessionHeader.tsx`
- Same header pattern. Title "Shopping at {store}".
- Replace the solid red "end shopping" square with a muted outline / text action.

### `components/Session/SessionBanner.tsx`
- Remove the green progress bar. Replace with a one-line status caption: **`{done} of {total} · ₱{spend} so far`** in `inkSoft` `15`, sitting under the title.

### `components/GroceryList/GroceryListTabSwitcher.tsx`  ← remove
The user wants a single straight list. **Delete the To Get / Checked tab split.** Render one list where checked items remain in place (struck + greyed). If you keep a filter, move it to the bottom toolbar's funnel icon rather than a top tab bar.

### `components/GroceryList/GroceryListCard.tsx` + `ListsSection.tsx`
- Optional (lists overview, direction `2d`): a single serif column instead of the 2-up card grid — name, a thin cyan progress rule, "8 of 14" caption, shared count. Drop card fills and the indigo/green bars.

### Bottom toolbar (session & list)
- Four quiet outline icons in `accentText`, evenly spaced, above a hairline: filter, add, share, edit. Matches the mock's footer.

### Modals — `ItemDetailSheet.tsx`, `ShareListModal.tsx`, price/session modals
- Bottom sheet on paper, a 2px ink rule under the serif title.
- Fields use the token set above (`.field` label + `surface` input). Primary button = solid cyan; destructive = `danger` text/outline, not red fill.

---

## 4. What does NOT change

Data hooks, sync, entities, and all logic stay put — this is a presentation-layer reskin:
- `hooks/*`, `contexts/SyncProvider.tsx`, `infrastructure/*`, `domain/*` — untouched.
- Collapse state, session state machine, invitations flow — unchanged.

---

## 5. Suggested order

1. Tokens + Source Serif font loaded app-wide.
2. `Checkbox.tsx` → `ItemRowContent.tsx` (instant lift across all screens).
3. Strip row/card backgrounds and borders; convert category headers to `#tags`.
4. Headers, `SessionBanner`, remove `GroceryListTabSwitcher`.
5. Modals and the lists overview.

Reference the live mock (`Grocery Redesign.dc.html`, turn 3) for exact spacing, the tag treatment, and the toolbar while implementing.
