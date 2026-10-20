import { expect } from 'vitest';

// Document order by index: happy-dom's compareDocumentPosition isn't reliable here.
const order = (node: Element) => [...document.querySelectorAll('*')].indexOf(node);
const el = (target: HTMLElement | string) => (typeof target === 'string' ? document.getElementById(target) : target);

/** A failed submit: the field is focused, marked invalid and described by its message right under it (`${id}-error`). */
export function expectFieldError(target: HTMLElement | string, message: string | RegExp) {
  const input = el(target)!;
  expect(input).not.toBeNull();
  expect(document.activeElement).toBe(input);
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(input).toHaveAttribute('aria-describedby', `${input.id}-error`);
  expect(document.getElementById(`${input.id}-error`)).toHaveTextContent(message);
}

/** No field message or alert sits after `button` (the form's action button). */
export function expectNoErrorAfter(button: HTMLElement) {
  for (const error of document.querySelectorAll('[id$="-error"], [role="alert"]'))
    expect(order(error)).toBeLessThan(order(button));
}

/** The field's label carries the hidden `*` and the input itself says it is required. */
export function expectRequired(target: HTMLElement | string) {
  const input = el(target)!;
  const label = [...document.querySelectorAll('label')].find((l) => l.htmlFor === input.id)!;
  expect(label.querySelector('span[aria-hidden="true"]')).toHaveTextContent('*');
  expect(input.hasAttribute('required') || input.getAttribute('aria-required') === 'true').toBe(true);
}

/** A form-level message: one banner, above `firstField`. */
export function expectBanner(message: string | RegExp, firstField: HTMLElement) {
  const banners = document.querySelectorAll('[data-form-error]');
  expect(banners).toHaveLength(1);
  expect(banners[0]).toHaveTextContent(message);
  expect(order(banners[0])).toBeLessThan(order(firstField));
}
