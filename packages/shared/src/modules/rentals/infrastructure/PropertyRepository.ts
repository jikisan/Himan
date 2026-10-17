import { z } from 'zod';
import { getSupabase } from '../../../config/index.js';
import { propertySchema, unitSchema, RENTAL_ROLES } from '../domain/index.js';
import type { PropertyInput, RentalMember, RentalProperty, UnitInput } from '../domain/index.js';
import { propertyRow, rentalError } from './rows.js';

const memberRow = z.object({ user_id: z.string(), email: z.string(), role: z.enum(RENTAL_ROLES) })
  .transform((r): RentalMember => ({ userId: r.user_id, email: r.email, role: r.role }));

export class PropertyRepository {
  // ponytail: no pagination; a landlord has a handful of properties.
  async findAll(userId: string): Promise<RentalProperty[]> {
    const { data, error } = await getSupabase().from('rental_properties')
      .select('*, units:rental_units(*), members:rental_property_members!inner(role)')
      .eq('members.user_id', userId).order('created_at').order('id');
    if (error) throw rentalError(error, 'Could not load properties');
    return z.array(propertyRow).parse(data);
  }

  async save(id: string | null, input: PropertyInput): Promise<string> {
    const v = propertySchema.parse(input);
    const row = { name: v.name, address: v.address, owner_name: v.ownerName, owner_address: v.ownerAddress,
      lessor_name: v.lessorName, lessor_civil_status: v.lessorCivilStatus, lessor_address: v.lessorAddress,
      lessor_capacity: v.lessorCapacity, signing_city: v.signingCity, invoice_prefix: v.invoicePrefix };
    const query = id ? getSupabase().from('rental_properties').update(row).eq('id', id)
      : getSupabase().from('rental_properties').insert(row);
    // Select only the id: the owner membership row is added by a trigger that the
    // same statement's embed cannot see yet.
    const { data, error } = await query.select('id').single();
    if (error) throw rentalError(error, 'Could not save property');
    return z.object({ id: z.string() }).parse(data).id;
  }

  async setArchived(id: string, archived: boolean): Promise<void> {
    const { error } = await getSupabase().from('rental_properties')
      .update({ archived_at: archived ? new Date().toISOString() : null }).eq('id', id).select('id').single();
    if (error) throw rentalError(error, 'Could not update property');
  }

  async remove(id: string): Promise<void> {
    const { error } = await getSupabase().from('rental_properties').delete().eq('id', id).select('id').single();
    if (error) throw rentalError(error, 'This property has had tenants. Archive it instead.');
  }

  async saveUnit(propertyId: string, id: string | null, input: UnitInput): Promise<void> {
    const v = unitSchema.parse(input);
    const row = { name: v.name, kind: v.kind, capacity: v.capacity, electric_mode: v.electricMode,
      electric_amount_centavos: v.electricAmountCentavos, water_mode: v.waterMode, water_amount_centavos: v.waterAmountCentavos,
      default_rent_centavos: v.defaultRentCentavos, extra_person_rent_centavos: v.extraPersonRentCentavos };
    const query = id ? getSupabase().from('rental_units').update(row).eq('id', id)
      : getSupabase().from('rental_units').insert({ ...row, property_id: propertyId });
    const { error } = await query.select('id').single();
    if (error) throw rentalError(error, 'Could not save room');
  }

  async removeUnit(id: string): Promise<void> {
    const { error } = await getSupabase().from('rental_units').delete().eq('id', id).select('id').single();
    if (error) throw rentalError(error, 'This room has had tenants, so it can’t be deleted');
  }

  async listMembers(propertyId: string): Promise<RentalMember[]> {
    const { data, error } = await getSupabase().rpc('rental_list_members', { p_property_id: propertyId });
    if (error) throw rentalError(error, 'Could not load members');
    return z.array(memberRow).parse(data);
  }

  async addMember(propertyId: string, userId: string, role: 'manager' | 'viewer'): Promise<void> {
    const { error } = await getSupabase().rpc('rental_add_member', { p_property_id: propertyId, p_user_id: userId, p_role: role });
    if (error) throw rentalError(error, 'Could not share property');
  }

  async removeMember(propertyId: string, userId: string): Promise<void> {
    const { error } = await getSupabase().from('rental_property_members').delete()
      .eq('property_id', propertyId).eq('user_id', userId).select('user_id').single();
    if (error) throw rentalError(error, 'Could not remove member');
  }
}
