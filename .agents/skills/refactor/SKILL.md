---
name: refactor
description: Deep-clean and restructure tangled code into clear, single-responsibility modules while preserving behavior.
---

Refactor the project as a structural cleanup, not a surface polish.

## Audit

Before editing:

1. Read the project structure and identify the stack, conventions, and import style.
2. Map bloated files, mixed concerns, duplicated logic, and dead code.
3. Form a refactoring plan.

## Restructure

- Keep one component, hook, utility, type definition, or constant set per file when separation improves clarity.
- For component files, identify distinct visual sections and extract them into descriptive named components such as `ParentSection.tsx`.
- Leave the original component as an orchestrator for state, data fetching, derived values, and composition.
- Pass only the props each extracted component needs.
- Keep section-only helpers local; move shared pure helpers to a dedicated helpers or utils file.
- Put hooks and side effects in hooks, shared types in types, and constants in constants files when they are reused.
- Use proper named React components for all JSX; do not use JSX-returning plain functions or IIFEs for conditional rendering.
- Keep related loading and empty states together when they belong to one list.
- Promote complex components to a directory with focused sibling files and a barrel export when they have more than three subcomponents.
- Let each component call `useTranslation()` rather than passing translations as props.
- Match existing naming conventions and export only public interfaces from barrel files.

## Clean

- Remove dead code, unused imports, and commented-out blocks.
- Eliminate duplication and simplify nested conditionals with early returns.
- Preserve the project's error-handling patterns.
- Keep documentation minimal and limited to non-obvious logic.

## Validate

After editing:

1. Run the configured lint and format tools, or skip gracefully if none exist.
2. Verify imports and references.
3. Run the available build command.

Preserve existing behavior, external APIs, exported signatures, and public interfaces. Do not add dependencies or split code that is already simple and clear.

## Summary

Report a concise changelog with these sections:

```text
## Refactor Summary

### Files Created
- `path/to/new/file` — reason

### Files Modified
- `path/to/file` — what changed and why

### Files Deleted
- `path/to/file` — reason

### Key Decisions
- Brief notes on non-obvious choices.
```
