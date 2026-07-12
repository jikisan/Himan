import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { CreditCard } from '@himan/shared/cards';
import type { CreditCardType } from '@himan/shared/cards';

interface CardListItemProps {
  card: CreditCardType;
  onPress: (card: CreditCardType) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onCopied?: (label: string) => void;
}

export const CardListItem = ({ card, onPress, onToggleFavorite, onCopied }: CardListItemProps) => {
  const entity = new CreditCard(card);
  const isExpired = entity.isExpired();
  const isExpiringSoon = !isExpired && entity.isExpiringSoon(3);
  const brand = entity.getCardBrand();

  const digits = card.cardNumber.replace(/\D/g, '');
  const last4 = digits.slice(-4);
  const expiryStr = `${String(card.expiryMonth).padStart(2, '0')}/${card.expiryYear}`;

  const handleCopyCardNumber = async () => {
    await Clipboard.setStringAsync(digits);
    onCopied?.('Card number copied');
  };

  const handleCopyCvv = async () => {
    await Clipboard.setStringAsync(card.cvv);
    onCopied?.('CVV copied');
  };

  const subtitle = [
    brand !== 'Unknown' ? brand : null,
    card.bankName || null,
    expiryStr,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View className="mx-4 mb-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Main row */}
      <Pressable
        onPress={() => onPress(card)}
        className="flex-row items-center px-4 pt-4 pb-3 gap-3 active:opacity-75"
      >
        {/* Icon */}
        <View className="w-11 h-11 rounded-xl bg-indigo-500/10 items-center justify-center shrink-0">
          <Feather name="credit-card" size={20} color="#6366f1" />
        </View>

        {/* Info */}
        <View className="flex-1 min-w-0 gap-0.5">
          <View className="flex-row items-center gap-2">
            <Text
              className="text-sm font-semibold text-gray-900 dark:text-white flex-shrink"
              numberOfLines={1}
            >
              {card.cardName}
            </Text>
            {isExpired && (
              <View className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 rounded shrink-0">
                <Text className="text-xs font-medium text-red-600 dark:text-red-400">Expired</Text>
              </View>
            )}
            {isExpiringSoon && (
              <View className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 rounded shrink-0">
                <Text className="text-xs font-medium text-orange-600 dark:text-orange-400">Expiring</Text>
              </View>
            )}
          </View>
          <Text className="text-sm font-mono text-gray-500 dark:text-gray-400">
            •••• •••• •••• {last4}
          </Text>
          {subtitle ? (
            <Text className="text-xs text-gray-400 dark:text-gray-500" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Favorite */}
        <Pressable
          onPress={() => onToggleFavorite(card.id, !card.isFavorite)}
          className="w-11 h-11 items-center justify-center shrink-0"
        >
          <Feather
            name="star"
            size={20}
            color={card.isFavorite ? '#f59e0b' : '#d1d5db'}
          />
        </Pressable>
      </Pressable>

      {/* Action row — full 44pt height targets */}
      <View className="flex-row border-t border-gray-100 dark:border-gray-700">
        <Pressable
          onPress={handleCopyCardNumber}
          className="flex-1 flex-row items-center justify-center gap-2 py-3 active:bg-gray-50 dark:active:bg-gray-700/40"
          style={{ minHeight: 44 }}
        >
          <Feather name="copy" size={15} color="#6366f1" />
          <Text className="text-sm font-medium text-indigo-500">Copy Number</Text>
        </Pressable>

        <View className="w-px bg-gray-100 dark:bg-gray-700" />

        <Pressable
          onPress={handleCopyCvv}
          className="flex-1 flex-row items-center justify-center gap-2 py-3 active:bg-gray-50 dark:active:bg-gray-700/40"
          style={{ minHeight: 44 }}
        >
          <Feather name="copy" size={15} color="#6366f1" />
          <Text className="text-sm font-medium text-indigo-500">Copy CVV</Text>
        </Pressable>
      </View>
    </View>
  );
};
