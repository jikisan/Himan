import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { centavosToInput, parsePesos, periodLabel, utilityBillInputSchema } from '@himan/shared/rentals';
import type { MeterKind, RentalTenancy, RentalUnit, UtilityBill, UtilityBillInput } from '@himan/shared/rentals';
import { Field, MoneyInput } from './Field';
import { errorMessage } from '../utils/errorMessage';
import { useFieldErrors } from '@core/presentation/hooks';
import { FormErrorBanner } from '@core/presentation/components';

const LABEL: Record<MeterKind, string> = { electric: 'Electricity', water: 'Water' };

/** One ₱ box per room and utility billed by the month's actual bill; saved for the month shown. */
export function BillAmountsDialog({ open, onOpenChange, units, tenancies, utilityBills, period, needed, busy, onSave }: {
  open: boolean; onOpenChange(open: boolean): void; units: RentalUnit[]; tenancies: RentalTenancy[]; utilityBills: UtilityBill[];
  period: string; needed: Set<string>; busy: boolean; onSave(inputs: UtilityBillInput[]): Promise<void>;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
      <DialogHeader><DialogTitle>{periodLabel(period)} bill amounts</DialogTitle>
        <DialogDescription>Type the total on each bill. It goes on that month’s SOA.</DialogDescription></DialogHeader>
      {open && <AmountsForm units={units} tenancies={tenancies} utilityBills={utilityBills} period={period} needed={needed} busy={busy}
        onCancel={() => onOpenChange(false)} onSave={async (inputs) => { await onSave(inputs); onOpenChange(false); }} />}
    </DialogContent>
  </Dialog>;
}

function AmountsForm({ units, tenancies, utilityBills, period, needed, busy, onSave, onCancel }: {
  units: RentalUnit[]; tenancies: RentalTenancy[]; utilityBills: UtilityBill[]; period: string; needed: Set<string>; busy: boolean;
  onSave(inputs: UtilityBillInput[]): Promise<void>; onCancel(): void;
}) {
  const items = units.flatMap((unit) => (['electric', 'water'] as const)
    .filter((kind) => (kind === 'electric' ? unit.electricMode : unit.waterMode) === 'monthly')
    .map((kind) => ({ unit, kind, key: `${unit.id}:${kind}`,
      saved: utilityBills.find((b) => b.unitId === unit.id && b.kind === kind && b.period === period) })))
    .sort((a, b) => Number(needed.has(b.key)) - Number(needed.has(a.key)));
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((i) => [i.key, i.saved ? centavosToInput(i.saved.amountCentavos) : ''])));
  const fe = useFieldErrors();
  const sharing = (unit: RentalUnit) => tenancies.filter((t) => t.unitId === unit.id && t.moveOut === null).length;
  const changed = items.filter((i) => values[i.key]?.trim() && values[i.key] !== (i.saved ? centavosToInput(i.saved.amountCentavos) : ''));

  return <form noValidate className="space-y-4" onSubmit={async (event) => {
    event.preventDefault();
    fe.clear();
    if (!changed.length) { if (items.length) fe.fail(`amount-${items[0].key}`, 'Type at least one amount'); return; }
    const inputs: UtilityBillInput[] = [];
    const failed: [string, string][] = [];
    for (const i of changed) {
      let message: string;
      try {
        const parsed = utilityBillInputSchema.safeParse({ unitId: i.unit.id, kind: i.kind, period, amountCentavos: parsePesos(values[i.key]) });
        if (parsed.success) { inputs.push(parsed.data); continue; }
        message = parsed.error.issues[0].message;
      } catch (failure) { message = errorMessage(failure); }
      failed.push([`amount-${i.key}`, message]);
    }
    if (failed.length) { fe.failMany(failed); return; }
    try { await onSave(inputs); } catch (failure) { fe.setFormError(errorMessage(failure)); }
  }}>
    <FormErrorBanner message={fe.formError} />
    <fieldset disabled={busy} className="space-y-4">
      {items.map((i) => {
        const people = sharing(i.unit);
        return <Field key={i.key} id={`amount-${i.key}`} label={`${i.unit.name} · ${LABEL[i.kind]}`}
          hint={needed.has(i.key) ? 'Needed for an SOA' : i.saved ? 'Saved' : undefined} error={fe.errors[`amount-${i.key}`]}>
          <MoneyInput id={`amount-${i.key}`} {...fe.invalid(`amount-${i.key}`)} value={values[i.key] ?? ''} placeholder="Amount on the bill"
            onChange={(e) => { setValues((v) => ({ ...v, [i.key]: e.target.value })); fe.clear(`amount-${i.key}`); }} />
          {people > 1 && <p className="text-xs text-muted-foreground">Split between {people} tenants.</p>}
        </Field>;
      })}
      <p className="text-xs text-muted-foreground">SOAs already generated keep the amount they had. Cancel one and generate it again to use a new amount.</p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="h-11 sm:h-9" disabled={busy || !changed.length}>Save amounts</Button>
      </div>
    </fieldset>
  </form>;
}
