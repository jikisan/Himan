import { z } from 'zod';
import { getSupabase } from '../../../config/index.js';
import { contractTermsSchema, startTenancySchema } from '../domain/index.js';
import type { ContractTermsInput, RentalTenancy, StartTenancyInput } from '../domain/index.js';
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
}
