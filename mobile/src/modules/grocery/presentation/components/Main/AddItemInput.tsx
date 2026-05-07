import { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Keyboard } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ProductType, CreateGroceryItemDto } from '@himan/shared/grocery';

interface AddItemInputProps {
  listId: string;
  products: ProductType[];
  onAddItem: (dto: CreateGroceryItemDto) => void;
  autoFocus?: boolean;
}

export const AddItemInput = ({
  listId,
  products,
  onAddItem,
  autoFocus = false,
}: AddItemInputProps) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<TextInput>(null);

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const lower = query.toLowerCase();
    return products
      .filter((p) => p.name.toLowerCase().includes(lower))
      .sort((a, b) => b.purchaseCount - a.purchaseCount)
      .slice(0, 8);
  }, [query, products]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [matches]);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const addFromProduct = (product: ProductType) => {
    onAddItem({
      listId,
      name: product.name,
      category: product.category ?? undefined,
      quantity: product.defaultQuantity,
      unit: product.defaultUnit ?? undefined,
      productId: product.id,
    });
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const addCustom = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    onAddItem({ listId, name: trimmed });
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <View className="relative">
      <View className="relative">
        <View className="absolute left-3.5 top-1/2 -translate-y-1/2 z-10">
          <Feather name="plus" size={16} color="#9ca3af" />
        </View>
        <TextInput
          ref={inputRef}
          placeholder="Add an item..."
          placeholderTextColor="#9ca3af"
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            setIsOpen(text.trim().length > 0);
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          onBlur={() => {
            setTimeout(() => setIsOpen(false), 200);
          }}
          onSubmitEditing={() => {
            if (!isOpen || !query.trim()) {
              addCustom();
            } else if (selectedIndex < matches.length) {
              addFromProduct(matches[selectedIndex]);
            } else {
              addCustom();
            }
          }}
          className="pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white"
        />
      </View>

      {isOpen && query.trim() && (
        <View className="absolute top-full mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 max-h-64">
          <ScrollView keyboardShouldPersistTaps="handled">
            {matches.map((product, index) => (
              <Pressable
                key={product.id}
                onPress={() => addFromProduct(product)}
                className={`flex flex-row items-center gap-3 px-4 py-3 ${
                  index === selectedIndex ? 'bg-gray-100 dark:bg-gray-800' : ''
                }`}
              >
                <Text className="flex-1 text-sm font-medium text-gray-900 dark:text-white" numberOfLines={1}>
                  {product.name}
                </Text>
                {product.category && (
                  <Text className="text-xs text-gray-500 dark:text-gray-400 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-md">
                    {product.category}
                  </Text>
                )}
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {product.defaultQuantity}
                  {product.defaultUnit ? ` ${product.defaultUnit}` : ''}
                </Text>
              </Pressable>
            ))}

            {matches.length > 0 && <View className="h-px bg-gray-200 dark:bg-gray-700" />}

            <Pressable
              onPress={addCustom}
              className={`flex flex-row items-center gap-2 px-4 py-3 ${
                selectedIndex === matches.length ? 'bg-gray-100 dark:bg-gray-800' : ''
              }`}
            >
              <Feather name="plus" size={16} color="#9ca3af" />
              <Text className="text-sm text-gray-900 dark:text-white">Add "{query.trim()}"</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}
    </View>
  );
};
