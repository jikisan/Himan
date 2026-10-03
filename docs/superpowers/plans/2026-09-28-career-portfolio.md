---
type: plan
area: career
status: implemented (phases 1–4); phase 5 deferred
created: 2026-09-28
spec: null
---

# Career Portfolio Link — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task. Steps use `- [ ]` syntax.

**Goal:** Every career item gets a public portfolio link (`/p/:shareToken`) next to its CV and cover letter. Same portfolio UI for every item; the *content* is chosen by the item, exactly like the CV layout already is. A "Frontend role" item shows frontend projects; a "Mobile role" item shows mobile ones.

**Reference:** https://www.geotechengine.com/ — the intro splash and the "Proof, Not Promises" sections.

**Architecture in one line:** a `SECURITY DEFINER` RPC resolves `share_token → public-safe JSON snapshot` of the item's selected projects/experience; a lazy-loaded public React route renders it with CSS-only motion.

**One new dependency: `motion`** (user asked for Motion; it ships only in the lazy `/p/:token` chunk, 53 KB gzip incl. the page). No new bucket.

---

## 1. What the reference actually does (decoded from its bundle)

### Intro splash (`geotech-splash-seen`)
Pulled from `main-*.js`. Built with framer-motion, but every part is plain CSS-reproducible:

| Beat | Timing | Detail |
|---|---|---|
| Full-screen navy overlay | 0ms | `fixed inset-0 z-[10010]`, body `overflow:hidden` while shown |
| Glow blob | 0 → 1200ms | 40rem circle, `blur(120px)`, accent @ 20%, `scale .7→1`, `opacity 0→1`, ease-out |
| Wordmark | 150ms start, 80ms stagger | Two spans ("GEO" white, "TECH" accent), each `translateY(26px)→0`, `opacity 0→1`, 600ms, `cubic-bezier(.22,1,.36,1)`, parent `overflow:hidden` (mask reveal) |
| Underline | 500ms delay | 3px accent bar, `scaleX 0→1`, origin left, 600ms same ease |
| Tagline | 700ms delay | `translateY(8px)→0`, fade, 500ms, uppercase wide tracking |
| Exit | at 1850ms | Whole overlay slides `translateY(-100%)`, 700ms, `cubic-bezier(.76,0,.24,1)` |
| Skip rules | — | Not shown if `prefers-reduced-motion: reduce` OR `sessionStorage[key]==='seen'` |

### Proof sections
1. **Hero proof card** — giant metric (`#1`), metric label (`App Store Shopping · Philippines`), headline claim, 2–3 sentence story, attribution line (`UA Worldwide · Mobile commerce build`), CTA.
2. **Browser showcase** — list of builds on one side; selected one renders inside a fake browser frame (URL bar with real URL, year, category chip). "Previewed exactly as they run" = live iframe.
3. **Build cards grid** — `/ BUILD 01` index, `Tech → Platform` chip (`Flutter → Mobile`), category (`Phone App / Operations`), title, one-line outcome ("Built to reduce coordination friction…").
4. Eyebrow labels (xs, uppercase, wide tracking, accent color) above every section title; title split into plain + accent half ("Enough about method." / "Here's the proof.").

### Mapping to Himan data

| Reference element | Himan source | Exists? |
|---|---|---|
| Wordmark | `profiles.full_name` split first/last | ✅ |
| Tagline | `profiles.headline` | ✅ |
| Build title / URL | `profile_projects.name` / `.url` | ✅ |
| `Tech → Platform` | `profile_projects.tech[0]` → `.platform[0]` | ✅ |
| Year | `profile_projects.end_date ?? start_date` | ✅ |
| Story | `profile_projects.description` | ✅ |
| Outcome one-liner | **new** `profile_projects.outcome` | ❌ |
| Big metric + label | **new** `profile_projects.proof_metric`, `.proof_label` | ❌ |
| Category | **new** `profile_projects.category` | ❌ |
| Experience timeline | `profile_experiences` | ✅ |
| Skills marquee | `profile_skills` | ✅ |

---

## 2. Key decisions

