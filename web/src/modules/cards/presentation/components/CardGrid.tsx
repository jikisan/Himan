import type { CreditCardType } from '../../domain';
import { CardCard } from './CardCard';
import { CARD_TYPES } from './cardOptions';

interface CardGridProps {
  cards: CreditCardType[];
  onEdit: (card: CreditCardType) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

const UNSPECIFIED_TYPE = 'Other';

export const CardGrid = ({
  cards,
  onEdit,
  onDelete,
  onToggleFavorite,
}: CardGridProps) => {
  if (cards.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        No cards found
      </div>
    );
  }

  const groups = new Map<string, CreditCardType[]>();
  for (const card of cards) {
    const type = card.cardType || UNSPECIFIED_TYPE;
    const group = groups.get(type);
    if (group) {
      group.push(card);
    } else {
      groups.set(type, [card]);
    }
  }

  for (const group of groups.values()) {
    group.sort((a, b) => a.cardName.localeCompare(b.cardName));
  }

  const orderedTypes = [...CARD_TYPES, UNSPECIFIED_TYPE].filter((type) => groups.has(type));

  return (
    <div className="flex-1 overflow-auto p-6 space-y-8">
      {orderedTypes.map((type) => (
        <div key={type}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {type} ({groups.get(type)!.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {groups.get(type)!.map((card) => (
              <CardCard
                key={card.id}
                card={card}
                onEdit={() => onEdit(card)}
                onDelete={() => onDelete(card.id)}
                onToggleFavorite={() => onToggleFavorite(card.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};