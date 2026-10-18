import { useEffect, useId, useRef, useState } from 'react';
import SignaturePadLib from 'signature_pad';
import { MAX_SIGNATURE_LENGTH } from '@himan/shared/rentals';
import { Button } from '@/components/ui/button';

/** Makes the PNG smaller (75% each try) until it fits the database limit; null when it can't. */
function fit(canvas: HTMLCanvasElement, dataUrl: string): string | null {
  let url = dataUrl;
  for (let scale = 0.75; url.length > MAX_SIGNATURE_LENGTH && scale > 0.2; scale *= 0.75) {
    const small = document.createElement('canvas');
    small.width = Math.max(1, Math.round(canvas.width * scale));
    small.height = Math.max(1, Math.round(canvas.height * scale));
    const ctx = small.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(canvas, 0, 0, small.width, small.height);
    url = small.toDataURL('image/png');
  }
  return url.length <= MAX_SIGNATURE_LENGTH ? url : null;
}

/**
 * A drawn signature: a full-width canvas with a Clear button. Calls `onChange` with a PNG data URL (≤ 150 KB) after
 * every stroke, or null when cleared. Used by the landlord (property signature, countersign) and the renter link page.
 */
export function SignaturePad({ label, onChange, disabled }: { label: string; onChange(dataUrl: string | null): void; disabled?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  const changeRef = useRef(onChange);
  useEffect(() => { changeRef.current = onChange; }, [onChange]);
  const [error, setError] = useState('');
  const hintId = useId();

  useEffect(() => {
    const canvas = canvasRef.current!;
    const pad = new SignaturePadLib(canvas, { penColor: '#111', minWidth: 0.8, maxWidth: 2.4 });
    padRef.current = pad;
    // Sharp lines on high-density screens; resizing clears a canvas, so the strokes are redrawn.
    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const data = pad.toData();
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d')?.scale(ratio, ratio);
      pad.fromData(data);
    };
    resize();
    window.addEventListener('resize', resize);
    pad.addEventListener('endStroke', () => {
      const url = fit(canvas, pad.toDataURL('image/png'));
      setError(url ? '' : 'Draw your signature again, a little smaller');
      changeRef.current(url);
    });
    return () => { window.removeEventListener('resize', resize); pad.off(); padRef.current = null; };
  }, []);

  useEffect(() => { if (padRef.current) { if (disabled) padRef.current.off(); else padRef.current.on(); } }, [disabled]);

  return <div className="space-y-2">
    <canvas ref={canvasRef} aria-label={label} aria-describedby={hintId} role="img"
      className="block h-40 w-full touch-none rounded-lg border bg-white" />
    <div className="flex items-center justify-between gap-2">
      <p id={hintId} className="text-xs text-muted-foreground">Sign with your finger or mouse inside the box.</p>
      <Button type="button" variant="outline" className="h-11 sm:h-9" disabled={disabled}
        onClick={() => { padRef.current?.clear(); setError(''); changeRef.current(null); }}>Clear<span className="sr-only"> signature</span></Button>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