1. **Selection = the item's existing `cv_layout`.** Project/experience/skill refs already chosen for the CV drive the portfolio. Zero new selection UI. If `cv_layout` is null → all projects. (Separate `portfolio_layout` only if the two genuinely diverge in practice — deferred.)
2. **Public access via RPC, not RLS on anon.** `get_career_portfolio(p_token)` is `SECURITY DEFINER`, returns only whitelisted fields (no phone, no email unless `portfolio_show_email`). Tables stay owner-only.
3. **Opt-in.** `career_items.portfolio_enabled boolean default false`. RPC returns null when off.
4. **Revocation is free.** Existing `rotateShareToken` changes `share_token` → old `/p/<old>` returns null → 404 page. No extra code.
5. **Motion = CSS keyframes + one IntersectionObserver hook.** framer-motion/`motion` would add ~35 KB to a page recruiters open cold. Every beat above is `transform`/`opacity` → GPU-only.
6. **Lazy route.** `React.lazy(() => import('@career/presentation/pages/PortfolioPage'))` outside `ProtectedRoute`, so the public page doesn't pull Tiptap/PDF code.
7. **Live preview = iframe with fallback.** Many sites send `X-Frame-Options: DENY`; can't detect reliably cross-origin, so show a styled card (title, domain, metric) under the iframe and a "Open live ↗" link always. Screenshot upload deferred to Phase 5.

---

## 3. Tasks

### Phase 1 — Data (≈45 min)

- [x] **1.1 Migration** `supabase/migrations/20260928000000_career_portfolio.sql`
  ```sql
  ALTER TABLE public.profile_projects
    ADD COLUMN outcome      text,
    ADD COLUMN proof_metric text,   -- e.g. '#1', '₱100M+', '40%'
    ADD COLUMN proof_label  text,   -- e.g. 'App Store Shopping · PH'
    ADD COLUMN category     text,   -- e.g. 'Web Build / Revenue'
    ADD COLUMN featured     boolean NOT NULL DEFAULT false; -- hero proof card

  ALTER TABLE public.career_items
    ADD COLUMN portfolio_enabled    boolean NOT NULL DEFAULT false,
    ADD COLUMN portfolio_show_email boolean NOT NULL DEFAULT false;

  CREATE FUNCTION public.get_career_portfolio(p_token text)
  RETURNS jsonb
  LANGUAGE plpgsql STABLE SECURITY DEFINER
  SET search_path = public
  AS $$ ... $$;
  REVOKE ALL ON FUNCTION public.get_career_portfolio(text) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.get_career_portfolio(text) TO anon, authenticated;
  ```
  RPC body:
  - `SELECT * FROM career_items WHERE share_token = p_token AND portfolio_enabled` → none ⇒ `RETURN NULL`.
  - Extract ids: `SELECT elem->>'id' FROM jsonb_array_elements(cv_layout) elem WHERE elem->>'type' = 'project'` (same for `experience`; `skill` → `elem->>'category'`). Null layout ⇒ all rows for that user.
  - Return `jsonb_build_object('itemName', name, 'profile', {full_name, headline, bio, location, website, links, email?}, 'projects', [...ordered by array position], 'experiences', [...], 'skills', [...])`.
  - **Whitelist columns explicitly.** Never `to_jsonb(row)` — new columns would leak.
- [x] **1.2 SQL test** in `supabase/tests/`: disabled item → null; rotated token → null; phone never present; email present only when flag on.
- [x] **1.3 Apply** via `supabase db push` (or MCP `apply_migration`).

### Phase 2 — Shared domain + infra (≈45 min)

- [x] **2.1** `packages/shared/src/modules/profile/domain/types` — add `outcome, proofMetric, proofLabel, category, featured` to `ProjectType` + DTOs; update `ProjectRepository.mapToEntity`/insert/update.
- [x] **2.2** `packages/shared/src/modules/career/domain/types` — add `portfolioEnabled`, `portfolioShowEmail` to `CareerItemType`/`UpdateCareerItemDto`; add:
  ```ts
  export interface PortfolioData {
    itemName: string;
    profile: { fullName: string; headline: string | null; bio: string | null; location: string | null;
               website: string | null; links: Record<string, string>; email: string | null };
    projects: PortfolioProject[];   // already in layout order
    experiences: PortfolioExperience[];
    skills: string[];
  }
  ```
