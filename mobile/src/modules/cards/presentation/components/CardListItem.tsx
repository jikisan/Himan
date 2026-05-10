import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CreditCard } from '@himan/shared/cards';
import type { CreditCardType } from '@himan/shared/cards';

interface CardListItemProps {
  card: CreditCardType;
  onPress: (card: CreditCardType) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
}

export const CardListItem = ({ card, onPress, onToggleFavorite }: CardListItemProps) => {
  const entity = new CreditCard(card);
  const isExpired = entity.isExpired();
  const isExpiringSoon = !isExpired && entity.isExpiringSoon(3);
  const masked = entity.getMaskedNumber();
  const brand = entity.getCardBrand();

  const expiryStr = `${String(card.expiryMonth).padStart(2, '0')}/${card.expiryYear}`;

  return (
    <Pressable
      onPress={() => onPress(card)}
      className="mx-4 mb-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden active:opacity-80"
    >
      <View className="flex-row items-center px-4 py-3.5 gap-3">
        {/* Brand indicator */}
        <View className="w-10 h-10 rounded-xl bg-indigo-500/10 items-center justify-center shrink-0">
          <Feather name="credit-card" size={18} color="#6366f1" />
        </View>

        {/* Main info */}
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text
              className="text-sm font-semibold text-gray-900 dark:text-white"
              numberOfLines={1}
            >
              {card.cardName}
            </Text>
            {isExpired && (
              <View className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 rounded">
                <Text className="text-xs font-medium text-red-600 dark:text-red-400">Expired</Text>
              </View>
            )}
            {isExpiringSoon && (
              <View className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 rounded">
                <Text className="text-xs font-medium text-orange-600 dark:text-orange-400">Expiring</Text>
              </View>
            )}
          </View>
          <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono" numberOfLines={1}>
            {masked}
          </Text>
          <View className="flex-row items-center gap-2 mt-0.5">
            <Text className="text-xs text-gray-400 dark:text-gray-500">{expiryStr}</Text>
            {(brand !== 'Unknown' || card.cardIssuer) && (
              <Text className="text-xs text-gray-400 dark:text-gray-500">· {brand}</Text>
            )}
          </View>
        </View>

        {/* Favorite star */}
        <Pressable
          onPress={() => onToggleFavorite(card.id, !card.isFavorite)}
          hitSlop={8}
          className="p-1"
        >
          <Feather
            name={card.isFavorite ? 'star' : 'star'}
            size={18}
            color={card.isFavorite ? '#f59e0b' : '#d1d5db'}
          />
        </Pressable>
      </View>
    </Pressable>
  );
};
