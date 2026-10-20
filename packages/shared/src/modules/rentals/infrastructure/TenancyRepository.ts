import { z } from 'zod';
import { getSupabase } from '../../../config/index.js';
import { contractTermsSchema, paymentSchema, renterSchema, startTenancySchema, tenancyChargeSchema, tenancyTermsSchema } from '../domain/index.js';
import type { ContractTermsInput, PaymentInput, RentalTenancy, RenterInput, StartTenancyInput, TenancyCharge } from '../domain/index.js';
import { rentalError, tenancyRow } from './rows.js';

export class TenancyRepository {
  async findAll(): Promise<RentalTenancy[]> {
    const { data, error } = await getSupabase().from('rental_tenancies')
      .select('*, contracts:rental_contracts(*)').order('move_in', { ascending: false }).order('id');
    if (error) throw rentalError(error, 'Could not load tenancies');
    return z.array(tenancyRow).parse(data);
  }

  async start(input: StartTenancyInput): Promise<string> {
    const v = startTenancySchema.parse(input);
    const { data, error } = await getSupabase().rpc('rental_start_tenancy', {
      p_unit_id: v.unitId, p_renter_id: v.renterId, p_move_in: v.moveIn, p_start: v.startDate, p_end: v.endDate,
      p_rent: v.monthlyRentCentavos, p_due_day: v.dueDay, p_advance: v.advanceMonths, p_deposit: v.depositCentavos,
    });
    if (error?.message === 'This unit is full') throw new Error('This room is full. Move someone out first, or add a bed.');
    if (error) throw rentalError(error, 'Could not move the tenant in', 'This tenant already lives in this room');
    return z.string().parse(data);
  }

  /** Moves a tenant in (`renter` creates a new person; else `renterId`), issues the move-in bill and records `payment` against it,
   * all in one transaction (`rental_move_in`). `payment` null = pay later. */
  async moveIn(input: Omit<StartTenancyInput, 'renterId'> & { renterId: string | null; renter: RenterInput | null;
    payment: Omit<PaymentInput, 'billId'> | null }): Promise<{ renterId: string; tenancyId: string; billId: string | null; paymentId: string | null }> {
    const v = tenancyTermsSchema.parse(input);
    if (!input.renterId === !input.renter) throw new Error('Choose the tenant');
    const renter = input.renter ? renterSchema.parse(input.renter) : null;
    const payment = input.payment ? paymentSchema.parse(input.payment) : null;
    const { data, error } = await getSupabase().rpc('rental_move_in', {
      p_unit_id: input.unitId, p_renter_id: input.renterId, p_renter: renter, p_move_in: v.moveIn, p_start: v.startDate, p_end: v.endDate,
      p_rent: v.monthlyRentCentavos, p_due_day: v.dueDay, p_advance: v.advanceMonths, p_deposit: v.depositCentavos,
      p_payment: payment && { amount: payment.amountCentavos, paidOn: payment.paidOn, method: payment.method, reference: payment.reference, notes: payment.notes },
    });
    if (error?.message === 'This unit is full') throw new Error('This room is full. Move someone out first, or add a bed.');
    if (error) throw rentalError(error, 'Could not move the tenant in', 'This tenant already lives in this room');
    return z.object({ renterId: z.string(), tenancyId: z.string(), billId: z.string().nullable(), paymentId: z.string().nullable() }).parse(data);
  }

  async end(id: string, moveOut: string): Promise<void> {
    const { error } = await getSupabase().rpc('rental_end_tenancy', { p_tenancy_id: id, p_move_out: moveOut });
    if (error) throw rentalError(error, 'Could not record the move-out');
  }

  async updateTerms(contractId: string, input: ContractTermsInput): Promise<void> {
    const v = contractTermsSchema.parse(input);
    const { error } = await getSupabase().from('rental_contracts')
      .update({ monthly_rent_centavos: v.monthlyRentCentavos, due_day: v.dueDay, advance_months: v.advanceMonths,
        deposit_centavos: v.depositCentavos })
      .eq('id', contractId).eq('status', 'active').select('id').single();
    if (error) throw rentalError(error, 'Could not update rent');
  }

  async setCharges(tenancyId: string, charges: TenancyCharge[]): Promise<void> {
    const v = z.array(tenancyChargeSchema).max(20).parse(charges);
    const { error } = await getSupabase().from('rental_tenancies').update({ charges: v }).eq('id', tenancyId).select('id').single();
    if (error) throw rentalError(error, 'Could not save the extra charges');
  }

  /** Dismisses (or brings back) the nudge to write this tenant's contract. */
  async setContractNotNeeded(tenancyId: string, value: boolean): Promise<void> {
    const { error } = await getSupabase().from('rental_tenancies').update({ contract_not_needed: value }).eq('id', tenancyId).select('id').single();
    if (error) throw rentalError(error, 'Could not save the contract choice');
  }

  /** Ends the active contract and starts a renewal with the new rent from `from`. */
  async changeRent(contractId: string, from: string, rentCentavos: number): Promise<void> {
    const { error } = await getSupabase().rpc('rental_change_rent', { p_contract_id: contractId, p_from: from, p_rent: rentCentavos });
    if (error) throw rentalError(error, 'Could not change the rent');
  }
}