- [x] **2.3** `career/domain/usecases/portfolio.ts` — pure helpers, unit-tested:
  - `pickHeroProject(projects)` → first `featured`, else first with `proofMetric`, else null (hero section hidden).
  - `splitWordmark(fullName)` → `[first, rest]` ("June Kyle" / "Santerna").
  - `buildIndex(i)` → `'01'`.
  - `hostOf(url)` → `'geotechengine.com'` for the fake URL bar.
- [x] **2.4** `CareerPortfolioRepository.getByToken(token)` → `getSupabase().rpc('get_career_portfolio', { p_token })`, map snake→camel.
- [x] **2.5** Export via `career/index.ts`; re-export in `web/src/modules/career/infrastructure/index.ts`.

### Phase 3 — Public portfolio page (≈4–6 h, bulk of the work)

Files under `web/src/modules/career/presentation/portfolio/`:

```
PortfolioPage.tsx        # route component: fetch, loading, 404, sections
PortfolioSplash.tsx      # intro animation
ProofHero.tsx            # big metric card
BrowserShowcase.tsx      # list + fake browser frame + iframe
BuildGrid.tsx            # "/ BUILD 01" cards
ExperienceStrip.tsx      # compact timeline
SkillsMarquee.tsx        # CSS infinite scroll row
useReveal.ts             # IntersectionObserver → data-revealed
portfolio.css            # keyframes + tokens (scoped under .portfolio)
```

- [x] **3.1 Route** in `web/src/router/index.tsx`, outside `ProtectedRoute`/`PublicRoute` (logged-in users must see it too):
  ```tsx
  const PortfolioPage = lazy(() => import('@career/presentation/portfolio/PortfolioPage'));
  <Route path="/p/:token" element={<Suspense fallback={null}><PortfolioPage /></Suspense>} />
  ```
  `web/public/_redirects` already SPA-falls-back — verify `/p/*` resolves on Cloudflare Pages.
- [x] **3.2 Data** — `useQuery(['portfolio', token], () => repo.getByToken(token), { staleTime: Infinity, retry: false })`. `null` → reuse `NotFoundPage`.
- [x] **3.3 Splash** — timings exactly as table §1. Implementation:
  ```css
  .pf-splash { position:fixed; inset:0; z-index:100; display:grid; place-items:center;
               background:var(--pf-ink); animation: pf-exit .7s cubic-bezier(.76,0,.24,1) 1.85s forwards; }
  .pf-word > span { display:inline-block; transform:translateY(26px); opacity:0;
               animation: pf-rise .6s cubic-bezier(.22,1,.36,1) forwards; }
  .pf-word > span:nth-child(2) { animation-delay:.23s; }   /* .15 + .08 stagger */
  @keyframes pf-rise { to { transform:none; opacity:1 } }
  @keyframes pf-exit { to { transform:translateY(-100%) } }
  @media (prefers-reduced-motion: reduce) { .pf-splash { display:none } }
  ```
  React: `useState(() => shouldShow())` reading `sessionStorage['himan-pf-seen:'+token]` in try/catch; `onAnimationEnd` of the exit → unmount + restore body overflow. Content renders *underneath* from t=0 so data fetch overlaps the 1.85s.
