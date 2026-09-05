import type { ProfileType } from '../types/index.js';

// Tokens a CV custom block's {{placeholders}} resolve against: profile
// contact fields plus every social/other link keyed by its link key
// (github, linkedin, twitter, ...). Blank values are dropped so an unset
// token resolves to nothing rather than printing a stray key.
export function profileTokens(profile: ProfileType): Record<string, string> {
  const source: Record<string, string | null | undefined> = {
    name: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    website: profile.website,
    location: profile.location,
    ...profile.links,
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
] as const;
