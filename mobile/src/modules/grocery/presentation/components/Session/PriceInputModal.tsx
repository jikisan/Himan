import { useState } from 'react';
import { View, Text, Pressable, Modal, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface PriceInputModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  quantity: number;
  unit: string | null;
  notes: string | null;
  previousPrice: number | null;
  onConfirm: (price: number | null) => void;
}

export const PriceInputModal = ({
  open,
  onOpenChange,
  itemName,
  quantity,
  unit,
  notes,
  previousPrice,
  onConfirm,
}: PriceInputModalProps) => {
  const [priceText, setPriceText] = useState('');

  const handleConfirm = () => {
    const parsed = parseFloat(priceText);
    onConfirm(isNaN(parsed) ? null : parsed);
    setPriceText('');
  };

  const handleSkip = () => {
    onConfirm(null);
    setPriceText('');
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <Pressable
        className="flex-1 bg-black/50 justify-center items-center px-5"
        onPress={() => onOpenChange(false)}
      >
        <Pressable className="bg-white dark:bg-gray-900 rounded-3xl p-5 w-full max-w-sm shadow-xl">
          {/* Item info card */}
          <View className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl px-4 py-3 mb-5">
            <Text className="text-base font-semibold text-gray-900 dark:text-white" numberOfLines={1}>
              {itemName}
            </Text>
            <View className="flex-row items-center mt-1 gap-2">
              <View className="flex-row items-center gap-1">
                <Feather name="package" size={12} color="#9ca3af" />
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {quantity}{unit ? ` ${unit}` : ''}
                </Text>
              </View>
              {notes ? (
                <Text className="text-xs text-gray-400 dark:text-gray-500 italic flex-1" numberOfLines={1}>
                  {notes}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Price input */}
          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 ml-1">
              Price
            </Text>
            <View className="flex-row items-center border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 overflow-hidden">
              <View className="pl-4 pr-1 py-3"/>
              <TextInput
                className="flex-1 text-lg text-gray-900 dark:text-white py-3 pr-4"
                placeholder={previousPrice != null ? previousPrice.toFixed(2) : '0.00'}
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
                value={priceText}
                onChangeText={setPriceText}
                autoFocus
              />
            </View>
            {previousPrice != null && (
              <Text className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 ml-1">
                Last price: ${previousPrice.toFixed(2)}
              </Text>
            )}
          </View>

          {/* Actions */}
          <Pressable
            onPress={handleConfirm}
            className="bg-indigo-600 rounded-xl items-center justify-center active:bg-indigo-700 active:scale-[0.98]"
            style={{ height: 48 }}
          >
            <View className="flex-row items-center gap-2">
              <Feather name="check" size={18} color="#ffffff" />
              <Text className="text-white font-semibold text-base">
                Confirm
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={handleSkip}
            className="mt-3 rounded-xl items-center justify-center active:bg-gray-100 dark:active:bg-gray-800 active:scale-[0.98]"
            style={{ height: 44 }}
          >
            <Text className="text-gray-500 dark:text-gray-400 font-medium text-sm">
              Skip price
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
