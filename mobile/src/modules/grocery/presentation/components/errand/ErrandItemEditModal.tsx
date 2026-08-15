import { useState } from 'react';
import { View, Text, Pressable, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import type { SessionItemType } from '@himan/shared/grocery';
import { notebook } from '@/modules/grocery/presentation/theme/notebook';

export interface ErrandItemEdits {
  name: string;
  category: string | null;
  quantity: number;
  aisle: string | null;
  pricePaid: number | null;
}

interface ErrandItemEditModalProps {
  item: SessionItemType | null;
  onClose: () => void;
  onSave: (edits: ErrandItemEdits) => void;
  onSkip: () => void;
}

function parseNumber(text: string): number | null {
  const parsed = parseFloat(text.replace(',', '.'));
  return isNaN(parsed) ? null : parsed;
}

export function ErrandItemEditModal({ item, onClose, onSave, onSkip }: ErrandItemEditModalProps) {
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [aisle, setAisle] = useState('');
  const [price, setPrice] = useState('');

  // Re-seed the fields whenever a different item is opened.
  const [seededId, setSeededId] = useState<string | null>(null);
  if (item && item.id !== seededId) {
    setSeededId(item.id);
    setName(item.name);
    setCategory(item.category ?? '');
    setQuantity(item.quantity ? String(item.quantity) : '');
    setAisle(item.aisle ?? '');
    setPrice(item.pricePaid != null ? String(item.pricePaid) : item.price != null ? String(item.price) : '');
  }

  const handleSave = () => {
    onSave({
      name: name.trim() || (item?.name ?? ''),
      category: category.trim() || null,
      quantity: parseNumber(quantity) ?? item?.quantity ?? 1,
      aisle: aisle.trim() || null,
      pricePaid: parseNumber(price),
    });
  };

  const inputClass =
    'border border-rule dark:border-rule-dark rounded-xl bg-surface dark:bg-surface-dark px-4 py-3 text-[16px] text-ink dark:text-ink-dark font-serif';

  return (
    <Modal visible={!!item} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable className="flex-1 bg-black/50 justify-center items-center px-5" onPress={onClose}>
          <Pressable className="bg-paper dark:bg-paper-dark rounded-3xl w-full max-w-sm shadow-xl overflow-hidden">
            <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
              <Text className="text-lg font-semibold text-ink dark:text-ink-dark font-serif">Edit item</Text>
              <Pressable onPress={onClose} className="active:opacity-60 p-1">
                <Feather name="x" size={22} color={c.inkSoft} />
              </Pressable>
            </View>

            <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 4 }}>
              <View className="gap-3">
                <View>
                  <Text className="text-xs uppercase tracking-wider text-ink-soft dark:text-ink-softdark mb-1.5 font-serif">Name</Text>
                  <TextInput
                    className={inputClass}
                    value={name}
                    onChangeText={setName}
                    placeholder="Item name"
                    placeholderTextColor={c.inkFaint}
                  />
                </View>

                <View>
                  <Text className="text-xs uppercase tracking-wider text-ink-soft dark:text-ink-softdark mb-1.5 font-serif">Category</Text>
                  <TextInput
                    className={inputClass}
                    value={category}
                    onChangeText={setCategory}
                    placeholder="Other"
                    placeholderTextColor={c.inkFaint}
                  />
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-xs uppercase tracking-wider text-ink-soft dark:text-ink-softdark mb-1.5 font-serif">Quantity</Text>
                    <TextInput
                      className={inputClass}
                      value={quantity}
                      onChangeText={setQuantity}
                      keyboardType="decimal-pad"
                      placeholder="1"
                      placeholderTextColor={c.inkFaint}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs uppercase tracking-wider text-ink-soft dark:text-ink-softdark mb-1.5 font-serif">Aisle</Text>
                    <TextInput
                      className={inputClass}
                      value={aisle}
                      onChangeText={setAisle}
                      placeholder="—"
                      placeholderTextColor={c.inkFaint}
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-xs uppercase tracking-wider text-ink-soft dark:text-ink-softdark mb-1.5 font-serif">Price</Text>
                  <TextInput
                    className={inputClass}
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={c.inkFaint}
                  />
                </View>
              </View>
            </ScrollView>

            <View className="px-5 pt-4 pb-5 gap-3">
              <Pressable
                onPress={handleSave}
                className="rounded-full py-3.5 items-center flex-row justify-center gap-2 active:opacity-90"
                style={{ backgroundColor: c.accent }}
              >
                <Feather name="check" size={18} color={colorScheme === 'dark' ? '#201e1d' : '#ffffff'} />
                <Text className="font-semibold" style={{ color: colorScheme === 'dark' ? '#201e1d' : '#ffffff' }}>
                  Save & cross off
                </Text>
              </Pressable>
              <Pressable onPress={onSkip} className="rounded-full py-3 items-center active:opacity-70">
                <Text className="text-ink-soft dark:text-ink-softdark font-medium font-serif">
                  Skip — just cross off
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
