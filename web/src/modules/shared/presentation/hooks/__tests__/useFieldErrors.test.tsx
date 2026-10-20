import { describe, it, expect, vi } from 'vitest';
import { act, render, renderHook, screen } from '@testing-library/react';
import { z } from 'zod';
import { useFieldErrors, zodFieldErrors } from '../useFieldErrors';
import { FormErrorBanner } from '../../components/FieldError';

type Api = ReturnType<typeof useFieldErrors>;

function Form({ onApi, inDetails }: { onApi: (api: Api) => void; inDetails?: boolean }) {
  const api = useFieldErrors();
  onApi(api);
  const b = <input id="b" {...api.invalid('b')} />;
  return <form>
    <FormErrorBanner message={api.formError} />
    <input id="a" {...api.invalid('a')} />
    {inDetails ? <details data-testid="details"><summary>More</summary>{b}</details> : b}
    <input id="c" {...api.invalid('c')} />
  </form>;
}

function setup(inDetails = false) {
  let api!: Api;
  render(<Form inDetails={inDetails} onApi={(a) => { api = a; }} />);
  const scroll = vi.fn();
  Element.prototype.scrollIntoView = scroll;
  return { get api() { return api; }, scroll };
}

describe('useFieldErrors', () => {
  it('focuses and scrolls to the first invalid field in DOM order, not call order', () => {
    const t = setup();
    act(() => t.api.failMany([['c', 'C bad'], ['b', 'B bad']]));
    expect(document.activeElement?.id).toBe('b');
    expect(t.scroll).toHaveBeenCalledWith(expect.objectContaining({ block: 'center' }));
    expect(t.scroll.mock.contexts[0]).toBe(document.getElementById('b'));
    expect(t.api.errors).toEqual({ c: 'C bad', b: 'B bad' });
    expect(document.getElementById('b')).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById('b')).toHaveAttribute('aria-describedby', 'b-error');
    expect(document.getElementById('a')).not.toHaveAttribute('aria-invalid');
  });

  it('opens a closed <details> ancestor of the first invalid field', () => {
    const t = setup(true);
    act(() => t.api.fail('b', 'B bad'));
    expect(screen.getByTestId('details')).toHaveProperty('open', true);
    expect(document.activeElement?.id).toBe('b');
  });

  it('clears one field or everything', () => {
    const t = setup();
    act(() => t.api.failMany([['a', 'A'], ['c', 'C']]));
    act(() => t.api.clear('a'));
    expect(t.api.errors).toEqual({ c: 'C' });
    act(() => t.api.setFormError('Server said no'));
    act(() => t.api.clear());
    expect(t.api.errors).toEqual({});
    expect(t.api.formError).toBe('');
  });

  it('scrolls the form-level banner into view on setFormError', () => {
    const t = setup();
    act(() => t.api.setFormError('Server said no'));
    const banner = screen.getByRole('alert');
    expect(banner).toHaveTextContent('Server said no');
    expect(t.scroll.mock.contexts[0]).toBe(banner);
  });

  it('survives an environment without scrollIntoView', () => {
    const { result } = renderHook(() => useFieldErrors());
    render(<input id="x" />);
    // @ts-expect-error simulate a DOM without the API
    Element.prototype.scrollIntoView = undefined;
    act(() => result.current.fail('x', 'bad'));
    expect(document.activeElement?.id).toBe('x');
  });
});

describe('zodFieldErrors', () => {
  it('maps issues to [fieldId, message], first message per field, in order', () => {
    const schema = z.object({ name: z.string().min(1, 'Name required').min(3, 'Too short'), age: z.number(), skip: z.string() });
    const r = schema.safeParse({ name: '', age: 'x', skip: 1 });
    if (r.success) throw new Error('expected failure');
    const ids = zodFieldErrors(r.error, (path) => (path[0] === 'skip' ? null : `f-${String(path[0])}`));
    expect(ids).toEqual([['f-name', 'Name required'], ['f-age', expect.any(String)]]);
  });
});
