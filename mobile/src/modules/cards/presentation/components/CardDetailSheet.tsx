import { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { CreditCard } from '@himan/shared/cards';
import type { CreditCardType, CardCategoryType } from '@himan/shared/cards';

interface CardDetailSheetProps {
  card: CreditCardType | null;
  visible: boolean;
  categories: CardCategoryType[];
  onClose: () => void;
  onEdit: (card: CreditCardType) => void;
  onDelete: (card: CreditCardType) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onCopied?: (label: string) => void;
}

export const CardDetailSheet = ({
  card,
  visible,
  categories,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
  onCopied,
}: CardDetailSheetProps) => {
  const [showCardNumber, setShowCardNumber] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const { bottom } = useSafeAreaInsets();

  if (!card) return null;

  const entity = new CreditCard(card);
  const isExpired = entity.isExpired();
  const isExpiringSoon = !isExpired && entity.isExpiringSoon(3);
  const brand = entity.getCardBrand();
  const category = categories.find((c) => c.id === card.categoryId);

  const formattedCardNumber = showCardNumber
    ? card.cardNumber.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim()
    : entity.getMaskedNumber();

  const handleCopyCardNumber = async () => {
    await Clipboard.setStringAsync(card.cardNumber.replace(/\D/g, ''));
    onCopied?.('Card number copied');
  };

  const handleCopyCvv = async () => {
    await Clipboard.setStringAsync(card.cvv);
    onCopied?.('CVV copied');
  };

  const handleClose = () => {
    setShowCardNumber(false);
    setShowCvv(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <Pressable className="absolute inset-0" onPress={handleClose} />

        <View className="bg-white dark:bg-gray-900 rounded-t-3xl max-h-[88%]">
          {/* Drag handle */}
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <View className="flex-row items-center gap-3 flex-1 min-w-0">
              <View className="w-10 h-10 rounded-xl bg-indigo-500/10 items-center justify-center shrink-0">
                <Feather name="credit-card" size={20} color="#6366f1" />
              </View>
              <View className="flex-1 min-w-0">
                <Text
                  className="text-lg font-bold text-gray-900 dark:text-white"
                  numberOfLines={1}
                >
                  {card.cardName}
                </Text>
                <View className="flex-row items-center gap-1.5 flex-wrap">
                  {isExpired && (
                    <Text className="text-xs font-medium text-red-500">Expired</Text>
                  )}
                  {isExpiringSoon && (
                    <Text className="text-xs font-medium text-orange-500">Expiring soon</Text>
                  )}
                  {!isExpired && !isExpiringSoon && brand !== 'Unknown' && (
                    <Text className="text-xs text-gray-500 dark:text-gray-400">{brand}</Text>
                  )}
                </View>
              </View>
            </View>
            <View className="flex-row items-center gap-2 ml-2 shrink-0">
              <Pressable
                onPress={() => onToggleFavorite(card.id, !card.isFavorite)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center"
              >
                <Feather
                  name="star"
                  size={16}
                  color={card.isFavorite ? '#f59e0b' : '#9ca3af'}
                />
              </Pressable>
              <Pressable
                onPress={handleClose}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center"
              >
                <Feather name="x" size={16} color="#6b7280" />
              </Pressable>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 24, gap: 16 }}
          >
            {/* Card number */}
            <DetailRow
              label="Card Number"
              value={formattedCardNumber}
              isSecret
              isShown={showCardNumber}
              onToggleShow={() => setShowCardNumber((v) => !v)}
              onCopy={handleCopyCardNumber}
              mono
            />

            {/* CVV */}
            <DetailRow
              label="CVV"
              value={showCvv ? card.cvv : '•••'}
              isSecret
              isShown={showCvv}
              onToggleShow={() => setShowCvv((v) => !v)}
              onCopy={handleCopyCvv}
            />

            {/* Expiry */}
            <DetailRow
              label="Expiry"
              value={`${String(card.expiryMonth).padStart(2, '0')}/${card.expiryYear}`}
            />

            {/* Optional fields */}
            {card.bankName && <DetailRow label="Bank" value={card.bankName} />}
            {card.cardIssuer && <DetailRow label="Issuer" value={card.cardIssuer} />}
            {card.cardType && <DetailRow label="Type" value={card.cardType} />}
            {category && <DetailRow label="Category" value={category.name} />}
            {card.notes && (
              <View className="gap-1">
                <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Notes
                </Text>
                <Text className="text-sm text-gray-900 dark:text-white leading-relaxed">
                  {card.notes}
                </Text>
              </View>
            )}

            {/* Timestamps */}
            <View className="pt-2 border-t border-gray-100 dark:border-gray-800 gap-1">
              <Text className="text-xs text-gray-400 dark:text-gray-500">
                Added {card.createdAt.toLocaleDateString()}
              </Text>
              <Text className="text-xs text-gray-400 dark:text-gray-500">
                Updated {entity.getRelativeTime()}
              </Text>
            </View>
          </ScrollView>

          {/* Actions */}
          <View className="px-6 pt-3 flex-row gap-3" style={{ paddingBottom: Math.max(bottom, 24) }}>
            <Pressable
              onPress={() => onDelete(card)}
              className="flex-1 flex-row items-center justify-center gap-2 py-3.5 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 active:opacity-80"
            >
              <Feather name="trash-2" size={16} color="#ef4444" />
              <Text className="text-red-500 font-semibold text-sm">Delete</Text>
            </Pressable>
            <Pressable
              onPress={() => onEdit(card)}
              className="flex-1 flex-row items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-500 active:bg-indigo-600"
            >
              <Feather name="edit-2" size={16} color="#ffffff" />
              <Text className="text-white font-semibold text-sm">Edit</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

interface DetailRowProps {
  label: string;
  value: string;
  isSecret?: boolean;
  isShown?: boolean;
  onToggleShow?: () => void;
  onCopy?: () => void;
  mono?: boolean;
}

const DetailRow = ({
  label,
  value,
  isSecret,
  isShown,
  onToggleShow,
  onCopy,
  mono,
}: DetailRowProps) => (
  <View className="gap-1">
    <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
      {label}
    </Text>
    <View className="flex-row items-center justify-between">
      <Text
        className={`text-sm text-gray-900 dark:text-white flex-1 ${mono ? 'font-mono' : ''}`}
        selectable={isShown}
      >
        {value}
      </Text>
      <View className="flex-row items-center gap-2 ml-2">
        {isSecret && (
          <Pressable onPress={onToggleShow} hitSlop={8}>
            <Feather name={isShown ? 'eye-off' : 'eye'} size={16} color="#9ca3af" />
          </Pressable>
        )}
        {onCopy && (
          <Pressable onPress={onCopy} hitSlop={8}>
            <Feather name="copy" size={16} color="#9ca3af" />
          </Pressable>
        )}
      </View>
    </View>
  </View>
);
