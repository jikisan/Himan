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
    // A malformed row is skipped so it can't stop every other bill from loading.
    return z.array(z.unknown()).parse(data).flatMap((row) => {
      const parsed = billRow.safeParse(row);
      return parsed.success ? [parsed.data] : [];
    });
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

  async saveReadings(propertyId: string, inputs: ReadingInput[]): Promise<MeterReading[]> {
    const rows = z.array(readingInputSchema).min(1).parse(inputs).map((r) => ({ property_id: propertyId, unit_id: r.unitId,
      kind: r.kind, read_on: r.readOn, value: r.value, is_reset: r.isReset }));
    const { data, error } = await getSupabase().from('rental_meter_readings').insert(rows).select('*');
    if (error) throw rentalError(error, 'Could not save the readings', 'There is already a reading for that room on that date');
    return z.array(readingRow).parse(data);
  }

  async removeReading(id: string): Promise<void> {
    const { error } = await getSupabase().from('rental_meter_readings').delete().eq('id', id).select('id').single();
    if (error) throw rentalError(error, 'Could not delete the reading');
  }
}
