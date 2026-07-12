export const cardsKeys = {
  all: ['cards'] as const,
  cards: () => [...cardsKeys.all, 'cards'] as const,
  categories: () => [...cardsKeys.all, 'categories'] as const,
};
