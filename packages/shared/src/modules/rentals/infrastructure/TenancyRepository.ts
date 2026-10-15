import { z } from 'zod';
import { getSupabase } from '../../../config/index.js';
import { startTenancySchema } from '../domain/index.js';
import type { RentalTenancy, StartTenancyInput } from '../domain/index.js';
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
    if (error) throw rentalError(error, 'Could not start tenancy', 'This renter already has an active tenancy in this unit');
    return z.string().parse(data);
  }

  async end(id: string, moveOut: string): Promise<void> {
    const { error } = await getSupabase().rpc('rental_end_tenancy', { p_tenancy_id: id, p_move_out: moveOut });
    if (error) throw rentalError(error, 'Could not end tenancy');
  }
}
