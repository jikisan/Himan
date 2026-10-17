import { z } from 'zod';
import type { MeterReading, RentalBill, RentalContract, RentalProperty, RentalTenancy, RentalUnit, Renter, RenterFile, UtilityBill } from '../domain/index.js';
import { METER_KINDS, RENTAL_ROLES, UTILITY_MODES, storedBillLineSchema, storedChargeSchema } from '../domain/index.js';

export const unitRow = z.object({
  id: z.string(), property_id: z.string(), name: z.string(), kind: z.enum(['whole', 'room', 'bedspace']),
  capacity: z.number(), electric_mode: z.enum(UTILITY_MODES), electric_amount_centavos: z.number(),
  water_mode: z.enum(UTILITY_MODES), water_amount_centavos: z.number(),
  default_rent_centavos: z.number().default(0), extra_person_rent_centavos: z.number().default(0),
}).transform((r): RentalUnit => ({
  id: r.id, propertyId: r.property_id, name: r.name, kind: r.kind, capacity: r.capacity,
  electricMode: r.electric_mode, electricAmountCentavos: r.electric_amount_centavos,
  waterMode: r.water_mode, waterAmountCentavos: r.water_amount_centavos, defaultRentCentavos: r.default_rent_centavos,
  extraPersonRentCentavos: r.extra_person_rent_centavos,
}));

export const propertyRow = z.object({
  id: z.string(), created_by: z.string(), name: z.string(), address: z.string(), owner_name: z.string(),
  owner_address: z.string(), lessor_name: z.string(), lessor_civil_status: z.string(), lessor_address: z.string(),
  lessor_capacity: z.enum(['owner', 'representative']), signing_city: z.string(), invoice_prefix: z.string(),
  archived_at: z.string().nullable(), created_at: z.string(), updated_at: z.string(),
  late_fee_centavos: z.number().default(0), rent_due_day: z.number().nullable().default(null),
  units: z.array(unitRow).default([]), members: z.array(z.object({ role: z.enum(RENTAL_ROLES) })).min(1),
}).transform((r): RentalProperty => ({
  id: r.id, createdBy: r.created_by, name: r.name, address: r.address, ownerName: r.owner_name,
  ownerAddress: r.owner_address, lessorName: r.lessor_name, lessorCivilStatus: r.lessor_civil_status,
  lessorAddress: r.lessor_address, lessorCapacity: r.lessor_capacity, signingCity: r.signing_city,
  invoicePrefix: r.invoice_prefix, lateFeeCentavos: r.late_fee_centavos, rentDueDay: r.rent_due_day, archivedAt: r.archived_at, createdAt: r.created_at, updatedAt: r.updated_at,
  role: r.members[0].role, units: [...r.units].sort((a, b) => a.name.localeCompare(b.name)),
}));

export const fileRow = z.object({
  id: z.string(), renter_id: z.string(), property_id: z.string(), name: z.string(), mime_type: z.string(),
  size: z.number(), storage_path: z.string(), ready: z.boolean(),
}).transform((r): RenterFile => ({
  id: r.id, renterId: r.renter_id, propertyId: r.property_id, name: r.name, mimeType: r.mime_type,
  size: r.size, storagePath: r.storage_path, ready: r.ready,
}));

export const renterRow = z.object({
  id: z.string(), property_id: z.string(), full_name: z.string(), phone: z.string(), facebook: z.string(),
  email: z.string(), address: z.string(), emergency_name: z.string(), emergency_phone: z.string(),
  occupants: z.number(), notes: z.string(), files: z.array(fileRow).default([]),
}).transform((r): Renter => ({
  id: r.id, propertyId: r.property_id, fullName: r.full_name, phone: r.phone, facebook: r.facebook,
  email: r.email, address: r.address, emergencyName: r.emergency_name, emergencyPhone: r.emergency_phone,
  occupants: r.occupants, notes: r.notes, files: r.files,
}));

const contractRow = z.object({
  id: z.string(), tenancy_id: z.string(), start_date: z.string(), end_date: z.string(),
  monthly_rent_centavos: z.number(), due_day: z.number(), advance_months: z.number(),
  deposit_centavos: z.number(), status: z.enum(['draft', 'active', 'ended']),
}).transform((r): RentalContract => ({
  id: r.id, tenancyId: r.tenancy_id, startDate: r.start_date, endDate: r.end_date,
  monthlyRentCentavos: r.monthly_rent_centavos, dueDay: r.due_day, advanceMonths: r.advance_months,
  depositCentavos: r.deposit_centavos, status: r.status,
}));

export const tenancyRow = z.object({
  id: z.string(), property_id: z.string(), unit_id: z.string(), renter_id: z.string(),
  move_in: z.string(), move_out: z.string().nullable(), contracts: z.array(contractRow).default([]),
  charges: z.array(storedChargeSchema).default([]),
}).transform((r): RentalTenancy => ({
  id: r.id, propertyId: r.property_id, unitId: r.unit_id, renterId: r.renter_id,
  moveIn: r.move_in, moveOut: r.move_out, charges: r.charges,
  contracts: [...r.contracts].sort((a, b) => b.startDate.localeCompare(a.startDate)),
}));

export const readingRow = z.object({
  id: z.string(), property_id: z.string(), unit_id: z.string(), kind: z.enum(METER_KINDS), read_on: z.string(),
  value: z.coerce.number(), is_reset: z.boolean(),
}).transform((r): MeterReading => ({
  id: r.id, propertyId: r.property_id, unitId: r.unit_id, kind: r.kind, readOn: r.read_on, value: r.value, isReset: r.is_reset,
}));

export const utilityBillRow = z.object({
  id: z.string(), property_id: z.string(), unit_id: z.string(), kind: z.enum(METER_KINDS), period: z.string(), amount_centavos: z.number(),
}).transform((r): UtilityBill => ({ id: r.id, propertyId: r.property_id, unitId: r.unit_id, kind: r.kind, period: r.period, amountCentavos: r.amount_centavos }));

export const billRow = z.object({
  id: z.string(), property_id: z.string(), tenancy_id: z.string(), kind: z.enum(['move_in', 'monthly', 'final']),
  period: z.string(), number: z.string(), issued_on: z.string(), due_on: z.string(), lines: z.array(storedBillLineSchema),
  status: z.enum(['issued', 'void']), void_reason: z.string(),
}).transform((r): RentalBill => ({
  id: r.id, propertyId: r.property_id, tenancyId: r.tenancy_id, kind: r.kind, period: r.period, number: r.number,
  issuedOn: r.issued_on, dueOn: r.due_on, lines: r.lines, status: r.status, voidReason: r.void_reason,
}));

// RAISE EXCEPTION (P0001) messages are written for people; pass them through.
export function rentalError(error: unknown, fallback: string,
  duplicate = 'That name is already used in this property'): Error {
  const { code, message } = (error ?? {}) as { code?: string; message?: string };
  if (code === 'P0001' && message) return new Error(message);
  if (code === '23503') return new Error(fallback);
  if (code === '23505') return new Error(duplicate);
  if (code === '42501') return new Error('You don’t have permission to do that');
  return error instanceof Error ? error : new Error(fallback);
}
