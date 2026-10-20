import { UTILITY_MODES } from '@himan/shared/rentals';
import type { UnitInput } from '@himan/shared/rentals';
import type { useFieldErrors } from '@core/presentation/hooks';
import { Field, MoneyInput, inputClass } from './Field';

export type { Utility, UtilityState } from '@himan/shared/rentals';
import type { UtilityState } from '@himan/shared/rentals';

const NAME = { electric: 'Electricity', water: 'Water' } as const;
const RATE = { electric: 'Price per kWh', water: 'Price per m³' } as const;
const MODE_LABEL = { none: 'Not included in rent', submeter: 'By meter reading', fixed: 'Fixed amount monthly', monthly: 'Actual bill amount each month' } as const;

/** Electricity and water: how the tenant is charged, and the price. Shared by the room form and the setup wizard. */
export function UtilityFields({ idPrefix, value, onChange, fe }: {
  idPrefix: string; value: UtilityState; onChange(next: UtilityState): void; fe?: ReturnType<typeof useFieldErrors>;
}) {
  return <>{(['electric', 'water'] as const).map((key) => {
    const amountId = `${idPrefix}-${key}-amount`;
    return <div key={key} className="contents">
      <Field id={`${idPrefix}-${key}`} label={NAME[key]}>
        <select id={`${idPrefix}-${key}`} className={inputClass} value={value.modes[key]}
          onChange={(e) => { fe?.clear(amountId); onChange({ ...value, modes: { ...value.modes, [key]: e.target.value as UnitInput['electricMode'] } }); }}>
          {UTILITY_MODES.map((mode) => <option key={mode} value={mode}>{MODE_LABEL[mode]}</option>)}
        </select>
      </Field>
      {value.modes[key] === 'monthly' ? <p className="self-end pb-2 text-xs text-muted-foreground">You type the amount from the {NAME[key].toLowerCase()} bill each month, in Bills.</p>
        : value.modes[key] === 'none' ? <div className="hidden sm:block" />
        : <Field id={amountId} label={value.modes[key] === 'submeter' ? RATE[key] : `${NAME[key]} per month`} required error={fe?.errors[amountId]}>
          <MoneyInput id={amountId} value={value.amounts[key]} placeholder="0.00" required {...fe?.invalid(amountId)}
            onChange={(e) => { fe?.clear(amountId); onChange({ ...value, amounts: { ...value.amounts, [key]: e.target.value } }); }} />
        </Field>}
    </div>;
  })}</>;
}
