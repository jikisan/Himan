---
type: bug-list
area: grocery
status: open
---

# Bugs

Open items, all in mobile grocery **session/errand mode** — see [[grocery]].

- [ ] **Purchase edit dialog is price-only.** Moving an item to purchased should also allow
      editing name, qty, and unit. Price stays focused on initial open.
      → `mobile/src/modules/grocery/presentation/components/errand/ErrandItemEditModal.tsx`
- [ ] **No purchased total.** Session mode should show a running total price for purchased items.
- [ ] **Collapse the two-tab session view.** Session mode currently splits "all items" and
      "purchased" into two tabs. Offer a single combined list, keeping the two-tab version as
      an option.
      → note [[grocery-redesign-plan]]'s newer `DESIGN.md` direction explicitly removes
      `GroceryListTabSwitcher`, so this may already be partly resolved — verify before building.

## Related

[[grocery]] · [[grocery-redesign-plan]] · [[MAP]]
