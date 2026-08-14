import { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import type { ProductType, CreateGroceryItemDto } from '@himan/shared/grocery';
import { notebook } from '@/modules/grocery/presentation/theme/notebook';

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
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;

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
          <Feather name="plus" size={18} color={c.accent} />
        </View>
        <TextInput
          ref={inputRef}
          placeholder="Add an item…"
          placeholderTextColor={c.inkFaint}
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
          className="pl-10 pr-4 py-3 bg-surface dark:bg-surface-dark border border-rule dark:border-rule-dark rounded-sm font-serifitalic text-[15px] text-ink dark:text-ink-dark"
        />
      </View>

      {isOpen && query.trim() && (
        <View className="absolute top-full mt-1 w-full bg-paper dark:bg-paper-dark border border-rule dark:border-rule-dark rounded-sm z-50 max-h-64">
          <ScrollView keyboardShouldPersistTaps="handled">
            {matches.map((product, index) => (
              <Pressable
                key={product.id}
                onPress={() => addFromProduct(product)}
                className={`flex flex-row items-center gap-3 px-4 py-3 border-b border-rule dark:border-rule-dark ${
                  index === selectedIndex ? 'bg-surface dark:bg-surface-dark' : ''
                }`}
              >
                <Text className="flex-1 text-[15px] font-serif text-ink dark:text-ink-dark" numberOfLines={1}>
                  {product.name}
                </Text>
                {product.category && (
                  <Text className="text-[14px] font-serif text-accent-text dark:text-accent-textdark">
                    #{product.category.toLowerCase().replace(/\s+/g, '')}
                  </Text>
                )}
                <Text className="text-[14px] font-serif text-ink-faint dark:text-ink-faintdark">
                  {product.defaultQuantity}
                  {product.defaultUnit ? ` ${product.defaultUnit}` : ''}
                </Text>
              </Pressable>
            ))}

            <Pressable
              onPress={addCustom}
              className={`flex flex-row items-center gap-2 px-4 py-3 ${
                selectedIndex === matches.length ? 'bg-surface dark:bg-surface-dark' : ''
              }`}
            >
              <Feather name="plus" size={16} color={c.accent} />
              <Text className="text-[15px] font-serif text-ink dark:text-ink-dark">Add “{query.trim()}”</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}
    </View>
  );
};
