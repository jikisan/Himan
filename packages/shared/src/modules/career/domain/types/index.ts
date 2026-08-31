export type CareerBlockKind =
  | 'greeting'
  | 'opening'
  | 'experience_line'
  | 'proof'
  | 'portfolio_line'
  | 'close'
  | 'cv_summary';

// A concrete variant, never a filter. On CareerItemBlockType, null means
// "include in every variant" — there is deliberately no 'any' member.
export type CareerLength = 'short' | 'long';

export type CareerRenderKind = 'cover_letter' | 'cv';

export interface CareerBlockType {
  id: string;
  userId: string;
  kind: CareerBlockKind;
  label: string;
  body: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CareerBlockWithUsageType extends CareerBlockType {
  itemCount: number;
}

export interface CareerItemType {
  id: string;
  userId: string;
  name: string;
  cvFilePath: string | null;
  shareToken: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CareerItemBlockType {
  itemId: string;
  blockId: string;
  position: number;
  length: CareerLength | null;
}

// An item block joined with its block's body text, as composeLetter needs.
export interface ComposableBlock {
  blockId: string;
  position: number;
  length: CareerLength | null;
  body: string;
}

export interface CareerRenderType {
  id: string;
  itemId: string;
  kind: CareerRenderKind;
  length: CareerLength;
  jobTitle: string | null;
  company: string | null;
  hiringManager: string | null;
  hook: string | null;
  bodyText: string;
  createdAt: Date;
}

export interface CreateCareerBlockDto {
  userId: string;
  kind: CareerBlockKind;
  label: string;
  body: string;
  tags?: string[];
}

export interface UpdateCareerBlockDto {
  kind?: CareerBlockKind;
  label?: string;
  body?: string;
  tags?: string[];
}

export interface CreateCareerItemDto {
  userId: string;
  name: string;
}

export interface UpdateCareerItemDto {
  name?: string;
  cvFilePath?: string | null;
}

export interface SetItemBlocksDto {
  itemId: string;
  blocks: Array<{ blockId: string; position: number; length: CareerLength | null }>;
}

export interface CreateCareerRenderDto {
  itemId: string;
  kind: CareerRenderKind;
  length: CareerLength;
  jobTitle?: string | null;
  company?: string | null;
  hiringManager?: string | null;
  hook?: string | null;
  bodyText: string;
}

// Values a block's {{placeholders}} resolve against.
export interface PlaceholderCtx {
  jobTitle: string;
  company: string;
  hiringManager?: string;
  hook?: string;
}

export interface ResolveResult {
  text: string;
  missing: string[];
}

export interface LetterHtmlData {
  bodyText: string;
  documentTitle: string;
}
