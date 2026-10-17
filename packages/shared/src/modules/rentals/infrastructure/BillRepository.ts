import { z } from 'zod';
import { getSupabase } from '../../../config/index.js';
import { billLineSchema, readingInputSchema } from '../domain/index.js';
import type { BillLine, MeterReading, ReadingInput, RentalBill } from '../domain/index.js';
import { billRow, readingRow, rentalError } from './rows.js';

export interface IssueBillInput { tenancyId: string; kind: RentalBill['kind']; period: string; dueOn: string; lines: BillLine[] }
const lines = z.array(billLineSchema).min(1, 'A bill needs at least one line');

export class BillRepository {
  async findAll(): Promise<RentalBill[]> {
    const { data, error } = await getSupabase().from('rental_bills').select('*')
      .order('issued_on', { ascending: false }).order('number', { ascending: false });
    if (error) throw rentalError(error, 'Could not load bills');
    // Fail closed: silently dropping an issued bill would let its month or readings be billed again.
    return z.array(billRow).parse(data);
  }

  async findReadings(): Promise<MeterReading[]> {
    const { data, error } = await getSupabase().from('rental_meter_readings').select('*').order('read_on').order('id');
    if (error) throw rentalError(error, 'Could not load meter readings');
    return z.array(readingRow).parse(data);
  }

  /** Numbers and saves the bill in one RPC; returns its id. */
  async issue(input: IssueBillInput): Promise<string> {
    const v = lines.parse(input.lines);
    const { data, error } = await getSupabase().rpc('rental_issue_bill', { p_tenancy_id: input.tenancyId, p_kind: input.kind,
      p_period: input.period, p_due_on: input.dueOn, p_lines: v });
    if (error) throw rentalError(error, 'Could not issue the bill', 'This tenant already has a bill for that month');
    return z.string().parse(data);
  }

  async updateLines(id: string, input: BillLine[]): Promise<void> {
    const { error } = await getSupabase().from('rental_bills').update({ lines: lines.parse(input) }).eq('id', id).select('id').single();
    if (error) throw rentalError(error, 'Could not save the bill');
  }

  async void(id: string, reason: string): Promise<void> {
    const { error } = await getSupabase().from('rental_bills').update({ status: 'void', void_reason: reason.trim().slice(0, 300) })
      .eq('id', id).eq('status', 'issued').select('id').single();
    if (error) throw rentalError(error, 'Could not cancel the bill');
  }

  /** Adds readings; a reading for a meter and day that already has one corrects it (refused if an issued bill used it). */
  async saveReadings(propertyId: string, inputs: ReadingInput[]): Promise<MeterReading[]> {
    const valid = z.array(readingInputSchema).min(1).parse(inputs);
    const table = () => getSupabase().from('rental_meter_readings');
    const { data: found, error: lookup } = await table().select('id, unit_id, kind, read_on')
      .eq('property_id', propertyId).in('read_on', [...new Set(valid.map((r) => r.readOn))]);
    if (lookup) throw rentalError(lookup, 'Could not save the readings');
    const existing = (found ?? []) as { id: string; unit_id: string; kind: string; read_on: string }[];
    const idOf = (r: ReadingInput) => existing.find((f) => f.unit_id === r.unitId && f.kind === r.kind && f.read_on === r.readOn)?.id;
    const saved: unknown[] = [];
    const fresh = valid.filter((r) => !idOf(r)).map((r) => ({ property_id: propertyId, unit_id: r.unitId,
      kind: r.kind, read_on: r.readOn, value: r.value, is_reset: r.isReset }));
    if (fresh.length) {
      const { data, error } = await table().insert(fresh).select('*');
      if (error) throw rentalError(error, 'Could not save the readings', 'There is already a reading for that room on that date');
      saved.push(...(data ?? []));
    }
    for (const r of valid) {
      const id = idOf(r);
      if (!id) continue;
      const { data, error } = await table().update({ value: r.value, is_reset: r.isReset }).eq('id', id).select('*').single();
      if (error) throw rentalError(error, 'Could not correct the reading');
      saved.push(data);
    }
    return z.array(readingRow).parse(saved);
  }

  async removeReading(id: string): Promise<void> {
    const { error } = await getSupabase().from('rental_meter_readings').delete().eq('id', id).select('id').single();
    if (error) throw rentalError(error, 'Could not delete the reading');
  }
}
