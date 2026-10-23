import { useState } from 'react';
import { View, Text, Pressable, Modal, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { KeyboardSafe } from '@/modules/shared/components/KeyboardSafe';

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
      <KeyboardSafe>
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center px-5"
          onPress={() => onOpenChange(false)}
        >
          <Pressable className="bg-paper dark:bg-paper-dark rounded-3xl p-5 w-full max-w-sm shadow-xl">
            {/* Item info card */}
            <View className="bg-surface dark:bg-surface-dark/60 rounded-2xl px-4 py-3 mb-5">
              <Text className="text-base font-semibold text-ink dark:text-ink-dark" numberOfLines={1}>
                {itemName}
              </Text>
              <View className="flex-row items-center mt-1 gap-2">
                <View className="flex-row items-center gap-1">
                  <Feather name="package" size={12} color="#9b9797" />
                  <Text className="text-xs text-ink-soft dark:text-ink-softdark">
                    {quantity}{unit ? ` ${unit}` : ''}
                  </Text>
                </View>
                {notes ? (
                  <Text className="text-xs text-ink-faint dark:text-ink-faintdark italic flex-1" numberOfLines={1}>
                    {notes}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Price input */}
            <View className="mb-5">
              <Text className="text-sm font-medium text-ink dark:text-ink-dark mb-2 ml-1">
                Price
              </Text>
              <View className="flex-row items-center border border-rule dark:border-rule-dark rounded-xl bg-surface dark:bg-surface-dark overflow-hidden">
                <View className="pl-4 pr-1 py-3"/>
                <TextInput
                  className="flex-1 text-lg text-ink dark:text-ink-dark py-3 pr-4"
                  placeholder={previousPrice != null ? previousPrice.toFixed(2) : '0.00'}
                  placeholderTextColor="#9b9797"
                  keyboardType="decimal-pad"
                  value={priceText}
                  onChangeText={setPriceText}
                  autoFocus
                />
              </View>
              {previousPrice != null && (
                <Text className="text-xs text-ink-faint dark:text-ink-faintdark mt-1.5 ml-1">
                  Last price: ${previousPrice.toFixed(2)}
                </Text>
              )}
            </View>

            {/* Actions */}
            <Pressable
              onPress={handleConfirm}
              className="bg-accent dark:bg-accent-dark rounded-xl items-center justify-center active:opacity-90 active:scale-[0.98]"
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
              className="mt-3 rounded-xl items-center justify-center active:opacity-80 active:scale-[0.98]"
              style={{ height: 44 }}
            >
              <Text className="text-ink-soft dark:text-ink-softdark font-medium text-sm">
                Skip price
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </KeyboardSafe>
    </Modal>
  );
};
