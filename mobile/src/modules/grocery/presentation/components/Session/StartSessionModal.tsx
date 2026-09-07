import { useState } from 'react';
import { View, Text, Pressable, TextInput, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { GroceryListType } from '@himan/shared/grocery';

interface StartSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lists: GroceryListType[];
  recentStores: string[];
  onStart: (listIds: string[], storeName: string) => void;
  isStarting: boolean;
}

export const StartSessionModal = ({
  open,
  onOpenChange,
  lists,
  recentStores,
  onStart,
  isStarting,
}: StartSessionModalProps) => {
  const [storeName, setStoreName] = useState('');
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);

  const toggleList = (listId: string) => {
    setSelectedListIds((prev) =>
      prev.includes(listId) ? prev.filter((id) => id !== listId) : [...prev, listId]
    );
  };

  const handleStart = () => {
    const trimmed = storeName.trim();
    if (!trimmed || selectedListIds.length === 0) return;
    onStart(selectedListIds, trimmed);
    setStoreName('');
    setSelectedListIds([]);
    onOpenChange(false);
  };

  const activeLists = lists.filter((l) => !l.isArchived && l.itemCount > 0);
  const selectedItemsCount = activeLists
    .filter((l) => selectedListIds.includes(l.id))
    .reduce((sum, l) => sum + l.itemCount, 0);

  const canStart = storeName.trim().length > 0 && selectedListIds.length > 0 && !isStarting;

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={() => onOpenChange(false)}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <Pressable className="absolute inset-0" onPress={() => onOpenChange(false)} />

        <View className="bg-paper dark:bg-paper-dark rounded-t-3xl h-[88%]">
          {/* Drag handle */}
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 bg-surface dark:bg-surface-dark rounded-full" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-rule dark:border-rule-dark">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-accent dark:bg-accent-dark/10 items-center justify-center">
                <Feather name="shopping-cart" size={20} color="#0088b0" />
              </View>
              <View>
                <Text className="text-lg font-bold text-ink dark:text-ink-dark">
                  Start Shopping
                </Text>
                <Text className="text-xs text-ink-soft dark:text-ink-softdark">
                  Select lists and store
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => onOpenChange(false)}
              className="w-8 h-8 rounded-full bg-surface dark:bg-surface-dark items-center justify-center"
            >
              <Feather name="x" size={16} color="#7d7979" />
            </Pressable>
          </View>

          {/* Store name — fixed */}
          <View className="px-6 pt-5 gap-3">
            <View className="flex-row items-center gap-2">
              <Feather name="map-pin" size={15} color="#0088b0" />
              <Text className="text-sm font-semibold text-ink dark:text-ink-dark">
                Store Name
              </Text>
            </View>
            <View className="relative">
              <TextInput
                placeholder="e.g., Walmart, Costco"
                placeholderTextColor="#9b9797"
                value={storeName}
                onChangeText={setStoreName}
                onSubmitEditing={handleStart}
                className="border-2 border-rule dark:border-rule-dark rounded-xl px-4 py-3.5 pl-11 text-ink dark:text-ink-dark bg-surface dark:bg-surface-dark font-medium"
              />
              <View className="absolute left-3 top-0 bottom-0 justify-center">
                <Feather name="map-pin" size={16} color="#9b9797" />
              </View>
            </View>

            {recentStores.length > 0 && (
              <View className="gap-2">
                <Text className="text-xs font-semibold text-ink-faint dark:text-ink-faintdark uppercase tracking-wider">
                  Recent
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {recentStores.map((store) => {
                    const active = storeName === store;
                    return (
                      <Pressable
                        key={store}
                        onPress={() => setStoreName(store)}
                        className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border ${
                          active
                            ? 'bg-sticky dark:bg-sticky-dark border-accent dark:border-accent-dark'
                            : 'border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark'
                        }`}
                      >
                        <Feather name="map-pin" size={11} color={active ? '#0088b0' : '#9b9797'} />
                        <Text
                          className={`text-xs font-medium ${
                            active
                              ? 'text-accent-text dark:text-accent-textdark'
                              : 'text-ink-soft dark:text-ink-softdark'
                          }`}
                        >
                          {store}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* Divider */}
          <View className="mx-6 mt-5 border-b border-rule dark:border-rule-dark" />

          {/* List selection — scrollable, flex-1 */}
          <View className="flex-1 px-6 pt-4 gap-3 min-h-0">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Feather name="list" size={15} color="#0088b0" />
                <Text className="text-sm font-semibold text-ink dark:text-ink-dark">
                  Select Lists
                </Text>
              </View>
              {selectedListIds.length > 0 && (
                <Text className="text-xs font-medium text-accent-text dark:text-accent-textdark">
                  {selectedListIds.length} selected · {selectedItemsCount} items
                </Text>
              )}
            </View>

            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
            >
              {activeLists.map((list) => {
                const isSelected = selectedListIds.includes(list.id);
                return (
                  <Pressable
                    key={list.id}
                    onPress={() => toggleList(list.id)}
                    className={`flex-row items-center gap-3 px-4 py-3 rounded-xl border-2 ${
                      isSelected
                        ? 'border-accent dark:border-accent-dark bg-sticky dark:bg-sticky-dark'
                        : 'border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark'
                    }`}
                  >
                    <View
                      className={`w-5 h-5 rounded-md border-2 items-center justify-center ${
                        isSelected
                          ? 'bg-accent dark:bg-accent-dark border-accent dark:border-accent-dark'
                          : 'border-rule dark:border-rule-dark'
                      }`}
                    >
                      {isSelected && <Feather name="check" size={12} color="#ffffff" />}
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`font-semibold text-sm ${
                          isSelected
                            ? 'text-accent-text dark:text-accent-textdark'
                            : 'text-ink dark:text-ink-dark'
                        }`}
                        numberOfLines={1}
                      >
                        {list.name}
                      </Text>
                      <Text className="text-xs text-ink-soft dark:text-ink-softdark mt-0.5">
                        {list.itemCount} {list.itemCount === 1 ? 'item' : 'items'}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}

              {activeLists.length === 0 && (
                <View className="items-center py-8 bg-surface dark:bg-surface-dark rounded-xl gap-2">
                  <Feather name="shopping-bag" size={28} color="#9b9797" />
                  <Text className="text-sm text-ink-soft dark:text-ink-softdark text-center">
                    No lists with items available
                  </Text>
                  <Text className="text-xs text-ink-faint dark:text-ink-faintdark text-center">
                    Add items to a list to start shopping
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>

          {/* Action button — fixed at bottom */}
          <View className="px-6 pt-3 pb-8 gap-2">
            <Pressable
              onPress={handleStart}
              disabled={!canStart}
              className={`flex-row items-center justify-center gap-2.5 py-4 rounded-xl ${
                canStart ? 'bg-accent dark:bg-accent-dark active:opacity-90' : 'bg-surface dark:bg-surface-dark'
              }`}
            >
              {isStarting ? (
                <ActivityIndicator size={18} color="#ffffff" />
              ) : (
                <Feather name="shopping-cart" size={18} color="#ffffff" />
              )}
              <Text className="text-white font-semibold text-base">
                {isStarting
                  ? 'Starting...'
                  : storeName.trim()
                  ? `Shop at ${storeName.trim()}`
                  : 'Start Shopping'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
