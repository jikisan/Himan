# Finances — scope note

A simple, optional personal finance tracker (web + mobile). PHP by default.

## Reference research

- **tarsi.cloud** — public marketing page only (fetched as text; the web app sits behind a login, which we did not touch). Takeaways: quick daily logging, wallets, budgets/planned payments/debts, a dashboard that leads with what matters now. No transaction/category/chart flows are documented publicly. No code, text or branding copied.
- **morluto/rea** (MCP server for reverse engineering) — needs `npx rea-agents setup`, which rewrites the user's agent/MCP configuration. Not run: it is a machine-wide config change and the target is a login-gated closed app. Fell back to the public page plus open-source trackers.
- **ExpenseOwl** (open-source, Go): entry = date + amount + category (+ name/tags); user-editable categories; monthly pie of spending by category; cashflow summary (income / expenses / balance); monthly table with search; month window. **Firefly III / Actual Budget**: accounts + categories + budgets, signed amounts. We borrow ExpenseOwl's flow and keep the data model smaller still.

## Implemented (MVP)

- **Categories** — per user, kind `income | expense`, name + colour; add / rename / recolour / delete (deleting leaves transactions as "Uncategorized"). Defaults are seeded on first open.
- **Transactions** — kind, amount (integer centavos, always positive, like rentals), category, date (Manila calendar day), note. Add / edit / delete. Stable uuid id so Receipts can reference it later.
- **Month view** — month picker (prev/next), totals (income, expenses, balance) with count-up, expense breakdown by category (donut/bars, draw-in), list newest first, search on note and category.

## Left out on purpose

Wallets/accounts, budgets, recurring entries, transfers, multi-currency, CSV import/export, tags, attachments, charts beyond the monthly breakdown, offline queue. Each can be added without changing the transaction table (a nullable `wallet_id` would slot in).

## Data model

`finance_categories(id, user_id, kind, name, color)` unique per (user, kind, lower(name)).
`finance_transactions(id, user_id, kind, amount_centavos > 0, occurred_on, note, category_id)` — composite FK `(category_id, user_id, kind)` so a category can only be used by its owner and matching kind; `ON DELETE SET NULL (category_id)`. RLS owner-only; explicit GRANTs.
