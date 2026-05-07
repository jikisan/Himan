---
description: Deep clean and restructure spaghetti code into well-organized, single-responsibility modules
allowed-tools: Read, Edit, MultiEdit, Write, Bash
---

You have full access to the project. Your job is to transform messy, tangled code into a clean, well-structured codebase. You are allowed — and expected — to **create new files, move code between files, and reorganize** as needed.

This is a **structural cleanup**, not a surface-level polish.

---

## Step 1: Audit

Before making any changes:

1. Read and understand the full project structure.
2. Identify the tech stack, language, framework, and existing conventions (e.g., naming, folder patterns, import style).
3. Map out problem areas: bloated files, mixed concerns, duplicated logic, dead code.
4. Form a refactoring plan before touching anything.

---

## Step 2: Restructure

Apply these rules aggressively:

### Single Responsibility Per File
- One component, one hook, one utility, one type definition, or one constant set per file.
- If a file does more than one thing — split it.

### Vertical Scan — Extract UI Sections
For every component file being refactored:
1. Read it top-to-bottom and identify each distinct visual block — look for JSX comments (`{/* Section Name */}`), logical groupings, or clear whitespace breaks.
2. Each block is a candidate for its own file. Typical sections: Page Title/Header, filters or toolbars, main content area, sidebars or panels, list or grid, individual list/card items, empty states, loading skeletons, error states.
3. Extract each section into `[ParentName][SectionName].tsx` (e.g. `MyEventsPageTitle.tsx`, `MyEventsCalendarGrid.tsx`).
4. The original file becomes a thin orchestrator: it owns state, data-fetching, and derived values, then composes the extracted section components.
5. Pass only the props each section needs — do not thread unnecessary state through.
6. Helpers (pure functions, constants) that only serve one section stay in that section's file. Helpers shared across sections go in a dedicated `[ParentName]Helpers.ts`.

### Extract and Separate
- **Components**: Each extracted UI section gets its own file — never group multiple sections into a single `components.tsx`.
- **Utilities / Helpers**: Pure functions, formatters, validators, parsers → dedicated utils or helpers directory.
- **Hooks / State Logic**: Custom hooks, side effects, business logic → dedicated hooks directory.
- **Types / Interfaces**: Shared types → dedicated types file or directory.
- **Constants**: Magic strings, config values, enums → dedicated constants file.

### React-Specific Rules
- **No plain functions returning JSX.** Every piece of JSX must be a proper named React component (PascalCase). Never call JSX-returning helpers as `{myFn()}` or inside IIFEs.
- **No IIFEs for conditional rendering.** Replace `{(() => { if ... })()}` with a named `renderX()` method, or better, a dedicated component.
- **Atomic components are encouraged.** Tiny components like `<SellerName>`, `<ResponseDate>`, `<ResponseAnswer>` that render a single element are fine — they give every visual atom a name and make the parent JSX read like a description.
- **Co-locate related states in one file.** Loading and empty states that belong to a specific list can live in the same file as that list (e.g. `ResponsesList.tsx` exports both `ResponsesList` and `ResponsesLoading`) unless reused elsewhere.
- **Directory-based structure for complex components.** When a tab or page spawns more than ~3 sub-components, promote it from a flat file (`ResponsesTab.tsx`) to a directory (`ResponsesTab/`) with an `index.ts` barrel and each sub-component as a sibling file.
- **Components own their own translations.** Each component calls `useTranslation()` itself — never pass `t` as a prop.

### Naming Conventions
- Match the project's existing naming style (camelCase, PascalCase, kebab-case, etc.).
- Names must be descriptive and self-documenting. No `handleClick2`, no `utils2.ts`, no `misc.ts`.

### Barrel Exports
- Add or update `index` files (e.g., `index.ts`, `index.js`, `__init__.py`) in each module directory to provide clean public APIs.
- Re-export only the public interface — keep internals private.

---

## Step 3: Clean

Apply across all touched files:

- Remove dead code, unused imports, and commented-out blocks.
- Eliminate duplication — extract shared logic into a single source of truth.
- Simplify complex conditionals and deeply nested logic.
- Add early returns to reduce nesting.
- Ensure consistent error handling patterns.
- Keep documentation minimal — prefer readable code over comments. Only document non-obvious logic.

---

## Step 4: Validate

After all changes:

1. Run the project's existing lint and format tools (e.g., `eslint --fix`, `prettier --write`, `ktlint -F`, or equivalent). If none are configured, skip gracefully.
2. Verify there are no broken imports or missing references from the restructure.
3. Confirm the build still passes if a build command is available.

---

## Constraints

- **Preserve all existing behavior.** This is a refactor, not a feature change.
- **Do not change external APIs, exported function signatures, or public interfaces** unless fixing an obvious mistake.
- **Do not introduce new dependencies.**
- **Do not over-engineer.** If something is simple and clear in one file, leave it in one file.
- **Adapt to the project's stack.** Detect whether this is React, React Native, Kotlin, Python, etc., and follow that ecosystem's conventions and idioms.

---

## Step 5: Summary

After completing all changes, output a **concise changelog** in this format:
```
## Refactor Summary

### Files Created
- `path/to/new/file` — reason

### Files Modified
- `path/to/file` — what changed and why

### Files Deleted
- `path/to/file` — reason (e.g., merged into X)

### Key Decisions
- Brief notes on any non-obvious choices made during the refactor.
```
