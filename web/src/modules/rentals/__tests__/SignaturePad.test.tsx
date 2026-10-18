import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { SignaturePad } from '../presentation/components/SignaturePad';

// jsdom has no real canvas: stand in for signature_pad and drive its "endStroke" event by hand.
const pad = vi.hoisted(() => ({ instance: null as null | { fire(): void }, dataUrl: '', cleared: 0 }));
vi.mock('signature_pad', () => ({
  default: class {
    private listener: (() => void) | null = null;
    constructor() { pad.instance = this as never; }
    addEventListener(_: string, fn: () => void) { this.listener = fn; }
    fire() { this.listener?.(); }
    toDataURL() { return pad.dataUrl; }
    isEmpty() { return !pad.dataUrl; }
    clear() { pad.cleared++; }
    off() {}
    on() {}
    toData() { return []; }
    fromData() {}
  },
}));

const small = 'data:image/png;base64,AAAA';

beforeEach(() => {
  pad.dataUrl = small; pad.cleared = 0;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn(), scale: vi.fn() } as never);
});
afterEach(() => vi.restoreAllMocks());

describe('SignaturePad', () => {
  it('reports the drawing as a PNG data URL after each stroke, and null on Clear', () => {
    const onChange = vi.fn();
    render(<SignaturePad label="Your signature" onChange={onChange} />);
    expect(screen.getByLabelText('Your signature').tagName).toBe('CANVAS');
    act(() => pad.instance!.fire());
    expect(onChange).toHaveBeenLastCalledWith(small);
    fireEvent.click(screen.getByRole('button', { name: 'Clear signature' }));
    expect(pad.cleared).toBe(1);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('shrinks a signature larger than 150 KB', () => {
    pad.dataUrl = `data:image/png;base64,${'A'.repeat(200_000)}`;
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(small);
    const onChange = vi.fn();
    render(<SignaturePad label="Your signature" onChange={onChange} />);
    act(() => pad.instance!.fire());
    expect(onChange).toHaveBeenLastCalledWith(small);
  });

  it('asks to draw again when it can’t be made small enough', () => {
    pad.dataUrl = `data:image/png;base64,${'A'.repeat(200_000)}`;
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(pad.dataUrl);
    const onChange = vi.fn();
    render(<SignaturePad label="Your signature" onChange={onChange} />);
    act(() => pad.instance!.fire());
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByRole('alert')).toHaveTextContent('Draw your signature again');
  });

  it('says so when the browser can’t draw', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    render(<SignaturePad label="Your signature" onChange={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('can’t draw a signature');
    expect(screen.queryByLabelText('Your signature')).not.toBeInTheDocument();
  });
});
