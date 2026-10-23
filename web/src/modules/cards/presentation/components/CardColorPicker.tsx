import { Check } from 'lucide-react';
import {
  CARD_COLOR_PRESETS,
  cardForegroundFor,
  normalizeCardColor,
} from '@himan/shared/cards';
import { Label } from '@/components/ui/label';

interface CardColorPickerProps {
  value: string | null;
  onChange: (color: string | null) => void;
}

const swatch =
  'relative h-11 w-11 rounded-full border border-black/10 shadow-sm transition-transform duration-150 ease-out hover:scale-105 active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export const CardColorPicker = ({ value, onChange }: CardColorPickerProps) => {
  const current = normalizeCardColor(value);
  const preset = CARD_COLOR_PRESETS.find((p) => p.hex === current);
  const isCustom = !!current && !preset;
  const label = !current ? 'Automatic (matches card brand)' : preset ? preset.name : `Custom ${current}`;

  return (
    <div className="space-y-2">
      <Label id="cardColor-label">Card Color</Label>
      <div role="radiogroup" aria-labelledby="cardColor-label" className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          role="radio"
          aria-checked={!current}
          aria-label="Automatic"
          onClick={() => onChange(null)}
          className={`${swatch} grid place-items-center bg-gradient-to-br from-indigo-700 to-sky-500 text-white`}
        >
          {!current && <Check className="h-5 w-5" />}
        </button>
        {CARD_COLOR_PRESETS.map((p) => (
          <button
            key={p.hex}
            type="button"
            role="radio"
            aria-checked={current === p.hex}
            aria-label={p.name}
            onClick={() => onChange(p.hex)}
            className={`${swatch} grid place-items-center`}
            style={{ backgroundColor: p.hex, color: cardForegroundFor(p.hex) }}
          >
            {current === p.hex && <Check className="h-5 w-5" />}
          </button>
        ))}
        <label
          className={`${swatch} grid cursor-pointer place-items-center overflow-hidden`}
          style={{
            background: isCustom
              ? current!
              : 'conic-gradient(#f43f5e,#f59e0b,#84cc16,#06b6d4,#6366f1,#d946ef,#f43f5e)',
            color: isCustom ? cardForegroundFor(current!) : '#ffffff',
          }}
        >
          <input
            type="color"
            aria-label="Custom color"
            value={current ?? '#4f46e5'}
            onChange={(e) => onChange(normalizeCardColor(e.target.value))}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          {isCustom && <Check className="pointer-events-none h-5 w-5" />}
        </label>
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Color: <span className="font-medium text-foreground">{label}</span>
        {!current ? null : (
          <>
            {' · '}
            <button type="button" className="underline underline-offset-2" onClick={() => onChange(null)}>
              Use automatic color
            </button>
          </>
        )}
      </p>
      <p className="text-xs text-muted-foreground">
        Tap the rainbow circle to pick any custom color. Text on the card adjusts so it stays easy to read.
      </p>
    </div>
  );
};
