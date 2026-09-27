import { differenceInYears } from 'date-fns';
import type { PlaceholderCtx, ResolveResult } from '../types/index.js';

// Anchor for {{years_experience}}: update this once when it changes (a new
// first day, not a yearly chore) and every block using the token stays current.
const CAREER_START_DATE = new Date(2022, 4, 1); // May 2022

function valuesFor(ctx: PlaceholderCtx): Record<string, string | undefined> {
  return {
    job_title: ctx.jobTitle,
    company: ctx.company,
    hiring_manager: ctx.hiringManager?.trim() || 'Hiring Team',
    hook: ctx.hook,
    portfolio_url: ctx.portfolioUrl,
    years_experience: String(differenceInYears(new Date(), CAREER_START_DATE)),
  };
}

// Sentences are chunks ending in . ! or ? followed by whitespace, or the
// remainder of the text if nothing terminates it.
function dropSentencesContaining(text: string, marker: string): string {
  const sentences = text.match(/[^.!?]*[.!?]+(?:\s+|$)|[^.!?]+$/g) ?? [text];
  return sentences
    .filter((sentence) => !sentence.includes(marker))
    .join('')
    .trim();
}

// Unresolved tokens render visibly as [[token]] rather than emptying, so a
// missing value is caught in preview instead of in a recruiter's inbox.
export function resolvePlaceholders(text: string, ctx: PlaceholderCtx): ResolveResult {
  const values = valuesFor(ctx);

  let working = text;
  if (!ctx.hook?.trim() && working.includes('{{hook}}')) {
    working = dropSentencesContaining(working, '{{hook}}');
  }

  const missing: string[] = [];
  working = working.replace(/\{\{(\w+)\}\}/g, (_match, token: string) => {
    const value = values[token];
    if (!value) {
      if (!missing.includes(token)) missing.push(token);
      return `[[${token}]]`;
    }
    return value;
  });

  return { text: working, missing };
}
