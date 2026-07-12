export type TabType = 'to-get' | 'purchased';

export type CollapseLevel = 0 | 1 | 2;

// Re-export CollapseStamp from SessionCategoryGroup to avoid duplication
export type { CollapseStamp } from './SessionCategoryGroup';
