import { useCallback, useEffect, useState } from 'react';
import type { ZodError } from 'zod';

function reveal(el: HTMLElement) {
  for (let d = el.closest('details'); d; d = d.parentElement?.closest('details') ?? null) d.open = true;
  const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView?.({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
}

/**
 * Per-field validation errors for a form. Field ids are the inputs' DOM ids.
 * After `fail`/`failMany` the first failed field in DOM order is revealed (closed `<details>` opened),
 * scrolled to the center and focused. `setFormError` scrolls the `FormErrorBanner` (`[data-form-error]`) instead.
 * Spread `invalid(id)` on the input, render `<FieldError id={id} message={errors[id]} />` under it,
 * and call `clear(id)` from its onChange.
 */
export function useFieldErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormErrorState] = useState('');
  // Bumped on every failure so a repeated failure on the same field re-focuses it.
  const [reveal_, setReveal] = useState<{ kind: 'field' | 'form'; n: number } | null>(null);

  useEffect(() => {
    if (!reveal_) return;
    if (reveal_.kind === 'form') {
      // ponytail: global lookup; only a form with an error renders its banner, so one match.
      const banner = document.querySelector<HTMLElement>('[data-form-error]');
      if (banner) reveal(banner);
      return;
    }
    const first = Object.keys(errors)
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el)
      .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))[0];
    if (!first) return;
    reveal(first);
    first.focus({ preventScroll: true });
    // Only re-run when a new failure is requested, not on every clear().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal_]);

  const failMany = useCallback((entries: [fieldId: string, message: string][]) => {
    if (!entries.length) return;
    setErrors((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    setReveal((r) => ({ kind: 'field', n: (r?.n ?? 0) + 1 }));
  }, []);

  const fail = useCallback((fieldId: string, message: string) => failMany([[fieldId, message]]), [failMany]);

  const setFormError = useCallback((message: string) => {
    setFormErrorState(message);
    if (message) setReveal((r) => ({ kind: 'form', n: (r?.n ?? 0) + 1 }));
  }, []);

  /** Clears one field's error, or every error (fields and form-level) when called without an id. */
  const clear = useCallback((fieldId?: string) => {
    if (fieldId === undefined) {
      setErrors((prev) => (Object.keys(prev).length ? {} : prev));
      setFormErrorState('');
      return;
    }
    setErrors((prev) => {
      if (!(fieldId in prev)) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }, []);

  const invalid = useCallback((fieldId: string) => ({
    'aria-invalid': errors[fieldId] ? (true as const) : undefined,
    'aria-describedby': errors[fieldId] ? `${fieldId}-error` : undefined,
  }), [errors]);

  return { errors, fail, failMany, clear, formError, setFormError, invalid };
}

/** Maps zod issues to `[fieldId, message]`, first message per field, issue order kept. `idOf` returns null to skip a path. */
export function zodFieldErrors(error: ZodError, idOf: (path: PropertyKey[]) => string | null): [string, string][] {
  const out = new Map<string, string>();
  for (const issue of error.issues) {
    const id = idOf(issue.path);
    if (id && !out.has(id)) out.set(id, issue.message);
  }
  return [...out];
}
