import type { CreditCardType } from '../../domain';
import { CardCard } from './CardCard';

interface CardGridProps {
  cards: CreditCardType[];
  onEdit: (card: CreditCardType) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

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

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {cards.map((card) => (
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
  );
};