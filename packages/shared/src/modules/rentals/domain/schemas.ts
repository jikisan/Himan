import { z } from 'zod';

export const UNIT_KINDS = ['whole', 'room', 'bedspace'] as const;
export const UTILITY_MODES = ['none', 'submeter', 'fixed', 'monthly'] as const;
export const LESSOR_CAPACITIES = ['owner', 'representative'] as const;
export const RENTAL_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const RENTAL_FILE_LIMIT = 10 * 1024 * 1024;

const centavos = (min: number) => z.number().int().min(min).max(2_000_000_000);
const text = (max: number) => z.string().trim().max(max);
const rent = z.number().int().min(1, 'Enter the monthly rent').max(2_000_000_000, 'That rent is too high');
const dueDay = z.number('Due day is 1–31').int('Due day is 1–31').min(1, 'Due day is 1–31').max(31, 'Due day is 1–31');

export const propertySchema = z.object({
  name: z.string().trim().min(1, 'Enter a property name').max(120),
  address: text(300), ownerName: text(160), ownerAddress: text(300),
  lessorName: text(160), lessorCivilStatus: text(40), lessorAddress: text(300),
  lessorCapacity: z.enum(LESSOR_CAPACITIES), signingCity: text(120),
  invoicePrefix: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{1,10}$/, 'Use 1–10 letters or digits'),
  lateFeeCentavos: centavos(0).default(0),
  /** "Rent is due every [N]" for the whole property; null = each tenant's move-in day. */
  rentDueDay: dueDay.nullable().default(null),
});

export const unitSchema = z.object({
  name: z.string().trim().min(1, 'Enter a room name').max(80),
  kind: z.enum(UNIT_KINDS),
  capacity: z.number().int().min(1).max(50),
  electricMode: z.enum(UTILITY_MODES), electricAmountCentavos: centavos(0),
  waterMode: z.enum(UTILITY_MODES), waterAmountCentavos: centavos(0),
  defaultRentCentavos: centavos(0).default(0),
  extraPersonRentCentavos: centavos(0).default(0),
})
  .refine((u) => u.kind === 'bedspace' || u.capacity === 1, { message: 'Only shared rooms hold more than one tenant', path: ['capacity'] })
  // 'monthly' takes the month's actual bill instead of a price on the room.
  .refine((u) => (u.electricMode === 'none' || u.electricMode === 'monthly') === (u.electricAmountCentavos === 0), { message: 'Enter the electricity rate or amount', path: ['electricAmountCentavos'] })
  .refine((u) => (u.waterMode === 'none' || u.waterMode === 'monthly') === (u.waterAmountCentavos === 0), { message: 'Enter the water rate or amount', path: ['waterAmountCentavos'] });

export const renterSchema = z.object({
  fullName: z.string().trim().min(1, 'Enter the tenant’s name').max(160),
  phone: text(40), facebook: text(200),
  email: z.union([z.literal(''), z.email('Enter a valid email')]),
  address: text(300), emergencyName: text(160), emergencyPhone: text(40),
  occupants: z.number().int().min(1).max(50), notes: text(10000),
});

const tenancyTerms = {
  moveIn: z.iso.date('Choose the move-in date'), startDate: z.iso.date(), endDate: z.iso.date('Choose when the contract ends'),
  monthlyRentCentavos: rent, dueDay,
  advanceMonths: z.number().int().min(0).max(12), depositCentavos: centavos(0),
};
const endsAfterStart = [(t: { startDate: string; endDate: string }) => t.endDate > t.startDate,
  { message: 'Contract must end after it starts', path: ['endDate'] }] as [(t: { startDate: string; endDate: string }) => boolean,
  { message: string; path: string[] }];

/** Contract terms of a move-in, before the unit and tenant ids exist. */
export const tenancyTermsSchema = z.object(tenancyTerms).refine(...endsAfterStart);
export const startTenancySchema = z.object({ unitId: z.guid('Choose a unit'), renterId: z.guid('Choose a renter'), ...tenancyTerms })
  .refine(...endsAfterStart);

