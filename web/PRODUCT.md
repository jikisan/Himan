# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Solo user (the repo owner). A personal productivity suite, not a multi-tenant product — every module (notes, passwords, cards, storage, invoice-generator, subscriptions, grocery, career) is built for one person's own workflow.

## Product Purpose

Himan is a personal productivity suite: notes, passwords, file storage, credit cards, invoice generator, grocery lists, subscriptions, and career tools (cover-letter/CV generation), unified under one Supabase-backed account.

## Positioning

Not a SaaS competing for signups — a self-hosted personal system, so it can assume one user's context (own data, own history, own conventions) instead of generic multi-user onboarding.

## Operating Context

- Three-layer architecture (domain → infrastructure → presentation), shared domain/infra in `packages/shared`, platform-specific presentation in `web/` and `mobile/`.
- **Career module**: an *item* is a role application, built from a shared pool of reusable text *blocks* (greeting, opening, experience line, proof, portfolio line, close, CV summary). Generating a letter for a new role is picking blocks and typing job title/company, not writing a new document. Three web pages: Items (list of role items), Item Editor (per-item CV upload + block selection + letter compose/preview, two-column CV/letter layout), Blocks (manage the shared block pool).
- Web stack: Tailwind CSS v4, Radix + shadcn/ui patterns, class-variance-authority, React 19, React Router v7, TanStack Query, lucide-react icons.

## Capabilities and Constraints

- Career: CV stored as an uploaded file (upload mode only, no in-app authoring); cover letters composed from blocks and rendered as HTML (kept selectable for ATS parsers, not rasterized); share links are permanent Supabase signed URLs, revocable by rotating a token.
- No new dependencies added lightly — the app currently reuses one shared shadcn/Tailwind design system across every module.

## Brand Commitments

No distinct visual identity yet — every module (dashboard, notes, passwords, career, etc.) currently renders in the same default shadcn/Tailwind look. Career redesign stays inside this shared system rather than introducing its own visual world, so it continues to feel like part of Himan.

## Evidence on Hand

No brand assets, logos, or marketing copy — this is an internal tool, not a marketed product.

## Product Principles

- One user, own data: no multi-tenant assumptions, no generic onboarding.
- Reuse over re-authoring: the career module's core idea (shared block pool, not per-role documents) should read clearly in the UI.
- Consistency across modules matters more than any single module's novelty — shared shadcn tokens are the one visual throughline the app has today.
- Plain, labelled controls for older and non-technical users (rentals co-managers and tenants): every action button shows its text label next to any icon; no icon-only buttons and no hidden "tap the row" actions as the only way to do something.
- Operate mode: the visitor is completing a task (build a letter, manage blocks), not being persuaded — scanability and low friction outrank expressive flourish.
