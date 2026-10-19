/** Message under an invalid field; its id `${id}-error` matches `invalid(id)`'s aria-describedby. Renders nothing without a message. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={`${id}-error`} aria-live="polite" className="text-sm text-destructive">{message}</p>;
}

/** Form-level error (e.g. a server refusal) at the TOP of the form; `setFormError` scrolls it into view via `data-form-error`. */
export function FormErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return <div role="alert" data-form-error
    className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">{message}</div>;
}