export const contractTermsSchema = z.object({
  monthlyRentCentavos: rent, dueDay,
  advanceMonths: z.number('Advance is 0–12 months').int('Advance is 0–12 months').min(0, 'Advance is 0–12 months').max(12, 'Advance is 0–12 months'),
  depositCentavos: centavos(0),
});

export const METER_KINDS = ['electric', 'water'] as const;
export const BILL_LINE_KINDS = ['rent', 'advance', 'deposit', 'charge', 'electric', 'water', 'penalty', 'other'] as const;
const isoDate = z.iso.date();

export const tenancyChargeSchema = z.object({
  label: z.string().trim().min(1, 'Enter a name and amount for each charge').max(60),
  amount: z.number().int().min(1, 'Enter a name and amount for each charge').max(2_000_000_000),
});

export const billLineSchema = z.object({
  kind: z.enum(BILL_LINE_KINDS),
  label: z.string().trim().min(1, 'Enter a name for each line').max(80),
  amount: z.number().int().min(-2_000_000_000).max(2_000_000_000),
  period: z.object({ from: isoDate, to: isoDate }).optional(),
  /** For a utility billed by the month's actual bill: which month's bill, e.g. "2026-10". */
  billMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  meter: z.object({
    readings: z.array(z.string()), fromDate: isoDate, fromValue: z.number(), toDate: isoDate, toValue: z.number(),
    usage: z.number(), rate: z.number().int(), sharedWith: z.number().int().min(1),
  }).optional(),
});

/** Reading back from the database: accepts every line and charge the database accepts (its checks are the
 * authority), so a stored row can never fail to load. Writes still use the stricter schemas above. */
export const storedBillLineSchema = billLineSchema.extend({
  label: z.string(),
  // Meter numbers are only shown on the statement; one that can't be read shows as 0 rather than blocking every bill.
  // `readings` stays strict: it is what stops usage being billed twice.
  meter: z.object({
    readings: z.array(z.string()), fromDate: z.string(), toDate: z.string(),
    fromValue: z.number().catch(0), toValue: z.number().catch(0), usage: z.number().catch(0),
    rate: z.number().int().catch(0), sharedWith: z.number().int().min(1).catch(1),
  }).optional(),
});
export const storedChargeSchema = tenancyChargeSchema.extend({ label: z.string(), amount: z.number().int() });

const twoDecimals = (v: number) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6;
export const utilityBillInputSchema = z.object({
  unitId: z.guid(), kind: z.enum(METER_KINDS), period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  amountCentavos: z.number('Enter the bill amount').int().min(1, 'Enter the bill amount').max(2_000_000_000, 'That amount is too high'),
});
export type UtilityBillInput = z.infer<typeof utilityBillInputSchema>;

export const readingInputSchema = z.object({
  unitId: z.guid(), kind: z.enum(METER_KINDS), readOn: z.iso.date('Choose the reading date'),
  value: z.number('Enter the meter reading').min(0, 'Readings can’t be negative').max(9_999_999_999)
    .refine(twoDecimals, 'Use at most 2 decimals'),
  isReset: z.boolean(),
});

export type PropertyInput = z.infer<typeof propertySchema>;
export type UnitInput = z.infer<typeof unitSchema>;
export type RenterInput = z.infer<typeof renterSchema>;
export type StartTenancyInput = z.infer<typeof startTenancySchema>;
export type ContractTermsInput = z.infer<typeof contractTermsSchema>;

export function validateRentalFile(name: string, mimeType: string | null | undefined, size: number): string {
  if (!name.trim() || name.length > 255) throw new Error('File name must be 1–255 characters');
  if (!Number.isInteger(size) || size <= 0 || size > RENTAL_FILE_LIMIT) throw new Error('Choose a non-empty file up to 10 MB');
  const type = mimeType || ({ pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' } as Record<string, string>)[
    name.split('.').pop()?.toLowerCase() ?? ''];
  if (!RENTAL_FILE_TYPES.some((allowed) => allowed === type)) throw new Error('Choose a PDF, JPEG, or PNG file');
  return type!;
}
export type MeterKind = (typeof METER_KINDS)[number];
export type TenancyCharge = z.infer<typeof tenancyChargeSchema>;
export type BillLine = z.infer<typeof billLineSchema>;
export type ReadingInput = z.infer<typeof readingInputSchema>;
