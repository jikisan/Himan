import { differenceInYears } from 'date-fns';
import type { ProfileType, ExperienceType } from '../types/index.js';

// Whole years between now and the oldest experience's start date — the
// person's total years of work. Null when no experience has a start date.
function yearsOfWork(experiences: ExperienceType[]): string | null {
  const starts = experiences.map((exp) => exp.startDate).filter((d): d is Date => !!d);
  if (!starts.length) return null;
  const oldest = starts.reduce((a, b) => (a < b ? a : b));
  return String(differenceInYears(new Date(), oldest));
}

// Tokens a CV custom block's {{placeholders}} resolve against: profile
// contact fields plus every social/other link keyed by its link key
// (github, linkedin, twitter, ...), plus the career the CV belongs to
// (careerTitle) and total years of work derived from experiences. Blank
// values are dropped so an unset token resolves to nothing rather than
// printing a stray key.
export function profileTokens(
  profile: ProfileType,
  experiences: ExperienceType[] = [],
  careerTitle?: string | null,
): Record<string, string> {
  const source: Record<string, string | null | undefined> = {
    name: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    website: profile.website,
    location: profile.location,
    ...profile.links,
    careerTitle,
    yearsOfWork: yearsOfWork(experiences),
  };
  const tokens: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value && value.trim()) tokens[key] = value.trim();
  }
  return tokens;
}

// Replaces {{token}} with its resolved value; unknown/blank tokens become
// empty so a missing link never prints in a real CV.
export function resolveProfileTokens(text: string, tokens: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => tokens[key] ?? '');
}

// Tokens always advertised in the CV block editor, even before the user sets
// them; the writer's actual link keys are merged on top by the caller.
export const STANDARD_CV_TOKENS = [
  'name',
  'email',
  'phone',
  'website',
  'location',
  'github',
  'linkedin',
  'twitter',
  'careerTitle',
  'yearsOfWork',
] as const;
