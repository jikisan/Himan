import { z } from 'zod';
import { format } from 'date-fns';

export const MIN_KG = 20;
export const MAX_KG = 500;
export const MIN_HEIGHT_CM = 50;
export const MAX_HEIGHT_CM = 260;

const kg = z.number().min(MIN_KG, `Enter at least ${MIN_KG} kg`).max(MAX_KG, `Enter at most ${MAX_KG} kg`);

export const weightEntrySchema = z.object({
  entryDate: z.iso.date('Choose a date'),
  kg,
});
export type WeightEntryInput = z.infer<typeof weightEntrySchema>;

export const weightSettingsSchema = z.object({
  heightCm: z.number().min(MIN_HEIGHT_CM, `Enter at least ${MIN_HEIGHT_CM} cm`).max(MAX_HEIGHT_CM, `Enter at most ${MAX_HEIGHT_CM} cm`).nullable(),
  goalKg: kg.nullable(),
});
export type WeightSettings = z.infer<typeof weightSettingsSchema>;

export interface WeightEntry extends WeightEntryInput {
  id: string;
}

export type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obese';

/** WHO cut-offs: <18.5, 18.5–24.9, 25–29.9, 30+. */
export const BMI_CUTOFFS = { underweight: 18.5, overweight: 25, obese: 30 } as const;

export const BMI_LABELS: Record<BmiCategory, string> = {
  underweight: 'Underweight', normal: 'Normal', overweight: 'Overweight', obese: 'Obese',
};

export function calcBmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < BMI_CUTOFFS.underweight) return 'underweight';
  if (bmi < BMI_CUTOFFS.overweight) return 'normal';
  if (bmi < BMI_CUTOFFS.obese) return 'overweight';
  return 'obese';
}

export interface WeightProgress {
  /** 0–1, how far from the first logged weight to the goal. Works for loss and gain. */
  fraction: number;
  /** Signed kg still to go; negative once the goal is passed. 0 means reached. */
  remainingKg: number;
  reached: boolean;
}

export function weightProgress(startKg: number, currentKg: number, goalKg: number): WeightProgress {
  const remaining = Math.round((currentKg - goalKg) * 10) / 10;
  const towardGoal = startKg > goalKg ? currentKg <= goalKg : startKg < goalKg ? currentKg >= goalKg : currentKg === goalKg;
  const span = startKg - goalKg;
  const fraction = towardGoal ? 1 : span === 0 ? 0 : Math.min(1, Math.max(0, (startKg - currentKg) / span));
  return { fraction, remainingKg: towardGoal ? 0 : Math.abs(remaining), reached: towardGoal };
}

export const sortEntries = (entries: WeightEntry[]): WeightEntry[] =>
  [...entries].sort((a, b) => a.entryDate.localeCompare(b.entryDate));

export const todayIso = (): string => format(new Date(), 'yyyy-MM-dd');

/** Signed change in kg between the last two entries; null with fewer than two. */
export function lastChange(sorted: WeightEntry[]): number | null {
  if (sorted.length < 2) return null;
  return Math.round((sorted[sorted.length - 1].kg - sorted[sorted.length - 2].kg) * 10) / 10;
}
