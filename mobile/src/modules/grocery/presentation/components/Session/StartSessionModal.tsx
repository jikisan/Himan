import { useState } from 'react';
import { View, Text, Pressable, TextInput, Modal, ScrollView } from 'react-native';
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
      prev.includes(listId)
        ? prev.filter((id) => id !== listId)
        : [...prev, listId]
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

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={() => onOpenChange(false)}
    >
      <Pressable
        className="flex-1 bg-black/40 justify-end"
        onPress={() => onOpenChange(false)}
      >
        <Pressable className="bg-white dark:bg-gray-900 rounded-t-2xl p-6 max-h-[80%]">
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Start Shopping Session
            </Text>

            <View className="space-y-4">
              {/* List selection */}
              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select lists to shop
                </Text>
                <View className="space-y-1.5 max-h-48">
                  {activeLists.map((list) => {
                    const isSelected = selectedListIds.includes(list.id);
                    return (
                      <Pressable
                        key={list.id}
                        onPress={() => toggleList(list.id)}
                        className={`flex flex-row items-center gap-3 px-3 py-2 rounded-lg border ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                        }`}
                      >
                        <View
                          className={`flex items-center justify-center h-5 w-5 rounded border ${
                            isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {isSelected && <Feather name="check" size={12} color="#ffffff" />}
                        </View>
                        <View className="flex-1">
                          <Text className="font-medium text-sm text-gray-900 dark:text-white" numberOfLines={1}>
                            {list.name}
                          </Text>
                          <Text className="text-xs text-gray-500 dark:text-gray-400">
                            {list.itemCount} items
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                  {activeLists.length === 0 && (
                    <Text className="text-sm text-gray-500 dark:text-gray-400 py-2">
                      No lists with items available
                    </Text>
                  )}
                </View>
              </View>

              {/* Store name */}
              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Store name
                </Text>
                <TextInput
                  placeholder="e.g., Walmart, Costco"
                  placeholderTextColor="#9ca3af"
                  value={storeName}
                  onChangeText={setStoreName}
                  onSubmitEditing={handleStart}
                  className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800"
                />
              </View>

              {recentStores.length > 0 && (
                <View>
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mb-2">Recent stores</Text>
                  <View className="flex flex-row flex-wrap gap-1.5">
                    {recentStores.map((store) => (
                      <Pressable
                        key={store}
                        onPress={() => setStoreName(store)}
                        className={`px-2.5 py-1 rounded-full border ${
                          storeName === store
                            ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-500'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                        }`}
                      >
                        <Text className="text-xs text-gray-900 dark:text-white">{store}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              <Pressable
                onPress={handleStart}
                disabled={!storeName.trim() || selectedListIds.length === 0 || isStarting}
                className={`flex flex-row items-center justify-center gap-2 py-3 rounded-lg ${
                  !storeName.trim() || selectedListIds.length === 0 || isStarting
                    ? 'bg-gray-300 dark:bg-gray-700'
                    : 'bg-indigo-500'
                }`}
              >
                <Feather name="shopping-cart" size={18} color="#ffffff" />
                <Text className="text-white font-medium">
                  {isStarting
                    ? 'Starting...'
                    : `Start Shopping${storeName.trim() ? ` at ${storeName.trim()}` : ''}`}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
