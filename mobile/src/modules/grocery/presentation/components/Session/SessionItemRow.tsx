import { Pressable } from 'react-native';
import type { SessionItemType } from '@himan/shared/grocery';
import {Checkbox} from "@/modules/grocery/presentation/shared/Checkbox";
import {ItemRowContent} from "@/modules/grocery/presentation/shared/ItemRowContent";

interface SessionItemRowProps {
  item: SessionItemType;
  onTogglePurchase: (sessionItemId: string, groceryItemId: string | null) => void;
}

export const SessionItemRow = ({
  item,
  onTogglePurchase,
}: SessionItemRowProps) => {
  return (
    <Pressable
      onPress={() => onTogglePurchase(item.id, item.groceryItemId)}
      className={`flex flex-row items-center gap-3 px-3 py-3 rounded-xl ${
        item.isPurchased ? 'opacity-60' : 'bg-white dark:bg-gray-800'
      }`}
    >
      <Checkbox checked={item.isPurchased} color="green" />
      <ItemRowContent
        name={item.name}
        quantity={item.quantity}
        unit={item.unit ?? undefined}
        notes={item.notes ?? undefined}
        price={item.price}
        checked={item.isPurchased}
      />
    </Pressable>
  );
};
