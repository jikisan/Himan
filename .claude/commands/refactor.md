---
description: Improve code quality, structure, and maintainability without changing existing architecture
allowed-tools: Read, Edit, MultiEdit
---

You have full access to the existing project. Refactor and improve the code while **respecting the current architecture, folder structure, and conventions**.

This is an **incremental refactor**, not a redesign.

---

## Goals

Refactor the code to improve:

- Cleanliness
- Readability
- Maintainability
- Scalability (within existing structure)

---

## Core Principles

Apply consistently:

- Single Responsibility Principle (SRP)
- DRY (Don't Repeat Yourself)
- Clear and descriptive naming
- Consistent formatting and style
- Proper error handling
- Remove dead code and unused imports
- Optimize performance where applicable

---

## Refactoring Guidelines

- **Do NOT introduce new architectural patterns** unless absolutely necessary.
- **Do NOT reorganize folder structure** unless there is a clear, measurable benefit.
- **Preserve existing design decisions and conventions.**
- Extract:
  - Reusable UI into existing shared components
  - Business logic into existing hooks or utilities
- Split large components into smaller ones **only when it improves clarity**.
- Avoid over-engineering.

---

## Component & Hook Separation

When beneficial:

- Move state management, side-effects, and business logic into **existing hooks**.
- Keep components focused on rendering and UI interactions.
- Reuse existing patterns already present in the project.

---

## Documentation Rules

- Keep TSDoc/JSDoc concise.
- Prefer readable code over comments.
- Use `@example` only for complex or non-obvious logic.

---

## Output Requirements

- Modify multiple files only when necessary.
- Maintain backward compatibility.
- Preserve existing behavior.
- Ensure formatting, linting, and typing remain consistent with the project.

---

## Final Deliverable

Produce a **cleaner, more readable, and maintainable version of the codebase** without altering its established architecture.