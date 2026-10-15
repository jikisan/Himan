import { z } from 'zod';

export const UNIT_KINDS = ['whole', 'room', 'bedspace'] as const;
export const UTILITY_MODES = ['none', 'submeter', 'fixed'] as const;
export const LESSOR_CAPACITIES = ['owner', 'representative'] as const;
export const RENTAL_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const RENTAL_FILE_LIMIT = 10 * 1024 * 1024;

const centavos = (min: number) => z.number().int().min(min).max(2_000_000_000);
const text = (max: number) => z.string().trim().max(max);

export const propertySchema = z.object({
  name: z.string().trim().min(1, 'Enter a property name').max(120),
  address: text(300), ownerName: text(160), ownerAddress: text(300),
  lessorName: text(160), lessorCivilStatus: text(40), lessorAddress: text(300),
  lessorCapacity: z.enum(LESSOR_CAPACITIES), signingCity: text(120),
  invoicePrefix: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{1,10}$/, 'Use 1–10 letters or digits'),
});

export const unitSchema = z.object({
  name: z.string().trim().min(1, 'Enter a unit name').max(80),
  kind: z.enum(UNIT_KINDS),
  capacity: z.number().int().min(1).max(50),
  electricMode: z.enum(UTILITY_MODES), electricAmountCentavos: centavos(0),
  waterMode: z.enum(UTILITY_MODES), waterAmountCentavos: centavos(0),
})
  .refine((u) => u.kind === 'bedspace' || u.capacity === 1, { message: 'Only bedspace units hold more than one renter', path: ['capacity'] })
  .refine((u) => (u.electricMode === 'none') === (u.electricAmountCentavos === 0), { message: 'Enter the electricity rate or amount', path: ['electricAmountCentavos'] })
  .refine((u) => (u.waterMode === 'none') === (u.waterAmountCentavos === 0), { message: 'Enter the water rate or amount', path: ['waterAmountCentavos'] });

export const renterSchema = z.object({
  fullName: z.string().trim().min(1, 'Enter the renter’s name').max(160),
  phone: text(40), facebook: text(200),
  email: z.union([z.literal(''), z.email('Enter a valid email')]),
  address: text(300), emergencyName: text(160), emergencyPhone: text(40),
  occupants: z.number().int().min(1).max(50), notes: text(10000),
});

export const startTenancySchema = z.object({
  unitId: z.guid('Choose a unit'), renterId: z.guid('Choose a renter'),
  moveIn: z.iso.date(), startDate: z.iso.date(), endDate: z.iso.date(),
  monthlyRentCentavos: centavos(1), dueDay: z.number().int().min(1).max(31),
  advanceMonths: z.number().int().min(0).max(12), depositCentavos: centavos(0),
}).refine((t) => t.endDate > t.startDate, { message: 'Contract must end after it starts', path: ['endDate'] });

export type PropertyInput = z.infer<typeof propertySchema>;
export type UnitInput = z.infer<typeof unitSchema>;
export type RenterInput = z.infer<typeof renterSchema>;
export type StartTenancyInput = z.infer<typeof startTenancySchema>;

export function validateRentalFile(name: string, mimeType: string | null | undefined, size: number): string {
  if (!name.trim() || name.length > 255) throw new Error('File name must be 1–255 characters');
  if (!Number.isInteger(size) || size <= 0 || size > RENTAL_FILE_LIMIT) throw new Error('Choose a non-empty file up to 10 MB');
  const type = mimeType || ({ pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' } as Record<string, string>)[
    name.split('.').pop()?.toLowerCase() ?? ''];
  if (!RENTAL_FILE_TYPES.some((allowed) => allowed === type)) throw new Error('Choose a PDF, JPEG, or PNG file');
  return type!;
}
