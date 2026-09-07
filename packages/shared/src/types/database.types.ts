/**
 * Supabase-generated database types.
 *
 * PLACEHOLDER — this file is a loose stub so the codebase compiles before the
 * schema has been generated. Replace it with the real, strongly-typed schema:
 *
 *   npm run db:types      (runs: supabase gen types typescript --linked)
 *
 * That command overwrites this entire file with exact table/column/relation
 * types, at which point `getSupabase()` and every repository become fully
 * typed with no further code changes. Do not hand-edit the generated output.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Loose until generated. Kept as a named type so the real schema drops in here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
