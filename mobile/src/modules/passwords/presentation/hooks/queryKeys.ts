export const passwordsKeys = {
  all: ['passwords'] as const,
  passwords: (filters?: object) => [...passwordsKeys.all, 'list', filters] as const,
  categories: () => [...passwordsKeys.all, 'categories'] as const,
};
