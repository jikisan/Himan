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

// Stored per-item CV block selection. Custom refs point at a
// career_cv_blocks row by id; profile refs point at a profile row (or skill
// category) by id/value — resolved against live profile + custom-block data
// at render time, never denormalized into the ref itself.
export type CvBlockRef =
  | { type: 'header' | 'summary' }
  | { type: 'experience' | 'education' | 'project' | 'certificate'; id: string }
  | { type: 'skill'; category: string }
  | { type: 'custom'; id: string };

export interface CareerItemType {
  id: string;
  userId: string;
  name: string;
  cvFilePath: string | null;
  cvLayout: CvBlockRef[] | null;
  shareToken: string;
  portfolioEnabled: boolean;
  portfolioShowEmail: boolean;
  portfolioPortraitPath: string | null;
  portfolioSlug: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CvBlockKind =
  | 'summary'
  | 'experience'
  | 'skills'
  | 'project'
  | 'education'
  | 'certification'
  | 'custom';

export interface CareerCvBlockType {
  id: string;
  userId: string;
  kind: CvBlockKind;
  label: string;
  title: string;
  body: string;
  tags: string[];
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCareerCvBlockDto {
  userId: string;
  kind?: CvBlockKind;
  label?: string;
  title: string;
  body?: string;
  tags?: string[];
  position?: number;
}

export interface UpdateCareerCvBlockDto {
  kind?: CvBlockKind;
  label?: string;
  title?: string;
  body?: string;
  tags?: string[];
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
  cvLayout?: CvBlockRef[] | null;
  portfolioEnabled?: boolean;
  portfolioShowEmail?: boolean;
  portfolioPortraitPath?: string | null;
  portfolioSlug?: string | null;
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
  // Set only when the item's public portfolio is on; otherwise the token
  // renders as [[portfolio_url]] so the gap shows in preview.
  portfolioUrl?: string;
}

export interface ResolveResult {
  text: string;
  missing: string[];
}

export interface LetterHtmlData {
  bodyText: string;
  documentTitle: string;
}

// Public, whitelisted snapshot served by get_career_portfolio(). Dates stay
// ISO strings — this crosses an anonymous RPC boundary, not a repository.
export interface PortfolioProject {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  tech: string[];
  platform: string[];
  startDate: string | null;
  endDate: string | null;
  outcome: string | null;
  proofMetric: string | null;
  proofLabel: string | null;
  category: string | null;
  featured: boolean;
  // Storage paths from the RPC; the page turns them into public URLs.
  images: string[];
}

export interface PortfolioExperience {
  id: string;
  company: string;
  title: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  summary: string | null;
}

export interface PortfolioData {
  itemName: string;
  summary: string | null;
  portraitPath: string | null;
  profile: {
    fullName: string | null;
    headline: string | null;
    bio: string | null;
    location: string | null;
    website: string | null;
    links: Record<string, string>;
    email: string | null;
  };
  projects: PortfolioProject[];
  experiences: PortfolioExperience[];
  skills: string[];
}
