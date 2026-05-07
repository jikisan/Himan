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

        <View className="bg-white dark:bg-gray-900 rounded-t-3xl h-[88%]">
          {/* Drag handle */}
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-indigo-500/10 items-center justify-center">
                <Feather name="shopping-cart" size={20} color="#6366f1" />
              </View>
              <View>
                <Text className="text-lg font-bold text-gray-900 dark:text-white">
                  Start Shopping
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  Select lists and store
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => onOpenChange(false)}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center"
            >
              <Feather name="x" size={16} color="#6b7280" />
            </Pressable>
          </View>

          {/* Store name — fixed */}
          <View className="px-6 pt-5 gap-3">
            <View className="flex-row items-center gap-2">
              <Feather name="map-pin" size={15} color="#6366f1" />
              <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                Store Name
              </Text>
            </View>
            <View className="relative">
              <TextInput
                placeholder="e.g., Walmart, Costco"
                placeholderTextColor="#9ca3af"
                value={storeName}
                onChangeText={setStoreName}
                onSubmitEditing={handleStart}
                className="border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 pl-11 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 font-medium"
              />
              <View className="absolute left-3 top-0 bottom-0 justify-center">
                <Feather name="map-pin" size={16} color="#9ca3af" />
              </View>
            </View>

            {recentStores.length > 0 && (
              <View className="gap-2">
                <Text className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
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
                            ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-400'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                        }`}
                      >
                        <Feather name="map-pin" size={11} color={active ? '#6366f1' : '#9ca3af'} />
                        <Text
                          className={`text-xs font-medium ${
                            active
                              ? 'text-indigo-600 dark:text-indigo-400'
                              : 'text-gray-600 dark:text-gray-300'
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
          <View className="mx-6 mt-5 border-b border-gray-100 dark:border-gray-800" />

          {/* List selection — scrollable, flex-1 */}
          <View className="flex-1 px-6 pt-4 gap-3 min-h-0">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Feather name="list" size={15} color="#6366f1" />
                <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                  Select Lists
                </Text>
              </View>
              {selectedListIds.length > 0 && (
                <Text className="text-xs font-medium text-indigo-500">
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
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                    }`}
                  >
                    <View
                      className={`w-5 h-5 rounded-md border-2 items-center justify-center ${
                        isSelected
                          ? 'bg-indigo-500 border-indigo-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {isSelected && <Feather name="check" size={12} color="#ffffff" />}
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`font-semibold text-sm ${
                          isSelected
                            ? 'text-indigo-700 dark:text-indigo-300'
                            : 'text-gray-900 dark:text-white'
                        }`}
                        numberOfLines={1}
                      >
                        {list.name}
                      </Text>
                      <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {list.itemCount} {list.itemCount === 1 ? 'item' : 'items'}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}

              {activeLists.length === 0 && (
                <View className="items-center py-8 bg-gray-50 dark:bg-gray-800 rounded-xl gap-2">
                  <Feather name="shopping-bag" size={28} color="#9ca3af" />
                  <Text className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    No lists with items available
                  </Text>
                  <Text className="text-xs text-gray-400 dark:text-gray-500 text-center">
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
                canStart ? 'bg-indigo-500 active:bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
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