- [x] **3.4 ProofHero** — from `pickHeroProject`. Metric uses a count-up only when `proofMetric` parses as a number (`/^([^\d]*)([\d.,]+)(.*)$/` → prefix/number/suffix; `#1` stays static). rAF, 900ms, ease-out, starts when revealed. Eyebrow "Proof, not promises" / title "Enough about method." + accent "Here's the proof."
- [x] **3.5 BrowserShowcase** — only projects with `url`. Left: list (active = accent bar). Right: frame with traffic-light dots, URL bar `hostOf(url)`, year, category chip; `<iframe src={url} loading="lazy" sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer">` scaled 0.5 via `transform` for desktop feel. Mobile (<768px): list only, each row links out. Always render "Open live ↗".
- [x] **3.6 BuildGrid** — every selected project: `/ BUILD {buildIndex}`, `{tech[0]} → {platform[0]}` chip, `category`, `name`, `outcome ?? first sentence of description`. Hover: lift 4px + border accent (150ms).
- [x] **3.7 ExperienceStrip + SkillsMarquee** — experiences as rows (years · title · company); skills as a duplicated row animating `translateX(-50%)` 30s linear infinite, paused under reduced-motion.
- [x] **3.8 Reveal on scroll** — `useReveal()` sets `data-revealed` once via IntersectionObserver (threshold .15, unobserve after); CSS `[data-reveal]{opacity:0;translate:0 24px;transition:.6s cubic-bezier(.22,1,.36,1)} [data-revealed]{opacity:1;translate:0}`. Stagger children with `style={{transitionDelay: i*80+'ms'}}`.
- [x] **3.9 Theme** — own dark palette (`--pf-ink` navy, `--pf-accent` sky) scoped to `.portfolio`, independent of app theme; respect `prefers-color-scheme` for a light variant. Tailwind v4 utilities OK for layout.
- [x] **3.10 Meta** — `document.title = `${fullName} — ${itemName}``. (OG tags need server rendering → deferred.)
- [x] **3.11 A11y** — splash `aria-hidden`, real `<h1>` in page body, iframe `title`, focus-visible rings, contrast ≥ 4.5:1 on accent text.

### Phase 4 — Owner controls in ItemEditorPage (≈1 h)

- [x] **4.1** Profile project form: add Outcome, Proof metric, Proof label, Category, Featured toggle (`web/src/modules/profile/presentation/components/ProjectEditor.tsx`).
- [x] **4.2** `ItemEditorPage` share area: toggle "Portfolio link", toggle "Show email", copy button for `${location.origin}/p/${item.shareToken}`, "Preview" opens new tab. Uses existing `updateItem`.
- [x] **4.3** Portfolio link appears in the cover-letter `portfolio_line` block: add placeholder `{{portfolioUrl}}` to `PlaceholderCtx` + `resolvePlaceholders` so letters embed the item's own link automatically.
- [x] **4.4** Rotate-link dialog copy: mention it also kills the portfolio link.

### Phase 5 — Deferred (only if needed)

- Project screenshots (public bucket `portfolio-media`, random filenames) for sites that block iframes.
- Separate `portfolio_layout` when CV and portfolio selections diverge.
- OG preview cards for LinkedIn/Slack → Cloudflare Pages Function injecting meta for `/p/*`.
- View analytics (`portfolio_views` table written by the RPC).

---

## Implementation notes (2026-09-28)

- Migration applied to prod as version `20260927174630` (file renamed to match). RPC test passed inside a rolled-back transaction.
- Motion uses `motion/react` (not CSS-only as first planned). `MotionConfig reducedMotion="user"` plus splash skip cover reduced motion.
- Added a first-viewport **build stack** (top 3 selected projects as a fanned card stack, hover spreads it) — the hero had an empty right half.
- Craft-floor deviations kept on purpose because the geotech reference pins them: blueprint grid behind the hero, `/ Build 01` indices. Eyebrow labels above headings were dropped; the two-tone heading carries it.
- Placeholder is `{{portfolio_url}}` (snake_case like the other tokens).
- `Show my email` defaults off; phone is never returned by the RPC.

## 4. Verification

- [ ] `cd web && npm run test:run` — portfolio usecase tests pass.
- [ ] SQL tests in `supabase/tests` pass.
- [ ] Manual: enable on item A (frontend projects) and item B (mobile projects) → two links show different builds, identical UI.
- [ ] Logged-out incognito opens link; rotate token → old link 404s.
- [ ] DevTools "Emulate prefers-reduced-motion" → no splash, no marquee.
- [ ] Reload same tab → splash skipped (sessionStorage).
- [ ] Lighthouse mobile on `/p/:token`: no layout shift from splash (it's `position:fixed`).
- [ ] `npm run build` + `npm run lint` clean.

**Total estimate:** ~1.5 days focused work. Phase 1–2 half a day; Phase 3 is the design-heavy part.
