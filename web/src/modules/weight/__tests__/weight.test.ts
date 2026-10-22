import { describe, expect, it } from 'vitest';
import { bmiCategory, calcBmi, lastChange, sortEntries, weightEntrySchema, weightProgress, weightSettingsSchema } from '@himan/shared/weight';

const e = (entryDate: string, kg: number) => ({ id: entryDate, entryDate, kg });

describe('BMI', () => {
  it('calculates from kg and cm, rounded to one decimal', () => {
    expect(calcBmi(70, 175)).toBe(22.9);
    expect(calcBmi(100, 180)).toBe(30.9);
  });
  it('uses the WHO cut-offs, lower bound inclusive', () => {
    expect(bmiCategory(18.4)).toBe('underweight');
    expect(bmiCategory(18.5)).toBe('normal');
    expect(bmiCategory(24.9)).toBe('normal');
    expect(bmiCategory(25)).toBe('overweight');
    expect(bmiCategory(29.9)).toBe('overweight');
    expect(bmiCategory(30)).toBe('obese');
  });
});

describe('weightProgress', () => {
  it('measures loss toward a lower goal', () => {
    expect(weightProgress(90, 80, 70)).toEqual({ fraction: 0.5, remainingKg: 10, reached: false });
  });
  it('measures gain toward a higher goal', () => {
    expect(weightProgress(50, 55, 60)).toEqual({ fraction: 0.5, remainingKg: 5, reached: false });
  });
  it('is full once the goal is reached or passed', () => {
    expect(weightProgress(90, 70, 70)).toEqual({ fraction: 1, remainingKg: 0, reached: true });
    expect(weightProgress(90, 65, 70).reached).toBe(true);
    expect(weightProgress(50, 61, 60).fraction).toBe(1);
  });
  it('never goes negative when moving away from the goal', () => {
    expect(weightProgress(90, 95, 70).fraction).toBe(0);
  });
  it('handles starting at the goal', () => {
    expect(weightProgress(70, 70, 70).reached).toBe(true);
    expect(weightProgress(70, 72, 70).fraction).toBe(0);
  });
});

describe('entries and validation', () => {
  it('sorts by date and reports the last change', () => {
    const sorted = sortEntries([e('2026-10-03', 80), e('2026-10-01', 82), e('2026-10-02', 81.5)]);
    expect(sorted.map((x) => x.entryDate)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
    expect(lastChange(sorted)).toBe(-1.5);
    expect(lastChange(sorted.slice(0, 1))).toBeNull();
  });
  it('rejects implausible values', () => {
    expect(weightEntrySchema.safeParse({ entryDate: '2026-10-01', kg: 19 }).success).toBe(false);
    expect(weightEntrySchema.safeParse({ entryDate: 'nope', kg: 70 }).success).toBe(false);
    expect(weightSettingsSchema.safeParse({ heightCm: 40, goalKg: null }).success).toBe(false);
    expect(weightSettingsSchema.safeParse({ heightCm: null, goalKg: null }).success).toBe(true);
  });
});
